// 诡谜局 V2 - 房间管理云函数
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

// 加载谜题数据
let PUZZLES_MAP = null;
let PUZZLES_IDS = null; // 所有可用的 puzzle ID 列表
function getPuzzleById(id) {
  if (!PUZZLES_MAP) {
    try {
      const { PUZZLES } = require('./puzzles.js');
      PUZZLES_MAP = {};
      PUZZLES_IDS = [];
      if (Array.isArray(PUZZLES)) {
        PUZZLES.forEach(p => {
          PUZZLES_MAP[p.id] = p;
          PUZZLES_IDS.push(p.id);
        });
      }
    } catch (e) {
      console.warn('加载 puzzles.js 失败:', e.message);
      PUZZLES_MAP = {};
      PUZZLES_IDS = [];
    }
  }
  return PUZZLES_MAP[id] || null;
}

function getRandomPuzzleId() {
  if (!PUZZLES_IDS || PUZZLES_IDS.length === 0) {
    getPuzzleById(0); // 触发加载
  }
  if (PUZZLES_IDS && PUZZLES_IDS.length > 0) {
    return PUZZLES_IDS[Math.floor(Math.random() * PUZZLES_IDS.length)];
  }
  return 1; // fallback
}

const ROOM_CODE_LENGTH = 6;
const MAX_QUESTIONS_PER_PLAYER = 10;
const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

// ============ 生成 6 位房间号 ============
function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符 0/O/1/I
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============ 生成唯一 roomId ============
function generateRoomId() {
  return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ============ 获取当前 openid ============
function getOpenid(context) {
  return (context.OPENID || 'anonymous').trim();
}

// ============ 主入口 ============
exports.main = async (event, context) => {
  const { action } = event;
  const openid = getOpenid(context);

  if (!openid) {
    return { code: -1, message: '请先登录' };
  }

  switch (action) {
    case 'createRoom':   return createRoom(event, openid);
    case 'joinRoom':     return joinRoom(event, openid);
    case 'leaveRoom':    return leaveRoom(event, openid);
    case 'getRoomState': return getRoomState(event, openid);
    case 'startGame':    return startGame(event, openid);
    case 'submitQuestion': return submitQuestion(event, openid);
    case 'submitGuess':  return submitGuess(event, openid);
    case 'toggleReady':  return toggleReady(event, openid);
    case 'setPlayerName':  return setPlayerName(event, openid);
    case 'getOnlineCount': return getOnlineCount();
    case 'listPublicRooms': return listPublicRooms();
    case 'listPuzzles': return listPuzzles(event);
    case 'getRoomPreview': return getRoomPreview(event);
    default:
      return { code: -1, message: '未知操作: ' + action };
  }
};

// ============ 创建房间 ============
async function createRoom(event, openid) {
  const { puzzleId, mode = 'turn', maxPlayers = 4, timeLimit = 15 } = event;

  // puzzleId 改为可选，未传则从实际谜题库中随机选取
  const finalPuzzleId = puzzleId || getRandomPuzzleId();

  const shareCode = generateShareCode();
  const roomId = generateRoomId();

  // solo 模式：单人练习，maxPlayers 固定为 1
  const isSolo = mode === 'solo';
  const finalMaxPlayers = isSolo ? 1 : Math.min(Math.max(maxPlayers, 2), MAX_PLAYERS);

  const room = {
    _openid: openid,  // 房主
    roomId,
    shareCode,
    hostId: openid,
    status: 'waiting', // waiting | playing | finished
    mode,
    maxPlayers: finalMaxPlayers,
    timeLimit,
    timeRemaining: timeLimit * 60,
    currentTurnIndex: 0,
    turnStartedAt: null,
    players: [{
      id: openid,
      name: '玩家',
      avatar: '🕵️',
      characterId: 'detective_m',
      skinId: 'default',
      seatIndex: 0,
      isReady: isSolo,  // solo 模式自动准备
      questionCount: 0,
      score: 0,
      isOnline: true,
      joinedAt: Date.now()
    }],
    chatLog: [],
    puzzleId: finalPuzzleId,
    winnerId: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await db.collection('rooms').add(room);
    return {
      code: 0,
      data: {
        roomId,
        shareCode
      }
    };
  } catch (err) {
    console.error('创建房间失败:', err.message);
    return { code: -1, message: '创建房间失败，请重试' };
  }
}

// ============ 加入房间 ============
async function joinRoom(event, openid) {
  const { shareCode } = event;

  if (!shareCode) {
    return { code: -1, message: '请输入房间号' };
  }

  try {
    const result = await db.collection('rooms')
      .where({ shareCode: shareCode.toUpperCase() })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' };
    }

    const room = result.data[0];

    // solo 房间不允许加入
    if (room.mode === 'solo') {
      return { code: -1, message: '这是单人练习房间，无法加入' };
    }

    if (room.status !== 'waiting') {
      return { code: -1, message: '游戏已开始，无法加入' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { code: -1, message: '房间已满' };
    }

    // 检查是否已在房间中
    const alreadyIn = room.players.find(p => p.id === openid);
    if (alreadyIn) {
      // 重连：更新在线状态
      await db.collection('rooms')
        .where({ roomId: room.roomId, 'players.id': openid })
        .update({
          'players.$.isOnline': true,
          updatedAt: Date.now()
        });
      return { code: 0, data: { room } };
    }

    // 新玩家加入
    const newPlayer = {
      id: openid,
      name: '玩家',
      avatar: '🕵️',
      characterId: 'detective_m',
      skinId: 'default',
      seatIndex: room.players.length,
      isReady: false,
      questionCount: 0,
      score: 0,
      isOnline: true,
      joinedAt: Date.now()
    };

    await db.collection('rooms')
      .where({ roomId: room.roomId })
      .update({
        $push: { players: newPlayer },
        updatedAt: Date.now()
      });

    room.players.push(newPlayer);
    return { code: 0, data: { room } };
  } catch (err) {
    console.error('加入房间失败:', err.message);
    return { code: -1, message: '加入房间失败，请重试' };
  }
}

// ============ 离开房间 ============
async function leaveRoom(event, openid) {
  const { roomId } = event;

  if (!roomId) {
    return { code: -1, message: '缺少房间ID' };
  }

  try {
    const result = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' };
    }

    const room = result.data[0];

    if (room.hostId === openid && room.status === 'waiting') {
      // 房主离开 → 转让房主或解散
      const others = room.players.filter(p => p.id !== openid);
      if (others.length === 0) {
        // 没有其他人，删除房间
        await db.collection('rooms')
          .where({ roomId })
          .remove();
        return { code: 0, data: { success: true, message: '房间已解散' } };
      } else {
        // 转让房主
        const newHost = others[0];
        await db.collection('rooms')
          .where({ roomId })
          .update({
            hostId: newHost.id,
            players: _.pull({ id: openid }),
            updatedAt: Date.now()
          });
        return { code: 0, data: { success: true, newHost: newHost.name } };
      }
    }

    // 普通玩家离开
    await db.collection('rooms')
      .where({ roomId })
      .update({
        players: _.pull({ id: openid }),
        updatedAt: Date.now()
      });

    return { code: 0, data: { success: true } };
  } catch (err) {
    console.error('离开房间失败:', err.message);
    return { code: -1, message: '离开房间失败' };
  }
}

// ============ 获取房间状态 ============
async function getRoomState(event, openid) {
  const { roomId } = event;

  if (!roomId) {
    return { code: -1, message: '缺少房间ID' };
  }

  try {
    const result = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' };
    }

    const room = result.data[0];

    // 检查是否在房间中
    const isInRoom = room.players.some(p => p.id === openid);
    if (!isInRoom) {
      return { code: -1, message: '你不在这个房间中' };
    }

    // 游戏进行中：根据 gameStartedAt 计算真实剩余时间（后端不会每秒递减 timeRemaining）
    if (room.status === 'playing' && room.gameStartedAt) {
      const elapsed = Math.floor((Date.now() - room.gameStartedAt) / 1000);
      room.timeRemaining = Math.max(0, (room.timeLimit * 60) - elapsed);
    }

    return { code: 0, data: { room } };
  } catch (err) {
    console.error('获取房间状态失败:', err.message);
    return { code: -1, message: '获取房间状态失败' };
  }
}

// ============ 开始游戏 ============
async function startGame(event, openid) {
  const { roomId } = event;

  if (!roomId) {
    return { code: -1, message: '缺少房间ID' };
  }

  try {
    const result = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' };
    }

    const room = result.data[0];

    if (room.hostId !== openid) {
      return { code: -1, message: '只有房主可以开始游戏' };
    }

    if (room.status !== 'waiting') {
      return { code: -1, message: '游戏已经开始' };
    }

    // solo 模式跳过人数和准备检查
    if (room.mode !== 'solo') {
      if (room.players.length < MIN_PLAYERS) {
        return { code: -1, message: `至少需要 ${MIN_PLAYERS} 名玩家` };
      }

      // 非房主玩家必须准备（房主自动视为已准备）
      const notReady = room.players.filter(p => p.id !== room.hostId && !p.isReady);
      if (notReady.length > 0) {
        return { code: -1, message: `${notReady.map(p => p.name).join('、')} 还未准备` };
      }
    }

    const now = Date.now();
    // 从 puzzleId 获取谜题信息存入房间
    const puzzle = room.puzzleId ? getPuzzleById(room.puzzleId) : null;
    const puzzleTitle = puzzle ? puzzle.title : '';
    const puzzleAnswer = puzzle ? puzzle.answer : '';
    const puzzleRiddle = puzzle ? puzzle.riddle : '';
    const puzzleData = puzzle ? {
      id: puzzle.id,
      type: puzzle.type || '',
      level: puzzle.level || '',
      title: puzzleTitle,
      riddle: puzzleRiddle,
      answer: puzzleAnswer
    } : null;

    await db.collection('rooms')
      .where({ roomId })
      .update({
        status: 'playing',
        currentTurnIndex: 0,
        turnStartedAt: now,
        gameStartedAt: now,
        timeRemaining: room.timeLimit * 60,
        puzzleTitle,
        puzzleAnswer,
        puzzleRiddle,
        puzzle: puzzleData,
        updatedAt: now,
        chatLog: _.push({
          playerId: 'system',
          playerName: '系统',
          type: 'system',
          content: `游戏开始！轮到 ${room.players[0].name} 提问`,
          timestamp: now
        })
      });

    return { code: 0, data: { room: { ...room, status: 'playing', puzzleTitle, puzzleAnswer, puzzleRiddle, puzzle: puzzleData, chatLog: [...room.chatLog, {
      playerId: 'system', playerName: '系统', type: 'system',
      content: `游戏开始！轮到 ${room.players[0].name} 提问`,
      timestamp: now
    }] } } };
  } catch (err) {
    console.error('开始游戏失败:', err.message);
    return { code: -1, message: '开始游戏失败' };
  }
}

// ============ 提交问题 ============
async function submitQuestion(event, openid) {
  const { roomId, question } = event;

  if (!roomId || !question) {
    return { code: -1, message: '缺少参数' };
  }

  try {
    const result = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' };
    }

    const room = result.data[0];
    const mode = room.mode || 'turn';

    if (room.status !== 'playing') {
      return { code: -1, message: '游戏未开始或已结束' };
    }

    // 按模式检查提问权限
    if (mode === 'solo') {
      // 单人模式：无回合限制，无提问次数限制，随时可问
      // pass all checks
    } else if (mode === 'turn' || mode === 'compete') {
      // 轮流制 & 竞技制：只有当前回合玩家能提问
      const currentPlayer = room.players[room.currentTurnIndex];
      if (!currentPlayer || currentPlayer.id !== openid) {
        return { code: -1, message: '还没轮到你提问' };
      }
      if (currentPlayer.questionCount >= MAX_QUESTIONS_PER_PLAYER) {
        return { code: -1, message: `你已达到 ${MAX_QUESTIONS_PER_PLAYER} 次提问上限` };
      }
    } else if (mode === 'race') {
      // 抢答制：任何人都能抢问，但每人有上限
      const player = room.players.find(p => p.id === openid);
      if (!player) return { code: -1, message: '你不在房间中' };
      if (player.questionCount >= MAX_QUESTIONS_PER_PLAYER) {
        return { code: -1, message: `你已达到 ${MAX_QUESTIONS_PER_PLAYER} 次提问上限` };
      }
    } else if (mode === 'coop') {
      // 合作制：任何人都能问，共用次数，不限个人上限
      const totalQuestions = room.players.reduce((sum, p) => sum + (p.questionCount || 0), 0);
      if (totalQuestions >= MAX_QUESTIONS_PER_PLAYER * room.players.length) {
        return { code: -1, message: '团队提问次数已用完' };
      }
    }

    // 从 puzzleId 获取谜题内容（前端可能未传 riddle/answer）
    let riddle = event.riddle || '';
    let answer = event.answer || '';
    if ((!riddle || !answer) && room.puzzleId) {
      const puzzle = getPuzzleById(room.puzzleId);
      if (puzzle) {
        riddle = riddle || puzzle.riddle || '';
        answer = answer || puzzle.answer || '';
      }
    }

    // 提问者信息
    const asker = room.players.find(p => p.id === openid) || { name: '玩家', questionCount: 0 };

    // 调用 askAi 云函数获取 AI 回答
    // compete 模式：只传当前玩家自己的问答历史，防止 AI 泄露其他玩家的问题
    const historyForAi = room.chatLog
      .filter(c => (c.type === 'question' || c.type === 'answer')
        && (mode !== 'compete' || c.playerId === openid))
      .map(c => ({
        q: c.content,
        playerName: c.playerName,
        a: c.answerData || { ans: 'unrelated', exp: '' }
      }));

    const askAiResult = await app.callFunction({
      name: 'askAi',
      data: {
        question,
        riddle,
        answer,
        history: historyForAi,
        roomId,
        playerName: asker.name,
        turnNumber: (asker.questionCount || 0) + 1
      }
    });

    const aiAnswer = askAiResult.result || { ans: 'unrelated', exp: 'AI 暂时无法回答' };

    const now = Date.now();
    const nextTurnIndex = mode === 'solo' ? 0 : (room.currentTurnIndex + 1) % room.players.length;

    // 按模式构建 system 消息和 turn 更新
    let systemMsg;
    let turnUpdate = {};
    if (mode === 'solo') {
      // 单人模式：AI 回答后提示继续问
      systemMsg = { playerId: 'system', playerName: '系统', type: 'system',
        content: '你可以继续提问，或点击"猜答案"提交你的推理', timestamp: now + 2 };
      turnUpdate = {}; // solo 不轮换回合
    } else if (mode === 'turn' || mode === 'compete') {
      systemMsg = { playerId: 'system', playerName: '系统', type: 'system',
        content: `轮到 ${room.players[nextTurnIndex].name} 提问`, timestamp: now + 2 };
      turnUpdate = { currentTurnIndex: nextTurnIndex };
    } else if (mode === 'race') {
      systemMsg = { playerId: 'system', playerName: '系统', type: 'system',
        content: `${asker.name} 抢问成功！继续抢问`, timestamp: now + 2 };
      turnUpdate = {}; // 抢答制不轮换
    } else {
      // coop 合作制
      systemMsg = { playerId: 'system', playerName: '系统', type: 'system',
        content: `${asker.name} 提出了一条线索问题`, timestamp: now + 2 };
      turnUpdate = {}; // 合作制不轮换
    }

    const chatEntries = [
      { playerId: openid, playerName: asker.name, type: 'question', content: question, timestamp: now },
      { playerId: 'ai', playerName: 'AI主持人', type: 'answer',
        content: `${aiAnswer.ans === 'yes' ? '是' : aiAnswer.ans === 'no' ? '否' : '无关'} · ${aiAnswer.exp}`,
        answerData: aiAnswer, timestamp: now + 1 },
      systemMsg
    ];

    // 更新房间
    await db.collection('rooms')
      .where({ roomId, 'players.id': openid })
      .update({
        'players.$.questionCount': _.inc(1),
        turnStartedAt: now,
        updatedAt: now,
        ...turnUpdate,
        chatLog: _.push(...chatEntries)
      });

    return {
      code: 0,
      data: {
        answer: aiAnswer,
        room: {
          ...room,
          ...turnUpdate,
          turnStartedAt: now,
          players: room.players.map(p =>
            p.id === openid ? { ...p, questionCount: p.questionCount + 1 } : p
          ),
          chatLog: [...room.chatLog, ...chatEntries]
        }
      }
    };
  } catch (err) {
    console.error('提交问题失败:', err.message);
    return { code: -1, message: '提交问题失败: ' + err.message };
  }
}

// ============ 提交猜测 ============
async function submitGuess(event, openid) {
  const { roomId, guess } = event;

  if (!roomId || !guess) {
    return { code: -1, message: '缺少参数' };
  }

  try {
    const result = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' };
    }

    const room = result.data[0];

    if (room.status !== 'playing') {
      return { code: -1, message: '游戏未开始或已结束' };
    }

    // 从 puzzleId 获取谜题内容（前端可能未传 riddle/answer）
    let riddle = event.riddle || '';
    let answer = event.answer || '';
    if ((!riddle || !answer) && room.puzzleId) {
      const puzzle = getPuzzleById(room.puzzleId);
      if (puzzle) {
        riddle = riddle || puzzle.riddle || '';
        answer = answer || puzzle.answer || '';
      }
    }

    // 调用 askAi 判断答案是否正确
    const checkResult = await app.callFunction({
      name: 'askAi',
      data: {
        question: `我猜答案是：${guess}。对吗？`,
        riddle,
        answer
      }
    });

    const aiResponse = checkResult.result || { ans: 'unrelated', exp: '' };
    const isCorrect = aiResponse.ans === 'yes';

    // 计算分数
    const player = room.players.find(p => p.id === openid);
    const questionCount = player ? player.questionCount : 0;
    const baseScore = isCorrect ? Math.max(100 - questionCount * 10, 20) : 0;
    const grade = isCorrect
      ? (questionCount <= 3 ? 'S' : questionCount <= 5 ? 'A' : questionCount <= 7 ? 'B' : 'C')
      : 'F';

    const now = Date.now();

    if (isCorrect) {
      // 猜对了，游戏结束
      const isSolo = room.mode === 'solo';
      const elapsed = room.turnStartedAt ? Math.floor((now - room.turnStartedAt) / 1000) : 0;

      await db.collection('rooms')
        .where({ roomId })
        .update({
          status: 'finished',
          winnerId: openid,
          winnerGrade: grade,
          winnerQuestionCount: questionCount,
          elapsedSeconds: elapsed,
          updatedAt: now,
          chatLog: _.push({
            playerId: openid,
            playerName: player.name,
            type: 'guess',
            content: `我猜答案是：${guess}`,
            timestamp: now
          }, {
            playerId: 'system',
            playerName: '系统',
            type: 'system',
            content: isSolo
              ? `🎉 ${player.name} 猜对了！答案是：${answer || guess}（单人练习不计分）`
              : `🎉 ${player.name} 猜对了！答案是：${answer || guess}`,
            timestamp: now + 1
          })
        });

      // solo 模式不奖励金币（只有联机对战才有积分收益）
      if (!isSolo) {
        await awardCoins(openid, 100);
      }
    } else {
      // 竞技制：猜错扣 5 分（不低于 0 分）
      const competePenalty = room.mode === 'compete' && player && player.score > 0
        ? { 'players.$.score': _.inc(Math.max(-5, -player.score)) }
        : {};

      await db.collection('rooms')
        .where({ roomId, 'players.id': openid })
        .update({
          updatedAt: now,
          ...competePenalty,
          chatLog: _.push({
            playerId: openid,
            playerName: player.name,
            type: 'guess',
            content: `我猜答案是：${guess}`,
            timestamp: now
          }, {
            playerId: 'system',
            playerName: '系统',
            type: 'system',
            content: room.mode === 'compete'
              ? `❌ ${player.name} 猜错了，扣5分！游戏继续`
              : `❌ ${player.name} 猜错了，游戏继续`,
            timestamp: now + 1
          })
        });
    }

    const isSolo = room.mode === 'solo';

    return {
      code: 0,
      data: {
        correct: isCorrect,
        score: isSolo ? 0 : baseScore,       // solo 不计分
        grade: isSolo ? '练习' : grade,       // solo 显示"练习"
        rewarded: !isSolo,                     // solo 不奖励
        isSolo,
        room: {
          ...room,
          status: isCorrect ? 'finished' : room.status,
          winnerId: isCorrect ? openid : null
        }
      }
    };
  } catch (err) {
    console.error('提交猜测失败:', err.message);
    return { code: -1, message: '提交猜测失败' };
  }
}

// ============ 切换准备状态 ============
async function toggleReady(event, openid) {
  const { roomId } = event;

  if (!roomId) {
    return { code: -1, message: '缺少房间ID' };
  }

  try {
    const result = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' };
    }

    const room = result.data[0];

    if (room.status !== 'waiting') {
      return { code: -1, message: '游戏已开始' };
    }

    const player = room.players.find(p => p.id === openid);
    if (!player) {
      return { code: -1, message: '你不在房间中' };
    }

    const newReadyState = !player.isReady;

    // 更新特定玩家的 isReady
    await db.collection('rooms')
      .where({ roomId, 'players.id': openid })
      .update({
        'players.$.isReady': newReadyState,
        updatedAt: Date.now()
      });

    return {
      code: 0,
      data: {
        room: {
          ...room,
          players: room.players.map(p =>
            p.id === openid ? { ...p, isReady: newReadyState } : p
          )
        }
      }
    };
  } catch (err) {
    console.error('切换准备状态失败:', err.message);
    return { code: -1, message: '操作失败' };
  }
}

// ============ 设置玩家昵称 ============
async function setPlayerName(event, openid) {
  const { roomId, name } = event;

  if (!name) {
    return { code: -1, message: '缺少昵称' };
  }

  try {
    // 如果没有 roomId，尝试在所有房间中更新昵称
    if (roomId) {
      await db.collection('rooms')
        .where({ roomId, 'players.id': openid })
        .update({
          'players.$.name': name.slice(0, 12),
          updatedAt: Date.now()
        });
    } else {
      // 全局更新：在所有房间中更新该玩家的昵称
      const rooms = await db.collection('rooms')
        .where({ 'players.id': openid })
        .get();

      for (const room of rooms.data || []) {
        await db.collection('rooms')
          .where({ roomId: room.roomId, 'players.id': openid })
          .update({
            'players.$.name': name.slice(0, 12),
            updatedAt: Date.now()
          });
      }
    }

    return { code: 0, data: { success: true } };
  } catch (err) {
    console.error('设置昵称失败:', err.message);
    return { code: -1, message: '设置昵称失败' };
  }
}

// ============ 奖励金币 ============
async function awardCoins(openid, amount) {
  try {
    const result = await db.collection('user_currency')
      .where({ _openid: openid })
      .limit(1)
      .get();

    if (result.data && result.data.length > 0) {
      await db.collection('user_currency')
        .where({ _openid: openid })
        .update({
          coins: _.inc(amount),
          updatedAt: Date.now()
        });
    } else {
      await db.collection('user_currency').add({
        _openid: openid,
        coins: amount,
        gems: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  } catch (err) {
    console.error('奖励金币失败:', err.message);
  }
}

// ============ 在线人数统计（从活跃房间估算） ============
async function getOnlineCount() {
  try {
    const result = await db.collection('rooms')
      .where({
        status: _.in(['waiting', 'playing', 'matching'])
      })
      .get();

    // 估算在线人数：每个活跃房间 × 房间平均人数
    const activeRooms = (result.data || []).length;
    const totalPlayers = (result.data || []).reduce((sum, r) =>
      sum + (r.players || []).length, 0);

    // 加上基础在线人数偏移（没在房间但浏览中的用户）
    const estimatedCount = Math.max(totalPlayers + activeRooms * 2, 1);

    return { code: 0, data: { count: estimatedCount, activeRooms } };
  } catch (err) {
    console.error('获取在线人数失败:', err.message);
    return { code: 0, data: { count: 1, activeRooms: 0 } };
  }
}

// ============ 公开房间列表（大厅展示） ============
async function listPublicRooms() {
  try {
    const result = await db.collection('rooms')
      .where({
        status: _.in(['waiting', 'playing']),
        mode: _.neq('solo')  // 排除单人练习
      })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const rooms = (result.data || []).map(room => ({
      roomId: room.roomId,
      shareCode: room.shareCode,
      status: room.status,         // waiting | playing
      mode: room.mode,             // turn | race | coop | compete
      modeName: ({ turn: '轮流制', race: '抢答制', coop: '合作制', compete: '竞技制' })[room.mode] || room.mode,
      maxPlayers: room.maxPlayers,
      playerCount: (room.players || []).length,
      players: (room.players || []).map(p => ({ name: p.name, avatar: p.avatar, characterId: p.characterId })),
      puzzleTitle: room.puzzleTitle || '',
      puzzleId: room.puzzleId || null,
      timeLimit: room.timeLimit,
      createdAt: room.createdAt
    }));

    return { code: 0, data: { rooms, total: rooms.length } };
  } catch (err) {
    console.error('获取房间列表失败:', err.message);
    return { code: -1, message: '获取房间列表失败' };
  }
}

// ============ 房间预览（邀请链接前预览）============
async function getRoomPreview(event) {
  const { shareCode } = event;

  if (!shareCode) {
    return { code: -1, message: '缺少房间号' };
  }

  try {
    const result = await db.collection('rooms')
      .where({ shareCode: shareCode.toUpperCase() })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' };
    }

    const room = result.data[0];
    const playerCount = (room.players || []).length;
    const canJoin = room.status === 'waiting'
      && room.mode !== 'solo'
      && playerCount < room.maxPlayers;

    const modeNames = { turn: '轮流制', race: '抢答制', coop: '合作制', compete: '竞技制' };

    return {
      code: 0,
      data: {
        roomId: room.roomId,
        shareCode: room.shareCode,
        status: room.status,
        mode: room.mode,
        modeName: modeNames[room.mode] || room.mode,
        playerCount,
        maxPlayers: room.maxPlayers,
        players: (room.players || []).map(p => ({
          name: p.name,
          avatar: p.avatar
        })),
        puzzleTitle: room.puzzleTitle || '',
        timeLimit: room.timeLimit,
        canJoin
      }
    };
  } catch (err) {
    console.error('获取房间预览失败:', err.message);
    return { code: -1, message: '获取房间预览失败' };
  }
}

// ============ 谜题列表（大厅选题目） ============
async function listPuzzles(event) {
  const { page = 1, pageSize = 12, type, keyword } = event;

  try {
    // 触发 puzzles.js 加载
    getPuzzleById(0);

    let allPuzzles = [];
    if (PUZZLES_IDS) {
      for (const id of PUZZLES_IDS) {
        const p = PUZZLES_MAP[id];
        if (p) allPuzzles.push(p);
      }
    }

    // 按类型筛选
    if (type && type !== 'all') {
      allPuzzles = allPuzzles.filter(p => p.type === type);
    }

    // 按关键词搜索
    if (keyword) {
      const kw = keyword.toLowerCase();
      allPuzzles = allPuzzles.filter(p =>
        (p.title && p.title.toLowerCase().includes(kw)) ||
        (p.riddle && p.riddle.toLowerCase().includes(kw))
      );
    }

    const total = allPuzzles.length;
    const start = (page - 1) * pageSize;
    const items = allPuzzles.slice(start, start + pageSize).map(p => ({
      id: p.id,
      title: p.title,
      type: p.type,
      stars: p.stars,
      riddle: (p.riddle || '').slice(0, 60) + '...', // 截断谜面预览
      level: p.stars <= 2 ? '简单' : p.stars <= 3 ? '中等' : '困难'
    }));

    const typeNames = { logic: '本格推理', twist: '叙诡反转', eerie: '细思极恐', occult: '变格悬疑', dark: '暗黑重口' };

    return {
      code: 0,
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore: start + pageSize < total,
        types: Object.entries(typeNames).map(([value, label]) => ({ value, label }))
      }
    };
  } catch (err) {
    console.error('获取谜题列表失败:', err.message);
    return { code: -1, message: '获取谜题列表失败' };
  }
}

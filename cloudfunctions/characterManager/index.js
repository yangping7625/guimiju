// 诡谜局 V2 - 角色管理云函数
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

// ============ 角色模板 ============
const CHARACTER_TEMPLATES = {
  detective_m:  { id: 'detective_m',  name: '侦探·男', rarity: 'common', emoji: '🕵️' },
  detective_f:  { id: 'detective_f',  name: '侦探·女', rarity: 'common', emoji: '🕵️‍♀️' },
  student:      { id: 'student',      name: '推理社学生', rarity: 'common', emoji: '📚' },
  reporter:     { id: 'reporter',     name: '记者',       rarity: 'rare',   emoji: '📰' },
  psychic:      { id: 'psychic',      name: '通灵师',     rarity: 'rare',   emoji: '🔮' },
  doctor:       { id: 'doctor',       name: '法医',       rarity: 'rare',   emoji: '🔬' },
  writer:       { id: 'writer',       name: '悬疑作家',   rarity: 'epic',   emoji: '✒️' },
  hacker:       { id: 'hacker',       name: '黑客',       rarity: 'epic',   emoji: '💻' },
  agent:        { id: 'agent',        name: '特工',       rarity: 'legendary', emoji: '🎭' },
  mastermind:   { id: 'mastermind',   name: '幕后黑手',   rarity: 'legendary', emoji: '♟️' }
};

// 抽卡概率（免费，兑换码解锁后可用）
const GACHA_RATES = [
  { rarity: 'legendary', rate: 0.02, pity: 90 },
  { rarity: 'epic',      rate: 0.08, pity: 0 },
  { rarity: 'rare',      rate: 0.20, pity: 10 },
  { rarity: 'common',    rate: 0.70, pity: 0 }
];

// ============ 主题皮肤模板 ============
// 解锁后所有皮肤免费可用
const THEME_SKINS = {
  theme_halloween: {
    name: '万圣之夜',
    skins: [
      { skinId: 'skin_detective_pumpkin', name: '南瓜侦探',    baseKey: 'detective', rarity: 'rare',
        description: '南瓜头面具+侦探风衣' },
      { skinId: 'skin_psychic_ghost',   name: '幽灵通灵师',  baseKey: 'psychic',  rarity: 'rare',
        description: '灵体共鸣+幽灵面纱' },
      { skinId: 'skin_doctor_vampire',   name: '吸血鬼法医',  baseKey: 'doctor',   rarity: 'epic',
        description: '永生之血+暗夜手术' }
    ]
  },
  theme_qing: {
    name: '古墓迷踪',
    skins: [
      { skinId: 'skin_detective_taoist',  name: '赶尸人道士',  baseKey: 'detective', rarity: 'rare',
        description: '桃木剑+黄符驱邪' },
      { skinId: 'skin_reporter_jiangshi', name: '僵尸记者',    baseKey: 'reporter',  rarity: 'rare',
        description: '清代官服+额贴黄符' },
      { skinId: 'skin_writer_paper',      name: '纸扎人作家',  baseKey: 'writer',    rarity: 'epic',
        description: '纸人替身+灵笔书魂' }
    ]
  },
  theme_undersea: {
    name: '深海迷城',
    skins: [
      { skinId: 'skin_doctor_mermaid',  name: '人鱼法医',   baseKey: 'doctor',   rarity: 'rare',
        description: '珊瑚鳞片+生物发光' },
      { skinId: 'skin_psychic_siren',  name: '海妖通灵师', baseKey: 'psychic',  rarity: 'rare',
        description: '塞壬之歌+珍珠法力' },
      { skinId: 'skin_agent_diver',    name: '潜水员特工', baseKey: 'agent',    rarity: 'epic',
        description: '蒸汽潜水服+鱼叉枪' }
    ]
  },
  theme_carnival: {
    name: '怪诞马戏团',
    skins: [
      { skinId: 'skin_detective_clown',     name: '小丑侦探',     baseKey: 'detective', rarity: 'rare',
        description: '马戏团侦探+哈哈镜' },
      { skinId: 'skin_writer_puppet',       name: '提线木偶作家', baseKey: 'writer',    rarity: 'rare',
        description: '木偶替身+灵笔操控' },
      { skinId: 'skin_hacker_ringmaster',   name: '团长黑客',     baseKey: 'hacker',    rarity: 'epic',
        description: '数据鞭+全息显示屏' }
    ]
  },
  theme_abyss: {
    name: '深渊凝视',
    skins: [
      { skinId: 'skin_detective_void',     name: '虚空侦探',   baseKey: 'detective', rarity: 'epic',
        description: '暗影斗篷+深渊之眼' },
      { skinId: 'skin_reporter_shadow',    name: '暗影记者',   baseKey: 'reporter',  rarity: 'rare',
        description: '半身化影+摄魂相机' },
      { skinId: 'skin_mastermind_eye',     name: '全知之眼',   baseKey: 'mastermind', rarity: 'legendary',
        description: '三色瞳+宇宙长袍' }
    ]
  }
};

// 角色 baseKey → characterId 映射（baseKey 不含性别后缀）
const BASEKEY_TO_CHARIDS = {
  detective: ['detective_m', 'detective_f'],
  student:   ['student'],
  reporter:  ['reporter'],
  psychic:   ['psychic'],
  doctor:    ['doctor'],
  writer:    ['writer'],
  hacker:    ['hacker'],
  agent:     ['agent'],
  mastermind: ['mastermind']
};

// ============ 辅助函数 ============
function getOpenid(context) {
  return (context.OPENID || 'anonymous').trim();
}

// 检查是否为 GM 内测账号
function isGmAccount(openid) {
  // 内测账号通过用户 metadata 中的 username 来识别
  // 这里暂时通过 openid 前缀匹配，后面可以改为查数据库
  return false; // 云函数中无法直接获取 username，由前端控制 GM 逻辑
}

function randomCharacter(rarity) {
  const pool = Object.values(CHARACTER_TEMPLATES).filter(c => c.rarity === rarity);
  if (pool.length === 0) return CHARACTER_TEMPLATES.detective_m;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============ 主入口 ============
exports.main = async (event, context) => {
  const { action } = event;
  const openid = getOpenid(context);

  if (!openid) {
    return { code: -1, message: '请先登录' };
  }

  switch (action) {
    case 'getMyCharacters': return getMyCharacters(openid);
    case 'equip':           return equipCharacter(event, openid);
    case 'gacha':           return gacha(event, openid);
    case 'getProfile':      return getProfile(openid);
    case 'listSkins':       return listSkins(openid);
    default:
      return { code: -1, message: '未知操作: ' + action };
  }
};

// ============ 获取我的角色列表 ============
async function getMyCharacters(openid) {
  try {
    const result = await db.collection('user_characters')
      .where({ _openid: openid })
      .get();

    let characters = result.data || [];

    // 新用户：自动赠送默认角色
    if (characters.length === 0) {
      const defaultChar = {
        _openid: openid,
        characterId: 'detective_m',
        skinId: 'default',
        name: '侦探',
        rarity: 'common',
        emoji: '🕵️',
        previewUrl: '',
        obtainedAt: Date.now(),
        isEquipped: true
      };
      const addResult = await db.collection('user_characters').add(defaultChar);
      defaultChar.id = addResult.id;
      defaultChar._id = addResult.id;
      characters = [defaultChar];
    }

    const equipped = characters.find(c => c.isEquipped);

    return {
      code: 0,
      data: {
        characters,
        equippedId: equipped ? equipped.characterId : null
      }
    };
  } catch (err) {
    console.error('获取角色列表失败:', err.message);
    return { code: -1, message: '获取角色列表失败' };
  }
}

// ============ 装备角色 ============
async function equipCharacter(event, openid) {
  const { characterId, skinId } = event;

  if (!characterId) {
    return { code: -1, message: '请选择角色' };
  }

  try {
    // 确认用户拥有该角色
    const result = await db.collection('user_characters')
      .where({ _openid: openid, characterId })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '你还没有这个角色' };
    }

    // 取消当前装备
    await db.collection('user_characters')
      .where({ _openid: openid, isEquipped: true })
      .update({ isEquipped: false });

    // 装备新角色
    const updateData = { isEquipped: true };
    if (skinId) updateData.skinId = skinId;

    await db.collection('user_characters')
      .where({ _openid: openid, characterId })
      .update(updateData);

    return { code: 0, data: { success: true } };
  } catch (err) {
    console.error('装备角色失败:', err.message);
    return { code: -1, message: '装备失败' };
  }
}

// ============ 抽卡（免费，兑换码解锁后由前端检查权限） ============
async function gacha(event, openid) {
  const { type = 'single' } = event;

  // 获取保底计数
  const pityResult = await db.collection('user_characters')
    .where({ _openid: openid })
    .get();

  const existingChars = pityResult.data || [];
  let pityCount = 0;

  // 简单保底：统计自上次传说以来的抽数
  const sortedByTime = [...existingChars].sort((a, b) => (b.obtainedAt || 0) - (a.obtainedAt || 0));
  for (const c of sortedByTime) {
    if (c.rarity === 'legendary') break;
    pityCount++;
  }

  // 执行抽卡
  const count = type === 'ten' ? 10 : 1;
  const results = [];
  let isGuaranteed = false;
  let newPityCount = pityCount;

  for (let i = 0; i < count; i++) {
    newPityCount++;
    let rolledRarity;

    if (newPityCount >= 90) {
      rolledRarity = 'legendary';
      isGuaranteed = true;
      newPityCount = 0;
    } else if (newPityCount >= 10 && Math.random() < 0.02) {
      rolledRarity = Math.random() < 0.1 ? 'epic' : 'rare';
    } else {
      const roll = Math.random();
      let cumulative = 0;
      rolledRarity = 'common';
      for (const rate of GACHA_RATES) {
        cumulative += rate.rate;
        if (roll <= cumulative) {
          rolledRarity = rate.rarity;
          break;
        }
      }
    }

    const charTemplate = randomCharacter(rolledRarity);
    const userChar = {
      _openid: openid,
      characterId: charTemplate.id,
      skinId: 'default',
      name: charTemplate.name,
      rarity: charTemplate.rarity,
      emoji: charTemplate.emoji,
      previewUrl: '',
      obtainedAt: Date.now(),
      isEquipped: false
    };

    const addResult = await db.collection('user_characters').add(userChar);
    userChar.id = addResult.id;
    results.push(userChar);

    if (rolledRarity === 'legendary') {
      newPityCount = 0;
    }
  }

  return {
    code: 0,
    data: {
      characters: results,
      isGuaranteed,
      pity: 90 - newPityCount
    }
  };
}

// ============ 获取个人主页数据 ============
async function getProfile(openid) {
  try {
    // 查询用户完成的房间（参与过的游戏）
    const roomResult = await db.collection('rooms')
      .where({
        'players.id': openid,
        status: 'finished'
      })
      .get();

    const totalGames = (roomResult.data || []).length;
    let wins = 0;
    let totalScore = 0;
    let hasSRank = false;
    let has20Questions = false;
    let hasSpeedRun = false;

    for (const room of roomResult.data || []) {
      if (room.winnerId === openid) {
        wins++;
        // 检查 S 评级
        if (room.winnerGrade === 'S') hasSRank = true;
        // 检查单局提问 20 次以上
        if ((room.winnerQuestionCount || 0) >= 20) has20Questions = true;
        // 检查 3 分钟内通关（180秒）
        if ((room.elapsedSeconds || 999) <= 180) hasSpeedRun = true;
      }
      // 查找该玩家在房间中的得分
      const player = (room.players || []).find(p => p.id === openid);
      if (player && player.score) totalScore += player.score;
    }

    // 成就判断
    const achievements = [];
    if (totalGames >= 1) achievements.push('a1');
    if (wins >= 1) achievements.push('a2');
    if (hasSRank) achievements.push('a3');
    if (totalGames >= 10) achievements.push('a4');
    if (has20Questions) achievements.push('a5');
    if (hasSpeedRun) achievements.push('a6');

    // 查询角色收集数
    const charResult = await db.collection('user_characters')
      .where({ _openid: openid })
      .get();
    if ((charResult.data || []).length >= 5) achievements.push('a7');
    if (totalGames >= 100) achievements.push('a8');

    return {
      code: 0,
      data: {
        totalGames,
        wins,
        totalScore,
        achievements
      }
    };
  } catch (err) {
    console.error('获取个人数据失败:', err.message);
    return { code: 0, data: { totalGames: 0, wins: 0, totalScore: 0, achievements: [] } };
  }
}

// ============ 获取皮肤列表（Route A：解锁后全免费） ============
function listSkins(openid) {
  // 构建皮肤列表，带 baseKey 适配的角色 characterId
  const themes = Object.entries(THEME_SKINS).map(([themeId, theme]) => ({
    themeId,
    name: theme.name,
    skins: theme.skins.map(s => ({
      ...s,
      // 把 baseKey 映射为实际可装备的 characterId 列表
      applicableTo: BASEKEY_TO_CHARIDS[s.baseKey] || [s.baseKey]
    }))
  }));

  return {
    code: 0,
    data: { themes }
  };
}

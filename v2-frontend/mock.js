// ================================================================
// 诡谜局 V2 · Mock 数据（开发用，联调时替换为真实云函数调用）
// ================================================================

// ---- 角色性别-立绘映射表 ----
// 每个角色基类有 male/female 两个版本
// characterId 格式: 基类名_m / 基类名_f（如 detective_m, detective_f）
const CHARACTER_PORTRAITS = {
  detective:   { male: 'assets/char-detective.png',   female: 'assets/char-detective-f(1).png' },
  student:    { male: 'assets/char-student-m.png',    female: 'assets/char-student-f.png' },
  reporter:   { male: 'assets/char-reporter.png',    female: 'assets/char-reporter-f.png' },
  psychic:    { male: 'assets/char-psychic.png',    female: 'assets/char-psychic-f.png' },
  doctor:     { male: 'assets/char-doctor.png',    female: 'assets/char-doctor-f.png' },
  writer:     { male: 'assets/char-writer.png',      female: 'assets/char-writer-f.png' },
  hacker:     { male: 'assets/char-hacker-m.png',    female: 'assets/char-hacker.png' },
  agent:      { male: 'assets/char-agent.png',       female: 'assets/char-agent-f.png' },
  mastermind: { male: 'assets/char-mastermind.png',  female: 'assets/char-mastermind-f.png' }
};

// 角色元数据（名称、稀有度、emoji）
const CHARACTER_META = {
  detective:   { name: '侦探',       rarity: 'common',    emoji: '🕵️' },
  detective_f: { name: '女侦探',     rarity: 'common',    emoji: '🕵️‍♀️' },
  student:    { name: '推理社学生',  rarity: 'common',    emoji: '📚' },
  reporter:   { name: '记者',       rarity: 'rare',      emoji: '📰' },
  psychic:    { name: '通灵师',     rarity: 'rare',      emoji: '🔮' },
  doctor:     { name: '法医',       rarity: 'rare',      emoji: '🔬' },
  writer:     { name: '悬疑作家',   rarity: 'epic',      emoji: '✒️' },
  hacker:     { name: '黑客',       rarity: 'epic',      emoji: '💻' },
  agent:      { name: '特工',       rarity: 'legendary', emoji: '🎭' },
  mastermind: { name: '幕后黑手',   rarity: 'legendary', emoji: '♟️' }
};

/**
 * 根据角色基类和性别获取立绘 URL
 * @param {string} baseKey - 角色基类（detective, doctor, reporter 等）
 * @param {string} gender - 'male' | 'female'
 * @returns {string} 图片 URL
 */
function getPortraitUrl(baseKey, gender) {
  const entry = CHARACTER_PORTRAITS[baseKey];
  if (!entry) return 'assets/char-detective.png';
  return gender === 'female' ? entry.female : entry.male;
}

/**
 * 从 characterId 推导角色基类和性别
 * @param {string} characterId - 如 'detective_m', 'detective_f', 'doctor'
 * @returns {{ baseKey: string, gender: 'male'|'female' }}
 */
function parseCharacterId(characterId) {
  if (!characterId) return { baseKey: 'detective', gender: 'male' };
  if (characterId.endsWith('_f')) {
    return { baseKey: characterId.slice(0, -2), gender: 'female' };
  }
  if (characterId.endsWith('_m')) {
    return { baseKey: characterId.slice(0, -2), gender: 'male' };
  }
  // 无后缀的角色（旧格式），默认男性
  return { baseKey: characterId, gender: 'male' };
}

// ---- 主题配套皮肤数据 ----
// 每个主题包含3款配套皮肤，购买主题后自动解锁
const THEME_SKINS = {
  theme_halloween: {
    name: '万圣之夜',
    skins: [
      { skinId: 'skin_detective_pumpkin', name: '南瓜侦探',    baseKey: 'detective', rarity: 'rare',
        previewUrl: 'assets/skin-detective-pumpkin.png', description: '南瓜头面具+侦探风衣' },
      { skinId: 'skin_psychic_ghost',   name: '幽灵通灵师',  baseKey: 'psychic',  rarity: 'rare',
        previewUrl: 'assets/skin-psychic-ghost.png',   description: '灵体共鸣+幽灵面纱' },
      { skinId: 'skin_doctor_vampire',   name: '吸血鬼法医',  baseKey: 'doctor',   rarity: 'epic',
        previewUrl: 'assets/skin-doctor-vampire.png',   description: '永生之血+暗夜手术' }
    ]
  },
  theme_qing: {
    name: '古墓迷踪',
    skins: [
      { skinId: 'skin_detective_taoist',  name: '赶尸人道士',  baseKey: 'detective', rarity: 'rare',
        previewUrl: 'assets/skin-detective-taoist.png',  description: '桃木剑+黄符驱邪' },
      { skinId: 'skin_reporter_jiangshi', name: '僵尸记者',    baseKey: 'reporter',  rarity: 'rare',
        previewUrl: 'assets/skin-reporter-jiangshi.png', description: '清代官服+额贴黄符' },
      { skinId: 'skin_writer_paper',      name: '纸扎人作家',  baseKey: 'writer',    rarity: 'epic',
        previewUrl: 'assets/skin-writer-paper.png',      description: '纸人替身+灵笔书魂' }
    ]
  },
  theme_undersea: {
    name: '深海迷城',
    skins: [
      { skinId: 'skin_doctor_mermaid',  name: '人鱼法医',   baseKey: 'doctor',   rarity: 'rare',
        previewUrl: 'assets/skin-doctor-mermaid.png',  description: '珊瑚鳞片+生物发光' },
      { skinId: 'skin_psychic_siren',  name: '海妖通灵师', baseKey: 'psychic',  rarity: 'rare',
        previewUrl: 'assets/skin-psychic-siren.png',  description: '塞壬之歌+珍珠法力' },
      { skinId: 'skin_agent_diver',    name: '潜水员特工', baseKey: 'agent',    rarity: 'epic',
        previewUrl: 'assets/skin-agent-diver.png',    description: '蒸汽潜水服+鱼叉枪' }
    ]
  },
  theme_carnival: {
    name: '怪诞马戏团',
    skins: [
      { skinId: 'skin_detective_clown',     name: '小丑侦探',     baseKey: 'detective', rarity: 'rare',
        previewUrl: 'assets/skin-detective-clown.png',     description: '马戏团侦探+哈哈镜' },
      { skinId: 'skin_writer_puppet',       name: '提线木偶作家', baseKey: 'writer',    rarity: 'rare',
        previewUrl: 'assets/skin-writer-puppet.png',       description: '木偶替身+灵笔操控' },
      { skinId: 'skin_hacker_ringmaster',   name: '团长黑客',     baseKey: 'hacker',    rarity: 'epic',
        previewUrl: 'assets/skin-hacker-ringmaster.png',   description: '数据鞭+全息显示屏' }
    ]
  },
  theme_abyss: {
    name: '深渊凝视',
    skins: [
      { skinId: 'skin_detective_void',     name: '虚空侦探',   baseKey: 'detective', rarity: 'epic',
        previewUrl: 'assets/skin-detective-void.png',     description: '暗影斗篷+深渊之眼' },
      { skinId: 'skin_reporter_shadow',    name: '暗影记者',   baseKey: 'reporter',  rarity: 'rare',
        previewUrl: 'assets/skin-reporter-shadow.png',    description: '半身化影+摄魂相机' },
      { skinId: 'skin_mastermind_eye',      name: '全知之眼',   baseKey: 'mastermind', rarity: 'legendary',
        previewUrl: 'assets/skin-mastermind-eye.png',      description: '三色瞳+宇宙长袍' }
    ]
  }
};

// 用户已拥有的主题和皮肤（mock 数据）
const MOCK_USER_OWNS = {
  themes: ['theme_default'],  // 已拥有主题列表
  skins: []                   // 已拥有皮肤ID列表
};

// ---- Mock 房间状态 ----
const MOCK_ROOM = {
  roomId: 'mock_room_001',
  shareCode: 'A3X92F',
  hostId: 'player_1',
  status: 'waiting',
  mode: 'turn',
  maxPlayers: 4,
  timeLimit: 15,
  timeRemaining: 900,
  currentTurnIndex: 0,
  players: [
    { id: 'player_1', name: '侦探', avatar: '🕵️', characterId: 'detective_m',
      skinId: 'default', seatIndex: 0, isReady: true, questionCount: 0, isOnline: true },
    { id: 'player_2', name: '法医', avatar: '🔬', characterId: 'doctor',
      skinId: 'default', seatIndex: 1, isReady: false, questionCount: 0, isOnline: true },
    { id: 'player_3', name: '记者', avatar: '📰', characterId: 'reporter',
      skinId: 'default', seatIndex: 2, isReady: true, questionCount: 0, isOnline: true }
  ],
  chatLog: [],
  puzzleId: 1,
  winnerId: null
};

// ---- Mock 谜题 ----
const MOCK_PUZZLE = {
  id: 1,
  type: 'eerie',
  level: 'medium',
  title: '海龟汤',
  riddle: '一个男人走进餐厅，点了一碗海龟汤。他喝了一口之后，突然泪流满面，然后自杀了。请问发生了什么事？',
  answer: '这个男人曾经和妻子一起遭遇海难，漂流到荒岛上。妻子在岛上饿死了。同行的船员给他喝了一碗"海龟汤"，他喝完后觉得味道不错。后来被救后，他在餐厅点了真正的海龟汤，发现味道和当时在岛上喝的完全不同，才意识到当年喝的根本不是海龟汤，而是用妻子的肉做的。',
  hints: ['想想他以前在哪里喝过类似的汤', '海难和荒岛是关键']
};

// ---- Mock API ----
const MockAPI = {
  delay(ms = 400) {
    return new Promise(r => setTimeout(r, ms + Math.random() * 300));
  },

  // ===== 房间管理 =====
  async roomManager(action, data) {
    await this.delay();
    switch (action) {
      case 'createRoom':
        return { code: 0, data: {
          roomId: 'mock_room_' + Date.now(),
          shareCode: Math.random().toString(36).substring(2, 8).toUpperCase()
        }};
      case 'joinRoom':
        return { code: 0, data: { room: { ...MOCK_ROOM, players: [...MOCK_ROOM.players] } }};
      case 'leaveRoom':
        return { code: 0, data: { success: true }};
      case 'getRoomState':
        return { code: 0, data: { room: { ...MOCK_ROOM } }};
      case 'startGame': {
        const room = { ...MOCK_ROOM, status: 'playing', chatLog: [
          { playerId: 'system', playerName: '系统', type: 'system',
            content: '游戏开始！谜题已揭晓，开始提问吧', timestamp: Date.now() }
        ]};
        return { code: 0, data: { room }};
      }
      case 'submitQuestion': {
        const answers = [
          { ans: 'yes', exp: '是的，这个细节【非常关键】，仔细想想意味着什么' },
          { ans: 'no', exp: '不对，换个角度想，这【不是重点】' },
          { ans: 'unrelated', exp: '这个问题与真相【无关】，试试别的方向' },
          { ans: 'yes', exp: '没错！你离真相【越来越近】了' },
          { ans: 'no', exp: '这个猜测【不正确】，但方向还算接近' }
        ];
        const answer = answers[Math.floor(Math.random() * answers.length)];
        const room = { ...MOCK_ROOM, status: 'playing' };
        return { code: 0, data: { answer, room }};
      }
      case 'submitGuess': {
        const correct = data.guess && data.guess.includes('妻子') && data.guess.includes('肉');
        return { code: 0, data: {
          correct,
          score: correct ? 95 : 0,
          grade: correct ? 'S' : 'F',
          room: { ...MOCK_ROOM, winnerId: correct ? 'player_1' : null }
        }};
      }
      case 'toggleReady':
        return { code: 0, data: { room: { ...MOCK_ROOM }}};
      case 'setPlayerName':
        return { code: 0, data: { success: true }};
      case 'getOnlineCount':
        return { code: 0, data: { count: 1234, activeRooms: 42 }};
      case 'getRoomPreview': {
        // Mock: 查找是否在 publicRooms 中
        const code = data.shareCode;
        const pubRooms = [
          { roomId: 'mock_pub_1', shareCode: 'A3K9XM', status: 'waiting', mode: 'turn', modeName: '轮流制',
            maxPlayers: 4, playerCount: 2, puzzleTitle: '黑猫',
            players: [{ name: '皮探长', avatar: '🕵️' }, { name: '法医小陈', avatar: '🔬' }],
            timeLimit: 15 },
          { roomId: 'mock_pub_2', shareCode: 'F8T2BN', status: 'playing', mode: 'race', modeName: '抢答制',
            maxPlayers: 6, playerCount: 6, puzzleTitle: '电梯',
            players: [], timeLimit: 20 },
        ];
        const found = pubRooms.find(r => r.shareCode === code);
        if (found) {
          return { code: 0, data: { ...found, canJoin: found.playerCount < found.maxPlayers && found.status === 'waiting' }};
        }
        // 其他房间号也 mock 为可加入
        return { code: 0, data: {
          roomId: 'mock_preview_' + code, shareCode: code, status: 'waiting', mode: 'turn', modeName: '轮流制',
          playerCount: 1, maxPlayers: 4, puzzleTitle: '密室推理', timeLimit: 15,
          players: [{ name: '神秘玩家', avatar: '🕵️' }], canJoin: true
        }};
      }
      case 'listPublicRooms':
        return { code: 0, data: {
          rooms: [
            { roomId: 'mock_pub_1', shareCode: 'A3K9XM', status: 'waiting', mode: 'turn', modeName: '轮流制',
              maxPlayers: 4, playerCount: 2, puzzleTitle: '黑猫', puzzleId: 3, timeLimit: 15,
              players: [{ name: '皮探长', avatar: '🕵️' }, { name: '法医小陈', avatar: '🔬' }],
              createdAt: Date.now() - 120000 },
            { roomId: 'mock_pub_2', shareCode: 'F8T2BN', status: 'playing', mode: 'race', modeName: '抢答制',
              maxPlayers: 6, playerCount: 4, puzzleTitle: '电梯', puzzleId: 2, timeLimit: 20,
              players: [{ name: '黑客零三', avatar: '💻' }, { name: '作家明哥', avatar: '✒️' },
                        { name: '记者阿华', avatar: '📰' }, { name: '通灵师阿七', avatar: '🔮' }],
              createdAt: Date.now() - 300000 },
            { roomId: 'mock_pub_3', shareCode: 'H5M7YQ', status: 'waiting', mode: 'coop', modeName: '合作制',
              maxPlayers: 4, playerCount: 1, puzzleTitle: '偏心', puzzleId: 10, timeLimit: 10,
              players: [{ name: '推理萌新', avatar: '📚' }],
              createdAt: Date.now() - 60000 },
            { roomId: 'mock_pub_4', shareCode: 'L9W4PD', status: 'waiting', mode: 'compete', modeName: '竞技制',
              maxPlayers: 4, playerCount: 3, puzzleTitle: '交换照片', puzzleId: 7, timeLimit: 30,
              players: [{ name: '特工零七', avatar: '🎭' }, { name: '幕后老李', avatar: '♟️' },
                        { name: '悬疑迷', avatar: '✒️' }],
              createdAt: Date.now() - 90000 }
          ],
          total: 4
        }};
      case 'listPuzzles': {
        const type = data.type || 'all';
        const keyword = (data.keyword || '').toLowerCase();
        const allPuzzles = [
          { id: 1, title: '葬礼', type: 'logic', stars: 2, riddle: '有母女三人，母亲去世了，姐妹俩去参加葬礼。妹妹在葬礼上遇见了一个很有型的男子...', level: '简单' },
          { id: 2, title: '电梯', type: 'logic', stars: 3, riddle: '我走进电梯准备去上学，随着电梯的上升，我知道，我再也无法去学校了...', level: '中等' },
          { id: 3, title: '黑猫', type: 'logic', stars: 3, riddle: '我杀了人。当警察带走我的时候，我看到了门口的黑猫，它一直在盯着我...', level: '中等' },
          { id: 7, title: '交换照片', type: 'logic', stars: 3, riddle: '最近新认识了一个网友，他提出和我交换照片。看到他的照片后，我出了一身冷汗...', level: '中等' },
          { id: 10, title: '偏心', type: 'logic', stars: 2, riddle: '我数学考了148分，爸爸罚了我。而姐姐只考了36分，爸爸却奖励了她...', level: '简单' },
          { id: 11, title: '双胞胎', type: 'twist', stars: 3, riddle: '我和双胞胎姐姐从小形影不离。有一天，姐姐突然对我说：其实我不是你姐姐...', level: '中等' },
          { id: 15, title: '镜子', type: 'eerie', stars: 4, riddle: '每天早晨我都对着镜子梳头。直到有一天，镜子里的我先放下了梳子...', level: '困难' },
          { id: 20, title: '纸人', type: 'occult', stars: 4, riddle: '村口的纸扎铺里，师傅扎的纸人越来越像活人了。今天，我看到了自己的纸人...', level: '困难' },
          { id: 25, title: '地下室', type: 'dark', stars: 5, riddle: '新租的房子地下室总有怪声。房东说那只是水管。但我发现地下室的锁是新的...', level: '困难' },
          { id: 30, title: '照片里的我', type: 'eerie', stars: 3, riddle: '翻看家庭相册时，我发现每张照片里都有一个模糊的人影。放大一看，那个人影是我...', level: '中等' },
          { id: 35, title: '最后一班车', type: 'twist', stars: 3, riddle: '每天坐末班车回家，司机总是同一个人。直到有一天，司机回过头对我说：你终于看到了...', level: '中等' },
          { id: 40, title: '老宅', type: 'occult', stars: 5, riddle: '回老家整理祖宅，发现一本日记。最后一页写着：它就在你身后...', level: '困难' }
        ];
        let filtered = allPuzzles;
        if (type !== 'all') filtered = filtered.filter(p => p.type === type);
        if (keyword) filtered = filtered.filter(p => p.title.toLowerCase().includes(keyword) || p.riddle.toLowerCase().includes(keyword));
        return { code: 0, data: {
          items: filtered,
          total: filtered.length,
          page: data.page || 1,
          pageSize: data.pageSize || 12,
          hasMore: false,
          types: [
            { value: 'logic', label: '本格推理' },
            { value: 'twist', label: '叙诡反转' },
            { value: 'eerie', label: '细思极恐' },
            { value: 'occult', label: '变格悬疑' },
            { value: 'dark', label: '暗黑重口' }
          ]
        }};
      }
      default:
        return { code: -1, message: '未知操作: ' + action };
    }
  },

  // ===== 角色管理 =====
  async characterManager(action, data) {
    await this.delay();
    switch (action) {
      case 'getMyCharacters': {
        // 根据用户性别动态生成角色立绘
        const gender = (typeof V2App !== 'undefined' && V2App.user && V2App.user.gender) || 'male';
        const mkPreview = (baseKey) => getPortraitUrl(baseKey, gender);

        // 构建每个角色的可用皮肤列表（default + 已拥有主题配套）
        const characters = [
          { id: '1', characterId: 'detective_m', skinId: 'default',
            name: '侦探', rarity: 'common', baseKey: 'detective',
            previewUrl: mkPreview('detective'),
            obtainedAt: Date.now() - 86400000, isEquipped: true },
          { id: '2', characterId: 'student', skinId: 'default',
            name: '推理社学生', rarity: 'common', baseKey: 'student',
            previewUrl: mkPreview('student'),
            obtainedAt: Date.now() - 43200000, isEquipped: false },
          { id: '3', characterId: 'reporter', skinId: 'default',
            name: '记者', rarity: 'rare', baseKey: 'reporter',
            previewUrl: mkPreview('reporter'),
            obtainedAt: Date.now() - 10000000, isEquipped: false }
        ];

        // 为每个角色附加可用皮肤
        characters.forEach(c => {
          c.availableSkins = [{ skinId: 'default', name: '默认形象', previewUrl: c.previewUrl }];
          // 遍历已拥有主题的配套皮肤
          MOCK_USER_OWNS.themes.forEach(themeId => {
            const themeData = THEME_SKINS[themeId];
            if (themeData) {
              themeData.skins.forEach(skin => {
                if (skin.baseKey === c.baseKey) {
                  c.availableSkins.push({ skinId: skin.skinId, name: skin.name, previewUrl: skin.previewUrl });
                }
              });
            }
          });
        });

        return { code: 0, data: { characters, equippedId: '1' }};
      }
      case 'equip':
        return { code: 0, data: { success: true }};
      case 'gacha': {
        const allChars = [
          { characterId: 'detective_m', name: '侦探', rarity: 'common', emoji: '🕵️', baseKey: 'detective' },
          { characterId: 'detective_f', name: '女侦探', rarity: 'common', emoji: '🕵️‍♀️', baseKey: 'detective' },
          { characterId: 'student', name: '推理社学生', rarity: 'common', emoji: '📚', baseKey: 'student' },
          { characterId: 'reporter', name: '记者', rarity: 'rare', emoji: '📰', baseKey: 'reporter' },
          { characterId: 'psychic', name: '通灵师', rarity: 'rare', emoji: '🔮', baseKey: 'psychic' },
          { characterId: 'doctor', name: '法医', rarity: 'rare', emoji: '🔬', baseKey: 'doctor' },
          { characterId: 'writer', name: '悬疑作家', rarity: 'epic', emoji: '✒️', baseKey: 'writer' },
          { characterId: 'hacker', name: '黑客', rarity: 'epic', emoji: '💻', baseKey: 'hacker' },
          { characterId: 'agent', name: '特工', rarity: 'legendary', emoji: '🎭', baseKey: 'agent' },
          { characterId: 'mastermind', name: '幕后黑手', rarity: 'legendary', emoji: '♟️', baseKey: 'mastermind' }
        ];
        const count = data.type === 'ten' ? 10 : 1;
        const pulled = [];
        const gender = (typeof V2App !== 'undefined' && V2App.user && V2App.user.gender) || 'male';
        for (let i = 0; i < count; i++) {
          const r = Math.random();
          let pool;
          if (r < 0.02) pool = allChars.filter(c => c.rarity === 'legendary');
          else if (r < 0.10) pool = allChars.filter(c => c.rarity === 'epic');
          else if (r < 0.30) pool = allChars.filter(c => c.rarity === 'rare');
          else pool = allChars.filter(c => c.rarity === 'common');
          const c = pool[Math.floor(Math.random() * pool.length)];
          const previewUrl = getPortraitUrl(c.baseKey, gender);
          pulled.push({ ...c, id: 'new_' + Date.now() + '_' + i, skinId: 'default',
            previewUrl, obtainedAt: Date.now(), isEquipped: false });
        }
        return { code: 0, data: {
          characters: pulled,
          isGuaranteed: pulled.some(c => c.rarity === 'legendary'),
          pity: Math.floor(Math.random() * 90)
        }};
      }
      case 'getProfile':
        return { code: 0, data: {
          totalGames: 47,
          wins: 12,
          totalScore: 3850,
          achievements: ['a1','a2','a3','a4']
        }};
      default:
        return { code: -1, message: '未知操作: ' + action };
    }
  },

  // ===== AI 回答（模拟版）=====
  async askAi(data) {
    await this.delay(600);
    const answers = [
      { ans: 'yes', exp: '是的，这个细节【非常关键】，仔细想想意味着什么' },
      { ans: 'no', exp: '不对，换个角度想，这【不是重点】' },
      { ans: 'unrelated', exp: '这个问题与真相【无关】，试试别的方向' },
      { ans: 'yes', exp: '没错！你离真相【越来越近】了，继续推理' },
      { ans: 'no', exp: '这个猜测【不正确】，但方向还算接近，再想想' }
    ];
    return answers[Math.floor(Math.random() * answers.length)];
  },

  // ===== 支付 =====
  async handlePayment(action, data) {
    await this.delay();
    if (action === 'getProducts') {
      return { code: 0, data: { products: [
        { productId: 'unlock_all_90', name: '解锁全部谜题', amount: 699, description: '解锁所有谜题与多人联机功能' }
      ]}};
    }
    if (action === 'createOrder') {
      return { code: 0, data: {
        orderId: 'mock_ord_' + Date.now(),
        paymentUrl: 'https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com/pay-confirm.html?orderId=mock_ord_' + Date.now()
      }};
    }
    if (action === 'checkOrder') {
      // mock 自动支付成功
      return { code: 0, data: { paid: true }};
    }
    return { code: -1, message: '未知支付操作' };
  },

  // ===== 排行榜 =====
  async leaderboard(action, data) {
    await this.delay();
    if (action === 'getRanking') {
      return { code: 0, data: {
        type: data.type || 'wins',
        rankings: [
          { id: 'p1', name: '皮探长',   characterId: 'detective_m', totalGames: 18, wins: 12, totalScore: 2850, winRate: 67 },
          { id: 'p2', name: '法医小陈', characterId: 'doctor',      totalGames: 12, wins: 7,  totalScore: 1620, winRate: 58 },
          { id: 'p3', name: '记者阿华', characterId: 'reporter',    totalGames: 22, wins: 9,  totalScore: 1940, winRate: 41 },
          { id: 'p4', name: '黑客零三', characterId: 'hacker',      totalGames: 10, wins: 6,  totalScore: 1380, winRate: 60 },
          { id: 'p5', name: '作家明哥', characterId: 'writer',      totalGames: 15, wins: 5,  totalScore: 1100, winRate: 33 }
        ],
        total: 5
      }};
    }
    return { code: -1, message: '未知操作' };
  }
};


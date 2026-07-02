// ================================================================
// 诡谜局 V2 · 前后端接口契约 (api-contract.js)
// ================================================================
// 这是 Trae（前端）和 CodeBuddy（后端）之间的"合同"
// 前端只需要知道云函数名 + 入参出参，不需要知道内部实现
// 后端只需要按此契约返回数据，不需要知道前端 UI 长什么样
// ================================================================

// ================================================================
// 一、CloudBase 环境信息（前端初始化用）
// ================================================================
const CLOUDBASE_ENV_ID = 'ai-native-d6gdsx2agc8c46199';
// 前端初始化方式（参考 game.js）：
//   const app = cloudbase.init({ env: CLOUDBASE_ENV_ID });
//   const auth = app.auth;
//   await auth.signInAnonymously();
// SDK CDN: https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js

// ================================================================
// 二、所有云函数接口定义
// 前端调用方式：app.callFunction({ name: '函数名', data: { action: '操作', ... } })
// ================================================================

/**
 * ============ 云函数：roomManager（房间管理）============
 * 
 * 所有操作通过 data.action 区分
 */

// --- 操作：createRoom（创建房间）---
// 入参：
//   { action: 'createRoom', puzzleId: number, mode: 'turn'|'race'|'coop'|'compete', maxPlayers: 2-6, timeLimit: number }
// 出参：
//   { code: 0, data: { roomId: string, shareCode: string } }
//   { code: -1, message: '创建失败原因' }

// --- 操作：joinRoom（加入房间）---
// 入参：
//   { action: 'joinRoom', shareCode: string }
// 出参：
//   { code: 0, data: { room: RoomState } }
//   { code: -1, message: '房间不存在/已满/已开始' }

// --- 操作：leaveRoom（离开房间）---
// 入参：
//   { action: 'leaveRoom', roomId: string }
// 出参：
//   { code: 0, data: { success: true } }

// --- 操作：getRoomState（获取房间状态）---
// 入参：
//   { action: 'getRoomState', roomId: string }
// 出参：
//   { code: 0, data: { room: RoomState } }

// --- 操作：startGame（开始游戏）---
// 入参：
//   { action: 'startGame', roomId: string }
// 出参：
//   { code: 0, data: { room: RoomState } }
//   { code: -1, message: '人数不足/不是房主' }

// --- 操作：submitQuestion（提交问题）---
// 入参：
//   { action: 'submitQuestion', roomId: string, question: string }
// 出参：
//   { code: 0, data: { answer: AIAnswer, room: RoomState } }
//   { code: -1, message: '不是你的回合/游戏已结束' }

// --- 操作：submitGuess（提交猜测）---
// 入参：
//   { action: 'submitGuess', roomId: string, guess: string }
// 出参：
//   { code: 0, data: { correct: boolean, score: number, grade: string, room: RoomState } }
//   { code: -1, message: '不是你的回合' }

// --- 操作：toggleReady（切换准备状态）---
// 入参：
//   { action: 'toggleReady', roomId: string }
// 出参：
//   { code: 0, data: { room: RoomState } }

// --- 操作：setPlayerName（设置玩家昵称）---
// 入参：
//   { action: 'setPlayerName', roomId: string, name: string }
// 出参：
//   { code: 0, data: { success: true } }

// --- 操作：listPublicRooms（大厅-获取开放房间列表）---
// 入参：
//   { action: 'listPublicRooms' }
// 出参：
//   { code: 0, data: {
//       rooms: [{
//         roomId: string, shareCode: string,
//         status: 'waiting'|'playing', mode: 'turn'|'race'|'coop'|'compete',
//         modeName: string,          // 中文名："轮流制"/"抢答制"/"合作制"/"竞技制"
//         maxPlayers: number, playerCount: number,
//         players: [{ name, avatar, characterId? }],
//         puzzleTitle: string, puzzleId: number|null,
//         timeLimit: number, createdAt: number
//       }],
//       total: number
//   } }

// --- 操作：listPuzzles（大厅-获取谜题列表，支持按类型筛选）---
// 入参：
//   { action: 'listPuzzles', type?: 'logic'|'twist'|'eerie'|'occult'|'dark'|'all', page?: number, pageSize?: number, keyword?: string }
// 出参：
//   { code: 0, data: {
//       items: [{ id, title, type, stars, riddle: string(截断预览), level: '简单'|'中等'|'困难' }],
//       total: number, page: number, pageSize: number, hasMore: boolean,
//       types: [{ value: string, label: string }]  // 可选类型列表
//   } }

// --- 操作：getOnlineCount（大厅-获取在线人数）---
// 入参：
//   { action: 'getOnlineCount' }
// 出参：
//   { code: 0, data: { count: number, activeRooms: number } }

// --- 操作：getRoomPreview（邀请前预览房间信息，不加入）---
// 入参：
//   { action: 'getRoomPreview', shareCode: string }
// 出参：
//   { code: 0, data: {
//       roomId: string, shareCode: string,
//       status: 'waiting'|'playing', mode: string, modeName: string,
//       playerCount: number, maxPlayers: number,
//       players: [{ name, avatar }],
//       puzzleTitle: string, timeLimit: number,
//       canJoin: boolean   // false = 已满/已结束
//   } }
//   { code: -1, message: '房间不存在' }


/**
 * ============ 云函数：characterManager（角色管理）============
 */

// --- 操作：getMyCharacters（获取我的角色列表）---
// 入参：
//   { action: 'getMyCharacters' }
// 出参：
//   { code: 0, data: { characters: UserCharacter[], equippedId: string } }

// --- 操作：equip（装备角色/皮肤）---
// 入参：
//   { action: 'equip', characterId: string, skinId?: string }
// 出参：
//   { code: 0, data: { success: true } }

// --- 操作：gacha（抽卡，免费，兑换码解锁后可用）---
// 入参：
//   { action: 'gacha', type: 'single'|'ten' }
// 出参：
//   { code: 0, data: GachaResult }


/**
 * ============ 云函数：askAi（AI 回答，升级版）============
 * 在 V1 基础上增加多人上下文参数
 */

// 入参（兼容 V1，新增可选参数）：
// {
//   question: string,       // 玩家问题
//   riddle: string,         // 谜题内容
//   answer: string,         // 正确答案（用于判断）
//   history: Array,         // 历史问答（兼容 V1）
//   roomId?: string,        // 🆕 房间ID（多人模式）
//   playerName?: string,    // 🆕 提问者名字
//   turnNumber?: number     // 🆕 当前第几回合
// }
// 出参：
//   { ans: 'yes'|'no'|'unrelated', exp: '解释文字（含【】标注的线索词）' }


/**
 * ============ 云函数：handlePayment（支付处理，升级版）============
 */

// --- 操作：createOrder（创建订单）---
// 入参：
//   { action: 'createOrder', productId: string, amount: number, description: string }
// 出参：
//   { code: 0, data: { orderId: string, paymentUrl: string } }

// --- 操作：checkOrder（查询订单）---
// 入参：
//   { action: 'checkOrder', orderId: string }
// 出参：
//   { code: 0, data: { paid: boolean } }

// --- 操作：getProducts（获取商品列表）---
// 入参：
//   { action: 'getProducts' }
// 出参：
//   { code: 0, data: { products: ProductInfo[] } }





// ================================================================
// 三、所有数据结构定义（JSDoc 注释，纯 JS 兼容）
// ================================================================

/**
 * @typedef {Object} RoomState - 房间状态
 * @property {string} roomId
 * @property {string} shareCode - 6位房间号（大写字母+数字）
 * @property {string} hostId - 房主 openid
 * @property {'waiting'|'playing'|'finished'} status
 * @property {'turn'|'race'|'coop'|'compete'} mode
 * @property {number} maxPlayers - 2-6
 * @property {number} timeLimit - 时间上限（分钟）
 * @property {number} timeRemaining - 剩余秒数
 * @property {number} currentTurnIndex - 当前轮到第几个玩家（索引）
 * @property {RoomPlayer[]} players
 * @property {ChatEntry[]} chatLog
 * @property {number} puzzleId - 当前谜题ID
 * @property {string|null} winnerId - 获胜者 openid
 */

/**
 * @typedef {Object} RoomPlayer - 房间内玩家
 * @property {string} id - openid
 * @property {string} name - 昵称
 * @property {string} avatar - emoji 或 URL
 * @property {string} characterId - 装备的角色ID
 * @property {string} skinId - 装备的皮肤ID
 * @property {number} seatIndex - 座位号 0-5
 * @property {boolean} isReady - 准备状态
 * @property {number} questionCount - 已提问次数
 * @property {boolean} isOnline - 是否在线
 */

/**
 * @typedef {Object} ChatEntry - 聊天记录
 * @property {string} playerId
 * @property {string} playerName
 * @property {'question'|'answer'|'system'|'guess'} type
 * @property {string} content
 * @property {number} timestamp
 */

/**
 * @typedef {Object} AIAnswer - AI 回答
 * @property {'yes'|'no'|'unrelated'} ans
 * @property {string} exp - 解释文字（含【】标注的线索词）
 */

/**
 * @typedef {Object} UserCharacter - 用户拥有的角色
 * @property {string} id - 唯一ID（数据库记录ID）
 * @property {string} characterId - 角色模板ID
 * @property {string} skinId - 当前皮肤ID
 * @property {string} name - 角色名
 * @property {'common'|'rare'|'epic'|'legendary'} rarity
 * @property {string} previewUrl - 立绘图片URL（初期用emoji占位）
 * @property {number} obtainedAt - 获得时间戳
 * @property {boolean} isEquipped - 是否当前装备
 */

/**
 * @typedef {Object} GachaResult - 抽卡结果
 * @property {UserCharacter[]} characters - 抽到的角色
 * @property {boolean} isGuaranteed - 是否触发保底
 * @property {number} pity - 距离保底还有多少抽
 * @property {{ coins: number, gems: number }} balance - 最新余额
 */

/**
 * @typedef {Object} ShopItem - 商店商品
 * @property {string} id
 * @property {'character'|'skin'|'effect'|'frame'|'room'} type
 * @property {string} name
 * @property {string} rarity
 * @property {{ coins?: number, gems?: number }} price
 * @property {string} previewUrl
 * @property {boolean} limited - 是否限定
 */

/**
 * @typedef {Object} ProductInfo - 付费商品
 * @property {string} productId
 * @property {string} name
 * @property {number} amount - 价格（分）
 * @property {string} description
 */

// ================================================================
// 四、角色模板数据（初期 10 个角色，前端用 emoji 占位）
// ================================================================
const DEFAULT_CHARACTERS = [
  { id: 'detective_m', name: '侦探·男', rarity: 'common', emoji: '🕵️' },
  { id: 'detective_f', name: '侦探·女', rarity: 'common', emoji: '🕵️‍♀️' },
  { id: 'student',    name: '推理社学生', rarity: 'common', emoji: '📚' },
  { id: 'reporter',   name: '记者',       rarity: 'rare',   emoji: '📰' },
  { id: 'psychic',    name: '通灵师',     rarity: 'rare',   emoji: '🔮' },
  { id: 'doctor',     name: '法医',       rarity: 'rare',   emoji: '🔬' },
  { id: 'writer',     name: '悬疑作家',   rarity: 'epic',   emoji: '✒️' },
  { id: 'hacker',     name: '黑客',       rarity: 'epic',   emoji: '💻' },
  { id: 'agent',      name: '特工',       rarity: 'legendary', emoji: '🎭' },
  { id: 'mastermind', name: '幕后黑手',   rarity: 'legendary', emoji: '♟️' }
];

// ================================================================
// 五、常量
// ================================================================
const GACHA_RATES = {
  common:    0.70,
  rare:      0.20,
  epic:      0.08,
  legendary: 0.02
};

const ROOM_CODE_LENGTH = 6;
const MAX_QUESTIONS_PER_PLAYER = 10;
const DEFAULT_TIME_LIMIT = 15; // 分钟
const GACHA_SINGLE_COST = { gems: 60 };   // 单抽 60 宝石（≈6元）
const GACHA_TEN_COST = { gems: 540 };     // 十连 540 宝石（≈54元）
const PITY_LEGENDARY = 90;                // 90 抽保底传说
const PITY_RARE = 10;                     // 10 抽保底稀有
const COINS_PER_GAME = 50;                // 每局获得金币
const COINS_PER_WIN = 100;                // 猜对额外金币

// 商品 ID 列表
const PRODUCTS = {
  UNLOCK_ALL: 'unlock_all_90',       // 解锁全部谜题（V1 保留）
  GEMS_60: 'gems_60',               // 60 宝石（6元）
  GEMS_300: 'gems_300',             // 300 宝石（30元）
  GEMS_980: 'gems_980',             // 980 宝石（98元）
  GEMS_1980: 'gems_1980',           // 1980 宝石（198元）
  BATTLE_PASS: 'battle_pass',       // 通行证（30元/月）
  UNLIMITED_ROOM: 'unlimited_room', // 无限建房（12元/月）
};

// 游戏模式
const GAME_MODES = {
  turn:    { name: '轮流制', icon: '🔄', desc: '每人轮流提问，AI 逐一回答' },
  race:    { name: '抢答制', icon: '⚡', desc: '所有人同时打字，AI 回答第一个提交的问题' },
  coop:    { name: '合作制', icon: '🤝', desc: '所有人可看到彼此问题，共同推理' },
  compete: { name: '竞技制', icon: '🏆', desc: '每人独立提问，互不可见，比谁先猜对' }
};

// ================================================================
// 六、导出（浏览器环境用全局变量）
// ================================================================
if (typeof window !== 'undefined') {
  window.GuimijuV2 = {
    CLOUDBASE_ENV_ID,
    DEFAULT_CHARACTERS,
    GACHA_RATES,
    ROOM_CODE_LENGTH,
    MAX_QUESTIONS_PER_PLAYER,
    DEFAULT_TIME_LIMIT,
    GACHA_SINGLE_COST,
    GACHA_TEN_COST,
    PITY_LEGENDARY,
    PITY_RARE,
    COINS_PER_GAME,
    COINS_PER_WIN,
    PRODUCTS,
    GAME_MODES
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CLOUDBASE_ENV_ID,
    DEFAULT_CHARACTERS,
    GACHA_RATES,
    ROOM_CODE_LENGTH,
    MAX_QUESTIONS_PER_PLAYER,
    DEFAULT_TIME_LIMIT,
    GACHA_SINGLE_COST,
    GACHA_TEN_COST,
    PITY_LEGENDARY,
    PITY_RARE,
    COINS_PER_GAME,
    COINS_PER_WIN,
    PRODUCTS,
    GAME_MODES
  };
}

# 诡谜局 V2 · 前端任务总览

> 给 Trae 的任务说明 — 你负责 V2 的全部前端（HTML+CSS+JS），后端由 CodeBuddy 负责。

---

## 你需要交付的文件

```
v2-frontend/
├── lobby.html          # 大厅页面
├── room.html           # 房间游戏页面
├── character.html      # 角色展示/抽卡页面
├── shop.html           # 商店页面
├── result.html         # 结算页面
├── v2-app.js           # 🔑 应用主入口（CloudBase 初始化 + 全局状态 + 路由）
├── room-game.js        # 房间内游戏逻辑（提问/同步/渲染）
├── character-ui.js     # 角色系统前端逻辑（展示/换装/抽卡动画）
├── v2-style.css        # 全局样式
└── mock.js             # Mock 数据（开发用，联调时删除）
```

---

## 技术约束

1. **纯原生 HTML+CSS+JS** — 与 V1 一致，不引入框架（React/Vue 等）
2. **复用 V1 的 CSS 变量** — 保持暗黑中式恐怖 + 神秘推理风格
3. **CloudBase SDK 初始化** — 方式见 `AGENTS.md` 和 `game.js`（第 226-256 行）
4. **所有后端调用** — 通过 `app.callFunction()` 调用云函数，接口契约在 `../v2-modules/shared/api-contract.js`
5. **先用 mock 开发** — 所有 `app.callFunction()` 调用先用 mock 数据替代，联调时替换

---

## 一、v2-app.js — 应用主入口（最重要）

这是整个前端的大脑，所有其他文件都依赖它。

```js
// v2-app.js
const V2App = {
  // ===== CloudBase 实例 =====
  app: null,
  loginReady: false,
  
  // ===== 当前用户 =====
  user: {
    id: null,
    name: '玩家',         // 默认名
    avatar: '🕵️',        // 默认头像
    coins: 0,
    gems: 0,
    equippedCharacter: null  // { characterId, skinId, name, emoji }
  },
  
  // ===== 初始化 =====
  async init() {
    // 1. 初始化 CloudBase（复制 game.js 第 226-256 行的逻辑）
    //    const app = cloudbase.init({ env: 'ai-native-d6gdsx2agc8c46199' });
    //    await app.auth.signInAnonymously();
    // 
    // 2. 加载用户数据
    //    - 调用 characterManager.getMyCharacters → 获取角色列表
    //    - 调用 characterManager.getBalance → 获取货币
    // 
    // 3. 显示大厅页面
    //    showPage('lobby');
  },
  
  // ===== 调用云函数（统一封装）=====
  async callFn(functionName, data) {
    // 封装 app.callFunction()，处理错误和 loading 状态
    // 开发阶段：直接调 MockAPI[functionName](data.action, data)
    // 联调阶段：改为 app.callFunction({ name: functionName, data })
  },
  
  // ===== 页面路由 =====
  currentPage: null,
  
  showPage(pageId) {
    // 隐藏所有页面，显示指定页面
    // 页面ID：lobby / room / character / shop / result
  },
  
  // ===== Toast 提示 =====
  toast(msg, type) {
    // 复用 V1 的 showToast 实现（game.js 第 575-587 行）
  },
  
  // ===== 音效 =====
  playSound(name) {
    // 复用 V1 的音效系统（game.js 第 590-838 行）
    // 音效文件在 sounds/ 目录
  }
};

// 启动
V2App.init();
```

---

## 二、页面清单

### 2.1 lobby.html — 大厅页面（P0 最高优先级）

```
┌─────────────────────────────────────┐
│  🏠 诡谜局 · 多人推理               │
│                                     │
│  👤 玩家名    💰50    💎0          │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      ⚡ 快速匹配              │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ ➕ 创建房间  │ │ 🔢 加入房间  │   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│  ──────── 房间列表（可选）────────   │
│  ┌─────────────────────────────┐    │
│  │ 🏠 房间 #A3X92F  3/6人  🔍  │    │
│  │ 🏠 房间 #B7K41P  2/4人  ⚡  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌────┬────┬────┬────┐             │
│  │大厅│角色│商店│我的│             │
│  └────┴────┴────┴────┘             │
└─────────────────────────────────────┘
```

**功能**：
- 顶部：游戏名 + 用户信息（昵称/金币/宝石）
- 中间：快速匹配按钮 + 创建房间按钮 + 输入房间号加入
- 底部：四个 Tab（大厅 / 角色 / 商店 / 我的）

### 2.2 room.html — 房间游戏页面（P0 最高优先级）

参考用户发的截图布局：

```
┌─────────────────────────────────────┐
│ 🏠 房间 #A3X9  3/6人  ⏱ 12:30     │
│                                     │
│ ┌──────────┐   ┌────────────────┐   │
│ │ 📜 谜题   │   │  🔍 推理板     │   │
│ │          │   │                │   │
│ │ 一个男人 │   │ • 线索1        │   │
│ │ 走进餐厅 │   │ • 线索2        │   │
│ │ 点了海龟 │   │ • 待确认...    │   │
│ │ 汤...    │   │                │   │
│ └──────────┘   └────────────────┘   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💬 AI主持人：轮到 @小明 提问    │ │
│ │                                 │ │
│ │ 小明：汤里有毒吗？              │ │
│ │ 🤖 AI：否 · 汤本身【没有问题】  │ │
│ │                                 │ │
│ │ ┌─────────────────────┐ [发送] │ │
│ │ │ 输入你的问题...      │        │ │
│ │ └─────────────────────┘        │ │
│ └─────────────────────────────────┘ │
│                                     │
│  [🧑小明]  [👧小红]  [👨小刚]      │
│   👑房主    等待中     等待中       │
│                                     │
│  [准备] [邀请] [离开]               │
└─────────────────────────────────────┘
```

**功能**：
- 谜题展示区（左侧便签纸风格卡片）
- 线索推理板（右侧，可展开/收起）
- AI 对话区（中间，聊天室风格，玩家提问 + AI 回答）
- 玩家角色立绘栏（底部横排，每人一个角色 + 名字标签 + 状态）
- 回合指示器（轮到谁显示高亮）
- 等待室状态（准备/取消准备）
- 操作按钮（准备/邀请/离开/猜答案）

### 2.3 character.html — 角色展示/抽卡页面（P1）

**功能**：
- 角色列表（展示已拥有的角色，可点击装备）
- 角色详情（大图展示 + 稀有度 + 皮肤切换）
- 抽卡入口（单抽/十连按钮 + 保底计数显示）
- 抽卡动画（CSS 实现翻牌效果或光效）

### 2.4 shop.html — 商店页面（P1）

**功能**：
- 商品列表（角色/皮肤/特效/房间主题，按类型分类）
- 价格显示（金币/宝石）
- 购买按钮（点击购买 → 弹出确认 → 扣款）
- 余额显示（顶部显示当前金币/宝石）

### 2.5 result.html — 结算页面（P1）

**功能**：
- 结果显示（猜对/猜错/超时）
- 排行榜（本局玩家排名）
- MVP 展示（最快猜对/最少提问）
- 评分（S/A/B/C/D/F）
- 分享按钮（复用 V1 的分享卡片逻辑）
- 再来一局按钮

---

## 三、Mock 数据（开发用）

开发前端时不需要真实后端，用 mock 替代：

```js
// mock.js — 前端开发用，联调时删除
const MockAPI = {
  // 房间管理
  async roomManager(action, data) {
    switch(action) {
      case 'createRoom':
        return { code: 0, data: { 
          roomId: 'mock_room_' + Date.now(), 
          shareCode: 'A3X92F' 
        }};
      case 'joinRoom':
        return { code: 0, data: { room: MOCK_ROOM } };
      case 'submitQuestion':
        return { code: 0, data: { 
          answer: { ans: 'no', exp: '这看起来【不太可能】，换一个方向想想' },
          room: MOCK_ROOM
        }};
      case 'submitGuess':
        return { code: 0, data: { 
          correct: Math.random() > 0.5, 
          score: 85, 
          grade: 'A', 
          room: MOCK_ROOM 
        }};
      default:
        return { code: 0, data: { room: MOCK_ROOM } };
    }
  },
  
  // 角色管理
  async characterManager(action, data) {
    switch(action) {
      case 'getMyCharacters':
        return { code: 0, data: { 
          characters: [
            { id: '1', characterId: 'detective_m', skinId: 'default', 
              name: '侦探·男', rarity: 'common', previewUrl: '', 
              obtainedAt: Date.now(), isEquipped: true }
          ],
          equippedId: 'detective_m'
        }};
      case 'gacha':
        return { code: 0, data: { 
          characters: [{ 
            id: 'new_1', characterId: 'reporter', skinId: 'default',
            name: '记者', rarity: 'rare', previewUrl: '',
            obtainedAt: Date.now(), isEquipped: false
          }],
          isGuaranteed: false, pity: 80,
          balance: { coins: 100, gems: 240 }
        }};
      case 'getBalance':
        return { code: 0, data: { coins: 100, gems: 300 } };
      case 'getShop':
        return { code: 0, data: { items: [
          { id: 'skin_detective_dark', type: 'skin', name: '暗夜侦探', 
            rarity: 'rare', price: { coins: 500 }, previewUrl: '', limited: false },
          { id: 'char_agent', type: 'character', name: '特工', 
            rarity: 'legendary', price: { gems: 300 }, previewUrl: '', limited: true }
        ]}};
      default:
        return { code: 0, data: {} };
    }
  },
  
  // AI 回答
  async askAi(data) {
    const answers = [
      { ans: 'yes', exp: '是的，这个细节【非常关键】' },
      { ans: 'no', exp: '不对，换个角度想，这【不是重点】' },
      { ans: 'unrelated', exp: '这个问题【与真相无关】' }
    ];
    return answers[Math.floor(Math.random() * answers.length)];
  }
};

// Mock 房间数据
const MOCK_ROOM = {
  roomId: 'mock_room_001',
  shareCode: 'A3X92F',
  hostId: 'player_1',
  status: 'playing',
  mode: 'turn',
  maxPlayers: 4,
  timeLimit: 15,
  timeRemaining: 720,
  currentTurnIndex: 0,
  players: [
    { id: 'player_1', name: '小明', avatar: '🕵️', characterId: 'detective_m', 
      skinId: 'default', seatIndex: 0, isReady: true, questionCount: 3, isOnline: true },
    { id: 'player_2', name: '小红', avatar: '👧', characterId: 'detective_f', 
      skinId: 'default', seatIndex: 1, isReady: true, questionCount: 1, isOnline: true },
    { id: 'player_3', name: '小刚', avatar: '👨', characterId: 'student', 
      skinId: 'default', seatIndex: 2, isReady: true, questionCount: 2, isOnline: true }
  ],
  chatLog: [
    { playerId: 'player_1', playerName: '小明', type: 'system', 
      content: '游戏开始！轮到 小明 提问', timestamp: Date.now() - 120000 },
    { playerId: 'player_1', playerName: '小明', type: 'question', 
      content: '汤里有毒吗？', timestamp: Date.now() - 110000 },
    { playerId: 'ai', playerName: 'AI主持人', type: 'answer', 
      content: '否 · 汤本身【没有问题】', timestamp: Date.now() - 105000 }
  ],
  puzzleId: 1,
  winnerId: null
};
```

---

## 四、CSS 风格指南

### 复用 V1 变量
```css
:root {
  --bg: #08080f;         /* 深黑背景 */
  --accent: #7c5ce7;     /* 神秘紫 */
  --gold: #e0b84a;       /* 暗金 */
  --green: #4ecdc4;      /* 青绿 */
  --red: #e74c3c;        /* 暗红（答案相关） */
  --text: #e8e4f0;       /* 主文字 */
  --text-dim: #8a84a0;   /* 次要文字 */
  --card-bg: #12101a;    /* 卡片背景 */
  --border: #2a2540;     /* 边框 */
}
```

### 房间页布局建议
```css
/* 房间页采用 Grid 布局 */
.room-layout {
  display: grid;
  grid-template-columns: 280px 1fr 260px;  /* 谜题区 | 对话区 | 推理板 */
  grid-template-rows: 1fr auto;            /* 主区域 | 角色栏 */
  height: 100vh;
  gap: 8px;
  padding: 8px;
}

/* 底部角色栏 */
.player-bar {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  background: var(--card-bg);
  border-radius: 12px;
}
```

---

## 五、参考文件

| 文件 | 用途 |
|------|------|
| `AGENTS.md` | 项目上下文、CloudBase 用法、数据结构 |
| `game.js` | V1 完整前端逻辑（CloudBase 初始化、API 调用、音效、粒子动画） |
| `index.html` | V1 UI（CSS 变量、风格参考） |
| `puzzles.js` | 谜题数据结构 |
| `../v2-modules/shared/api-contract.js` | 🔑 所有云函数接口定义 |
| `../并行开发交付指南.md` | 分工说明 |
| `../多人联机产品方案.md` | 产品需求 |

---

## 六、不需要你做

- ❌ 不需要写任何后端/云函数代码
- ❌ 不需要操作数据库
- ❌ 不需要部署
- ❌ 不需要处理真实支付
- ❌ 不需要真实角色图片（用 emoji 占位）
- ❌ 不需要实现 V1 的单人模式（CodeBuddy 保留 V1 代码）

## 七、完成后的交付

把所有文件放到 `v2-frontend/` 目录下，然后告诉 CodeBuddy 进行集成。

集成时 CodeBuddy 会：
1. 把你的 mock 调用替换为真实 `app.callFunction()`
2. 合并到项目根目录
3. 部署到 CloudBase

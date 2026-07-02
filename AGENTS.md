# 诡谜局 · 项目上下文 (AGENTS.md)

> 本文档供 AI 编码助手（CodeBuddy / Codex / Cursor / Trae 等）自动读取，记录项目技术栈、架构和开发约定。

---

## 项目概述

「诡谜局」是一个 AI 脑洞推理游戏。玩家阅读谜题后向 AI 提问（是/否问题），AI 通过 DeepSeek API 返回「是/否/无关」的回答并附带线索，玩家推理出真相。

- **当前版本**: V1 单人版（线上运行中）
- **开发中**: V2 多人联机版（详见 `多人联机产品方案.md`）
- **线上地址**: `https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com/?v=20260628`
- **环境 ID**: `ai-native-d6gdsx2agc8c46199`
- **区域**: `ap-shanghai`

---

## 技术架构

```
┌─────────────────────┐        ┌─────────────────────┐
│   前端 (静态托管)     │        │   后端 (云函数)       │
│                     │        │                     │
│  index.html (内联CSS)│ callFn │   askAi (Node 18)   │
│  game.js (逻辑)      │───────▶│   - 调用 DeepSeek   │
│  puzzles.js (30题)   │        │   - 30s 超时        │
│                     │        │   - 256MB 内存      │
└─────────────────────┘        └─────────────────────┘
```

---

## 文件说明

| 文件 | 职责 | 修改频率 |
|------|------|---------|
| `index.html` | 前端页面，HTML+内联CSS，引入 CloudBase SDK、puzzles.js、game.js | 低 |
| `game.js` | 游戏核心逻辑 + CloudBase SDK 初始化 + 调用云函数 | 中 |
| `puzzles.js` | 60 道谜题数据 (`PUZZLES` 数组)，5种类型：logic/twist/eerie/occult/dark | 低 |
| `server.js` | 本地开发用 Node.js HTTP 服务器（含 DeepSeek 代理），仅用于本地调试 | 低 |
| `pay-confirm.html` | 支付确认页面 | 低 |
| `cloudfunctions/askAi/index.js` | 云函数，接收 question/riddle/answer/history，调用 DeepSeek API | 低 |
| `cloudfunctions/generatePuzzles/` | AI 批量生成谜题云函数 | 低 |
| `cloudfunctions/genPuzzle/` | AI 定制生成单道谜题云函数 | 低 |
| `cloudfunctions/handlePayment/` | 支付处理云函数 | 低 |
| `v2-modules/` | 🆕 V2 多人联机版模块（开发中，详见 `并行开发交付指南.md`） | 高 |

---

## CloudBase SDK 调用方式

### SDK 加载
```html
<script src="https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js"></script>
```

### 初始化与匿名登录 (game.js)
```js
const app = cloudbase.init({ env: 'ai-native-d6gdsx2agc8c46199' });
const auth = app.auth; // SDK v2: 属性而非方法
await auth.signInAnonymously(); // SDK v2 新 API
```

### 调用云函数
```js
const result = await app.callFunction({
  name: 'askAi',
  data: {
    question: '玩家的问题',
    riddle: '谜题内容',
    answer: '正确答案',
    history: [{ q: '之前的问题', a: { ans: 'yes', exp: '解释' } }]
  }
});
// result.result = { ans: 'yes'|'no'|'unrelated', exp: '解释文字' }
```

---

## CloudBase 资源配置

| 资源 | 配置 | 状态 |
|------|------|------|
| 静态托管 | 3 个前端文件 (index.html, game.js, puzzles.js) | ✅ 已部署 |
| 云函数 askAi | Node.js 18.15, 30s 超时, 256MB, `DEEPSEEK_API_KEY` 环境变量 | ✅ 运行中（已升级 V2） |
| 云函数 roomManager | Node.js 18.15, 30s 超时, 256MB | ✅ V2（12 个 action，含 getRoomPreview） |
| 云函数 characterManager | Node.js 18.15, 30s 超时, 256MB | ✅ V2（5 个 action，含 listSkins） |
| 云函数 friendManager | Node.js 18.15, 30s 超时, 256MB | ✅ V2 新增 |
| 云函数 leaderboard | Node.js 18.15, 30s 超时, 256MB | ✅ V2 新增 |
| 云函数 matchmaking | Node.js 18.15, 30s 超时, 256MB | ❌ 已移除 |
| 云函数 handlePayment | Node.js 18.15, 30s 超时, 256MB | ✅ V2 升级 |
| 匿名登录 | 已开启 | ✅ |
| 用户名密码登录 | 已开启 | ✅ 🆕 |
| 云函数安全规则 | `auth != null` (允许匿名用户调用) | ✅ |

### NoSQL 数据库集合

| 集合 | 安全规则 | 状态 |
|------|---------|------|
| `rooms` | 所有人可读，登录后可写 | ✅ |
| `user_characters` | 仅本人可读写 | ✅ |
| `user_currency` | 仅本人可读写 | ✅ |
| `user_items` | 仅本人可读写 | ✅ 🆕 |
| `orders` | 仅本人可读写 | ✅ 已有 |
| `user_unlocks` | 仅本人可读写 | ✅ 已有 |

---

## 云函数安全规则（重要）

之前在 `auth.loginType != 'ANONYMOUS'` 规则下导致匿名用户被拒绝，已修改为：
```json
{ "*": { "invoke": "auth != null" } }
```
**修改安全规则时不要加 `loginType` 限制**，否则前端调用会全部失败。

---

## DeepSeek API 调用

### 云函数 (cloudfunctions/askAi/index.js)
```js
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// 请求体
{
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: systemPrompt },  // 包含谜题和规则
    { role: 'user', content: '玩家问：...' }
  ],
  temperature: 0.5,
  max_tokens: 150,
  stream: false
}
```

### 本地开发 (server.js)
直接 `fetch` DeepSeek API，无需 CloudBase SDK。启动方式：
```bash
node server.js  # 监听 localhost:3000
```

---

## 前端数据结构

### 谜题对象 (puzzles.js)
```js
{
  id: 1,
  type: 'logic' | 'twist' | 'eerie' | 'occult' | 'dark',  // 分类
  level: 'easy' | 'medium' | 'hard',
  title: '谜题标题',
  riddle: '谜题正文（玩家看到的描述）',
  answer: '正确答案（AI 判断依据）',
  hints: ['提示1', '提示2']
}
```

### 游戏状态 (game.js)
```js
state = {
  index: 0,        // 当前谜题序号
  current: {...},  // 当前谜题对象
  questions: [],   // [{ q: '问题', a: { ans: 'yes', exp: '解释' } }]
  won: false,
  givenUp: false
}
```

### AI 返回格式
```js
{ ans: 'yes' | 'no' | 'unrelated', exp: '解释文字（含【】标注的线索词）' }
```

---

## 开发约定

1. **修改前端文件后** → 需要通过 CloudBase 静态托管上传覆盖
2. **修改云函数后** → 需要重新部署云函数
3. **所有 AI 回答必须包含【】标注的关键线索词** → 前端用 `.clue-hl` 样式高亮显示
4. **颜色主题** → CSS 变量在 `index.html` 的 `:root` 中定义，暗黑中式恐怖风格
5. **谜题数据在 `puzzles.js`** → 全局变量 `PUZZLES`，是一个数组
6. **`AGENTS.md` 与 `CODEBUDDY.md` 兼容** → CodeBuddy 会优先读取 CODEBUDDY.md，但也会读取 AGENTS.md

---

## 踩坑记录

1. **SDK CDN 地址过期** → 旧地址 `web-9gikcbug35bad3a8...tcb.qcloud.la/sdk/cloudbase.full.js` 返回 418，已换成 `static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js`
2. **SDK v1 vs v2 API 差异** → v2 中 `app.auth` 是属性不是方法，`signInAnonymously()` 替代了旧的 `anonymousAuthProvider().signIn()`
3. **匿名登录需手动开启** → CloudBase 控制台默认关闭，已通过 API 开启
4. **云函数安全规则拒绝匿名** → 旧规则 `auth.loginType != 'ANONYMOUS'` 导致所有前端请求失败，已修复

---

## 部署方式

当前项目部署在 CloudBase 上。需要部署时：
- **CodeBuddy**: 直接使用内置 CloudBase 集成，自动上传和部署
- **Codex / 其他工具**: 需要手动通过 CloudBase CLI 或控制台上传

部署命令参考：
```bash
# 上传前端文件
tcb hosting deploy ./index.html ./game.js ./puzzles.js -e ai-native-d6gdsx2agc8c46199

# 部署云函数
tcb fn deploy askAi -e ai-native-d6gdsx2agc8c46199
```

---

## V2 多人联机版（开发中）

### 相关文档
- `多人联机产品方案.md` — 完整的产品方案（功能、商业化、技术架构）
- `并行开发交付指南.md` — 如何与 Trae 并行开发
- `v2-modules/shared/types.js` — 共享类型定义和常量

### V2 分工（前后端分离模式）
| 角色 | 负责 | 内容 |
|------|------|------|
| **Trae（前端）** | 全部前端 | v2-frontend/ 目录：5个页面 + 动画/特效 + 状态管理 |
| **CodeBuddy（后端）** | 全部后端 | 5个云函数 + 数据库 + 安全规则 + 部署 + 集成 |
| **共享** | api-contract.js | 云函数接口契约（入参/出参定义） |

Trae 前端用 mock 数据开发，联调时替换为真实 `app.callFunction()` 调用。

### V2 已完成功能清单

| 功能 | 负责 | 状态 |
|------|------|------|
| roomManager 云函数（12 action） | CodeBuddy | ✅ |
| characterManager 云函数（4 action） | CodeBuddy | ✅ |
| friendManager 云函数（9 action） | CodeBuddy | ✅ |
| leaderboard 云函数 | CodeBuddy | ✅ |
| 数据库安全规则（7 集合） | CodeBuddy | ✅ |
| 大厅页面 + Deep Link 邀请 | Trae | ✅ |
| 房间页面 + 分享弹窗 | Trae | ✅ 基础功能已有，UI 待美化 |
| 主题切换（6 套主题） | Trae | ✅ |
| 真实云函数联调 | Trae | ✅ 已确认 `useMock: false` 默认值，3 个新 API 全部调通 |
| 角色装备/皮肤选择 | Trae | ✅ |
| 商城/排行页面 | Trae | ✅ |
| 粒子特效 + 音效系统 | Trae | ✅ |

### 🎨 主题切换系统（Trae 前端已完成）

- **入口**："我的"页面 → 设置区域 → "🌙 主题背景"
- **UI**：3×2 网格展示 6 个主题卡片，每张有背景预览图、emoji、名称和描述
- **交互**：点击切换 → 背景图 + 粒子特效 + 音效同步更换；选中主题金色边框 + "当前"徽章
- **持久化**：选择存入 `localStorage`，下次打开自动恢复
- **6 套主题**：

| # | 名称 | Emoji | 风格 |
|---|------|-------|------|
| 1 | 暗黑古堡 | 🏰 | 哥特暗黑 |
| 2 | 万圣之夜 | 🎃 | 南瓜橙黑 |
| 3 | 清明义庄 | 🏮 | 中式冥红 |
| 4 | 深海迷城 | 🌊 | 深海蓝黑 |
| 5 | 怪诞马戏 | 🎪 | 诡异马戏团 |
| 6 | 深渊凝视 | 👁️ | 克苏鲁暗紫 |

### 🔗 前后端联调验证（2026-06-30）

| API | 返回数据 | 状态 |
|-----|---------|------|
| `leaderboard.getOnlineCount` | `{ count: 30, activeRooms: 10 }` | ✅ |
| `roomManager.listPublicRooms` | 6 个真实房间（shareCode/status/mode/playerCount） | ✅ |
| `roomManager.listPuzzles` | 90 道谜题分页（stars/level/type/riddle/types） | ✅ |
| `roomManager.createRoom` | 创建房间返回 roomId + shareCode | ✅ |
| `roomManager.joinRoom` | 通过 shareCode 加入 | ✅ |
| `roomManager.getRoomState` | 房间状态轮询 | ✅ |
| `characterManager.getCharacters` | 角色/皮肤数据 | ✅ |
| `friendManager.*` | 好友全套操作 | ✅ |

**字段映射**：前端已适配真实数据格式（`stars` 数字→星星、`type` 英文→中文标签）。

**已知时序问题**：欢迎弹窗未关闭时 `loadLobbyData` 被 pending，手动关闭弹窗或刷新后正常。Trae 后续优化。

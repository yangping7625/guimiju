# Trae 任务书 · 诡谜局 V2 重构

> CodeBuddy → Trae 交接
> 日期：2026-06-30

---

## 任务总览

```
┌─────────────────────────────────────────────────┐
│  任务 1：接管 V1 前端维护                       │
│  任务 2：V2 前端重构（支付→兑换码）              │
│  任务 3：V2 联调真实云函数                      │
└─────────────────────────────────────────────────┘
```

---

## 任务 1：接管 V1 前端

### 当前状态
V1 已上线运行，代码在项目根目录：
- `index.html` — 主页面（内联 CSS + HTML 结构）
- `game.js` — 游戏逻辑（CloudBase 初始化、认证、AI 问答、兑换码）
- `puzzles.js` — 60 道谜题数据

### 你需要做的
- 接管 V1 的日常维护和迭代
- 不改 V1 的 UI/UX 风格（暗黑中式恐怖，CSS 变量在 index.html :root）
- V1 的收费逻辑**已经是纯兑换码模式**，不用改（见下文）

### V1 兑换码逻辑速查（已有，不需重构）
```
用户点击「🎫 兑换码」→ 弹窗输入 → game.js handleRedeem() 
→ 云函数 handlePayment action=redeemCode 
→ 验证成功 → unlock 全部 60 题 + 写 localStorage + sync 数据库
管理后台：admin-redeem.html（生成/追溯/批次管理）
```

---

## 任务 2：V2 前端重构 — 支付体系改为兑换码

### 当前 V2 支付体系（要改掉的）
| 现有逻辑 | 位置 | 问题 |
|---------|------|------|
| 双货币系统（coins + gems） | v2-app.js | 太复杂 |
| 商城 5 个 Tab（主题/皮肤/特效/边框/充值） | shop-ui.js | 需要微信支付 |
| 微信 Native 扫码支付 | handlePayment 云函数 | 需要商户资质 |
| 宝石定价 6.98~198 元 | handlePayment | 价格体系复杂 |
| 通行证 30 元/月 | battle_pass | 需要订阅能力 |

### 目标 V2 支付体系（要改成什么样）
```
V2 也走兑换码模式：
用户微信找管理员买码 → 输入兑换码 → 解锁 V2 全部功能（多人联机 + 角色系统 + 不限房间数）
```

### 具体要改的文件

#### 2.1 `v2-app.js` — 砍掉双货币，改为解锁标志
```diff
- user: { coins: 0, gems: 0, ... }
+ user: { unlocked: false, ... }   // 一个布尔值替代双货币
```

#### 2.2 `shop-ui.js` — 砍掉商城 5 Tab，改为一个页面
```
改造为：「🔑 解锁完整版」页面
- 一个大大的兑换码输入框
- 底部引导微信购买（复制微信号）
- 无需 coins/gems/定价体系
```

#### 2.3 所有引用 coins/gems 的地方 — 搜索替换
```
搜索关键词：coins, gems, balance, purchase, buy, price, amount
改为：检查 unlocked 标志，未解锁 → 引导输入兑换码
```

#### 2.4 `character.html` — 抽卡改为解锁后可用
```
未解锁：角色界面全灰 + 「🔒 输入兑换码解锁」
已解锁：正常显示角色系统
```

#### 2.5 `room-game.js` — 无限建房改为解锁后可用
```
未解锁：只能加入别人房间（免费体验）
已解锁：可以创建房间
```

### 兑换码验证调用方式（复用 V1）
```js
// 前端直接调云函数，V1 和 V2 共用一个 redeemCode action
const result = await app.callFunction({
  name: 'handlePayment',
  data: {
    action: 'redeemCode',
    code: 'GMJ-XXXXXXXX'  // 用户输入的兑换码
  }
});
// 返回 { code: 0, data: { valid: true, unlockType: 'v2_all' } }
```

---

## 任务 3：V2 联调真实云函数

### 当前状态
V2 前端已写完 52 个文件，但用的是 `mock.js` 假数据。需要切换到真实云函数。

### 操作步骤
1. **删除 `mock.js`** 或设置 `useMock = false`
2. **把 `v2-app.js` 的 `callFn` 切换到真实调用**：
```js
async callFn(functionName, data) {
  const result = await this.app.callFunction({
    name: functionName,
    data: data
  });
  return result.result;  // 云函数返回在 .result 里
}
```
3. **逐一测试每个云函数**：
   - `roomManager` — 创建/加入房间、提交问题
   - `characterManager` — 获取角色、抽卡、装备
   - `matchmaking` — 快速匹配
   - `handlePayment` — 兑换码验证（新增）
   - `askAi` — AI 回答（已有，V1 在用）

---

## 云函数接口速查

所有接口契约在 `v2-modules/shared/api-contract.js`，关键参考：

| 云函数 | 关键 action | 入参 | 出参 |
|--------|-------------|------|------|
| roomManager | createRoom | mode, maxPlayers, timeLimit | roomId, shareCode |
| roomManager | joinRoom | shareCode | room |
| roomManager | submitQuestion | roomId, question | answer (ans+exp) |
| characterManager | getMyCharacters | — | characters[], equippedId |
| characterManager | gacha | count (1/10) | characters[], balance |
| handlePayment | redeemCode | code | valid, unlockType |
| handlePayment | generateCodes | prefix, count, channel, adminKey | batchId, codes[] |
| askAi | — | question, riddle, answer, history | ans, exp |

---

## 不改的东西

- ❌ 不改 V1 的 `index.html`、`game.js`、`puzzles.js`（V1 保持运行）
- ❌ 不改任何云函数代码（后端 CodeBuddy 负责）
- ❌ 不改数据库结构（CodeBuddy 负责）
- ❌ 不改 `admin-redeem.html`（兑换码管理后台已完成）

---

## 交付物

完成后放到 `v2-frontend/` 目录下，然后通知 CodeBuddy 做：
1. 部署到 CloudBase
2. 关联云函数
3. 上线测试

---

## 项目关键信息

- 环境 ID：`ai-native-d6gdsx2agc8c46199`
- SDK CDN：`https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js`
- 登录方式：匿名登录（`auth.signInAnonymously()`）
- 风格：暗黑中式恐怖，紫金配色，卡通乌鸦侦探
- **皮探长 = 卡通黑乌鸦**（不是人类）

# 🕯️ 诡谜局 · AI 中式恐怖推理游戏

> 一个中式恐怖 AI 互动推理游戏（海龟汤/黑故事），90 道原创谜题，通过向 AI 提问「是/否」来推理真相。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CloudBase](https://img.shields.io/badge/deploy-CloudBase-orange)](https://cloud.tencent.com/product/tcb)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-4B8BF5)](https://deepseek.com)

**V1 单机版** 线上运行中 | **V2 多人联机版** 后端 100% 完成，前端 ~80% 完成

---

## 🌐 在线体验

| 版本 | 地址 |
|------|------|
| **V1 单机版** | [点击体验](https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com/?v=20260628) |
| **V2 多人版** | [进入大厅](https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com/lobby.html) |

---

## ✨ 功能特性

### V1 单机版
- 🧩 **90 道原创谜题**：5 大分类（本格推理 / 叙诡反转 / 细思极恐 / 变格悬疑 / 暗黑重口）
- 🤖 **AI 智能问答**：接入 DeepSeek API，返回「是/否/无关」+ 线索解释
- ⭐ **难度星级**：1-5 星，从入门清汤到地狱难度
- 🎨 **中式恐怖 UI**：暗黑卷宗美学，粒子背景，流畅动画
- 💰 **兑换码付费**：微信 Native 扫码支付 + 模拟支付双模式
- 📱 **PWA 支持**：可安装到手机桌面，离线使用
- 🔍 **分类筛选 + 搜索**：按类型、难度、关键词快速查找

### V2 多人联机版（开发中）
- 👥 **多人房间**：创建/加入/分享房间，最多 4 人同玩
- 🎭 **角色系统**：10+ 角色模板，抽卡获取，皮肤切换
- 🎨 **6 套主题**：暗黑古堡 / 万圣之夜 / 清明义庄 / 深海迷城 / 怪诞马戏 / 深渊凝视
- 🏆 **排行榜**：按胜场/积分/胜率排行
- 👫 **好友系统**：搜索/添加/删除好友
- 🎵 **粒子特效 + 音效**：主题联动视觉体验
- 🔐 **账号系统**：用户名/密码登录，数据永久保存

---

## 🏗️ 技术架构

```
┌──────────────────────────────────────────────────────┐
│                    CloudBase 平台                      │
│                                                       │
│  静态托管                  云函数 (Node.js 18)          │
│  ┌──────────────┐        ┌──────────────────┐         │
│  │ index.html    │        │ askAi             │──▶ DeepSeek API │
│  │ game.js       │ callFn │ genPuzzle         │──▶ DeepSeek API │
│  │ puzzles.js    │───────▶│ generatePuzzles   │──▶ DeepSeek API │
│  │ v2-frontend/  │        │ roomManager (13) │         │
│  └──────────────┘        │ characterManager  │         │
│                           │ friendManager (9) │         │
│  NoSQL 数据库               │ leaderboard       │         │
│  ┌──────────────┐        │ handlePayment (8) │         │
│  │ rooms         │        └──────────────────┘         │
│  │ user_characters│                                    │
│  │ user_currency  │                                    │
│  │ user_items     │                                    │
│  │ user_unlocks   │                                    │
│  │ orders         │                                    │
│  └──────────────┘                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
guimiju/
├── index.html             # V1 主页面 (HTML + 内联 CSS, 61KB)
├── game.js                # V1 游戏逻辑 (69KB, ~1900 行)
├── puzzles.js             # 90 道谜题数据 (63KB)
│
├── v2-frontend/           # V2 多人版前端 (181 个文件)
│   ├── lobby.html         # 游戏大厅（主入口）
│   ├── v2-app.js          # 应用入口 + 全局状态管理
│   ├── room-game.js       # 房间内游戏逻辑 (68KB)
│   ├── character-ui.js    # 角色系统 (抽卡/换装/皮肤)
│   ├── profile-ui.js      # 个人资料页
│   ├── shop-ui.js         # 商城页
│   ├── result-ui.js       # 结算页
│   ├── leaderboard-ui.js  # 排行榜
│   ├── theme-fx.js        # 6 套主题 + 粒子特效 + 音效
│   ├── mock.js            # Mock 数据（开发用）
│   ├── v2-style.css       # 全局样式 (31KB)
│   └── assets/            # 160+ 素材文件
│
├── cloudfunctions/        # 云函数
│   ├── askAi/             # AI 问答（单人多人都支持）
│   ├── roomManager/       # 房间管理 (13 个 action)
│   ├── characterManager/  # 角色系统 (5 个 action)
│   ├── friendManager/     # 好友系统 (9 个 action)
│   ├── leaderboard/       # 排行榜
│   ├── handlePayment/     # 支付处理 (8 个 action)
│   ├── genPuzzle/         # AI 定制生成单道谜题
│   └── generatePuzzles/   # AI 批量生成谜题
│
├── v2-modules/            # V2 共享类型定义
├── sounds/                # 音效文件
├── assets/                # 公共素材（图片/Logo）
│
├── manifest.json          # PWA 配置
├── icon-192.png           # PWA 小图标
├── icon-512.png           # PWA 大图标
│
└── AGENTS.md              # 项目上下文（供 AI 编码助手读取）
```

---

## 🚀 本地开发

```bash
# 启动 V1 本地服务（含 DeepSeek 代理）
node server.js
# 访问 http://localhost:3000

# 启动 V2 前端预览
npx serve v2-frontend
# 访问 http://localhost:3000/lobby.html
```

---

## 🔧 CloudBase 资源

| 资源 | 配置 | 说明 |
|------|------|------|
| 静态托管 | - | V1 + V2 前端文件 |
| 云函数 (8个) | Node.js 18, 30s 超时, 256MB | 36 个 API action |
| 匿名登录 | 已开启 | V1 使用 |
| 用户名/密码登录 | 已开启 | V2 使用 |
| NoSQL 数据库 | 7 个集合 | rooms / user_characters / user_currency 等 |
| 区域 | ap-shanghai | |

---

## 🔑 环境变量

云函数 `askAi`、`genPuzzle`、`generatePuzzles` 需配置：

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |

---

## 🧪 内测

- V1 试用兑换码：`GUIMIJU90` — 解锁全部 90 道谜题

---

## 🎮 游戏玩法

1. **选择谜题** — 按分类和难度筛选，点击开始
2. **阅读谜面** — 谜题正文描述了一个离奇场景
3. **向 AI 提问** — 只能问「是/否」问题（如"死者是自杀吗？"）
4. **AI 回答** — 返回「是」「否」「无关」并给出带【线索】标记的解释
5. **推理真相** — 通过逐步排除，逼近谜题背后的完整真相
6. **提交答案** — 输入你认为的真相，AI 判定是否猜对

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | 原生 JavaScript + HTML5 + CSS3（无框架，内联样式） |
| **V2 前端** | 原生 JS SPA 架构，自定义路由 + 组件系统 |
| **后端** | CloudBase Serverless 云函数 (Node.js 18) |
| **数据库** | CloudBase NoSQL (类似 MongoDB) |
| **AI** | DeepSeek API (deepseek-chat 模型) |
| **部署** | CloudBase 静态托管 + 云函数 |
| **认证** | CloudBase Auth（匿名 + 用户名/密码） |
| **支付** | 微信 Native 扫码支付 |

---

## 📝 开发记录

- **2025-Q1**：V1 单机版上线，30 道谜题
- **2026-06**：谜题扩展至 90 道，覆盖 5 大分类
- **2026-06**：V2 后端 7 个云函数全部完成
- **2026-06-30**：V2 前后端联调验证通过
- **2026-07**：V2 角色系统、主题切换、角色立绘联动完成

---

## 📄 License

MIT © 2025-2026

# 智维通 SmartGuard · 项目交付说明

> 给 WorkBuddy：这是一份完整轮廓——原型、后端、前端、数据库都有了，你的任务是把它从一个"能演示的原型"变成"能跑的全栈产品"。

---

## 一、产品是什么

**智维通 SmartGuard** — 工业企业 AI 智能设备运维平台。

做两件事：
1. **实时监控**：接入工厂设备数据（PLC / 逆变器 / 机器人 / 充电桩），大屏展示运行状态
2. **AI 诊断**：设备异常时，AI Agent 自动分析原因、查维修手册、生成工单

核心对标场景：**新能源电站**（光伏/储能/充电桩）和 **汽车产线**（机器人/数控机床/PLC）。

---

## 二、当前进度

```
smartguard/
├── prototype.html          ✅ 可演示原型（3000+ 行）
├── 行业分析报告.md          ✅ 投递附属文档
├── server/                 🟡 后端骨架就绪
│   ├── index.js           → Express + Socket.io 启动入口（可直接 npm start）
│   ├── db.js              → MySQL 连接池
│   ├── init.sql           → 建表 + 7条种子数据
│   ├── routes/devices.js  → 设备 CRUD 路由
│   ├── controllers/deviceController.js → 设备增删改查全部写完
│   ├── middleware/         🔴 空目录
│   └── models/             🔴 空目录
├── client/                 🔴 React 前端骨架（只有目录，无代码）
│   └── src/
│       ├── components/    → 空
│       ├── pages/         → 空
│       └── services/      → 空
└── WORKBUDDY-HANDOFF.md   📄 本文件
```

| 模块 | 完成度 | 备注 |
|------|--------|------|
| **原型 prototype.html** | ✅ 100% | 可直接打开，新能源/汽车两场景切换 |
| **后端设备 API** | 🟡 40% | 设备 CRUD 跑通，报警/工单/AI未写 |
| **数据库** | 🟡 60% | 4 张表建好 + 种子数据，但后端未全接上 |
| **React 前端** | 🔴 5%   | 只有目录骨架 |
| **AI Agent** | 🔴 0%   | 待实现 |

---

## 三、技术栈

| 层 | 选用 | 原因 |
|----|------|------|
| **前端** | React + Vite + TypeScript | 通用，面工业/新能源公司都认 |
| **图表** | ECharts / Recharts | 时序折线、仪表盘、设备热力图 |
| **后端** | Node.js Express | 已写了一半，不要换 |
| **实时推送** | Socket.io | 已在 index.js 初始化好了 |
| **数据库** | MySQL | 表已建好，init.sql 可直接导入 |
| **AI Agent** | LangChain + CrewAI (Python) | 诊断 Agent + 派单 Agent 协作 |
| **设备数据接入** | Modbus TCP / OPC UA / MQTT | 产线真实落地方案，现阶段 mock |

---

## 四、后端 API 规划（需要你补齐的）

### 已有
```
GET /api/health                    → 健康检查 ✅
GET /api/devices                   → 设备列表 ✅
GET /api/devices/:id               → 单个设备 ✅
POST /api/devices                  → 创建设备 ✅
PUT /api/devices/:id               → 更新设备 ✅
DELETE /api/devices/:id            → 删除设备 ✅
```

### 待写
```
GET  /api/alerts                   → 报警列表
GET  /api/alerts/:id               → 报警详情（含 AI 诊断结果）
POST /api/alerts/:id/read          → 标记已读

GET  /api/orders                   → 工单列表
POST /api/orders                   → 创建工单
PUT  /api/orders/:id               → 更新工单状态

GET  /api/stats/overview           → 大屏概览（设备总数/运行率/报警数）
GET  /api/stats/device/:id         → 单设备历史数据（折线图用）

POST /api/ai/diagnose              → AI 诊断（调 Python Agent）
GET  /api/ai/report/:id            → 查看历史诊断报告

GET  /api/socket/events            → WebSocket 事件列表（供前端订阅）
```

### 数据库表已就绪

`init.sql` 已经定义了 4 张表：
- `devices` — 设备元数据（名称/类型/位置/状态）
- `sensor_data` — 传感器时序数据（device_id + metric + value + 时间戳）
- `alerts` — 报警记录（级别/标题/AI 诊断结果）
- `orders` — 维修工单（状态/指派人）

---

## 五、原型对照（prototype.html 里有什么）

prototype.html 是产品经理/设计师出的交互原型，React 前端要照着它做：

### 布局结构
```
┌──────────┬──────────────────────────────────────────┐
│ 侧边栏   │  [新能源电站] [汽车产线]  ← 场景切换 Tab  │
│          │──────────────────────────────────────────│
│ 📊 监控  │  [卡片][卡片][卡片][卡片]  ← 4 个统计指标 │
│ 🔧 设备  │                                          │
│ 🧠 AI诊断│  ┌──── 设备列表（表格）────┐ ┌─────────┐ │
│ ⚠️ 报警  │  │ 名称   类型   状态   操作│ │ 实时报警 │ │
│          │  │ 光伏A  光伏  ●正常  [>]│ │ ⚠逆变器 │ │
│          │  │ 逆变器  逆变  ⚠警告 [>]│ │ ⚡充电桩 │ │
│          │  └────────────────────────┘ └─────────┘ │
│          │  ┌──── 设备详情 + AI诊断面板 ──────────┐ │
│          │  │ 📈 温度/振动/电流 时序折线图          │ │
│          │  │ 🧠 AI诊断建议："建议检查散热风扇..."  │ │
│          │  │ 📋 历史工单                            │ │
│          │  └──────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────┘
```

### 两个场景的 mock 数据

| 场景 | 设备类型 | 指标 |
|------|---------|------|
| 新能源电站 | 光伏板、逆变器、储能柜、充电桩 | 功率/温度/电压/电流 |
| 汽车产线 | 数控机床、焊接机器人、冲压机、AGV | 振动/温度/转速/节拍 |

### 色彩系统
```css
新能源场景 --primary: #00e396 (绿色，光伏/清洁能源)
汽车场景   --primary: #57c7ff (蓝色，工业/精密制造)
全局背景   --bg: #0a0e1a (深蓝黑，工业仪表盘风格)
```

---

## 六、开发路径建议

### Phase 1 — 让后端跑起来（今晚）
1. `npm install` 装依赖
2. 装 MySQL，执行 `init.sql` 建库建表
3. `node index.js` 启动后端，curl 验证设备 API 可用

### Phase 2 — React 前端（核心工作量）
1. Vite + React + TypeScript 初始化项目
2. 先做**监控大屏**（统计卡片 + 设备列表表格）
3. 再做**设备详情页**（ECharts 时序折线 + AI 诊断面板）
4. 最后做**报警/工单页**

### Phase 3 — AI Agent（差异化亮点）
1. Python 写一个 LangChain Agent，调 DeepSeek API
2. Agent 读取 sensor_data 表最近 N 条记录，分析异常
3. 异常时自动插入 alerts 表 + 推送前端 WebSocket

### Phase 4 — 部署
- 前端：Vercel / CloudBase 静态托管
- 后端：CloudBase 云托管 / 轻量服务器
- 数据库：云 MySQL

---

## 七、给原型截图（给面试官看的效果）

原型打开就能看到：
- 左侧导航栏（监控/设备/AI诊断/报警/工单）
- 顶部场景切换 Tab（新能源电站 ↔ 汽车产线）
- 4 个统计卡片（设备总数/运行率/今日报警/待处理工单）
- 设备列表 + 实时报警面板
- 点击设备弹出详情，有折线图 + AI 诊断结果

打开方式：`smartguard/prototype.html` 双击即看。

---

## 八、协作约定

1. **后端接口**用 RESTful，返回 `{ code: 0, data: {...} }` 格式
2. **前端 mock 阶段**用 json-server 或写死数据，联调时换真实 API
3. **agent-reach skill** 可用来查技术问题
4. 改完一个功能就部署一下看看效果，别攒到最后

---

> 目标：下周面试时，打开一个能跑的全栈系统，不再是静态 HTML。

---

## 九、实施记录（MVP 已落地 · WorkBuddy 执行）

> 以下为 WorkBuddy 在本机（无 MySQL / 无 Docker）环境下，按前面规划把原型推进为可运行全栈 MVP 的实际落地情况。

### 关键变更
- **数据层 MySQL → SQLite**：本机无 MySQL 服务也无 Docker，改用 Node 内置 `node:sqlite`（零安装、零编译）。`server/db.js` 重写，启动时自动建 4 张表并写入种子数据（17 台设备 / 传感器时序 / 6 条报警 / 4 条工单）。原 `init.sql` 仅供参考。
- **技术栈补充说明**：前端 React+Vite+TS 从零搭建完成；图表用 ECharts；AI 诊断用 **Node 轻量版**（同进程调 DeepSeek，无需起第二个 Python 服务）。

### 当前进度（实测）
| 模块 | 完成度 | 说明 |
|------|--------|------|
| 原型 prototype.html | ✅ 100% | 保持不变，作为 UI 参照 |
| 后端全部 API | ✅ 100% | devices / alerts / orders / stats / ai 全部跑通 |
| 数据库 SQLite | ✅ 100% | 启动自动建库+种子 |
| React 前端 | ✅ 100% | 监控大屏 / 设备详情(ECharts+AI) / 报警 / 工单 全部完成 |
| AI 诊断 | ✅ 90% | Node 版完成；无 DeepSeek key 时自动规则兜底可演示 |
| 单进程部署 | ✅ 100% | `npm start` 同时托管前端 dist + API + Socket |

### 如何运行
```bash
# 1) 后端（含内置数据库，自动建库）
cd server && npm install && npm start
#   → http://localhost:3001  （页面 + API + WebSocket 一体）

# 2) 前端开发模式（可选，热更新）
cd client && npm install && npm run dev
#   → http://localhost:5173 （/api 与 /socket.io 自动代理到 3001）
```
- 面试演示只需第 1 步：`npm install && npm start` 打开 `localhost:3001` 即可。
- 想让 AI 诊断走真实大模型：在 `server/.env` 填 `DEEPSEEK_API_KEY`，重启即可；不填则走规则兜底。

### 验证结果（curl 实测）
- `GET /api/health` ✅
- `GET /api/stats/overview?scene=newenergy|auto` ✅ 两场景统计正确
- `GET /api/alerts` / `GET /api/orders` ✅
- `GET /api/stats/device/:id` ✅ 返回多指标时序
- `POST /api/ai/diagnose` ✅ 规则兜底正确识别异常趋势
- 页面 `/`、`/device/4`(SPA 回退)、`/assets/*.js|css` 均 200 ✅

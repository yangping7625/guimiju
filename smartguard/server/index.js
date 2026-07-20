// ─── 智维通 · 后端入口 ─────────────────────
// 这是整个后端的启动文件
// 启动顺序：加载环境变量 → 连接数据库 → 启动 HTTP 服务 → 挂载 WebSocket

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { testConnection } = require('./db');
const deviceRoutes = require('./routes/devices');

const app = express();
const server = http.createServer(app);   // 用 http 包一层，因为 socket.io 需要

// ─── WebSocket 初始化 ──────────────────
// socket.io 负责实时推送（报警、工单通知等）
// 后面 AI 诊断出异常时，通过 io.emit() 推送到前端
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',  // 只允许前端这个地址连接
    methods: ['GET', 'POST']
  }
});

// 把 io 实例挂到 app 上，后面 controller 里可以用 req.app.get('io') 拿到
app.set('io', io);

// ─── 中间件 ────────────────────────────
app.use(cors());                // 允许跨域（前端 3000 端口调后端 3001）
app.use(express.json());        // 自动解析 JSON 请求体

// ─── 路由 ──────────────────────────────
app.use('/api/devices', deviceRoutes);  // 设备管理相关接口

// 健康检查接口（运维用：确认服务活着）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── WebSocket 连接事件 ────────────────
io.on('connection', (socket) => {
  console.log(`🔌 客户端已连接: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 客户端已断开: ${socket.id}`);
  });
});

// ─── 启动服务 ──────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  // 先测数据库连接，连不上就不启动（避免服务假活着）
  const dbOk = await testConnection();
  if (!dbOk) {
    console.log('⚠️  数据库连接失败，服务未启动。请检查 MySQL 配置。');
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`🚀 智维通后端已启动: http://localhost:${PORT}`);
    console.log(`📡 WebSocket 已就绪`);
  });
}

start();

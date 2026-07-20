// ─── 智维通 · 后端入口（SQLite 版，单进程前后端一体）──
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
require('dotenv').config();

const { testConnection } = require('./db');
const deviceRoutes = require('./routes/devices');
const alertRoutes = require('./routes/alerts');
const orderRoutes = require('./routes/orders');
const statsRoutes = require('./routes/stats');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);

// WebSocket：演示场景放宽 origin，便于本地多端口联调
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('io', io);

app.use(cors());
app.use(express.json());

// ─── 业务路由 ────────────────────────
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── 托管前端构建产物（生产模式：一个进程同时服务页面 + API + Socket）──
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  console.log('📦 已托管前端构建产物:', dist);
}

// ─── WebSocket 连接 ──────────────────
io.on('connection', (socket) => {
  console.log(`🔌 客户端已连接: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔌 客户端已断开: ${socket.id}`));
});

// ─── 启动 ────────────────────────────
const PORT = process.env.PORT || 3001;
async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.log('⚠️  数据库初始化失败，服务未启动。');
    process.exit(1);
  }
  server.listen(PORT, () => {
    console.log(`🚀 智维通后端已启动: http://localhost:${PORT}`);
    console.log(`📡 WebSocket 已就绪`);
  });
}
start();

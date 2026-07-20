// ─── 数据库连接模块 ──────────────────────
// 作用：创建和管理 MySQL 连接池
// 如果连不上数据库，整个后端都无法工作，所以这里做了错误处理

const mysql = require('mysql2/promise');
require('dotenv').config();

// 连接池：复用连接，不用每次请求都重新连接
// 类似：开了一家餐厅，有 10 个服务员随时待命，而不是来一个客人现招一个
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smartguard',
  waitForConnections: true,   // 连接不够用时排队等，不直接报错
  connectionLimit: 10,         // 最多同时 10 个连接
  queueLimit: 0                // 排队不限人数
});

// 测试连接：服务启动时跑一次，确定数据库是通的
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release(); // 用完归还连接池
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.error('请检查：1) MySQL 是否启动 2) .env 中的密码是否正确');
    return false;
  }
}

module.exports = { pool, testConnection };

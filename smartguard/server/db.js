// ─── 数据库连接模块（SQLite 版，零依赖，替代 mysql2）─────────
// 用 Node 内置的 node:sqlite，无需安装 MySQL 服务，开箱即跑。
// 面试演示：npm install && npm start 即可，数据落在本目录 smartguard.db。

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'smartguard.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// ─── 建表（SQLite 语法）─────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'normal',
  scene       TEXT NOT NULL DEFAULT 'newenergy',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sensor_data (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL,
  metric      TEXT NOT NULL,
  value       REAL NOT NULL,
  unit        TEXT,
  recorded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL,
  level       TEXT NOT NULL DEFAULT 'warning',
  title       TEXT NOT NULL,
  description TEXT,
  diagnosis   TEXT,
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL,
  alert_id    INTEGER,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  assignee    TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
`);

// ─── 种子数据（仅在库为空时插入）─────────────────────
function seed() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM devices').get();
  if (c > 0) return;

  const devStmt = db.prepare(
    'INSERT INTO devices (name,type,location,status,scene) VALUES (?,?,?,?,?)'
  );
  const devices = [
    // 新能源电站场景
    ['1号光伏阵列', '光伏板', 'A区屋顶', 'normal', 'newenergy'],
    ['2号光伏阵列', '光伏板', 'B区屋顶', 'normal', 'newenergy'],
    ['3号光伏阵列', '光伏板', 'C区屋顶', 'normal', 'newenergy'],
    ['主逆变器-01', '逆变器', '配电房1号柜', 'warning', 'newenergy'],
    ['主逆变器-02', '逆变器', '配电房2号柜', 'normal', 'newenergy'],
    ['储能柜-E01', '储能柜', '储能站A区', 'normal', 'newenergy'],
    ['储能柜-E02', '储能柜', '储能站B区', 'normal', 'newenergy'],
    ['充电桩-CP01', '充电桩', '停车场东侧', 'offline', 'newenergy'],
    ['充电桩-CP02', '充电桩', '停车场西侧', 'fault', 'newenergy'],
    ['充电桩-CP03', '充电桩', '停车场北侧', 'normal', 'newenergy'],
    // 汽车产线场景
    ['数控机床-CNC01', '数控机床', '1号车间', 'normal', 'auto'],
    ['数控机床-CNC02', '数控机床', '2号车间', 'normal', 'auto'],
    ['机械臂-RB03', '机械臂', '产线3号位', 'fault', 'auto'],
    ['机械臂-RB04', '机械臂', '产线4号位', 'normal', 'auto'],
    ['冲压机-PR01', '冲压机', '冲压车间', 'warning', 'auto'],
    ['AGV-01', 'AGV', '物流通道', 'normal', 'auto'],
    ['AGV-02', 'AGV', '物流通道', 'normal', 'auto'],
  ];
  const ids = {};
  devices.forEach(([name, type, loc, status, scene]) => {
    const r = devStmt.run(name, type, loc, status, scene);
    ids[name] = Number(r.lastInsertRowid);
  });

  // 传感器时序：每台设备最近 24 小时，每小时 1 点，4 个指标
  const sensorStmt = db.prepare(
    'INSERT INTO sensor_data (device_id,metric,value,unit,recorded_at) VALUES (?,?,?,?,?)'
  );
  const now = Date.now();
  const ts = (hAgo) =>
    new Date(now - hAgo * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const metricsByScene = {
    newenergy: [['发电功率', 'kW'], ['温度', '℃'], ['电压', 'V'], ['电流', 'A']],
    auto: [['主轴振动', 'mm/s'], ['温度', '℃'], ['转速', 'rpm'], ['节拍', 's']],
  };
  devices.forEach(([name, type, loc, status, scene]) => {
    const did = ids[name];
    const metrics = metricsByScene[scene];
    const isHot = status !== 'normal';
    for (let h = 23; h >= 0; h--) {
      metrics.forEach(([m, u]) => {
        let v;
        if (m === '温度') v = isHot ? 62 + Math.random() * 20 : 34 + Math.random() * 9;
        else if (m === '发电功率') v = 3 + Math.random() * 3;
        else if (m === '电压') v = 375 + Math.random() * 12;
        else if (m === '电流') v = 8 + Math.random() * 4;
        else if (m === '主轴振动') v = isHot ? 2.6 + Math.random() * 1.8 : 0.7 + Math.random() * 1.0;
        else if (m === '转速') v = 1200 + Math.random() * 300;
        else if (m === '节拍') v = 4 + Math.random() * 2;
        else v = Math.random() * 100;
        sensorStmt.run(did, m, Number(v.toFixed(2)), u, ts(h));
      });
    }
  });

  // 报警记录（含 AI 诊断结果）
  const alertStmt = db.prepare(
    'INSERT INTO alerts (device_id,level,title,description,diagnosis,is_read,created_at) VALUES (?,?,?,?,?,?,?)'
  );
  const alerts = [
    [ids['主逆变器-01'], 'warning', '输出电压波动异常',
      '过去15分钟内，输出电压在360V-420V之间波动，正常范围应为380V±2%。',
      '疑似 IGBT 模块老化，建议 48 小时内安排检修，并监控直流侧电压。', 0, ts(0)],
    [ids['充电桩-CP02'], 'fault', '通信模块无响应',
      '设备连续5次心跳包超时，可能原因为网络故障或主板异常。',
      '建议立即派单现场排查，优先检查 4G 通信模块是否松脱或天线损坏。', 0, ts(0)],
    [ids['充电桩-CP01'], 'offline', '设备离线超过6小时',
      '最后一次心跳信号为6小时前，需人工现场排查电源与网络。',
      '可能为配电回路跳闸或交换机断电，建议结合能耗曲线确认掉电时刻。', 1, ts(6)],
    [ids['机械臂-RB03'], 'fault', '关节扭矩超限',
      '3号轴连续出现扭矩超限报警，已触发安全停机。',
      '检查减速机润滑与抱闸间隙，疑似谐波减速机磨损，建议停机检修。', 0, ts(0)],
    [ids['冲压机-PR01'], 'warning', '冲压节拍异常',
      '近一小时节拍波动 ±0.8s，超出工艺窗口。',
      '可能为导轨润滑不足或气压不稳，建议校正气动系统并复测节拍。', 0, ts(1)],
    [ids['1号光伏阵列'], 'info', '发电效率轻微下降',
      '今日发电效率较昨日同期下降 4.2%，可能受云层遮挡影响。',
      '属天气因素概率高，建议明日同期对比数据确认，无需立即处置。', 1, ts(3)],
  ];
  alerts.forEach((a) => alertStmt.run(...a));

  // 维修工单
  const orderStmt = db.prepare(
    'INSERT INTO orders (device_id,alert_id,title,description,status,assignee) VALUES (?,?,?,?,?,?)'
  );
  const orders = [
    [ids['主逆变器-01'], null, '逆变器输出电压波动检修',
      '携带示波器与备件 IGBT 模块，现场测量直流母线电压纹波。', 'pending', '张工'],
    [ids['充电桩-CP02'], null, '通信模块现场排查',
      '赴停车场西侧检查 4G 模块与天线，必要时更换。', 'processing', '李工'],
    [ids['机械臂-RB03'], null, '机械臂关节检修',
      '停机更换谐波减速机，复核抱闸与零点。', 'pending', '王工'],
    [ids['冲压机-PR01'], null, '冲压机节拍校准',
      '校正气动系统压力并复测节拍曲线。', 'done', '赵工'],
  ];
  orders.forEach((o) => orderStmt.run(...o));

  console.log('✅ 已写入种子数据：设备 17 / 传感器时序 / 报警 6 / 工单 4');
}
seed();

// ─── 兼容 mysql2 的 query 接口 ──────────────────────
// 返回 [rows]（查询）或 [{ insertId, affectedRows }]（写操作），与原 controller 解构一致。
async function query(sql, params = []) {
  const stmt = db.prepare(sql);
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
    const info = stmt.run(...params);
    return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }];
  }
  return [stmt.all(...params)];
}

module.exports = {
  db,
  query,
  testConnection: async () => true,
};

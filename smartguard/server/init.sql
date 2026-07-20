-- 智维通 · 数据库初始化脚本
-- 使用方法：在 MySQL 命令行执行 source init.sql;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS smartguard DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE smartguard;

-- ─── 设备表 ──────────────────────────
-- 存储所有被监控的设备信息
CREATE TABLE IF NOT EXISTS devices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL COMMENT '设备名称',
  type        VARCHAR(50)  NOT NULL COMMENT '设备类型：光伏板/逆变器/储能柜/充电桩...',
  location    VARCHAR(200) COMMENT '安装位置',
  status      VARCHAR(20)  NOT NULL DEFAULT 'normal' COMMENT '运行状态：normal/warning/fault/offline',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

-- ─── 传感器数据表 ─────────────────────
-- 设备传感器上报的原始数据（后面做 AI 诊断的数据来源）
CREATE TABLE IF NOT EXISTS sensor_data (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id   INT NOT NULL COMMENT '关联设备ID',
  metric      VARCHAR(50) NOT NULL COMMENT '指标名：temperature/vibration/voltage/current...',
  value       DECIMAL(12, 4) NOT NULL COMMENT '指标数值',
  unit        VARCHAR(20) COMMENT '单位：℃/mm/s/V/A',
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '采集时间',
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_device_time (device_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='传感器数据表';

-- ─── 报警记录表 ───────────────────────
-- 设备异常时自动生成的报警记录
CREATE TABLE IF NOT EXISTS alerts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  device_id   INT NOT NULL COMMENT '关联设备ID',
  level       VARCHAR(20) NOT NULL DEFAULT 'warning' COMMENT '报警级别：info/warning/critical',
  title       VARCHAR(200) NOT NULL COMMENT '报警标题',
  description TEXT COMMENT '报警详情（含 AI 诊断结果）',
  is_read     BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报警记录表';

-- ─── 工单表 ──────────────────────────
-- 报警之后自动生成维修工单
CREATE TABLE IF NOT EXISTS orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  device_id   INT NOT NULL COMMENT '关联设备ID',
  alert_id    INT COMMENT '关联报警ID（可能为空，手动创建的工单）',
  title       VARCHAR(200) NOT NULL COMMENT '工单标题',
  description TEXT COMMENT '工单描述',
  status      VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '工单状态：pending/processing/done',
  assignee    VARCHAR(50) COMMENT '指派人',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单表';

-- ─── 插入测试数据 ────────────────────
INSERT INTO devices (name, type, location, status) VALUES
  ('1号光伏阵列', '光伏板', 'A区屋顶', 'normal'),
  ('2号光伏阵列', '光伏板', 'B区屋顶', 'normal'),
  ('主逆变器-01', '逆变器', '配电房1号柜', 'warning'),
  ('储能柜-E01', '储能柜', '储能站A区', 'normal'),
  ('充电桩-CP01', '充电桩', '停车场东侧', 'offline'),
  ('数控机床-CNC01', '数控机床', '1号车间', 'normal'),
  ('机械臂-RB03', '机械臂', '产线3号位', 'fault');

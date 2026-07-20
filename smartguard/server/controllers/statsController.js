// ─── 大屏统计 · Controller ────────────────────
const { query } = require('../db');

const statsController = {
  // GET /api/stats/overview?scene=newenergy|auto
  async overview(req, res) {
    try {
      const scene = req.query.scene || 'newenergy';
      const [statusRows] = await query(
        'SELECT status, COUNT(*) AS c FROM devices WHERE scene = ? GROUP BY status',
        [scene]
      );
      const total = statusRows.reduce((s, r) => s + r.c, 0);
      const normal = statusRows.find((r) => r.status === 'normal')?.c || 0;
      const onlineRate = total ? Math.round((normal * 100) / total) : 0;

      const [ta] = await query(
        `SELECT COUNT(*) AS c FROM alerts a JOIN devices d ON a.device_id = d.id
         WHERE d.scene = ? AND date(a.created_at) = date('now')`,
        [scene]
      );
      const [po] = await query(
        `SELECT COUNT(*) AS c FROM orders o JOIN devices d ON o.device_id = d.id
         WHERE d.scene = ? AND o.status = 'pending'`,
        [scene]
      );

      const byStatus = {};
      ['normal', 'warning', 'fault', 'offline'].forEach((s) => {
        byStatus[s] = statusRows.find((r) => r.status === s)?.c || 0;
      });

      res.json({
        code: 0,
        data: {
          totalDevices: total,
          onlineRate,
          todayAlerts: ta[0].c,
          pendingOrders: po[0].c,
          byStatus,
        },
      });
    } catch (e) {
      console.error('获取概览失败:', e);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // GET /api/stats/device/:id  → 该设备各指标时间序列（折线图用）
  async deviceHistory(req, res) {
    try {
      const { id } = req.params;
      const [metrics] = await query(
        'SELECT DISTINCT metric, unit FROM sensor_data WHERE device_id = ?',
        [id]
      );
      const series = await Promise.all(
        metrics.map(async (m) => {
          const [pts] = await query(
            'SELECT recorded_at AS t, value AS v FROM sensor_data WHERE device_id = ? AND metric = ? ORDER BY recorded_at ASC',
            [id, m.metric]
          );
          return { metric: m.metric, unit: m.unit, points: pts };
        })
      );
      res.json({ code: 0, data: series });
    } catch (e) {
      console.error('获取设备历史失败:', e);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },
};

module.exports = statsController;

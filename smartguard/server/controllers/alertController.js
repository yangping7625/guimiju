// ─── 报警管理 · Controller ────────────────────
const { query } = require('../db');

const alertController = {
  // GET /api/alerts?scene=&device_id=&level=
  async list(req, res) {
    try {
      const { scene, device_id, level } = req.query;
      const where = [];
      const params = [];
      if (scene) { where.push('d.scene = ?'); params.push(scene); }
      if (device_id) { where.push('a.device_id = ?'); params.push(device_id); }
      if (level) { where.push('a.level = ?'); params.push(level); }
      const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const [rows] = await query(
        `SELECT a.*, d.name AS device_name, d.type AS device_type, d.status AS device_status
         FROM alerts a JOIN devices d ON a.device_id = d.id
         ${w}
         ORDER BY a.created_at DESC`,
        params
      );
      res.json({ code: 0, data: rows });
    } catch (e) {
      console.error('获取报警列表失败:', e);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // GET /api/alerts/:id
  async detail(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await query(
        `SELECT a.*, d.name AS device_name, d.type AS device_type
         FROM alerts a JOIN devices d ON a.device_id = d.id WHERE a.id = ?`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ code: 404, message: '报警不存在' });
      res.json({ code: 0, data: rows[0] });
    } catch (e) {
      console.error('获取报警详情失败:', e);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // POST /api/alerts/:id/read
  async read(req, res) {
    try {
      const { id } = req.params;
      await query('UPDATE alerts SET is_read = 1 WHERE id = ?', [id]);
      res.json({ code: 0, message: '已标记为已读' });
    } catch (e) {
      console.error('标记已读失败:', e);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },
};

module.exports = alertController;

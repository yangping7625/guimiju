// ─── 维修工单 · Controller ────────────────────
const { query } = require('../db');

const orderController = {
  // GET /api/orders?scene=&status=
  async list(req, res) {
    try {
      const { scene, status, device_id } = req.query;
      const where = [];
      const params = [];
      if (scene) { where.push('d.scene = ?'); params.push(scene); }
      if (status) { where.push('o.status = ?'); params.push(status); }
      if (device_id) { where.push('o.device_id = ?'); params.push(device_id); }
      const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const [rows] = await query(
        `SELECT o.*, d.name AS device_name, d.type AS device_type
         FROM orders o JOIN devices d ON o.device_id = d.id
         ${w}
         ORDER BY o.created_at DESC`,
        params
      );
      res.json({ code: 0, data: rows });
    } catch (e) {
      console.error('获取工单列表失败:', e);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // POST /api/orders
  async create(req, res) {
    try {
      const { device_id, alert_id, title, description, assignee, status } = req.body;
      if (!device_id || !title) {
        return res.status(400).json({ code: 400, message: '设备与工单标题必填' });
      }
      const [r] = await query(
        'INSERT INTO orders (device_id, alert_id, title, description, status, assignee) VALUES (?,?,?,?,?,?)',
        [device_id, alert_id || null, title, description || '', status || 'pending', assignee || null]
      );
      res.status(201).json({ code: 0, data: { id: r.insertId }, message: '工单创建成功' });
    } catch (e) {
      console.error('创建工单失败:', e);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // PUT /api/orders/:id
  async update(req, res) {
    try {
      const { id } = req.params;
      const { status, assignee } = req.body;
      const fields = [];
      const vals = [];
      if (status) { fields.push('status = ?'); vals.push(status); }
      if (assignee !== undefined) { fields.push('assignee = ?'); vals.push(assignee); }
      if (!fields.length) return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
      vals.push(id);
      await query(
        `UPDATE orders SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
        vals
      );
      res.json({ code: 0, message: '工单已更新' });
    } catch (e) {
      console.error('更新工单失败:', e);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },
};

module.exports = orderController;

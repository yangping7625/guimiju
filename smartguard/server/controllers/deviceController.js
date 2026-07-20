// ─── 设备管理 · Controller（业务逻辑层）───────
// 路由层只负责"谁访问什么地址"，具体做什么由这里处理
// 分层的好处：如果以后要换框架（如从 Express 换 Koa），只改路由层就行

const { pool } = require('../db');

const deviceController = {
  // ─── 获取设备列表 ──────────────────
  // GET /api/devices
  // 支持分页：?page=1&pageSize=10
  async list(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;

      // 同时查总数和当前页数据
      // Promise.all 让两个查询并行跑，不用等一个跑完再跑另一个
      const [countResult] = await pool.query('SELECT COUNT(*) as total FROM devices');
      const [rows] = await pool.query(
        'SELECT * FROM devices ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );

      res.json({
        code: 0,
        data: {
          list: rows,
          total: countResult[0].total,
          page,
          pageSize
        }
      });
    } catch (error) {
      console.error('获取设备列表失败:', error);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // ─── 获取单个设备详情 ──────────────
  // GET /api/devices/:id
  async detail(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT * FROM devices WHERE id = ?', [id]);

      if (rows.length === 0) {
        return res.status(404).json({ code: 404, message: '设备不存在' });
      }

      res.json({ code: 0, data: rows[0] });
    } catch (error) {
      console.error('获取设备详情失败:', error);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // ─── 创建设备 ──────────────────────
  // POST /api/devices
  // 请求体：{ name, type, location, status }
  async create(req, res) {
    try {
      const { name, type, location, status = 'normal' } = req.body;

      // 必填校验
      if (!name || !type) {
        return res.status(400).json({ code: 400, message: '设备名称和类型不能为空' });
      }

      const [result] = await pool.query(
        'INSERT INTO devices (name, type, location, status) VALUES (?, ?, ?, ?)',
        [name, type, location, status]
      );

      res.status(201).json({
        code: 0,
        data: { id: result.insertId, name, type, location, status },
        message: '设备创建成功'
      });
    } catch (error) {
      console.error('创建设备失败:', error);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // ─── 更新设备 ──────────────────────
  // PUT /api/devices/:id
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, type, location, status } = req.body;

      // 先确认设备存在
      const [existing] = await pool.query('SELECT id FROM devices WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ code: 404, message: '设备不存在' });
      }

      // 只更新传来的字段（动态构建 SQL）
      const fields = [];
      const values = [];
      if (name !== undefined) { fields.push('name = ?'); values.push(name); }
      if (type !== undefined) { fields.push('type = ?'); values.push(type); }
      if (location !== undefined) { fields.push('location = ?'); values.push(location); }
      if (status !== undefined) { fields.push('status = ?'); values.push(status); }

      if (fields.length === 0) {
        return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
      }

      values.push(id);
      await pool.query(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`, values);

      res.json({ code: 0, message: '设备更新成功' });
    } catch (error) {
      console.error('更新设备失败:', error);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  },

  // ─── 删除设备 ──────────────────────
  // DELETE /api/devices/:id
  async remove(req, res) {
    try {
      const { id } = req.params;

      const [result] = await pool.query('DELETE FROM devices WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ code: 404, message: '设备不存在' });
      }

      res.json({ code: 0, message: '设备已删除' });
    } catch (error) {
      console.error('删除设备失败:', error);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  }
};

module.exports = deviceController;

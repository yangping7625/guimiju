// ─── 设备管理 · 路由层 ────────────────────
// 作用：把 URL 路径和 HTTP 方法映射到对应的 controller 函数
// 路由层很薄，不做业务逻辑，只是"转发"

const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// RESTful 风格：同一个路径，不同 HTTP 方法做不同的事
router.get('/',    deviceController.list);    // 获取设备列表
router.get('/:id', deviceController.detail);  // 获取设备详情
router.post('/',   deviceController.create);  // 创建设备
router.put('/:id', deviceController.update);  // 更新设备
router.delete('/:id', deviceController.remove); // 删除设备

module.exports = router;

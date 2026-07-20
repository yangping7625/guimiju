// ─── 大屏统计 · 路由层 ────────────────────
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/overview', statsController.overview);
router.get('/device/:id', statsController.deviceHistory);

module.exports = router;

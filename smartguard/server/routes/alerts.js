// ─── 报警管理 · 路由层 ────────────────────
const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

router.get('/', alertController.list);
router.get('/:id', alertController.detail);
router.post('/:id/read', alertController.read);

module.exports = router;

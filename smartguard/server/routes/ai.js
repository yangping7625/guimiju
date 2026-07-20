// ─── AI 诊断 · 路由层 ────────────────────
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/diagnose', aiController.diagnose);

module.exports = router;

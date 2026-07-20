// ─── AI 诊断 · Controller（Node 轻量版，同进程调 DeepSeek）────────
const { query } = require('../db');

// 调用 DeepSeek（无 key 时返回 null，走规则兜底）
async function callDeepSeek(prompt) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || key === 'your_api_key_here') return null;
  const base = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const resp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是工业设备智能运维 AI 诊断专家，用简洁中文给出异常判断、可能原因与处置建议，不超过200字。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      stream: false,
    }),
  });
  if (!resp.ok) throw new Error('DeepSeek API ' + resp.status);
  const j = await resp.json();
  return j.choices[0].message.content;
}

const aiController = {
  // POST /api/ai/diagnose { device_id }
  async diagnose(req, res) {
    try {
      const { device_id } = req.body;
      if (!device_id) return res.status(400).json({ code: 400, message: 'device_id 必填' });

      const [[dev]] = await query('SELECT * FROM devices WHERE id = ?', [device_id]);
      if (!dev) return res.status(404).json({ code: 404, message: '设备不存在' });

      // 读取各指标最近 12 条，计算最新值/均值/趋势
      const [metrics] = await query('SELECT DISTINCT metric FROM sensor_data WHERE device_id = ?', [device_id]);
      const summary = await Promise.all(
        metrics.map(async (m) => {
          const [rows] = await query(
            'SELECT value FROM sensor_data WHERE device_id = ? AND metric = ? ORDER BY recorded_at DESC LIMIT 12',
            [device_id, m.metric]
          );
          const vals = rows.map((r) => r.value);
          const latest = vals[0];
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const trend = latest > avg * 1.1 ? '上升' : latest < avg * 0.9 ? '下降' : '平稳';
          return { metric: m.metric, latest, avg: Number(avg.toFixed(2)), trend };
        })
      );

      const prompt =
        `设备「${dev.name}」（类型 ${dev.type}，位置 ${dev.location}，当前状态 ${dev.status}）最近传感器数据摘要：\n` +
        summary.map((s) => `- ${s.metric}：当前 ${s.latest}，${s.metric === '温度' ? '℃' : ''}均值 ${s.avg}，趋势 ${s.trend}`).join('\n') +
        `\n请判断是否存在异常，给出诊断原因与处置建议。`;

      const aiText = await callDeepSeek(prompt);
      let level = dev.status === 'fault' ? 'critical' : dev.status === 'warning' ? 'warning' : 'info';
      let diagnosis;
      let suggestion;

      if (!aiText) {
        // 规则兜底（无 key 也能演示）
        const abnormal = summary.filter((s) => s.trend !== '平稳');
        diagnosis =
          `【规则诊断】设备当前状态「${dev.status}」。\n` +
          `异常指标：${abnormal.map((s) => `${s.metric}（趋势${s.trend}，最新${s.latest}）`).join('、') || '暂无明显异常'}。\n` +
          `检测到异常指标偏离均值，建议结合历史曲线与现场巡检进一步确认。`;
        suggestion = dev.status === 'normal' ? '指标平稳，持续监控即可。' : '建议安排运维人员现场核查，必要时生成维修工单。';
      } else {
        diagnosis = aiText;
        suggestion = dev.status === 'normal' ? '持续监控即可。' : '建议现场核查，必要时生成维修工单。';
      }

      // 异常时通过 WebSocket 实时推送（前端订阅 alert:new 即可收到）
      if (level !== 'info') {
        const io = req.app.get('io');
        if (io) {
          io.emit('alert:new', {
            device: dev.name,
            level,
            title: `${dev.name} AI 诊断异常`,
            diagnosis: diagnosis.slice(0, 120),
            time: new Date().toISOString(),
          });
        }
      }

      res.json({
        code: 0,
        data: { device: dev.name, status: dev.status, level, summary, diagnosis, suggestion },
      });
    } catch (e) {
      console.error('AI 诊断失败:', e);
      res.status(500).json({ code: 500, message: '诊断失败: ' + e.message });
    }
  },
};

module.exports = aiController;

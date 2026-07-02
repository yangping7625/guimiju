const http = require('http');

// DeepSeek 配置（从环境变量读取，不暴露 key）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// 简单路由分发
const ROUTES = {
  '/api/ask': handleAsk,
  '/health': handleHealth,
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost`);
  const handler = ROUTES[url.pathname];

  if (handler) {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('Handler error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '服务异常，请稍后重试' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

// ============ 健康检查 ============
function handleHealth(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
}

// ============ AI 问答代理 ============
async function handleAsk(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const body = await readBody(req);
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '无效的 JSON' }));
    return;
  }

  const { question, riddle, answer, history } = parsed;
  if (!question || !riddle || !answer) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '缺少必要参数：question, riddle, answer' }));
    return;
  }

  const result = await callDeepSeek(question, riddle, answer, history || []);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
}

// ============ DeepSeek 调用 ============
async function callDeepSeek(question, riddle, answer, history) {
  const historyStr = history
    .map(h => `玩家问：${h.q}\nAI答：${h.a ? h.a.ans + ' - ' + h.a.exp : ''}`)
    .join('\n');

  const systemPrompt = `你是「诡谜局」AI主持人，主持一个中式恐怖猜谜游戏。

谜题：
${riddle}

正确答案：
${answer}

规则：
1. 每次只回答一个字：「是」「否」「无关」
2. 换行加一句具体的解释（15-30字），要给出实质信息
3. 绝对不要说出答案，不要复述谜题
4. 解释中把最关键的1个线索词用【】括起来
5. 如果答案是「是」，解释说明为什么是
6. 如果答案是「否」，解释要指出方向
7. 如果答案是「无关」，解释要引导换方向

好的示例：「是 · 她妈妈在【葬礼那天】就已经走了。」
差的示例：「是 · 是的。」（太模糊，不要）`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(historyStr
      ? [{ role: 'user', content: `之前的问答：\n${historyStr}\n\n现在玩家问：${question}` }]
      : [{ role: 'user', content: `玩家问：${question}` }]
    )
  ];

  const resp = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 150,
      stream: false
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('DeepSeek API error:', resp.status, errText);
    return { ans: 'unrelated', exp: '诡秘之力暂时紊乱，请稍后再问……' };
  }

  const data = await resp.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();

  if (text.startsWith('是')) {
    return { ans: 'yes', exp: text.replace(/^是[：:，,\s]*/, '').trim() || '是的。' };
  }
  if (text.startsWith('否') || text.startsWith('不')) {
    return { ans: 'no', exp: text.replace(/^[否不][：:，,\s]*/, '').trim() || '不是。' };
  }
  if (text.includes('无关')) {
    return { ans: 'unrelated', exp: text.replace(/^无关[：:，,\s]*/, '').trim() || '不相关。' };
  }

  return { ans: 'unrelated', exp: '这个问题……和谜底关联不大。换个方向试试？' };
}

// ============ 工具函数 ============
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// 启动服务
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🕯️  诡谜局 API 代理已启动，端口 ${PORT}`);
});

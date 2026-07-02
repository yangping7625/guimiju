const http = require('http');
const path = require('path');
const fs = require('fs');

// ============ 配置 ============
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

// ============ HTTP 服务 ============
const server = http.createServer(async (req, res) => {
  // CORS 头（开发用）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ---- API 路由 ----
  if (url.pathname === '/api/ask' && req.method === 'POST') {
    await handleAsk(req, res);
    return;
  }

  // ---- 静态文件 ----
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, filePath);

  // 安全检查：防止目录遍历
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// ============ API 处理 ============
async function handleAsk(req, res) {
  try {
    const body = await readBody(req);
    const { question, riddle, answer, history } = JSON.parse(body);

    if (!question || !riddle || !answer) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少必要参数' }));
      return;
    }

    const result = await callDeepSeek(question, riddle, answer, history || []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('API 错误:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '服务异常，请稍后重试' }));
  }
}

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
    ...(historyStr ? [{ role: 'user', content: `之前的问答：\n${historyStr}\n\n现在玩家问：${question}` }] : [{ role: 'user', content: `玩家问：${question}` }])
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
  // fallback
  return { ans: 'unrelated', exp: '这个问题……和谜底关联不大。换个方向试试？' };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log(`🕯️  诡谜局服务已启动: http://localhost:${PORT}`);
  console.log(`   按 Ctrl+C 停止服务`);
});

// 诡谜局 - AI 问答云函数（V2 多人版）
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

exports.main = async (event, context) => {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY 环境变量未设置');
    return { ans: 'unrelated', exp: 'AI 服务暂时不可用，请稍后重试。' };
  }
  const { question, riddle, answer, history, roomId, playerName, turnNumber } = event;

  if (!question || !riddle || !answer) {
    return { ans: 'unrelated', exp: '缺少必要参数，请刷新重试。' };
  }

  try {
    const historyStr = (history || [])
      .map(h => {
        const who = h.playerName ? `${h.playerName}问` : '玩家问';
        return `${who}：${h.q}\nAI答：${h.a ? h.a.ans + ' - ' + h.a.exp : ''}`;
      })
      .join('\n');

    // 多人模式额外上下文
    const multiPlayerContext = playerName
      ? `\n当前提问者：${playerName}\n第 ${turnNumber || '?'} 回合`
      : '';

    const systemPrompt = `你是「诡谜局」AI主持人，主持一个中式恐怖猜谜游戏。${multiPlayerContext}

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
8. ${playerName ? '多人模式：回答要公正，不偏袒任何玩家' : ''}

好的示例：「是 · 她妈妈在【葬礼那天】就已经走了。」
差的示例：「是 · 是的。」（太模糊，不要）`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(historyStr
        ? [{ role: 'user', content: `之前的问答：\n${historyStr}\n\n现在${playerName || '玩家'}问：${question}` }]
        : [{ role: 'user', content: `${playerName ? playerName : '玩家'}问：${question}` }])
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
    return { ans: 'unrelated', exp: '这个问题……和谜底关联不大。换个方向试试？' };
  } catch (err) {
    console.error('DeepSeek API 错误:', err.message);
    return { ans: 'unrelated', exp: '天机不可泄露……换个方向问问？' };
  }
};

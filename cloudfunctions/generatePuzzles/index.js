// 诡谜局 - AI 批量生成谜题云函数
// 调用 DeepSeek API 批量生成中式恐怖谜题
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// 谜题类型及其生成指引
const PUZZLE_TYPES = {
  folk: {
    name: '民俗·怪谈',
    guide: `中式民俗恐怖，基于中国传统民俗、乡村禁忌、丧葬文化、风水阴阳等元素。
    风格参考：纸嫁衣、山村老尸、民间鬼故事。
    核心诡计通常涉及：活人祭祀、冥婚、扎纸人、叫魂、借寿、替身等民俗元素。
    结局往往带有悲剧色彩和宿命感。`
  },
  dream: {
    name: '梦核·迷境',
    guide: `梦境逻辑的迷离恐怖，介于现实与虚幻之间。
    风格参考：红辣椒、未麻的部屋、层层恐惧。
    核心诡计通常涉及：循环梦境、身份错位、记忆篡改、时间折叠。
    结局往往带有一种"醒来后发现更恐怖"的反转。`
  },
  cthulhu: {
    name: '克苏鲁·异兆',
    guide: `宇宙恐怖，未知与疯狂，不可名状的存在。
    风格参考：克苏鲁神话、湮灭、怪形。
    核心诡计通常涉及：邪神降临、变异感染、禁忌知识、集体疯狂。
    结局往往暗示人类在宇宙中的渺小与无力。`
  },
  classic: {
    name: '经典·海龟汤',
    guide: `经典悬疑推理风格，注重逻辑反转和细思极恐。
    风格参考：东野圭吾、海龟汤经典谜题。
    核心诡计通常涉及：日常场景中的异常、看似矛盾的行为、隐藏的身份关系。
    结局往往揭示一个被忽略的细节颠覆整个认知。`
  },
  scary: {
    name: '恐怖·惊悚',
    guide: `心理恐怖和惊悚风格，注重氛围营造和心理压迫感。
    风格参考：沉默的羔羊、七宗罪。
    核心诡计通常涉及：连环事件、心理扭曲、跟踪窥视、密闭空间。
    结局往往揭示施害者与受害者的反转关系。`
  }
};

exports.main = async (event, context) => {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) {
    return { code: -1, message: 'AI 服务配置缺失，请联系管理员' };
  }

  const { action = 'generate', count = 5, type, rewriteText } = event;

  switch (action) {
    case 'generate':
      return await generatePuzzles(count, type, DEEPSEEK_API_KEY);
    case 'rewrite':
      return await rewritePuzzle(rewriteText, DEEPSEEK_API_KEY);
    default:
      return { code: -1, message: '未知 action' };
  }
};

// 批量生成谜题
async function generatePuzzles(count = 5, typeFilter, DEEPSEEK_API_KEY) {
  const types = typeFilter ? [typeFilter] : Object.keys(PUZZLE_TYPES);
  const results = [];
  const batchSize = Math.min(count, 10); // 一次最多10道

  // 均匀分配类型
  const perType = Math.ceil(batchSize / types.length);

  for (const type of types) {
    const typeInfo = PUZZLE_TYPES[type];
    if (!typeInfo) continue;

    const n = Math.min(perType, batchSize - results.length);
    if (n <= 0) break;

    const prompt = `你是一个中式恐怖故事创作专家。请生成 ${n} 道「海龟汤」风格的恐怖谜题。

## 风格要求
${typeInfo.guide}

## 格式要求（严格 JSON 数组）
请返回一个 JSON 数组，每个元素格式如下：
{
  "type": "${type}",
  "title": "谜题标题（6-12字，有悬疑感，不用标点）",
  "riddle": "谜题正文（80-200字，用第一人称或旁观者视角描述一个离奇事件，结尾留悬念，不要说答案）",
  "answer": "汤底/真相（30-80字，解释事情真相，要有反转感或细思极恐的感觉）",
  "hints": ["提示1（10-20字，引导方向但不剧透）", "提示2（10-20字，换一个角度提示）"]
}

## 创作要点
1. 谜题正文要让人读完后产生"到底发生了什么"的强烈好奇
2. 答案要有"原来如此！"的反转感，是现实中可能发生但令人毛骨悚然的事
3. 不要出现鬼魂、超自然力量作为直接答案（真相应该是人为的、心理的、或自然现象的误读）
4. 每个谜题独立，不要相互关联
5. 中式元素优先：农历、节气、祠堂、纸钱、红白事、老物件、旧习俗

只返回 JSON 数组，不要任何其他文字。`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let resp;
      try {
        resp = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 3000,
            stream: false,
            response_format: { type: 'json_object' }
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!resp.ok) {
        console.error(`DeepSeek API 返回 HTTP ${resp.status}`);
        results.push({ type, error: `AI 服务异常 (${resp.status})` });
        continue;
      }

      const data = await resp.json();
      const rawText = (data.choices?.[0]?.message?.content || '').trim();

      // 尝试解析 JSON
      let parsed;
      try {
        // 清理可能的 markdown 代码块
        const jsonStr = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error('JSON 解析失败:', e.message);
        console.error('原始文本:', rawText.slice(0, 500));
        results.push({ type, error: 'AI 返回格式异常', raw: rawText.slice(0, 300) });
        continue;
      }

      // 校验并添加
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p.title && p.riddle && p.answer && p.hints) {
            results.push(p);
          }
        }
      }
    } catch (err) {
      console.error(`生成 ${type} 谜题失败:`, err.message);
      results.push({ type, error: err.message });
    }
  }

  return {
    code: 0,
    generated: results.filter(r => r.title).length,
    puzzles: results
  };
}

// 改写外部谜题（将其他来源的谜题改写为诡谜局风格）
async function rewritePuzzle(sourceText, DEEPSEEK_API_KEY) {
  if (!sourceText) {
    return { code: -1, message: '请提供需要改写的谜题内容' };
  }

  const prompt = `你是一个中式恐怖故事改编专家。请将以下谜题改写成「诡谜局」的中式恐怖风格。

## 原始谜题
${sourceText}

## 改写要求
1. 将故事背景中国化：改为民国或古代中国背景
2. 加入中式元素：民俗、祭祀、老物件、传统节日等
3. 保持核心诡计不变，但包装成中式恐怖氛围
4. 语言风格：半文半白，有古典韵味但现代人能读懂
5. 字数与原题相当，不要过度扩充

## 输出格式（严格 JSON）
{
  "type": "folk",
  "title": "新标题（中式风格）",
  "riddle": "改写后的谜题正文",
  "answer": "改写后的答案",
  "hints": ["提示1", "提示2"]
}

只返回 JSON 对象，不要任何其他文字。`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let resp;
    try {
      resp = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1500,
          stream: false,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!resp.ok) {
      return { code: -1, message: `AI 服务异常 (${resp.status})，请稍后重试` };
    }

    const data = await resp.json();
    const rawText = (data.choices?.[0]?.message?.content || '').trim();

    let parsed;
    try {
      const jsonStr = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      return { code: -1, message: 'AI 返回格式异常', raw: rawText.slice(0, 500) };
    }

    return {
      code: 0,
      puzzle: parsed
    };
  } catch (err) {
    return { code: -1, message: '改写失败: ' + err.message };
  }
}

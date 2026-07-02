// 诡谜局 - AI 生成海龟汤谜题云函数
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// 从学习题库中精选的优质谜题样本（用于Few-shot prompt）
const PUZZLE_EXAMPLES = [
  {
    title: "外婆的电话",
    type: "folk",
    riddle: "外婆去世后的第七天，我的手机响了。来电显示是她的号码。我不敢接。最后我接了。电话那头只有外婆的声音：「别开门。你妈妈不是你妈妈。」下一秒门外响起了敲门声。妈妈在门外说：「乖，开门，妈给你送夜宵。」问题：我为什么要感谢外婆？",
    answer: "妈妈早在外婆葬礼那天就死了。家里人瞒着我。头七那晚门外来的不是妈妈，是披着妈妈样子的东西。外婆留下的不是电话，是她生前设置的定时语音提醒：「别开门。你妈妈不是你妈妈。」"
  },
  {
    title: "电梯",
    type: "classic",
    riddle: "我走进电梯准备去上学，随着电梯的上升，我知道，我再也无法去学校了。问题：发生了什么？",
    answer: "星期一早上我心不在焉走进电梯，忘了按一楼。电梯一直上升到顶楼停下，门打开后我看到一个女孩倒在血泊中，一个男人正在清理现场。"
  },
  {
    title: "狗",
    type: "classic",
    riddle: "女孩独自在家，陪伴她的只有只爱犬。半夜她听到滴水声，于是把手放到床边让爱犬舔了舔。第二天狗死了。问题：谁舔了她的手？",
    answer: "小偷潜入家里，把狗杀死吊在天花板上（滴水声是狗血滴落）。舔女孩手的不是狗，是那个小偷。"
  },
  {
    title: "葬礼",
    type: "classic",
    riddle: "有母女三人，母亲去世了，姐妹俩去参加葬礼。妹妹在葬礼上遇见了一个很有型的男子并对他一见倾心。回到家后妹妹把姐姐杀了。问题：为什么？",
    answer: "因为妹妹认为只有在葬礼上才能再次见到那个男子，所以她杀了姐姐想再举办一次葬礼。"
  },
  {
    title: "旧校舍的镜子",
    type: "dream",
    riddle: "传说晚上十二点对着镜子梳头三次会在镜子里看到自己死时的样子。我不信。第三次梳头时镜子里的我开始笑了。但我没有笑。我转身就跑。回头看了一眼镜子——镜子里是空的。问题：为什么镜子里是空的？",
    answer: "第三次梳头时我已经死了。镜子里看到的是我死时的样子。当我转身跑向门口时，跑出去的不是我，是那个笑的东西。所以镜子里是空的：因为它已经出来了。"
  }
];

function getRandomExamples(count) {
  const shuffled = [...PUZZLE_EXAMPLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

exports.main = async (event, context) => {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) {
    return { ok: false, error: 'AI 服务配置缺失，请联系管理员' };
  }

  const { keywords, type, style, difficulty } = event || {};

  if (!keywords || !type) {
    return { ok: false, error: '请提供关键词和类型' };
  }

  // 关键词安全校验
  if (keywords.length > 200) {
    return { ok: false, error: '关键词过长，请控制在200字以内' };
  }

  const typeNames = {
    folk: '民俗怪谈（中式恐怖、民间传说、乡村诡异）',
    dream: '梦核迷境（梦境、幻觉、时间错乱、记忆篡改）',
    cthulhu: '克苏鲁异兆（未知恐惧、深海、古老存在、不可名状）',
    classic: '经典海龟汤（悬疑推理、细思极恐、都市传说）',
    scary: '恐怖惊悚（血腥、连环杀手、变态心理）'
  };

  const styleGuide = style === 'sad' ? '请偏向悲伤、温情、治愈的反转结局。' :
    style === 'scary' ? '请偏向血腥、惊悚、让人毛骨悚然的结局。' :
    style === 'weird' ? '请偏向荒诞、变格推理、逻辑扭曲的结局。' :
    '请偏向细思极恐、逻辑反转的结局。';

  const difficultyGuide = difficulty === 'easy' ? '谜题应该较简单，线索明显，适合新手。' :
    difficulty === 'hard' ? '谜题应该较难，需要多步推理，线索隐蔽。' :
    '难度适中。';

  try {
    // 随机选取2-3个示例作为Few-shot
    const examples = getRandomExamples(3);
    const examplesStr = examples.map((e, i) =>
      `示例${i + 1}（类型:${e.type}）：
标题：${e.title}
汤面（谜题）：${e.riddle}
汤底（答案）：${e.answer}`
    ).join('\n\n');

    const systemPrompt = `你是「诡谜局」AI谜题设计师，擅长创作高质量的中式恐怖海龟汤谜题。

你需要根据用户提供的关键词和类型，创作一道全新的海龟汤谜题。

## 创作类型
类型：${typeNames[type] || type}
风格要求：${styleGuide}
难度要求：${difficultyGuide}

## 优质谜题的特征（重要）
1. **汤面（谜题）**：200-400字，用第一人称叙事，营造沉浸感和悬疑感。结尾必须是一个明确的问题（如"问题：发生了什么？"）。汤面应该是一个看似不合常理的情境，让读者产生强烈的好奇心。
2. **汤底（答案）**：100-250字，揭示真相。答案必须有逻辑反转或细思极恐的元素。真相可以涉及：时间错位、身份混淆、生死错位、记忆欺骗、因果倒置等。
3. **标题**：10字以内，简洁有力，能勾起好奇心。
4. **提示**：提供3条提示，每条15字以内。提示应该模糊但有用，不直接透露答案。

## 创作禁忌
- 不要抄袭现有谜题（包括示例中的）
- 不要使用过于血腥恶心的描述
- 答案必须合逻辑，不能是纯超自然解释（可以是"看起来超自然但实际有逻辑解释"）
- 不要使用陈词滥调（如"原来我早就死了"这种已被过度使用的梗，除非有新颖的变体）

## 参考以下优质谜题风格（但不要复制）：
${examplesStr}

## 输出格式
请严格按照以下JSON格式输出（不要输出其他内容）：
{
  "title": "谜题标题（10字以内）",
  "type": "${type}",
  "riddle": "汤面全文（200-400字，结尾带明确问题）",
  "answer": "汤底全文（100-250字）",
  "hints": ["提示1", "提示2", "提示3"]
}`;

    const userPrompt = `请根据以下信息创作一道海龟汤谜题：

关键词：${keywords}
类型：${typeNames[type] || type}
风格：${style || '默认'}
难度：${difficulty || '中等'}

请创作一道全新的、高质量的谜题。`;

    // 设置 25 秒超时（云函数 30s 限制留 5s 余量）
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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.9,
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
      console.error(`DeepSeek API 返回 HTTP ${resp.status}: ${resp.statusText}`);
      if (resp.status === 429) return { ok: false, error: 'AI 服务繁忙，请稍后重试' };
      if (resp.status === 401) return { ok: false, error: 'AI 服务配置错误，请联系管理员' };
      return { ok: false, error: `AI 服务异常 (${resp.status})，请稍后重试` };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 尝试解析JSON
    let puzzle;
    try {
      puzzle = JSON.parse(content);
    } catch (e) {
      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        puzzle = JSON.parse(jsonMatch[0]);
      } else {
        console.error('JSON解析失败，raw内容:', content.slice(0, 300));
        return { ok: false, error: 'AI生成格式异常，请重试' };
      }
    }

    // 字段自动映射（DeepSeek 可能返回不同字段名）
    const riddleText = puzzle.riddle || puzzle.story || puzzle.content || puzzle.question || puzzle.tangmian || '';
    const answerText = puzzle.answer || puzzle.truth || puzzle.tangdi || puzzle.solution || '';
    const titleText = puzzle.title || puzzle.name || '';

    // 严格验证必要字段（非空且足够长）
    if (!titleText || titleText.length < 2) {
      console.error('谜题标题缺失或过短:', JSON.stringify(puzzle).slice(0, 300));
      return { ok: false, error: '生成的谜题不完整（标题缺失），请重试' };
    }
    if (!riddleText || riddleText.length < 50) {
      console.error('汤面缺失或过短 (len=' + riddleText.length + '):', JSON.stringify(puzzle).slice(0, 300));
      return { ok: false, error: '生成的谜题不完整（谜面缺失），请重试' };
    }
    if (!answerText || answerText.length < 20) {
      console.error('汤底缺失或过短 (len=' + answerText.length + '):', JSON.stringify(puzzle).slice(0, 300));
      return { ok: false, error: '生成的谜题不完整（答案缺失），请重试' };
    }

    return {
      ok: true,
      puzzle: {
        title: titleText,
        type: puzzle.type || type,
        riddle: riddleText,
        answer: answerText,
        hints: puzzle.hints || ['仔细阅读谜题', '换个角度思考', '注意时间线']
      }
    };

  } catch (err) {
    console.error('genPuzzle error:', err.message);
    return { ok: false, error: 'AI暂时无法生成，请稍后重试' };
  }
};

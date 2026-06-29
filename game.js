// ============ 状态管理 ============
const state = {
  index: 0,
  current: null,
  questions: [],
  won: false,
  givenUp: false,
  filterType: 'all'  // 当前分类筛选
};

let bestRecord = null;
let puzzleOrder = [];  // 当前筛选后的谜题顺序

// ============ 类型映射 ============
const TYPE_MAP = {
  logic: '🔍 本格推理',
  twist: '🌀 叙诡反转',
  eerie: '🌙 细思极恐',
  occult: '👻 变格悬疑',
  dark: '🖤 暗黑重口'
};

const TYPE_CLASS = {
  logic: 'type-logic',
  twist: 'type-twist',
  eerie: 'type-eerie',
  occult: 'type-occult',
  dark: 'type-dark'
};

// ============ 初始化 ============
async function initGame() {
  bestRecord = parseInt(localStorage.getItem('guimiju_best')) || null;
  if (bestRecord !== null) {
    document.getElementById('best-score').textContent = bestRecord + ' 次';
  }

  // 等 CloudBase 初始化完成
  await waitForCloudbase();
  // 读取用户解锁状态
  await loadUnlockStatus();
  updateUnlockBadge();

  // 构建初始谜题顺序
  buildPuzzleOrder();
  showScreen('screen-welcome');

  // 新手引导：首次访问显示
  if (!localStorage.getItem('guimiju_tutorial_done')) {
    setTimeout(() => showTutorial(), 800);
  }
}

// ============ 分类筛选 ============
function buildPuzzleOrder() {
  const type = state.filterType;
  if (type === 'all') {
    puzzleOrder = PUZZLES.map((_, i) => i);
  } else {
    puzzleOrder = PUZZLES
      .map((p, i) => (p.type === type ? i : -1))
      .filter(i => i >= 0);
  }
}

function filterPuzzles(type) {
  state.filterType = type;
  state.index = 0;
  buildPuzzleOrder();

  // 更新 UI
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  const chip = document.querySelector(`.filter-chip.${type === 'all' ? 'all' : 'type-' + type}`);
  if (chip) chip.classList.add('active');

  // 更新谜题计数
  document.getElementById('total-puzzles').textContent = puzzleOrder.length;
}

async function startGame() {
  playClick();  // 点击音效
  if (puzzleOrder.length === 0) {
    showToast('该分类暂无谜题');
    return;
  }

  // 检查 URL 参数中是否有指定谜题 ID
  const urlParams = new URLSearchParams(window.location.search);
  const puzzleId = parseInt(urlParams.get('p')) || null;
  if (puzzleId) {
    const idx = PUZZLES.findIndex(p => p.id === puzzleId);
    if (idx >= 0) {
      const orderIdx = puzzleOrder.indexOf(idx);
      if (orderIdx >= 0) state.index = orderIdx;
    }
  }

  loadPuzzle(0);
  showScreen('screen-game');
}

function loadPuzzle(offset) {
  state.index += offset;
  if (state.index >= puzzleOrder.length) state.index = 0;
  if (state.index < 0) state.index = puzzleOrder.length - 1;

  const realIndex = puzzleOrder[state.index];
  state.current = PUZZLES[realIndex];
  state.questions = [];
  state.won = false;
  state.givenUp = false;

  document.getElementById('puzzle-num').textContent = state.index + 1;
  document.getElementById('q-count').textContent = '0';
  document.getElementById('q-submit').disabled = false;
  document.getElementById('q-input').disabled = false;
  document.getElementById('q-input').value = '';

  const typeEl = document.getElementById('riddle-type');
  typeEl.textContent = TYPE_MAP[state.current.type] || '怪谈';
  typeEl.className = 'riddle-type ' + (TYPE_CLASS[state.current.type] || 'type-folk');

  document.getElementById('riddle-title').textContent = state.current.title;
  document.getElementById('riddle-text').textContent = state.current.riddle;
  document.getElementById('riddle-hint').textContent = '💡 提示：' + state.current.hints[0];

  const history = document.getElementById('q-history');
  history.innerHTML = '<div class="empty-qa"><div class="icon">🕸️</div><div>向 AI 提问<br>点开回答查看线索</div></div>';
}

// ============ 工具函数 ============
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function highlightClues(t) {
  return t.replace(/【(.+?)】/g, '<span class="clue-hl">$1</span>');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ============ 提问逻辑 ============
async function askQuestion() {
  const inp = document.getElementById('q-input');
  const q = inp.value.trim();
  if (!q || state.won || state.givenUp) return;
  inp.value = '';

  playAskSound();  // 🔔 提问音效

  state.questions.push({ q, a: null });
  document.getElementById('q-count').textContent = state.questions.length;

  const history = document.getElementById('q-history');
  if (history.querySelector('.empty-qa')) history.innerHTML = '';

  // 显示玩家问题
  const qDiv = document.createElement('div');
  qDiv.className = 'q-item player-q';
  qDiv.innerHTML = '<div class="label">你问：</div><div class="text">' + esc(q) + '</div>';
  history.appendChild(qDiv);

  document.getElementById('q-submit').disabled = true;
  document.getElementById('q-input').disabled = true;

  // 打字指示器
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.id = 'typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  history.appendChild(typing);
  history.scrollTop = history.scrollHeight;

  // 调用后端 API
  const answer = await answerQuestion(q);

  const t = document.getElementById('typing');
  if (t) t.remove();

  playAnswerSound();  // 💬 AI回答音效

  state.questions[state.questions.length - 1].a = answer;

  // 显示 AI 回答
  const aDiv = document.createElement('div');
  aDiv.className = 'q-item ai-r';
  aDiv.onclick = function () {
    this.querySelector('.expand-icon').classList.toggle('open');
    this.querySelector('.detail').classList.toggle('open');
  };

  let ansClass = 'answer-unrelated', ansText = '无关';
  if (answer.ans === 'yes') { ansClass = 'answer-yes'; ansText = '是'; }
  else if (answer.ans === 'no') { ansClass = 'answer-no'; ansText = '否'; }

  aDiv.innerHTML =
    '<div class="label">AI 回答：</div>' +
    '<div class="summary"><span class="expand-icon">▶</span><span class="' + ansClass + '">' + ansText + '</span></div>' +
    '<div class="detail">' + highlightClues(esc(answer.exp)) + '</div>';

  history.appendChild(aDiv);
  history.scrollTop = history.scrollHeight;

  document.getElementById('q-submit').disabled = false;
  document.getElementById('q-input').disabled = false;
  document.getElementById('q-input').focus();
}

// ============ CloudBase 初始化 ============
const CLOUDBASE_ENV_ID = 'ai-native-d6gdsx2agc8c46199';
let app = null;
let loginReady = false;
let currentUser = { id: null, name: '玩家', loginType: 'anonymous', isGm: false };

// GM 内测账号白名单
const GM_ACCOUNTS = { 'gmadmin': '内测管理员' };
const GM_UNLIMITED = 999999;

function isGmUsername(username) {
  return username && Object.keys(GM_ACCOUNTS).includes(username.toLowerCase());
}

async function initCloudbase() {
  // GitHub Pages 上跳过 CloudBase 初始化，用 HTTP API
  if (isGitHubPages) {
    console.log('GitHub Pages 模式，跳过 CloudBase 初始化');
    loginReady = true;  // 标记就绪，不阻塞游戏
    return true;
  }
  try {
    if (typeof cloudbase === 'undefined') {
      console.error('CloudBase SDK 未加载');
      return false;
    }
    app = cloudbase.init({ env: CLOUDBASE_ENV_ID });
    const auth = app.auth;

    // 1. 检查现有会话
    const { data: sessionData } = await auth.getSession();
    if (sessionData && sessionData.session && sessionData.session.user) {
      const u = sessionData.session.user;
      loginReady = true;
      currentUser.id = u.id;
      currentUser.name = u.user_metadata?.username || u.user_metadata?.name || '玩家';
      currentUser.loginType = u.is_anonymous ? 'anonymous' : 'password';
      currentUser.isGm = isGmUsername(u.user_metadata?.username || '');
      updateLoginUI();
      console.log('CloudBase 已有登录会话, loginType:', currentUser.loginType);
      return true;
    }

    // 2. 尝试自动密码登录
    const savedCreds = getSavedCreds();
    if (savedCreds) {
      const { data, error } = await auth.signInWithPassword({
        username: savedCreds.username,
        password: savedCreds.password
      });
      if (!error && data && data.user) {
        loginReady = true;
        currentUser.id = data.user.id;
        currentUser.name = data.user.user_metadata?.username || savedCreds.username;
        currentUser.loginType = 'password';
        currentUser.isGm = isGmUsername(savedCreds.username);
        updateLoginUI();
        console.log('CloudBase 自动密码登录成功');
        return true;
      }
      clearSavedCreds();
    }

    // 3. 降级匿名登录
    const { data: anonData, error: anonError } = await auth.signInAnonymously();
    if (anonError) {
      console.error('匿名登录失败:', anonError.message);
      return false;
    }
    loginReady = true;
    currentUser.id = anonData.user?.id || 'anonymous';
    currentUser.loginType = 'anonymous';
    currentUser.isGm = false;
    updateLoginUI();
    console.log('CloudBase 匿名登录成功, uid:', currentUser.id);
    return true;
  } catch (e) {
    console.error('CloudBase 初始化失败:', e.message || e);
    loginReady = false;
    return false;
  }
}

// ============ 登录/注册/退出 ============
async function loginWithPassword(identifier, password) {
  if (!app) return { ok: false, error: 'CloudBase 未初始化' };
  const auth = app.auth;
  // 判断是邮箱还是用户名
  const isEmail = identifier.includes('@');
  const params = isEmail ? { email: identifier, password } : { username: identifier, password };
  const { data, error } = await auth.signInWithPassword(params);
  if (error) return { ok: false, error: transErr(error.message) || '登录失败' };
  if (!data || !data.user) return { ok: false, error: '登录失败' };
  saveCreds(identifier, password);
  currentUser.id = data.user.id;
  currentUser.name = data.user.user_metadata?.username || data.user.user_metadata?.nickname || identifier;
  currentUser.loginType = 'password';
  currentUser.isGm = isGmUsername(data.user.user_metadata?.username || identifier);
  loginReady = true;
  updateLoginUI();
  console.log('密码登录成功, isGm:', currentUser.isGm);
  return { ok: true };
}

// ============ 错误翻译 ============
const ERROR_CN = {
  'provider email not found from endpoint': '邮箱登录服务未配置，请联系管理员',
  'You must provide either an email or phone number': '请填写邮箱地址',
  'user not found': '用户不存在',
  'password is invalid': '密码错误',
  'password invalid': '密码错误',
  'email already exists': '该邮箱已被注册',
  'username already exists': '该用户名已被占用',
  'invalid email': '邮箱格式不正确',
  'invalid phone number': '手机号格式不正确',
  'email is required': '请输入邮箱',
  'too many requests': '操作太频繁，请稍后再试',
  'user already exists': '用户已存在',
  'already registered': '该用户已注册',
  'network request failed': '网络连接失败，请检查网络',
  'signup disabled': '注册功能已关闭',
  'login failed': '登录失败',
  'invalid credentials': '邮箱或密码错误',
  'invalid login credentials': '邮箱或密码错误',
};
function transErr(msg) {
  if (!msg) return '操作失败';
  const lower = msg.toLowerCase();
  for (const [key, val] of Object.entries(ERROR_CN)) {
    if (lower.includes(key)) return val;
  }
  return msg;
}

// ============ 注册流程 ============
let registerSignUpResult = null; // 保存 signUp 返回的 data（含 verifyOtp）
let codeCooldown = 0;

async function handleSendVerifyCode() {
  const email = document.getElementById('v1-register-email').value.trim();
  const username = document.getElementById('v1-register-username').value.trim();
  const password = document.getElementById('v1-register-password').value;
  const agree = document.getElementById('v1-register-agree').checked;
  const errEl = document.getElementById('v1-register-error');
  const tipEl = document.getElementById('v1-code-tip');
  const btn = document.getElementById('btn-v1-send-code');
  errEl.textContent = '';

  if (!email || !email.includes('@')) { errEl.textContent = '请先输入有效邮箱'; return; }
  if (!username || username.length < 3) { errEl.textContent = '用户名至少3位'; return; }
  if (!password || password.length < 6) { errEl.textContent = '密码至少6位'; return; }
  if (!agree) { errEl.textContent = '请先同意隐私政策和服务协议'; return; }
  if (codeCooldown > 0) { errEl.textContent = '请 ' + codeCooldown + ' 秒后再试'; return; }

  btn.disabled = true; btn.textContent = '发送中...';
  try {
    const auth = app.auth;
    // 第一步：发起邮箱注册，CloudBase 会发送验证码
    const { data, error } = await auth.signUp({ email, password, username, nickname: username });
    if (error) { errEl.textContent = transErr(error.message) || '发送验证码失败'; btn.disabled = false; btn.textContent = '发送验证码'; return; }
    // data 包含 verifyOtp 方法，用于验证验证码
    registerSignUpResult = data;
    tipEl.textContent = '验证码已发送至 ' + email + '，5分钟内有效';
    // 60秒冷却
    codeCooldown = 60;
    btn.textContent = codeCooldown + 's';
    const timer = setInterval(() => {
      codeCooldown--;
      btn.textContent = codeCooldown + 's';
      if (codeCooldown <= 0) { clearInterval(timer); btn.textContent = '重新发送'; btn.disabled = false; }
    }, 1000);
  } catch (e) {
    errEl.textContent = transErr(e.message) || '发送失败';
    btn.disabled = false; btn.textContent = '发送验证码';
  }
}

async function handleSignUp() {
  const code = document.getElementById('v1-register-code').value.trim();
  const errEl = document.getElementById('v1-register-error');
  const btn = document.getElementById('btn-v1-register-submit');

  // 如果还没发送验证码，先发送
  if (!registerSignUpResult || !registerSignUpResult.verifyOtp) {
    errEl.textContent = '请先点击「发送验证码」';
    return;
  }
  if (!code || code.length !== 6) { errEl.textContent = '请输入6位验证码'; return; }

  btn.disabled = true; btn.textContent = '验证中...'; errEl.textContent = '';

  try {
    // 第二步：验证邮箱验证码
    const { data: verifyData, error: verifyError } = await registerSignUpResult.verifyOtp({ token: code });
    if (verifyError) { errEl.textContent = transErr(verifyError.message) || '验证码错误'; btn.disabled = false; btn.textContent = '注册并登录'; return; }
    if (verifyData && verifyData.user) {
      const username = document.getElementById('v1-register-username').value.trim();
      const email = document.getElementById('v1-register-email').value.trim();
      const password = document.getElementById('v1-register-password').value;
      saveCreds(email, password);
      currentUser.id = verifyData.user.id;
      currentUser.name = username;
      currentUser.loginType = 'password';
      currentUser.isGm = isGmUsername(username);
      loginReady = true;
      onSignUpSuccess(username);
      return;
    }
    errEl.textContent = '验证成功但未返回用户信息，请重试';
    btn.disabled = false; btn.textContent = '注册并登录';
  } catch (e) {
    errEl.textContent = transErr(e.message) || '注册失败';
    btn.disabled = false; btn.textContent = '注册并登录';
  }
}

function onSignUpSuccess(username) {
  document.getElementById('modal-v1-register').classList.add('hidden');
  hideLoginModal();
  showToast('注册成功！欢迎 ' + username);
  updateLoginUI();
  loadUnlockStatus().then(() => { updateUnlockBadge(); buildPuzzleOrder(); document.getElementById('total-puzzles').textContent = puzzleOrder.length; });
  // 重置注册表单
  document.getElementById('v1-register-code').value = '';
  document.getElementById('v1-register-agree').checked = false;
  document.getElementById('btn-v1-register-submit').disabled = true;
  document.getElementById('btn-v1-send-code').disabled = false;
  document.getElementById('btn-v1-send-code').textContent = '发送验证码';
  document.getElementById('v1-code-tip').textContent = '';
  registerSignUpResult = null;
  codeCooldown = 0;
}

function updateRegisterBtn() {
  const agree = document.getElementById('v1-register-agree').checked;
  document.getElementById('btn-v1-register-submit').disabled = !agree;
}

// ============ 隐私政策 / 服务协议 ============
const TERMS_CONTENT = {
  privacy: {
    title: '📜 隐私政策',
    body: `<p><strong>生效日期：</strong>2026年6月29日</p>
<p><strong>诡谜局</strong>（以下简称"我们"）深知个人信息对您的重要性，我们将按法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。</p>
<p><strong>一、我们收集的信息</strong></p>
<p>1. 账号信息：当您注册账号时，我们收集您的<strong>邮箱地址</strong>和<strong>用户名</strong>，用于创建和管理您的账号。</p>
<p>2. 游戏数据：我们收集您的<strong>游戏进度</strong>（已解锁谜题、提问记录、最佳成绩），用于提供游戏服务和改善体验。</p>
<p>3. 本地存储：我们使用浏览器 localStorage 在您的设备上保存<strong>游戏进度</strong>、<strong>音效设置</strong>和<strong>登录凭据</strong>，以便您下次访问时恢复游戏状态。这些数据仅存储在您的设备上，不会上传至服务器（登录凭据除外，用于自动登录）。</p>
<p>4. 设备信息：我们可能收集设备型号、操作系统版本等基础信息，用于优化服务兼容性。</p>
<p><strong>二、信息的使用</strong></p>
<p>1. 提供游戏服务：保存您的游戏进度，支持跨设备同步。</p>
<p>2. 改善体验：分析游戏数据以优化谜题难度和用户体验。</p>
<p>3. 安全防护：防范欺诈和滥用行为。</p>
<p><strong>三、信息的存储与保护</strong></p>
<p>1. 您的数据存储在腾讯云 CloudBase（上海节点），采用行业标准安全措施。</p>
<p>2. 我们不会将您的个人信息出售或分享给第三方。</p>
<p><strong>四、您的权利</strong></p>
<p>1. 您可以随时查看、修改或删除您的账号信息。</p>
<p>2. 如需注销账号或导出数据，请联系我们。</p>
<p>3. 您可以通过浏览器设置清除 localStorage 数据来删除本地存储的游戏记录。</p>
<p><strong>五、未成年人保护</strong></p>
<p>1. 本游戏内容包含悬疑、推理元素，建议<strong>16周岁以上</strong>用户使用。</p>
<p>2. 我们不会故意收集未成年人的个人信息。如发现误收集，将及时删除。</p>
<p><strong>六、联系方式</strong></p>
<p>如有隐私相关问题，请通过游戏内反馈渠道联系我们。</p>`
  },
  service: {
    title: '📋 服务协议',
    body: `<p><strong>生效日期：</strong>2026年6月29日</p>
<p>欢迎使用<strong>诡谜局</strong>AI脑洞推理游戏。请您仔细阅读以下服务协议。</p>
<p><strong>一、服务说明</strong></p>
<p>1. 诡谜局是一款 AI 驱动的推理游戏，玩家通过向 AI 提问来推理谜题真相。</p>
<p>2. 游戏目前所有内容免费开放，后续如有付费内容将提前公告。</p>
<p><strong>二、用户义务</strong></p>
<p>1. 您承诺不利用本服务从事违法活动，包括但不限于：发布违法信息、侵犯他人权益、干扰服务正常运行。</p>
<p>2. 您应妥善保管账号信息，因账号泄露导致的损失由您自行承担。</p>
<p><strong>三、免责声明</strong></p>
<p>1. AI 回答内容由 DeepSeek 等第三方模型生成，我们不保证其完全准确。</p>
<p>2. 因不可抗力导致的服务中断，我们不承担责任。</p>
<p><strong>五、协议修改</strong></p>
<p>我们有权适时修改本协议，修改后的协议将在页面公示后生效。</p>
<p><strong>六、未成年人</strong></p>
<p>本游戏建议16周岁以上用户使用。未成年人应在监护人指导下使用本服务。</p>
<p><strong>七、适用法律</strong></p>
<p>本协议适用中华人民共和国法律。</p>`
  }
};

function showTerms(type) {
  const content = TERMS_CONTENT[type];
  if (!content) return;
  document.getElementById('terms-title').textContent = content.title;
  document.getElementById('terms-body').innerHTML = content.body;
  document.getElementById('modal-terms').classList.remove('hidden');
}

function hideTermsModal() {
  document.getElementById('modal-terms').classList.add('hidden');
}

async function logout() {
  if (!app) return;
  const auth = app.auth;
  try { await auth.signOut(); } catch (e) { /* ignore */ }
  clearSavedCreds();
  const { data, error } = await auth.signInAnonymously();
  if (!error && data && data.user) {
    currentUser.id = data.user.id;
  }
  currentUser.name = '玩家';
  currentUser.loginType = 'anonymous';
  currentUser.isGm = false;
  updateLoginUI();
  showToast('已退出登录');
}

// ============ 凭据管理 ============
function saveCreds(username, password) {
  try { localStorage.setItem('guimiju_v1_cred', JSON.stringify({ username, password })); } catch (e) {}
}
function getSavedCreds() {
  try { const r = localStorage.getItem('guimiju_v1_cred'); return r ? JSON.parse(r) : null; } catch (e) { return null; }
}
function clearSavedCreds() {
  try { localStorage.removeItem('guimiju_v1_cred'); } catch (e) {}
}

// ============ API 端点检测 ============
// GitHub Pages 上用 CloudRun 代理，CloudBase 上用云函数
const API_PROXY_URL = 'https://api-proxy-276064-5-1448179936.sh.run.tcloudbase.com';
const isGitHubPages = window.location.hostname.includes('github.io');
const isCloudBase = window.location.hostname.includes('tcloudbaseapp.com');

// ============ API 调用 ============
async function answerQuestion(question) {
  try {
    const history = state.questions.slice(0, -1).filter(h => h.a);
    const payload = {
      question: question,
      riddle: state.current.riddle,
      answer: state.current.answer,
      history: history
    };

    // GitHub Pages → CloudRun HTTP API
    if (isGitHubPages) {
      const resp = await fetch(API_PROXY_URL + '/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      return data;
    }

    // CloudBase → 云函数
    if (!loginReady && app) {
      await initCloudbase();
    }
    if (!loginReady || !app) {
      throw new Error('CloudBase 未初始化');
    }

    const result = await app.callFunction({
      name: 'askAi',
      data: payload
    });

    return result.result;
  } catch (e) {
    console.warn('API 请求失败:', e.message || e);
    return { ans: 'unrelated', exp: '网络异常，请稍后重试。换个方向试试？' };
  }
}

// 预初始化
initCloudbase();

// ============ 兑换码系统 ============
let unlockedPuzzles = 0;  // 已解锁谜题数（从数据库/localStorage读取）

async function loadUnlockStatus() {
  // 先查 localStorage
  const local = localStorage.getItem('guimiju_unlocked');
  if (local === 'true') { unlockedPuzzles = PUZZLES.length; return; }

  // 再查数据库
  if (loginReady && app) {
    try {
      const db = app.database();
      const result = await db.collection('user_unlocks')
        .where({ productId: 'redeem_unlock_all' })
        .limit(1)
        .get();
      if (result.data && result.data.length > 0) {
        unlockedPuzzles = PUZZLES.length;
        localStorage.setItem('guimiju_unlocked', 'true');
        return;
      }
    } catch (e) { console.warn('读取解锁状态失败:', e.message); }
  }
  unlockedPuzzles = 0;
}

function showRedeemModal() {
  if (isGitHubPages) {
    showToast('🎫 兑换码功能请访问官网：\nguimiju.tcloudbaseapp.com', 'info');
    return;
  }
  document.getElementById('modal-redeem').classList.remove('hidden');
  document.getElementById('redeem-code-input').value = '';
  document.getElementById('redeem-error').textContent = '';
  document.getElementById('redeem-success').style.display = 'none';
}

function hideRedeemModal() {
  document.getElementById('modal-redeem').classList.add('hidden');
}

async function handleRedeem() {
  const code = document.getElementById('redeem-code-input').value.trim().toUpperCase();
  const errEl = document.getElementById('redeem-error');
  const succEl = document.getElementById('redeem-success');
  const btn = document.getElementById('btn-redeem-submit');
  errEl.textContent = '';
  succEl.style.display = 'none';

  if (!code || code.length < 6) { errEl.textContent = '请输入有效兑换码'; return; }

  btn.disabled = true; btn.textContent = '验证中...';

  try {
    const result = await app.callFunction({
      name: 'handlePayment',
      data: { action: 'redeemCode', code }
    });

    const res = result.result || {};
    if (res.code === 0) {
      unlockedPuzzles = PUZZLES.length;
      localStorage.setItem('guimiju_unlocked', 'true');
      updateUnlockBadge();
      succEl.style.display = 'block';
      succEl.textContent = '✅ 兑换成功！全部 ' + PUZZLES.length + ' 道谜题已解锁';
      playUnlockSound();
      setTimeout(() => { hideRedeemModal(); showToast('🎉 全部谜题已解锁！'); }, 1500);
    } else {
      errEl.textContent = res.message || '兑换码无效或已使用';
    }
  } catch (e) {
    errEl.textContent = '网络错误，请重试';
    console.error('兑换失败:', e);
  }

  btn.disabled = false; btn.textContent = '兑换';
}

function updateUnlockBadge() {
  const badge = document.getElementById('unlock-badge');
  if (!badge) return;
  if (unlockedPuzzles >= PUZZLES.length) {
    badge.textContent = '🔓 已解锁全部 ' + PUZZLES.length + ' 道谜题';
    badge.className = 'unlock-badge unlocked';
  } else {
    badge.textContent = '🎫 输入兑换码解锁全部谜题';
    badge.className = 'unlock-badge locked';
  }
}

// ============ 分享增强 ============
// 游戏内分享当前谜题
function shareCurrentPuzzle() {
  const p = state.current;
  if (!p) return;
  const text = `🔍 诡谜局 · 今日谜题

「${p.title}」
${p.riddle.slice(0, 100)}…

你能推理出真相吗？向AI提问来破案！
#诡谜局 #AI推理 #脑洞游戏

来挑战：https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com/?p=${p.id}&ref=share_puzzle`;

  if (navigator.share) {
    navigator.share({ title: '诡谜局 · ' + p.title, text: text.slice(0, 200), url: window.location.href + '?p=' + p.id + '&ref=share_native' })
      .catch(() => {});
  } else {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('📋 文案已复制，去分享吧！'));
    } else {
      showToast('请长按截图分享');
    }
  }
}

// ============ 每日一题 ============
function getDailySeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function getDailyPuzzleIndex() {
  const seed = getDailySeed();
  // 伪随机：用日期作为种子选一道题
  const hash = (seed * 2654435761) >>> 0;
  return hash % PUZZLES.length;
}

function showDailyPuzzle() {
  playClick();
  const idx = getDailyPuzzleIndex();
  const dailyKey = 'guimiju_daily_' + getDailySeed();
  const lastPlayed = localStorage.getItem('guimiju_daily_last');

  // 构建只有这一题的 order
  state.filterType = 'all';
  buildPuzzleOrder();

  // 找到这道题在 puzzleOrder 中的位置
  const orderIdx = puzzleOrder.indexOf(idx);
  state.index = orderIdx >= 0 ? orderIdx : 0;

  // 记录今日已玩
  if (lastPlayed !== String(getDailySeed())) {
    localStorage.setItem('guimiju_daily_last', String(getDailySeed()));
  }

  loadPuzzle(0);
  showScreen('screen-game');
  showToast('📅 今日推荐谜题', 'info');
}

async function waitForCloudbase() {
  if (loginReady) return;
  let attempts = 0;
  while (!loginReady && attempts < 50) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }
  if (loginReady) updateLoginUI();
}

// ============ 登录 UI 更新 ============
function updateLoginUI() {
  const loginBtn = document.getElementById('btn-v1-login');
  const loginStatus = document.getElementById('v1-login-status');
  if (loginBtn) {
    loginBtn.textContent = currentUser.loginType === 'password' ? '👤 账号' : '🔑 登录';
  }
  if (loginStatus) {
    loginStatus.textContent = currentUser.loginType === 'password'
      ? (currentUser.isGm ? '⭐' + currentUser.name + ' (GM)' : currentUser.name)
      : '未登录';
    loginStatus.className = currentUser.loginType === 'password'
      ? (currentUser.isGm ? 'login-status gm' : 'login-status logged')
      : 'login-status';
  }
  // 更新付费 badge
  const badge = document.getElementById('unlock-badge');
  if (badge && currentUser.isGm) {
    badge.textContent = '⭐ GM内测 · 全部谜题免费';
    badge.className = 'unlock-badge unlocked';
  }
}

function showLoginModal() {
  if (isGitHubPages) {
    showToast('🔑 登录功能请访问官网：\nguimiju.tcloudbaseapp.com', 'info');
    return;
  }
  if (currentUser.loginType === 'password') {
    showAccountModal();
    return;
  }
  document.getElementById('modal-v1-login').classList.remove('hidden');
  document.getElementById('v1-login-error').textContent = '';
}

function hideLoginModal() {
  document.getElementById('modal-v1-login').classList.add('hidden');
}

function showAccountModal() {
  document.getElementById('v1-account-name').textContent = currentUser.name;
  document.getElementById('v1-account-type').textContent = '登录方式：' + (currentUser.loginType === 'password' ? '账号密码' : '匿名');
  document.getElementById('v1-account-id').textContent = 'UID: ' + (currentUser.id || '-');
  const gmInfo = document.getElementById('v1-gm-info');
  if (gmInfo) gmInfo.style.display = currentUser.isGm ? '' : 'none';
  const logoutBtn = document.getElementById('btn-v1-logout');
  if (logoutBtn) logoutBtn.style.display = currentUser.loginType === 'password' ? '' : 'none';
  document.getElementById('modal-v1-account').classList.remove('hidden');
}

function hideAccountModal() {
  document.getElementById('modal-v1-account').classList.add('hidden');
}

// ============ 重置密码 ============
function showResetPwdModal() {
  hideLoginModal();
  document.getElementById('modal-v1-resetpwd').classList.remove('hidden');
  document.getElementById('v1-resetpwd-error').textContent = '';
  document.getElementById('v1-resetpwd-success').style.display = 'none';
  document.getElementById('v1-resetpwd-email').value = '';
  document.getElementById('btn-v1-resetpwd-submit').disabled = false;
}

function hideResetPwdModal() {
  document.getElementById('modal-v1-resetpwd').classList.add('hidden');
}

async function handleResetPassword() {
  const email = document.getElementById('v1-resetpwd-email').value.trim();
  const errEl = document.getElementById('v1-resetpwd-error');
  const succEl = document.getElementById('v1-resetpwd-success');
  errEl.textContent = '';
  succEl.style.display = 'none';

  if (!email || !email.includes('@')) { errEl.textContent = '请输入有效邮箱'; return; }

  const btn = document.getElementById('btn-v1-resetpwd-submit');
  btn.disabled = true; btn.textContent = '发送中...';

  try {
    const auth = app.auth;
    const { error } = await auth.sendPasswordResetEmail({ email });
    if (error) { errEl.textContent = transErr(error.message) || '发送失败，请检查邮箱是否正确'; btn.disabled = false; btn.textContent = '发送重置邮件'; return; }
    succEl.style.display = 'block';
    succEl.textContent = '重置链接已发送至 ' + email + '，请查收邮件（可能被归入垃圾箱）。';
    btn.textContent = '已发送';
  } catch (e) {
    errEl.textContent = transErr(e.message) || '发送失败，请稍后重试';
    btn.disabled = false; btn.textContent = '发送重置邮件';
  }
}

async function handleLogin() {
  const identifier = document.getElementById('v1-login-username').value.trim();
  const password = document.getElementById('v1-login-password').value;
  const errEl = document.getElementById('v1-login-error');
  if (!identifier || !password) { errEl.textContent = '请输入邮箱/用户名和密码'; return; }
  const btn = document.getElementById('btn-v1-login-submit');
  btn.disabled = true; btn.textContent = '登录中...'; errEl.textContent = '';
  const result = await loginWithPassword(identifier, password);
  btn.disabled = false; btn.textContent = '登录';
  if (result.ok) {
    hideLoginModal();
    showToast('登录成功！' + (currentUser.isGm ? ' ⭐GM' : ''));
    updateLoginUI();
    await loadUnlockStatus();
    updateUnlockBadge();
    buildPuzzleOrder();
    document.getElementById('total-puzzles').textContent = puzzleOrder.length;
  } else {
    errEl.textContent = result.error || '登录失败';
  }
}


function showRegisterModal() {
  document.getElementById('modal-v1-login').classList.add('hidden');
  document.getElementById('modal-v1-register').classList.remove('hidden');
  document.getElementById('v1-register-error').textContent = '';
  // 重置验证码状态
  document.getElementById('v1-register-code').value = '';
  document.getElementById('v1-register-agree').checked = false;
  document.getElementById('btn-v1-register-submit').disabled = true;
  document.getElementById('btn-v1-send-code').disabled = false;
  document.getElementById('btn-v1-send-code').textContent = '发送验证码';
  document.getElementById('v1-code-tip').textContent = '';
  registerSignUpResult = null;
  codeCooldown = 0;
}

async function handleLogout() {
  hideAccountModal();
  await logout();
  updateLoginUI();
  await loadUnlockStatus();
  updateUnlockBadge();
  buildPuzzleOrder();
  document.getElementById('total-puzzles').textContent = puzzleOrder.length;
}

// ============ 猜答案 / 放弃 ============
function showGuessModal() {
  if (state.won || state.givenUp) return;
  showScreen('screen-guess');
  document.getElementById('guess-input').value = '';
  document.getElementById('guess-input').focus();
}

function closeGuessModal() {
  showScreen('screen-game');
}

function submitGuess() {
  const g = document.getElementById('guess-input').value.trim();
  if (!g) return;
  state.won = true;
  showResult(true);
}

function giveUp() {
  state.givenUp = true;
  state.won = false;
  showResult(false);
}

// ============ 结果展示 ============
function showResult(won) {
  // 图标动画
  const icons = won ? ['🏆','🎉','✨','👑'] : ['💡','🤔','🔍','📝'];
  const icon = won ? '🏆' : '💡';
  document.getElementById('result-icon').textContent = icon;
  document.getElementById('result-title').textContent = won ? '你猜对了！' : '真相是…';
  document.getElementById('result-title').className = 'result-title ' + (won ? 'win' : 'lose');
  document.getElementById('result-text').textContent = state.current.answer;
  document.getElementById('result-questions').textContent = state.questions.length;

  let score = Math.max(0, 100 - state.questions.length * 8);
  if (state.givenUp) score = 0;

  let grade = 'F';
  if (score >= 90) grade = 'S';
  else if (score >= 70) grade = 'A';
  else if (score >= 50) grade = 'B';
  else if (score >= 30) grade = 'C';
  else if (score >= 10) grade = 'D';

  document.getElementById('result-score').textContent = grade + ' (' + score + '分)';

  if (!state.givenUp && (bestRecord === null || state.questions.length < bestRecord)) {
    bestRecord = state.questions.length;
    localStorage.setItem('guimiju_best', bestRecord);
    document.getElementById('best-score').textContent = bestRecord + ' 次';
  }

  // 保存本次结果用于分享
  state._lastResult = { won, questions: state.questions.length, grade, score, icon };

  // 只在猜对时显示分享按钮
  const shareBtn = document.getElementById('btn-share-result');
  if (shareBtn) shareBtn.style.display = won ? '' : 'none';

  showScreen('screen-result');

  // 猜对时触发粒子庆祝 + 音效
  if (won) {
    burstParticles();
    playWinSound();  // 🏆 胜利音效
  } else {
    playLoseSound();  // 💀 失败音效
  }
}

// ============ 分享卡片 ============
function showShareCard() {
  const r = state._lastResult;
  if (!r) return;

  document.getElementById('share-icon').textContent = r.icon;
  document.getElementById('share-questions').textContent = r.questions;
  document.getElementById('share-grade').textContent = r.grade;
  document.getElementById('share-title').textContent = state.current.title;

  // 截取谜面前80字作为预览
  const preview = state.current.riddle.length > 80
    ? state.current.riddle.slice(0, 80) + '…'
    : state.current.riddle;
  document.getElementById('share-preview').textContent = preview;

  showScreen('screen-share');
}

function hideShareCard(e) {
  if (e && e.target !== document.getElementById('screen-share')) return;
  showScreen('screen-result');
}

function copyShareCard() {
  const r = state._lastResult;
  if (!r) return;

  const text = `🔍 诡谜局 · AI 脑洞推理游戏

「${state.current.title}」
${r.won ? '✅ 我猜对了！' : '💀 真相是…'}
📊 提问 ${r.questions} 次 · 评分 ${r.grade}

#诡谜局 #AI推理 #脑洞游戏
来挑战：https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com/?ref=share_result`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ 文案已复制，去分享吧！');
    }).catch(() => {
      showToast('复制失败，请截图分享');
    });
  } else {
    showToast('请长按截图分享');
  }

  // 短暂延迟后关闭
  setTimeout(() => {
    const shareScreen = document.getElementById('screen-share');
    if (!shareScreen.classList.contains('hidden')) {
      showScreen('screen-result');
    }
  }, 1200);
}

// ============ Toast 提示 ============
let toastTimer = null;
function showToast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = 'toast ' + (type || '');
  // 强制回流
  el.offsetHeight;
  el.classList.add('show');
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2000);
}

// ============ 音效系统 (HTML5 Audio + Web Audio fallback) ============
let soundEnabled = true;
let ambienceAudio = null;

// 音频文件池
const SOUND_FILES = {
  click: 'sounds/click.mp3',
  ask: 'sounds/ask.mp3',
  answer: 'sounds/answer.mp3',
  win: 'sounds/win.mp3',
  lose: 'sounds/lose.mp3',
  next: 'sounds/next.mp3',
  unlock: 'sounds/unlock.mp3',
  ambience: 'sounds/ambience.mp3'
};

// 预加载检查缓存
const audioCache = {};
let filesAvailable = null; // null=未检测, true=有文件, false=无文件

// 检测音频文件是否可用（通过尝试 fetch HEAD）
async function checkAudioFiles() {
  if (filesAvailable !== null) return filesAvailable;
  try {
    const resp = await fetch(SOUND_FILES.click, { method: 'HEAD' });
    filesAvailable = resp.ok;
    if (filesAvailable) console.log('✅ 音频文件已就绪，使用真实音效');
    else console.log('⚠️ 音频文件未找到，使用合成音效');
  } catch (e) {
    filesAvailable = false;
    console.log('⚠️ 音频文件不可用，使用合成音效');
  }
  return filesAvailable;
}

function initAudio() {
  soundEnabled = localStorage.getItem('guimiju_sound') !== 'off';
  // 预加载氛围音频
  ambienceAudio = new Audio(SOUND_FILES.ambience);
  ambienceAudio.loop = true;
  ambienceAudio.volume = 0.3;
  // 异步检测文件可用性
  checkAudioFiles();
  // 首次交互时激活
  document.addEventListener('click', resumeAudio, { once: true });
  document.addEventListener('keydown', resumeAudio, { once: true });
}

function resumeAudio() {
  if (soundEnabled) startAmbience();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('guimiju_sound', soundEnabled ? 'on' : 'off');
  const btn = document.getElementById('btn-sound');
  if (soundEnabled) {
    startAmbience();
    showToast('🔊 音效已开启');
    if (btn) btn.textContent = '🔊 音效';
  } else {
    stopAmbience();
    showToast('🔇 音效已关闭');
    if (btn) btn.textContent = '🔇 静音';
  }
}

// ---- 通用播放函数 ----
function playAudio(name) {
  if (!soundEnabled) return;
  // 优先用真实文件
  if (filesAvailable === true) {
    const src = SOUND_FILES[name];
    if (!src) return;
    // 使用缓存池避免重复创建
    if (!audioCache[name]) {
      audioCache[name] = new Audio(src);
      audioCache[name].preload = 'auto';
    }
    const a = audioCache[name];
    a.currentTime = 0;
    a.volume = (name === 'ambience') ? 0.3 : 0.7;
    a.play().catch(() => {}); // 忽略自动播放限制（已在用户交互后调用）
  } else {
    // fallback: Web Audio API 合成音效
    playSynth(name);
  }
}

// ---- 氛围背景 ----
function startAmbience() {
  if (!soundEnabled) return;
  if (filesAvailable === true) {
    if (!ambienceAudio) ambienceAudio = new Audio(SOUND_FILES.ambience);
    ambienceAudio.loop = true;
    ambienceAudio.volume = 0.3;
    ambienceAudio.play().catch(() => {});
  } else if (filesAvailable === false) {
    startSynthAmbience();
  }
  // filesAvailable === null 时（还在检测中），等检测完再说
}

function stopAmbience() {
  if (ambienceAudio) {
    ambienceAudio.pause();
    ambienceAudio.currentTime = 0;
  }
  stopSynthAmbience();
}

// ---- 具体音效（统一入口） ----
function playClick()     { playAudio('click'); }
function playAskSound()  { playAudio('ask'); }
function playAnswerSound(){ playAudio('answer'); }
function playWinSound()  { playAudio('win'); }
function playLoseSound() { playAudio('lose'); }
function playNextSound() { playAudio('next'); }
function playUnlockSound(){ playAudio('unlock'); }

// ========== Web Audio API Fallback（无音频文件时合成） ==========
let audioCtx = null;
let synthAmbience = null;

function getCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, type, duration, gainVal = 0.08, detune = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  g.gain.setValueAtTime(gainVal, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + duration);
}

function playChord(freqs, type, duration, gainVal = 0.06, stagger = 0.04) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type; osc.frequency.value = f;
    g.gain.setValueAtTime(gainVal, t + i * stagger);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * stagger + duration);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + i * stagger); osc.stop(t + i * stagger + duration);
  });
}

function playNoise(duration, gainVal = 0.03, filterFreq = 800) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gainVal, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(flt); flt.connect(g); g.connect(ctx.destination);
  src.start(t);
}

function playSynth(name) {
  switch(name) {
    case 'click':
      playTone(700, 'sine', 0.08, 0.06);
      playTone(1000, 'sine', 0.06, 0.04, 10);
      break;
    case 'ask':
      playTone(660, 'triangle', 0.45, 0.06);
      playTone(880, 'triangle', 0.35, 0.04, 8);
      playTone(1100, 'triangle', 0.3, 0.03, 15);
      break;
    case 'answer':
      playNoise(0.25, 0.015, 700);
      playTone(260, 'sine', 0.4, 0.04);
      playTone(200, 'sine', 0.5, 0.03, -5);
      break;
    case 'win':
      playChord([523, 659, 784, 1047], 'triangle', 0.8, 0.08, 0.06);
      setTimeout(() => playChord([784, 988, 1175], 'triangle', 0.6, 0.06, 0.05), 400);
      break;
    case 'lose':
      playChord([220, 165, 130], 'sine', 1.2, 0.07, 0.08);
      playNoise(0.5, 0.02, 300);
      break;
    case 'next':
      playTone(520, 'sine', 0.12, 0.04);
      setTimeout(() => playTone(780, 'sine', 0.1, 0.04), 80);
      break;
    case 'unlock':
      playChord([523, 659, 784, 1047, 1319], 'triangle', 1.0, 0.07, 0.05);
      break;
  }
}

function startSynthAmbience() {
  if (synthAmbience) return;
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 55;
  const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 73;
  const merge = ctx.createGain(); merge.gain.value = 0.5;
  const gain = ctx.createGain(); gain.gain.value = 0.012;
  osc.connect(merge); osc2.connect(merge);
  merge.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc2.start();

  let timer = null;
  function pulse() {
    if (!synthAmbience) return;
    timer = setTimeout(() => {
      if (!synthAmbience) return;
      const t = ctx.currentTime;
      const po = ctx.createOscillator(); po.type = 'sine'; po.frequency.value = 28 + Math.random() * 15;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0.025, t);
      pg.gain.exponentialRampToValueAtTime(0.001, t + 1.5 + Math.random() * 2);
      po.connect(pg); pg.connect(ctx.destination);
      po.start(t); po.stop(t + 3);
      pulse();
    }, 3000 + Math.random() * 8000);
  }
  pulse();
  synthAmbience = { osc, osc2, merge, gain, timer };
}

function stopSynthAmbience() {
  if (!synthAmbience) return;
  try { synthAmbience.osc.stop(); synthAmbience.osc2.stop(); clearTimeout(synthAmbience.timer); } catch(e) {}
  synthAmbience = null;
}

// 初始化
initAudio();
function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  const pts = [];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // 初始化粒子
  for (let i = 0; i < 30; i++) {
    pts.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.1,
      o: Math.random() * 0.4 + 0.1,
      op: Math.random() * 0.02
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.o += p.op;
      if (p.o > 0.5 || p.o < 0.1) p.op *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,168,83,${p.o})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
    }
    particlesAnimId = requestAnimationFrame(draw);
  }
  draw();
}

// 猜对时粒子爆发
function burstParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const burst = [];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    burst.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: Math.random() * 0.02 + 0.01,
      r: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? '212,168,83' : '139,58,74'
    });
  }

  function animBurst() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of burst) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life > 0) {
        alive = true;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.life})`;
        ctx.fill();
      }
    }
    if (alive) requestAnimationFrame(animBurst);
  }
  animBurst();
}

initParticles();

// ============ 导航 ============
function nextPuzzle() {
  loadPuzzle(1);
  playNextSound();  // 切换音效
  showScreen('screen-game');
}

function backToMenu() {
  updateUnlockBadge();
  showScreen('screen-welcome');
}

function confirmQuit() {
  if (state.questions.length > 0 && !state.won && !state.givenUp) {
    if (confirm('确定要退出吗？进度将丢失。')) backToMenu();
  } else {
    backToMenu();
  }
}

// ============ 键盘事件 ============
document.addEventListener('keydown', function (e) {
  const gs = document.getElementById('screen-game');
  if (!gs.classList.contains('hidden')) {
    const inp = document.getElementById('q-input');
    if (e.key === 'Enter' && document.activeElement === inp) {
      e.preventDefault();
      askQuestion();
    }
  }
});

// ============ 新手引导 ============
let tutStep = 0;

function showTutorial() {
  tutStep = 0;
  document.getElementById('tutorial').style.display = 'flex';
  updateTutStep();
}

function hideTutorial() {
  document.getElementById('tutorial').style.display = 'none';
}

function updateTutStep() {
  const steps = document.querySelectorAll('#tutorial .tut-step');
  const dots = document.querySelectorAll('#tutorial .tut-dot');
  steps.forEach((s, i) => s.classList.toggle('active', i === tutStep));
  dots.forEach((d, i) => d.classList.toggle('active', i === tutStep));
}

function tutorialNext() {
  tutStep++;
  if (tutStep >= 3) {
    tutorialFinish();
  } else {
    updateTutStep();
  }
}

function tutorialSkip() {
  hideTutorial();
  localStorage.setItem('guimiju_tutorial_done', '1');
}

function tutorialFinish() {
  hideTutorial();
  localStorage.setItem('guimiju_tutorial_done', '1');
}

// ============ AI 定制谜题 ============
let genLoading = false;

async function showGenScreen() {
  playClick();
  showScreen('screen-gen');
}

async function doGenPuzzle() {
  if (genLoading) return;

  const keywords = document.getElementById('gen-keywords')?.value?.trim();
  const type = document.getElementById('gen-type')?.value || 'classic';
  const style = document.getElementById('gen-style')?.value || 'twist';
  const difficulty = document.getElementById('gen-difficulty')?.value || 'medium';

  if (!keywords) {
    showToast('请输入关键词描述');
    return;
  }

  genLoading = true;
  const btn = document.getElementById('btn-gen-submit');
  const status = document.getElementById('gen-status');
  if (btn) { btn.disabled = true; btn.textContent = '生成中...'; }
  if (status) status.textContent = '⏳ AI 正在创作谜题，请稍候...';

  try {
    if (!loginReady || !app) {
      await initCloudbase();
    }

    const res = await app.callFunction({
      name: 'genPuzzle',
      data: { keywords, type, style, difficulty }
    });

    const data = res.result;
    if (data && data.ok && data.puzzle) {
      const p = data.puzzle;
      // 构建临时谜题对象
      const customPuzzle = {
        id: -1,
        type: p.type || 'twist',
        level: difficulty,
        title: p.title,
        riddle: p.riddle,
        answer: p.answer,
        hints: p.hints || ['仔细阅读谜题', '换个角度思考', '注意时间线']
      };

      // 直接开始游戏
      state.current = customPuzzle;
      state.questions = [];
      state.won = false;
      state.givenUp = false;
      showScreen('screen-game');
      setupGameUI();
      showToast('AI 已为你定制专属谜题！', 'success');
    } else {
      if (status) status.textContent = '❌ ' + (data?.error || '生成失败，请重试');
      showToast(data?.error || 'AI 生成失败，请稍后重试', 'error');
    }
  } catch (err) {
    console.error('genPuzzle error:', err);
    if (status) status.textContent = '❌ 网络错误，请重试';
    showToast('网络错误，请稍后重试', 'error');
  } finally {
    genLoading = false;
    if (btn) { btn.disabled = false; btn.textContent = '🤖 开始生成'; }
  }
}

function backToMenuFromGen() {
  showScreen('screen-menu');
}

// ============ V2 预览入口 ============
function showV2Preview() {
  playClick();
  showToast('👥 多人联机版正在开发中，敬请期待！', 'info');
}


// ============ 启动 ============
initGame();

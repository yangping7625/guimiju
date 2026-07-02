// ================================================================
// 诡谜局 V2 · 应用主入口
// CloudBase 初始化 + 全局状态 + 页面路由 + 云函数调用封装
// ================================================================

const V2App = {
  // ===== CloudBase =====
  app: null,
  loginReady: false,
  CLOUDBASE_ENV_ID: 'ai-native-d6gdsx2agc8c46199',

  // ===== 当前用户 =====
  user: {
    id: null,
    name: '玩家',
    avatar: '🕵️',
    gender: 'male',   // 'male' | 'female' — 影响角色立绘显示
    unlocked: false,   // V2 完整版是否已通过兑换码解锁
    v1Unlocked: false, // V1 付费状态（已解锁90题）
    equippedCharacter: null,  // { characterId, skinId, name, emoji }
    isGm: false,     // 是否为内测管理员账号
    loginType: null  // 'anonymous' | 'password'
  },

  // GM 账号自动解锁
  GM_ACCOUNTS: {
    'gmadmin': '内测管理员'
  },

  // ===== 页面 =====
  currentPage: 'lobby',
  useMock: false,  // 联调阶段使用真实云函数

  // ===== Toast =====
  toastTimer: null,

  // ===== 忘记密码状态 =====
  resetPwdState: null,   // { email, updateUser, resetLinkSent }
  resetPwdCooldown: 0,

  // ================================================================
  // 初始化
  // ================================================================
  async init() {
    console.log('V2 初始化中...');
    try {
      // 1. CloudBase 初始化
      await this.initCloudbase();
      // 2. 恢复本地存储的用户设置
      this.restoreLocalSettings();
      // 3. 加载用户数据
      await this.loadUserData();
      // 4. 渲染用户信息
      this.renderUserBar();
      // 5. 获取在线人数
      this.updateOnlineCount();
      // 6. 首次访问弹窗（性别+昵称）
      this.checkFirstVisit();
      // 7. 显示大厅
      this.showPage('lobby');
      console.log('V2 初始化完成', this.user.id ? `uid=${this.user.id}` : '(mock模式)');
    } catch (e) {
      console.error('V2 初始化失败:', e);
      this.toast('初始化失败，请刷新重试', 'error');
    }
  },

  // ================================================================
  // CloudBase 初始化 + 登录态管理
  // 优先级：已保存的密码登录会话 > 匿名登录
  // ================================================================
  async initCloudbase() {
    if (typeof cloudbase === 'undefined') {
      console.warn('CloudBase SDK 未加载，使用 mock 模式');
      this.useMock = true;
      return;
    }
    try {
      this.app = cloudbase.init({ env: this.CLOUDBASE_ENV_ID });
      const auth = this.app.auth;

      // 1. 检查是否有已保存的登录会话
      const { data: sessionData } = await auth.getSession();
      if (sessionData && sessionData.session && sessionData.session.user) {
        const u = sessionData.session.user;
        this.loginReady = true;
        this.user.id = u.id;
        this.user.name = u.user_metadata?.username || u.user_metadata?.name || '玩家';
        this.user.loginType = u.is_anonymous ? 'anonymous' : 'password';
        this.user.isGm = this.checkIsGm(u.user_metadata?.username || '');
        console.log('CloudBase 已有登录会话, uid:', this.user.id, 'loginType:', this.user.loginType);
        return;
      }

      // 2. 检查是否保存了密码登录凭据（localStorage）
      const savedCreds = this.getSavedCredentials();
      if (savedCreds) {
        const isEmail = savedCreds.username.includes('@');
        const params = isEmail
          ? { email: savedCreds.username, password: savedCreds.password }
          : { username: savedCreds.username, password: savedCreds.password };
        const { data, error } = await auth.signInWithPassword(params);
        if (!error && data && data.user) {
          this.loginReady = true;
          this.user.id = data.user.id;
          this.user.name = data.user.user_metadata?.username || savedCreds.username;
          this.user.loginType = 'password';
          this.user.isGm = this.checkIsGm(savedCreds.username);
          console.log('CloudBase 自动密码登录成功, uid:', this.user.id);
          return;
        }
        // 密码登录失败，清除过期凭据
        console.warn('自动密码登录失败，清除凭据:', error?.message);
        this.clearSavedCredentials();
      }

      // 3. 降级为匿名登录
      const { data: anonData, error: anonError } = await auth.signInAnonymously();
      if (anonError) throw new Error(anonError.message);
      this.loginReady = true;
      this.user.id = anonData.user?.id || 'anonymous';
      this.user.loginType = 'anonymous';
      this.user.isGm = false;
      console.log('CloudBase 匿名登录成功, uid:', this.user.id);
    } catch (e) {
      console.warn('CloudBase 初始化失败，回退 mock 模式:', e.message);
      this.useMock = true;
    }
  },

  // ================================================================
  // 用户名密码登录
  // ================================================================
  async loginWithPassword(username, password) {
    if (!this.app) return { ok: false, error: 'CloudBase 未初始化' };
    const auth = this.app.auth;
    const isEmail = username.includes('@');
    const params = isEmail ? { email: username, password } : { username, password };
    const { data, error } = await auth.signInWithPassword(params);
    if (error) {
      return { ok: false, error: error.message || '登录失败，请检查用户名和密码' };
    }
    if (!data || !data.user) {
      return { ok: false, error: '登录失败，未获取到用户信息' };
    }
    // 保存凭据
    this.saveCredentials(username, password);
    // 更新用户状态
    this.user.id = data.user.id;
    this.user.name = data.user.user_metadata?.username || username;
    this.user.loginType = 'password';
    this.user.isGm = this.checkIsGm(username);
    this.loginReady = true;
    console.log('密码登录成功, uid:', this.user.id, 'isGm:', this.user.isGm);
    return { ok: true };
  },

  // ================================================================
  // 退出登录（回到匿名）
  // ================================================================
  async logout() {
    if (!this.app) return;
    const auth = this.app.auth;
    try {
      await auth.signOut();
    } catch (e) { /* ignore */ }
    this.clearSavedCredentials();
    // 重新匿名登录
    const { data, error } = await auth.signInAnonymously();
    if (!error && data && data.user) {
      this.user.id = data.user.id;
    }
    this.user.name = '玩家';
    this.user.loginType = 'anonymous';
    this.user.isGm = false;
    this.user.unlocked = false;
    this.user.v1Unlocked = false;
    this.user.equippedCharacter = null;
    this.renderUserBar();
    console.log('已退出登录，回到匿名模式');
  },

  // ================================================================
  // 注册新用户
  // ================================================================
  async signUp(username, password) {
    if (!this.app) return { ok: false, error: 'CloudBase 未初始化' };
    const auth = this.app.auth;
    const { data, error } = await auth.signUp({
      username,
      password,
      nickname: username
    });
    if (error) {
      return { ok: false, error: error.message || '注册失败' };
    }
    // 注册成功后自动登录
    return await this.loginWithPassword(username, password);
  },

  // ================================================================
  // 凭据管理（localStorage）
  // ================================================================
  saveCredentials(username, password) {
    try {
      localStorage.setItem('guimiju_v2_cred', JSON.stringify({ username, password }));
    } catch (e) { /* ignore */ }
  },
  getSavedCredentials() {
    try {
      const raw = localStorage.getItem('guimiju_v2_cred');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  clearSavedCredentials() {
    try {
      localStorage.removeItem('guimiju_v2_cred');
    } catch (e) { /* ignore */ }
  },

  // ================================================================
  // 检查是否为内测账号
  // ================================================================
  checkIsGm(username) {
    return username && Object.keys(this.GM_ACCOUNTS).includes(username.toLowerCase());
  },

  getGmDisplayName(username) {
    return this.GM_ACCOUNTS[username?.toLowerCase()] || '内测用户';
  },

  // ================================================================
  // 加载用户数据
  // ================================================================
  async loadUserData() {
    try {
      // 内测账号自动解锁
      if (this.user.isGm) {
        this.user.v1Unlocked = true; // GM 默认已解锁 V1
        this.user.unlocked = true;   // GM 默认已解锁 V2
        const charRes = await this.callFn('characterManager', { action: 'getMyCharacters' });
        const charData = charRes.data || charRes;
        if (charData && charData.characters) {
          const equipped = charData.characters.find(c => c.isEquipped);
          if (equipped) {
            this.user.equippedCharacter = {
              characterId: equipped.characterId,
              skinId: equipped.skinId || 'default',
              name: equipped.name,
              emoji: equipped.emoji || '🕵️'
            };
            this.user.avatar = equipped.emoji || '🕵️';
          }
        }
        return;
      }

      const charRes = await this.callFn('characterManager', { action: 'getMyCharacters' });
      // 兼容真实云函数返回 { code: 0, data: { characters, equippedId } } 和 mock 返回
      const charData = charRes.data || charRes;
      if (charData && charData.characters) {
        const equipped = charData.characters.find(c => c.isEquipped);
        if (equipped) {
          this.user.equippedCharacter = {
            characterId: equipped.characterId,
            skinId: equipped.skinId || 'default',
            name: equipped.name,
            emoji: equipped.emoji || '🕵️'
          };
          this.user.avatar = equipped.emoji || '🕵️';
        }
      }
      // 检查解锁状态（V1/V2 统一使用 unlock_all_90）
      try {
        if (this.app) {
          const db = this.app.database();
          const unlockRes = await db.collection('user_unlocks')
            .where({ productId: 'unlock_all_90' })
            .limit(1)
            .get();
          this.user.unlocked = !!(unlockRes.data && unlockRes.data.length > 0);
          // GM 账号始终解锁
          if (this.user.isGm) {
            this.user.unlocked = true;
          }
          if (this.user.unlocked) {
            console.log('✅ V2 内容已解锁');
          }
        }
      } catch (e) {
        console.warn('检查解锁状态失败:', e.message);
      }

      // 用已装备角色更新大厅立绘
      if (this.user.equippedCharacter) {
        const portraitUrl = this.user.equippedCharacter.portraitUrl
          || this.getPortraitForCharacter(this.user.equippedCharacter.characterId);
        if (portraitUrl) {
          this.user.equippedCharacter.portraitUrl = portraitUrl;
          this.updateLobbyHero(portraitUrl);
        }
      }
    } catch (e) {
      console.warn('加载用户数据失败（使用默认值）:', e.message);
    }
  },

  // ================================================================
  // 云函数调用（统一封装）
  // GM 内测账号的购买/抽卡操作直接模拟成功，不扣款
  // ================================================================
  async callFn(functionName, data, retries = 2) {
    if (this.useMock && typeof MockAPI !== 'undefined') {
      // Mock 模式
      const mockFn = MockAPI[functionName];
      if (mockFn) {
        return mockFn.call(MockAPI, data.action || '', data);
      }
      return { code: -1, message: 'Mock API 未实现: ' + functionName };
    }

    // GM 账号拦截：抽卡操作直接返回成功（免费抽卡加速）
    if (this.user.isGm && functionName === 'characterManager') {
      if (data.action === 'gacha') {
        return { code: 0, data: { success: true, gmSkip: true } };
      }
    }

    // 真实调用
    if (!this.loginReady || !this.app) {
      throw new Error('CloudBase 未初始化');
    }
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.app.callFunction({ name: functionName, data });
        const res = result.result;
        if (res && res.code === -1) {
          this.toast(res.message || '操作失败', 'error');
          return res;
        }
        return res;
      } catch (e) {
        lastError = e;
        if (attempt < retries) {
          console.warn(`callFn(${functionName}) 第${attempt + 1}次失败，${attempt + 1 < retries ? '重试中...' : '已达上限'}:`, e.message);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    console.error(`callFn(${functionName}) 最终失败:`, lastError);
    this.toast('网络异常，请稍后重试', 'error');
    return { code: -1, message: '网络异常' };
  },

  // ================================================================
  // 页面路由
  // ================================================================
  showPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    // 显示目标页面
    const target = document.getElementById('page-' + pageId);
    if (target) {
      target.classList.remove('hidden');
      // 触发页面入场动画
      target.style.animation = 'none';
      target.offsetHeight; // 强制回流
      target.style.animation = 'fadeIn .4s ease-out';
    }
    // 更新 Tab 高亮
    document.querySelectorAll('.tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.page === pageId);
    });
    this.currentPage = pageId;

    // 切换到角色/商店页时自动刷新数据
    if (pageId === 'character' && typeof CharacterUI !== 'undefined') {
      CharacterUI.init();
    }
    if (pageId === 'shop' && typeof ShopUI !== 'undefined') {
      ShopUI.init();
    }

    // Tab 栏显示控制（room 页面不显示 tab）
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
      tabBar.style.display = pageId === 'room' ? 'none' : 'flex';
    }
  },

  // ================================================================
  // 渲染用户信息栏
  // ================================================================
  renderUserBar() {
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    const gmBadge = document.getElementById('gm-badge');
    const subtitle = document.getElementById('user-subtitle');

    if (nameEl) {
      nameEl.innerHTML = this.user.name +
        (this.user.isGm ? ' <span style="background:var(--gold);color:#1a1005;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:4px;vertical-align:middle;">GM</span>' : '') +
        (this.user.unlocked ? '' : ' <span style="background:var(--crimson-bright);color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:4px;vertical-align:middle;">未解锁</span>');
    }
    if (avatarEl) {
      if (this.user.equippedCharacter && this.user.equippedCharacter.portraitUrl) {
        avatarEl.innerHTML = `<img src="${this.user.equippedCharacter.portraitUrl}" alt="${this.user.equippedCharacter.name}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;">`;
      } else {
        avatarEl.textContent = this.user.avatar;
      }
    }
    if (gmBadge) gmBadge.style.display = this.user.isGm ? '' : 'none';
    if (subtitle) {
      subtitle.textContent = this.user.isGm ? '内测管理员' :
        (this.user.unlocked ? '完整版 · 数据云同步' : '免费体验 · 输入兑换码解锁完整版');
    }

    // 更新登录按钮图标
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) {
      loginBtn.textContent = this.user.loginType === 'password' ? '👤' : '🔑';
      loginBtn.title = this.user.loginType === 'password' ? '账号信息 · ' + this.user.name : '登录账号';
    }
  },

  // ================================================================
  // 兑换码解锁
  // ================================================================
  async redeemCode(code) {
    try {
      const res = await this.callFn('handlePayment', { action: 'redeemCode', code });
      if (res && res.code === 0 && res.data && res.data.valid) {
        this.user.unlocked = true;
        this.renderUserBar();
        this.toast('🎉 兑换成功！完整版已解锁', 'success');
        return true;
      }
      this.toast(res?.message || res?.data?.message || '兑换码无效', 'error');
      return false;
    } catch (e) {
      this.toast('兑换失败: ' + e.message, 'error');
      return false;
    }
  },

  // ================================================================
  // 刷新解锁状态（供其他模块调用）
  // ================================================================
  async refreshUnlockStatus() {
    await this.loadUserData();
    this.renderUserBar();
  },

  // ================================================================
  // Toast 提示
  // ================================================================
  toast(msg, type = 'info') {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    clearTimeout(this.toastTimer);
    el.textContent = msg;
    el.className = 'toast ' + type;
    el.offsetHeight;
    el.classList.add('show');
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  },

  // ================================================================
  // Modal
  // ================================================================
  showModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
  },
  hideModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  },

  // ================================================================
  // 格式化时间
  // ================================================================
  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  },

  // ================================================================
  // 恢复本地存储的用户设置
  // ================================================================
  restoreLocalSettings() {
    const savedName = localStorage.getItem('guimiju_v2_name');
    if (savedName) this.user.name = savedName;
    const savedGender = localStorage.getItem('guimiju_v2_gender');
    if (savedGender === 'male' || savedGender === 'female') {
      this.user.gender = savedGender;
    }
  },

  // ================================================================
  // 首次访问检查（弹窗选择性别+昵称）
  // ================================================================
  checkFirstVisit() {
    const hasVisited = localStorage.getItem('guimiju_v2_visited');
    if (!hasVisited) {
      // 首次访问，弹出欢迎弹窗
      setTimeout(() => this.showModal('modal-welcome'), 600);
    }
  },

  // ================================================================
  // 完成首次设置（保存性别+昵称）
  // =================================================---------------
  completeFirstSetup() {
    const gender = document.querySelector('#modal-welcome .gender-btn.selected')?.dataset.gender || 'male';
    const nameInput = document.getElementById('input-welcome-name');
    const name = nameInput ? nameInput.value.trim() : '';

    this.user.gender = gender;
    localStorage.setItem('guimiju_v2_gender', gender);

    if (name && name.length > 0 && name.length <= 8) {
      this.user.name = name;
      localStorage.setItem('guimiju_v2_name', name);
    }

    // 更新默认头像（根据性别）
    this.user.avatar = gender === 'female' ? '🕵️‍♀️' : '🕵️';

    localStorage.setItem('guimiju_v2_visited', '1');
    this.hideModal('modal-welcome');
    this.renderUserBar();
    this.toast('欢迎来到诡谜局！', 'success');

    // 重新加载角色数据以匹配性别
    if (typeof CharacterUI !== 'undefined') {
      CharacterUI.init();
    }
  },

  // ================================================================
  // 切换性别（随时可用）
  // ================================================================
  setGender(gender) {
    if (gender !== 'male' && gender !== 'female') return;
    this.user.gender = gender;
    localStorage.setItem('guimiju_v2_gender', gender);
    this.user.avatar = gender === 'female' ? '🕵️‍♀️' : '🕵️';
    this.renderUserBar();
    this.toast(gender === 'female' ? '已切换为女性形象' : '已切换为男性形象');

    // 刷新角色页以更新立绘
    if (typeof CharacterUI !== 'undefined' && this.currentPage === 'character') {
      CharacterUI.init();
    }
  },

  // ================================================================
  // 获取当前角色的立绘 URL（根据用户性别）
  // ================================================================
  getPortraitForCharacter(characterId) {
    if (typeof parseCharacterId === 'undefined' || typeof getPortraitUrl === 'undefined') {
      return 'assets/char-detective.png';
    }
    const { baseKey, gender } = parseCharacterId(characterId);
    // 优先使用角色自带的性别标识，fallback 到用户选择的性别
    return getPortraitUrl(baseKey, gender || this.user.gender);
  },

  // ================================================================
  // 更新大厅主立绘（英雄区角色大图）
  // ================================================================
  updateLobbyHero(portraitUrl) {
    const img = document.getElementById('lobby-hero-img');
    if (img && portraitUrl) {
      img.src = portraitUrl;
      img.alt = this.user.equippedCharacter?.name || '角色';
      img.style.animation = 'none';
      img.offsetHeight; // reflow
      img.style.animation = 'popIn .4s var(--ease-spring)';
    }
    // 同时更新顶部头像
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl && portraitUrl && this.user.equippedCharacter) {
      avatarEl.innerHTML = `<img src="${portraitUrl}" alt="${this.user.equippedCharacter.name}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;">`;
    }
  },

  // ================================================================
  // 设置昵称
  // ================================================================
  async setPlayerName(name) {
    if (!name || name.trim().length === 0 || name.length > 8) {
      this.toast('昵称需要 1-8 个字符', 'error');
      return false;
    }
    await this.callFn('roomManager', { action: 'setPlayerName', name: name.trim() });
    this.user.name = name.trim();
    this.renderUserBar();
    localStorage.setItem('guimiju_v2_name', name.trim());
    this.toast('昵称已更新');
    return true;
  },

  // ================================================================
  // 页面跳转辅助
  // ================================================================
  goToRoom(roomId) {
    // 进入房间页面，把 roomId 传给 room-game.js
    if (typeof RoomGame !== 'undefined') {
      RoomGame.enterRoom(roomId);
    }
    this.showPage('room');
  },

  goToResult(data) {
    // 进入结算页面
    if (typeof ResultPage !== 'undefined') {
      ResultPage.show(data);
    }
    this.showPage('result');
  },

  // ================================================================
  // 在线人数（从活跃房间数估算）
  // ================================================================
  async updateOnlineCount() {
    const el = document.getElementById('online-count');
    if (!el) return;
    try {
      const res = await this.callFn('roomManager', { action: 'getOnlineCount' });
      if (res && res.code === 0 && res.data) {
        el.textContent = res.data.count.toLocaleString() + ' 人在线';
      }
    } catch (e) { /* 静默 */ }
  },

  // ================================================================
  // 错误翻译
  // ================================================================
  ERROR_CN: {
    'provider email not found from endpoint': '邮箱登录服务未配置，请联系管理员',
    'You must provide either an email or phone number': '请填写邮箱地址',
    'user not found': '用户不存在',
    'user already registered': '该邮箱已注册',
    'password must be at least 6 characters': '密码至少6位',
    'invalid refresh token': '登录已过期，请重新登录',
    'Email rate limit exceeded': '发送太频繁，请稍后再试',
    'Email not confirmed': '邮箱未验证，请检查邮箱',
    'duplicate key value violates unique constraint': '该用户名已被注册',
    'An account with this email already exists': '该邮箱已注册',
    'An account with this username already exists': '该用户名已被注册',
    'invalid credentials': '邮箱或密码错误',
    'invalid login credentials': '邮箱或密码错误',
  },
  transErr(msg) {
    if (!msg) return '操作失败';
    const str = String(msg).toLowerCase();
    for (const [key, val] of Object.entries(this.ERROR_CN)) {
      if (str.includes(key.toLowerCase())) return val;
    }
    return String(msg);
  },

  // ================================================================
  // 服务条款 & 隐私政策
  // ================================================================
  TERMS_CONTENT: {
    privacy: {
      title: '📜 隐私政策',
      body: `<p><strong>生效日期：</strong>2026年6月29日</p>
<p><strong>诡谜局</strong>（以下简称"我们"）深知个人信息对您的重要性，我们将按法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。</p>
<p><strong>一、我们收集的信息</strong></p>
<p>1. 账号信息：当您注册账号时，我们收集您的<strong>邮箱地址</strong>和<strong>用户名</strong>，用于创建和管理您的账号。</p>
<p>2. 游戏数据：我们收集您的<strong>游戏进度</strong>（已解锁谜题、提问记录、角色数据、好友关系、战绩），用于提供游戏服务和改善体验。</p>
<p>3. 本地存储：我们使用浏览器 localStorage 在您的设备上保存<strong>游戏进度</strong>、<strong>音效设置</strong>和<strong>登录凭据</strong>，以便您下次访问时恢复游戏状态。</p>
<p>4. 多人联机数据：V2 多人模式会收集您的<strong>房间记录</strong>、<strong>聊天内容</strong>和<strong>游戏结果</strong>，用于匹配和结算。</p>
<p><strong>二、信息的使用</strong></p>
<p>1. 提供游戏服务：保存您的游戏进度，支持跨设备同步。</p>
<p>2. 多人匹配：根据您的游戏数据匹配合适的对手。</p>
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
<p>1. 诡谜局是一款 AI 驱动的推理游戏，V1 为单人版，V2 为多人联机版。玩家通过向 AI 提问来推理谜题真相。</p>
<p>2. 完整版功能（多人联机、角色收集等）需通过兑换码解锁。</p>
<p><strong>二、用户义务</strong></p>
<p>1. 您承诺不利用本服务从事违法活动，包括但不限于：发布违法信息、侵犯他人权益、干扰服务正常运行。</p>
<p>2. 多人房间中请文明交流，禁止辱骂、骚扰、发布不当内容。违规者将被封禁。</p>
<p>3. 您应妥善保管账号信息，因账号泄露导致的损失由您自行承担。</p>
<p><strong>三、免责声明</strong></p>
<p>1. AI 回答内容由 DeepSeek 等第三方模型生成，我们不保证其完全准确。</p>
<p>2. 因不可抗力导致的服务中断，我们不承担责任。</p>
<p><strong>四、协议修改</strong></p>
<p>我们有权适时修改本协议，修改后的协议将在页面公示后生效。</p>
<p><strong>五、未成年人</strong></p>
<p>本游戏建议16周岁以上用户使用。未成年人应在监护人指导下使用本服务。</p>
<p><strong>六、适用法律</strong></p>
<p>本协议适用中华人民共和国法律。</p>`
    }
  },
  showTerms(type) {
    const content = this.TERMS_CONTENT[type];
    if (!content) return;
    document.getElementById('terms-title').textContent = content.title;
    document.getElementById('terms-body').innerHTML = content.body;
    this.showModal('modal-terms');
  },
  hideTermsModal() {
    this.hideModal('modal-terms');
  },

  // ================================================================
  // 忘记密码
  // ================================================================
  showForgotPwdModal() {
    this.hideModal('modal-login');
    this.resetPwdState = null;
    this.resetPwdCooldown = 0;
    document.getElementById('v2-resetpwd-step1').style.display = 'block';
    document.getElementById('v2-resetpwd-step2').style.display = 'none';
    document.getElementById('v2-resetpwd-actions-step1').style.display = 'flex';
    document.getElementById('v2-resetpwd-actions-step2').style.display = 'none';
    document.getElementById('v2-resetpwd-error').textContent = '';
    document.getElementById('v2-resetpwd-success').style.display = 'none';
    document.getElementById('v2-resetpwd-email').value = '';
    document.getElementById('v2-resetpwd-code').value = '';
    document.getElementById('v2-resetpwd-newpwd').value = '';
    const btn = document.getElementById('btn-v2-resetpwd-submit');
    btn.disabled = false;
    btn.textContent = '发送验证码';
    this.showModal('modal-v2-resetpwd');
  },
  hideForgotPwdModal() {
    this.hideModal('modal-v2-resetpwd');
  },
  async handleForgotPassword() {
    const email = document.getElementById('v2-resetpwd-email').value.trim();
    const errEl = document.getElementById('v2-resetpwd-error');
    const succEl = document.getElementById('v2-resetpwd-success');
    errEl.textContent = '';
    succEl.style.display = 'none';
    if (!email || !String(email).includes('@')) { errEl.textContent = '请输入有效邮箱'; return; }
    if (this.resetPwdCooldown > 0) { errEl.textContent = '请 ' + this.resetPwdCooldown + ' 秒后再试'; return; }

    const btn = document.getElementById('btn-v2-resetpwd-submit');
    btn.disabled = true; btn.textContent = '发送中...';

    try {
      if (!this.app || !this.app.auth) {
        await this.initCloudbase();
        if (!this.app || !this.app.auth) throw new Error('服务未就绪');
      }
      const result = await this.app.auth.sendPasswordResetEmail(email);
      const error = result && result.error ? result.error : null;
      if (error) {
        errEl.textContent = this.transErr(error.message) || '发送失败，请检查邮箱是否正确';
        btn.disabled = false; btn.textContent = '发送验证码';
        return;
      }
      const data = result && result.data ? result.data : (result && !result.error ? result : null);
      if (data && typeof data.updateUser === 'function') {
        this.resetPwdState = { email, updateUser: data.updateUser };
      } else {
        this.resetPwdState = { email, updateUser: null, resetLinkSent: true };
      }
      this.resetPwdCooldown = 60;
      btn.textContent = this.resetPwdCooldown + 's';
      const self = this;
      const timer = setInterval(() => {
        self.resetPwdCooldown--;
        btn.textContent = self.resetPwdCooldown > 0 ? self.resetPwdCooldown + 's' : '重新发送';
        if (self.resetPwdCooldown <= 0) { clearInterval(timer); btn.disabled = false; }
      }, 1000);
      document.getElementById('v2-resetpwd-step1').style.display = 'none';
      document.getElementById('v2-resetpwd-actions-step1').style.display = 'none';
      document.getElementById('v2-resetpwd-step2').style.display = 'block';
      document.getElementById('v2-resetpwd-actions-step2').style.display = 'flex';
      succEl.style.display = 'block';
      succEl.textContent = '✅ 验证码已发送至 ' + email + '，请输入邮件中的6位验证码并设置新密码。';
    } catch (e) {
      console.error('重置密码异常:', e);
      const errMsg = (e && e.message) ? String(e.message) : String(e || '');
      errEl.textContent = this.transErr(errMsg) || '发送失败，请稍后重试';
      btn.disabled = false; btn.textContent = '发送验证码';
    }
  },
  async handleForgotPwdConfirm() {
    const code = document.getElementById('v2-resetpwd-code').value.trim();
    const newPwd = document.getElementById('v2-resetpwd-newpwd').value;
    const errEl = document.getElementById('v2-resetpwd-error2');
    const succEl = document.getElementById('v2-resetpwd-success2');
    errEl.style.display = 'none'; errEl.textContent = '';
    succEl.style.display = 'none';

    if (this.resetPwdState && this.resetPwdState.resetLinkSent) {
      succEl.style.display = 'block';
      succEl.textContent = '请查收邮件中的重置链接，点击链接即可设置新密码。';
      return;
    }
    if (!code || code.length !== 6) { errEl.textContent = '请输入6位验证码'; errEl.style.display = 'block'; return; }
    if (!newPwd || newPwd.length < 6) { errEl.textContent = '新密码至少6位'; errEl.style.display = 'block'; return; }
    if (!this.resetPwdState || typeof this.resetPwdState.updateUser !== 'function') {
      errEl.textContent = '请先发送验证码'; errEl.style.display = 'block'; return;
    }
    const btn = document.getElementById('btn-v2-resetpwd-confirm');
    btn.disabled = true; btn.textContent = '重置中...';
    try {
      const result = await this.resetPwdState.updateUser({ nonce: code, password: newPwd });
      const updateError = (result && result.error) ? result.error : null;
      if (updateError) {
        errEl.textContent = this.transErr(updateError.message) || '验证码错误或重置失败';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = '确认重置';
        return;
      }
      this.saveCredentials(this.resetPwdState.email, newPwd);
      succEl.style.display = 'block';
      succEl.textContent = '✅ 密码重置成功！3秒后返回登录页...';
      btn.textContent = '已重置';
      this.resetPwdState = null;
      setTimeout(() => {
        this.hideForgotPwdModal();
        updateLoginStatusText();
        this.showModal('modal-login');
      }, 3000);
    } catch (e) {
      console.error('重置密码确认异常:', e);
      const errMsg = (e && e.message) ? String(e.message) : String(e || '');
      errEl.textContent = this.transErr(errMsg) || '重置失败，请稍后重试';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = '确认重置';
    }
  },

  // ================================================================
  // 修改密码（已登录）
  // ================================================================
  showChangePwdModal() {
    document.getElementById('v2-changepwd-old').value = '';
    document.getElementById('v2-changepwd-new').value = '';
    document.getElementById('v2-changepwd-new2').value = '';
    document.getElementById('v2-changepwd-error').textContent = '';
    document.getElementById('v2-changepwd-success').style.display = 'none';
    this.showModal('modal-v2-changepwd');
  },
  hideChangePwdModal() {
    this.hideModal('modal-v2-changepwd');
  },
  async handleChangePassword() {
    const oldPwd = document.getElementById('v2-changepwd-old').value;
    const newPwd = document.getElementById('v2-changepwd-new').value;
    const newPwd2 = document.getElementById('v2-changepwd-new2').value;
    const errEl = document.getElementById('v2-changepwd-error');
    const succEl = document.getElementById('v2-changepwd-success');
    errEl.textContent = ''; succEl.style.display = 'none';
    if (!oldPwd) { errEl.textContent = '请输入当前密码'; return; }
    if (!newPwd || newPwd.length < 6) { errEl.textContent = '新密码至少6位'; return; }
    if (newPwd !== newPwd2) { errEl.textContent = '两次输入的新密码不一致'; return; }

    const btn = document.getElementById('btn-v2-changepwd-submit');
    btn.disabled = true; btn.textContent = '修改中...';
    try {
      if (!this.app || !this.app.auth) {
        await this.initCloudbase();
        if (!this.app || !this.app.auth) throw new Error('服务未就绪');
      }
      const { error } = await this.app.auth.resetPasswordForOld({
        old_password: oldPwd, new_password: newPwd
      });
      if (error) {
        errEl.textContent = this.transErr(error.message) || '修改失败，请检查当前密码是否正确';
        btn.disabled = false; btn.textContent = '确认修改';
        return;
      }
      this.saveCredentials(this.user.name, newPwd);
      succEl.style.display = 'block';
      succEl.textContent = '✅ 密码修改成功！';
      btn.textContent = '已修改';
      setTimeout(() => {
        this.hideChangePwdModal();
        showAccountModal();
      }, 2000);
    } catch (e) {
      console.error('修改密码异常:', e);
      const errMsg = (e && e.message) ? String(e.message) : String(e || '');
      errEl.textContent = this.transErr(errMsg) || '修改失败，请稍后重试';
      btn.disabled = false; btn.textContent = '确认修改';
    }
  }
};

// ================================================================
// 启动
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Tab 点击
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      const page = tab.dataset.page;
      if (page) V2App.showPage(page);
    });
  });

  // 初始化
  V2App._initPromise = V2App.init();
});

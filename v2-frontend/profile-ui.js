// ================================================================
// 诡谜局 V2 · 个人主页 — Profile UI
// 战绩统计 / 成就 / 设置
// ================================================================

const ProfileUI = {
  state: {
    totalGames: 0,
    wins: 0,
    totalScore: 0,
    rank: '青铜侦探',
    rankIcon: '🔍',
    achievements: [],
    settings: {
      bgTheme: 'theme_default',
      soundEnabled: true,
      particleEnabled: true
    }
  },

  // ================================================================
  // 初始化
  // ================================================================
  async init() {
    // 默认 mock 数据（后端无数据时的 fallback）
    this.state = {
      totalGames: 0,
      wins: 0,
      totalScore: 0,
      rank: '青铜侦探',
      rankIcon: '🔍',
      rankProgress: 0,
      nextRank: '白银侦探',
      achievements: [
        { id: 'a1', name: '初来乍到', desc: '完成第一局游戏', icon: '🌟', done: false },
        { id: 'a2', name: '真相大白', desc: '首次猜对谜题', icon: '🎯', done: false },
        { id: 'a3', name: '神探降临', desc: '获得 S 评级', icon: '🏆', done: false },
        { id: 'a4', name: '社交推理', desc: '参与 10 局多人游戏', icon: '🤝', done: false },
        { id: 'a5', name: '话痨侦探', desc: '单局提问 20 次', icon: '💬', done: false },
        { id: 'a6', name: '速战速决', desc: '3 分钟内猜出真相', icon: '⚡', done: false },
        { id: 'a7', name: '收藏家', desc: '收集 5 个角色', icon: '🎭', done: false },
        { id: 'a8', name: '百战老将', desc: '完成 100 局游戏', icon: '🎖️', done: false }
      ],
      settings: {
        bgTheme: 'theme_default',
        soundEnabled: true,
        particleEnabled: true
      }
    };

    // 从后端加载真实数据
    try {
      const res = await V2App.callFn('characterManager', { action: 'getProfile' });
      if (res && res.code === 0 && res.data) {
        const d = res.data;
        this.state.totalGames = d.totalGames || 0;
        this.state.wins = d.wins || 0;
        this.state.totalScore = d.totalScore || 0;
        // 根据胜场计算段位
        const rankInfo = this.calcRank(d.wins || 0, d.totalScore || 0);
        this.state.rank = rankInfo.rank;
        this.state.rankIcon = rankInfo.icon;
        this.state.rankProgress = rankInfo.progress;
        this.state.nextRank = rankInfo.nextRank;
        // 更新成就
        if (d.achievements && Array.isArray(d.achievements)) {
          this.state.achievements.forEach(a => {
            a.done = d.achievements.includes(a.id);
          });
        }
      }
    } catch (e) {
      console.warn('加载个人数据失败（使用默认值）:', e.message);
    }

    // 加载设置
    const savedSound = localStorage.getItem('guimiju_v2_sound');
    const savedParticles = localStorage.getItem('guimiju_v2_particles');
    if (savedSound !== null) this.state.settings.soundEnabled = savedSound === 'true';
    if (savedParticles !== null) this.state.settings.particleEnabled = savedParticles === 'true';

    this.render();
  },

  // ================================================================
  // 切换主题
  // ================================================================
  selectTheme(themeId) {
    V2App.user.bgTheme = themeId;
    localStorage.setItem('guimiju_v2_theme', themeId);
    // 应用主题特效
    if (typeof ThemeFX !== 'undefined') {
      ThemeFX.applyTheme(themeId);
    }
    // 刷新主题网格选中态
    document.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('theme-active', card.dataset.theme === themeId);
      const badge = card.querySelector('.theme-card-badge');
      if (badge) badge.remove();
      if (card.dataset.theme === themeId) {
        const overlay = card.querySelector('.theme-card-overlay');
        const b = document.createElement('div');
        b.className = 'theme-card-badge';
        b.textContent = '当前';
        overlay.appendChild(b);
      }
    });
    const names = {
      theme_default: '暗黑古堡', theme_halloween: '万圣之夜',
      theme_qing: '清明义庄', theme_undersea: '深海迷城',
      theme_carnival: '怪诞马戏', theme_abyss: '深渊凝视'
    };
    V2App.toast(`主题已切换为「${names[themeId] || themeId}」`);
  },

  // ================================================================
  // 根据战绩计算段位
  // ================================================================
  calcRank(wins, totalScore) {
    const ranks = [
      { name: '青铜侦探', icon: '🔍', minWins: 0,  minScore: 0 },
      { name: '白银侦探', icon: '🔎', minWins: 3,  minScore: 500 },
      { name: '黄金侦探', icon: '🕵️', minWins: 10, minScore: 1500 },
      { name: '铂金侦探', icon: '📋', minWins: 25, minScore: 4000 },
      { name: '钻石侦探', icon: '💎', minWins: 50, minScore: 8000 },
      { name: '推理大师', icon: '👑', minWins: 100, minScore: 15000 }
    ];
    let currentIdx = 0;
    for (let i = ranks.length - 1; i >= 0; i--) {
      if (wins >= ranks[i].minWins && totalScore >= ranks[i].minScore) {
        currentIdx = i;
        break;
      }
    }
    const next = ranks[Math.min(currentIdx + 1, ranks.length - 1)];
    // 进度：按胜场计算百分比
    const progress = next.minWins > 0 ? Math.min(Math.round(wins / next.minWins * 100), 100) : 100;
    return {
      rank: ranks[currentIdx].name,
      icon: ranks[currentIdx].icon,
      progress,
      nextRank: next.name
    };
  },

  // ================================================================
  // 渲染
  // ================================================================
  render() {
    const container = document.getElementById('profile-content');
    if (!container) return;

    const s = this.state;
    const winRate = s.totalGames > 0 ? Math.round(s.wins / s.totalGames * 100) : 0;
    const avgScore = s.totalGames > 0 ? Math.round(s.totalScore / s.totalGames) : 0;
    const doneCount = s.achievements.filter(a => a.done).length;

    container.innerHTML = `
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-avatar-ring">
          <div class="profile-avatar">${V2App.user.avatar}</div>
        </div>
        <div class="profile-name">${V2App.user.name}</div>
        <div class="profile-rank">
          <span class="rank-icon">${s.rankIcon}</span>
          <span class="rank-label">${s.rank}</span>
        </div>
        <div class="profile-rank-progress">
          <div class="rank-bar">
            <div class="rank-bar-fill" style="width:${s.rankProgress}%"></div>
          </div>
          <div class="rank-bar-text">距 ${s.nextRank} 还需 ${100 - s.rankProgress}%</div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="profile-stats">
        <div class="pstat-card">
          <div class="pstat-value">${s.totalGames}</div>
          <div class="pstat-label">总场次</div>
        </div>
        <div class="pstat-card highlight">
          <div class="pstat-value">${winRate}%</div>
          <div class="pstat-label">胜率</div>
        </div>
        <div class="pstat-card">
          <div class="pstat-value">${avgScore}</div>
          <div class="pstat-label">场均分</div>
        </div>
        <div class="pstat-card">
          <div class="pstat-value">${doneCount}/${s.achievements.length}</div>
          <div class="pstat-label">成就</div>
        </div>
      </div>

      <!-- Achievements -->
      <div class="profile-section">
        <div class="profile-section-title">🎖️ 成就</div>
        <div class="achievement-list">
          ${s.achievements.map(a => `
            <div class="achievement-item ${a.done ? 'done' : ''}">
              <span class="achievement-icon ${a.done ? '' : 'locked'}">${a.icon}</span>
              <div class="achievement-info">
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.desc}</div>
              </div>
              ${a.done ? '<span class="achievement-check">✓</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Settings -->
      <div class="profile-section">
        <div class="profile-section-title">⚙️ 设置</div>
        <div class="settings-list">
          <div class="setting-item">
            <span class="setting-label">👤 形象性别</span>
            <div class="gender-switch" id="gender-switch">
              <button class="gender-opt ${V2App.user.gender === 'male' ? 'active' : ''}" data-gender="male">男</button>
              <button class="gender-opt ${V2App.user.gender === 'female' ? 'active' : ''}" data-gender="female">女</button>
            </div>
          </div>
          <div class="setting-item">
            <span class="setting-label">🎵 音效</span>
            <button class="toggle-btn ${s.settings.soundEnabled ? 'on' : ''}" id="toggle-sound">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-item">
            <span class="setting-label">✨ 粒子特效</span>
            <button class="toggle-btn ${s.settings.particleEnabled ? 'on' : ''}" id="toggle-particles">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-item" style="flex-direction:column;align-items:stretch;gap:8px;">
            <span class="setting-label">🌙 主题背景</span>
            <div class="theme-grid" id="theme-grid"></div>
          </div>
        </div>
      </div>

      <!-- Friends -->
      <div class="profile-section">
        <div class="profile-section-title">👥 好友</div>
        <div class="friends-quick-bar">
          <button class="btn btn-primary btn-block" id="btn-search-users">🔍 搜索添加好友</button>
          <button class="btn btn-ghost btn-block" id="btn-add-by-id">📋 通过ID添加</button>
        </div>
        <div id="friends-list-container" class="friends-list-container">
          <div class="friends-loading">加载中...</div>
        </div>
        <div id="friend-requests-badge" class="friend-requests-badge" style="display:none;">
          <button class="btn btn-gold btn-block" id="btn-view-requests">
            📩 有新的好友请求
          </button>
        </div>
      </div>

      <!-- Settings -->
      <div class="profile-section">
        <div class="profile-section-title">⚙️ 设置</div>
        <div class="settings-list">
          <div class="setting-item">
            <span class="setting-label">👤 形象性别</span>
            <div class="gender-switch" id="gender-switch">
              <button class="gender-opt ${V2App.user.gender === 'male' ? 'active' : ''}" data-gender="male">男</button>
              <button class="gender-opt ${V2App.user.gender === 'female' ? 'active' : ''}" data-gender="female">女</button>
            </div>
          </div>
          <div class="setting-item">
            <span class="setting-label">🎵 音效</span>
            <button class="toggle-btn ${s.settings.soundEnabled ? 'on' : ''}" id="toggle-sound">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-item">
            <span class="setting-label">✨ 粒子特效</span>
            <button class="toggle-btn ${s.settings.particleEnabled ? 'on' : ''}" id="toggle-particles">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-item" style="flex-direction:column;align-items:stretch;gap:8px;">
            <span class="setting-label">🌙 主题背景</span>
            <div class="theme-grid" id="theme-grid-2"></div>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="profile-section">
        <button class="btn btn-gold btn-block" id="btn-view-leaderboard" style="margin-bottom:8px;">🏅 查看排行榜</button>
        <button class="btn btn-ghost btn-block" id="btn-change-name" style="margin-bottom:8px;">修改昵称</button>
      </div>
    `;

    this.bindEvents();
  },

  // ================================================================
  // 绑定事件
  // ================================================================
  bindEvents() {
    // 性别切换
    document.querySelectorAll('#gender-switch .gender-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const gender = btn.dataset.gender;
        V2App.setGender(gender);
        // 更新 UI 选中状态
        document.querySelectorAll('#gender-switch .gender-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // 更新头像显示
        const avatarEl = document.querySelector('.profile-avatar');
        if (avatarEl) avatarEl.textContent = gender === 'female' ? '🕵️‍♀️' : '🕵️';
      });
    });

    // Toggle 音效
    document.getElementById('toggle-sound')?.addEventListener('click', function() {
      this.classList.toggle('on');
      const on = this.classList.contains('on');
      ProfileUI.state.settings.soundEnabled = on;
      localStorage.setItem('guimiju_v2_sound', on);
      if (typeof ThemeFX !== 'undefined') ThemeFX.toggleSound(on);
      V2App.toast(on ? '音效已开启' : '音效已关闭');
    });

    // Toggle 粒子
    document.getElementById('toggle-particles')?.addEventListener('click', function() {
      this.classList.toggle('on');
      const on = this.classList.contains('on');
      ProfileUI.state.settings.particleEnabled = on;
      localStorage.setItem('guimiju_v2_particles', on ? 'on' : 'off');
      if (typeof ThemeFX !== 'undefined') {
        if (on) { if (!ThemeFX.animFrame) ThemeFX.animate(); }
        else { ThemeFX.stopParticles(); }
      }
      V2App.toast(on ? '粒子已开启' : '粒子已关闭');
    });

    // ===== 主题选择器 =====
    const themeMeta = [
      { id: 'theme_default', name: '暗黑古堡', emoji: '🏰', desc: '经典哥特风' },
      { id: 'theme_halloween', name: '万圣之夜', emoji: '🎃', desc: '南瓜蝙蝠' },
      { id: 'theme_qing', name: '清明义庄', emoji: '🏮', desc: '中式恐怖' },
      { id: 'theme_undersea', name: '深海迷城', emoji: '🌊', desc: '海底气泡' },
      { id: 'theme_carnival', name: '怪诞马戏', emoji: '🎪', desc: '彩纸飘舞' },
      { id: 'theme_abyss', name: '深渊凝视', emoji: '👁️', desc: '紫暗脉动' },
    ];
    const currentTheme = V2App.user.bgTheme || 'theme_default';

    function renderThemeGrid(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = themeMeta.map(t => {
        const isActive = t.id === currentTheme;
        const themeConfig = typeof ThemeFX !== 'undefined' ? ThemeFX.themes[t.id] : null;
        const bgUrl = themeConfig ? themeConfig.bgUrl : '';
        return `
          <button class="theme-card ${isActive ? 'theme-active' : ''}" data-theme="${t.id}"
            style="${bgUrl ? `background-image:url('${bgUrl}');` : ''}"
            onclick="ProfileUI.selectTheme('${t.id}')">
            <div class="theme-card-overlay">
              <div class="theme-card-emoji">${t.emoji}</div>
              <div class="theme-card-name">${t.name}</div>
              <div class="theme-card-desc">${t.desc}</div>
              ${isActive ? '<div class="theme-card-badge">当前</div>' : ''}
            </div>
          </button>`;
      }).join('');
    }
    renderThemeGrid('theme-grid');
    renderThemeGrid('theme-grid-2');

    // 修改昵称
    document.getElementById('btn-change-name')?.addEventListener('click', () => {
      V2App.showModal('modal-name');
      setTimeout(() => document.getElementById('input-name')?.focus(), 300);
    });

    // 查看排行榜
    document.getElementById('btn-view-leaderboard')?.addEventListener('click', () => {
      V2App.showPage('leaderboard');
      LeaderboardUI.init();
    });

    // ===== 好友相关事件 =====
    document.getElementById('btn-search-users')?.addEventListener('click', () => {
      V2App.showModal('modal-search-users');
      setTimeout(() => document.getElementById('input-search-keyword')?.focus(), 300);
    });

    document.getElementById('btn-add-by-id')?.addEventListener('click', () => {
      V2App.showModal('modal-add-friend');
      setTimeout(() => document.getElementById('input-friend-id')?.focus(), 300);
    });

    document.getElementById('btn-view-requests')?.addEventListener('click', () => {
      this.showFriendRequests();
    });

    document.getElementById('btn-confirm-add-friend')?.addEventListener('click', async () => {
      const idInput = document.getElementById('input-friend-id');
      const msgInput = document.getElementById('input-friend-msg');
      const resultEl = document.getElementById('add-friend-result');
      const friendId = idInput?.value?.trim();
      if (!friendId) {
        if (resultEl) { resultEl.style.display = 'block'; resultEl.textContent = '请输入好友ID'; }
        return;
      }
      const btn = document.getElementById('btn-confirm-add-friend');
      if (btn) { btn.disabled = true; btn.textContent = '发送中...'; }
      try {
        const res = await V2App.callFn('friendManager', { action: 'sendRequest', targetId: friendId, message: msgInput?.value?.trim() || '' });
        if (res && res.code === 0) {
          V2App.toast('好友请求已发送！', 'success');
          V2App.hideModal('modal-add-friend');
        } else {
          if (resultEl) { resultEl.style.display = 'block'; resultEl.textContent = res?.message || '发送失败'; }
        }
      } catch (e) {
        if (resultEl) { resultEl.style.display = 'block'; resultEl.textContent = '网络错误'; }
      }
      if (btn) { btn.disabled = false; btn.textContent = '发送请求'; }
    });

    document.getElementById('btn-do-search')?.addEventListener('click', async () => {
      const kw = document.getElementById('input-search-keyword')?.value?.trim();
      const listEl = document.getElementById('search-result-list');
      if (!kw) { if (listEl) listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;">请输入关键词</div>'; return; }
      if (listEl) listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;">搜索中...</div>';
      try {
        const res = await V2App.callFn('friendManager', { action: 'searchUser', keyword: kw });
        if (res && res.code === 0 && res.data) {
          const users = res.data.users || [];
          if (users.length === 0) {
            listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;">未找到匹配的玩家</div>';
          } else {
            listEl.innerHTML = users.map(u => `
              <div class="search-user-item">
                <div class="sui-avatar">${u.avatar || '🕵️'}</div>
                <div class="sui-info">
                  <div class="sui-name">${u.name}</div>
                  <div class="sui-id">${u.id.substring(0, 14)}...</div>
                </div>
                ${u.isFriend
                  ? '<span class="sui-tag friend-tag">已是好友</span>'
                  : u.hasPending
                    ? '<span class="sui-tag pending-tag">请求中</span>'
                    : `<button class="btn btn-gold btn-sm sui-add-btn" data-target-id="${u.id}" data-target-name="${u.name}">添加</button>`
                }
              </div>
            `).join('');
            listEl.querySelectorAll('.sui-add-btn').forEach(btn => {
              btn.addEventListener('click', async function() {
                this.disabled = true; this.textContent = '...';
                const r = await V2App.callFn('friendManager', { action: 'sendRequest', targetId: this.dataset.targetId, message: 'Hi ' + this.dataset.targetName + '！' });
                if (r && r.code === 0) {
                  V2App.toast('好友请求已发送！', 'success');
                  this.textContent = '已发送'; this.className = 'btn btn-ghost btn-sm'; this.disabled = true;
                } else {
                  V2App.toast(r?.message || '发送失败', 'error');
                  this.disabled = false; this.textContent = '添加';
                }
              });
            });
          }
        }
      } catch (e) {
        if (listEl) listEl.innerHTML = '<div style="font-size:12px;color:var(--crimson-bright);text-align:center;">搜索失败</div>';
      }
    });

    this.loadFriendsList();
    this.loadFriendRequestBadge();
  },

  async loadFriendsList() {
    const container = document.getElementById('friends-list-container');
    if (!container) return;
    try {
      const res = await V2App.callFn('friendManager', { action: 'getFriends' });
      if (res && res.code === 0 && res.data) {
        const friends = res.data.friends || [];
        if (friends.length === 0) {
          container.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;">还没有好友，快去添加吧！</div>';
        } else {
          container.innerHTML = friends.map(f => `
            <div class="friend-item">
              <div class="fi-avatar">${f.avatar || '🕵️'}</div>
              <div class="fi-info">
                <div class="fi-name">${f.name}</div>
                <div class="fi-status ${f.isOnline ? 'online' : ''}">${f.isOnline ? '🟢 在线' : '⚫ 离线'}</div>
              </div>
              <button class="btn btn-ghost btn-sm fi-remove-btn" data-friend-id="${f.friendId}" title="删除好友">✕</button>
            </div>
          `).join('');
          container.querySelectorAll('.fi-remove-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
              if (!confirm('确定删除该好友？')) return;
              const r = await V2App.callFn('friendManager', { action: 'removeFriend', friendId: this.dataset.friendId });
              if (r && r.code === 0) { V2App.toast('已删除好友'); ProfileUI.loadFriendsList(); }
              else V2App.toast('操作失败', 'error');
            });
          });
        }
      }
    } catch (e) {
      container.innerHTML = '<div style="font-size:12px;color:var(--text-dim);text-align:center;">加载失败</div>';
    }
  },

  async loadFriendRequestBadge() {
    try {
      const res = await V2App.callFn('friendManager', { action: 'getPendingRequests' });
      if (res && res.code === 0 && res.data) {
        const count = (res.data.requests || []).length;
        const badge = document.getElementById('friend-requests-badge');
        if (badge) {
          badge.style.display = count > 0 ? 'block' : 'none';
          if (count > 0) {
            const btn = badge.querySelector('button');
            if (btn) btn.textContent = `📩 ${count} 个新的好友请求`;
          }
        }
      }
    } catch (e) { /* ignore */ }
  },

  async showFriendRequests() {
    V2App.showModal('modal-search-users');
    const listEl = document.getElementById('search-result-list');
    const titleEl = document.querySelector('#modal-search-users .modal-title');
    if (titleEl) titleEl.textContent = '📩 好友请求';
    const kwRow = document.getElementById('input-search-keyword')?.closest('.config-row');
    const searchBtn = document.getElementById('btn-do-search');
    if (kwRow) kwRow.style.display = 'none';
    if (searchBtn) searchBtn.style.display = 'none';
    if (listEl) listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;">加载中...</div>';

    try {
      const res = await V2App.callFn('friendManager', { action: 'getPendingRequests' });
      if (res && res.code === 0 && res.data) {
        const requests = res.data.requests || [];
        if (requests.length === 0) {
          listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;">暂无好友请求</div>';
        } else {
          listEl.innerHTML = requests.map(r => `
            <div class="search-user-item request-item">
              <div class="sui-avatar">🕵️</div>
              <div class="sui-info">
                <div class="sui-name">${r.fromName}</div>
                <div class="sui-id">${r.fromId.substring(0, 14)}...</div>
                ${r.message ? `<div class="sui-msg">"${r.message}"</div>` : ''}
              </div>
              <div class="request-actions">
                <button class="btn btn-gold btn-sm request-accept-btn" data-request-id="${r.requestId}">接受</button>
                <button class="btn btn-ghost btn-sm request-reject-btn" data-request-id="${r.requestId}">拒绝</button>
              </div>
            </div>
          `).join('');
          listEl.querySelectorAll('.request-accept-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
              this.disabled = true; this.textContent = '...';
              const r = await V2App.callFn('friendManager', { action: 'acceptRequest', requestId: this.dataset.requestId });
              if (r && r.code === 0) {
                V2App.toast('已成为好友！', 'success');
                ProfileUI.showFriendRequests();
                ProfileUI.loadFriendsList();
                ProfileUI.loadFriendRequestBadge();
              }
            });
          });
          listEl.querySelectorAll('.request-reject-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
              const r = await V2App.callFn('friendManager', { action: 'rejectRequest', requestId: this.dataset.requestId });
              if (r && r.code === 0) {
                V2App.toast('已拒绝');
                ProfileUI.showFriendRequests();
                ProfileUI.loadFriendRequestBadge();
              }
            });
          });
        }
      }
    } catch (e) {
      if (listEl) listEl.innerHTML = '<div style="font-size:12px;color:var(--crimson-bright);text-align:center;">加载失败</div>';
    }

    // 关闭弹窗时恢复搜索UI
    const closeBtn = document.querySelector('#modal-search-users .btn-ghost');
    if (closeBtn) {
      const origHandler = closeBtn.onclick;
      closeBtn.onclick = (e) => {
        V2App.hideModal('modal-search-users');
        if (kwRow) kwRow.style.display = '';
        if (searchBtn) searchBtn.style.display = '';
        if (titleEl) titleEl.textContent = '🔍 搜索玩家';
        if (listEl) listEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;">输入关键词搜索其他玩家</div>';
      };
    }
  }
};

// ================================================================
// 个人主页专用样式
// ================================================================
(function injectProfileStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Profile Header */
    .profile-header{text-align:center;padding:24px 20px 16px;
      background:linear-gradient(180deg,rgba(212,168,83,0.06),transparent);margin-bottom:4px;}
    .profile-avatar-ring{width:72px;height:72px;border-radius:50%;margin:0 auto 10px;
      border:2px solid var(--border-gold);padding:3px;
      box-shadow:0 0 16px var(--gold-glow);}
    .profile-avatar{width:100%;height:100%;border-radius:50%;background:var(--bg-elevated);
      display:flex;align-items:center;justify-content:center;font-size:36px;}
    .profile-name{font-size:18px;font-weight:700;color:var(--text);letter-spacing:2px;margin-bottom:6px;}
    .profile-rank{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:12px;}
    .profile-rank .rank-icon{font-size:18px;}
    .profile-rank .rank-label{font-size:13px;font-weight:600;color:var(--gold);letter-spacing:1px;}

    /* Rank Progress */
    .profile-rank-progress{max-width:200px;margin:0 auto;}
    .rank-bar{height:6px;border-radius:3px;background:var(--bg-input);overflow:hidden;
      border:1px solid var(--border);}
    .rank-bar-fill{height:100%;border-radius:3px;
      background:linear-gradient(90deg,var(--gold-dim),var(--gold));transition:width 1s var(--ease-out);}
    .rank-bar-text{font-size:10px;color:var(--text-muted);margin-top:4px;letter-spacing:1px;}

    /* Stats */
    .profile-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 16px;padding:12px;
      background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius);}
    .pstat-card{text-align:center;padding:8px 4px;}
    .pstat-value{font-size:20px;font-weight:800;color:var(--text);
      font-variant-numeric:tabular-nums;}
    .pstat-card.highlight .pstat-value{color:var(--gold);text-shadow:0 0 8px var(--gold-glow);}
    .pstat-label{font-size:10px;color:var(--text-muted);margin-top:2px;letter-spacing:1px;}

    /* Section */
    .profile-section{padding:12px 16px;}
    .profile-section-title{font-size:13px;color:var(--text-muted);letter-spacing:2px;margin-bottom:10px;
      text-transform:uppercase;}

    /* Achievements */
    .achievement-list{display:flex;flex-direction:column;gap:6px;}
    .achievement-item{display:flex;align-items:center;gap:10px;padding:10px 12px;
      border-radius:var(--radius-sm);background:var(--bg-elevated);border:1px solid var(--border);
      transition:all .2s;}
    .achievement-item.done{border-color:rgba(212,168,83,0.15);background:rgba(212,168,83,0.03);}
    .achievement-icon{font-size:24px;flex-shrink:0;}
    .achievement-icon.locked{opacity:0.3;filter:grayscale(1);}
    .achievement-info{flex:1;min-width:0;}
    .achievement-name{font-size:13px;font-weight:600;color:var(--text);letter-spacing:0.5px;}
    .achievement-desc{font-size:11px;color:var(--text-muted);margin-top:1px;}
    .achievement-check{font-size:14px;color:var(--gold);font-weight:700;}

    /* Settings */
    .settings-list{display:flex;flex-direction:column;gap:8px;}
    .setting-item{display:flex;align-items:center;justify-content:space-between;
      padding:12px;border-radius:var(--radius-sm);background:var(--bg-elevated);border:1px solid var(--border);}
    .setting-label{font-size:13px;color:var(--text);font-weight:600;}
    .setting-value{font-size:12px;color:var(--gold);}

    /* Toggle Button */
    .toggle-btn{width:44px;height:24px;border-radius:12px;border:none;
      background:var(--bg-input);cursor:pointer;position:relative;transition:background .3s;
      border:1px solid var(--border);}
    .toggle-btn.on{background:var(--gold-dim);border-color:var(--gold);}
    .toggle-knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;
      background:var(--text);transition:transform .3s var(--ease-out);box-shadow:0 1px 3px rgba(0,0,0,0.3);}
    .toggle-btn.on .toggle-knob{transform:translateX(20px);background:#fff;}

    /* Theme Grid */
    .theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
    .theme-card{position:relative;height:56px;border-radius:8px;border:2px solid var(--border);
      background-size:cover;background-position:center;cursor:pointer;overflow:hidden;
      transition:all .3s var(--ease-out);}
    .theme-card:hover{border-color:var(--border-light);transform:scale(1.02);}
    .theme-card.theme-active{border-color:var(--gold);box-shadow:0 0 10px var(--gold-glow);}
    .theme-card-overlay{position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:1px;
      background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);transition:background .3s;}
    .theme-card:hover .theme-card-overlay{background:rgba(0,0,0,0.4);}
    .theme-card.theme-active .theme-card-overlay{background:rgba(0,0,0,0.3);}
    .theme-card-emoji{font-size:18px;line-height:1;}
    .theme-card-name{font-size:9px;font-weight:700;color:var(--text);letter-spacing:0.5px;}
    .theme-card-desc{font-size:7px;color:var(--text-muted);}
    .theme-card-badge{position:absolute;top:3px;right:4px;font-size:7px;font-weight:700;
      color:var(--gold);background:rgba(0,0,0,0.6);padding:1px 5px;border-radius:4px;
      border:1px solid var(--gold);}

    /* Gender Switch */
    .gender-switch{display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--border);}
    .gender-opt{padding:6px 16px;border:none;background:var(--bg-input);color:var(--text-muted);
      font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;transition:all .25s;}
    .gender-opt:first-child{border-right:1px solid var(--border);}
    .gender-opt.active{background:rgba(212,168,83,0.1);color:var(--gold);}
    .gender-opt:hover:not(.active){background:rgba(255,255,255,0.02);}

    /* Friends */
    .friends-quick-bar{display:flex;gap:8px;margin-bottom:10px;}
    .friends-quick-bar .btn{font-size:12px;padding:8px 12px;}
    .friends-list-container{margin-top:6px;}
    .friends-loading{font-size:12px;color:var(--text-muted);text-align:center;padding:12px;}
    .friend-item{display:flex;align-items:center;gap:10px;padding:10px 8px;
      border-radius:var(--radius-sm);background:var(--bg-elevated);border:1px solid var(--border);margin-bottom:6px;
      transition:all .2s;}
    .friend-item:hover{border-color:rgba(212,168,83,0.15);}
    .fi-avatar{font-size:28px;flex-shrink:0;width:36px;text-align:center;}
    .fi-info{flex:1;min-width:0;}
    .fi-name{font-size:13px;font-weight:600;color:var(--text);letter-spacing:0.5px;}
    .fi-status{font-size:10px;color:var(--text-muted);margin-top:2px;}
    .fi-status.online{color:var(--forest-bright);}
    .fi-remove-btn{font-size:16px;padding:4px 8px;opacity:0.3;transition:opacity .2s;}
    .fi-remove-btn:hover{opacity:1;color:var(--crimson-bright);}
    .friend-requests-badge{margin-top:8px;}
    .friend-requests-badge .btn{font-size:12px;animation:pulse-gold 2s infinite;}

    /* Search Users */
    .search-user-item{display:flex;align-items:center;gap:10px;padding:10px 8px;
      border-radius:var(--radius-sm);background:var(--bg-elevated);border:1px solid var(--border);margin-bottom:6px;}
    .sui-avatar{font-size:28px;flex-shrink:0;width:36px;text-align:center;}
    .sui-info{flex:1;min-width:0;}
    .sui-name{font-size:13px;font-weight:600;color:var(--text);}
    .sui-id{font-size:10px;color:var(--text-muted);margin-top:2px;font-family:monospace;}
    .sui-msg{font-size:10px;color:var(--text-dim);margin-top:2px;font-style:italic;}
    .sui-tag{font-size:10px;padding:3px 10px;border-radius:12px;font-weight:600;}
    .friend-tag{background:rgba(100,180,100,0.1);color:var(--forest-bright);border:1px solid rgba(100,180,100,0.15);}
    .pending-tag{background:rgba(212,168,83,0.08);color:var(--gold);border:1px solid rgba(212,168,83,0.15);}
    .sui-add-btn{font-size:11px;padding:4px 12px;}
    .request-actions{display:flex;gap:6px;flex-shrink:0;}
    .request-actions .btn{font-size:11px;padding:4px 12px;}

    /* Player Profile Modal (游戏中点击角色) */
    .player-profile-modal{max-width:320px;}
    .player-profile-card{text-align:center;padding:8px 0;}
    .player-profile-loading,.player-profile-error{text-align:center;padding:20px;font-size:13px;color:var(--text-dim);}
    .pp-avatar{width:80px;height:80px;border-radius:50%;margin:0 auto 12px;
      border:2px solid var(--border-gold);overflow:hidden;display:flex;align-items:center;justify-content:center;
      background:var(--bg-elevated);box-shadow:0 0 16px var(--gold-glow);}
    .pp-portrait{width:100%;height:100%;object-fit:cover;}
    .pp-emoji{font-size:40px;}
    .pp-name{font-size:18px;font-weight:700;color:var(--gold);letter-spacing:2px;margin-bottom:8px;}
    .pp-id-row{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px;}
    .pp-id-label{font-size:10px;color:var(--text-muted);background:var(--bg-input);padding:2px 8px;border-radius:4px;}
    .pp-id-value{font-size:10px;color:var(--text-dim);font-family:monospace;}
    .pp-id-full{font-size:9px;color:var(--text-muted);font-family:monospace;word-break:break-all;
      background:var(--bg-input);padding:6px 10px;border-radius:6px;margin:6px 0;line-height:1.4;}
    .pp-status{font-size:12px;margin:8px 0;font-weight:600;}
    .pp-status.online{color:var(--forest-bright);}
    .pp-status.offline{color:var(--text-muted);}
    .pp-actions{margin-top:12px;}
    .btn-friend-already{opacity:0.5;}

    /* Clickable portrait hint */
    .portrait-clickable{cursor:pointer;transition:transform .2s,box-shadow .2s;}
    .portrait-clickable:hover{transform:translateY(-2px);}
    .portrait-tap-hint{font-size:9px;color:var(--text-muted);margin-top:2px;opacity:0;transition:opacity .2s;}
    .portrait-clickable:hover .portrait-tap-hint{opacity:1;}

    @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 rgba(212,168,83,0.4);}
      50%{box-shadow:0 0 0 6px rgba(212,168,83,0);}}
  `;
  document.head.appendChild(style);
})();

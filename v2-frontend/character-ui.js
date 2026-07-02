// ================================================================
// 诡谜局 V2 · 角色页 — Character UI
// 展示/装备/预览角色 + 皮肤切换 + 抽卡
// ================================================================

const CharacterUI = {
  state: {
    characters: [],
    equippedId: null,
    selectedId: null,
    tab: 'owned',  // owned / gacha
    pity: 0,
    dailyCount: 0,       // 今日已抽次数
    dailyDate: '',        // 今日日期字符串（用于重置判断）
    dailyLimit: 50        // 每日抽卡上限
  },

  // ================================================================
  // 初始化
  // ================================================================
  async init() {
    // 加载每日抽卡次数
    this.loadDailyCount();

    const res = await V2App.callFn('characterManager', { action: 'getMyCharacters' });
    const data = res.data || res;
    if (data && data.characters) {
      this.state.characters = data.characters;
      this.state.equippedId = data.equippedId || (data.characters[0]?.id);
      this.state.selectedId = this.state.equippedId;
    }
    this.render();
  },

  // ================================================================
  // 渲染
  // ================================================================
  render() {
    const container = document.getElementById('character-content');
    if (!container) return;

    container.innerHTML = `
      <!-- Character Preview -->
      <div class="char-preview" id="char-preview">
        <div class="char-preview-frame" id="char-preview-frame">
          <div class="char-preview-placeholder">🎭</div>
        </div>
        <div class="char-preview-info" id="char-preview-info">
          <div class="char-preview-name">选择角色</div>
          <div class="char-preview-rarity"></div>
        </div>
      </div>

      <!-- Skin Selector (under preview) -->
      <div class="skin-selector hidden" id="skin-selector">
        <div class="skin-selector-title">👗 皮肤切换</div>
        <div class="skin-list" id="skin-list"></div>
      </div>

      <!-- Tab Switch -->
      <div class="char-tabs">
        <button class="char-tab active" data-tab="owned">我的角色</button>
        <button class="char-tab" data-tab="gacha">角色召唤</button>
      </div>

      <!-- Owned Characters -->
      <div class="char-tab-content" id="tab-owned">
        <div class="char-grid" id="char-grid"></div>
      </div>

      <!-- Gacha -->
      <div class="char-tab-content hidden" id="tab-gacha">
        <div class="gacha-section">
          <div class="gacha-banner">
            <div class="gacha-title">🔮 角色召唤</div>
            <div class="gacha-desc">免费召唤新角色</div>
            <div class="gacha-daily">今日剩余 <span id="gacha-daily-left">${this.state.dailyLimit - this.state.dailyCount}</span> / ${this.state.dailyLimit} 次</div>
            <div class="gacha-pity">距离保底还需 <span id="gacha-pity">0</span> 抽</div>
          </div>
          <div class="gacha-buttons">
            <button class="btn btn-gold" id="btn-gacha-1">
              <span>✨</span> 单抽
            </button>
            <button class="btn btn-primary" id="btn-gacha-10">
              <span>🌟</span> 十连
            </button>
          </div>
          <div class="gacha-pool">
            <div class="gacha-pool-title">奖池角色</div>
            <div class="gacha-pool-list" id="gacha-pool-list"></div>
          </div>
        </div>
      </div>

      <!-- Equip Button -->
      <div class="char-actions">
        <button class="btn btn-gold btn-block" id="btn-equip-char" style="display:none;">装备该角色</button>
      </div>
    `;

    this.bindEvents();
    this.renderGrid();
    this.renderGachaPool();
    this.updatePreview();
  },

  // ================================================================
  // 绑定事件
  // ================================================================
  bindEvents() {
    // Tab 切换
    document.querySelectorAll('.char-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.char-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.char-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById('tab-' + tab.dataset.tab)?.classList.remove('hidden');
      });
    });

    // 装备
    document.getElementById('btn-equip-char')?.addEventListener('click', async () => {
      await this.equipAndSync(this.state.selectedId);
    });

    // 抽卡
    document.getElementById('btn-gacha-1')?.addEventListener('click', () => this.doGacha('single'));
    document.getElementById('btn-gacha-10')?.addEventListener('click', () => this.doGacha('ten'));
  },

  // ================================================================
  // 渲染角色网格
  // ================================================================
  renderGrid() {
    const grid = document.getElementById('char-grid');
    if (!grid) return;

    if (this.state.characters.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">🎭</div><div class="title">暂无角色</div><div class="desc">通过召唤获得你的第一个角色</div></div>';
      return;
    }

    grid.innerHTML = this.state.characters.map(c => {
      const rarityClass = 'rarity-' + (c.rarity || 'common');
      const isSelected = c.id === this.state.selectedId;
      const isEquipped = c.id === this.state.equippedId;
      const count = c.count || 1;
      const img = c.previewUrl
        ? `<img src="${c.previewUrl}" alt="${c.name}">`
        : `<span style="font-size:28px;">🕵️</span>`;
      return `
        <div class="char-card ${rarityClass} ${isSelected ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}"
             data-id="${c.id}" data-name="${c.name}" data-rarity="${c.rarity}" data-url="${c.previewUrl || ''}"
             data-character-id="${c.characterId || ''}" data-emoji="${c.emoji || '🕵️'}">
          <div class="char-card-img">${img}</div>
          <div class="char-card-name">${c.name}</div>
          ${count > 1 ? `<div class="char-card-count">x${count}</div>` : ''}
          ${isEquipped ? '<div class="char-card-equipped">使用中</div>' : ''}
          ${isSelected ? '<div class="char-card-check">✓</div>' : ''}
          ${!isEquipped ? `<button class="char-card-use-btn" data-id="${c.id}" data-character-id="${c.characterId || ''}" data-url="${c.previewUrl || ''}" data-name="${c.name}" data-emoji="${c.emoji || '🕵️'}">使用</button>` : ''}
        </div>`;
    }).join('');

    // 点击选择 + "使用"按钮代理
    grid.addEventListener('click', e => {
      // 如果点的是"使用"按钮，阻止冒泡并执行装备
      const useBtn = e.target.closest('.char-card-use-btn');
      if (useBtn) {
        e.stopPropagation();
        const id = useBtn.dataset.id;
        this.state.selectedId = id;
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        useBtn.closest('.char-card')?.classList.add('selected');
        this.equipAndSync(id);
        return;
      }
      // 否则是卡片选择
      const card = e.target.closest('.char-card');
      if (!card) return;
      this.state.selectedId = card.dataset.id;
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      this.updatePreview();
    });
  },

  // ================================================================
  // 渲染奖池
  // ================================================================
  renderGachaPool() {
    const list = document.getElementById('gacha-pool-list');
    if (!list) return;
    const allChars = [
      { characterId: 'detective_m', name: '侦探', rarity: 'common', emoji: '🕵️', url: 'assets/char-detective.png' },
      { characterId: 'detective_f', name: '女侦探', rarity: 'common', emoji: '🕵️‍♀️', url: 'assets/char-detective-f(1).png' },
      { characterId: 'student', name: '推理社学生', rarity: 'common', emoji: '📚', url: 'assets/char-student.png' },
      { characterId: 'reporter', name: '记者', rarity: 'rare', emoji: '📰', url: 'assets/char-reporter.png' },
      { characterId: 'psychic', name: '通灵师', rarity: 'rare', emoji: '🔮', url: 'assets/char-psychic.png' },
      { characterId: 'doctor', name: '法医', rarity: 'rare', emoji: '🔬', url: 'assets/char-doctor.png' },
      { characterId: 'writer', name: '悬疑作家', rarity: 'epic', emoji: '✒️', url: 'assets/char-writer.png' },
      { characterId: 'hacker', name: '黑客', rarity: 'epic', emoji: '💻', url: 'assets/char-hacker.png' },
      { characterId: 'agent', name: '特工', rarity: 'legendary', emoji: '🎭', url: 'assets/char-agent.png' },
      { characterId: 'mastermind', name: '幕后黑手', rarity: 'legendary', emoji: '♟️', url: 'assets/char-mastermind.png' }
    ];
    list.innerHTML = allChars.map(c => `
      <div class="gacha-char rarity-${c.rarity}">
        <span class="gacha-char-emoji">${c.emoji}</span>
        <span class="gacha-char-name">${c.name}</span>
        <span class="gacha-char-rarity">${{common:'普通',rare:'稀有',epic:'史诗',legendary:'传说'}[c.rarity]}</span>
      </div>
    `).join('');
  },

  // ================================================================
  // 装备角色并同步大厅立绘 + 顶部头像
  // ================================================================
  async equipAndSync(charDocId) {
    const char = this.state.characters.find(c => c.id === charDocId);
    if (!char) return;

    // 调用服务端装备 API
    await V2App.callFn('characterManager', { action: 'equip', characterId: charDocId });

    // 更新本地状态
    this.state.equippedId = charDocId;
    V2App.user.equippedCharacter = {
      characterId: char.characterId,
      skinId: char.skinId || 'default',
      name: char.name,
      emoji: char.emoji || '🕵️',
      portraitUrl: char.previewUrl
    };
    V2App.user.avatar = char.emoji || '🕵️';

    // 更新大厅主立绘
    if (char.previewUrl) {
      V2App.updateLobbyHero(char.previewUrl);
    }

    V2App.toast('角色「' + char.name + '」已使用！', 'success');
    this.renderGrid();
    this.updatePreview();
  },

  // ================================================================
  // 更新预览
  // ================================================================
  updatePreview() {
    const char = this.state.characters.find(c => c.id === this.state.selectedId);
    const frame = document.getElementById('char-preview-frame');
    const info = document.getElementById('char-preview-info');
    const equipBtn = document.getElementById('btn-equip-char');
    const skinSelector = document.getElementById('skin-selector');
    const skinList = document.getElementById('skin-list');

    if (char && frame) {
      frame.innerHTML = char.previewUrl
        ? `<img src="${char.previewUrl}" alt="${char.name}" style="width:100%;height:100%;object-fit:cover;object-position:top;">`
        : `<div style="font-size:64px;display:flex;align-items:center;justify-content:center;height:100%;">🕵️</div>`;
      frame.style.animation = 'popIn .4s var(--ease-spring)';
    }

    if (char && info) {
      const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
      info.innerHTML = `
        <div class="char-preview-name">${char.name}</div>
        <div class="char-preview-rarity badge-${char.rarity === 'legendary' ? 'gold' : char.rarity === 'epic' ? 'red' : 'accent'}">${rarityNames[char.rarity] || '普通'}</div>
      `;
    }

    if (equipBtn) {
      equipBtn.style.display = (char && char.id !== this.state.equippedId) ? '' : 'none';
    }

    // 渲染皮肤选择器
    if (char && char.availableSkins && char.availableSkins.length > 1 && skinSelector && skinList) {
      skinSelector.classList.remove('hidden');
      skinList.innerHTML = char.availableSkins.map(skin => {
        const isActive = char.skinId === skin.skinId;
        return `
          <div class="skin-slot ${isActive ? 'active' : ''}" data-skin-id="${skin.skinId}" data-preview="${skin.previewUrl}">
            <div class="skin-slot-img">
              ${skin.previewUrl ? `<img src="${skin.previewUrl}" alt="${skin.name}">` : '<span>🎭</span>'}
            </div>
            <div class="skin-slot-name">${skin.name}</div>
            ${isActive ? '<div class="skin-slot-badge">使用中</div>' : ''}
          </div>`;
      }).join('');

      // 绑定皮肤切换事件
      skinList.querySelectorAll('.skin-slot').forEach(slot => {
        slot.addEventListener('click', () => {
          const skinId = slot.dataset.skinId;
          const previewUrl = slot.dataset.preview;
          // 更新角色数据和预览
          char.skinId = skinId;
          char.previewUrl = previewUrl;
          // 如果是已装备角色，同步更新大厅立绘
          if (char.id === this.state.equippedId) {
            if (V2App.user.equippedCharacter) {
              V2App.user.equippedCharacter.skinId = skinId;
              V2App.user.equippedCharacter.portraitUrl = previewUrl;
            }
            V2App.updateLobbyHero(previewUrl);
          }
          // 更新预览图
          if (frame) {
            frame.innerHTML = `<img src="${previewUrl}" alt="${char.name}" style="width:100%;height:100%;object-fit:cover;object-position:top;">`;
            frame.style.animation = 'popIn .4s var(--ease-spring)';
          }
          // 更新选中状态
          skinList.querySelectorAll('.skin-slot').forEach(s => {
            s.classList.remove('active');
            const badge = s.querySelector('.skin-slot-badge');
            if (badge) badge.remove();
          });
          slot.classList.add('active');
          const badge = document.createElement('div');
          badge.className = 'skin-slot-badge';
          badge.textContent = '使用中';
          slot.appendChild(badge);
          V2App.toast('皮肤已切换：' + (slot.querySelector('.skin-slot-name')?.textContent || skinId));
        });
      });
    } else if (skinSelector) {
      skinSelector.classList.add('hidden');
    }
  },

  // ================================================================
  // 抽卡
  // ================================================================
  async doGacha(type) {
    if (!V2App.user.unlocked) {
      V2App.toast('需先解锁角色系统', 'error');
      V2App.showPage('shop');
      return;
    }

    // 检查每日次数
    const pullCount = type === 'ten' ? 10 : 1;
    if (this.state.dailyCount + pullCount > this.state.dailyLimit) {
      V2App.toast(`今日召唤次数已用完（${this.state.dailyLimit}次/天），明天再来吧`, 'error');
      return;
    }

    const res = await V2App.callFn('characterManager', { action: 'gacha', type: type === 'ten' ? 'ten' : 'single' });

    if (res && res.code === 0) {
      const data = res.data || res;
      this.state.pity = data.pity || this.state.pity;

      const pulled = data.characters || [];
      if (pulled.length > 0) {
        // 更新每日计数
        this.state.dailyCount += pulled.length;
        this.saveDailyCount();

        // 合并到已有角色（重复则累加 count）
        pulled.forEach(c => {
          const existing = this.state.characters.find(e => e.characterId === c.characterId);
          if (existing) {
            existing.count = (existing.count || 1) + 1;
          } else {
            c.count = 1;
            this.state.characters.push(c);
          }
        });
        this.renderGrid();
        this.updateDailyDisplay();

        // 显示抽卡动画
        if (pulled.length === 1) {
          this.showSingleReveal(pulled[0]);
        } else {
          this.showTenReveal(pulled);
        }
      }
    }
  },

  // ================================================================
  // 每日抽卡计数管理
  // ================================================================
  loadDailyCount() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const saved = localStorage.getItem('guimiju_gacha_daily');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === today) {
          this.state.dailyCount = parsed.count;
          this.state.dailyDate = today;
          return;
        }
      } catch (e) { /* 忽略损坏数据 */ }
    }
    // 新的一天或无数据，重置
    this.state.dailyCount = 0;
    this.state.dailyDate = today;
    this.saveDailyCount();
  },

  saveDailyCount() {
    localStorage.setItem('guimiju_gacha_daily', JSON.stringify({
      date: this.state.dailyDate,
      count: this.state.dailyCount
    }));
  },

  updateDailyDisplay() {
    const el = document.getElementById('gacha-daily-left');
    if (el) el.textContent = this.state.dailyLimit - this.state.dailyCount;
  },

  // ================================================================
  // 单抽揭示动画
  // ================================================================
  showSingleReveal(char) {
    const rarityColors = {
      common: 'rgba(200,200,200,0.4)',
      rare: 'rgba(60,130,220,0.5)',
      epic: 'rgba(160,60,220,0.5)',
      legendary: 'rgba(212,168,83,0.7)'
    };
    const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
    const color = rarityColors[char.rarity] || rarityColors.common;

    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.9);' +
      'display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;' +
      'animation:fadeIn .3s ease-out;cursor:pointer;';
    overlay.innerHTML = `
      <div style="width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,${color},transparent);
        animation:revealPulse .8s ease-out;"></div>
      ${char.previewUrl
        ? `<div style="width:100px;height:100px;border-radius:12px;overflow:hidden;animation:popIn .5s var(--ease-spring);
            box-shadow:0 4px 20px rgba(0,0,0,0.5);"><img src="${char.previewUrl}" alt="${char.name}"
            style="width:100%;height:100%;object-fit:cover;object-position:top;"></div>`
        : `<div style="font-size:48px;animation:popIn .5s var(--ease-spring);">${char.emoji || '🎭'}</div>`}
      <div style="font-size:18px;font-weight:700;color:var(--gold);letter-spacing:2px;">${char.name}</div>
      <div style="font-size:12px;color:var(--text-muted);">${rarityNames[char.rarity] || '普通'}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">点击任意处关闭</div>
    `;
    // 传说全屏闪光
    if (char.rarity === 'legendary') {
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;inset:0;z-index:99;background:rgba(212,168,83,0.6);' +
        'animation:flashFade .8s ease-out forwards;pointer-events:none;';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 800);
    }
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      overlay.style.animation = 'fadeOut .3s ease-out forwards';
      setTimeout(() => overlay.remove(), 300);
    }, { once: true });
  },

  // ================================================================
  // 十连揭示动画
  // ================================================================
  showTenReveal(pulled) {
    const rarityColors = {
      common: { bg: 'rgba(200,200,200,0.15)', border: 'rgba(200,200,200,0.3)', text: '#ccc' },
      rare:    { bg: 'rgba(60,130,220,0.15)',   border: 'rgba(60,130,220,0.4)',   text: '#5a9ada' },
      epic:    { bg: 'rgba(160,60,220,0.15)',  border: 'rgba(160,60,220,0.4)',  text: '#b070d0' },
      legendary:{ bg: 'rgba(212,168,83,0.2)',  border: 'rgba(212,168,83,0.5)',  text: '#d4a853' }
    };
    const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };

    // 按稀有度排序（传说在最前）
    const sorted = [...pulled].sort((a, b) => {
      const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return (order[a.rarity] || 3) - (order[b.rarity] || 3);
    });

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.92);' +
      'overflow-y:auto;padding:40px 16px 60px;animation:fadeIn .3s ease-out;';
    overlay.innerHTML = `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:14px;color:var(--text-muted);letter-spacing:2px;margin-bottom:8px;">召唤结果</div>
        <div style="font-size:12px;color:var(--text-dim);">
          传说 ${sorted.filter(c=>c.rarity==='legendary').length} · 
          史诗 ${sorted.filter(c=>c.rarity==='epic').length} · 
          稀有 ${sorted.filter(c=>c.rarity==='rare').length} · 
          普通 ${sorted.filter(c=>c.rarity==='common').length}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-width:360px;margin:0 auto;" id="gacha-reveal-grid">
        ${sorted.map((c, i) => {
          const rc = rarityColors[c.rarity] || rarityColors.common;
          return `<div class="gacha-reveal-card" data-index="${i}" data-name="${c.name}" 
            data-rarity="${c.rarity}" data-emoji="${c.emoji||'🎭'}"
            style="background:${rc.bg};border:2px solid ${rc.border};border-radius:10px;padding:12px 4px;
            text-align:center;opacity:0;transform:scale(0.5);transition:all .4s var(--ease-spring);
            cursor:pointer;">
            ${c.previewUrl
              ? `<div style="width:52px;height:52px;border-radius:8px;overflow:hidden;margin:0 auto 4px;">
                  <img src="${c.previewUrl}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;object-position:top;"></div>`
              : `<div style="font-size:28px;margin-bottom:4px;">${c.emoji || '🎭'}</div>`}
            <div style="font-size:10px;font-weight:600;color:${rc.text};line-height:1.3;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
            <div style="font-size:8px;color:${rc.text};opacity:0.7;margin-top:2px;">
              ${rarityNames[c.rarity]||'普通'}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="text-align:center;margin-top:24px;">
        <button class="btn btn-primary" id="btn-close-gacha" 
          style="min-width:160px;">确认</button>
      </div>
    `;

    // 传说闪光
    if (sorted.some(c => c.rarity === 'legendary')) {
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;inset:0;z-index:99;background:rgba(212,168,83,0.5);' +
        'animation:flashFade 1s ease-out forwards;pointer-events:none;';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 1000);
    }

    document.body.appendChild(overlay);

    // 逐个揭示动画
    const cards = overlay.querySelectorAll('.gacha-reveal-card');
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
        // 传说级额外闪光
        if (card.dataset.rarity === 'legendary') {
          card.style.boxShadow = '0 0 20px rgba(212,168,83,0.5), 0 0 40px rgba(212,168,83,0.2)';
        } else if (card.dataset.rarity === 'epic') {
          card.style.boxShadow = '0 0 12px rgba(160,60,220,0.3)';
        }
      }, 100 + i * 200);
    });

    // 关闭按钮
    overlay.querySelector('#btn-close-gacha').addEventListener('click', () => {
      overlay.style.animation = 'fadeOut .3s ease-out forwards';
      setTimeout(() => overlay.remove(), 300);
    });
  }
};

// ================================================================
// 角色页专用样式
// ================================================================
(function injectCharacterStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Character Preview */
    .char-preview{position:relative;width:100%;height:200px;border-radius:var(--radius);
      background:rgba(0,0,0,0.3);border:1px solid var(--border);
      overflow:hidden;margin-bottom:16px;display:flex;align-items:flex-end;}
    .char-preview-frame{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
    .char-preview-placeholder{font-size:64px;opacity:0.3;}
    .char-preview-info{position:relative;z-index:2;padding:12px 16px;
      background:linear-gradient(0deg,rgba(8,8,18,0.95),transparent);width:100%;}
    .char-preview-name{font-size:18px;font-weight:700;color:var(--gold);letter-spacing:2px;}
    .char-preview-rarity{margin-top:4px;display:inline-block;}

    /* Tabs */
    .char-tabs{display:flex;gap:8px;margin-bottom:14px;}
    .char-tab{flex:1;padding:10px;border-radius:var(--radius-sm);
      background:var(--bg-input);border:1px solid var(--border);color:var(--text-muted);
      font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;
      transition:all .2s;letter-spacing:1px;}
    .char-tab.active{background:rgba(212,168,83,0.08);color:var(--gold);border-color:var(--border-gold);}
    .char-tab-content.hidden{display:none;}

    /* Character Grid */
    .char-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
    .char-card{position:relative;border-radius:var(--radius-sm);border:2px solid var(--border);
      overflow:hidden;cursor:pointer;transition:all .25s var(--ease-out);
      background:var(--bg-elevated);}
    .char-card:hover{transform:translateY(-2px);}
    .char-card.selected{border-color:var(--gold);box-shadow:0 0 12px var(--gold-glow);}
    .char-card.equipped{border-color:var(--forest-bright);}
    .char-card-img{width:100%;height:90px;overflow:hidden;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(180deg,var(--bg-elevated),var(--bg-input));}
    .char-card-img img{width:100%;height:100%;object-fit:cover;object-position:top;}
    .char-card-name{padding:6px 8px;font-size:11px;font-weight:600;color:var(--text);text-align:center;
      background:rgba(0,0,0,0.2);letter-spacing:1px;}
    .char-card-equipped{position:absolute;top:4px;right:4px;font-size:8px;padding:1px 6px;border-radius:4px;
      background:var(--forest);color:#d0f0d8;font-weight:600;}
    .char-card-count{position:absolute;bottom:26px;right:4px;font-size:10px;padding:1px 6px;border-radius:4px;
      background:rgba(212,168,83,0.85);color:#1a1a2e;font-weight:800;letter-spacing:0.5px;
      box-shadow:0 1px 4px rgba(0,0,0,0.3);}
    .char-card-check{position:absolute;top:4px;left:4px;font-size:12px;color:var(--gold);font-weight:700;}

    /* 使用按钮 */
    .char-card-use-btn{display:block;width:100%;padding:4px 0;margin:0;border:none;
      background:linear-gradient(135deg,rgba(212,168,83,0.15),rgba(240,200,96,0.1));
      color:var(--gold);font-size:11px;font-weight:700;cursor:pointer;
      font-family:var(--font);letter-spacing:1px;
      border-top:1px solid rgba(212,168,83,0.12);
      transition:all .2s;}
    .char-card-use-btn:hover{background:linear-gradient(135deg,rgba(212,168,83,0.25),rgba(240,200,96,0.18));
      color:var(--gold-bright);}
    .char-card-use-btn:active{transform:scale(0.96);background:rgba(212,168,83,0.3);}

    /* Rarity card borders */
    .char-card.rarity-rare{border-color:rgba(90,138,170,0.2);}
    .char-card.rarity-rare.selected{border-color:var(--blue);}
    .char-card.rarity-epic{border-color:rgba(139,58,74,0.2);}
    .char-card.rarity-epic.selected{border-color:var(--crimson);}
    .char-card.rarity-legendary{border-color:rgba(212,168,83,0.25);
      box-shadow:0 0 8px rgba(212,168,83,0.1);}
    .char-card.rarity-legendary.selected{border-color:var(--gold);
      box-shadow:0 0 16px var(--gold-glow);}

    /* Gacha Section */
    .gacha-section{text-align:center;}
    .gacha-banner{padding:20px;border-radius:var(--radius);
      background:linear-gradient(180deg,rgba(212,168,83,0.08),rgba(139,58,74,0.04));
      border:1px solid var(--border-gold);margin-bottom:14px;}
    .gacha-title{font-size:18px;font-weight:700;color:var(--gold);letter-spacing:2px;margin-bottom:4px;}
    .gacha-desc{font-size:12px;color:var(--text-dim);margin-bottom:4px;}
    .gacha-daily{font-size:11px;color:var(--text-muted);margin-bottom:4px;}
    .gacha-daily span{color:var(--gold);font-weight:700;}
    .gacha-pity{font-size:11px;color:var(--crimson-bright);}
    .gacha-buttons{display:flex;gap:10px;margin-bottom:16px;}
    .gacha-buttons .btn{flex:1;}
    .gacha-buttons .cost{font-size:11px;opacity:0.7;}

    /* Gacha Pool */
    .gacha-pool{text-align:left;}
    .gacha-pool-title{font-size:12px;color:var(--text-muted);letter-spacing:2px;margin-bottom:8px;}
    .gacha-pool-list{display:flex;flex-wrap:wrap;gap:6px;}
    .gacha-char{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:var(--radius-sm);
      background:var(--bg-input);border:1px solid var(--border);font-size:11px;}
    .gacha-char-emoji{font-size:16px;}
    .gacha-char-name{color:var(--text);font-weight:600;}
    .gacha-char-rarity{font-size:9px;color:var(--text-muted);}
    .gacha-char.rarity-legendary{border-color:rgba(212,168,83,0.2);background:rgba(212,168,83,0.05);}
    .gacha-char.rarity-epic{border-color:rgba(139,58,74,0.2);background:rgba(139,58,74,0.04);}

    /* Actions */
    .char-actions{padding:12px 0;}

    /* Skin Selector */
    .skin-selector{margin:0 0 14px;padding:12px;border-radius:var(--radius);
      background:var(--bg-elevated);border:1px solid var(--border);}
    .skin-selector.hidden{display:none;}
    .skin-selector-title{font-size:12px;color:var(--text-muted);letter-spacing:2px;margin-bottom:10px;
      text-transform:uppercase;}
    .skin-list{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;
      -webkit-overflow-scrolling:touch;padding-bottom:4px;}
    .skin-list::-webkit-scrollbar{display:none;}
    .skin-slot{flex-shrink:0;width:72px;cursor:pointer;text-align:center;
      transition:all .25s var(--ease-out);border-radius:var(--radius-sm);
      border:2px solid transparent;padding:4px;}
    .skin-slot:hover{background:rgba(255,255,255,0.02);}
    .skin-slot.active{border-color:var(--gold);background:rgba(212,168,83,0.06);
      box-shadow:0 0 10px var(--gold-glow);}
    .skin-slot-img{width:64px;height:64px;border-radius:6px;overflow:hidden;
      background:var(--bg-input);display:flex;align-items:center;justify-content:center;}
    .skin-slot-img img{width:100%;height:100%;object-fit:cover;object-position:top;}
    .skin-slot-name{font-size:10px;color:var(--text-dim);margin-top:4px;line-height:1.3;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .skin-slot-badge{font-size:8px;color:var(--gold);font-weight:700;margin-top:2px;}
  `;
  document.head.appendChild(style);
})();


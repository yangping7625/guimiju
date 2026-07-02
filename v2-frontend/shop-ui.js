// ================================================================
// 诡谜局 V2 · 兑换码解锁页 — Shop UI (简化版)
// ================================================================

const ShopUI = {

  // ================================================================
  // 初始化
  // ================================================================
  async init() {
    await V2App.refreshUnlockStatus();
    this.render();
  },

  // ================================================================
  // 渲染
  // ================================================================
  render() {
    const container = document.getElementById('shop-content');
    if (!container) return;

    const unlocked = V2App.user && V2App.user.unlocked;

    if (unlocked) {
      container.innerHTML = `
        <div class="redeem-section">
          <div class="redeem-header">
            <img src="../assets/pi-detective-v1.png" alt="皮探长" class="pi-avatar-lg" style="width:100px;height:100px;object-fit:cover;border-radius:16px;margin-bottom:14px;border:2px solid var(--border-gold);box-shadow:0 0 20px var(--gold-glow);">
            <div class="redeem-icon">✅</div>
            <div class="redeem-title">已解锁完整版</div>
            <div class="redeem-subtitle">你已享有全部高级功能</div>
          </div>
          <div class="redeem-features">
            <div class="feature-item">
              <span class="feature-icon">👥</span>
              <span class="feature-text">多人联机 — 与好友组队推理</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎭</span>
              <span class="feature-text">角色收集 — 解锁全部侦探角色</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🌙</span>
              <span class="feature-text">主题皮肤 — 多套恐怖主题自由切换</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">♾️</span>
              <span class="feature-text">不限房间 — 随时创建推理房间</span>
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="redeem-section">
          <div class="redeem-header">
            <img src="../assets/pi-detective-v1.png" alt="皮探长" class="pi-avatar-lg" style="width:100px;height:100px;object-fit:cover;border-radius:16px;margin-bottom:14px;border:2px solid var(--border-gold);box-shadow:0 0 20px var(--gold-glow);">
            <div class="redeem-icon">🗝️</div>
            <div class="redeem-title">解锁完整版</div>
            <div class="redeem-subtitle">输入兑换码，解锁全部高级功能</div>
          </div>
          <div class="redeem-features">
            <div class="feature-item">
              <span class="feature-icon">👥</span>
              <span class="feature-text">多人联机 — 与好友组队推理</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎭</span>
              <span class="feature-text">角色收集 — 解锁全部侦探角色</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🌙</span>
              <span class="feature-text">主题皮肤 — 多套恐怖主题自由切换</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">♾️</span>
              <span class="feature-text">不限房间 — 随时创建推理房间</span>
            </div>
          </div>
          <div class="redeem-form">
            <input type="text" id="redeem-code-input" class="redeem-input"
                   placeholder="请输入兑换码" maxlength="32" autocomplete="off" />
            <button class="btn btn-gold btn-block" id="btn-redeem">立即兑换</button>
            <div id="redeem-message" class="redeem-message"></div>
          </div>
          <div class="redeem-guide">
            <span class="guide-text">联系客服获取兑换码</span>
            <span class="guide-contact">微信号：请添加客服微信</span>
          </div>
        </div>
      `;
      this.bindEvents();
    }
  },

  // ================================================================
  // 绑定事件
  // ================================================================
  bindEvents() {
    const input = document.getElementById('redeem-code-input');
    const btn = document.getElementById('btn-redeem');
    if (!input || !btn) return;

    btn.addEventListener('click', () => this.handleRedeem());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleRedeem();
    });
  },

  // ================================================================
  // 兑换逻辑
  // ================================================================
  async handleRedeem() {
    const input = document.getElementById('redeem-code-input');
    const btn = document.getElementById('btn-redeem');
    const msgEl = document.getElementById('redeem-message');
    if (!input || !btn) return;

    const code = input.value.trim();
    if (!code) {
      this.showMessage('请输入兑换码', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = '兑换中...';
    this.showMessage('', '');

    try {
      const res = await V2App.redeemCode(code);
      if (res && res.code === 0) {
        this.showMessage('兑换成功！正在刷新...', 'success');
        setTimeout(() => location.reload(), 1500);
      } else {
        const errMsg = (res && res.message) || '兑换失败，请检查兑换码是否正确';
        this.showMessage(errMsg, 'error');
        btn.disabled = false;
        btn.textContent = '立即兑换';
      }
    } catch (err) {
      this.showMessage('网络异常，请稍后重试', 'error');
      btn.disabled = false;
      btn.textContent = '立即兑换';
    }
  },

  // ================================================================
  // 显示提示消息
  // ================================================================
  showMessage(text, type) {
    const msgEl = document.getElementById('redeem-message');
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'redeem-message' + (type ? ' msg-' + type : '');
  }
};

// ================================================================
// 兑换码页专用样式
// ================================================================
(function injectShopStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Redeem Section */
    .redeem-section{padding:16px 0;max-width:420px;margin:0 auto;}

    .redeem-header{text-align:center;margin-bottom:24px;}
    .redeem-icon{font-size:48px;margin-bottom:12px;}
    .redeem-title{font-size:20px;font-weight:700;color:var(--text);letter-spacing:1px;margin-bottom:6px;}
    .redeem-subtitle{font-size:13px;color:var(--text-muted);line-height:1.6;}

    /* Feature List */
    .redeem-features{margin-bottom:28px;}
    .feature-item{display:flex;align-items:center;gap:12px;padding:10px 14px;
      border-radius:var(--radius-sm);background:var(--bg-input);margin-bottom:6px;
      border:1px solid var(--border);}
    .feature-icon{font-size:20px;flex-shrink:0;}
    .feature-text{font-size:13px;color:var(--text);letter-spacing:0.5px;}

    /* Redeem Form */
    .redeem-form{margin-bottom:20px;}
    .redeem-input{width:100%;padding:12px 14px;border-radius:var(--radius);
      border:1px solid var(--border);background:var(--bg-input);color:var(--text);
      font-family:var(--font);font-size:14px;letter-spacing:1px;text-align:center;
      outline:none;transition:border-color .2s;}
    .redeem-input::placeholder{color:var(--text-dim);letter-spacing:0;}
    .redeem-input:focus{border-color:var(--gold);}

    .redeem-message{margin-top:10px;font-size:12px;text-align:center;min-height:18px;}
    .redeem-message.msg-success{color:var(--forest);}
    .redeem-message.msg-error{color:var(--crimson-bright);}

    /* Guide */
    .redeem-guide{text-align:center;padding:16px;
      border-radius:var(--radius);border:1px dashed var(--border);
      background:rgba(212,168,83,0.03);}
    .guide-text{display:block;font-size:12px;color:var(--text-muted);margin-bottom:6px;}
    .guide-contact{display:block;font-size:13px;color:var(--gold);font-weight:600;}
  `;
  document.head.appendChild(style);
})();

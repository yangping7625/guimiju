// ================================================================
// 诡谜局 V2 · 结算页 — Result UI
// 游戏结束后的评分、排行、线索回顾、分享、再来一局
// ================================================================

const ResultPage = {
  state: {
    correct: false,
    score: 0,
    grade: 'F',
    players: [],
    winnerId: null,
    chatLog: [],
    puzzleTitle: '',
    puzzleAnswer: '',
    timeSpent: 0,
    questionsCount: 0,
    isSolo: false,
    rewarded: true
  },

  // ================================================================
  // 显示结算
  // ================================================================
  show(data) {
    Object.assign(this.state, {
      correct: data.correct || false,
      score: data.score || 0,
      grade: data.grade || 'F',
      players: data.players || [],
      winnerId: data.winnerId,
      chatLog: data.chatLog || [],
      puzzleTitle: data.puzzleTitle || '未知谜题',
      puzzleAnswer: data.puzzleAnswer || '',
      timeSpent: data.timeSpent || 0,
      questionsCount: data.questionsCount || 0,
      isSolo: data.isSolo || false,
      rewarded: data.rewarded !== false
    });

    this.render();
    V2App.showPage('result');
  },

  // ================================================================
  // 渲染
  // ================================================================
  render() {
    const container = document.getElementById('result-content');
    if (!container) return;

    const s = this.state;
    const winner = s.players.find(p => p.id === s.winnerId);
    const isWinner = s.correct || (winner && (winner.id === 'player_1'));
    const isSolo = s.isSolo;
    const gradeColors = {
      S: 'color:var(--gold);text-shadow:0 0 20px var(--gold-glow);',
      A: 'color:var(--forest-bright);',
      B: 'color:var(--blue);',
      C: 'color:var(--purple);',
      D: 'color:var(--orange);',
      F: 'color:var(--crimson-bright);',
      '练习': 'color:var(--text-dim);'
    };
    const gradeDesc = {
      S: '神探降临！完美的推理！',
      A: '出色的推理能力！',
      B: '不错的表现，接近真相了',
      C: '还需多多练习',
      D: '差强人意，加油',
      F: '再接再厉...',
      '练习': '单人练习模式 · 推理能力稳步提升中'
    };

    container.innerHTML = `
      <!-- Result Hero -->
      <div class="result-hero ${isWinner ? 'victory' : 'defeat'}">
        <div class="result-emotion">${isWinner ? '🎉' : '🔮'}</div>
        <div class="result-grade" style="${gradeColors[s.grade] || ''}">${isSolo ? '练习' : s.grade}</div>
        <div class="result-grade-desc">${gradeDesc[s.grade] || gradeDesc.F}</div>
        ${isSolo
          ? '<div class="result-badge solo-badge">🧩 练习模式 · 不计分</div>'
          : (isWinner ? '<div class="result-badge victory-badge">真相大白</div>' : '<div class="result-badge defeat-badge">谜底揭晓</div>')}
        ${isSolo ? `
        <div class="solo-notice">
          <div class="solo-notice-icon">💡</div>
          <div class="solo-notice-text">
            单人练习不计算积分和成就<br>
            <strong>邀请好友联机对战，赢取积分、解锁成就！</strong>
          </div>
        </div>` : ''}
      </div>

      <!-- Stats -->
      <div class="result-stats">
        <div class="stat-item">
          <div class="stat-value${isSolo ? ' stat-dimmed' : ''}">${isSolo ? '--' : s.score}</div>
          <div class="stat-label">得分${isSolo ? ' (练习不计分)' : ''}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${s.questionsCount}</div>
          <div class="stat-label">提问次数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${V2App.formatTime(s.timeSpent)}</div>
          <div class="stat-label">用时</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${isSolo ? '1' : s.players.length}</div>
          <div class="stat-label">${isSolo ? '单人练习' : '参与人数'}</div>
        </div>
      </div>

      <!-- Winner Info (only in multiplayer) -->
      ${!isSolo && winner ? `
      <div class="result-winner">
        <div class="winner-label">🏆 率先破解真相</div>
        <div class="winner-info">
          <span class="winner-avatar">${winner.avatar || '🕵️'}</span>
          <span class="winner-name">${winner.name}</span>
        </div>
      </div>` : ''}

      <!-- Player Rankings (only in multiplayer) -->
      ${!isSolo ? `
      <div class="result-rankings">
        <div class="rankings-title">玩家排行</div>
        <div class="rankings-list">
          ${s.players.map((p, i) => `
            <div class="rank-item ${p.id === s.winnerId ? 'rank-first' : ''}">
              <span class="rank-num">${i + 1}</span>
              <span class="rank-avatar">${p.avatar || '🕵️'}</span>
              <span class="rank-name">${p.name}</span>
              <span class="rank-questions">${p.questionCount || 0} 问</span>
              ${p.id === s.winnerId ? '<span class="rank-crown">👑</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Answer Reveal -->
      <div class="result-answer parchment-panel">
        <div class="wax-seal wax-seal-top"></div>
        <div class="paper-badge">真相揭晓</div>
        <div class="paper-title">${s.puzzleTitle}</div>
        <div class="paper-body">${s.puzzleAnswer}</div>
      </div>

      <!-- Clue Review -->
      ${s.chatLog.filter(e => e.type === 'answer').length > 0 ? `
      <div class="result-clues">
        <div class="rankings-title">线索回顾</div>
        <div class="clue-review-list">
          ${s.chatLog.filter(e => e.type === 'answer').map((a, i) => `
            <div class="clue-review-item">
              <span class="clue-review-num">${i + 1}</span>
              <span class="clue-review-text">${a.content}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Actions -->
      <div class="result-actions">
        <button class="btn btn-gold btn-block" id="btn-play-again">${isSolo ? '再练一题' : '再来一局'}</button>
        ${isSolo ? `
        <button class="btn btn-primary btn-block" id="btn-invite-friends">📨 邀请好友联机对战</button>
        ` : `
        <button class="btn btn-ghost btn-block" id="btn-share">分享战绩</button>
        `}
        <button class="btn btn-ghost btn-block" id="btn-back-lobby">返回大厅</button>
      </div>
    `;

    this.bindEvents();
  },

  // ================================================================
  // 绑定事件
  // ================================================================
  bindEvents() {
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      // 回到大厅并自动创建房间（solo 模式下创建 solo 房间）
      V2App.showPage('lobby');
      if (this.state.isSolo) {
        document.getElementById('btn-solo-mode')?.click();
      } else {
        document.getElementById('btn-create-room')?.click();
      }
    });

    document.getElementById('btn-back-lobby')?.addEventListener('click', () => {
      V2App.showPage('lobby');
    });

    document.getElementById('btn-invite-friends')?.addEventListener('click', () => {
      // 引导创建联机房间 + 复制邀请码
      V2App.showPage('lobby');
      // 延迟一下让 lobby 渲染完
      setTimeout(() => {
        document.getElementById('btn-create-room')?.click();
        V2App.toast('创建联机房间后，将房间码发给好友即可一起推理！', 'info');
      }, 300);
    });

    document.getElementById('btn-share')?.addEventListener('click', () => {
      this.generateShareImage();
    });
  },

  // ================================================================
  // 生成分享战绩图片
  // ================================================================
  generateShareImage() {
    const s = this.state;
    const W = 720, H = 960;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 背景：暗黑渐变
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0a0a14');
    bgGrad.addColorStop(0.5, '#10101e');
    bgGrad.addColorStop(1, '#080812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 装饰线
    ctx.strokeStyle = 'rgba(212,168,83,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.strokeRect(35, 35, W - 70, H - 70);

    // 标题区
    ctx.fillStyle = '#d4a853';
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🕯️ 诡谜局 · 多人推理', W / 2, 80);

    // 分隔线
    ctx.strokeStyle = 'rgba(212,168,83,0.2)';
    ctx.beginPath(); ctx.moveTo(80, 100); ctx.lineTo(W - 80, 100); ctx.stroke();

    // 谜题名
    ctx.fillStyle = '#e8e2d0';
    ctx.font = 'bold 28px serif';
    ctx.fillText(s.puzzleTitle || '未知谜题', W / 2, 150);

    // 类型标签
    ctx.fillStyle = '#8b3a4a';
    ctx.font = '14px serif';
    ctx.fillText(s.puzzleType || '推理', W / 2, 178);

    // 评级 — 大字居中
    const gradeColors = { S: '#d4a853', A: '#5a9ada', B: '#5aaa5a', C: '#c08040', D: '#888', F: '#c45050' };
    ctx.fillStyle = gradeColors[s.grade] || '#d4a853';
    ctx.font = 'bold 120px serif';
    ctx.fillText(s.grade || 'B', W / 2, 320);
    // 评级光环
    const gGrad = ctx.createRadialGradient(W / 2, 280, 20, W / 2, 280, 100);
    gGrad.addColorStop(0, (gradeColors[s.grade] || '#d4a853') + '20');
    gGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = gGrad;
    ctx.fillRect(W / 2 - 120, 180, 240, 200);

    // 统计数据 — 横排
    const stats = [
      { label: '得分', value: s.score || 0, icon: '🏆' },
      { label: '提问', value: s.questionsCount || 0, icon: '❓' },
      { label: '用时', value: s.timeUsed || '0:00', icon: '⏱️' },
      { label: '玩家', value: s.playersCount || 4, icon: '👥' }
    ];
    const statY = 420;
    const statW = (W - 120) / 4;
    stats.forEach((st, i) => {
      const x = 60 + statW * i + statW / 2;
      ctx.fillStyle = 'rgba(212,168,83,0.06)';
      ctx.beginPath();
      ctx.roundRect(x - 55, statY - 20, 110, 100, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(212,168,83,0.15)';
      ctx.stroke();
      ctx.fillStyle = '#9a9282';
      ctx.font = '12px serif';
      ctx.fillText(st.icon, x, statY + 10);
      ctx.fillStyle = '#e8e2d0';
      ctx.font = 'bold 28px serif';
      ctx.fillText(String(st.value), x, statY + 48);
      ctx.fillStyle = '#5e574a';
      ctx.font = '12px serif';
      ctx.fillText(st.label, x, statY + 70);
    });

    // 正确答案区
    if (s.answer) {
      ctx.strokeStyle = 'rgba(139,58,74,0.2)';
      ctx.beginPath(); ctx.moveTo(80, 560); ctx.lineTo(W - 80, 560); ctx.stroke();
      ctx.fillStyle = '#8b3a4a';
      ctx.font = '14px serif';
      ctx.fillText('【真相揭示】', W / 2, 590);

      // 羊皮纸背景
      ctx.fillStyle = 'rgba(232,220,200,0.05)';
      ctx.beginPath();
      ctx.roundRect(60, 610, W - 120, 160, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,220,200,0.1)';
      ctx.stroke();

      // 答案文字（自动换行）
      ctx.fillStyle = '#e8dcc8';
      ctx.font = '15px serif';
      const maxChars = 24;
      const answerText = s.answer || '未知答案';
      let line = '';
      let y = 645;
      for (let i = 0; i < answerText.length; i++) {
        line += answerText[i];
        if (line.length >= maxChars || i === answerText.length - 1) {
          ctx.fillText(line, W / 2, y);
          y += 26;
          line = '';
        }
      }
    }

    // 排名列表
    if (s.rankings && s.rankings.length > 0) {
      ctx.strokeStyle = 'rgba(212,168,83,0.2)';
      ctx.beginPath(); ctx.moveTo(80, 800); ctx.lineTo(W - 80, 800); ctx.stroke();
      ctx.fillStyle = '#9a9282';
      ctx.font = '13px serif';
      ctx.fillText('【最终排名】', W / 2, 828);

      s.rankings.slice(0, 4).forEach((r, i) => {
        const y = 858 + i * 28;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        ctx.fillStyle = i === 0 ? '#d4a853' : '#9a9282';
        ctx.font = '14px serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${medal} ${r.name || '玩家'}`, 120, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${r.score || 0}分`, W - 120, y);
        ctx.textAlign = 'center';
      });
    }

    // 底部二维码占位
    ctx.fillStyle = '#3a3428';
    ctx.font = '12px serif';
    ctx.fillText('诡谜局 · AI海龟汤多人推理', W / 2, H - 50);

    // 导出图片
    canvas.toBlob(blob => {
      if (!blob) { V2App.toast('图片生成失败', 'error'); return; }
      const url = URL.createObjectURL(blob);
      // 尝试 Web Share API
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], '诡谜局战绩.png', { type: 'image/png' });
        const item = { files: [file], title: '诡谜局战绩' };
        if (navigator.canShare(item)) {
          navigator.share(item).catch(() => this._downloadShareImage(url));
          return;
        }
      }
      this._downloadShareImage(url);
    }, 'image/png');
  },

  _downloadShareImage(url) {
    const a = document.createElement('a');
    a.href = url; a.download = '诡谜局战绩.png';
    document.body.appendChild(a); a.click(); a.remove();
    V2App.toast('战绩图已保存', 'success');
  }
};

// ================================================================
// 结算页专用样式
// ================================================================
(function injectResultStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Result Hero */
    .result-hero{text-align:center;padding:32px 20px 24px;
      background:linear-gradient(180deg,rgba(212,168,83,0.06),transparent);}
    .result-hero.victory{background:linear-gradient(180deg,rgba(212,168,83,0.1),transparent);}
    .result-hero.defeat{background:linear-gradient(180deg,rgba(139,58,74,0.06),transparent);}
    .result-emotion{font-size:48px;margin-bottom:8px;animation:float 3s ease-in-out infinite;}
    .result-grade{font-size:72px;font-weight:900;letter-spacing:8px;line-height:1;
      font-family:var(--font-gothic);animation:popIn .6s var(--ease-spring);}
    .result-grade-desc{font-size:14px;color:var(--text-dim);margin-top:8px;letter-spacing:2px;}
    .result-badge{display:inline-block;margin-top:12px;padding:4px 16px;border-radius:20px;
      font-size:11px;font-weight:600;letter-spacing:2px;}
    .victory-badge{background:rgba(212,168,83,0.15);color:var(--gold);border:1px solid var(--border-gold);}
    .defeat-badge{background:rgba(139,58,74,0.1);color:var(--crimson-bright);border:1px solid rgba(139,58,74,0.15);}
    .solo-badge{background:rgba(180,160,200,0.1);color:var(--text-dim);border:1px solid rgba(180,160,200,0.15);}

    /* Solo mode notice */
    .solo-notice{margin-top:16px;padding:12px 16px;border-radius:var(--radius-sm);
      background:rgba(100,140,200,0.06);border:1px solid rgba(100,140,200,0.12);
      display:flex;align-items:center;gap:12px;text-align:left;}
    .solo-notice-icon{font-size:24px;flex-shrink:0;}
    .solo-notice-text{font-size:12px;line-height:1.6;color:var(--text-dim);}
    .solo-notice-text strong{color:var(--gold);}
    .stat-dimmed{color:var(--text-muted) !important;text-shadow:none !important;}

    /* Stats Grid */
    .result-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px;padding:0 4px;}
    .stat-item{text-align:center;padding:14px 8px;border-radius:var(--radius-sm);
      background:var(--bg-elevated);border:1px solid var(--border);}
    .stat-value{font-size:22px;font-weight:800;color:var(--gold);
      font-variant-numeric:tabular-nums;text-shadow:0 0 8px var(--gold-glow);}
    .stat-label{font-size:10px;color:var(--text-muted);margin-top:4px;letter-spacing:1px;}

    /* Winner */
    .result-winner{text-align:center;padding:16px;margin:0 16px;border-radius:var(--radius);
      background:rgba(212,168,83,0.04);border:1px solid var(--border-gold);}
    .winner-label{font-size:13px;color:var(--gold);font-weight:600;letter-spacing:2px;margin-bottom:8px;}
    .winner-info{display:flex;align-items:center;justify-content:center;gap:10px;}
    .winner-avatar{font-size:28px;}
    .winner-name{font-size:16px;font-weight:700;color:var(--text);letter-spacing:1px;}

    /* Rankings */
    .result-rankings{padding:16px 16px 0;}
    .rankings-title{font-size:13px;color:var(--text-muted);letter-spacing:2px;margin-bottom:10px;
      text-transform:uppercase;}
    .rank-item{display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;
      border-radius:var(--radius-sm);background:var(--bg-elevated);border:1px solid var(--border);
      transition:all .2s;}
    .rank-item.rank-first{border-color:var(--border-gold);background:rgba(212,168,83,0.04);}
    .rank-num{font-size:14px;font-weight:700;color:var(--text-muted);min-width:18px;text-align:center;}
    .rank-item.rank-first .rank-num{color:var(--gold);}
    .rank-avatar{font-size:20px;}
    .rank-name{flex:1;font-size:13px;font-weight:600;color:var(--text);}
    .rank-questions{font-size:11px;color:var(--text-muted);}
    .rank-crown{font-size:14px;}

    /* Answer Reveal (reuse parchment panel) */
    .result-answer{margin:16px;position:relative;}

    /* Clue Review */
    .result-clues{padding:0 16px 16px;}
    .clue-review-list{margin-top:8px;}
    .clue-review-item{display:flex;gap:8px;padding:8px 10px;margin-bottom:4px;border-radius:6px;
      background:var(--bg-elevated);border-left:2px solid var(--crimson);
      font-size:12px;line-height:1.6;color:var(--text-dim);animation:slideUp .3s ease-out;}
    .clue-review-num{font-weight:700;color:var(--crimson);min-width:16px;font-size:11px;}
    .clue-review-text{flex:1;}

    /* Actions */
    .result-actions{padding:16px;display:flex;flex-direction:column;gap:8px;}
  `;
  document.head.appendChild(style);
})();

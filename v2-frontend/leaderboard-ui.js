// ================================================================
// 诡谜局 V2 · 排行榜 UI
// ================================================================

const LeaderboardUI = {
  state: {
    type: 'wins',    // 'wins' | 'score' | 'winRate'
    rankings: [],
    total: 0,
    loading: false,
    error: null
  },

  // ================================================================
  // 初始化
  // ================================================================
  async init() {
    await this.load('wins');
  },

  // ================================================================
  // 加载排行榜
  // ================================================================
  async load(type) {
    this.state.type = type;
    this.state.loading = true;
    this.state.error = null;
    this.render();

    try {
      const res = await V2App.callFn('leaderboard', { action: 'getRanking', type, limit: 50 });
      const data = res.data || res;
      if (data && data.rankings) {
        this.state.rankings = data.rankings;
        this.state.total = data.total || 0;
      }
    } catch (err) {
      this.state.error = '加载失败，请稍后再试';
      console.error('排行榜加载失败:', err);
    }

    this.state.loading = false;
    this.render();
  },

  // ================================================================
  // 渲染
  // ================================================================
  render() {
    const container = document.getElementById('leaderboard-content');
    if (!container) return;

    const { type, rankings, loading, error, total } = this.state;
    const myId = V2App.user.id;

    const tabClass = (t) => type === t ? 'active' : '';

    container.innerHTML = `
      <div class="leaderboard-container">
        <!-- Tab 切换 -->
        <div class="leaderboard-tabs">
          <button class="lb-tab ${tabClass('wins')}" onclick="LeaderboardUI.load('wins')">🏆 胜场排行</button>
          <button class="lb-tab ${tabClass('score')}" onclick="LeaderboardUI.load('score')">⭐ 积分排行</button>
          <button class="lb-tab ${tabClass('winRate')}" onclick="LeaderboardUI.load('winRate')">📊 胜率排行</button>
        </div>

        <!-- 加载中 -->
        ${loading ? `<div class="leaderboard-loading">🌀 加载中...</div>` : ''}

        <!-- 错误 -->
        ${error ? `<div class="leaderboard-error">${error}</div>` : ''}

        <!-- 排行榜列表 -->
        ${!loading && !error ? `
          <div class="leaderboard-list">
            ${rankings.length === 0
              ? '<div class="leaderboard-empty">暂无数据，快去玩一局吧！</div>'
              : rankings.map((r, i) => {
                  const isMe = r.id === myId;
                  const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                  const statValue = type === 'wins'
                    ? `${r.wins} 胜`
                    : type === 'score'
                      ? `${r.totalScore} 分`
                      : `${r.winRate}%`;

                  return `
                    <div class="leaderboard-item ${isMe ? 'is-me' : ''} ${i < 3 ? 'top-three' : ''}">
                      <span class="lb-rank">${rankIcon}</span>
                      <span class="lb-avatar">🕵️</span>
                      <div class="lb-info">
                        <div class="lb-name">${this.escapeHtml(r.name)} ${isMe ? '<span class="lb-me-tag">你</span>' : ''}</div>
                        <div class="lb-stats">
                          <span>${r.totalGames} 局</span>
                          <span>胜率 ${r.winRate}%</span>
                        </div>
                      </div>
                      <span class="lb-score">${statValue}</span>
                    </div>
                  `;
                }).join('')
            }
          </div>
          ${total > 50 ? `<div class="leaderboard-more">仅显示前50名，共 ${total} 人参与</div>` : ''}
        ` : ''}
      </div>

      <style>
        .leaderboard-container{padding:12px 0;}
        .leaderboard-tabs{display:flex;gap:6px;padding:0 16px 12px;overflow-x:auto;}
        .lb-tab{flex-shrink:0;padding:8px 14px;border-radius:14px;border:1px solid var(--border);
          background:var(--bg-elevated);color:var(--text-muted);font-size:12px;cursor:pointer;
          transition:all .2s;white-space:nowrap;}
        .lb-tab.active{background:var(--gold);color:#1a1005;border-color:var(--gold);font-weight:600;}
        .lb-tab:active{transform:scale(0.95);}
        .leaderboard-loading,.leaderboard-error,.leaderboard-empty{
          text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px;}
        .leaderboard-list{display:flex;flex-direction:column;gap:4px;padding:0 12px;}
        .leaderboard-item{display:flex;align-items:center;gap:10px;padding:10px 12px;
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);
          transition:all .2s;}
        .leaderboard-item.top-three{border-color:rgba(212,168,83,0.2);}
        .leaderboard-item.is-me{background:rgba(212,168,83,0.06);border-color:rgba(212,168,83,0.25);}
        .lb-rank{width:28px;text-align:center;font-size:16px;flex-shrink:0;font-weight:700;
          color:var(--text-muted);}
        .top-three .lb-rank{font-size:20px;}
        .lb-avatar{font-size:22px;flex-shrink:0;}
        .lb-info{flex:1;min-width:0;}
        .lb-name{font-size:13px;font-weight:600;color:var(--text);overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap;}
        .lb-me-tag{display:inline-block;font-size:10px;padding:1px 5px;border-radius:6px;
          background:var(--gold);color:#1a1005;font-weight:700;margin-left:4px;vertical-align:middle;}
        .lb-stats{display:flex;gap:10px;font-size:10px;color:var(--text-muted);margin-top:2px;}
        .lb-score{flex-shrink:0;font-size:14px;font-weight:700;color:var(--gold);}
        .leaderboard-more{text-align:center;padding:16px;font-size:11px;color:var(--text-muted);}
      </style>
    `;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};

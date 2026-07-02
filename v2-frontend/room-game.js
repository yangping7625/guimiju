// ================================================================
// 诡谜局 V2 · 房间游戏逻辑
// 提问/回答/猜测/同步/渲染
// ================================================================

const RoomGame = {
  // ===== 状态 =====
  state: {
    roomId: null,
    shareCode: null,
    hostId: null,
    status: 'waiting',       // waiting / playing / finished
    mode: 'turn',
    maxPlayers: 4,
    timeLimit: 15,
    timeRemaining: 900,
    currentTurnIndex: 0,
    players: [],
    chatLog: [],
    puzzle: null,
    winnerId: null,
    isMyTurn: false,
    questionCount: 0
  },

  timer: null,
  isSubmitting: false,
  pollTimer: null,         // 房间状态轮询（fallback）
  watchHandler: null,      // CloudBase Watch 实时监听
  useWatch: false,         // 是否启用 Watch（由初始化决定）
  lastChatCount: 0,        // 用于检测新消息
  lastPlayersJson: '',     // 用于检测玩家变化
  isPolling: false,        // 防止并发轮询
    watchRetries: 0,         // Watch 重连次数
    consecutiveFailures: 0,  // 连续失败计数
    maxConsecutiveFailures: 5, // 连续失败上限
    disconnectedNotified: false, // 是否已提示断线
    aiHintEnabled: true,    // AI 提示开关（true=显示解释，false=只显示是/否/无关）
    memoNotes: '',           // 推理板玩家笔记内容
    memoExpanded: false,     // 推理板是否展开

  // ================================================================
  // 进入房间
  // ================================================================
  async enterRoom(roomId) {
    this.state.roomId = roomId;
    this.state.chatLog = [];
    this.state.questionCount = 0;
    this.isSubmitting = false;
    this.lastChatCount = 0;
    this.lastPlayersJson = '';
    this.render();

    // 拉取房间最新状态
    const res = await V2App.callFn('roomManager', { action: 'getRoomState', roomId });
    if (res && res.code === 0 && res.data && res.data.room) {
      const room = res.data.room;
      // 谜题数据：优先用后端返回，fallback 到 MOCK_PUZZLE
      if (!this.state.puzzle && room.puzzleId) {
        this.loadPuzzleFromRoom(room);
      }
      this.updateState(room);
      this.lastChatCount = (room.chatLog || []).length;
      this.lastPlayersJson = JSON.stringify(room.players || []);
      // 如果游戏已开始，启动计时器和轮询
      if (room.status === 'playing') {
        this.startTimer();
      }
    }

    // 启动实时同步（优先 Watch，降级轮询）
    this.startPolling();
  },

  // ================================================================
  // 从房间数据加载谜题（优先用 room 中携带的 puzzle 字段）
  // ================================================================
  loadPuzzleFromRoom(room) {
    if (room.puzzle) {
      this.state.puzzle = room.puzzle;
    } else if (typeof MOCK_PUZZLE !== 'undefined') {
      this.state.puzzle = MOCK_PUZZLE;
    }
  },

  // ================================================================
  // 启动实时同步（优先用 CloudBase Watch，降级为轮询）
  // ================================================================
  startPolling() {
    this.stopPolling();
    // 尝试使用 CloudBase Watch（实时推送，延迟 ~100-300ms）
    if (this.tryStartWatch()) {
      this.useWatch = true;
      console.log('房间同步：使用 CloudBase Watch 实时推送');
      return;
    }
    // 降级为轮询
    this.useWatch = false;
    console.log('房间同步：降级为轮询模式（每2秒）');
    this.pollTimer = setInterval(() => this.pollRoomState(), 2000);
  },

  stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    this.stopWatch();
  },

  // ================================================================
  // CloudBase Watch — 实时监听 rooms 集合变化
  // ================================================================
  tryStartWatch() {
    try {
      if (!V2App.app || !V2App.loginReady) return false;
      const db = V2App.app.database();
      if (typeof db.collection !== 'function') return false;

      const watcher = db.collection('rooms')
        .where({ roomId: this.state.roomId })
        .watch({
          onChange: (snapshot) => {
            this.handleWatchChange(snapshot);
          },
          onError: (err) => {
            console.warn('Watch 出错，降级为轮询:', err.message);
            this.stopWatch();
            this.fallbackToPolling();
          }
        });

      this.watchHandler = watcher;
      return true;
    } catch (e) {
      console.warn('Watch 初始化失败:', e.message);
      return false;
    }
  },

  stopWatch() {
    if (this.watchHandler) {
      try {
        this.watchHandler.close();
      } catch (e) { /* ignore */ }
      this.watchHandler = null;
    }
    this.useWatch = false;
  },

  handleWatchChange(snapshot) {
    const { docs } = snapshot;
    if (!docs || docs.length === 0) return;

    const room = docs[0];
    if (!room) return;

    // 检测变化
    const playersJson = JSON.stringify(room.players || []);
    const chatCount = (room.chatLog || []).length;
    const hasNewChat = chatCount > this.lastChatCount;
    const hasPlayerChange = playersJson !== this.lastPlayersJson;

    if (hasNewChat || hasPlayerChange || room.status !== this.state.status) {
      this.updateState(room);
      this.lastChatCount = chatCount;
      this.lastPlayersJson = playersJson;

      // 状态变化处理
      if (room.status === 'playing' && this.state.status !== 'playing') {
        if (!this.state.puzzle && room.puzzleId) {
          this.loadPuzzleFromRoom(room);
        }
        this.startTimer();
      }
      if (room.status === 'finished' && this.state.status !== 'finished') {
        this.stopTimer();
        const isSolo = room.mode === 'solo' || this.state.mode === 'solo';
        setTimeout(() => {
          V2App.goToResult({
            correct: room.winnerId === V2App.user.id,
            winnerId: room.winnerId,
            players: room.players,
            chatLog: room.chatLog,
            puzzleTitle: room.puzzleTitle || (this.state.puzzle ? this.state.puzzle.title : ''),
            puzzleAnswer: room.puzzleAnswer || (this.state.puzzle ? this.state.puzzle.answer : ''),
            questionsCount: this.state.questionCount,
            isSolo,
            score: isSolo ? 0 : undefined,
            grade: isSolo ? '练习' : undefined,
            rewarded: !isSolo
          });
        }, 1500);
      }
    }

    // 同步时间
    if (room.status === 'playing' && room.timeRemaining !== undefined) {
      this.state.timeRemaining = room.timeRemaining;
      const timerEl = document.getElementById('room-timer');
      if (timerEl) timerEl.textContent = V2App.formatTime(room.timeRemaining);
    }
  },

  fallbackToPolling() {
    this.useWatch = false;
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => this.pollRoomState(), 2000);
    }
  },

  async pollRoomState() {
    if (this.isPolling) return;
    if (!this.state.roomId) return;
    // 不在房间页面时停止轮询
    if (V2App.currentPage !== 'room') { this.stopPolling(); return; }

    this.isPolling = true;
    try {
      const res = await V2App.callFn('roomManager', {
        action: 'getRoomState',
        roomId: this.state.roomId
      });
      if (res && res.code === 0 && res.data && res.data.room) {
        this.consecutiveFailures = 0;
        this.disconnectedNotified = false;
        const room = res.data.room;

        // 检测玩家变化
        const playersJson = JSON.stringify(room.players || []);
        const chatCount = (room.chatLog || []).length;

        // 检测是否有新消息（其他人发的，不是我当前已知的）
        const hasNewChat = chatCount > this.lastChatCount;
        const hasPlayerChange = playersJson !== this.lastPlayersJson;

        if (hasNewChat || hasPlayerChange) {
          // 更新状态
          this.updateState(room);
          this.lastChatCount = chatCount;
          this.lastPlayersJson = playersJson;

          // 状态变化处理
          if (room.status === 'playing' && this.state.status !== 'playing') {
            // 游戏刚开始
            if (!this.state.puzzle && room.puzzleId) {
              this.loadPuzzleFromRoom(room);
            }
            this.startTimer();
          }
          if (room.status === 'finished' && this.state.status !== 'finished') {
            this.stopTimer();
            const isSolo = room.mode === 'solo' || this.state.mode === 'solo';
            // 跳转结算页
            setTimeout(() => {
              V2App.goToResult({
                correct: room.winnerId === V2App.user.id,
                winnerId: room.winnerId,
                players: room.players,
                chatLog: room.chatLog,
                puzzleTitle: room.puzzleTitle || (this.state.puzzle ? this.state.puzzle.title : ''),
                puzzleAnswer: room.puzzleAnswer || (this.state.puzzle ? this.state.puzzle.answer : ''),
                questionsCount: this.state.questionCount,
                isSolo,
                score: isSolo ? 0 : undefined,
                grade: isSolo ? '练习' : undefined,
                rewarded: !isSolo
              });
            }, 1500);
          }

          // 如果轮到我了，播放提示（可选）
          if (room.status === 'playing' && !this.state.isMyTurn) {
            const currentPlayer = room.players[room.currentTurnIndex];
            if (currentPlayer && currentPlayer.id === V2App.user.id) {
              this.renderState(); // 刷新 UI 激活输入框
            }
          }
        }

        // 同步时间
        if (room.status === 'playing' && room.timeRemaining !== undefined) {
          this.state.timeRemaining = room.timeRemaining;
          const timerEl = document.getElementById('room-timer');
          if (timerEl) timerEl.textContent = V2App.formatTime(room.timeRemaining);
        }
      }
    } catch (e) {
      this.consecutiveFailures++;
      console.warn('轮询房间状态失败 (' + this.consecutiveFailures + '/' + this.maxConsecutiveFailures + '):', e.message);
      // 连续失败达到上限，提示用户
      if (this.consecutiveFailures >= this.maxConsecutiveFailures && !this.disconnectedNotified) {
        this.disconnectedNotified = true;
        V2App.toast('网络连接不稳定，正在尝试重连...', 'error');
      }
    }
    this.isPolling = false;
  },

  // ================================================================
  // 渲染房间 UI（一次性构建 DOM）
  // ================================================================
  render() {
    const container = document.getElementById('room-content');
    if (!container) return;

    container.innerHTML = `
      <!-- Room Header -->
      <div class="room-header">
        <button class="header-btn" id="btn-room-back" title="返回大厅">←</button>
        <div class="room-title-area">
          <span class="room-id" id="room-code-display">房间 #...</span>
          <span class="room-meta" id="room-meta-display">0/0 人 · 轮流制</span>
        </div>
        <button class="header-btn ai-hint-toggle ${this.state.aiHintEnabled ? 'on' : ''}" id="btn-ai-hint" title="AI提示开关">
          <span class="ai-hint-icon">💡</span><span class="ai-hint-label">提示${this.state.aiHintEnabled ? '开' : '关'}</span>
        </button>
        <button class="header-btn" id="btn-share-room" title="邀请好友" style="font-size:14px;">📤</button>
        <div class="room-timer" id="room-timer">15:00</div>
      </div>

      <!-- Main Area -->
      <div class="room-main">
        <!-- Left: Puzzle (Paper Panel) -->
        <div class="room-puzzle-panel parchment-panel burned-edge" style="animation:paperSlideIn .5s var(--ease-out)">
          <div class="wax-seal wax-seal-top"></div>
          <div class="wax-seal wax-seal-corner wax-tl"></div>
          <div class="wax-seal wax-seal-corner wax-tr"></div>
          <div class="paper-badge" id="puzzle-type-badge">细思极恐</div>
          <div class="paper-title" id="puzzle-title">等待开始...</div>
          <div class="paper-body" id="puzzle-text">游戏开始后将展示谜题</div>
          <div class="puzzle-hint" id="puzzle-hint" style="display:none;"></div>
        </div>

        <!-- Center: Chat -->
        <div class="room-chat-panel">
          <div class="chat-log" id="chat-log">
            <div class="chat-system">等待玩家加入房间...</div>
          </div>
          <div class="chat-input-area" id="chat-input-area">
            <input class="text-input" id="input-question" placeholder="等待游戏开始..." disabled>
            <button class="btn btn-primary btn-sm" id="btn-send-question" disabled>发送</button>
          </div>
        </div>

        <!-- Right: Clue Board (Paper Panel) — 可展开收起的推理笔记 -->
        <div class="room-clue-panel parchment-panel burned-edge ${this.state.memoExpanded ? 'memo-expanded' : ''}" id="clue-panel"
             style="animation:paperSlideIn .5s var(--ease-out) .1s both">
          <div class="wax-seal wax-seal-top" style="width:28px;height:28px;transform:translateX(-50%) rotate(5deg);"></div>
          <div class="paper-badge">🔍 推理板</div>
          <div class="memo-collapse-header" id="memo-header">
            <span class="memo-toggle-icon">${this.state.memoExpanded ? '▼' : '▶'}</span>
            <span class="memo-toggle-text">${this.state.memoExpanded ? '收起推理板' : '展开推理板'}</span>
          </div>
          <div class="memo-body ${this.state.memoExpanded ? '' : 'hidden'}" id="memo-body">
            <textarea class="memo-textarea" id="memo-textarea" placeholder="在这里记录你的推理思路...&#10;&#10;提示：点击「📋 推理板」按钮也可切换展开/收起">${this.state.memoNotes}</textarea>
          </div>
        </div>
      </div>

      <!-- Bottom: Character Portrait Bar -->
      <div class="room-footer">
        <div class="portrait-bar" id="player-bar">
          <!-- 动态填充角色立绘 -->
        </div>
        <div class="emoji-bar" id="emoji-bar">
          <button class="emoji-btn emoji-detective" data-emoji="thinking" data-label="思考中" data-img="assets/emoji-thinking.png"><img src="assets/emoji-thinking.png" alt="思考"></button>
          <button class="emoji-btn emoji-detective" data-emoji="eureka" data-label="灵光一闪" data-img="assets/emoji-eureka.png"><img src="assets/emoji-eureka.png" alt="顿悟"></button>
          <button class="emoji-btn emoji-detective" data-emoji="suspicious" data-label="发现端倪" data-img="assets/emoji-suspicious.png"><img src="assets/emoji-suspicious.png" alt="怀疑"></button>
          <button class="emoji-btn emoji-detective" data-emoji="wave" data-label="友好示意" data-img="assets/emoji-wave.png"><img src="assets/emoji-wave.png" alt="招手"></button>
        </div>
        <div class="room-actions" id="room-actions">
          <button class="btn btn-ghost btn-sm" id="btn-toggle-clue">📋 推理板</button>
          <button class="btn btn-success btn-sm" id="btn-ready" style="display:none;">准备</button>
          <button class="btn btn-gold btn-sm" id="btn-guess" style="display:none;">💡 猜答案</button>
          <button class="btn btn-danger btn-sm" id="btn-leave">离开</button>
        </div>
      </div>

      <!-- Guess Modal -->
      <div class="modal-overlay" id="modal-guess">
        <div class="modal">
          <div class="modal-title">💡 提交猜测</div>
          <div class="modal-body">
            <textarea id="input-guess" class="text-input" rows="3" placeholder="输入你认为的真相..." style="resize:none;width:100%;"></textarea>
            <div class="name-hint" style="margin-top:8px;">猜对可得分，猜错不影响继续提问</div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" onclick="V2App.hideModal('modal-guess')">取消</button>
            <button class="btn btn-gold" id="btn-confirm-guess">提交</button>
          </div>
        </div>
      </div>

      <!-- Share / Invite Modal -->
      <div class="modal-overlay" id="modal-share">
        <div class="modal">
          <div class="modal-title">📤 邀请好友</div>
          <div class="modal-body" style="text-align:center;">
            <div style="font-size:14px;color:var(--text-dim);margin-bottom:16px;" id="share-room-info">房间 #... · 0/4 人</div>
            <!-- Room Code Block -->
            <div id="share-code-block" style="background:var(--bg-input);border:2px dashed var(--gold);border-radius:12px;
              padding:14px;margin-bottom:14px;letter-spacing:6px;font-size:28px;font-weight:900;color:var(--gold);
              font-family:monospace;user-select:all;cursor:text;" title="点击选中">......</div>
            <!-- Copy Buttons -->
            <div style="display:flex;gap:10px;margin-bottom:12px;">
              <button class="btn btn-primary" id="btn-share-copy-code" style="flex:1;padding:12px;">
                📋 复制房间号
              </button>
              <button class="btn btn-gold" id="btn-share-copy-link" style="flex:1;padding:12px;">
                🔗 复制邀请链接
              </button>
            </div>
            <div style="font-size:10px;color:var(--text-muted);line-height:1.6;">
              将房间号或链接发给好友<br>好友点击链接即可直接加入房间
            </div>
            <div id="share-copied-toast" style="display:none;margin-top:10px;font-size:12px;color:var(--green);
              animation:fadeIn .3s ease-out;">✅ 已复制</div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost btn-block" onclick="V2App.hideModal('modal-share')">关闭</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  // ================================================================
  // 绑定事件
  // ================================================================
  bindEvents() {
    // Back
    document.getElementById('btn-room-back')?.addEventListener('click', () => this.leaveRoom());

    // Emoji 快捷表情
    document.querySelectorAll('#emoji-bar .emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        const label = btn.dataset.label || '';
        const imgUrl = btn.dataset.img || '';
        // 弹出气泡效果（在玩家角色旁边）
        this.showEmojiBubble(imgUrl, label, emoji);
        // 按钮动画
        btn.style.transform = 'scale(1.3)';
        setTimeout(() => btn.style.transform = '', 200);
      });
    });
    // Open share modal
    document.getElementById('btn-share-room')?.addEventListener('click', () => this.showShareModal());

    // Share modal: copy room code
    document.getElementById('btn-share-copy-code')?.addEventListener('click', () => {
      const code = this.state.shareCode;
      if (!code) return;
      this.copyToClipboard(code, '房间号');
    });

    // Share modal: copy invite link
    document.getElementById('btn-share-copy-link')?.addEventListener('click', () => {
      const code = this.state.shareCode;
      if (!code) return;
      const link = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/') + 'lobby.html?code=' + code;
      this.copyToClipboard(link, '邀请链接');
    });
    // Send question
    document.getElementById('btn-send-question')?.addEventListener('click', () => this.sendQuestion());
    document.getElementById('input-question')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendQuestion(); }
    });
    // Ready
    document.getElementById('btn-ready')?.addEventListener('click', () => this.toggleReady());
    // Guess
    document.getElementById('btn-guess')?.addEventListener('click', () => V2App.showModal('modal-guess'));
    document.getElementById('btn-confirm-guess')?.addEventListener('click', () => this.submitGuess());
    document.getElementById('input-guess')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) this.submitGuess();
    });
    // Leave
    document.getElementById('btn-leave')?.addEventListener('click', () => this.leaveRoom());
    // Toggle clue panel（推理板展开/收起）
    document.getElementById('btn-toggle-clue')?.addEventListener('click', () => this.toggleMemo());
    // 推理板标题栏点击也可切换
    document.getElementById('memo-header')?.addEventListener('click', () => this.toggleMemo());
    // 推理板笔记自动保存
    document.getElementById('memo-textarea')?.addEventListener('input', (e) => {
      this.state.memoNotes = e.target.value;
    });
    // AI 提示开关
    document.getElementById('btn-ai-hint')?.addEventListener('click', () => this.toggleAiHint());
  },

  // ================================================================
  // ================================================================
  // 表情气泡弹出
  // ================================================================
  showEmojiBubble(imgUrl, label, emojiKey) {
    // 移除之前的气泡
    document.querySelectorAll('.emoji-float-bubble').forEach(el => el.remove());

    // 找到玩家头像位置（优先自己的 portrait-slot，否则取第一个）
    const mySlot = document.querySelector('.portrait-slot.is-me') || document.querySelector('.portrait-slot');
    if (!mySlot) return; // 没有角色 slot 就不弹

    // 创建气泡 DOM，挂到 body 避免被父级 overflow:hidden 裁切
    const bubble = document.createElement('div');
    bubble.className = 'emoji-float-bubble';
    bubble.innerHTML = `
      <div class="emoji-bubble-card">
        <div class="emoji-bubble-arrow"></div>
        ${imgUrl
          ? `<img class="emoji-float-img" src="${imgUrl}" alt="${label}">`
          : `<span class="emoji-float-icon">${emojiKey}</span>`}
        ${label ? `<div class="emoji-float-label">${label}</div>` : ''}
      </div>`;

    document.body.appendChild(bubble);

    // 定位到 portrait-slot 上方（用 fixed 定位）
    const slotRect = mySlot.getBoundingClientRect();
    bubble.style.position = 'fixed';
    bubble.style.left = (slotRect.left + slotRect.width / 2) + 'px';
    bubble.style.top = (slotRect.top - 10) + 'px';

    // 触发弹出动画（延迟一帧让浏览器先渲染初始状态）
    setTimeout(() => bubble.classList.add('show'), 20);

    // 3秒后消失
    setTimeout(() => {
      bubble.classList.remove('show');
      bubble.classList.add('hide');
      setTimeout(() => bubble.remove(), 500);
    }, 3000);
  },

  // ================================================================
  // 点击角色头像弹出大图查看
  // ================================================================
  showPortraitDetail(portraitUrl, charName) {
    // 移除之前的大图
    document.querySelectorAll('.portrait-detail-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'portrait-detail-overlay';
    overlay.innerHTML = `
      <div class="portrait-detail-card">
        <div class="portrait-detail-close" onclick="this.closest('.portrait-detail-overlay').remove()">✕</div>
        <img class="portrait-detail-img" src="${portraitUrl}" alt="${charName}">
        <div class="portrait-detail-name">${charName}</div>
      </div>`;

    document.body.appendChild(overlay);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // 弹出动画
    setTimeout(() => overlay.classList.add('show'), 20);
  },

  // 分享面板
  // ================================================================
  showShareModal() {
    const s = this.state;
    document.getElementById('share-code-block').textContent = s.shareCode || '......';
    const modeNames = { turn: '轮流制', race: '抢答制', coop: '合作制', compete: '竞技制' };
    document.getElementById('share-room-info').textContent =
      '房间 #' + (s.shareCode || '...') + ' · ' + (s.players?.length || 0) + '/' + s.maxPlayers + ' 人 · ' + (modeNames[s.mode] || '');
    document.getElementById('share-copied-toast').style.display = 'none';
    V2App.showModal('modal-share');
  },

  copyToClipboard(text, label) {
    const fn = () => {
      const toast = document.getElementById('share-copied-toast');
      if (toast) { toast.style.display = 'block'; setTimeout(() => { toast.style.display = 'none'; }, 1500); }
      V2App.toast(label + ' 已复制！分享给好友吧', 'success');
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(fn).catch(() => V2App.toast(label + ': ' + text, 'info'));
    } else {
      // Fallback: select text
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); fn(); } catch (e) { V2App.toast(label + ': ' + text, 'info'); }
      document.body.removeChild(ta);
    }
  },

  // ================================================================
  // 更新房间状态
  // ================================================================
  updateState(room) {
    if (!room) return;
    Object.assign(this.state, {
      roomId: room.roomId,
      shareCode: room.shareCode,
      hostId: room.hostId,
      status: room.status,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      timeLimit: room.timeLimit,
      timeRemaining: room.timeRemaining,
      currentTurnIndex: room.currentTurnIndex,
      players: room.players || [],
      chatLog: room.chatLog || [],
      puzzleId: room.puzzleId,
      winnerId: room.winnerId
    });

    this.renderState();
  },

  // ================================================================
  // 渲染状态到 DOM
  // ================================================================
  renderState() {
    const s = this.state;

    // Header
    const codeEl = document.getElementById('room-code-display');
    if (codeEl) codeEl.textContent = '房间 #' + (s.shareCode || '...');
    const metaEl = document.getElementById('room-meta-display');
    if (metaEl) {
      const modeNames = { turn: '轮流制', race: '抢答制', coop: '合作制', compete: '竞技制' };
      metaEl.textContent = s.players.length + '/' + s.maxPlayers + ' 人 · ' + (modeNames[s.mode] || s.mode);
    }
    const timerEl = document.getElementById('room-timer');
    if (timerEl) timerEl.textContent = V2App.formatTime(s.timeRemaining);

    // Players
    this.renderPlayers();

    // Chat
    this.renderChat();

    // Clues
    this.renderClues();

    // Actions
    this.renderActions();

    // Puzzle
    if (s.status === 'playing' && s.puzzle) {
      this.renderPuzzle(s.puzzle);
    }

    // Turn indicator
    this.updateTurnIndicator();
  },

  // ================================================================
  // 渲染玩家栏
  // ================================================================
  renderPlayers() {
    const bar = document.getElementById('player-bar');
    if (!bar) return;

    if (this.state.players.length === 0) {
      bar.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:16px;">等待玩家加入...</div>';
      return;
    }

    bar.innerHTML = this.state.players.map((p, i) => {
      const isCurrentTurn = this.state.status === 'playing' && i === this.state.currentTurnIndex;
      const isHost = p.id === this.state.hostId;
      const isMe = p.id === V2App.user.id;
      const isAI = p.id === 'ai';
      const rarityClass = p.characterId === 'agent' || p.characterId === 'mastermind' ? 'rarity-legendary'
        : p.characterId === 'writer' || p.characterId === 'hacker' ? 'rarity-epic'
        : p.characterId === 'reporter' || p.characterId === 'psychic' || p.characterId === 'doctor' ? 'rarity-rare' : '';
      // 根据 characterId 自动推导性别、角色名、立绘
      let portraitUrl = p.portraitUrl;
      let charName = '默认';
      let skinName = '';
      if (typeof getPortraitUrl !== 'undefined' && typeof parseCharacterId !== 'undefined' && typeof CHARACTER_META !== 'undefined') {
        const { baseKey, gender } = parseCharacterId(p.characterId);
        portraitUrl = portraitUrl || getPortraitUrl(baseKey, gender);
        // 角色名称
        const meta = CHARACTER_META[p.characterId] || CHARACTER_META[baseKey];
        charName = meta ? meta.name : baseKey;
        // 皮肤名称（非默认皮肤时显示）
        if (p.skinId && p.skinId !== 'default') {
          skinName = p.skinId.replace(/skin_/, '').replace(/_/g, '-');
          // 从 THEME_SKINS 查找皮肤名
          if (typeof THEME_SKINS !== 'undefined') {
            for (const theme of Object.values(THEME_SKINS)) {
              const skin = theme.skins.find(s => s.skinId === p.skinId);
              if (skin) { skinName = skin.name; break; }
            }
          }
        }
      }
      const portraitImg = portraitUrl
        ? `<img class="portrait-img" src="${portraitUrl}" alt="${charName}">`
        : `<div class="portrait-emoji">${p.avatar || '🕵️'}</div>`;
      // 点击：自己/AI → 大图预览；他人 → 玩家资料（含加好友）
      const onclick = isMe || isAI
        ? `onclick="RoomGame.showPortraitDetail('${portraitUrl || ''}', '${charName}')"`
        : `onclick="RoomGame.showPlayerProfile('${p.id}')"`;
      // 自己的 slot：在 waiting 状态下显示换角色按钮
      const changeBtn = (isMe && this.state.status === 'waiting')
        ? `<button class="portrait-change-btn" onclick="event.stopPropagation(); RoomGame.openCharacterSelect()">换角色</button>`
        : '';
      return `
        <div class="portrait-slot ${isCurrentTurn ? 'active-turn' : ''} ${isMe ? 'is-me' : ''}" data-seat="${i}" data-player-id="${p.id}" ${onclick}>
          <div class="portrait-status">
            ${isHost ? '<span class="tag tag-host">房主</span>' : ''}
            ${isCurrentTurn ? '<span class="tag tag-turn">提问</span>' : ''}
            ${this.state.status === 'waiting' ? (p.isReady ? '<span class="tag tag-ready">OK</span>' : '') : ''}
          </div>
          <div class="portrait-frame ${rarityClass}">
            ${portraitImg}
          </div>
          <div class="portrait-name">${p.name || '玩家'}</div>
          <div class="portrait-char-name ${rarityClass}">${charName}${skinName ? ' · ' + skinName : ''}</div>
          ${changeBtn}
          ${!isMe && !isAI ? '<div class="portrait-tap-hint">点击查看</div>' : ''}
        </div>`;
    }).join('');
  },

  // ================================================================
  // 打开角色选择弹窗（房间 waiting 状态下可用）
  // ================================================================
  openCharacterSelect() {
    if (this.state.status !== 'waiting') {
      V2App.showToast('游戏已开始，无法更换角色');
      return;
    }
    // 显示角色选择弹窗
    V2App.showModal('modal-character-select');
    const body = document.getElementById('modal-character-select-body');
    if (!body) return;

    body.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">加载角色列表...</div>';

    // 加载已拥有角色
    V2App.callFn('characterManager', { action: 'getMyCharacters' }).then(res => {
      if (!res || res.code !== 0 || !res.data || !res.data.characters || res.data.characters.length === 0) {
        body.innerHTML = `
          <div class="no-char-hint">
            <div class="no-char-icon">🎭</div>
            <div class="no-char-title">还没有角色</div>
            <div class="no-char-desc">前往角色页面抽卡获取角色</div>
            <button class="btn btn-gold btn-sm" onclick="V2App.hideModal('modal-character-select'); V2App.showPage('character'); CharacterUI.init();">去抽卡</button>
          </div>`;
        return;
      }

      const characters = res.data.characters;
      const equippedId = res.data.equippedId;
      const gender = V2App.user.gender || 'male';

      body.innerHTML = `
        <div class="char-select-title">选择出战角色</div>
        <div class="char-select-list">
          ${characters.map(c => {
            const isEquipped = c.id === equippedId;
            let portraitUrl = c.previewUrl;
            if (!portraitUrl && typeof getPortraitUrl !== 'undefined') {
              const { baseKey } = parseCharacterId(c.characterId);
              portraitUrl = getPortraitUrl(baseKey, gender);
            }
            const meta = c.baseKey && typeof CHARACTER_META !== 'undefined' ? CHARACTER_META[c.baseKey] : null;
            const rarityClass = c.rarity === 'legendary' ? 'rarity-legendary' : c.rarity === 'epic' ? 'rarity-epic' : c.rarity === 'rare' ? 'rarity-rare' : '';

            // 可用皮肤列表
            const skinsHtml = (c.availableSkins && c.availableSkins.length > 1)
              ? `<div class="char-skin-row">${c.availableSkins.map(s => {
                  const isCurrent = s.skinId === c.skinId;
                  const skinIcon = s.skinId === 'default' ? '👤' : '🎨';
                  return `<button class="skin-chip ${isCurrent ? 'skin-active' : ''}" onclick="RoomGame.selectSkin('${c.id}','${c.characterId}','${s.skinId}','${s.previewUrl || c.previewUrl}','${s.name || '默认'}')" title="${s.name || '默认形象'}">${skinIcon} ${s.name || '默认'}</button>`;
                }).join('')}</div>`
              : '';

            return `
              <div class="char-select-item ${isEquipped ? 'char-equipped' : ''} ${rarityClass}">
                <div class="char-select-portrait">
                  ${portraitUrl ? `<img src="${portraitUrl}" alt="${c.name}">` : `<div>${meta ? meta.emoji : '🕵️'}</div>`}
                </div>
                <div class="char-select-info">
                  <div class="char-select-name ${rarityClass}">${c.name}</div>
                  <div class="char-select-rarity">${c.rarity === 'legendary' ? '传说' : c.rarity === 'epic' ? '史诗' : c.rarity === 'rare' ? '稀有' : '普通'}</div>
                  ${skinsHtml}
                </div>
                <button class="btn ${isEquipped ? 'btn-success' : 'btn-primary'} btn-sm" ${isEquipped ? 'disabled' : ''}
                  onclick="RoomGame.equipCharacter('${c.id}', '${c.characterId}', '${portraitUrl}', '${c.name}')">
                  ${isEquipped ? '出战中' : '选择'}
                </button>
              </div>`;
          }).join('')}
        </div>
        <div style="text-align:center;margin-top:12px;">
          <button class="btn btn-ghost btn-sm" onclick="V2App.hideModal('modal-character-select')">关闭</button>
        </div>`;
    });
  },

  // 装备角色
  async equipCharacter(charDocId, characterId, portraitUrl, charName) {
    const res = await V2App.callFn('characterManager', { action: 'equip', characterId });
    if (res && res.code === 0) {
      V2App.showToast('角色已更换');
      V2App.hideModal('modal-character-select');

      // 立即更新本地玩家数据（不依赖服务端轮询延迟）
      const me = this.state.players.find(p => p.id === V2App.user.id);
      if (me) {
        me.characterId = characterId;
        me.portraitUrl = portraitUrl;
        me.currentCharName = charName;
        // 同步更新 V2App 全局状态
        V2App.user.equippedCharacter = {
          characterId,
          skinId: 'default',
          name: charName,
          emoji: me.avatar || '🕵️'
        };
      }
      this.renderPlayers();

      // 异步通知服务端刷新（不阻塞 UI）
      try {
        const roomRes = await V2App.callFn('roomManager', { action: 'getRoomState', roomId: this.state.roomId });
        if (roomRes && roomRes.code === 0 && roomRes.data && roomRes.data.room) {
          this.updateState(roomRes.data.room);
          this.renderPlayers();
        }
      } catch (e) {
        // 服务端刷新失败不影响本地已更新
        console.warn('服务端房间状态刷新失败:', e.message);
      }
    }
  },

  // 选择皮肤
  async selectSkin(charDocId, characterId, skinId, previewUrl, skinName) {
    const res = await V2App.callFn('characterManager', { action: 'equip', characterId, skinId });
    if (res && res.code === 0) {
      V2App.showToast(`皮肤已切换为「${skinName}」`);
      V2App.hideModal('modal-character-select');
      // 立即更新本地玩家数据
      const me = this.state.players.find(p => p.id === V2App.user.id);
      if (me) {
        me.characterId = characterId;
        me.skinId = skinId;
        me.portraitUrl = previewUrl;
        V2App.user.equippedCharacter = {
          characterId,
          skinId,
          name: me.currentCharName || '',
          emoji: me.avatar || '🕵️'
        };
      }
      this.renderPlayers();
      // 异步刷新服务端
      try {
        const roomRes = await V2App.callFn('roomManager', { action: 'getRoomState', roomId: this.state.roomId });
        if (roomRes && roomRes.code === 0 && roomRes.data && roomRes.data.room) {
          this.updateState(roomRes.data.room);
          this.renderPlayers();
        }
      } catch (e) { /* ignore */ }
    }
  },

  // ================================================================
  // 点击玩家立绘 → 弹出玩家详情
  // ================================================================
  async showPlayerProfile(playerId) {
    // 显示加载
    V2App.showModal('modal-player-profile');
    const body = document.getElementById('modal-player-profile-body');
    if (!body) return;

    body.innerHTML = `<div class="player-profile-loading">加载中...</div>`;

    try {
      const res = await V2App.callFn('friendManager', {
        action: 'getUserProfile',
        targetId: playerId
      });

      if (!res || res.code !== 0 || !res.data) {
        body.innerHTML = `<div class="player-profile-error">加载失败</div>`;
        return;
      }

      const u = res.data.user;
      // 获取立绘
      let portraitUrl = '';
      if (typeof getPortraitUrl !== 'undefined' && typeof parseCharacterId !== 'undefined') {
        const { baseKey, gender } = parseCharacterId(u.characterId);
        portraitUrl = getPortraitUrl(baseKey, gender);
      }

      body.innerHTML = `
        <div class="player-profile-card">
          <div class="pp-avatar">
            ${portraitUrl
              ? `<img class="pp-portrait" src="${portraitUrl}" alt="${u.name}">`
              : `<div class="pp-emoji">${u.avatar || '🕵️'}</div>`}
          </div>
          <div class="pp-name">${u.name}</div>
          <div class="pp-id-row">
            <span class="pp-id-label">ID</span>
            <span class="pp-id-value">${u.id.substring(0, 16)}...</span>
          </div>
          <div class="pp-id-full">${u.id}</div>
          <div class="pp-status ${u.isOnline ? 'online' : 'offline'}">
            ${u.isOnline ? '🟢 在线' : '⚫ 离线'}
          </div>
          <div class="pp-actions">
            ${u.isFriend
              ? `<button class="btn btn-ghost btn-block btn-friend-already" disabled>已是好友</button>`
              : u.hasPending
                ? `<button class="btn btn-ghost btn-block" disabled>请求已发送</button>`
                : `<button class="btn btn-gold btn-block" id="btn-send-friend-request" data-target-id="${u.id}" data-target-name="${u.name}">🤝 添加好友</button>`
            }
          </div>
        </div>
      `;

      // 绑定添加好友按钮
      const btn = document.getElementById('btn-send-friend-request');
      if (btn) {
        btn.addEventListener('click', async () => {
          const targetId = btn.dataset.targetId;
          const targetName = btn.dataset.targetName;
          btn.disabled = true;
          btn.textContent = '发送中...';
          try {
            const sendRes = await V2App.callFn('friendManager', {
              action: 'sendRequest',
              targetId,
              message: `在游戏中认识了${targetName}`
            });
            if (sendRes && sendRes.code === 0) {
              V2App.toast('好友请求已发送！', 'success');
              V2App.hideModal('modal-player-profile');
            } else {
              V2App.toast(sendRes?.message || '发送失败', 'error');
              btn.disabled = false;
              btn.textContent = '🤝 添加好友';
            }
          } catch (e) {
            V2App.toast('网络错误', 'error');
            btn.disabled = false;
            btn.textContent = '🤝 添加好友';
          }
        });
      }
    } catch (e) {
      body.innerHTML = `<div class="player-profile-error">加载失败: ${e.message}</div>`;
    }
  },

  // ================================================================
  // 渲染聊天记录
  // ================================================================
  renderChat() {
    const logEl = document.getElementById('chat-log');
    if (!logEl) return;

    const entries = this.state.chatLog;
    if (entries.length === 0) {
      logEl.innerHTML = this.state.status === 'waiting'
        ? '<div class="chat-system">等待玩家加入房间，房主可以点击"开始游戏"</div>'
        : '<div class="chat-system">游戏开始，轮到第一个玩家提问</div>';
      return;
    }

    // 竞技制：只显示自己的提问 + 系统消息 + AI回答
    const isCompete = this.state.mode === 'compete';
    const myId = V2App.user.id;

    logEl.innerHTML = entries
      .filter(entry => {
        if (!isCompete) return true;
        // 竞技制：过滤掉其他玩家的 question/guess
        if (entry.type === 'question' && entry.playerId !== myId) return false;
        if (entry.type === 'guess' && entry.playerId !== myId) return false;
        // 竞技制：AI回答也只看自己的
        if (entry.type === 'answer') {
          // 找到这个 answer 之前最近的 question，判断是否是自己的
          const idx = entries.indexOf(entry);
          for (let i = idx - 1; i >= 0; i--) {
            if (entries[i].type === 'question') {
              if (entries[i].playerId !== myId) return false;
              break;
            }
          }
        }
        return true;
      })
      .map(entry => {
      switch (entry.type) {
        case 'system':
          return `<div class="chat-entry chat-system">⏱ ${entry.content}</div>`;
        case 'question':
          return `<div class="chat-entry chat-question">
            <span class="chat-name">${entry.playerName}：</span>${entry.content}
          </div>`;
        case 'answer': {
          const ansText = entry.ans === 'yes' ? '是' : entry.ans === 'no' ? '否' : '无关';
          const displayContent = this.state.aiHintEnabled
            ? ansText + ' · ' + (entry.exp || '')
            : ansText;
          const ansClass = entry.ans === 'yes' ? 'answer-yes' : entry.ans === 'no' ? 'answer-no' : 'answer-unrelated';
          return `<div class="chat-entry chat-answer">
            <span class="chat-name">🤖 AI：</span>
            <span class="clue-hl ${ansClass}">${displayContent}</span>
          </div>`;
        }
        case 'guess':
          return `<div class="chat-entry chat-guess">
            <span class="chat-name">${entry.playerName} 猜测：</span>${entry.content}
          </div>`;
        case 'emoji':
          return `<div class="chat-entry chat-emoji">
            ${entry.img
              ? `<img class="chat-emoji-img" src="${entry.img}" alt="${entry.label || entry.content}">`
              : `<span class="chat-emoji-icon">${entry.content}</span>`}
            ${entry.label ? `<span class="chat-emoji-label">${entry.label}</span>` : ''}
          </div>`;
        default:
          return `<div class="chat-entry">${entry.content}</div>`;
      }
    }).join('');

    logEl.scrollTop = logEl.scrollHeight;
  },

  // ================================================================
  // 渲染推理板笔记（已改为玩家自行编辑，此处仅同步 textarea 值）
  // ================================================================
  renderClues() {
    const textarea = document.getElementById('memo-textarea');
    if (textarea && document.activeElement !== textarea) {
      textarea.value = this.state.memoNotes;
    }
  },

  // ================================================================
  // 切换 AI 提示开关
  // ================================================================
  toggleAiHint() {
    this.state.aiHintEnabled = !this.state.aiHintEnabled;
    const btn = document.getElementById('btn-ai-hint');
    if (btn) {
      btn.classList.toggle('on', this.state.aiHintEnabled);
      const label = btn.querySelector('.ai-hint-label');
      if (label) label.textContent = '提示' + (this.state.aiHintEnabled ? '开' : '关');
    }
    // 重新渲染聊天（AI 回答内容会根据开关变化）
    this.renderChat();
    V2App.toast(this.state.aiHintEnabled ? 'AI 提示已开启' : 'AI 提示已关闭，仅显示是/否/无关', 'info');
  },

  // ================================================================
  // 切换推理板展开/收起
  // ================================================================
  toggleMemo() {
    this.state.memoExpanded = !this.state.memoExpanded;
    const panel = document.getElementById('clue-panel');
    const body = document.getElementById('memo-body');
    const header = document.getElementById('memo-header');
    const icon = document.querySelector('.memo-toggle-icon');
    const text = document.querySelector('.memo-toggle-text');

    if (panel) panel.classList.toggle('memo-expanded', this.state.memoExpanded);
    if (body) body.classList.toggle('hidden', !this.state.memoExpanded);
    if (icon) icon.textContent = this.state.memoExpanded ? '▼' : '▶';
    if (text) text.textContent = this.state.memoExpanded ? '收起推理板' : '展开推理板';
  },

  // ================================================================
  // 渲染操作按钮
  // ================================================================
  renderActions() {
    const s = this.state;
    const isHost = s.hostId === V2App.user.id;
    const readyBtn = document.getElementById('btn-ready');
    const guessBtn = document.getElementById('btn-guess');
    const inputEl = document.getElementById('input-question');
    const sendBtn = document.getElementById('btn-send-question');

    if (!readyBtn || !guessBtn || !inputEl || !sendBtn) return;

    if (s.status === 'waiting') {
      readyBtn.style.display = '';
      guessBtn.style.display = 'none';
      inputEl.disabled = true;
      inputEl.placeholder = '等待游戏开始...';
      sendBtn.disabled = true;
      if (isHost) {
        readyBtn.textContent = s.mode === 'solo' ? '开始练习' : '开始游戏';
        readyBtn.className = 'btn btn-success btn-sm';
      } else {
        readyBtn.className = 'btn btn-primary btn-sm';
        readyBtn.textContent = '准备';
      }
    } else if (s.status === 'playing') {
      readyBtn.style.display = 'none';
      guessBtn.style.display = '';

      const isSolo = s.mode === 'solo';
      const isFreeMode = s.mode === 'race' || s.mode === 'coop';  // 抢答/合作制：所有人都能随时提问

      if (isSolo || isFreeMode) {
        // 单人/抢答/合作模式：随时可问
        this.state.isMyTurn = true;
        inputEl.disabled = false;
        inputEl.placeholder = '输入你的问题...';
        sendBtn.disabled = false;
      } else {
        // 判断是否轮到我
        const currentPlayer = s.players[s.currentTurnIndex];
        const isMyTurn = currentPlayer && currentPlayer.id === V2App.user.id;
        this.state.isMyTurn = isMyTurn;

        inputEl.disabled = !isMyTurn;
        inputEl.placeholder = isMyTurn ? '输入你的问题...' : '等待 ' + (currentPlayer?.name || '其他玩家') + ' 提问...';
        sendBtn.disabled = !isMyTurn;
      }

      if (this.state.isMyTurn) inputEl.focus();
    } else {
      readyBtn.style.display = 'none';
      guessBtn.style.display = 'none';
      inputEl.disabled = true;
      sendBtn.disabled = true;
    }
  },

  // ================================================================
  // 渲染谜题
  // ================================================================
  renderPuzzle(puzzle) {
    const titleEl = document.getElementById('puzzle-title');
    const textEl = document.getElementById('puzzle-text');
    const badgeEl = document.getElementById('puzzle-type-badge');
    if (titleEl) titleEl.textContent = puzzle.title || '谜题';
    if (textEl) textEl.textContent = puzzle.riddle || '';
    if (badgeEl) {
      const typeNames = { logic: '本格推理', twist: '叙诡反转', eerie: '细思极恐', occult: '变格悬疑', dark: '暗黑重口' };
      badgeEl.textContent = typeNames[puzzle.type] || puzzle.type;
    }
  },

  // ================================================================
  // 回合指示器
  // ================================================================
  updateTurnIndicator() {
    const s = this.state;
    if (s.status !== 'playing') return;
    const currentPlayer = s.players[s.currentTurnIndex];
    if (!currentPlayer) return;

    const logEl = document.getElementById('chat-log');
    if (!logEl) return;
    const existing = logEl.querySelector('.turn-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'chat-entry chat-system turn-indicator';
    indicator.textContent = '轮到 ' + currentPlayer.name + ' 提问';
    logEl.appendChild(indicator);
    logEl.scrollTop = logEl.scrollHeight;
  },

  // ================================================================
  // 发送问题
  // ================================================================
  async sendQuestion() {
    if (this.isSubmitting) return;
    // solo 模式跳过 isMyTurn 检查
    if (!this.state.isMyTurn && this.state.mode !== 'solo') return;
    const input = document.getElementById('input-question');
    if (!input) return;
    const question = input.value.trim();
    if (!question) return;

    this.isSubmitting = true;
    input.value = '';
    input.disabled = true;
    document.getElementById('btn-send-question').disabled = true;

    // 本地添加问题
    this.state.chatLog.push({
      playerId: V2App.user.id,
      playerName: V2App.user.name,
      type: 'question',
      content: question,
      timestamp: Date.now()
    });
    this.renderChat();

    // 调用 API
    const res = await V2App.callFn('roomManager', {
      action: 'submitQuestion',
      roomId: this.state.roomId,
      question
    });

    if (res && res.code === 0) {
      const answer = res.data.answer;
      this.state.chatLog.push({
        playerId: 'ai',
        playerName: 'AI主持人',
        type: 'answer',
        ans: answer.ans,
        exp: answer.exp,
        content: (answer.ans === 'yes' ? '是' : answer.ans === 'no' ? '否' : '无关') + ' · ' + answer.exp,
        timestamp: Date.now()
      });
      this.state.questionCount++;
      this.renderChat();
      this.renderClues();

      if (res.data.room) this.updateState(res.data.room);
    }

    this.isSubmitting = false;
    input.disabled = false;
    document.getElementById('btn-send-question').disabled = false;
    if (this.state.isMyTurn) input.focus();
  },

  // ================================================================
  // 提交猜测
  // ================================================================
  async submitGuess() {
    const input = document.getElementById('input-guess');
    if (!input) return;
    const guess = input.value.trim();
    if (!guess) { V2App.toast('请输入你的猜测', 'error'); return; }

    V2App.hideModal('modal-guess');
    input.value = '';

    this.state.chatLog.push({
      playerId: V2App.user.id,
      playerName: V2App.user.name,
      type: 'guess',
      content: guess,
      timestamp: Date.now()
    });
    this.renderChat();

    const res = await V2App.callFn('roomManager', {
      action: 'submitGuess',
      roomId: this.state.roomId,
      guess
    });

    if (res && res.code === 0) {
      if (res.data.correct) {
        this.state.chatLog.push({
          playerId: 'system', playerName: '系统', type: 'system',
          content: V2App.user.name + ' 猜对了真相！🎉',
          timestamp: Date.now()
        });
        this.state.status = 'finished';
        this.state.winnerId = V2App.user.id;
        V2App.toast('恭喜你猜对了！', 'success');
        this.renderChat();

        setTimeout(() => {
          V2App.goToResult({
            correct: true,
            score: res.data.score || 0,
            grade: res.data.grade || 'F',
            rewarded: res.data.rewarded !== false,
            isSolo: res.data.isSolo || this.state.mode === 'solo',
            players: this.state.players,
            winnerId: this.state.winnerId,
            chatLog: this.state.chatLog,
            puzzleTitle: this.state.puzzle ? this.state.puzzle.title : '',
            puzzleAnswer: this.state.puzzle ? this.state.puzzle.answer : '',
            questionsCount: this.state.questionCount
          });
        }, 1500);
      } else {
        this.state.chatLog.push({
          playerId: 'system', playerName: '系统', type: 'system',
          content: V2App.user.name + ' 猜错了，继续推理吧',
          timestamp: Date.now()
        });
        this.renderChat();
        V2App.toast('不对，再想想', 'error');
      }
    }
  },

  // ================================================================
  // 准备 / 开始
  // ================================================================
  async toggleReady() {
    // 兼容后端返回 hostId="anonymous" 的情况：匿名用户通过 UID 判断
    const rawHostId = this.state.hostId;
    const isHost = rawHostId === V2App.user.id
      || (rawHostId === 'anonymous' && V2App.user.loginType === 'anonymous')
      || (this.state.players.length === 1 && this.state.players[0].id === V2App.user.id);
    const isSolo = this.state.mode === 'solo';

    // solo 模式：房主直接开始，无需检查人数
    if (isSolo && isHost) {
      const btn = document.getElementById('btn-ready');
      btn.disabled = true;
      btn.textContent = '开始中...';

      const res = await V2App.callFn('roomManager', { action: 'startGame', roomId: this.state.roomId });

      btn.disabled = false;
      btn.textContent = '开始游戏';

      if (res && res.code === 0) {
        this.loadPuzzleFromRoom(res.data.room);
        this.updateState(res.data.room);
        this.startTimer();
        V2App.toast('单人练习开始！向 AI 提问来推理真相吧', 'success');
      }
      return;
    }

    if (isHost && this.state.players.length >= 2) {
      // 房主开始游戏
      const btn = document.getElementById('btn-ready');
      btn.disabled = true;
      btn.textContent = '开始中...';

      const res = await V2App.callFn('roomManager', { action: 'startGame', roomId: this.state.roomId });

      btn.disabled = false;
      btn.textContent = '开始游戏';

      if (res && res.code === 0) {
        // 优先用 room 中携带的 puzzle 数据，fallback 到 MOCK_PUZZLE（仅 mock 模式）
        this.loadPuzzleFromRoom(res.data.room);
        this.updateState(res.data.room);
        this.startTimer();
        V2App.toast('游戏开始！', 'success');
      }
    } else {
      // 普通玩家切换准备状态
      const res = await V2App.callFn('roomManager', { action: 'toggleReady', roomId: this.state.roomId });
      if (res && res.code === 0) this.updateState(res.data.room);
    }
  },

  // ================================================================
  // 离开房间
  // ================================================================
  async leaveRoom() {
    await V2App.callFn('roomManager', { action: 'leaveRoom', roomId: this.state.roomId });
    this.stopTimer();
    this.stopPolling();
    this.stopWatch();
    V2App.showPage('lobby');
  },

  // ================================================================
  // 计时器
  // ================================================================
  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (this.state.timeRemaining > 0) {
        this.state.timeRemaining--;
        const timerEl = document.getElementById('room-timer');
        if (timerEl) timerEl.textContent = V2App.formatTime(this.state.timeRemaining);
      } else {
        this.stopTimer();
        this.state.status = 'finished';
        this.state.chatLog.push({
          playerId: 'system', playerName: '系统', type: 'system',
          content: '时间到！游戏结束',
          timestamp: Date.now()
        });
        this.renderState();
        // 自动跳转结算页
        setTimeout(() => {
          V2App.goToResult({
            correct: false,
            players: this.state.players,
            chatLog: this.state.chatLog,
            puzzleTitle: this.state.puzzle ? this.state.puzzle.title : '',
            puzzleAnswer: this.state.puzzle ? this.state.puzzle.answer : '',
            questionsCount: this.state.questionCount
          });
        }, 2000);
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
};

// ================================================================
// Room 页面专用样式（注入到 DOM）
// ================================================================
(function injectRoomStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Room Header */
    .room-header{display:flex;align-items:center;gap:10px;padding:10px 16px;
      border-bottom:1px solid var(--border);flex-shrink:0;
      background:linear-gradient(180deg,rgba(20,18,32,0.8),rgba(8,8,18,0.9));}
    .room-title-area{flex:1;display:flex;flex-direction:column;gap:2px;}
    .room-id{font-size:14px;font-weight:700;color:var(--gold);letter-spacing:2px;}
    .room-meta{font-size:10px;color:var(--text-muted);letter-spacing:1px;}
    .room-timer{font-size:20px;font-weight:800;color:var(--gold);
      font-variant-numeric:tabular-nums;letter-spacing:1px;
      text-shadow:0 0 16px var(--gold-glow);}

    /* Room Main — 卷宗面板在深靛蓝黑中的布局 */
    .room-main{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;
      padding:10px;min-height:0;overflow:hidden;align-items:stretch;}
    @media(min-width:500px){.room-main{grid-template-columns:240px 1fr 200px;}}

    /* 卷宗面板在暗黑环境中的表现 */
    .room-puzzle-panel,.room-clue-panel{
      box-shadow:0 4px 24px rgba(0,0,0,0.7),0 0 60px rgba(0,0,0,0.3);
      transform:rotate(-0.5deg);margin:4px 0;}
    .room-clue-panel{transform:rotate(0.5deg);}

    /* Chat — 暗色半透明 */
    .room-chat-panel{display:flex;flex-direction:column;
      background:rgba(8,8,18,0.6);border:1px solid var(--border);border-radius:var(--radius-sm);
      overflow:hidden;backdrop-filter:blur(4px);}
    .chat-log{flex:1;overflow-y:auto;padding:8px 10px;scrollbar-width:thin;}
    .chat-entry{padding:5px 8px;margin-bottom:5px;border-radius:6px;font-size:12px;
      line-height:1.5;animation:fadeIn .3s ease-out;transition:background .2s;}
    .chat-system{color:var(--text-muted);font-size:11px;text-align:center;letter-spacing:1px;}
    .chat-question{background:rgba(212,168,83,0.04);border-left:2px solid var(--gold-dim);}
    .chat-question .chat-name{color:var(--gold);}
    .chat-answer{background:rgba(139,58,74,0.06);border-left:2px solid var(--crimson);}
    .chat-answer .chat-name{color:var(--crimson-bright);}
    .clue-hl{font-weight:500;}
    .answer-yes{color:#5aad5a;}
    .answer-no{color:#c45050;}
    .answer-unrelated{color:var(--text-dim);}
    .chat-guess{background:rgba(212,168,83,0.08);border-left:2px solid var(--gold);}
    .chat-guess .chat-name{color:var(--gold-bright);}
    .chat-name{font-weight:600;font-size:11px;}
    .turn-indicator{animation:pulse 2s infinite;border:1px solid var(--gold);background:rgba(212,168,83,0.06);
      border-radius:6px;text-align:center;padding:6px;color:var(--gold);letter-spacing:1px;font-weight:600;font-size:13px;}
    .turn-indicator{background:rgba(212,168,83,0.06);border:1px solid var(--border-gold);
      text-align:center;color:var(--gold);font-style:normal;border-radius:6px;}

    /* Chat Input */
    .chat-input-area{display:flex;gap:6px;padding:8px;border-top:1px solid var(--border);flex-shrink:0;}
    .chat-input-area input{flex:1;padding:10px 12px;font-size:12px;}

    /* Clue items on parchment */
    .clue-list{padding:2px 0;}
    .clue-empty{text-align:center;color:var(--parchment-text-dim);font-size:11px;padding:14px 8px;line-height:1.7;opacity:0.6;}
    .clue-item{display:flex;gap:6px;padding:4px 8px;margin-bottom:2px;border-radius:4px;
      font-size:11px;line-height:1.6;color:var(--parchment-text-dim);opacity:0.7;}
    .clue-item:hover{opacity:1;background:rgba(139,58,74,0.05);}
    .clue-num{font-weight:700;color:var(--crimson);min-width:14px;font-size:10px;}
    .clue-text{flex:1;}

    /* Clue toggle on mobile */
    @media(max-width:400px){.room-clue-panel{display:none;}
      .room-clue-panel.clue-open,.room-clue-panel.memo-expanded{display:flex;position:absolute;right:8px;top:60px;
        bottom:140px;width:180px;z-index:30;box-shadow:0 8px 32px rgba(0,0,0,0.8);}}

    /* AI Hint Toggle Button */
    .ai-hint-toggle{display:flex;align-items:center;gap:3px;padding:4px 8px !important;font-size:11px !important;
      border:1px solid var(--border) !important;border-radius:12px !important;
      background:rgba(255,255,255,0.04) !important;transition:all .25s;}
    .ai-hint-toggle .ai-hint-icon{font-size:12px;transition:transform .25s;}
    .ai-hint-toggle .ai-hint-label{font-size:10px;color:var(--text-muted);letter-spacing:0.5px;font-weight:600;}
    .ai-hint-toggle.on{border-color:var(--gold-dim) !important;background:rgba(212,168,83,0.1) !important;}
    .ai-hint-toggle.on .ai-hint-label{color:var(--gold);}
    .ai-hint-toggle:not(.on) .ai-hint-icon{opacity:0.4;filter:grayscale(1);}
    .ai-hint-toggle:not(.on) .ai-hint-label{color:var(--text-dim);}

    /* Memo Collapse Header */
    .memo-collapse-header{display:flex;align-items:center;gap:6px;padding:6px 8px;margin-top:4px;
      cursor:pointer;border-radius:6px;transition:background .2s;user-select:none;}
    .memo-collapse-header:hover{background:rgba(139,58,74,0.08);}
    .memo-toggle-icon{font-size:8px;color:var(--crimson);transition:transform .25s;}
    .memo-toggle-text{font-size:10px;color:var(--parchment-text-dim);letter-spacing:1px;font-weight:600;}

    /* Memo Body */
    .memo-body{overflow:hidden;transition:max-height .35s var(--ease-out),opacity .3s;max-height:300px;opacity:1;}
    .memo-body.hidden{max-height:0;opacity:0;}

    /* Memo Textarea */
    .memo-textarea{width:100%;min-height:160px;max-height:260px;resize:vertical;
      background:transparent;border:1px solid rgba(139,58,74,0.15);border-radius:6px;
      padding:10px;font-size:11px;line-height:1.7;color:var(--parchment-text-dim);
      font-family:var(--font);outline:none;transition:border-color .25s;
      scrollbar-width:thin;}
    .memo-textarea::placeholder{color:var(--parchment-text-dim);opacity:0.4;}
    .memo-textarea:focus{border-color:rgba(139,58,74,0.35);background:rgba(0,0,0,0.05);}

    /* Memo expanded state for desktop */
    @media(min-width:500px){
      .room-clue-panel.memo-expanded{grid-row:span 1;min-height:unset;}}

    /* Room Footer */
    .room-footer{padding:0 6px 6px;flex-shrink:0;}

    /* Emoji Bar */
    .emoji-bar{display:flex;gap:6px;justify-content:center;padding:2px 0;flex-wrap:nowrap;overflow-x:auto;}
    .emoji-btn{width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,0.06);
      cursor:pointer;transition:all .2s var(--ease-out);display:flex;align-items:center;justify-content:center;
      flex-shrink:0;border:1px solid rgba(212,168,83,0.15);overflow:hidden;padding:0;}
    .emoji-btn img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
    .emoji-btn:hover{background:rgba(212,168,83,0.15);transform:scale(1.15);border-color:rgba(212,168,83,0.3);}
    .emoji-btn:active{transform:scale(0.9);}

    /* Chat Emoji */
    .chat-emoji{display:flex;align-items:center;gap:6px;padding:4px 0;}
    .chat-emoji-icon{font-size:26px;animation:emojiPop .3s ease-out;filter:drop-shadow(0 0 6px rgba(212,168,83,0.4));}
    .chat-emoji-img{width:48px;height:48px;border-radius:50%;object-fit:cover;
      animation:emojiPop .3s ease-out;border:2px solid rgba(212,168,83,0.2);
      box-shadow:0 0 12px rgba(212,168,83,0.15);}
    .chat-emoji-label{font-size:11px;font-weight:600;color:var(--gold);
      background:rgba(212,168,83,0.1);border:1px solid rgba(212,168,83,0.2);
      padding:2px 8px;border-radius:10px;backdrop-filter:blur(4px);}
    @keyframes emojiPop{0%{transform:scale(0) rotate(-20deg);opacity:0;}60%{transform:scale(1.3) rotate(5deg);}100%{transform:scale(1) rotate(0);opacity:1;}}

    /* Floating Emoji Bubble — 对话气泡 */
    .emoji-float-bubble{position:fixed;z-index:100;
      transform:translate(-50%, 8px) scale(0);opacity:0;
      transition:all .35s cubic-bezier(.34,1.56,.64,1);pointer-events:none;
      display:flex;justify-content:center;filter:drop-shadow(0 4px 16px rgba(0,0,0,0.7));}
    .emoji-float-bubble.show{transform:translate(-50%, -8px) scale(1);opacity:1;}
    .emoji-float-bubble.hide{transform:translate(-50%, -20px) scale(0.5);opacity:0;transition:all .4s ease-in;}
    .emoji-bubble-card{position:relative;background:rgba(8,6,20,0.88);
      border:1.5px solid rgba(212,168,83,0.25);border-radius:16px;
      padding:8px 12px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;
      backdrop-filter:blur(10px);}
    .emoji-bubble-arrow{position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
      width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
      border-top:8px solid rgba(212,168,83,0.25);filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4));}
    .emoji-bubble-arrow::after{content:'';position:absolute;top:-9px;left:-6px;
      border-left:6px solid transparent;border-right:6px solid transparent;
      border-top:7px solid rgba(8,6,20,0.88);}
    .emoji-float-img{width:64px;height:64px;object-fit:contain;animation:emojiFloat 1.5s ease-in-out infinite;}
    .emoji-float-icon{font-size:44px;animation:emojiFloat 1.5s ease-in-out infinite;}
    .emoji-float-label{font-size:10px;font-weight:700;color:var(--gold);
      white-space:nowrap;letter-spacing:0.5px;}
    @keyframes emojiFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}

    /* Portrait Detail Overlay — 点击角色查看大图 */
    .portrait-detail-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;
      background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;
      opacity:0;transition:opacity .3s ease;backdrop-filter:blur(6px);cursor:pointer;}
    .portrait-detail-overlay.show{opacity:1;}
    .portrait-detail-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;
      transform:scale(0.85);transition:transform .35s cubic-bezier(.34,1.56,.64,1);cursor:default;}
    .portrait-detail-overlay.show .portrait-detail-card{transform:scale(1);}
    .portrait-detail-img{max-width:260px;max-height:380px;width:auto;height:auto;object-fit:contain;
      filter:drop-shadow(0 0 24px rgba(212,168,83,0.2)) drop-shadow(0 8px 32px rgba(0,0,0,0.6));}
    .portrait-detail-name{font-size:16px;font-weight:700;color:var(--gold);letter-spacing:2px;
      text-shadow:0 0 12px rgba(212,168,83,0.3);}
    .portrait-detail-close{position:absolute;top:-32px;right:-24px;width:28px;height:28px;
      border-radius:50%;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.5);
      color:var(--text-muted);font-size:14px;display:flex;align-items:center;justify-content:center;
      cursor:pointer;transition:all .2s;line-height:1;}
    .portrait-detail-close:hover{background:rgba(255,255,255,0.15);color:var(--text);border-color:rgba(255,255,255,0.4);}

    /* Room Actions */
    .room-actions{display:flex;gap:6px;justify-content:center;padding:4px 0;}

    .name-hint{font-size:11px;color:var(--text-muted);}
    .puzzle-hint{padding:6px 20px 0;font-size:11px;color:var(--parchment-text-dim);font-style:italic;
      border-top:1px dashed var(--parchment-line);opacity:0.7;margin-top:6px;}
  `;
  document.head.appendChild(style);
})();

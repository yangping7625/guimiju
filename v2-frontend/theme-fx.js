// ================================================================
// 诡谜局 V2 · 主题特效系统（粒子 + 音效）
// 每个主题有独立的粒子风格和氛围音效
// ================================================================

const ThemeFX = {
  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  particles: [],
  animFrame: null,
  currentTheme: 'theme_default',
  audioCtx: null,
  audioNodes: [],
  soundEnabled: true,

  // ================================================================
  // 主题粒子配置
  // ================================================================
  themes: {
    theme_default: {
      bgUrl: 'assets/bg-main.jpg',
      particles: {
        count: 50,
        types: [
          { weight: 0.7, color: 'rgba(212,168,83,', sizeRange: [1, 3.5],
            speedX: [-0.15, 0.15], speedY: [-0.3, -0.05], glow: true },
          { weight: 0.3, color: 'rgba(139,58,74,', sizeRange: [0.5, 2],
            speedX: [-0.1, 0.1], speedY: [0.05, 0.2], glow: true }
        ],
        wobble: true,
        trail: false
      },
      sound: {
        type: 'wind',
        baseFreq: 80,
        description: '阴冷的古堡风声'
      }
    },
    theme_halloween: {
      bgUrl: 'assets/bg-halloween.jpg',
      particles: {
        count: 45,
        types: [
          { weight: 0.5, color: 'rgba(255,140,0,', sizeRange: [1.5, 3],
            speedX: [-0.3, 0.3], speedY: [0.1, 0.4], glow: true },        // 金橙色
          { weight: 0.3, color: 'rgba(180,60,30,', sizeRange: [0.8, 2],
            speedX: [-0.2, 0.2], speedY: [0.05, 0.25], glow: true },       // 暗红
          { weight: 0.2, color: 'rgba(100,50,20,', sizeRange: [2, 4],
            speedX: [-0.1, 0.1], speedY: [-0.5, -0.15], glow: false,       // 蝙蝠（大黑点上升）
            isBat: true }
        ],
        wobble: true,
        trail: false
      },
      sound: {
        type: 'spooky',
        baseFreq: 65,
        description: '万圣夜的诡异风声+远处猫叫'
      }
    },
    theme_qing: {
      bgUrl: 'assets/bg-qing.jpg',
      particles: {
        count: 40,
        types: [
          { weight: 0.5, color: 'rgba(80,220,80,', sizeRange: [1, 3],
            speedX: [-0.08, 0.08], speedY: [-0.6, -0.15], glow: true },       // 绿色磷火
          { weight: 0.3, color: 'rgba(200,180,100,', sizeRange: [0.5, 1.5],
            speedX: [-0.05, 0.05], speedY: [-0.3, -0.05], glow: true },      // 纸钱碎片
          { weight: 0.2, color: 'rgba(150,60,60,', sizeRange: [1, 2],
            speedX: [-0.1, 0.1], speedY: [-0.4, -0.1], glow: true }           // 红色灵光
        ],
        wobble: false,
        trail: true   // 磷火有拖尾
      },
      sound: {
        type: 'chinese_horror',
        baseFreq: 55,
        description: '义庄夜风+远处铃铛'
      }
    },
    theme_undersea: {
      bgUrl: 'assets/bg-undersea.jpg',
      particles: {
        count: 50,
        types: [
          { weight: 0.5, color: 'rgba(40,180,220,', sizeRange: [1, 2.5],
            speedX: [-0.1, 0.1], speedY: [-0.4, -0.08], glow: true },       // 气泡上升
          { weight: 0.3, color: 'rgba(20,100,160,', sizeRange: [0.5, 1.5],
            speedX: [-0.15, 0.15], speedY: [-0.2, 0.05], glow: true },       // 深蓝微粒
          { weight: 0.2, color: 'rgba(80,255,200,', sizeRange: [0.8, 2],
            speedX: [-0.08, 0.08], speedY: [-0.15, 0.1], glow: true }        // 生物荧光
        ],
        wobble: true,
        trail: false
      },
      sound: {
        type: 'underwater',
        baseFreq: 45,
        description: '深海低频嗡鸣+气泡声'
      }
    },
    theme_carnival: {
      bgUrl: 'assets/bg-carnival.jpg',
      particles: {
        count: 45,
        types: [
          { weight: 0.4, color: 'rgba(220,50,50,', sizeRange: [1, 3],
            speedX: [-0.2, 0.2], speedY: [-0.3, 0.1], glow: true },          // 红色彩带
          { weight: 0.3, color: 'rgba(255,200,50,', sizeRange: [1, 2.5],
            speedX: [-0.15, 0.15], speedY: [-0.2, 0.15], glow: true },       // 金色彩纸
          { weight: 0.3, color: 'rgba(180,80,200,', sizeRange: [0.8, 2],
            speedX: [-0.1, 0.1], speedY: [0.05, 0.3], glow: true }           // 紫色星光
        ],
        wobble: true,
        trail: false
      },
      sound: {
        type: 'music_box',
        baseFreq: 440,
        description: '诡异八音盒旋律'
      }
    },
    theme_abyss: {
      bgUrl: 'assets/bg-abyss.jpg',
      particles: {
        count: 35,
        types: [
          { weight: 0.4, color: 'rgba(160,0,200,', sizeRange: [1.5, 3.5],
            speedX: [-0.12, 0.12], speedY: [-0.2, 0.1], glow: true },       // 紫色深渊之光
          { weight: 0.3, color: 'rgba(200,0,100,', sizeRange: [1, 2.5],
            speedX: [-0.08, 0.08], speedY: [-0.15, 0.15], glow: true },      // 品红脉动
          { weight: 0.3, color: 'rgba(60,0,120,', sizeRange: [2, 5],
            speedX: [-0.05, 0.05], speedY: [0, 0.05], glow: true }           // 黑暗吞噬（大暗点）
        ],
        wobble: false,
        trail: true
      },
      sound: {
        type: 'abyss',
        baseFreq: 35,
        description: '深渊凝视的低频心跳'
      }
    }
  },

  // ================================================================
  // 初始化粒子画布
  // ================================================================
  init() {
    this.canvas = document.getElementById('particles-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // 读取用户保存的主题
    const saved = localStorage.getItem('guimiju_v2_theme');
    if (saved && this.themes[saved]) this.currentTheme = saved;
    this.applyTheme(this.currentTheme);
  },

  // ================================================================
  // 画布尺寸
  // ================================================================
  resize() {
    if (!this.canvas) return;
    const app = document.getElementById('app');
    if (!app) return;
    this.w = this.canvas.width = app.clientWidth;
    this.h = this.canvas.height = app.clientHeight;
  },

  // ================================================================
  // 切换主题
  // ================================================================
  applyTheme(themeId) {
    this.currentTheme = themeId;
    const config = this.themes[themeId];
    if (!config) return;

    // 更新背景（通过 CSS 变量驱动 .app::before）
    const appBg = document.querySelector('.app');
    if (appBg && config.bgUrl) {
      appBg.style.setProperty('--theme-bg', `url('${config.bgUrl}') center top/cover no-repeat`);
    }

    // 重新生成粒子
    this.particles = [];
    if (config.particles) {
      for (let i = 0; i < config.particles.count; i++) {
        this.particles.push(this.createParticle(config.particles));
      }
    }

    // 启动动画（如果还没启动）
    if (!this.animFrame) {
      this.animate();
    }

    // 切换音效
    this.playThemeSound(themeId, config.sound);
  },

  // ================================================================
  // 创建粒子
  // ================================================================
  createParticle(config) {
    // 按权重随机选择类型
    let rand = Math.random();
    let type = config.types[0];
    for (const t of config.types) {
      rand -= t.weight;
      if (rand <= 0) { type = t; break; }
    }

    const size = type.sizeRange[0] + Math.random() * (type.sizeRange[1] - type.sizeRange[0]);
    const speedX = type.speedX[0] + Math.random() * (type.speedX[1] - type.speedX[0]);
    const speedY = type.speedY[0] + Math.random() * (type.speedY[1] - type.speedY[0]);

    return {
      x: Math.random() * this.w,
      y: type.isBat ? this.h + Math.random() * 50 : Math.random() * this.h,  // 蝙蝠从底部起飞
      size,
      speedX,
      speedY,
      opacity: Math.random() * 0.5 + 0.15,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
      color: type.color,
      pulse: Math.random() * Math.PI * 2,
      wobble: config.wobble ? Math.random() * Math.PI * 2 : 0,
      trail: config.trail || false,
      isBat: type.isBat || false,
      glow: type.glow,
      batPhase: Math.random() * Math.PI * 2  // 蝙蝠翅膀扇动相位
    };
  },

  // ================================================================
  // 动画循环
  // ================================================================
  animate() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const config = this.themes[this.currentTheme]?.particles;
    if (!config) { this.animFrame = requestAnimationFrame(() => this.animate()); return; }

    ctx.clearRect(0, 0, this.w, this.h);

    this.particles.forEach(p => {
      // 更新状态
      p.wobble += 0.015;
      p.x += p.speedX + (config.wobble ? Math.sin(p.wobble) * 0.15 : 0);
      p.y += p.speedY;
      p.pulse += 0.025;
      p.opacity += p.opacityDir * 0.004;
      if (p.opacity > 0.6) p.opacityDir = -1;
      if (p.opacity < 0.05) { p.opacityDir = 1; p.pulse = Math.random() * Math.PI * 2; }
      if (p.isBat) p.batPhase += 0.08;

      // 边界循环
      if (p.y < -20) { p.y = this.h + 20; p.x = Math.random() * this.w; }
      if (p.y > this.h + 20) { p.y = -20; p.x = Math.random() * this.w; }
      if (p.x < -20) p.x = this.w + 20;
      if (p.x > this.w + 20) p.x = -20;

      const size = p.size + Math.sin(p.pulse) * 0.5;
      const glow = p.opacity * (0.8 + Math.sin(p.pulse) * 0.2);

      if (p.isBat) {
        // 蝙蝠形状：两个三角形翅膀
        const wingSpread = Math.sin(p.batPhase) * size * 2.5;
        ctx.fillStyle = p.color + (glow * 0.8).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - wingSpread - size, p.y - size * 0.8);
        ctx.lineTo(p.x - size * 0.3, p.y - size * 0.2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + wingSpread + size, p.y - size * 0.8);
        ctx.lineTo(p.x + size * 0.3, p.y - size * 0.2);
        ctx.fill();
        // 身体
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.glow) {
        // 发光粒子（三层渲染）
        // 外层光晕
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (glow * 0.06).toFixed(3) + ')';
        ctx.fill();
        // 中层光圈
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (glow * 0.15).toFixed(3) + ')';
        ctx.fill();
        // 核心亮点
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (glow * 0.9).toFixed(3) + ')';
        ctx.fill();
      } else {
        // 普通小点
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (glow * 0.7).toFixed(3) + ')';
        ctx.fill();
      }
    });

    this.animFrame = requestAnimationFrame(() => this.animate());
  },

  // ================================================================
  // 停止粒子
  // ================================================================
  stopParticles() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  },

  // ================================================================
  // Web Audio API 氛围音效系统
  // ================================================================
  getAudioCtx() {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API 不可用');
        return null;
      }
    }
    // 恢复被暂停的上下文（浏览器策略）
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  // 停止当前音效
  stopSound() {
    this.audioNodes.forEach(node => {
      try {
        if (node.gain) {
          node.gain.linearRampToValueAtTime(0, (this.audioCtx?.currentTime || 0) + 1);
          setTimeout(() => { try { node.source?.stop(); } catch(e) {} }, 1200);
        }
      } catch (e) {}
    });
    this.audioNodes = [];
  },

  // 播放主题音效
  playThemeSound(themeId, soundConfig) {
    if (!this.soundEnabled) { this.stopSound(); return; }
    if (!soundConfig) return;

    this.stopSound();
    const ctx = this.getAudioCtx();
    if (!ctx) return;

    try {
      switch (soundConfig.type) {
        case 'wind':
          this._playWind(ctx, soundConfig.baseFreq);
          break;
        case 'spooky':
          this._playSpooky(ctx, soundConfig.baseFreq);
          break;
        case 'chinese_horror':
          this._playChineseHorror(ctx, soundConfig.baseFreq);
          break;
        case 'underwater':
          this._playUnderwater(ctx, soundConfig.baseFreq);
          break;
        case 'music_box':
          this._playMusicBox(ctx, soundConfig.baseFreq);
          break;
        case 'abyss':
          this._playAbyss(ctx, soundConfig.baseFreq);
          break;
      }
    } catch (e) {
      console.warn('音效播放失败:', e.message);
    }
  },

  // ---- 阴风（默认主题）----
  _playWind(ctx, baseFreq) {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // 低频风声
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(200, ctx.currentTime);
    filter1.Q.setValueAtTime(2, ctx.currentTime);
    // 风声频率波动
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(30, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfo.start();

    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.04, ctx.currentTime);
    osc1.connect(filter1);
    filter1.connect(g1);
    g1.connect(master);
    osc1.start();

    // 偶尔的风啸声
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, ctx.currentTime);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.008, ctx.currentTime);
    // 随机高低起伏
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.setValueAtTime(0.05, ctx.currentTime);
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.setValueAtTime(300, ctx.currentTime);
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(osc2.frequency);
    lfo2.start();
    const lfo3 = ctx.createOscillator();
    lfo3.frequency.setValueAtTime(0.03, ctx.currentTime);
    const lfo3Gain = ctx.createGain();
    lfo3Gain.gain.setValueAtTime(0.006, ctx.currentTime);
    lfo3.connect(lfo3Gain);
    lfo3Gain.connect(g2.gain);
    lfo3.start();

    osc2.connect(g2);
    g2.connect(master);
    osc2.start();

    this.audioNodes.push({ gain: master, source: osc1 }, { gain: g1, source: lfo },
      { gain: g2, source: osc2 }, { gain: lfo2Gain, source: lfo2 }, { gain: lfo3Gain, source: lfo3 });
  },

  // ---- 万圣诡异风 ----
  _playSpooky(ctx, baseFreq) {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // 低沉风声
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    osc.connect(filter); filter.connect(g); g.connect(master); osc.start();

    // 不和谐和声（诡异感）
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.01, ctx.currentTime);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
    const lfoG = ctx.createGain();
    lfoG.gain.setValueAtTime(baseFreq * 0.1, ctx.currentTime);
    lfo.connect(lfoG); lfoG.connect(osc2.frequency); lfo.start();
    osc2.connect(g2); g2.connect(master); osc2.start();

    // "猫叫"效果（高频短暂脉冲）
    this._scheduleCatCall(ctx, master, ctx.currentTime + 3);

    this.audioNodes.push({ gain: master, source: osc }, { gain: g, source: null },
      { gain: g2, source: osc2 }, { gain: lfoG, source: lfo });
  },

  _scheduleCatCall(ctx, dest, startTime) {
    try {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, startTime);
      osc.frequency.linearRampToValueAtTime(1200, startTime + 0.15);
      osc.frequency.linearRampToValueAtTime(600, startTime + 0.4);
      osc.frequency.linearRampToValueAtTime(900, startTime + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(0.03, startTime + 0.1);
      g.gain.linearRampToValueAtTime(0, startTime + 0.5);
      osc.connect(g); g.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.6);
      // 循环
      setTimeout(() => {
        if (this.currentTheme === 'theme_halloween' && this.soundEnabled) {
          this._scheduleCatCall(ctx, dest, ctx.currentTime + 8 + Math.random() * 12);
        }
      }, (8 + Math.random() * 12) * 1000);
    } catch (e) {}
  },

  // ---- 中式恐怖（义庄）----
  _playChineseHorror(ctx, baseFreq) {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // 极低频嗡鸣
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, ctx.currentTime);
    filter.Q.setValueAtTime(5, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    osc.connect(filter); filter.connect(g); g.connect(master); osc.start();

    // 铃铛声（金属泛音）
    this._scheduleBell(ctx, master, ctx.currentTime + 2);

    this.audioNodes.push({ gain: master, source: osc }, { gain: g, source: null });
  },

  _scheduleBell(ctx, dest, startTime) {
    try {
      const freqs = [1200, 1800, 2400, 3200];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, startTime + i * 0.15);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, startTime + i * 0.15);
        g.gain.linearRampToValueAtTime(0.015, startTime + i * 0.15 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.15 + 1.5);
        osc.connect(g); g.connect(dest);
        osc.start(startTime + i * 0.15);
        osc.stop(startTime + i * 0.15 + 2);
      });
      setTimeout(() => {
        if (this.currentTheme === 'theme_qing' && this.soundEnabled) {
          this._scheduleBell(ctx, dest, ctx.currentTime + 6 + Math.random() * 10);
        }
      }, (6 + Math.random() * 10) * 1000);
    } catch (e) {}
  },

  // ---- 深海 ----
  _playUnderwater(ctx, baseFreq) {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // 深海低频
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    osc.connect(g); g.connect(master); osc.start();

    // 气泡感（高频随机泛音）
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.Q.setValueAtTime(8, ctx.currentTime);
    const noise = ctx.createOscillator();
    noise.type = 'triangle';
    noise.frequency.setValueAtTime(3000, ctx.currentTime);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.5, ctx.currentTime);
    const lfoG = ctx.createGain();
    lfoG.gain.setValueAtTime(1000, ctx.currentTime);
    lfo.connect(lfoG); lfoG.connect(filter.frequency); lfo.start();
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.01, ctx.currentTime);
    noise.connect(filter); filter.connect(g2); g2.connect(master); noise.start();

    // 水压声
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.015, ctx.currentTime);
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.setValueAtTime(0.08, ctx.currentTime);
    const lfo2G = ctx.createGain();
    lfo2G.gain.setValueAtTime(10, ctx.currentTime);
    lfo2.connect(lfo2G); lfo2G.connect(osc3.frequency); lfo2.start();
    osc3.connect(g3); g3.connect(master); osc3.start();

    this.audioNodes.push({ gain: master, source: osc }, { gain: g, source: null },
      { gain: g2, source: noise }, { gain: g3, source: osc3 }, { gain: lfoG, source: lfo },
      { gain: lfo2G, source: lfo2 });
  },

  // ---- 八音盒 ----
  _playMusicBox(ctx, baseFreq) {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
    master.connect(ctx.destination);

    // 诡异八音盒旋律（小调五声音阶循环）
    const scale = [0, 2, 3, 7, 10, 12, 15, 17]; // 小调五声
    const base = baseFreq / 4;  // 降八度
    this._musicBoxLoop(ctx, master, base, scale, 0);

    // 低频铺垫
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02, ctx.currentTime);
    osc.connect(g); g.connect(master); osc.start();

    this.audioNodes.push({ gain: master, source: null }, { gain: g, source: osc });
  },

  _musicBoxLoop(ctx, dest, base, scale, noteIndex) {
    if (this.currentTheme !== 'theme_carnival' || !this.soundEnabled) return;
    try {
      // 播4个音符
      for (let i = 0; i < 4; i++) {
        const ni = (noteIndex + i) % scale.length;
        const freq = base * Math.pow(2, scale[ni] / 12);
        const startTime = ctx.currentTime + i * 0.6;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        // 八音盒特征：快速起音+指数衰减
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.03, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        osc.connect(g); g.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + 0.55);

        // 加一个高八度泛音
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, startTime);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.01, startTime);
        g2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc2.connect(g2); g2.connect(dest);
        osc2.start(startTime);
        osc2.stop(startTime + 0.35);
      }
      setTimeout(() => {
        this._musicBoxLoop(ctx, dest, base, scale, (noteIndex + 4) % scale.length);
      }, 2400);
    } catch (e) {}
  },

  // ---- 深渊 ----
  _playAbyss(ctx, baseFreq) {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 3);
    master.connect(ctx.destination);

    // 心跳低频
    this._heartbeatLoop(ctx, master, ctx.currentTime);

    // 深渊嗡鸣
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, ctx.currentTime);
    filter.Q.setValueAtTime(10, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    // 缓慢脉冲
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
    const lfoG = ctx.createGain();
    lfoG.gain.setValueAtTime(15, ctx.currentTime);
    lfo.connect(lfoG); lfoG.connect(filter.frequency); lfo.start();
    osc.connect(filter); filter.connect(g); g.connect(master); osc.start();

    // 极高频微弱尖啸（被凝视感）
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(5000, ctx.currentTime);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, ctx.currentTime);
    g2.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 5);
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.setValueAtTime(0.02, ctx.currentTime);
    const lfo2G = ctx.createGain();
    lfo2G.gain.setValueAtTime(0.005, ctx.currentTime);
    lfo2.connect(lfo2G); lfo2G.connect(g2.gain); lfo2.start();
    osc2.connect(g2); g2.connect(master); osc2.start();

    this.audioNodes.push({ gain: master, source: osc }, { gain: g, source: null },
      { gain: g2, source: osc2 }, { gain: lfoG, source: lfo }, { gain: lfo2G, source: lfo2 });
  },

  _heartbeatLoop(ctx, dest, startTime) {
    if (this.currentTheme !== 'theme_abyss' || !this.soundEnabled) return;
    try {
      for (let i = 0; i < 2; i++) {
        const t = startTime + i * 0.25;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.linearRampToValueAtTime(35, t + 0.15);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g); g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.25);
      }
      setTimeout(() => {
        this._heartbeatLoop(ctx, dest, ctx.currentTime);
      }, 1800);
    } catch (e) {}
  },

  // ================================================================
  // 开关音效
  // ================================================================
  toggleSound(enabled) {
    this.soundEnabled = enabled;
    if (enabled) {
      const config = this.themes[this.currentTheme];
      if (config?.sound) this.playThemeSound(this.currentTheme, config.sound);
    } else {
      this.stopSound();
    }
  }
};

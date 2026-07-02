# Trae 交付文档 · 诡谜局 V2 美术素材

> CodeBuddy 整理需求 → Trae 生图接续

---

## 一、项目背景

「诡谜局」是一个暗黑中式恐怖风格的 AI 推理游戏，V2 版增加了**多人联机 + 角色收集/抽卡 + 皮肤系统**。

**视觉风格关键词**：深靛蓝黑底色 + 琥珀金装饰、暗红点缀、中式恐怖美学、哥特暗潮、阴翳礼赞

**色彩参考**（来自 CSS 变量）：
- 背景：`#080812`（深黑蓝）
- 金：`#d4a853`（琥珀金）
- 暗红：`#8b3a4a`
- 文字：`#e8e2d0`（米白纸色）

**⚠️ 重要规则（来自上一轮教训）**：
1. **图片中不要包含任何中文文字**——AI 生成的中文会乱码，文字通过 CSS/剪映叠加
2. 所有角色是人类（不是上一轮的乌鸦皮探长），风格为**暗黑插画/概念艺术风**
3. 立绘需要**竖版构图**，角色占画面中上部，留出下方给 UI 叠加信息

---

## 二、已有素材（不要重复生成）

### 2.1 角色基础立绘（已完成 ✅）
| 角色 | 男 | 女 |
|------|-----|-----|
| 侦探 | `char-detective.png` | `char-detective-f(1).png` |
| 推理社学生 | `char-student-m.png` | `char-student-f.png` |
| 记者 | `char-reporter.png` | `char-reporter-f.png` |
| 通灵师 | `char-psychic.png` | `char-psychic-f.png` |
| 法医 | `char-doctor.png` | `char-doctor-f.png` |
| 悬疑作家 | `char-writer.png` | `char-writer-f.png` |
| 黑客 | `char-hacker-m.png` | `char-hacker.png` |
| 特工 | `char-agent.png` | `char-agent-f.png` |
| 幕后黑手 | `char-mastermind.png` | `char-mastermind-f.png` |

基础立绘全部在 `v2-frontend/assets/` 下，透明底版本在 `v2-frontend/assets/transparent/` 下。

**请在生新图之前先看一遍这些已有立绘，确保新皮肤与基础角色风格一致、辨识度高。**

---

## 三、🔥 高优先任务

### 任务 1：15 张角色皮肤图（最重要的）

皮肤系统前端代码 100% 完成，**就差图**。以下 15 张皮肤已在 `mock.js` 中注册了 URL，生成后放到 `v2-frontend/assets/` 即可直接生效。

#### 主题一：万圣之夜（3 张）

| 文件名 | 角色 | 描述 | 稀有度 |
|--------|------|------|--------|
| `skin-detective-pumpkin.png` | 侦探 | 南瓜头面具 + 侦探风衣，万圣节氛围，橘黄/黑色调 | 稀有 |
| `skin-psychic-ghost.png` | 通灵师 | 灵体共鸣 + 幽灵面纱，半透明质感，苍白蓝紫调 | 稀有 |
| `skin-doctor-vampire.png` | 法医 | 吸血鬼伯爵装扮，黑色高领披风，暗红内衬，苍白肤色 | 史诗 |

#### 主题二：古墓迷踪（3 张）

| 文件名 | 角色 | 描述 | 稀有度 |
|--------|------|------|--------|
| `skin-detective-taoist.png` | 侦探 | 茅山道士风格，黄色道袍+桃木剑+黄符，青铜/朱砂色调 | 稀有 |
| `skin-reporter-jiangshi.png` | 记者 | 僵尸记者，清代官服+额贴黄符，青灰肤色+官帽 | 稀有 |
| `skin-writer-paper.png` | 作家 | 纸扎人替身，纸质感+灵笔书魂，苍白米黄+墨黑，诡异唯美 | 史诗 |

#### 主题三：深海迷城（3 张）

| 文件名 | 角色 | 描述 | 稀有度 |
|--------|------|------|--------|
| `skin-doctor-mermaid.png` | 法医 | 人鱼/海妖，珊瑚鳞片+生物发光器官，深海蓝+荧光绿 | 稀有 |
| `skin-psychic-siren.png` | 通灵师 | 塞壬海妖，珍珠饰品+水母飘带，深蓝紫+银白珠光 | 稀有 |
| `skin-agent-diver.png` | 特工 | 蒸汽朋克潜水员，黄铜潜水头盔+鱼叉枪，铜绿/海军蓝 | 史诗 |

#### 主题四：怪诞马戏团（3 张）

| 文件名 | 角色 | 描述 | 稀有度 |
|--------|------|------|--------|
| `skin-detective-clown.png` | 侦探 | 小丑侦探，黑白菱格纹+红色圆鼻+夸张笑容，暗黑马戏团风 | 稀有 |
| `skin-writer-puppet.png` | 作家 | 提线木偶，关节球+十字操控板+傀儡线，木质纹理+彩绘 | 稀有 |
| `skin-hacker-ringmaster.png` | 黑客 | 马戏团长，高顶礼帽+数据鞭+全息显示屏，红金+赛博朋克 | 史诗 |

#### 主题五：深渊凝视（3 张）

| 文件名 | 角色 | 描述 | 稀有度 |
|--------|------|------|--------|
| `skin-detective-void.png` | 侦探 | 虚空侦探，暗影斗篷+深渊之眼(第三只眼)，黑紫渐变+星点 | 史诗 |
| `skin-reporter-shadow.png` | 记者 | 暗影记者，半身化影+摄魂老式相机，黑白灰+烟雾边缘 | 稀有 |
| `skin-mastermind-eye.png` | 幕后黑手 | 全知之眼，三色瞳+宇宙长袍(星云纹理)，金紫+星空黑 | 传说 |

#### 皮肤图规格

```
尺寸：512×768 px（竖版立绘，与基础角色立绘比例一致）
格式：PNG（透明底最好，不行就深色底 #080812）
风格：暗黑插画/概念艺术，与基础立绘同一画风
角色：面部可辨识为同一人（换了衣服/气质，但脸保持一致）
```

### 任务 2：`char-student.png` fallback 图（1 张）

当前代码 `character-ui.js` 奖池列表写死了 `assets/char-student.png` 作为学生角色的默认图，但实际文件是 `char-student-m.png` / `char-student-f.png`。

```
文件名：char-student.png
尺寸：512×768 px
内容：取 char-student-m 和 char-student-f 的中性版本，或直接用男版改名
格式：PNG
```

---

## 四、🟡 中优先任务

### 任务 3：抽卡卡背（1 张）

抽卡系统（gacha）目前没有卡背图，揭示翻牌动画处缺素材。

```
文件名：gacha-card-back.png
尺寸：240×360 px（或 512×768 等比缩小版）
内容：塔罗牌风格卡背——中心为一只金色眼睛/放大镜，周围环绕中式符咒纹样
      深紫底色 + 烫金边框 + 暗红菱形中心图案
风格：神秘/仪式感，与游戏暗黑中式恐怖风格统一
格式：PNG
```

### 任务 4：房间场景背景（3 张）

多人房间现在纯靠 CSS 渐变，加真图氛围感直接翻倍。

| 文件名 | 场景 | 氛围 |
|--------|------|------|
| `room-bg-study.png` | 中式阴翳书房 | 古旧书架、一盏烛台、羊皮纸、窗棂投下的暗影 |
| `room-bg-mansion.png` | 废弃宅邸大厅 | 破败楼梯、蜘蛛网、月光从破碎天窗洒下 |
| `room-bg-alley.png` | 幽暗民国巷子 | 青石板路、雾气、远处一盏昏黄路灯 |

```
尺寸：750×500 px（移动端横版，覆盖房间卡片区）
风格：暗黑中式恐怖 + 低饱和度，色调偏暗（不要太亮，会破坏暗黑氛围）
      画面中心留空（UI 会叠加在中间）
格式：JPG（不需要透明底，文件小）
```

### 任务 5：成就徽章（8 个）

`profile-ui.js` 中定义了 8 个成就，目前用 emoji。换成定制徽章图标。

| 文件名 | 成就名 | 概念 |
|--------|--------|------|
| `badge-newcomer.png` | 初来乍到 | 一颗初升的星 |
| `badge-truth.png` | 真相大白 | 靶心命中 |
| `badge-master.png` | 神探降临 | 金色奖杯 |
| `badge-social.png` | 社交推理 | 两只手交握 |
| `badge-talker.png` | 话痨侦探 | 对话框+放大镜 |
| `badge-speedy.png` | 速战速决 | 闪电+秒表 |
| `badge-collector.png` | 收藏家 | 宝箱/展柜 |
| `badge-veteran.png` | 百战老将 | 勋章/绶带 |

```
尺寸：80×80 px（方形徽章图标）
风格：统一的金色/暗金 + 暗红点缀，带微弱发光
格式：PNG（透明底）
背景：可以是圆形/菱形/八角形徽章轮廓
```

### 任务 6：段位徽章（5 个）

| 文件名 | 段位名 | 概念 |
|--------|--------|------|
| `rank-bronze.png` | 青铜侦探 | 青铜色放大镜 |
| `rank-silver.png` | 白银侦探 | 银色放大镜+星 |
| `rank-gold.png` | 黄金侦探 | 金色放大镜+双星 |
| `rank-platinum.png` | 铂金探长 | 铂金盾徽+王冠 |
| `rank-master.png` | 推理大师 | 金色皇冠+翅膀 |

```
尺寸：64×64 px
风格：与成就徽章统一的金色/暗金体系
格式：PNG（透明底）
```

---

## 五、🟢 低优先任务（有空再做）

### 任务 7：皮探长表情包扩展（6 张）

现有 `assets/pi-detective-emotions.png`（合辑），拆成独立表情：

```
文件名模式：pi-emoji-{emotion}.png
尺寸：256×256 px
表情：surprised（惊讶）/ thinking（沉思）/ smirk（坏笑）/ 
      embarrassed（尴尬）/ angry（愤怒）/ cold（冷漠）
格式：PNG（透明底）
角色：黑乌鸦侦探（皮探长），戴棕色猎鹿帽、金色放大镜、大黄眼睛
```

### 任务 8：微信分享卡片图（1 张）

```
文件名：wx-share-card.png
尺寸：1200×630 px（微信分享标准尺寸）
内容：Logo + 暗黑氛围背景 + 微光效果（不要中文文字）
      中心留白给微信自动叠加标题
风格：暗黑中式恐怖 + 金色点缀
格式：JPG
```

### 任务 9：商城页配图（1 张）

`shop-ui.js` 兑换码页面引用了 `assets/pi-detective-v1.png`，可以换一张更大气的中式恐怖插画。

```
文件名：shop-hero.png
尺寸：300×300 px
内容：一间幽暗的中式书房桌上，一本翻开的古籍散发出金色微光
风格：暗黑神秘 + 金色光效点缀
格式：JPG
```

---

## 六、关键参考

### 设计系统速查
```
背景色：#080812 (深黑蓝)
卡片色：#0d0c18
金色：#d4a853
暗红：#8b3a4a
文字色：#e8e2d0 (米白纸色)
稀有度边框：灰(普通) → 蓝(稀有) → 紫(史诗) → 金(传说)
```

### 已有参考图
- 基础角色立绘：`v2-frontend/assets/char-*.png`
- AI 生成场景图：`assets/ai-generated/*.png`
- 皮探长：`assets/pi-detective-v1.png`, `assets/pi-detective-emotions.png`
- Logo：`assets/guimiju-logo-v4.jpg`

### 代码引用位置
- 皮肤 URL 定义：`v2-frontend/mock.js` 第 66-120 行
- 角色 UI 渲染：`v2-frontend/character-ui.js`
- 成就/段位渲染：`v2-frontend/profile-ui.js`
- 房间立绘渲染：`v2-frontend/room-game.js`

---

## 七、文件命名与放置规范

```
v2-frontend/assets/
├── char-*.png              # 已有基础立绘（不修改）
├── skin-*.png              # 🆕 任务1：皮肤图放这里
├── gacha-card-back.png     # 🆕 任务3
├── room-bg-*.jpg           # 🆕 任务4
├── badge-*.png             # 🆕 任务5
├── rank-*.png              # 🆕 任务6
├── transparent/            # 已有透明底版本
│   └── char-*.png
└── TRAE-HANDOFF-V2-IMAGES.md  # 本文档

assets/
├── pi-emoji-*.png          # 🆕 任务7（选做）
├── wx-share-card.png       # 🆕 任务8（选做）
└── shop-hero.png           # 🆕 任务9（选做）
```

---

## 八、优先级建议

如果时间有限，按这个顺序做：

1. **先做任务 1 + 2**（16 张图）→ 皮肤系统立刻可用，用户体验质变
2. **再做任务 4**（3 张背景）→ 房间氛围感翻倍
3. **最后任务 5 + 6**（13 个小图标）→ 个人主页不再全是 emoji

任务 7-9 是运营/推广用的，上线后再补也不迟。

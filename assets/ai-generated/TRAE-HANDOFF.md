# Trae 交付文档 · 诡谜局引流视频素材

> CodeBuddy 已完成 → Trae 接续

---

## 一、项目背景

「诡谜局」是一个 AI 脑洞推理游戏（海龟汤玩法），需要用宣传短视频在抖音/小红书/B站引流。
**皮探长 = 一只卡通黑乌鸦侦探**（戴棕色猎鹿帽、金色放大镜、黄色大眼睛、棕色风衣）。

游戏地址：`https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com/?v=20260630`

---

## 二、已交付素材（16 个文件）

### 2.1 静态图（推荐用 v2- 系列）

| 文件 | 画面 | 用途 |
|------|------|------|
| `v2-scene1-xhs-mystery.png` | 乌鸦侦探站在放大镜上 + 星空 | 小红书封面 |
| `v2-scene2-detective.png` | 皮探长全身角色海报 | 角色展示 / 片头 |
| `v2-scene3-logo-bg.png` | 乌鸦+放大镜+城堡剪影 | Logo / 片头 |
| `v2-scene4-parchment.png` | 乌鸦看羊皮纸卷轴 | 谜题展示中段 |
| `v2-scene5-broken-mirror.png` | 乌鸦站在碎镜框上思考 | 悬疑中段 |
| `v2-scene6-red-door.png` | 乌鸦推开神秘大门回顾 | 片尾 CTA |

（`scene1-7` 是第一版中式恐怖写实风，作为备选）

### 2.2 动态视频片段

| 文件 | 模板 | 时长 | 用途 |
|------|------|------|------|
| `vfx-detective-return2dust.mp4` | 万物归尘 | ~5s | 皮探长粒子登场效果 |
| `vfx-detective-animelive.mp4` | 动漫视频 | ~5s | 皮探长动漫化动效 |
| `vfx-logo-cartoonlive.mp4` | 卡通视频 | ~5s | Logo 卡片动效 |

---

## 三、CodeBuddy 已验证的坑

### 3.1 中文文字乱码 ⚠️ 最重要
CodeBuddy 的 `image_gen` 和 `video-fx` 底层模型**完全无法正确渲染中文**，所有中文文字在生成结果中都会变成乱码/奇怪符号。

**解决方案**：
- 图片/视频生成时**不要描述文字**
- 所有中文标题/字幕**进剪映后叠加**（剪映矢量引擎不会乱码）

### 3.2 video-fx 最佳描述策略
❌ 不要写："图上写着诡谜局三个大字"
✅ 应该写："一只卡通黑乌鸦侦探从紫色迷雾中走来，金色光粒子飘散"

---

## 四、Trae 需要接手的工作

### 4.1 视频生成（用 Trae 的视频模型）
用以下 prompt 风格重新生成（确保不描述中文文字）：

**片头 (0-5s)**：
```
A cute cartoon black crow detective wearing a brown deerstalker hat and trench coat, 
with a golden magnifying glass pendant and big yellow eyes, walks slowly out of 
deep purple-blue mist. Gothic castle silhouettes and a full moon emerge in the background. 
Warm golden light particles float around the detective. Cinematic lighting, 
mysterious but cute atmosphere, anime illustration style, 9:16 vertical.
```

**中段 (5-15s)**：
```
The cartoon crow detective stands at an ancient wooden desk, examining a glowing 
parchment scroll with a golden magnifying glass. Flickering candlelight on the desk, 
moonlight through a round window behind. Camera slowly orbits around the detective. 
Warm amber and deep purple color palette, animated illustration style, 9:16.
```

**片尾 CTA (15-20s)**：
```
The cartoon crow detective stands before a half-open ancient wooden door, 
turning back to look at the camera, extending a wing in a "follow me" gesture. 
Golden light pours through the door crack illuminating the crow's face. 
Deep purple starry sky and fog behind. Inviting, mysterious, 9:16 vertical.
```

### 4.2 剪映剪辑（用上面素材+新视频）
按 `assets/promo-video-prompts.md` 第5节时间线拼接：
- 0-5s: 片头登场
- 5-10s: 谜题展示
- 10-15s: AI问答互动
- 15-20s: CTA 引号

所有文字用剪映内置文字模板叠加。

---

## 五、参考文档

- `assets/promotion-copywriting.md` — 各平台引流文案（小红书/抖音/B站/微博/知乎）
- `assets/promo-video-prompts.md` — 视频分镜脚本和 prompt
- `assets/v1-promo-script.md` — 第一版宣传脚本
- 角色参考图：`assets/pi-detective-v1.jpg` 等

---

## 六、关键信息速查

- 游戏名：诡谜局
- 核心卖点：免费 AI 推理游戏、海龟汤玩法、与 AI 对话猜谜
- 目标平台：小红书（图文）、抖音（短视频）、B站（长视频）
- 目标人群：悬疑推理爱好者、摸鱼党、喜欢海龟汤的人
- 风格：暗黑神秘 + 卡通可爱，紫金色调
- **重要：皮探长 = 卡通乌鸦，不是人类！**

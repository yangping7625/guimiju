# BOSS直聘简历 · 杨平

---

## 基本信息

- **姓名**：杨平
- **手机**：13984947265
- **邮箱**：pizzig1@qq.com
- **出生年份**：2004
- **学历**：本科（在读）

---

## 求职意向

| 字段 | 内容 |
|------|------|
| **期望职位** | AI应用开发 / AI Agent开发 / 实施顾问（实习） |
| **期望城市** | 重庆 |
| **期望薪资** | 4-6K（实习） |
| **到岗时间** | 随时 |
| **每周出勤** | 5天 |

---

## 个人优势

> BOSS直聘限制 2000 字以内，这是精简版：

- **AI Agent 落地能力**：独立搭建多 Agent 智能运维原型系统 SmartGuard，用 Langchain 工具调用 + RAG 检索维修手册 + CrewAI Agent 编排，实现设备诊断→预警→自动派单闭环
- **工业场景理解**：深度调研新能源电站和汽车产线的设备运维痛点，能讲清 Modbus/OPC UA/MQTT 数据采集链路和时序库选型思路
- **从0到1全栈开发**：独立完成 AI 推理游戏「诡谜局」的完整产品开发（DeepSeek API 对接、多轮对话 Agent、CloudBase 云端部署），线上运行中
- **AI 辅助开发熟练**：CodeBuddy/ChatGPT/Claude 等 AI 编程工具深度使用者，工作模式是「人主导架构和规范、AI 执行代码、人工校验质量」
- **快速学习迭代**：遇到问题快速定位根因、检索方案、试错验证——不依赖现成答案，习惯探索性解决问题

---

## 项目经历

### SmartGuard 智维通 · AI 智能运维平台 | 独立开发者 | 2026.06-2026.07

*面向新能源电站和汽车产线的设备智能运维系统，多场景一键切换*

- 设计并实现「一拖二」产品架构，同一套代码支持新能源电站（光伏/储能/充电桩）和汽车产线（焊接/涂装/总装）两个场景，Top Tab 一键切换
- 新能源版覆盖光伏阵列、逆变器、储能BMS、充电桩 12 类设备监控，汽车版覆盖焊接机器人、冲压机、涂装机器人、AGV 等 11 类产线设备
- AI 诊断模块：对全场站/全产线设备数据做综合分析，输出健康度评分 + 异常设备列表 + 维修建议 + 趋势预测，每条建议附精确的检修时间窗口
- 后端规划用 CrewAI 编排三个 Agent（诊断 Agent / 预警 Agent / 派单 Agent），通过 FastAPI 暴露 WebSocket 接口，前端实时消费
- 数据采集层预留 Modbus TCP / OPC UA / MQTT 接口，可直接对接工业网关和时序库（TDengine / InfluxDB）

### 诡谜局 · AI 脑洞推理游戏 | 独立开发者 | 2026.05-2026.07

*🔗 线上可访问：https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com*

- 基于 DeepSeek API 搭建多轮对话 Agent，设计角色约束 Prompt 保障推理逻辑严谨，30 道谜题上线运行
- 独立完成前后端全流程：前端页面（HTML/CSS/JS）、CloudBase 云函数部署、API 鉴权、云端上线
- 使用 CodeBuddy 等 AI 编程工具辅助开发，人主导架构设计，AI 负责代码生成，人工逐段校验
- 沉淀可复用的多轮 Agent 对话架构

### 植物培养小助手 · Coze 智能体应用 | 页面设计 / Agent 编排 | 2026.05-2026.06

- 基于 Coze（扣子）平台搭建 AI 植物养护助手，完成知识库配置、对话流程编排和交互界面设计
- 实际体验了 RAG 检索增强的全流程：文本切片 → 向量存储 → 语义检索 → 大模型生成回答

---

## 教育经历

**遵义师范学院** | 数据科学与大数据技术 | 本科 | 2023-2027

---

## 技术栈

| 层级 | 技能 |
|------|------|
| AI/大模型 | DeepSeek API、Prompt 工程、Langchain、CrewAI、RAG、多 Agent 架构 |
| 工业协议 | Modbus TCP、OPC UA、MQTT（理解链路，有对接方案设计能力） |
| 前端 | HTML5 / CSS3 / JavaScript ES6+ |
| 后端 | FastAPI、Node.js 云函数 |
| 部署 | CloudBase（静态托管 + 云函数 + 数据库）、Git |
| AI 工具 | CodeBuddy、ChatGPT、Claude、Trae — AI 辅助全栈开发工作流 |

---

## 项目补充材料

- 🔗 **诡谜局线上地址**：https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com
- 🖥️ **SmartGuard 原型**：`smartguard/prototype.html`（可现场演示）
- 📄 **行业分析报告**：`smartguard/新能源电站AI巡检-行业分析报告.md`
- 🎥 **AI Agent 学习**：Langchain 工具调用 / RAG / CrewAI 多Agent / LangGraph 流式输出（进行中）

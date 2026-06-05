# Interview Pulse

自适应面试智能体应用 | Next.js, LLM, TS/JS

> 基于大语言模型的模拟面试平台，面向求职者提供实时语音面试、简历解析、技能评估、复盘反馈与自适应知识图谱能力。

## 项目简介

Interview Pulse 是一个 AI 模拟面试应用，目标是让用户在接近真实面试的环境中进行语音练习，并在面试结束后获得结构化复盘。项目使用 Gemini Live 实现实时低延迟语音交互，通过 Neo4j 构建用户技能知识图谱，并结合简历、岗位描述和历史面试表现动态调整后续提问方向。

本项目也规划了 ChromaDB RAG 与 MultiAgent 多智能体协同评估能力，用于增强知识库检索提问和降低单一模型评分的主观偏差。部分模块仍在迭代中，README 中会同时记录已实现能力与后续规划。

## 核心功能

- 基于大语言模型的模拟面试平台，使用 Gemini Live 实现实时低延迟语音交互。
- 使用 Neo4j 图数据库构建自适应知识图谱，动态更新迭代用户的知识点掌握度。
- 通过智能体编排实现面试流程自动化，包括问题生成、简历解析和技能评估。
- 引入 ChromaDB 搭建 RAG 系统，根据用户面试信息实现针对知识库的提问。
- 设计 MultiAgent 多智能体协同评估架构，降低单一模型评估的主观偏差。

## 技术栈

- 前端框架：Next.js 16, React 19, TypeScript
- 样式与交互：Tailwind CSS, Framer Motion, Radix UI, Lucide React
- 大模型能力：Google Gemini, Gemini Live, LangChain
- 数据存储：Firebase Auth, Firestore, Firebase Storage
- 图数据库：Neo4j
- 图谱可视化：Three.js, React Three Fiber, React Force Graph 3D
- 规划模块：ChromaDB RAG, MultiAgent Evaluation

## 当前实现状态

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 用户登录/注册 | 已实现 | 基于 Firebase Auth 提供登录、注册与鉴权保护。 |
| 简历解析 | 已实现 | 上传 PDF 后调用 Gemini 提取候选人信息与技能上下文。 |
| 实时语音面试 | 已实现 | 使用 Gemini Live 建立 WebSocket 实时音频链路，支持语音输入、音频回复和转录记录。 |
| 面试会话管理 | 已实现 | 使用 Firestore 存储面试配置、转录内容、会话状态与复盘结果。 |
| Neo4j 知识图谱 | 已实现 | 从简历和岗位描述抽取技能节点，维护用户与技能的掌握关系。 |
| 图谱动态更新 | 已实现 | 面试复盘后根据技能表现更新 Neo4j 中的技能掌握等级和评分。 |
| 3D 知识图谱展示 | 已实现 | 使用 Three.js 相关能力展示用户技能图谱。 |
| 结构化复盘报告 | 已实现 | 使用 Gemini 生成 JSON 格式复盘，包括评分、优点、改进项、问答反馈和后续清单。 |
| ChromaDB RAG | 规划/待完善 | README 按项目目标写入，当前代码中尚未完整接入 ChromaDB 检索链路。 |
| MultiAgent 协同评估 | 规划/待完善 | 当前复盘主要由单一 Gemini 分析链路完成，多智能体评估架构仍待扩展。 |

## 系统流程

1. 用户注册或登录后进入面试配置页。
2. 用户上传简历 PDF，并可填写目标岗位或 JD 信息。
3. 系统调用 Gemini 解析简历和岗位描述，提取候选人技能上下文。
4. 技能信息写入 Neo4j，形成用户专属知识图谱。
5. 用户进入面试房间，系统将简历、JD 和知识图谱上下文注入 Gemini Live 的系统指令。
6. 面试过程中，用户与 AI 面试官进行实时语音交互，转录内容写入 Firestore。
7. 面试结束后，系统基于转录、岗位配置和图谱上下文生成结构化复盘报告。
8. 复盘结果反向更新知识图谱，用于后续更自适应的提问和评估。

## 项目结构

```text
interview-pulse
├── docs/                         # 架构文档与测试简历
├── public/                       # 静态资源
├── src/
│   ├── app/                      # Next.js App Router 页面、API Routes、Server Actions
│   │   ├── api/                  # Gemini Token、Graph API
│   │   ├── actions/              # 简历解析、图谱同步、复盘生成
│   │   ├── dashboard/            # 用户仪表盘
│   │   ├── graph/                # 知识图谱页面
│   │   ├── history/              # 历史面试记录
│   │   └── interview/            # 面试配置、面试房间、复盘页
│   ├── components/               # UI 组件、鉴权组件、音频与图谱组件
│   ├── contexts/                 # AuthContext
│   ├── hooks/                    # Gemini Live 实时语音 Hook
│   ├── lib/                      # Firebase、Neo4j、音频与工具函数
│   └── services/                 # 会话、复盘、图谱抽取、图谱检索与可视化服务
├── package.json
├── next.config.ts
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`，并按需填写以下配置：

```env
NEXT_PUBLIC_GEMINI_API_KEY=
GEMINI_API_KEY=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

NEO4J_URI=
NEO4J_USERNAME=
NEO4J_PASSWORD=
```

### 3. 启动开发服务

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

### 4. 构建项目

```bash
npm run build
```

### 5. 代码检查

```bash
npm run lint
```

## 关键页面

- `/`：项目首页
- `/login`：登录页
- `/register`：注册页
- `/dashboard`：面试仪表盘
- `/interview/setup`：面试配置与简历上传
- `/interview/room`：实时语音面试房间
- `/interview/debrief/[id]`：面试复盘报告
- `/graph`：知识图谱可视化
- `/history`：历史面试记录

## 架构说明

项目采用分层架构：

- Browser/UI：React 页面与组件，负责页面展示、表单交互、实时语音控制与图谱渲染。
- Controller：Server Actions 与 API Routes，作为前后端边界。
- Service：核心业务逻辑，包括简历解析、图谱同步、复盘生成、技能更新等。
- Data Access：Firebase 与 Neo4j 连接封装。
- Infrastructure：Gemini、Firebase、Neo4j 等外部服务。

更详细的时序图见 `docs/architecture_v2.md`。

## 后续规划

- 完整接入 ChromaDB，构建面向岗位知识库和用户面试历史的 RAG 提问链路。
- 扩展 MultiAgent 评估架构，将技术深度、表达能力、岗位匹配度等维度拆分给不同评估智能体。
- 增强面试问题生成策略，使问题能够根据知识图谱掌握度动态调整难度。
- 完善面试报告导出、长期能力趋势分析和错题/薄弱点训练功能。

## 项目成员

第 19 组

杨熙承 22030531

# Interview Pulse (面试脉搏)

> 基于 Google 原生 Gen AI 技术栈构建的下一代 AI 面试教练。
> **V1 状态:** 已完成 & 功能完整 (2026年1月)

## 🌟 V1: 奠基之作 (已完成)

我们成功构建了一个基于纯 Google 技术栈的高性能、低延迟、语音优先的面试代理。

### 核心架构
- **语音引擎**: 基于 **Gemini Multimodal Live API**，通过原生 WebSocket 通信。我们刻意选择原生 SDK 而非 LangChain，以确保 **零延迟** 的实时打断和语音交互体验。
- **前端**: Next.js 15 (App Router), TailwindCSS v4, Framer Motion。
- **后端/鉴权**: Firebase (Auth, Firestore)，集成 Google 一键登录。
- **视觉交互**: 使用 Three.js (React Three Fiber) 实现随声音律动的 3D 音频可视化球体。

### 核心功能
1.  **实时语音面试**:
    *   全双工语音交互，支持随时打断。
    *   动态“单行刷新”字幕显示，极简美观。
    *   3D 音频可视化，随用户音量实时律动。
2.  **智能上下文**:
    *   **简历解析**: 使用 Gemini Flash 解析 PDF 简历，提取核心技能。
    *   **职位 (JD) 适配**: AI 根据具体的 JD 动态调整面试官人设和提问策略。
3.  **深度复盘**:
    *   自动生成结构化的详细反馈报告。
    *   5 个维度的量化评分 (0-100)。
    *   **完全本地化**: 内容自动生成为简体中文，原本保留原汁原味的语气词。
    *   支持导出 PDF 报告。

---

## 🚀 V2 路线图: "知识图谱" 时代

下一阶段的重点是 **深度** 与 **可视化**。我们将引入 `LangChain` 专门负责 *知识管理* 和 *业务逻辑流*，同时保持核心语音引擎的原生性以确保性能。

### 1. 混合架构 (Native + LangChain)
*   **实时交互层**: 继续使用 **Gemini Native WebSocket** 进行实际通话（此处不使用 LangChain，以严格保证目前的极速体验）。
*   **业务逻辑层**: 引入 **LangChain** 仅用于：
    *   构建知识图谱 (Knowledge Graph Construction)。
    *   深度推理 / 思维链 (Chain-of-Thought) 用于复盘生成。
    *   RAG (检索增强生成) 用于构建企业真题库。

### 2. 新特性: 个人动态知识图谱
我们将利用目前界面上闲置的“设置/偏好”入口，将其改造为 **知识图谱可视化面板**。

*   **痛点**: 目前的面试依赖大模型的隐性知识，虽流畅但缺乏结构严谨性，且难以追踪用户的长期成长。
*   **解决方案**: 用户专属的技能树图谱。
    *   **构建**: 用户上传简历/JD 时，利用 LangChain 提取实体并构建图节点 (例如: `用户` -> 掌握 -> `React` -> 关联知识 -> `Virtual DOM`)。
    *   **隔离**: 每个用户拥有独立的“技能树”图谱（存储于 Neo4j 或轻量级图数据库），实现个性化成长追踪。
    *   **可视化**: 使用 React Flow 或 Three.js 展示用户已“攻克”的知识点 vs “薄弱”环节。

### 3. 新特性: 图谱增强的上下文注入 (Graph Context Injection)
*   **工作流**:
    1.  **会前准备**: 在用户点击“开始面试”前，系统查询其知识图谱中的关键节点（例如：“上一次面试识别出的薄弱点”）。
    2.  **注入**: 将这些节点信息转换为文本 Context。
    3.  **实时会话**: 将这段 Context 注入到 Gemini Live 的 `systemInstruction` 中。
*   **效果**: AI 面试官不再是“泛泛而谈”，而是能精准攻击你图谱中的弱项。且**不增加**通话过程中的延迟（仅在启动时增加毫秒级查询）。

### 4. 持续成长 (长期记忆)
*   **持久化**: 面试结果不仅生成一份报告，更会 *更新* 图谱。回答糟糕的知识点节点变 `红`，回答优秀的变 `绿`。
*   **自适应**: 下一次面试会自动优先考察 `红` 色节点，实现真正的针对性训练。

---

## 🛠️ 技术栈演进

| 组件 | V1 实现 | V2 计划 |
| :--- | :--- | :--- |
| **语音协议** | Native WebSocket (`@google/genai`) | **保持不变** (确保低延迟) |
| **推理引擎** | 直接 Prompt 工程 | **LangChain** (Chains & Agents) |
| **知识存储** | Firestore (Document) | **Neo4j / Graph DB** + Firestore |
| **上下文源** | 纯文本 (Resume/JD) | **知识图谱** + Vector RAG |
| **仪表盘** | 列表视图 | **交互式 3D 知识图谱** |

### 5. 知识图谱示例 (Mermaid)

这是一个用户在进行完一次“React前端”面试后的图谱快照示例：

```mermaid
graph TD
    %% 样式定义
    classDef strong fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d;
    classDef weak fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#7f1d1d;
    classDef unknown fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,stroke-dasharray: 5 5,color:#374151;
    classDef root fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;

    User((用户: Alex)):::root
    
    %% 主领域
    Frontend[前端开发]:::strong
    Backend[后端开发]:::unknown

    User --> Frontend
    User --> Backend

    %% React 分支 (混合状态)
    React[React 生态]:::strong
    Frontend --> React

    Hooks[Hooks 原理]:::strong
    VirtualDOM[虚拟 DOM]:::strong
    Fiber[Fiber 架构]:::unknown
    
    React --> Hooks
    React --> VirtualDOM
    React --> Fiber

    %% 性能优化分支 (薄弱项)
    Perf[性能优化]:::weak
    Frontend --> Perf

    ReRender[无效渲染排查]:::weak
    Memo[useMemo/Callback]:::weak
    CodeSplit[代码分割]:::unknown

    Perf --> ReRender
    Perf --> Memo
    Perf --> CodeSplit

    %% 图注
    subgraph Legend [图例状态]
        Strong[已掌握 (绿色)]:::strong
        Weak[待加强 (红色)]:::weak
        Unknown[未探索 (灰色)]:::unknown
    end
```

**图谱逻辑解读：**
1.  **绿色 (Strong)**: AI 在面试中确认用户熟练掌握的（如 Hooks）。下次面试会减少考察频率。
2.  **红色 (Weak)**: 用户回答卡顿或错误的（如 性能优化/Memo）。**这将是 V2 版本下次面试的“重点攻击对象”。**
3.  **灰色 (Unknown)**: 尚未考察的盲区。AI 会依据图谱关联性逐步探索。


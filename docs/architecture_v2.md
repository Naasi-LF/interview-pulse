# Interview App V2 - 架构时序图 (Layered Architecture)

## 🏗️ 分层定义 (Layers)

1.  **Browser (UI)**: React Components (`src/app/**/page.tsx`, `src/components/**`). 运行在浏览器。
2.  **Control (Controller)**: Server Actions (`src/app/actions/**`) 或 API Routes。作为前后端边界，运行在服务器。
3.  **Service (Business Logic)**: 核心业务逻辑 (`src/services/**`)。运行在服务器。
4.  **Data Access (DAO)**: 数据库连接与原子操作 (`src/lib/**`)。
5.  **Infrastructure (External)**: 外部服务与数据库 (Neo4j, Firestore, Google Gemini)。

---

## 1. 简历解析与图谱构建 (Resume Sync Flow)
**场景**：用户在 Setup 页面上传简历，系统解析并同步到知识图谱。

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser UI<br/>(SetupPage)
    participant Control as Controller<br/>(actions/graph.ts)
    participant Service as Service<br/>(graphExtractionService.ts)
    participant DAO as Data Access<br/>(lib/graph.ts)
    participant Infra as Infrastructure<br/>(Neo4j / Gemini)

    Note over Browser, Infra: Step 1: 简历解析 & 图谱同步
    
    Browser->>Browser: User Uploads PDF
    Browser->>Control: syncGraphAction(uid, resumeText)
    
    activate Control
    Control->>Service: syncResumeToGraph(uid, resumeText)
    
    activate Service
    Service->>Infra: Gemini API (Entity Extraction)
    Infra-->>Service: Extracted Skills JSON
    
    Service->>DAO: getGraphSession()
    activate DAO
    DAO-->>Service: Session Instance
    deactivate DAO

    Service->>DAO: session.run(MERGE User...)
    activate DAO
    DAO->>Infra: Cypher Execution (Neo4j)
    Infra-->>DAO: Result
    DAO-->>Service: Success
    deactivate DAO
    
    Service-->>Control: void
    deactivate Service
    
    Control-->>Browser: { success: true }
    deactivate Control
```

---

## 2. 面试初始化：图谱指令注入 (Context Injection Flow)
**场景**：用户进入房间，系统获取其技能图谱上下文，生成 AI 系统指令。

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser UI<br/>(RoomPage)
    participant Service as Service<br/>(graphRetrievalService.ts)
    participant DAO as Data Access<br/>(lib/graph.ts)
    participant Infra as Infrastructure<br/>(Neo4j)
    participant AI as Gemini Live<br/>(External)

    Note over Browser, AI: Step 2: 获取图谱记忆并连接 AI

    Browser->>Browser: 初始化 handleStart()
    
    %% 这里修改了颜色，使用浅蓝色 rgb(240, 248, 255)
    rect rgb(240, 248, 255)
        Note right of Browser: Retrieve Context (RPC)
        Browser->>Service: getGraphContext(uid)
        activate Service
        Service->>DAO: getGraphSession()
        activate DAO
        DAO->>Infra: MATCH (u)-[r]->(s) RETURN...
        Infra-->>DAO: Result (Nodes/Rels)
        DAO-->>Service: Records
        deactivate DAO
        
        Service->>Service: formatContextPrompt(Records)
        Service-->>Browser: "Strength: React, Weakness: Docker..."
        deactivate Service
    end

    Browser->>Browser: Construct System Instruction
    Browser->>AI: Connect WebSocket (with Graph Context)
    AI-->>Browser: "Connected"
```

---

## 3. 面试复盘：图谱动态更新 (Feedback & Update Flow)
**场景**：面试结束，系统生成复盘报告，并反向更新图谱中的技能评分。

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser UI<br/>(DebriefPage)
    participant Control as Controller<br/>(actions/debrief.ts)
    participant Service as Service<br/>(debriefService.ts)
    participant GraphService as Service<br/>(graphExtractionService.ts)
    participant DAO as Data Access<br/>(lib/firebase.ts / lib/graph.ts)
    participant Infra as Infrastructure<br/>(Neo4j / Gemini)

    Note over Browser, Infra: Step 3: 生成报告 & 记忆写入

    Browser->>Control: triggerDebriefGeneration(sessionId)
    activate Control
    
    Control->>Service: generateDebrief(sessionId)
    activate Service
    
    Service->>DAO: getDoc(session) (Firestore)
    DAO-->>Service: Transcript Data
    
    Service->>Infra: Gemini (Analyze Transcript)
    Infra-->>Service: Debrief JSON (Strengths/Improvements)
    
    Service->>DAO: updateDoc(session, debrief) (Firestore)
    
    rect rgb(240, 248, 255)
        Note right of Service: Graph Evolution (V2 Core)
        Service->>Service: Keyword Matching (React -> 85)
        Service->>GraphService: updateSkillMastery(uid, updates)
        activate GraphService
        GraphService->>DAO: session.run(UNWIND...) (Neo4j)
        DAO->>Infra: UPDATE r.level, r.score
        Infra-->>DAO: Success
        DAO-->>GraphService: Success
        GraphService-->>Service: void
        deactivate GraphService
    end

    Service-->>Control: Debrief Data
    deactivate Service
    
    Control-->>Browser: { success: true, data: ... }
    deactivate Control
```

---

## 4. 可视化查看 (Visualization Flow)
**场景**：Dashboard 加载 3D 知识星球。

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser UI<br/>(GraphPage / 3DComponent)
    participant Control as Controller<br/>(/api/graph/route.ts)
    participant Service as Service<br/>(graphVisualizationService.ts)
    participant DAO as Data Access<br/>(lib/graph.ts)
    participant Infra as Infrastructure<br/>(Neo4j)

    Note over Browser, Infra: Step 4: 渲染知识图谱

    Browser->>Browser: Mount <KnowledgeGraph3D />
    Browser->>Control: GET /api/graph?userId=...
    activate Control
    
    Control->>Service: getUserGraphData(userId)
    activate Service
    
    Service->>DAO: getGraphSession()
    activate DAO
    DAO->>Infra: MATCH (u)-[r]->(s) RETURN...
    Infra-->>DAO: Graph Records
    deactivate DAO
    
    Service->>Service: Transform Node/Link Colors
    Service-->>Control: JSON { nodes: [], links: [] }
    deactivate Service
    
    Control-->>Browser: HTTP 200 OK (JSON)
    deactivate Control
    
    Browser->>Browser: Force Graph Rendering (WebGL)
```

---

## 5. 实时语音交互 (Real-time Interaction)
**场景**：面试中，WebSocket 音频流的实时处理。由于走的是 WebSocket 直接连接 Google，这里没有经过 Next.js 后端。

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser UI<br/>(RoomPage / AudioWorklet)
    participant Hook as Client Logic<br/>(useGeminiLive.ts)
    participant Infra as Infrastructure<br/>(Google Gemini API)

    Note over Browser, Infra: Step 5: 实时语音链路 (Direct WebSocket)

    Browser->>Hook: Capture Microphone Stream
    Hook->>Hook: Audio Processing (PCMU / Base64)
    
    activate Hook
    Hook->>Infra: WebSocket Send (RealtimeInput)
    activate Infra
    note right of Infra: Server-Side VAD & Inference
    
    Infra-->>Hook: WebSocket Receive (Audio Response)
    deactivate Infra
    
    Hook->>Browser: Enqueue Audio Buffer
    Browser->>User: Play Audio (Speaker)
    deactivate Hook
```

---

## 6. 用户认证 (Authentication)
**场景**：用户登录/注册，由 Firebase SDK 直接托管。

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser UI<br/>(LoginPage)
    participant Context as Client Context<br/>(AuthContext.tsx)
    participant SDK as Data Access<br/>(Firebase Auth SDK)
    participant Infra as Infrastructure<br/>(Google Identity)

    Note over Browser, Infra: Step 6: 身份验证

    Browser->>Browser: User clicks "Sign in with Google"
    Browser->>Context: signInWithGoogle()
    
    activate Context
    Context->>SDK: signInWithPopup(provider)
    activate SDK
    
    SDK->>Infra: OAuth 2.0 Flow (Pop-up Window)
    Infra-->>SDK: ID Token & User Info
    
    SDK-->>Context: UserCredential
    deactivate SDK
    
    Context->>Context: setUser(user) & setLoading(false)
    Context-->>Browser: Redirect to /dashboard
    deactivate Context
```


import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
/**
 * 获取单个面试会话详情 (Get Single Session)
 * ----------------------------------------
 * @description
 * 从 Firestore 的 "sessions" 集合中，通过文档 ID (Document ID) 检索完整的面试记录。
 * 这个函数是无状态 HTTP 请求（页面刷新/重新进入房间）恢复上下文的关键。
 *
 * @param sessionId - Firestore 自动生成的唯一文档 ID，用于精准定位某次面试。
 * @returns {object | null} - 包含面试配置 (config)、对话记录 (transcript) 和复盘结果 (debrief) 的完整对象；若不存在返回 null。
 */
export async function getSession(sessionId: string) {
    try {
        const sessionRef = doc(db, "sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
            return { id: sessionSnap.id, ...sessionSnap.data() };
        }
        return null;
    } catch (e) {
        console.error("Error getting session: ", e);
        return null;
    }
}

/**
 * 创建新的面试会话 (Create New Session)
 * ----------------------------------------
 * @description
 * 在 Firestore 的 "sessions" 集合中创建一个新的文档，记录面试的配置信息和对话记录。
 * 这个函数是无状态 HTTP 请求（页面刷新/重新进入房间）恢复上下文的关键。
 *
 * @param userId - 用户 ID，用于关联面试记录。
 * @param config - 面试配置对象，包含面试角色、难度等信息。
 * @returns {string} - 新创建的会话 ID，用于后续操作。
 */
export async function createSession(userId: string, config: any) {
    try {
        const docRef = await addDoc(collection(db, "sessions"), {
            userId,
            startTime: serverTimestamp(),
            status: "active",
            config, // role, difficulty, etc.
            transcript: []
        });
        return docRef.id;
    } catch (e) {
        console.error("Error creating session: ", e);
        throw e;
    }
}
/**
 * 记录实时对话日志 (Log Real-time Transcript)
 * ----------------------------------------
 * @description
 * 将 AI 和用户的每一次对话 (Turn) 实时追加到数据库中。
 * 这是实现“复盘分析”的数据基础。
 *
 * @param sessionId - 目标面试 ID
 * @param role - 说话人身份标识 ("user" | "model")
 * @param text - 说话的具体内容
 * 
 * @technical_detail
 * 使用 Firestore 的 `arrayUnion` 原子操作。
 * 相比于 "读取-修改-写回" 模式，arrayUnion 能在高并发下保证数据不丢失，
 * 且只传输增量数据，极大降低网络带宽消耗。
 */
export async function logTranscript(sessionId: string, role: "user" | "model", text: string) {
    try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, {
            transcript: arrayUnion({
                role,
                text,
                timestamp: Date.now() // client-side timestamp for ordering
            })
        });
    } catch (e) {
        console.error("Error logging transcript: ", e);
    }
}

/**
 * 结束面试会话 (End Interview Session)
 * ----------------------------------------
 * @description
 * 更新会话状态为 "completed"，并记录结束时间。
 * 这是实现“复盘分析”的数据基础。
 *
 * @param sessionId - 目标面试 ID
 */
export async function endSession(sessionId: string) {
    try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, {
            status: "completed",
            endTime: serverTimestamp()
        });
    } catch (e) {
        console.error("Error ending session: ", e);
    }
}

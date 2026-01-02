import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

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

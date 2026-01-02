"use server";

import { generateDebrief } from "@/services/debriefService";

export async function triggerDebriefGeneration(sessionId: string) {
    try {
        const debrief = await generateDebrief(sessionId);
        return { success: true, data: debrief };
    } catch (error: any) {
        console.error("Debrief generation failed:", error);
        return { success: false, error: error.message };
    }
}

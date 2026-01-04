"use server";

import { syncResumeToGraph } from "@/services/graphExtractionService";

export async function syncGraphAction(userId: string, resumeText: string, jdText: string = "") {
    if (!userId) return { success: false, error: "Missing userId" };
    if (!resumeText && !jdText) return { success: false, error: "Missing context (Resume or JD)" };

    try {
        console.log(`Syncing resume for user ${userId} to graph...`);
        await syncResumeToGraph(userId, resumeText, jdText);
        return { success: true };
    } catch (error: any) {
        console.error("Graph sync failed:", error);
        return { success: false, error: error.message };
    }
}

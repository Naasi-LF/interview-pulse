import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateSkillMastery } from "./graphExtractionService";

// Define the Schema for structured output
const DEBRIEF_SCHEMA = {
    type: "OBJECT",
    properties: {
        session_summary: {
            type: "OBJECT",
            properties: {
                session_status: { type: "STRING", enum: ["ended_early", "completed"] },
                planned_duration_minutes: { type: "INTEGER" },
                actual_duration_minutes: { type: "INTEGER" },
                role_guess: { type: "STRING" },
                company: { type: "STRING" },
                interview_type: { type: "STRING" },
                difficulty: { type: "STRING" },
                topics_discussed: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            topic: { type: "STRING" },
                            notes: { type: "ARRAY", items: { type: "STRING" } }
                        }
                    }
                }
            }
        },
        conversation_summary: { type: "STRING" },
        scores: {
            type: "OBJECT",
            properties: {
                overall: { type: "INTEGER" },
                communication_structure_star: { type: "INTEGER" },
                role_fit: { type: "INTEGER" },
                confidence_clarity: { type: "INTEGER" },
                delivery: { type: "INTEGER" },
                technical_depth: { type: "INTEGER" }
            }
        },
        strengths: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    evidence: {
                        type: "OBJECT",
                        properties: {
                            timestamp_start: { type: "STRING" },
                            timestamp_end: { type: "STRING" },
                            quote: { type: "STRING" }
                        }
                    },
                    why_it_matters: { type: "STRING" }
                }
            }
        },
        improvements: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    issue: { type: "STRING" },
                    evidence: {
                        type: "OBJECT",
                        properties: {
                            timestamp_start: { type: "STRING" },
                            timestamp_end: { type: "STRING" },
                            quote: { type: "STRING" }
                        }
                    },
                    better_answer_example: { type: "STRING" },
                    micro_exercise: { type: "STRING" }
                }
            }
        },
        delivery_metrics: {
            type: "OBJECT",
            properties: {
                filler_word_estimate: { type: "INTEGER" },
                pace_wpm_estimate: { type: "INTEGER" },
                long_pause_estimate: { type: "INTEGER" }
            }
        },
        moments_that_mattered: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    label: { type: "STRING" },
                    timestamp_start: { type: "STRING" },
                    timestamp_end: { type: "STRING" },
                    reason: { type: "STRING" }
                }
            }
        },
        next_interview_checklist: { type: "ARRAY", items: { type: "STRING" } },
        notes_if_low_data: { type: "STRING" }
    },
    required: ["session_summary", "conversation_summary", "scores", "strengths", "improvements", "delivery_metrics", "moments_that_mattered", "next_interview_checklist"]
};

export async function generateDebrief(sessionId: string) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (typeof window !== "undefined") {
        throw new Error("generateDebrief must be called from Server Component or Server Action");
    }

    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const client = new GoogleGenAI({ apiKey });

    // 1. Fetch Transcript
    const sessionRef = doc(db, "sessions", sessionId);

    // Retry logic for flaky connections (common with Firestore Client SDK in Node via Proxy)
    let sessionSnap;
    let retries = 3;
    while (retries > 0) {
        try {
            sessionSnap = await getDoc(sessionRef);
            break;
        } catch (e) {
            console.warn(`Firestore getDoc failed, retrying... (${retries} left)`, e);
            retries--;
            if (retries === 0) throw e;
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s
        }
    }

    if (!sessionSnap || !sessionSnap.exists()) throw new Error("Session not found");

    const sessionData = sessionSnap.data();
    const transcript = sessionData.transcript || [];
    const config = sessionData.config || {};

    // Format Transcript
    const transcriptText = transcript.map((t: any) => `[${t.role}]: ${t.text}`).join("\n");

    // Fallback for Empty Transcript
    if (!transcriptText || transcriptText.trim().length === 0) {
        console.warn("Transcript is empty, generating minimal debrief.");
    }

    // 2. Call Gemini
    // Switched to stable Flash model to avoid experimental timeouts/cancellations
    const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
            parts: [{
                text: `
                You are an expert Interview Coach. Analyze the following interview transcript and generate a debrief JSON.
                
                Context:
                Role: ${config.role || "General"}
                Difficulty: ${config.difficulty || "Medium"}
                Job Description: ${config.jd || "Not provided"}

                Transcript:
                ${transcriptText.length > 0 ? transcriptText : "(No audible conversation recorded)"}
                
                Requirements:
                - **LANGUAGE: OUTPUT MUST BE IN SIMPLIFIED CHINESE (简体中文).**
                - \`conversation_summary\`: A comprehensive paragraph recounting what was discussed in the interview.
                - \`improvements\`: Provide **at least 3 to 5** specific improvement items. Do not limit to just 2.
                - For \`evidence.quote\`: **Convert any Traditional Chinese (Traditional Chinese) from the transcript to Simplified Chinese (Simplified Chinese).** HOWEVER, you MUST PRESERVE the speaker's original speech patterns, interruptions, filler words (e.g. "uhm", "like"), and stammers. Do not correct the grammar or fluency of the quote, only the character set.
                - CRITICAL: ALL SCORES (overall, role_fit, etc.) MUST BE ON A SCALE OF 0-100. (e.g., 75, 88, 92). Do not use 0-5 or 0-10.
                - If transcript is short (< 2 turns) or empty, provide score 0-100 (e.g. 10) and explain in notes_if_low_data that the session had no audio.
                `
            }]
        }],
        config: {
            responseMimeType: "application/json",
            responseSchema: DEBRIEF_SCHEMA
        }
    });

    // Handle response
    let text: string = "";

    // Check for text property (getter)
    if (response.text) {
        // @ts-ignore - Handle possible getter vs function difference dynamically if needed, but error says getter
        text = typeof response.text === 'function' ? (response as any).text() : response.text;
    } else if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
    } else {
        text = JSON.stringify(response);
    }

    let debriefData;
    try {
        debriefData = JSON.parse(text || "{}");

        // --- V2 Graph Update Trigger ---
        // We can infer skill updates from the 'strengths' and 'improvements'
        // For a real production app, we would ask the LLM to output a specific "skill_scores" map.
        // Here, we use a heuristic based on the conversation topics or asking LLM for it explicitely.
        // For MVP, let's just log that we would update here.
        // To make it real, let's assume we want to update the skills mentioned in 'strengths' to score 85
        // and 'improvements' to score 30.

        try {
            const updates: { name: string, score: number }[] = [];
            const userId = sessionData.userId; // Get userId from sessionData

            if (userId) {
                // 1. Fetch user's actual skills from Graph (Dynamic, not hardcoded)
                const { getUserSkillNames } = await import("./graphExtractionService");
                const keywords = await getUserSkillNames(userId);
                console.log(`Matching against ${keywords.length} user skills:`, keywords);

                // If graph is empty, maybe fallback or just do nothing (no nodes to update anyway)
                if (keywords.length === 0) {
                    console.log("User graph is empty, no existing skills to update.");
                }

                const findMatches = (text: string, baseScore: number) => {
                    keywords.forEach((kw: string) => {
                        if (text.toLowerCase().includes(kw.toLowerCase())) {
                            updates.push({ name: kw, score: baseScore });
                        }
                    });
                };

                if (debriefData.strengths) {
                    debriefData.strengths.forEach((str: any) => {
                        findMatches(str.title, 85); // High score for strengths
                    });
                }

                if (debriefData.improvements) {
                    debriefData.improvements.forEach((imp: any) => {
                        findMatches(imp.title, 40); // User needs work here
                    });
                }

                if (updates.length > 0) {
                    console.log(`🚀 Updating Knowledge Graph for User ${userId}:`, updates);
                    await updateSkillMastery(userId, updates);
                } else {
                    console.log("No specific technical keywords found to update graph.");
                }
            } else {
                console.warn("No userId found in session, skipping graph update.");
            }

        } catch (e) {
            console.warn("Graph update failed", e);
        }
        // -------------------------------

    } catch (e) {
        console.error("Failed to parse JSON", text);
        throw new Error("Failed to parse AI response: " + text.substring(0, 100));
    }

    // 3. Save to Firestore
    await updateDoc(sessionRef, {
        debrief: debriefData,
        status: "analyzed"
    });

    return debriefData;
}

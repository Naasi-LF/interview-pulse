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
        q_and_a: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    question: { type: "STRING" },
                    answer_summary: { type: "STRING" },
                    feedback: { type: "STRING" }
                }
            }
        },
        skill_updates: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    skill_name: { type: "STRING" },
                    new_score: { type: "INTEGER" },
                    reason: { type: "STRING" }
                }
            }
        },
        next_interview_checklist: { type: "ARRAY", items: { type: "STRING" } },
        notes_if_low_data: { type: "STRING" }
    },
    required: ["session_summary", "conversation_summary", "scores", "strengths", "improvements", "delivery_metrics", "moments_that_mattered", "q_and_a", "skill_updates", "next_interview_checklist"]
};

export async function generateDebrief(sessionId: string) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (typeof window !== "undefined") {
        throw new Error("generateDebrief must be called from Server Component or Server Action");
    }

    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const client = new GoogleGenAI({ apiKey });

    // 1. Fetch Request Context
    const sessionRef = doc(db, "sessions", sessionId);

    // Retry logic for flaky connections
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
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    if (!sessionSnap || !sessionSnap.exists()) throw new Error("Session not found");

    const sessionData = sessionSnap.data();
    const transcript = sessionData.transcript || [];
    const config = sessionData.config || {};
    const userId = sessionData.userId;

    // Fetch existing graph skills for context (AI needs this to know what to update)
    let graphContext = { direct: [] as string[], related: [] as string[] };
    if (userId) {
        try {
            const { getUserGraphContext } = await import("./graphExtractionService");
            graphContext = await getUserGraphContext(userId);
            console.log(`Knowledge Graph Context: ${graphContext.direct.length} direct, ${graphContext.related.length} related found.`);
        } catch (e) {
            console.warn("Failed to fetch user skills for context", e);
        }
    }

    // Format Transcript
    const transcriptText = transcript.map((t: any) => {
        const speaker = t.role === "user" ? "Candidate" : "Interviewer";
        return `[${speaker}]: ${t.text}`;
    }).join("\n");

    if (!transcriptText || transcriptText.trim().length === 0) {
        console.warn("Transcript is empty, generating minimal debrief.");
    }

    // 2. Call Gemini
    const response = await client.models.generateContent({
        model: "gemini-2.5-flash-lite-preview-09-2025",
        contents: [{
            parts: [{
                text: `
                You are an expert Interview Coach. Analyze the following interview transcript and generate a debrief JSON.
                
                Context:
                Role: ${config.role || "General"}
                Difficulty: ${config.difficulty || "Medium"}
                Job Description: ${config.jd || "Not provided"}

                Candidate's Knowledge Graph Context:
                - **Confirmed Skills (Mastery)**: ${graphContext.direct.length > 0 ? JSON.stringify(graphContext.direct) : "(None)"}
                - **Related Concepts (Halo)**: ${graphContext.related.length > 0 ? JSON.stringify(graphContext.related) : "(None)"}

                Transcript:
                ${transcriptText.length > 0 ? transcriptText : "(No audible conversation recorded)"}
                
                Requirements:
                - **LANGUAGE: OUTPUT MUST BE IN SIMPLIFIED CHINESE (简体中文).**
                - **Strictly distinguish between the Interivewer (AI) and the Candidate (User).** Only evaluate the Candidate's answers.
                - \`conversation_summary\`: A comprehensive paragraph recounting what was discussed.
                - \`q_and_a\`: Extract top 3-5 QA pairs with feedback.
                - \`skill_updates\`: Based on the Candidate's answers, update the scores (0-100) of their **Existing Skills** listed above. 
                   - ONLY select skills from the provided list that were actually demonstrated or discussed.
                   - If a NEW important skill appeared that is NOT in the list, you may include it, but prioritize existing nodes.
                   - \`new_score\`: 85+ for strong demonstration, <50 for weak spots.
                - \`improvements\`: Provide **at least 3 to 5** specific improvement items.
                - CRITICAL: ALL SCORES (overall, role_fit, etc.) MUST BE ON A SCALE OF 0-100.
                - If transcript is short (< 2 turns), provide low scores and explain in notes_if_low_data.
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
    if (response.text) {
        // @ts-ignore
        text = typeof response.text === 'function' ? (response as any).text() : response.text;
    } else if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
    } else {
        text = JSON.stringify(response);
    }

    let debriefData;
    try {
        debriefData = JSON.parse(text || "{}");

        // --- V2 Graph Update (AI-Driven) ---
        if (userId && debriefData.skill_updates && debriefData.skill_updates.length > 0) {
            try {
                const updates = debriefData.skill_updates.map((u: any) => ({
                    name: u.skill_name,
                    score: u.new_score
                }));

                console.log(`🚀 AI updating ${updates.length} skills based on interview performance:`, updates);
                const { updateSkillMastery } = await import("./graphExtractionService");
                await updateSkillMastery(userId, updates);

            } catch (e) {
                console.warn("Graph update failed", e);
            }
        } else {
            console.log("No skill updates returned by AI.");
        }
        // -----------------------------------

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

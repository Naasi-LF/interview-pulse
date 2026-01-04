import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getGraphSession } from "@/lib/graph";

// Initialize Gemini for Graph Extraction
const llm = new ChatGoogleGenerativeAI({
    model: "gemini-3-flash-preview",
    apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    temperature: 0,
});

interface ExtractedSkill {
    name: string;
    category: string; // e.g., "Frontend", "Backend", "Language", "Tool"
    level: string;    // "Expert", "Intermediate", "Beginner" (inferred)
}

/**
 * Extracts technical skills from resume text using Gemini
 */
export async function extractSkillsFromText(text: string): Promise<ExtractedSkill[]> {
    const systemPrompt = `
    You are an expert Resume Parser and Knowledge Graph Engineer.
    Your task is to extract technical skills from the provided resume text.
    
    For each skill, determine:
    1. Standardized Name (e.g., "React.js" -> "React", "Amazon Web Services" -> "AWS")
    2. Category (Frontend, Backend, Database, DevOps, Language, Mobile, AI/ML, Other)
    3. Proficiency Level (Expert, Intermediate, Beginner) based on context clues (years of experience, words like "proficient", "familiar"). Default to "Intermediate" if unsure.

    Return ONLY a raw JSON array of objects. Do not include markdown formatting (like \`\`\`json).
    Example:
    [
      {"name": "React", "category": "Frontend", "level": "Expert"},
      {"name": "Python", "category": "Language", "level": "Intermediate"}
    ]
  `;

    const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(text),
    ]);

    try {
        const rawContent = response.content.toString().replace(/```json/g, "").replace(/```/g, "").trim();
        const skills = JSON.parse(rawContent) as ExtractedSkill[];
        return skills;
    } catch (e) {
        console.error("Failed to parse LLM extraction response", e);
        return [];
    }
}

/**
 * Saves extracted skills to Neo4j Graph
 */
export async function saveSkillsToGraph(userId: string, skills: ExtractedSkill[]) {
    const session = getGraphSession();
    try {
        // 1. Ensure User node exists
        await session.run(
            `MERGE (u:User {uid: $userId}) RETURN u`,
            { userId }
        );

        // 2. Batch write skills
        // We use UNWIND to efficiently batch process lines
        const cypher = `
      MATCH (u:User {uid: $userId})
      UNWIND $skills AS skill
      
      // Merge 'Skill' node (Global unique constraint usually on name)
      MERGE (s:Skill {name: skill.name})
      ON CREATE SET s.category = skill.category
      
      // Merge Relationship: User HAS_SKILL Skill
      MERGE (u)-[r:HAS_SKILL]->(s)
      SET r.level = skill.level, 
          r.last_verified = datetime()
    `;

        await session.run(cypher, { userId, skills });
        console.log(`✅ Graph synced: ${skills.length} skills for User ${userId}`);

    } catch (error) {
        console.error("Neo4j Write Error:", error);
        throw error;
    } finally {
        await session.close();
    }
}

/**
 * Main Orchestrator
 */
/**
 * Main Orchestrator: Syncs Resume and/or JD context to Neo4j
 */
export async function syncResumeToGraph(userId: string, resumeText: string, jdText?: string) {
    console.log(`🚀 Starting Graph Sync for User: ${userId}`);

    // Combine texts for extraction (or extract separately? Combined is cheaper/faster for now)
    // We treat JD skills as "Target Skills" or "Context Skills" which are still relevant to the User's graph
    // for this interview app's purpose (showing what they are being tested on).
    let textToAnalyze = "";
    if (resumeText) textToAnalyze += `resumetext:\n${resumeText}\n\n`;
    if (jdText) textToAnalyze += `Job Description:\n${jdText}`;

    if (!textToAnalyze.trim()) {
        console.warn("No text context to sync.");
        return [];
    }

    const skills = await extractSkillsFromText(textToAnalyze);

    if (skills.length > 0) {
        await saveSkillsToGraph(userId, skills);
    } else {
        console.warn("No skills found to sync from text.");
    }

    return skills;
}

/**
 * Updates the mastery level of skills based on interview performance.
 * This is called after the debrief is generated.
 */
export async function updateSkillMastery(userId: string, skillsUpdates: { name: string; score: number }[]) {
    const session = getGraphSession();
    try {
        console.log(`Updating graph mastery for user ${userId}`, skillsUpdates);

        // We map 0-100 score to levels
        // 0-40: Beginner (Red/Weak)
        // 40-80: Intermediate (Yellow/Okay)
        // 80-100: Expert (Green/Strong)

        // Cypher query to update existing relationships
        const cypher = `
      MATCH (u:User {uid: $userId})-[r:HAS_SKILL]->(s:Skill)
      WHERE s.name IN $names
      
      // Dynamic SET based on score map passed in params is hard in pure Cypher without APOC
      // So we iterate in application logic or use UNWIND
    `;

        // Better approach: UNWIND the updates
        const writeQuery = `
      UNWIND $updates AS update
      MATCH (u:User {uid: $userId})-[r:HAS_SKILL]->(s:Skill {name: update.name})
      SET r.last_tested = datetime(),
          r.latest_score = update.score,
          r.level = CASE 
            WHEN update.score >= 80 THEN 'Expert'
            WHEN update.score >= 40 THEN 'Intermediate'
            ELSE 'Beginner'
          END
    `;

        await session.run(writeQuery, {
            userId,
            updates: skillsUpdates
        });

        console.log("✅ Graph mastery levels updated.");

    } catch (error) {
        console.error("Failed to update graph mastery:", error);
    } finally {
        await session.close();
    }
}

/**
 * Retrieves all skill names for a user to enable dynamic keyword matching.
 */
export async function getUserSkillNames(userId: string): Promise<string[]> {
    const session = getGraphSession();
    try {
        const result = await session.run(
            `MATCH (u:User {uid: $userId})-[:HAS_SKILL]->(s:Skill) RETURN s.name`,
            { userId }
        );
        return result.records.map(r => r.get("s.name"));
    } catch (e) {
        console.error("Failed to get user skill names", e);
        return [];
    } finally {
        await session.close();
    }
}

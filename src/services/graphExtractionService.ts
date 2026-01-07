import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getGraphSession } from "@/lib/graph";

// Initialize Gemini for Graph Extraction lazily
function getLLM() {
    return new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash-lite-preview-09-2025",
        apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        temperature: 0,
    });
}

interface ExtractedSkill {
    name: string;
    category: string;
    level: string;
    description?: string; // Short 1-sentence description
    related_skills?: string[]; // List of related skill names
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
    3. Proficiency Level (Expert, Intermediate, Beginner)
    4. **Description**: A very brief, punchy 1-sentence description of what this skill is (in Chinese).
    5. **Related Skills**: A list of 2-3 other highly related technical concepts or tools that are normally associated with this skill (e.g. React -> [JavaScript, Redux, HTML]).

    Return ONLY a raw JSON array of objects. Do not include markdown formatting.
    Example:
    [
      {
        "name": "React", 
        "category": "Frontend", 
        "level": "Expert", 
        "description": "用于构建用户界面的 JavaScript 库", 
        "related_skills": ["JavaScript", "Redux", "HTML"]
      }
    ]
  `;

    const response = await getLLM().invoke([
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

        // 2. Batch write skills and primary relationships
        const cypherMain = `
      MATCH (u:User {uid: $userId})
      UNWIND $skills AS skill
      
      // Merge 'Skill' node
      MERGE (s:Skill {name: skill.name})
      ON CREATE SET 
          s.category = skill.category,
          s.description = skill.description,
          s.created_at = datetime()
      ON MATCH SET
          s.description = skill.description // Update description if better one found
      
      // Merge Relationship: User HAS_SKILL Skill
      MERGE (u)-[r:HAS_SKILL]->(s)
      SET r.level = skill.level, 
          r.last_verified = datetime()
    `;

        await session.run(cypherMain, { userId, skills });

        // 3. Create Peer-to-Peer Skill Relationships (The Semantic Mesh)
        // We do this in a separate pass to ensure all 'main' nodes are likely created, 
        // though MERGE handles missing nodes by creating them.
        const cypherRelations = `
      UNWIND $skills AS skill
      UNWIND skill.related_skills AS relatedName
      
      MATCH (s:Skill {name: skill.name})
      MERGE (target:Skill {name: relatedName})
      
      // Create undirected concept link (or directed "related to")
      MERGE (s)-[:RELATED_TO]->(target)
    `;

        await session.run(cypherRelations, { skills });

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
 * Retrieves user's direct skills AND 1-hop related concepts (The "Knowledge Halo").
 * This gives the AI context on what the user *might* know or *should* know based on their stack.
 */
export async function getUserGraphContext(userId: string): Promise<{ direct: string[], related: string[] }> {
    const session = getGraphSession();
    try {
        // Fetch Direct Skills and their immediate Related concepts
        const cypher = `
            MATCH (u:User {uid: $userId})-[:HAS_SKILL]->(s:Skill)
            
            // Optional: Find related skills (1 hop away)
            OPTIONAL MATCH (s)-[:RELATED_TO]-(related:Skill)
            
            RETURN s.name as direct, collect(distinct related.name) as related_list
        `;

        const result = await session.run(cypher, { userId });

        const directSet = new Set<string>();
        const relatedSet = new Set<string>();

        result.records.forEach(r => {
            const d = r.get("direct");
            if (d) directSet.add(d);

            const rels = r.get("related_list"); // Array
            if (rels) rels.forEach((name: string) => relatedSet.add(name));
        });

        // Filter: Remove 'related' if it's already in 'direct' (known skill)
        const direct = Array.from(directSet);
        const related = Array.from(relatedSet).filter(r => !directSet.has(r));

        return { direct, related };

    } catch (e) {
        console.error("Failed to get graph context", e);
        return { direct: [], related: [] };
    } finally {
        await session.close();
    }
}

/**
 * Legacy support
 */
export async function getUserSkillNames(userId: string): Promise<string[]> {
    const ctx = await getUserGraphContext(userId);
    return ctx.direct;
}

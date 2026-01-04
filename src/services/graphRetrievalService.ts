import { getGraphSession } from "@/lib/graph";

export interface GraphContext {
    weakSkills: string[];
    intermediateSkills: string[];
    expertSkills: string[];
    summary: string;
}

/**
 * Retrieves the user's skill profile from the Knowledge Graph
 * to generate a personalized system instruction.
 */
export async function getGraphContext(userId: string): Promise<GraphContext | null> {
    const session = getGraphSession();
    try {
        // Query all skills connected to the user
        // We assume 'HAS_SKILL' relationship has a 'level' property
        const cypher = `
      MATCH (u:User {uid: $userId})-[r:HAS_SKILL]->(s:Skill)
      RETURN s.name as name, s.category as category, r.level as level
    `;

        const result = await session.run(cypher, { userId });

        if (result.records.length === 0) return null;

        const skills = result.records.map(record => ({
            name: record.get("name") as string,
            level: record.get("level") as string
        }));

        const weak = skills.filter(s => s.level === 'Beginner').map(s => s.name);
        const mid = skills.filter(s => s.level === 'Intermediate').map(s => s.name);
        const strong = skills.filter(s => s.level === 'Expert').map(s => s.name);

        // Generate a natural language summary to be injected into the System Prompt
        let summary = "Candidate Profile based on Knowledge Graph:\n";
        if (strong.length) summary += `[Strengths]: ${strong.join(", ")}. (Expect deep mastery here).\n`;
        if (mid.length) summary += `[Growth Areas]: ${mid.join(", ")}. (Good targets for challenging questions).\n`;
        if (weak.length) summary += `[Weak/New]: ${weak.join(", ")}. (Start with basics, verify understanding).\n`;

        return {
            weakSkills: weak,
            intermediateSkills: mid,
            expertSkills: strong,
            summary
        };

    } catch (error) {
        console.error("Failed to retrieve graph context:", error);
        return null;
    } finally {
        await session.close();
    }
}

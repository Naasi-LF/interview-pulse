import { getGraphSession } from "@/lib/graph";

export interface GraphData {
    nodes: { id: string; group: number; val: number; color?: string; name: string; label: string }[];
    links: { source: string; target: string; color?: string; width?: number }[];
}

/**
 * Fetches the user's personal knowledge graph for visualization.
 * Returns a JSON object compatible with react-force-graph-3d.
 */
export async function getUserGraphData(userId: string): Promise<GraphData> {
    const session = getGraphSession();
    try {
        // Query: User -> Skills
        const cypher = `
      MATCH (u:User {uid: $userId})-[r:HAS_SKILL]->(s:Skill)
      RETURN u, r, s
    `;

        const result = await session.run(cypher, { userId });

        const nodesMap = new Map<string, any>();
        const links: any[] = [];

        // Ensure User Node exists as Center
        if (!nodesMap.has(userId)) {
            nodesMap.set(userId, {
                id: userId,
                name: "Me",
                group: 0, // Center
                val: 20,  // Size
                color: "#ffffff"
            });
        }

        result.records.forEach(record => {
            const skill = record.get("s").properties;
            const rel = record.get("r").properties;

            // Color coding based on Level
            let color = "#808080"; // Default Gray
            let val = 5;

            switch (rel.level) {
                case "Expert":
                    color = "#4ade80"; // Green
                    val = 10;
                    break;
                case "Intermediate":
                    color = "#facc15"; // Yellow
                    val = 7;
                    break;
                case "Beginner":
                    color = "#f87171"; // Red
                    val = 5;
                    break;
            }

            // Add Skill Node
            if (!nodesMap.has(skill.name)) {
                nodesMap.set(skill.name, {
                    id: skill.name,
                    name: skill.name,
                    label: rel.level || "Unknown",
                    group: 1,
                    val: val,
                    color: color
                });
            }

            // Add Link (User -> Skill)
            links.push({
                source: userId,
                target: skill.name,
                color: "rgba(255,255,255,0.2)",
                width: 1
            });
        });

        return {
            nodes: Array.from(nodesMap.values()),
            links: links
        };

    } catch (error) {
        console.error("Failed to get graph data:", error);
        return { nodes: [], links: [] };
    } finally {
        await session.close();
    }
}

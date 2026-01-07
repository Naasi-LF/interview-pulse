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
        // Query: User -> Skills AND Skills <-> Skills
        const cypher = `
            MATCH (u:User {uid: $userId})-[r:HAS_SKILL]->(s:Skill)
            
            // Optional: Fetch relationships between these skills
            OPTIONAL MATCH (s)-[rel:RELATED_TO]-(peer:Skill)
            WHERE (u)-[:HAS_SKILL]->(peer) // Only show links if user has both skills (to keep graph clean) or maybe show all? 
                                            // Let's show all related links attached to user's skills for "Discovery" feel
            
            RETURN u, r, s, collect(distinct {target: peer.name, type: type(rel)}) as relationships
        `;

        const result = await session.run(cypher, { userId });

        const nodesMap = new Map<string, any>();
        const links: any[] = [];
        const linkSet = new Set<string>(); // To prevent duplicate links (A-B and B-A)

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
            const peers = record.get("relationships"); // Array of {target, type}

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
                    description: skill.description || "", // Add description
                    group: 1,
                    val: val,
                    color: color
                });
            }

            // Add Link (User -> Skill)
            const userLinkKey = `${userId}-${skill.name}`;
            if (!linkSet.has(userLinkKey)) {
                links.push({
                    source: userId,
                    target: skill.name,
                    color: "rgba(255,255,255,0.2)",
                    width: 1
                });
                linkSet.add(userLinkKey);
            }

            // Add Peer Links (Skill <-> Skill)
            peers.forEach((peer: any) => {
                if (peer.target) {
                    // Note: We only create the link if the target node actually exists in our fetching scope.
                    // The query `WHERE (u)-[:HAS_SKILL]->(peer)` ensures 'peer' is a skill the user likely has.
                    // If we want to show "Potential" skills (halo nodes that user doesn't have yet), we'd need to add them to nodesMap.
                    // For now, let's keep it clean: ONLY draw lines between skills user HAS.

                    // Simple distinct check for undirected edges (A-B is same as B-A)
                    const n1 = skill.name < peer.target ? skill.name : peer.target;
                    const n2 = skill.name < peer.target ? peer.target : skill.name;
                    const linkKey = `${n1}-${n2}`;

                    if (!linkSet.has(linkKey)) {
                        links.push({
                            source: skill.name,
                            target: peer.target,
                            color: "rgba(100,200,255,0.4)", // Blueish for knowledge links
                            width: 0.5,
                            dashed: true // Optional visual distinction
                        });
                        linkSet.add(linkKey);
                    }
                }
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

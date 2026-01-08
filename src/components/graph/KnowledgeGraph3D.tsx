"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SpriteText from "three-spritetext";

// Dynamically import ForceGraph3D to avoid SSR issues with window/canvas
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

export default function KnowledgeGraph3D() {
    const { user } = useAuth();
    const [data, setData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const fgRef = useRef<any>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/graph?userId=${user.uid}`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error("Failed to fetch graph data", e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleNodeClick = useCallback((node: any) => {
        // Aim at node from outside it
        const distance = 40;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

        fgRef.current.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            3000  // ms transition duration
        );
    }, []);

    const [hoverNode, setHoverNode] = useState<any>(null);

    const handleNodeHover = useCallback((node: any) => {
        setHoverNode(node || null);
    }, []);

    return (
        <div className="relative w-full h-screen bg-background overflow-hidden highlight-graph-bg">

            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                <Button variant="secondary" size="icon" onClick={fetchData} title="Refresh Graph" className="shadow-lg hover:shadow-xl bg-white text-foreground hover:bg-white/90">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => fgRef.current.zoomToFit(1000)} title="Reset View" className="shadow-lg hover:shadow-xl bg-white text-foreground hover:bg-white/90">
                    <ZoomOut className="h-4 w-4" />
                </Button>
            </div>

            {/* Description Tooltip (Top Left) - Dynamic - Bubble Style */}
            {hoverNode && hoverNode.description && (
                <div className="absolute top-20 left-8 z-50 max-w-sm p-6 bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-none animate-in slide-in-from-left-4 fade-in duration-300 pointer-events-none">
                    <div className="text-xl font-black font-heading text-primary mb-2">{hoverNode.name}</div>
                    <div className="text-sm text-foreground/80 leading-relaxed font-medium">{hoverNode.description}</div>
                    <div className="mt-3 inline-block px-3 py-1 rounded-full bg-gray-100 text-xs text-muted-foreground font-bold uppercase tracking-wider">{hoverNode.label}</div>
                </div>
            )}

            {/* Legend Overlay - Minimal Pill Style */}
            <div className="absolute bottom-8 left-8 z-50 p-6 bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-white/50 pointer-events-none">
                <h3 className="text-foreground font-black font-heading mb-3 text-lg">Knowledge Map</h3>
                <div className="space-y-3 text-sm font-medium">
                    <div className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full bg-green-400 block shadow-md shadow-green-200"></span>
                        <span className="text-muted-foreground">Expert (Mastery)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full bg-yellow-400 block shadow-md shadow-yellow-200"></span>
                        <span className="text-muted-foreground">Intermediate (Practice)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full bg-red-400 block shadow-md shadow-red-200"></span>
                        <span className="text-muted-foreground">Beginner (Focus Area)</span>
                    </div>
                </div>
            </div>

            {/* Render Graph only after data is ready to prevent Three.js init errors */}
            {!loading && data.nodes.length > 0 && (
                <ForceGraph3D
                    ref={fgRef}
                    graphData={data}
                    nodeLabel="label"
                    nodeColor="color"
                    nodeVal="val"

                    // Visuals - Light Mode Background
                    backgroundColor="#FFFCF5"
                    showNavInfo={false}

                    // Particles on Links (Data flow effect)
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={0.005}
                    // Make links distinct in light mode
                    linkColor={() => "rgba(0,0,0,0.1)"}
                    linkWidth={1}

                    // Interaction
                    onNodeClick={handleNodeClick}
                    onNodeHover={handleNodeHover} // Added Hover Handler

                    // Fog for depth
                    rendererConfig={{ antialias: true, alpha: true }}

                    nodeThreeObjectExtend={true}
                    nodeResolution={64}
                    nodeThreeObject={(node: any) => {
                        const sprite = new SpriteText(node.name);
                        // Ensure text is readable against light background
                        // If node is light color (yellow/green), text needs contrast. 
                        // But standard node colors are readable.
                        sprite.color = node.color;
                        sprite.textHeight = 6;
                        sprite.strokeColor = "white"; // White stroke for legibility
                        sprite.strokeWidth = 1;
                        sprite.position.y = 12; // Floating above the node
                        return sprite;
                    }}
                />
            )}
        </div>
    );
}

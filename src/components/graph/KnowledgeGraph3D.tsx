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

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">

            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                <Button variant="secondary" size="icon" onClick={fetchData} title="Refresh Graph">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => fgRef.current.zoomToFit(1000)} title="Reset View">
                    <ZoomOut className="h-4 w-4" />
                </Button>
            </div>

            {/* Legend Overlay */}
            <div className="absolute bottom-8 left-8 z-50 p-4 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 pointer-events-none">
                <h3 className="text-white font-bold mb-2">Knowledge Map</h3>
                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-400 block shadow-[0_0_10px_#4ade80]"></span>
                        <span className="text-gray-200">Expert (Mastery)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-400 block shadow-[0_0_10px_#facc15]"></span>
                        <span className="text-gray-200">Intermediate (Practice)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-400 block shadow-[0_0_10px_#f87171]"></span>
                        <span className="text-gray-200">Beginner (Focus Area)</span>
                    </div>
                </div>
            </div>

            <ForceGraph3D
                ref={fgRef}
                graphData={data}
                nodeLabel="label"
                nodeColor="color"
                nodeVal="val"

                // Visuals
                backgroundColor="#000000"
                showNavInfo={false}

                // Particles on Links (Data flow effect)
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}

                // Interaction
                onNodeClick={handleNodeClick}

                nodeThreeObjectExtend={true}
                nodeResolution={64}
                nodeThreeObject={(node: any) => {
                    const sprite = new SpriteText(node.name);
                    sprite.color = node.color;
                    sprite.textHeight = 6;
                    sprite.position.y = 12; // Floating above the node
                    return sprite;
                }}
            />
        </div>
    );
}

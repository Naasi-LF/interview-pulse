"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import KnowledgeGraph3D from "@/components/graph/KnowledgeGraph3D";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GraphPage() {
    return (
        <AuthGuard>
            <div className="relative w-full h-screen">
                {/* Back Button Overlay */}
                <div className="absolute top-4 left-4 z-50">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="rounded-full bg-white/80 backdrop-blur hover:bg-white text-foreground shadow-sm">
                            <ArrowLeft className="mr-2 h-4 w-4" /> 返回仪表盘
                        </Button>
                    </Link>
                </div>

                <KnowledgeGraph3D />
            </div>
        </AuthGuard>
    );
}

"use client";

import { useEffect, useState, use } from "react";
import { triggerDebriefGeneration } from "@/app/actions/debrief";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import AuthGuard from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2, ArrowLeft, Download, RefreshCw, CheckCircle, TrendingUp, AlertCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DebriefPage({ params }: { params: Promise<{ id: string }> }) {
    // params is a Promise in Next.js 15+ (implied by "16.1.1" in package.json)
    // We need to unwrap it. React.use() can handle promises.
    const { id } = use(params);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        // Subscribe to session updates
        const unsub = onSnapshot(doc(db, "sessions", id), (doc) => {
            if (doc.exists()) {
                const sessionData = doc.data();
                setData(sessionData);
                setLoading(false);

                // If debrief is missing and not already generating/analyzed, trigger it
                if (!sessionData.debrief && !generating && sessionData.status !== "analyzed" && !error) {
                    setGenerating(true);
                    triggerDebriefGeneration(id).then((res) => {
                        setGenerating(false);
                        if (!res.success) {
                            setError(res.error || "Failed to generate debrief");
                        }
                    });
                }
            }
        });

        return () => unsub();
    }, [id, generating, error]); // Add error dependency to avoid loop if error cleared

    if (loading || !data) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">正在获取面试数据...</p>
            </div>
        );
    }

    const debrief = data.debrief;

    // Show loading ONLY if generating OR (status is active/completed AND no error)
    if (!debrief && !error && (generating || data.status === "completed" || data.status === "active")) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
                <div className="aurora-bg opacity-50" />
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h2 className="text-2xl font-bold">正在分析您的表现...</h2>
                <p className="text-muted-foreground">AI 教练正在复盘本次面试，生成深度洞察。</p>
            </div>
        );
    }

    if (error || !debrief) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
                <div className="aurora-bg opacity-50" />
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-2xl font-bold">分析失败</h2>
                <p className="text-muted-foreground max-w-md text-center">{error || "无法生成复盘报告。"}</p>
                <Button onClick={() => { setError(null); setGenerating(false); }}>重试生成</Button>
            </div>
        )
    }

    if (!debrief) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p>无法加载复盘数据。 <Button onClick={() => triggerDebriefGeneration(id)}>重试生成</Button></p>
            </div>
        )
    }

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background relative overflow-hidden text-foreground pb-20 print:pb-0 print:overflow-visible">
                <div className="aurora-bg opacity-20 print:hidden" />

                {/* Header */}
                <div className="container mx-auto px-4 py-8 print:py-0">
                    <Link href="/dashboard" className="print:hidden">
                        <Button variant="ghost" size="sm" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" /> 返回仪表盘
                        </Button>
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-4xl font-extrabold font-heading tracking-tight">面试复盘</h1>
                            <p className="text-muted-foreground text-lg">{debrief.session_summary?.role_guess || "通用面试"} • <span className="capitalize">{debrief.session_summary?.difficulty}</span></p>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <Button variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" /> 导出 PDF</Button>
                            <Button variant="secondary" onClick={() => triggerDebriefGeneration(id)}><RefreshCw className="mr-2 h-4 w-4" /> 重新生成</Button>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar / Overview */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="glass-card bg-primary/10 border-primary/20">
                            <CardHeader>
                                <CardTitle>综合评分</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="text-7xl font-black font-heading text-primary mb-2">
                                    {debrief.scores?.overall}
                                </div>
                                <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">
                                    总分 100
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>核心指标</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>职位匹配度</span>
                                        <span className="font-bold">{debrief.scores?.role_fit}/100</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${debrief.scores?.role_fit}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>技术深度</span>
                                        <span className="font-bold">{debrief.scores?.technical_depth}/100</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyan-500" style={{ width: `${debrief.scores?.technical_depth}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>沟通表达</span>
                                        <span className="font-bold">{debrief.scores?.communication_structure_star}/100</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: `${debrief.scores?.communication_structure_star}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>逻辑呈现</span>
                                        <span className="font-bold">{debrief.scores?.delivery}/100</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-pink-500" style={{ width: `${debrief.scores?.delivery}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>自信程度</span>
                                        <span className="font-bold">{debrief.scores?.confidence_clarity}/100</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${debrief.scores?.confidence_clarity}%` }} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-8">

                        {/* Conversation Recap - NEW */}
                        <section>
                            <h3 className="text-xl font-bold mb-4 flex items-center font-heading text-blue-400">
                                <MessageSquare className="mr-2 h-5 w-5" /> 面试回顾
                            </h3>
                            <Card className="glass-card">
                                <CardContent className="p-6">
                                    <p className="leading-relaxed text-muted-foreground">
                                        {debrief.conversation_summary || "暂无面试回顾摘要。"}
                                    </p>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Q&A Highlights - NEW */}
                        <section>
                            <h3 className="text-xl font-bold mb-4 flex items-center font-heading text-purple-400">
                                <MessageSquare className="mr-2 h-5 w-5" /> 核心问答回顾
                            </h3>
                            <div className="space-y-4">
                                {debrief.q_and_a?.map((qa: any, i: number) => (
                                    <Card key={i} className="glass-card hover:bg-white/5 transition-colors">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col gap-4">
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">面试官提问</div>
                                                    <h4 className="text-lg font-medium text-white/90">{qa.question}</h4>
                                                </div>
                                                <div className="pl-4 border-l-2 border-white/10">
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">你的回答摘要</div>
                                                    <p className="text-sm text-gray-300">{qa.answer_summary}</p>
                                                </div>
                                                <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-1">AI 点评</div>
                                                    <p className="text-xs text-purple-200">{qa.feedback}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {(!debrief.q_and_a || debrief.q_and_a.length === 0) && (
                                    <div className="p-6 text-center text-muted-foreground bg-white/5 rounded-lg border border-dashed border-white/10">
                                        本次面试没有提取到明显的问答对。
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Strengths */}
                        <section>
                            <h3 className="text-xl font-bold mb-4 flex items-center text-green-400">
                                <CheckCircle className="mr-2 h-5 w-5" /> 优势亮点
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {debrief.strengths?.map((item: any, i: number) => (
                                    <Card key={i} className="glass-card hover:bg-white/5 transition-colors">
                                        <CardHeader>
                                            <CardTitle className="text-base">{item.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mb-3">{item.why_it_matters}</p>
                                            {item.evidence?.quote && (
                                                <div className="p-3 bg-white/5 rounded italic text-xs border-l-2 border-green-500/50 text-white/70">
                                                    "{item.evidence.quote}"
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>

                        {/* Improvements */}
                        <section>
                            <h3 className="text-xl font-bold mb-4 flex items-center text-amber-400">
                                <TrendingUp className="mr-2 h-5 w-5" /> 改进建议
                            </h3>
                            <div className="space-y-4">
                                {debrief.improvements?.map((item: any, i: number) => (
                                    <Card key={i} className="glass-card hover:bg-white/5 transition-colors">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
                                                    <p className="text-sm text-red-200/80 mb-4">{item.issue}</p>
                                                    {item.evidence?.quote && (
                                                        <div className="p-3 bg-red-500/10 rounded italic text-xs border-l-2 border-red-500/40 text-white/70 mb-4">
                                                            "{item.evidence.quote}"
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">如何改进</div>
                                                        <p className="text-sm">{item.micro_exercise}</p>
                                                    </div>
                                                </div>
                                                <div className="md:w-1/3 bg-white/5 rounded-lg p-4 h-fit">
                                                    <div className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">参考回答</div>
                                                    <p className="text-xs italic leading-relaxed opacity-80">{item.better_answer_example}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </AuthGuard >
    );
}

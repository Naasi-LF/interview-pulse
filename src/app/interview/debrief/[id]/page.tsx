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
            <div className="min-h-screen bg-[#FDFBF7] text-foreground pb-20 print:pb-0 print:overflow-visible relative">

                {/* Header Actions (Floating) */}
                <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100/50 print:hidden">
                    <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-5xl">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="rounded-full hover:bg-black/5 text-muted-foreground">
                                <ArrowLeft className="mr-2 h-4 w-4" /> 仪表盘
                            </Button>
                        </Link>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-full border-gray-200">
                                <Download className="mr-2 h-4 w-4" /> 导出报告
                            </Button>
                            <Button variant="default" size="sm" onClick={() => triggerDebriefGeneration(id)} className="rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                                <RefreshCw className="mr-2 h-4 w-4" /> 重新分析
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-6 py-10 max-w-5xl">

                    {/* Hero Section */}
                    <div className="text-center mb-12 animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs uppercase tracking-wider mb-4">
                            面试复盘
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tight text-foreground mb-4">
                            {debrief.session_summary?.role_guess || "本次面试"}
                            <span className="text-muted-foreground font-normal"> 表现分析</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            {debrief.conversation_summary || "AI 正在为你生成深度分析..."}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Left Sidebar: Scores */}
                        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                            {/* Overall Score Card */}
                            <Card className="border-none shadow-[0_20px_60px_rgba(0,0,0,0.06)] rounded-[2.5rem] overflow-hidden bg-white relative group">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-yellow-400"></div>
                                <CardContent className="p-8 text-center relative z-10">
                                    <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">综合得分</div>
                                    <div className="relative inline-block">
                                        <div className="text-8xl font-black font-heading text-foreground tracking-tighter">
                                            {debrief.scores?.overall}
                                        </div>
                                        <div className="absolute -top-4 -right-8 text-2xl animate-bounce">✨</div>
                                    </div>
                                    <div className="mt-4 inline-flex items-center justify-center px-4 py-1 rounded-full bg-gray-50 text-xs font-bold text-gray-500 border border-gray-100">
                                        满分 100
                                    </div>
                                </CardContent>
                                {/* Decorative blob */}
                                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-yellow-100 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                            </Card>

                            {/* Detailed Metrics */}
                            <Card className="border-none shadow-[0_10px_40px_rgba(0,0,0,0.04)] rounded-[2rem] bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold text-foreground">核心能力维度</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {[
                                        { label: "职位匹配度", score: debrief.scores?.role_fit, color: "bg-blue-500", bg: "bg-blue-100" },
                                        { label: "技术深度", score: debrief.scores?.technical_depth, color: "bg-cyan-500", bg: "bg-cyan-100" },
                                        { label: "沟通表达", score: debrief.scores?.communication_structure_star, color: "bg-purple-500", bg: "bg-purple-100" },
                                        { label: "逻辑呈现", score: debrief.scores?.delivery, color: "bg-pink-500", bg: "bg-pink-100" },
                                        { label: "自信程度", score: debrief.scores?.confidence_clarity, color: "bg-green-500", bg: "bg-green-100" },
                                    ].map((metric, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-sm font-bold text-gray-600 mb-2">
                                                <span>{metric.label}</span>
                                                <span>{metric.score || 0}</span>
                                            </div>
                                            <div className={`h-3 ${metric.bg} rounded-full overflow-hidden`}>
                                                <div
                                                    className={`h-full ${metric.color} rounded-full transition-all duration-1000 ease-out`}
                                                    style={{ width: `${metric.score || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Content: Details */}
                        <div className="lg:col-span-2 space-y-10">

                            {/* Highlights Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-green-100 rounded-xl text-green-600">
                                        <CheckCircle className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground">你的高光时刻</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {debrief.strengths?.map((item: any, i: number) => (
                                        <Card key={i} className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-3xl bg-white transition-all">
                                            <CardContent className="p-6">
                                                <h4 className="text-lg font-bold text-foreground mb-2 flex items-center">
                                                    {item.title}
                                                </h4>
                                                <p className="text-muted-foreground leading-relaxed mb-4">{item.why_it_matters}</p>
                                                {item.evidence?.quote && (
                                                    <div className="relative pl-4 border-l-4 border-green-200 py-1">
                                                        <p className="text-sm italic text-gray-500">"{item.evidence.quote}"</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </section>

                            {/* Improvements Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground">成长建议</h3>
                                </div>
                                <div className="space-y-6">
                                    {debrief.improvements?.map((item: any, i: number) => (
                                        <Card key={i} className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[2rem] bg-white transition-all overflow-hidden group">
                                            <div className="flex flex-col md:flex-row h-full">
                                                <div className="p-8 flex-1">
                                                    <div className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold uppercase mb-3">
                                                        Needs Focus
                                                    </div>
                                                    <h4 className="text-xl font-bold text-foreground mb-3">{item.title}</h4>
                                                    <p className="text-gray-600 mb-6 leading-relaxed bg-red-50/50 p-4 rounded-2xl border border-red-50">
                                                        <AlertCircle className="inline h-4 w-4 text-red-400 mr-2" />
                                                        {item.issue}
                                                    </p>

                                                    <div className="space-y-3">
                                                        <div className="font-bold text-sm text-foreground flex items-center">
                                                            🛠️ 刻意练习
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">{item.micro_exercise}</p>
                                                    </div>
                                                </div>

                                                <div className="md:w-2/5 bg-gray-50 p-8 border-l border-dashed border-gray-200 flex flex-col justify-center">
                                                    <div className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3 flex items-center">
                                                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                                        更佳回答示例
                                                    </div>
                                                    <p className="text-sm text-gray-600 italic leading-relaxed">
                                                        "{item.better_answer_example}"
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </section>

                            {/* Q&A Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                                        <MessageSquare className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground">关键问答复盘</h3>
                                </div>
                                <div className="space-y-6">
                                    {debrief.q_and_a?.map((qa: any, i: number) => (
                                        <div key={i} className="space-y-4">
                                            {/* Question Bubble */}
                                            <div className="flex gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                    <span className="font-bold text-gray-500 text-sm">Q</span>
                                                </div>
                                                <div className="bg-white p-5 rounded-3xl rounded-tl-none shadow-sm text-foreground font-medium max-w-2xl">
                                                    {qa.question}
                                                </div>
                                            </div>

                                            {/* Answer Bubble */}
                                            <div className="flex gap-4 flex-row-reverse">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <div className="w-full h-full rounded-full border-2 border-primary/20 bg-primary/10" />
                                                </div>
                                                <div className="bg-orange-50/80 p-5 rounded-3xl rounded-tr-none shadow-sm text-gray-700 text-sm max-w-2xl">
                                                    <div className="font-bold text-xs text-orange-400 mb-1 uppercase">你的回答摘要</div>
                                                    {qa.answer_summary}
                                                </div>
                                            </div>

                                            {/* AI Feedback Bubble */}
                                            <div className="ml-14 mr-14 bg-purple-50 rounded-2xl p-4 border border-purple-100 flex gap-3">
                                                <div className="shrink-0 mt-0.5">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                                </div>
                                                <p className="text-xs text-purple-700 font-medium leading-relaxed">
                                                    <span className="font-bold">AI 点评:</span> {qa.feedback}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard >
    );
}


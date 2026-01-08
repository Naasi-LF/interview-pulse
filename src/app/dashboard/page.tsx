"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Clock, FileText, Settings, LogOut, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const { user, signOut } = useAuth();
    const [stats, setStats] = useState({
        count: 0,
        avgScore: 0,
        recentSessions: [] as any[]
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // Fetch recent sessions
                // We assume Firestore rules allow reading 'sessions' where userId == request.auth.uid

                const q = query(collection(db, "sessions"), where("userId", "==", user.uid));
                const snapshot = await getDocs(q);

                const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

                // Client-side sort to avoid index requirement for now
                sessions.sort((a, b) => (b.startTime?.seconds || 0) - (a.startTime?.seconds || 0));

                const count = sessions.length;
                const completedSessions = sessions.filter(s => s.debrief?.scores?.overall);
                const avgScore = completedSessions.length > 0
                    ? Math.round(completedSessions.reduce((acc, s) => acc + (s.debrief.scores.overall || 0), 0) / completedSessions.length)
                    : 0;

                setStats({
                    count,
                    avgScore,
                    recentSessions: sessions.slice(0, 3)
                });
            } catch (e) {
                console.error("Dashboard fetch error:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    return (
        <AuthGuard>
            <div className="min-h-screen relative overflow-hidden text-foreground pb-20">
                {/* Header */}
                <header className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-xl border-b border-gray-100/50 supports-[backdrop-filter]:bg-white/60">
                    <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                <Mic className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-heading font-black text-xl tracking-tight text-foreground">InterviewPulse</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">{user?.email}</span>
                            <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-full hover:bg-gray-100">
                                <LogOut className="h-5 w-5 text-foreground/70" />
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-6 pt-32 pb-12 relative z-10 max-w-5xl">
                    {/* Welcome Section */}
                    <div className="mb-16 text-center">
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 font-heading text-foreground">
                            准备好开启你的 <br className="hidden md:block" />
                            <span className="text-primary relative inline-block">
                                下一次面试
                                <svg className="absolute -bottom-2 w-full h-3 text-secondary -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.5" />
                                </svg>
                            </span>
                            了吗？
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
                            与 AI 教练进行极其逼真的模拟对练，获取即时反馈，每天进步一点点。
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                            <Link href="/interview/setup">
                                <Button size="lg" className="w-full sm:w-auto text-lg px-10 h-16 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 transition-all">
                                    <Mic className="mr-2 h-6 w-6" /> 开始模拟面试
                                </Button>
                            </Link>
                            <Link href="/history">
                                <Button variant="secondary" size="lg" className="w-full sm:w-auto h-16 text-lg px-8 bg-white shadow-sm hover:bg-gray-50 text-foreground border border-gray-100">
                                    <Clock className="mr-2 h-5 w-5 text-muted-foreground" /> 查看历史
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Stats / Quick Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        <Card className="border-none shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_50px_rgba(0,0,0,0.1)] transition-shadow cursor-default group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FileText className="h-24 w-24 text-primary" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-muted-foreground">已完成会话</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-5xl font-black font-heading text-foreground mb-1">{loading ? "..." : stats.count}</div>
                                <p className="text-sm text-muted-foreground font-medium">累计练习次数</p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_50px_rgba(0,0,0,0.1)] transition-shadow cursor-default group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="text-8xl font-black text-secondary">★</div>
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-muted-foreground">平均得分</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-5xl font-black font-heading text-foreground mb-1">{loading ? "..." : stats.avgScore} <span className="text-2xl text-muted-foreground/60">/100</span></div>
                                <p className="text-sm text-muted-foreground font-medium">综合表现</p>
                            </CardContent>
                        </Card>

                        <Link href="/graph" className="block h-full">
                            <Card className="h-full border-none bg-gradient-to-br from-[#FDFBF7] to-[#FFF4E6] shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_50px_rgba(255,130,53,0.15)] transition-all hover:-translate-y-1 cursor-pointer group relative overflow-hidden ring-1 ring-primary/5">
                                <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-all duration-500 group-hover:scale-110">
                                    <Settings className="h-40 w-40 text-primary" />
                                </div>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold text-primary flex items-center">
                                        知识图谱 <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-black font-heading text-foreground mb-2">Knowledge Graph</div>
                                    <p className="text-sm text-muted-foreground font-medium flex items-center group-hover:text-primary transition-colors">
                                        查看技能宇宙 <ArrowRight className="ml-1 h-4 w-4" />
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>

                    {/* Recent Activity */}
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black font-heading text-foreground">近期练习</h2>
                            {!loading && stats.count > 0 &&
                                <Link href="/history">
                                    <Button variant="ghost" className="text-muted-foreground hover:text-primary">查看全部</Button>
                                </Link>
                            }
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="text-muted-foreground font-medium">正在同步数据...</span>
                            </div>
                        ) : stats.recentSessions.length === 0 ? (
                            <Card className="border-dashed border-2 border-gray-200 bg-transparent shadow-none">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Mic className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-2">还没有开始练习？</h3>
                                    <p className="text-muted-foreground mb-6 max-w-sm">迈出第一步是最难的。现在就开始你的第一次模拟面试吧！</p>
                                    <Link href="/interview/setup">
                                        <Button>开始第一次面试</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {stats.recentSessions.map((s) => {
                                    const isCompleted = !!s.debrief?.scores?.overall;
                                    const targetLink = isCompleted ? `/interview/debrief/${s.id}` : `/interview/room?sessionId=${s.id}`;

                                    return (
                                        <Link href={targetLink} key={s.id} className="block group">
                                            <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-0.5 bg-white">
                                                <CardContent className="p-5 flex items-center justify-between">
                                                    <div className="flex items-center space-x-5">
                                                        <div className={cn(
                                                            "h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg transition-colors border-2",
                                                            isCompleted
                                                                ? "bg-green-50 border-green-100 text-green-600 group-hover:border-green-200"
                                                                : "bg-yellow-50 border-yellow-100 text-yellow-600 group-hover:border-yellow-200"
                                                        )}>
                                                            {isCompleted ? (s.config?.role || "IN").substring(0, 2).toUpperCase() : "▶"}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                                                {s.config?.role || "通用模拟面试"}
                                                            </h4>
                                                            <div className="flex items-center space-x-3 text-sm font-medium text-muted-foreground mt-1">
                                                                <span className="flex items-center">
                                                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                                                    {s.startTime ? new Date(s.startTime.seconds * 1000).toLocaleDateString("zh-CN") : "近期"}
                                                                </span>
                                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                                <span className={cn(
                                                                    "capitalize",
                                                                    s.config?.difficulty === 'hard' ? 'text-red-400' :
                                                                        s.config?.difficulty === 'medium' ? 'text-yellow-500' :
                                                                            'text-green-500'
                                                                )}>
                                                                    {s.config?.difficulty === 'easy' ? '简单' : s.config?.difficulty === 'medium' ? '中等' : s.config?.difficulty === 'hard' ? '困难' : s.config?.difficulty}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center">
                                                        {isCompleted ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-2xl font-black font-heading text-foreground">
                                                                    {s.debrief.scores.overall}
                                                                </span>
                                                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Score</span>
                                                            </div>
                                                        ) : (
                                                            <Button size="sm" className="rounded-full px-6 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold shadow-none">
                                                                继续 <ArrowRight className="ml-1 h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}

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
            <div className="min-h-screen bg-transparent relative overflow-hidden text-foreground">
                <div className="aurora-bg opacity-30" />

                {/* Header */}
                <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/20 backdrop-blur-md">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Mic className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-bold text-lg tracking-tight">InterviewPulse</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground hidden md:inline-block">{user?.email}</span>
                            <Button variant="ghost" size="icon" onClick={() => signOut()}>
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 pt-24 pb-12 relative z-10">
                    {/* Welcome Section */}
                    <div className="mb-12 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 font-heading">
                            准备好攻克你的下一次 <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 font-heading">面试了吗？</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl">
                            与逼真的 AI 面试官模拟练习，获取即时反馈，并追踪您的进步。
                        </p>
                        <div className="mt-8 flex flex-col md:flex-row gap-4">
                            <Link href="/interview/setup">
                                <Button size="lg" className="w-full md:w-auto text-lg px-8 h-14 rounded-full shadow-[0_0_30px_rgba(67,56,202,0.4)] hover:shadow-[0_0_50px_rgba(67,56,202,0.6)] transition-all">
                                    <Mic className="mr-2 h-5 w-5" /> 开始新会话
                                </Button>
                            </Link>
                            <Link href="/history">
                                <Button variant="secondary" size="lg" className="w-full md:w-auto h-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/10">
                                    <Clock className="mr-2 h-5 w-5" /> 查看历史
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Stats / Quick Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <Card className="glass-card hover:border-primary/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">已完成会话</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-heading">{loading ? "..." : stats.count}</div>
                                <p className="text-xs text-muted-foreground">历史总计</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card hover:border-primary/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">平均得分</CardTitle>
                                <div className="h-4 w-4 text-muted-foreground">★</div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-heading">{loading ? "..." : `${stats.avgScore}/100`}</div>
                                <p className="text-xs text-muted-foreground">基于已分析的会话</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card hover:border-primary/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">操作</CardTitle>
                                <Settings className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium">配置偏好</div>
                                <div className="text-sm font-medium text-muted-foreground">更新简历与设置</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <div>
                        <h2 className="text-2xl font-bold mb-6 font-heading">近期会话</h2>
                        {loading ? (
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>加载历史记录...</span>
                            </div>
                        ) : stats.recentSessions.length === 0 ? (
                            <div className="text-muted-foreground">暂无会话。开始您的第一次面试吧！</div>
                        ) : (
                            <div className="space-y-4">
                                {stats.recentSessions.map((s) => (
                                    <Link href={`/interview/debrief/${s.id}`} key={s.id}>
                                        <Card className="glass-card group cursor-pointer hover:bg-white/5 transition-all">
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                        {(s.config?.role || "IN").substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold group-hover:text-primary transition-colors">{s.config?.role || "面试"}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {s.startTime ? new Date(s.startTime.seconds * 1000).toLocaleDateString("zh-CN") : "近期"}
                                                            {s.config?.difficulty && ` • ${s.config.difficulty === 'easy' ? '简单' : s.config.difficulty === 'medium' ? '中等' : s.config.difficulty === 'hard' ? '困难' : s.config.difficulty}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {s.debrief?.scores?.overall ? (
                                                        <span className="inline-block px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">
                                                            Score: {s.debrief.scores.overall}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-yellow-500">In Progress / No Score</span>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}

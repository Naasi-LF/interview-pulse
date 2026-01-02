"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";

export default function HistoryPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchSessions = async () => {
            try {
                const q = query(
                    collection(db, "sessions"),
                    where("userId", "==", user.uid),
                    // orderBy("startTime", "desc") // Requires index
                );
                const querySnapshot = await getDocs(q);
                const sessionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Manual sort as index might not exist
                sessionsData.sort((a: any, b: any) => (b.startTime?.seconds || 0) - (a.startTime?.seconds || 0));
                setSessions(sessionsData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, [user]);

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background relative overflow-hidden text-foreground p-8">
                <div className="aurora-bg opacity-20" />

                <div className="container mx-auto max-w-4xl">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold font-heading">面试历史</h1>
                        <Link href="/dashboard">
                            <Button variant="outline">返回仪表盘</Button>
                        </Link>
                    </div>

                    {loading && <Loader2 className="animate-spin h-8 w-8 mx-auto" />}

                    {!loading && sessions.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground mb-4">暂无面试记录。</p>
                            <Link href="/interview/setup">
                                <Button>开始您的第一次面试</Button>
                            </Link>
                        </div>
                    )}

                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <Link href={`/interview/debrief/${session.id}`} key={session.id}>
                                <Card className="glass-card hover:bg-white/5 transition-all cursor-pointer group">
                                    <CardContent className="p-6 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold text-lg">{session.config?.role || "面试"}</h3>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                {session.startTime ? new Date(session.startTime.seconds * 1000).toLocaleDateString("zh-CN") : "近期"}
                                                <span>•</span>
                                                <span className="capitalize">
                                                    {session.config?.difficulty === 'easy' ? '简单' : session.config?.difficulty === 'medium' ? '中等' : session.config?.difficulty === 'hard' ? '困难' : session.config?.difficulty}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {session.debrief?.scores?.overall && (
                                                <div className="text-2xl font-bold text-primary font-heading">
                                                    {session.debrief.scores.overall}
                                                </div>
                                            )}
                                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}

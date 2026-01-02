"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight, CheckCircle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) return null; // Or a loading spinner

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground flex flex-col">
      <div className="aurora-bg" />

      {/* Nav */}
      <nav className="relative z-10 p-6 flex justify-between items-center container mx-auto">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Mic className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight">InterviewPulse</span>
        </div>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost">登录</Button>
          </Link>
          <Link href="/register">
            <Button className="rounded-full px-6">立即开始</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
          由 Gemini 3.0 驱动
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold font-heading tracking-tight mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          掌控你的面试 <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-indigo-500 font-heading">
            用 AI 驱动的精准度
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          实时语音模拟，即时反馈，以及详细的表现分析。
          在安全的环境中从容应对最棘手的挑战。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Link href="/register">
            <Button size="lg" className="h-14 px-8 rounded-full text-lg shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_rgba(79,70,229,0.7)] transition-all">
              开始准备 <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-lg border-white/10 hover:bg-white/5">
              了解工作原理
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer / Trust */}
      <footer className="relative z-10 py-12 border-t border-white/5 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center space-x-12 mb-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholders for logos */}
            <div className="font-bold text-xl">GOOGLE CLOUD</div>
            <div className="font-bold text-xl">FIREBASE</div>
            <div className="font-bold text-xl">NEXT.JS</div>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 InterviewPulse. 基于 Google Gemini 构建。</p>
        </div>
      </footer>
    </div>
  );
}

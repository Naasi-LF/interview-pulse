"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight, Sparkles, Brain, Activity, Zap, BarChart } from "lucide-react";
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

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 relative overflow-x-hidden font-sans">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-200/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-yellow-200/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

      {/* Nav */}
      <nav className="relative z-50 p-4 md:px-12 md:py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-2 md:space-x-3 cursor-pointer shrink-0" onClick={() => window.scrollTo(0, 0)}>
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Mic className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <span className="font-extrabold text-lg md:text-2xl tracking-tight text-slate-900">InterviewPulse</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/login" className="hidden md:block">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-orange-50 rounded-full px-6 font-semibold">登录</Button>
          </Link>
          <Link href="/register">
            <Button className="rounded-full px-5 h-10 md:px-8 md:h-12 text-sm md:text-base font-bold shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all hover:-translate-y-0.5" variant="default">立即开始</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 pt-20 pb-32 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto">
        <div className="inline-flex items-center rounded-full bg-white border border-orange-100 px-4 py-2 text-sm font-bold text-orange-600 mb-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Sparkles className="h-4 w-4 mr-2" />
          由 Gemini 3.0 全驱动
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 font-heading">
          面试练习，<br />
          <span className="text-primary inline-block relative">
            如此轻松
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-yellow-300 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5 L 100 10 L 0 10 Z" fill="currentColor" />
            </svg>
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          告别焦虑。通过实时 AI 语音模拟、即时反馈和深度图谱分析，
          在舒适的节奏中掌握每一个面试技巧。
        </p>

        <div className="flex flex-col sm:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Link href="/register">
            <Button size="lg" className="h-16 px-12 rounded-full text-xl font-bold shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 transition-all hover:-translate-y-1 bg-primary text-white">
              开始准备 <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="lg" className="h-16 px-12 rounded-full text-xl font-semibold border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white bg-transparent">
              了解更多
            </Button>
          </Link>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-20 py-32 bg-white rounded-[3rem] md:rounded-[5rem] mx-2 md:mx-6 shadow-sm">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 font-heading">为什么选择 InterviewPulse？</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">我们将复杂的面试准备转化为简单、愉快且高效的日常习惯。</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {/* Feature 1 */}
            <div className="bg-[#FDFBF7] p-10 rounded-[2.5rem] hover:scale-[1.02] transition-transform duration-500 group">
              <div className="h-20 w-20 rounded-3xl bg-orange-100 flex items-center justify-center mb-8 group-hover:bg-orange-200 transition-colors">
                <Mic className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">实时语音对话</h3>
              <p className="text-slate-500 text-lg leading-relaxed">
                就像在这个页面和你交谈一样自然。极低延迟的 Gemini Live 引擎，捕捉你的每一个语气停顿，还原真实压迫感。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#FDFBF7] p-10 rounded-[2.5rem] hover:scale-[1.02] transition-transform duration-500 group">
              <div className="h-20 w-20 rounded-3xl bg-blue-100 flex items-center justify-center mb-8 group-hover:bg-blue-200 transition-colors">
                <Zap className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">即时智能反馈</h3>
              <p className="text-slate-500 text-lg leading-relaxed">
                不用等到结束。面试中实时获得微表情、语速和关键词建议。让每一次回答都比上一次更精准。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#FDFBF7] p-10 rounded-[2.5rem] hover:scale-[1.02] transition-transform duration-500 group">
              <div className="h-20 w-20 rounded-3xl bg-purple-100 flex items-center justify-center mb-8 group-hover:bg-purple-200 transition-colors">
                <BarChart className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">能力知识图谱</h3>
              <p className="text-slate-500 text-lg leading-relaxed">
                看着你的技能树生长。我们将你的每一次表现转化为可视化的 3D 知识图谱，直观呈现你的成长轨迹。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-[#FDFBF7] relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center space-x-2 md:space-x-12 mb-12 opacity-40 grayscale hover:grayscale-0 transition-grayscale duration-700 flex-wrap gap-y-4">
            <span className="font-bold text-xl px-4">GOOGLE GEMINI 2.0</span>
            <span className="font-bold text-xl px-4">FIREBASE</span>
            <span className="font-bold text-xl px-4">NEO4J</span>
          </div>
          <p className="text-sm font-semibold text-slate-400 tracking-wide">© 2026 InterviewPulse. 用 ❤️ 和 ☕️ 打造。</p>
        </div>
      </footer>
    </div>
  );
}

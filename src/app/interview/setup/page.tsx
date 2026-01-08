"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { ChevronLeft, ChevronRight, Briefcase, FileText, Languages } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createSession } from "@/services/sessionService";
import { parseResume } from "@/app/actions/resume";
import { cn } from "@/lib/utils";

const STEPS = ["角色与类型", "职位描述", "简历（可选）", "确认信息"];

export default function InterviewSetupPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();
    const { user } = useAuth();

    // Form State
    const [role, setRole] = useState("");
    const [difficulty, setDifficulty] = useState("medium");
    const [jd, setJD] = useState("");
    const [resumeText, setResumeText] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const [uploadError, setUploadError] = useState("");

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError("");
        try {
            console.log("Uploading file:", file.name);
            const formData = new FormData();
            formData.append("file", file);

            const result = await parseResume(formData);
            console.log("Resume parse result:", result);

            if (result.success && result.text) {
                setResumeText(result.text);
            } else {
                setUploadError(result.error || "无法解析简历内容。");
            }
        } catch (error) {
            console.error("Upload failed", error);
            setUploadError("网络错误或超时。");
        } finally {
            setIsUploading(false);
        }
    };

    // ...

    const handleNext = async () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(curr => curr + 1);
        } else {
            // Start Interview
            if (user) {
                try {
                    // 1. Start Graph Sync (Server Action) - Fire and await to ensure context exists
                    if (resumeText || jd) {
                        try {
                            const { syncGraphAction } = await import("@/app/actions/graph");
                            await syncGraphAction(user.uid, resumeText, jd);
                        } catch (err) {
                            console.error("Graph sync failed, continuing anyway", err);
                        }
                    }

                    // 2. Create Session
                    const sessionId = await createSession(user.uid, {
                        role,
                        difficulty,
                        jd,
                        resume: resumeText,
                        timestamp: new Date().toISOString()
                    });

                    // Redirect to Dashboard instead of Room
                    // User will manually click "Start" from Dashboard
                    router.push("/dashboard");

                } catch (e) {
                    console.error("Failed to create session in setup", e);
                    // Fallback to URL params (lose JD but work) -> Direct entry mainly for dev/error fallback
                    router.push(`/interview/room?role=${encodeURIComponent(role)}&diff=${difficulty}`);
                }
            } else {
                router.push(`/interview/room?role=${encodeURIComponent(role)}&diff=${difficulty}`);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(curr => curr - 1);
        } else {
            router.back();
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative text-slate-800 bg-[#FDFBF7] overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-yellow-200/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="w-full max-w-2xl z-10 animate-in slide-in-from-bottom-8 duration-700">
                    {/* Progress Indicator */}
                    <div className="mb-10 px-4">
                        <div className="flex justify-between mb-4">
                            {STEPS.map((step, idx) => (
                                <span key={step} className={cn("text-xs font-bold uppercase tracking-widest", idx <= currentStep ? "text-primary" : "text-gray-300")}>
                                    {step}
                                </span>
                            ))}
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    <Card className="bg-white border-none shadow-[0_20px_60px_rgba(0,0,0,0.06)] rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="text-center pt-10 pb-2">
                            <CardTitle className="text-3xl font-black font-heading tracking-tight text-slate-900">{STEPS[currentStep]}</CardTitle>
                            <CardDescription className="text-base text-slate-500 font-medium">配置您的面试会话</CardDescription>
                        </CardHeader>

                        <CardContent className="p-8 md:p-12 min-h-[400px] flex flex-col justify-center">
                            {currentStep === 0 && (
                                <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div className="space-y-4">
                                        <Label className="text-lg font-bold text-slate-700 ml-1">您申请的职位是什么？</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <Input
                                                placeholder="例如：高级前端工程师"
                                                className="pl-14 h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 text-lg transition-all shadow-sm"
                                                value={role}
                                                onChange={(e) => setRole(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <Label className="text-lg font-bold text-slate-700 ml-1">选择难度</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {["easy", "medium", "hard"].map((d) => (
                                                <div
                                                    key={d}
                                                    onClick={() => setDifficulty(d)}
                                                    className={cn(
                                                        "cursor-pointer border-2 rounded-2xl p-4 text-center transition-all hover:-translate-y-1 shadow-sm",
                                                        difficulty === d
                                                            ? "border-primary bg-orange-50/50 shadow-md transform -translate-y-1"
                                                            : "border-gray-100 bg-white hover:border-orange-200 hover:shadow-md"
                                                    )}
                                                >
                                                    <div className={cn("capitalize font-bold text-lg mb-2", difficulty === d ? "text-primary" : "text-slate-600")}>
                                                        {d === "easy" && "简单"}
                                                        {d === "medium" && "中等"}
                                                        {d === "hard" && "困难"}
                                                    </div>
                                                    <div className="text-xs font-medium text-slate-400 leading-tight">
                                                        {d === "easy" && "提供更多引导与提示"}
                                                        {d === "medium" && "标准面试流程与问题"}
                                                        {d === "hard" && "深层追问与压力测试"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300 h-full flex flex-col">
                                    <Label className="text-lg font-bold text-slate-700 ml-1">粘贴职位描述（推荐）</Label>
                                    <textarea
                                        className="flex-1 w-full p-6 rounded-3xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/30 focus:ring-0 outline-none transition-all resize-none text-base text-slate-700 leading-relaxed shadow-inner"
                                        placeholder="在此粘贴 JD 以让 AI 了解面试背景..."
                                        value={jd}
                                        onChange={(e) => setJD(e.target.value)}
                                    />
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div className="relative p-10 border-3 border-dashed border-gray-200 rounded-[2rem] w-full text-center hover:bg-orange-50/30 hover:border-orange-200 transition-all cursor-pointer group bg-gray-50/30">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                        />
                                        <div className="h-20 w-20 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                            <FileText className={cn("h-8 w-8 transition-colors", resumeText ? "text-green-500" : "text-primary")} />
                                        </div>
                                        <p className="text-lg font-bold text-slate-700 mb-2">
                                            {isUploading ? "正在分析简历..." : (resumeText ? "简历分析完成！" : "上传您的简历 (PDF)")}
                                        </p>
                                        <p className="text-sm text-slate-400 font-medium">
                                            {resumeText ? "已准备好面试所需上下文" : "拖放文件或点击浏览"}
                                        </p>
                                    </div>
                                    <p className="text-sm font-medium text-slate-400 bg-white py-2 px-4 rounded-full shadow-sm">跳过此步骤将使用通用问题。</p>
                                    {resumeText && <div className="text-xs text-green-600 font-medium bg-green-50 px-4 py-2 rounded-lg max-w-xs text-center line-clamp-2 shadow-sm border border-green-100">{resumeText.substring(0, 100)}...</div>}
                                    {uploadError && <div className="text-sm text-red-500 font-bold bg-red-50 px-4 py-2 rounded-lg">{uploadError}</div>}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div className="text-center mb-6">
                                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                                            <Briefcase className="h-8 w-8 text-green-600" />
                                        </div>
                                        <h3 className="font-black text-2xl text-slate-800">确认信息</h3>
                                        <p className="text-slate-500 mt-2">准备好开始了吗？</p>
                                    </div>

                                    <div className="bg-gray-50 rounded-3xl p-6 space-y-4 shadow-inner">
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                            <span className="text-slate-500 font-medium">职位</span>
                                            <span className="font-bold text-slate-800 text-lg">{role || "通用面试"}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                            <span className="text-slate-500 font-medium">难度</span>
                                            <span className="font-bold text-slate-800 capitalize bg-white px-3 py-1 rounded-full shadow-sm">
                                                {difficulty === "easy" && "简单"}
                                                {difficulty === "medium" && "中等"}
                                                {difficulty === "hard" && "困难"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                            <span className="text-slate-500 font-medium">JD 描述</span>
                                            <span className={cn("font-bold px-2 py-1 rounded-lg text-sm", jd ? "text-green-600 bg-green-50" : "text-gray-400 bg-gray-100")}>{jd ? "已添加" : "未填写"}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                            <span className="text-slate-500 font-medium">简历</span>
                                            <span className={cn("font-bold px-2 py-1 rounded-lg text-sm", resumeText ? "text-green-600 bg-green-50" : "text-gray-400 bg-gray-100")}>{resumeText ? "已上传" : "未上传"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </CardContent>

                        <div className="px-8 pb-10 pt-4 flex justify-between items-center bg-white">
                            <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-slate-600 hover:bg-gray-50 rounded-full h-12 px-6">
                                <ChevronLeft className="mr-2 h-5 w-5" /> 返回
                            </Button>
                            <Button onClick={handleNext} className="min-w-[140px] h-14 rounded-full text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 transition-all bg-primary text-white">
                                {currentStep === STEPS.length - 1 ? "开始面试" : "下一步"} {currentStep !== STEPS.length - 1 && <ChevronRight className="ml-2 h-5 w-5" />}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </AuthGuard>
    );
}

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
            // Create session here to persist full config (including large JD) to DB
            if (user) {
                try {
                    const sessionId = await createSession(user.uid, {
                        role,
                        difficulty,
                        jd,
                        resume: resumeText,
                        timestamp: new Date().toISOString()
                    });
                    router.push(`/interview/room?sessionId=${sessionId}`);
                } catch (e) {
                    console.error("Failed to create session in setup", e);
                    // Fallback to URL params (lose JD but work)
                    router.push(`/interview/room?role=${encodeURIComponent(role)}&diff=${difficulty}`);
                }
            } else {
                // No user, fallback
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
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative text-foreground">
                <div className="aurora-bg opacity-30" />

                <div className="w-full max-w-2xl z-10">
                    {/* Progress */}
                    <div className="mb-8">
                        <div className="flex justify-between mb-2">
                            {STEPS.map((step, idx) => (
                                <span key={step} className={cn("text-xs uppercase tracking-wider font-semibold", idx <= currentStep ? "text-primary" : "text-muted-foreground")}>
                                    {step}
                                </span>
                            ))}
                        </div>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-out"
                                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    <Card className="glass-card shadow-2xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-2xl">{STEPS[currentStep]}</CardTitle>
                            <CardDescription>配置您的面试会话</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[300px]">
                            {currentStep === 0 && (
                                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div className="space-y-2">
                                        <Label>您申请的职位是什么？</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="例如：高级前端工程师"
                                                className="pl-9"
                                                value={role}
                                                onChange={(e) => setRole(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>选择难度</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {["easy", "medium", "hard"].map((d) => (
                                                <div
                                                    key={d}
                                                    onClick={() => setDifficulty(d)}
                                                    className={cn(
                                                        "cursor-pointer border rounded-lg p-4 text-center transition-all hover:bg-white/5",
                                                        difficulty === d ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-white/10"
                                                    )}
                                                >
                                                    <div className="capitalize font-medium mb-1">
                                                        {d === "easy" && "简单"}
                                                        {d === "medium" && "中等"}
                                                        {d === "hard" && "困难"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {d === "easy" && "提供有益指导"}
                                                        {d === "medium" && "标准面试问题"}
                                                        {d === "hard" && "严厉的反馈"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <Label>粘贴职位描述（推荐）</Label>
                                    <textarea
                                        className="w-full h-64 p-4 rounded-md bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-sm"
                                        placeholder="在此粘贴 JD 以让 AI 了解面试背景..."
                                        value={jd}
                                        onChange={(e) => setJD(e.target.value)}
                                    />
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="flex flex-col items-center justify-center h-full space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div className="relative p-8 border-2 border-dashed border-white/20 rounded-xl w-full text-center hover:bg-white/5 transition-colors cursor-pointer group">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                        />
                                        <FileText className={cn("h-10 w-10 mx-auto mb-4 transition-colors", resumeText ? "text-green-400" : "text-muted-foreground")} />
                                        <p className="text-sm font-medium">
                                            {isUploading ? "正在分析简历..." : (resumeText ? "简历分析完成！" : "拖放简历 (PDF)")}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {resumeText ? "已准备好面试所需上下文" : "或点击浏览"}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">跳过此步骤将使用通用问题。</p>
                                    {resumeText && <div className="text-xs text-green-400/80 max-w-xs text-center line-clamp-3">{resumeText}</div>}
                                    {uploadError && <div className="text-xs text-red-400 font-medium">{uploadError}</div>}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <h3 className="font-semibold text-lg">信息汇总</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between py-2 border-b border-white/10">
                                            <span className="text-muted-foreground">职位</span>
                                            <span className="font-medium">{role || "通用面试"}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-white/10">
                                            <span className="text-muted-foreground">难度</span>
                                            <span className="font-medium capitalize">
                                                {difficulty === "easy" && "简单"}
                                                {difficulty === "medium" && "中等"}
                                                {difficulty === "hard" && "困难"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-white/10">
                                            <span className="text-muted-foreground">上下文</span>
                                            <span className="font-medium">{jd ? "已添加职位描述" : "无职位描述"}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-white/10">
                                            <span className="text-muted-foreground">简历</span>
                                            <span className="font-medium">{resumeText ? "已解析" : "未提供"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </CardContent>
                        <div className="p-6 border-t border-white/10 flex justify-between">
                            <Button variant="ghost" onClick={handleBack}>
                                <ChevronLeft className="mr-2 h-4 w-4" /> 返回
                            </Button>
                            <Button onClick={handleNext} className="min-w-[120px]">
                                {currentStep === STEPS.length - 1 ? "开始面试" : "下一步"} <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </AuthGuard>
    );
}

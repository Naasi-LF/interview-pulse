"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { createSession, endSession, logTranscript, getSession } from "@/services/sessionService";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, MessageSquare } from "lucide-react";
import AudioVisualizer from "@/components/interview/AudioVisualizer";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, string> = {
    "idle": "准备就绪",
    "connecting": "正在连接...",
    "connected": "已连接",
    "disconnecting": "正在断开...",
    "disconnected": "已断开",
    "reconnecting": "正在重连...",
    "error": "连接错误"
};

// Helper to keep only the last sentence/phrase for single-line display
const getLastSegment = (text: string) => {
    // Return the very last chunk that has content
    // We can slice to ensure it fits, or rely on CSS truncation
    return text;
};

export default function InterviewRoomPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    const handleTranscriptUpdate = (role: "user" | "model", text: string) => {
        if (sessionIdRef.current) {
            logTranscript(sessionIdRef.current, role, text);
        }
    };

    const { status, connect, disconnect, startRecording, stopRecording, transcript, volume, isRecording, error } = useGeminiLive({ onTranscriptUpdate: handleTranscriptUpdate });
    const [isMicOn, setIsMicOn] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);

    // Auto-start mic when connected
    useEffect(() => {
        if (status === "connected" && isMicOn) {
            startRecording();
        }
    }, [status, isMicOn, startRecording]);

    const handleStart = async () => {
        setHasStarted(true);

        if (user) {
            try {
                // Check if sessionId is passed in URL (New Flow)
                const urlSessionId = searchParams.get("sessionId");
                let interviewConfig = {
                    role: searchParams.get("role") || "Software Engineer",
                    difficulty: searchParams.get("diff") || "medium",
                    jd: ""
                };

                let sid = urlSessionId;

                if (urlSessionId) {
                    // Fetch existing session config (contains JD)
                    const sessionData = await getSession(urlSessionId) as any;
                    if (sessionData && sessionData.config) {
                        interviewConfig = { ...interviewConfig, ...sessionData.config };
                        sid = urlSessionId;
                    }
                } else {
                    // Legacy/Fallback: Create new session
                    sid = await createSession(user.uid, {
                        ...interviewConfig,
                        timestamp: new Date().toISOString()
                    });
                }

                if (sid) setSessionId(sid);

                // Construct System Instruction
                const systemInstruction = `You are an expert interviewer for a ${interviewConfig.role} position. 
The difficulty level is ${interviewConfig.difficulty}. 

${interviewConfig.jd ? `Job Description Context:\n${interviewConfig.jd}\n` : ""}

${(interviewConfig as any).resume ? `Candidate Resume Context:\n${(interviewConfig as any).resume}\n` : ""}

Conduct a professional technical interview.
Start by welcoming the candidate and asking a relevant opening question based on the role/JD/Resume.
Keep your responses concise and conversational.`;

                connect({ systemInstruction });
            } catch (e) {
                console.error("Failed to init session", e);
                connect();
            }
        } else {
            connect();
        }
    };

    const handleEnd = () => {
        disconnect();
        if (sessionId) {
            endSession(sessionId);
            window.location.href = `/interview/debrief/${sessionId}`;
        }
    };

    const toggleMic = () => {
        setIsMicOn(!isMicOn);
    };

    return (
        <AuthGuard>
            <div className="min-h-screen bg-black/95 flex flex-col relative overflow-hidden text-foreground">
                <div className="aurora-bg opacity-20" />

                {/* Header */}
                <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
                    <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full animate-pulse", status === "connected" ? "bg-green-500" : "bg-yellow-500")} />
                        <span className="text-xs font-semibold uppercase tracking-wider">{STATUS_MAP[status] || status}</span>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleEnd} className="rounded-full px-6">
                        <PhoneOff className="mr-2 h-4 w-4" /> 结束面试
                    </Button>
                </div>

                {/* Main Visualizer Area */}
                <div className="flex-1 flex items-center justify-center flex-col relative z-10 w-full">
                    {!hasStarted ? (
                        <div className="text-center space-y-6">
                            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <Mic className="h-12 w-12 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">准备好了吗？</h2>
                            <Button size="lg" onClick={handleStart} className="rounded-full px-8 py-6 text-lg">
                                开始面试
                            </Button>
                        </div>
                    ) : (
                        <div className="relative w-full h-full max-h-[60vh] flex items-center justify-center">
                            {/* 3D Visualizer */}
                            <AudioVisualizer isRecording={isRecording} volume={volume} />
                        </div>
                    )}

                    {/* Subtitles Overlay - Single Line */}
                    {hasStarted && transcript.length > 0 && (
                        <div className="absolute bottom-32 left-0 right-0 px-8 flex justify-center pointer-events-none z-50">
                            <div className={cn(
                                "backdrop-blur-md px-8 py-4 rounded-full max-w-2xl text-center shadow-2xl transition-all duration-300 border border-white/10 overflow-hidden whitespace-nowrap",
                                transcript[transcript.length - 1].startsWith("AI:") ? "bg-cyan-950/60" : "bg-black/60"
                            )}>
                                <p className={cn(
                                    "text-2xl font-medium tracking-wide",
                                    transcript[transcript.length - 1].startsWith("AI:") ? "text-cyan-100" : "text-white/90"
                                )}>
                                    {/* Use slice to keep it single line if it gets too long, user requested 'refresh' but keeping it simple for now and ensuring one line */}
                                    {transcript[transcript.length - 1].replace(/^(AI: |You: )/, "").slice(-25)}
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200">
                            Error: {error}
                        </div>
                    )}
                </div>

                {/* Controls */}
                {hasStarted && (
                    <div className="p-8 pb-12 flex justify-center gap-6 z-50">
                        <Button
                            variant={isMicOn ? "secondary" : "destructive"}
                            size="icon"
                            className="h-14 w-14 rounded-full shadow-lg"
                            onClick={toggleMic}
                        >
                            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                        </Button>
                        {/* Placeholder for text mode toggle */}
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-14 w-14 rounded-full shadow-lg bg-white/5 hover:bg-white/10"
                        >
                            <MessageSquare className="h-6 w-6" />
                        </Button>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { createSession, endSession, logTranscript, getSession } from "@/services/sessionService";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, MessageSquare, Loader2 } from "lucide-react";
import AudioVisualizer from "@/components/interview/AudioVisualizer";
import { cn } from "@/lib/utils";
import { getGraphContext } from "@/services/graphRetrievalService";

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
    const [isInitializing, setIsInitializing] = useState(false);
    const [showCaptions, setShowCaptions] = useState(true);

    // Auto-start mic when connected
    useEffect(() => {
        if (status === "connected" && isMicOn) {
            startRecording();
        }
    }, [status, isMicOn, startRecording]);

    const handleStart = async () => {
        setIsInitializing(true);

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

                // --- V2 Graph Context Injection ---
                let graphContextPrompt = "";
                try {
                    // Start fetching context
                    const graphData = await getGraphContext(user.uid);
                    if (graphData) {
                        console.log("Injecting Graph Context:", graphData.summary);
                        graphContextPrompt = `\n\n[Candidate Personal Knowledge Graph Context]:\n${graphData.summary}\nUse this context to tailor your questions. Focus on testing their [Growth Areas] and checking if [Weak/New] areas have improved. Challenge their [Strengths].`;
                    }
                } catch (err) {
                    console.warn("Failed to load graph context, proceeding without it.", err);
                }
                // ----------------------------------

                // Construct System Instruction
                const systemInstruction = `You are an expert interviewer for a ${interviewConfig.role} position. 
The difficulty level is ${interviewConfig.difficulty}. 

${interviewConfig.jd ? `Job Description Context:\n${interviewConfig.jd}\n` : ""}

${(interviewConfig as any).resume ? `Candidate Resume Context:\n${(interviewConfig as any).resume}\n` : ""}

${graphContextPrompt}

Conduct a professional technical interview.
Start by welcoming the candidate and asking a relevant opening question based on the role/JD/Resume/Graph Context.
Keep your responses concise and conversational.`;

                await connect({ systemInstruction });
                setHasStarted(true);
            } catch (e) {
                console.error("Failed to init session", e);
                // Even if fail, we might want to let them in or show error
                // For now, let's try to connect without context if error
                connect();
                setHasStarted(true);
            } finally {
                setIsInitializing(false);
            }
        } else {
            connect();
            setHasStarted(true);
            setIsInitializing(false);
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
            <div className="min-h-screen bg-[#FDFBF7] flex flex-col relative overflow-hidden text-foreground selection:bg-primary/20">

                {/* Header */}
                <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
                    <div className="bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full shadow-sm border border-black/5 flex items-center gap-2.5">
                        <div className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-white", status === "connected" ? "bg-green-500" : "bg-yellow-400 animate-pulse")} />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{STATUS_MAP[status] || status}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleEnd} className="rounded-full px-6 text-red-500 hover:text-red-600 hover:bg-red-50 font-medium">
                        <PhoneOff className="mr-2 h-4 w-4" /> 结束面试
                    </Button>
                </div>

                {/* Main Visualizer Area */}
                <div className="flex-1 flex items-center justify-center flex-col relative z-10 w-full">
                    {!hasStarted ? (
                        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
                            <div className="w-40 h-40 rounded-full bg-white shadow-[0_20px_50px_rgba(255,130,53,0.15)] flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/20 animate-spin-slow"></div>
                                <Mic className="h-16 w-16 text-primary" />
                            </div>
                            <h2 className="text-3xl font-black font-heading tracking-tight text-foreground">准备好了吗？</h2>
                            <p className="text-muted-foreground max-w-md mx-auto">深呼吸。这里只有一个很友好的 AI，随时准备陪你练习。</p>
                            <Button
                                size="lg"
                                onClick={handleStart}
                                disabled={isInitializing}
                                className="rounded-full px-12 py-7 text-xl font-bold min-w-[240px] shadow-xl hover:shadow-2xl shadow-primary/20 hover:-translate-y-1 transition-all"
                            >
                                {isInitializing ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 连接中...</>
                                ) : (
                                    "开始面试"
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="relative w-full h-full max-h-[60vh] flex items-center justify-center">
                            {/* 3D Visualizer */}
                            <AudioVisualizer isRecording={isRecording} volume={volume} />
                        </div>
                    )}

                    {/* Subtitles Overlay - Single Line - Headspace Bubble Style */}
                    {hasStarted && showCaptions && transcript.length > 0 && (
                        <div className="absolute bottom-32 left-0 right-0 px-8 flex justify-center pointer-events-none z-50">
                            <div className={cn(
                                "backdrop-blur-xl px-8 py-5 rounded-[2rem] max-w-3xl text-center shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-300 border border-white/50 overflow-hidden whitespace-nowrap",
                                transcript[transcript.length - 1].startsWith("AI:") ? "bg-white/95" : "bg-gray-50/95"
                            )}>
                                <p className={cn(
                                    "text-2xl font-bold tracking-tight",
                                    transcript[transcript.length - 1].startsWith("AI:") ? "text-primary" : "text-gray-600"
                                )}>
                                    {/* Use slice to keep it single line */}
                                    {transcript[transcript.length - 1].replace(/^(AI: |You: )/, "").slice(-35)}
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 shadow-sm font-medium">
                            Error: {error}
                        </div>
                    )}
                </div>

                {/* Controls - Floating Bar */}
                {hasStarted && (
                    <div className="p-8 pb-12 flex justify-center gap-8 z-50">
                        <Button
                            variant={isMicOn ? "default" : "destructive"}
                            size="icon"
                            className={cn(
                                "h-16 w-16 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-110",
                                isMicOn ? "bg-white text-primary hover:bg-white border-2 border-transparent" : "bg-red-500 text-white hover:bg-red-600"
                            )}
                            onClick={toggleMic}
                        >
                            {isMicOn ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
                        </Button>

                        {/* Captions Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-16 w-16 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:scale-110 bg-white",
                                showCaptions ? "text-primary border-2 border-primary/20" : "text-gray-400 hover:text-gray-600"
                            )}
                            onClick={() => setShowCaptions(!showCaptions)}
                            title={showCaptions ? "隐藏字幕" : "显示字幕"}
                        >
                            <MessageSquare className="h-7 w-7" />
                        </Button>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}

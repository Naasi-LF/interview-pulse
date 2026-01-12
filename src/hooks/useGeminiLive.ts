"use client";
import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createBlob, decode, decodeAudioData } from "@/lib/audio-utils";

export interface UseGeminiLiveProps {
    onTranscriptUpdate?: (role: "user" | "model", text: string) => void;
}
/**
 * Hook: useGeminiLive (实时语音交互核心 Hook)
 * ----------------------------------------
 * @description
 * 封装了与 Gemini Multimodal Live API 进行 WebSocket 全双工通信的所有逻辑。
 * 管理音频采集 (Mic)、音频播放 (Speaker)、以及实时字幕的状态。
 *
 * @param onTranscriptUpdate - 回调函数，用于将实时字幕同步给外部组件（如写入数据库）。
 */
export function useGeminiLive({ onTranscriptUpdate }: UseGeminiLiveProps = {}) {
    const [status, setStatus] = useState("idle");
    const [transcript, setTranscript] = useState<string[]>([]);
    const [volume, setVolume] = useState(0);

    // Refs for persistence across renders
    const clientRef = useRef<GoogleGenAI | null>(null);
    const sessionRef = useRef<any>(null);

    // Audio Contexts
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);

    // Audio Nodes
    const inputNodeRef = useRef<GainNode | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);

    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const isRecordingRef = useRef(false);

    // Initialization
    useEffect(() => {
        // Only run on client
        if (typeof window !== "undefined") {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
            outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

            inputNodeRef.current = inputAudioContextRef.current.createGain();
            outputNodeRef.current = outputAudioContextRef.current.createGain();
            outputNodeRef.current.connect(outputAudioContextRef.current.destination);

            nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
        }
    }, []);


    /**
     * 建立 WebSocket 连接 (Establish Connection)
     * ----------------------------------------
     * @description
     * 1. 安全获 Token (Fetch Token)
     * 2. 初始化 Gemini Client
     * 3. 建立 WebSocket 握手 (Handshake)
     * 4. 关键：注入 System Instruction (面试官人设 + 知识图谱背景)
     * 
     * @technical_detail
     * 使用 GoogleGenAI SDK 的 `client.live.connect` 方法，该方法底层维护了一个 
     * 长连接 (Persistent Connection)，用于双向流式传输数据。
     */
    const connect = async (config?: { manualKey?: string; systemInstruction?: string }) => {
        try {
            setStatus("connecting");

            let apiKey = config?.manualKey;

            if (!apiKey) {
                // Securely fetch ephemeral token from backend
                try {
                    const tokenRes = await fetch("/api/gemini-token");
                    if (!tokenRes.ok) throw new Error("Failed to fetch token");
                    const tokenData = await tokenRes.json();
                    apiKey = tokenData.token;
                } catch (tokenErr) {
                    console.error("Token fetch failed, falling back to public key if available", tokenErr);
                    // Fallback to Env if token fails (for local dev or if configured)
                    apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
                }
            }

            if (!apiKey) {
                setStatus("Error: API Key/Token could not be retrieved");
                return;
            }

            clientRef.current = new GoogleGenAI({ apiKey });

            // Resume output context (browsers block audio until interaction)
            if (outputAudioContextRef.current?.state === 'suspended') {
                await outputAudioContextRef.current.resume();
            }

            // Model matching the working test app
            const model = 'gemini-2.5-flash-native-audio-preview-09-2025';

            sessionRef.current = await clientRef.current.live.connect({
                model,
                callbacks: {
                    onopen: () => {
                        console.log('[live] onopen');
                        setStatus('connected');
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const serverContent = message.serverContent;
                        if (!serverContent) return;

                        // Transcript - Accumulate chunks for smoother UI
                        if (serverContent.outputTranscription?.text) {
                            const text = serverContent.outputTranscription.text;
                            setTranscript(prev => {
                                if (prev.length > 0 && prev[prev.length - 1].startsWith("AI: ")) {
                                    const newHistory = [...prev];
                                    newHistory[newHistory.length - 1] += text;
                                    return newHistory;
                                }
                                return [...prev, "AI: " + text];
                            });
                            if (onTranscriptUpdate) onTranscriptUpdate("model", text);
                        }
                        if (serverContent.inputTranscription?.text) {
                            const text = serverContent.inputTranscription.text;
                            setTranscript(prev => {
                                if (prev.length > 0 && prev[prev.length - 1].startsWith("You: ")) {
                                    const newHistory = [...prev];
                                    newHistory[newHistory.length - 1] += text;
                                    return newHistory;
                                }
                                return [...prev, "You: " + text];
                            });
                            if (onTranscriptUpdate) onTranscriptUpdate("user", text);
                        }

                        // Audio Output
                        const audio = serverContent.modelTurn?.parts?.[0]?.inlineData;
                        if (audio && audio.data && outputAudioContextRef.current && outputNodeRef.current) {
                            const ctx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                            const audioBuffer = await decodeAudioData(
                                decode(audio.data),
                                ctx,
                                24000,
                                1
                            );

                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNodeRef.current);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (serverContent.interrupted) {
                            console.log('[live] interrupted');
                            for (const source of sourcesRef.current) {
                                source.stop();
                            }
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: any) => {
                        console.error('[live] onerror', e);
                        setStatus("Error: " + e.message);
                    },
                    onclose: (e: any) => {
                        console.log('[live] onclose', e);
                        setStatus(`Closed: ${e.code || ''} ${e.reason || 'Connection lost'}`);
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    // @ts-ignore
                    inputAudioTranscription: {},
                    // @ts-ignore
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } }
                    },
                    systemInstruction: config?.systemInstruction ? { parts: [{ text: config.systemInstruction }] } : undefined
                }
            });
        } catch (e: any) {
            console.error(e);
            setStatus("Error: " + e.message);
        }
    };

    /**
 * 开始录音 (Start Recording)
 * ----------------------------------------
 * @description
 * 激活麦克风，使用 ScriptProcessorNode 实时捕获 PCM 数据，
 * 并通过 WebSocket 推送给 Gemini。
 *
 * @technical_detail
 * 没有使用 MediaRecorder (文件式录音)，而是直接处理 Raw PCM Stream，
 * 实现了真正的实时流式传输 (Real-time Streaming)。
 */
    const startRecording = async () => {
        if (isRecordingRef.current || !inputAudioContextRef.current || !inputNodeRef.current) return;

        await inputAudioContextRef.current.resume();
        setStatus("Requesting Mic...");

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setStatus("Mic Active");

            sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStream);
            sourceNodeRef.current.connect(inputNodeRef.current);

            const bufferSize = 256;
            // @ts-ignore
            scriptProcessorNodeRef.current = inputAudioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

            let chunkCount = 0;
            scriptProcessorNodeRef.current!.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return;
                const inputBuffer = e.inputBuffer;
                const pcmData = inputBuffer.getChannelData(0);

                // Debug: Log every 100 chunks (~1.5s)
                chunkCount++;
                const rms = Math.sqrt(pcmData.reduce((s, v) => s + v * v, 0) / pcmData.length);
                if (chunkCount % 5 === 0) setVolume(rms); // Update volume state frequently

                if (chunkCount % 100 === 0) {
                    console.log(`[Mic Debug] Chunk ${chunkCount}, RMS Level: ${rms.toFixed(4)}`);
                }

                if (sessionRef.current) {
                    sessionRef.current.sendRealtimeInput({ media: createBlob(pcmData) });
                }
            };

            sourceNodeRef.current.connect(scriptProcessorNodeRef.current!);
            scriptProcessorNodeRef.current!.connect(inputAudioContextRef.current.destination);

            isRecordingRef.current = true;
        } catch (e: any) {
            console.error(e);
            setStatus("Mic Error: " + e.message);
        }
    };

    /**
     * 停止录音 (Stop Recording)
     * ----------------------------------------
     * @description
     * 停止麦克风采集，断开 ScriptProcessorNode 连接，
     * 并更新状态为 "Recording Stopped"。
     */
    const stopRecording = () => {
        isRecordingRef.current = false;
        scriptProcessorNodeRef.current?.disconnect();
        sourceNodeRef.current?.disconnect();
        setStatus("Recording Stopped");
    };

    const [error, setError] = useState<string | null>(null);
    /**
     * 断开连接 (Disconnect)
     * ----------------------------------------
     * @description
     * 彻底关闭 WebSocket 会话，清理所有状态。
     * 通常在组件卸载 (Unmount) 或用户点击“挂断”时调用。
     */
    const disconnect = async () => {
        if (sessionRef.current) {
            try {
                // @ts-ignore
                if (typeof sessionRef.current.close === 'function') sessionRef.current.close();
            } catch (e) { console.error(e); }
            sessionRef.current = null;
        }
        stopRecording();
        setStatus("idle");
        setTranscript([]);
    };

    return {
        status,
        connect: (config?: { manualKey?: string; systemInstruction?: string }) => { setError(null); connect(config); },
        disconnect,
        startRecording,
        stopRecording,
        transcript,
        isRecording: isRecordingRef.current,
        volume: volume,
        error
    };
}

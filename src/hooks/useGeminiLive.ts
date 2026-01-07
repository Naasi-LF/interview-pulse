"use client";
import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createBlob, decode, decodeAudioData } from "@/lib/audio-utils";

export interface UseGeminiLiveProps {
    onTranscriptUpdate?: (role: "user" | "model", text: string) => void;
}

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

    const connect = async (config?: { manualKey?: string; systemInstruction?: string }) => {
        try {
            const apiKey = config?.manualKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) {
                setStatus("Error: API Key not provided (env: NEXT_PUBLIC_GEMINI_API_KEY)");
                return;
            }

            clientRef.current = new GoogleGenAI({ apiKey });

            setStatus("connecting");

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

    const stopRecording = () => {
        isRecordingRef.current = false;
        scriptProcessorNodeRef.current?.disconnect();
        sourceNodeRef.current?.disconnect();
        setStatus("Recording Stopped");
    };

    const [error, setError] = useState<string | null>(null);

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

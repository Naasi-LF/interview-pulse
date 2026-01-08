import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        // TODO: For Production, switch to ephemeral tokens when SDK stabilizes
        // const client = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });
        // const token = await client.authTokens.create(...)

        // For now, return the key to unblock WebSocket connection
        // Ideally we proxy the socket, but for Gemini Live we need client-direct connect
        return NextResponse.json({ token: apiKey });
    } catch (error: any) {
        console.error("Token generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

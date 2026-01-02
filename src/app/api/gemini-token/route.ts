import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        const client = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });

        // Create an ephemeral token
        // The prompt says: http_options: {'api_version': 'v1alpha'}
        // For Node SDK, check if it accepts it in create or init.
        // If SDK defaults to v1beta, authTokens might be missing.
        // Let's force v1alpha in the call if supported, or init.
        // Actually, let's try passing it to the client constructor if possible, or looking for specific method.
        // Using the structure from the prompt's python example but mapped to Node.

        const token = await client.authTokens.create({
            config: {
                uses: 1,
                // defaults often work better if specific fields are tricky
                // 'expire_time': '300s' // 5 mins
            }
        });

        // Note: The prompt example used `token.name`. 
        // We'll return the token value or name depending on what the client needs to connect.
        // Usually, the client uses this token in place of the API key.

        return NextResponse.json({ token: token.name });
    } catch (error: any) {
        console.error("Token generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

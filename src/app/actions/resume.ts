"use server";

import { GoogleGenAI } from "@google/genai";

export async function parseResume(formData: FormData) {
    console.log("Starting resume parsing...");
    const file = formData.get("file") as File;

    if (!file) {
        console.error("No file found in formData");
        throw new Error("No file uploaded");
    }

    console.log(`File received: ${file.name}, size: ${file.size} bytes`);

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("API Key missing");
        throw new Error("API Key missing");
    }

    const client = new GoogleGenAI({ apiKey });

    try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        console.log("File converted to base64, sending to Gemini...");

        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{
                parts: [
                    {
                        text: "You are a resume parser. Extract the candidate's name, key skills, and most recent experience summary from this resume. Return a concise summary text that can be used as context for an interviewer."
                    },
                    {
                        inlineData: {
                            mimeType: "application/pdf",
                            data: base64Data
                        }
                    }
                ]
            }]
        });

        console.log("Gemini response received");
        let text = "";
        if (response.text) {
            // @ts-ignore
            text = typeof response.text === 'function' ? (response as any).text() : response.text;
        } else {
            text = JSON.stringify(response);
        }
        console.log("Parsing successful");
        return { success: true, text };
    } catch (error: any) {
        console.error("Resume parsing failed", error);
        return { success: false, error: error.message };
    }
}

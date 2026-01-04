import { NextResponse } from "next/server";
import { syncResumeToGraph } from "@/services/graphExtractionService";

export async function GET() {
    const dummyUserId = "test-user-v2";
    const dummyResume = `
    Alex Chen
    Senior Frontend Engineer
    
    Technical Skills:
    - Proficient in React, Next.js, and TypeScript.
    - Experienced with State Management (Redux, Zustand).
    - Backend knowledge: Node.js, Express, and Basic Python.
    - Database: MongoDB and Firestore.
    - Tools: Docker, Git, CI/CD (GitHub Actions).
    
    Summary: 5 years of experience building high-performance web applications.
  `;

    try {
        const skills = await syncResumeToGraph(dummyUserId, dummyResume);
        return NextResponse.json({
            success: true,
            message: "Graph sync completed",
            userId: dummyUserId,
            extractedSkills: skills
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

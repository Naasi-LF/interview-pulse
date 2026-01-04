import { NextResponse } from "next/server";
import { getUserGraphData } from "@/services/graphVisualizationService";
import { headers } from "next/headers";

// Simple mock auth for now since we are server-server or just checking header
// In real app, we use verifyIdToken from the request headers
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "UserId required" }, { status: 400 });
    }

    try {
        const data = await getUserGraphData(userId);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch graph" }, { status: 500 });
    }
}

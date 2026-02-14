import { NextResponse } from "next/server";
import { wahaClient } from "@/lib/waha-api";

// GET /api/sessions - Fetch all WhatsApp sessions from WAHA.
export async function GET() {
  try {
    const sessions = await wahaClient.getSessions();

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error: unknown) {
    console.error("Error fetching sessions:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sessions",
      },
      { status: 500 },
    );
  }
}

// POST /api/sessions - Start a new WhatsApp session.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionName?: string };
    const { sessionName } = body;

    if (!sessionName) {
      return NextResponse.json(
        {
          success: false,
          error: "Session name is required",
        },
        { status: 400 },
      );
    }

    const session = await wahaClient.startSession(sessionName);

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error: unknown) {
    console.error("Error starting session:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start session",
      },
      { status: 500 },
    );
  }
}

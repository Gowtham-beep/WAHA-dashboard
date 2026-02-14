import { NextResponse } from "next/server";
import { getClientForSession, rememberSessionCredentials } from "@/lib/waha-client-registry";

// GET /api/sessions - Fetch all WhatsApp sessions from WAHA.
export async function GET() {
  try {
    const client = getClientForSession();
    const sessions = await client.getSessions();

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
    const body = (await request.json()) as { sessionName?: string; apiUrl?: string; apiKey?: string };
    const { sessionName, apiUrl, apiKey } = body;

    if (!sessionName) {
      return NextResponse.json(
        {
          success: false,
          error: "Session name is required",
        },
        { status: 400 },
      );
    }

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "WAHA API URL and API Key are required",
        },
        { status: 400 },
      );
    }

    rememberSessionCredentials(sessionName, {
      baseUrl: apiUrl,
      apiKey,
    });
    const sessionClient = getClientForSession(sessionName);
    const session = await sessionClient.startSession(sessionName);

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

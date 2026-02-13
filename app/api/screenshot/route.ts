import { NextRequest, NextResponse } from "next/server";
import { wahaClient } from "@/lib/waha-api";

export async function GET(request: NextRequest) {
  try {
    const sessionName = request.nextUrl.searchParams.get("session");

    if (!sessionName) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required query param: session",
        },
        { status: 400 },
      );
    }

    const screenshot = await wahaClient.getSessionScreenshot(sessionName);
    return NextResponse.json({ success: true, data: screenshot });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch screenshot",
      },
      { status: 500 },
    );
  }
}

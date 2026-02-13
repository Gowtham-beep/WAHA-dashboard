import { NextRequest, NextResponse } from "next/server";
import { wahaClient } from "@/lib/waha-api";

type Params = {
  params: Promise<{ sessionName: string }>;
};

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    await wahaClient.stopSession(sessionName);
    return NextResponse.json({ success: true, message: "Session stopped" });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to stop session",
      },
      { status: 500 },
    );
  }
}

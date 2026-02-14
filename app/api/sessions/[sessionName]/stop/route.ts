import { NextRequest, NextResponse } from "next/server";
import { getClientForSession } from "@/lib/waha-client-registry";

type Params = {
  params: Promise<{ sessionName: string }>;
};

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    await getClientForSession(sessionName).stopSession(sessionName);
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

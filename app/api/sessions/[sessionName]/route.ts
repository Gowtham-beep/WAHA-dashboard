import { NextRequest, NextResponse } from "next/server";
import { wahaClient } from "@/lib/waha-api";

type Params = {
  params: Promise<{ sessionName: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    const session = await wahaClient.getSession(sessionName);
    return NextResponse.json({ success: true, data: session });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch session",
      },
      { status: 500 },
    );
  }
}

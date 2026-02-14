import { NextRequest, NextResponse } from "next/server";
import { getClientForSession } from "@/lib/waha-client-registry";

type Params = {
  params: Promise<{ sessionName: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    const session = await getClientForSession(sessionName).getSession(sessionName);
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

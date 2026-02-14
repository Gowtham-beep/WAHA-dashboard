import { NextRequest, NextResponse } from "next/server";
import { getClientForSession } from "@/lib/waha-client-registry";

type Params = {
  params: Promise<{ sessionName: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    const qr = await getClientForSession(sessionName).getSessionQR(sessionName);
    return NextResponse.json({ success: true, data: qr });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch QR",
      },
      { status: 500 },
    );
  }
}

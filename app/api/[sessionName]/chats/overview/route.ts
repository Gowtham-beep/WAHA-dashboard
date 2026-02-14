import { NextRequest, NextResponse } from "next/server";
import { getClientForSession } from "@/lib/waha-client-registry";

type Params = {
  params: Promise<{ sessionName: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 20;
    const data = await getClientForSession(sessionName).getChatsOverview(sessionName, limit);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch chats overview",
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getClientForSession } from "@/lib/waha-client-registry";

type Params = {
  params: Promise<{ sessionName: string; chatId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { sessionName, chatId } = await params;
    const limit = Number(request.nextUrl.searchParams.get("limit") || "20");
    const offset = Number(request.nextUrl.searchParams.get("offset") || "0");
    const downloadMedia = request.nextUrl.searchParams.get("downloadMedia") === "true";
    const sortByParam = request.nextUrl.searchParams.get("sortBy");
    const sortOrderParam = request.nextUrl.searchParams.get("sortOrder");

    const sortBy =
      sortByParam === "timestamp" || sortByParam === "messageTimestamp"
        ? sortByParam
        : "messageTimestamp";
    const sortOrder = sortOrderParam === "asc" || sortOrderParam === "desc" ? sortOrderParam : "desc";

    const data = await getClientForSession(sessionName).getChatMessages(sessionName, decodeURIComponent(chatId), {
      limit,
      offset,
      downloadMedia,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch chat messages",
      },
      { status: 500 },
    );
  }
}

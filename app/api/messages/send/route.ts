import { NextRequest, NextResponse } from "next/server";
import { getClientForSession } from "@/lib/waha-client-registry";

type SendMessageBody = {
  session?: string;
  chatId?: string;
  text?: string;
};

// POST /api/messages/send - Send a WhatsApp text message via WAHA.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendMessageBody;
    const { session, chatId, text } = body;

    if (!session || !chatId || !text) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: session, chatId, or text",
        },
        { status: 400 },
      );
    }

    const formattedChatId = chatId.includes("@") ? chatId : `${chatId}@c.us`;

    const result = await getClientForSession(session).sendMessage({
      session,
      chatId: formattedChatId,
      text,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Message sent successfully",
    });
  } catch (error: unknown) {
    console.error("Error sending message:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send message",
      },
      { status: 500 },
    );
  }
}

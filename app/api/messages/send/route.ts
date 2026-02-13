import { NextRequest, NextResponse } from "next/server";
import { wahaClient } from "@/lib/waha-api";

type SendMessageBody = {
  session?: string;
  chatId?: string;
  text?: string;
};

/**
 * POST /api/messages/send
 * Send a WhatsApp message via WAHA
 *
 * Body params:
 * - session: WhatsApp session name
 * - chatId: Recipient phone number (format: 1234567890@c.us)
 * - text: Message content
 */
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

    const result = await wahaClient.sendMessage({
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

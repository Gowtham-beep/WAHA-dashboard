import { NextRequest, NextResponse } from "next/server";
import { wahaClient } from "@/lib/waha-api";

type Params = {
  params: Promise<{ sessionName: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    const body = (await request.json()) as { webhookUrl?: string };

    if (!body.webhookUrl) {
      return NextResponse.json(
        { success: false, error: "webhookUrl is required" },
        { status: 400 },
      );
    }

    await wahaClient.setWebhook(sessionName, body.webhookUrl);
    return NextResponse.json({ success: true, message: "Webhook updated" });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set webhook",
      },
      { status: 500 },
    );
  }
}

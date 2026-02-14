import { NextRequest, NextResponse } from "next/server";
import { SessionWebhook } from "@/lib/waha-api";
import { getClientForSession } from "@/lib/waha-client-registry";

type Params = {
  params: Promise<{ sessionName: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    const client = getClientForSession(sessionName);
    const session = (await client.getSession(sessionName)) as {
      config?: { webhooks?: SessionWebhook[] };
    };
    return NextResponse.json({
      success: true,
      data: session.config?.webhooks || [],
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get webhooks",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { sessionName } = await params;
    const client = getClientForSession(sessionName);
    const body = (await request.json()) as {
      webhookUrl?: string;
      webhooks?: SessionWebhook[];
    };

    if (Array.isArray(body.webhooks)) {
      await client.updateSessionWebhooks(sessionName, body.webhooks);
      return NextResponse.json({ success: true, message: "Webhooks updated" });
    }

    if (!body.webhookUrl) {
      return NextResponse.json(
        { success: false, error: "webhookUrl or webhooks is required" },
        { status: 400 },
      );
    }

    await client.setWebhook(sessionName, body.webhookUrl);
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

import { NextRequest, NextResponse } from "next/server";
import { WebhookMessage } from "@/lib/waha-api";
import { broadcastWebhookEvent } from "@/lib/webhook-stream";

// In-memory storage for received messages but use a database in production
let receivedMessages: WebhookMessage[] = [];

function normalizeTimestampMs(timestamp: unknown): number {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return Date.now();
  return timestamp < 1e12 ? timestamp * 1000 : timestamp;
}

function isDuplicateWebhookMessage(
  existing: WebhookMessage,
  incoming: WebhookMessage,
  incomingTimestamp: number,
): boolean {
  return (
    existing.session === incoming.session &&
    existing.payload.id === incoming.payload.id &&
    existing.payload.timestamp === incomingTimestamp &&
    existing.payload.from === incoming.payload.from &&
    existing.payload.body === incoming.payload.body
  );
}

function isWebhookMessage(payload: unknown): payload is WebhookMessage {
  if (!payload || typeof payload !== "object") return false;
  const message = payload as Record<string, unknown>;
  if (typeof message.event !== "string") return false;
  if (typeof message.session !== "string") return false;
  if (!message.payload || typeof message.payload !== "object") return false;

  const inner = message.payload as Record<string, unknown>;
  return (
    typeof inner.id === "string" &&
    typeof inner.from === "string" &&
    typeof inner.body === "string" &&
    typeof inner.hasMedia === "boolean"
  );
}

// POST /api/webhooks/messages - Receive incoming WhatsApp messages from WAHA.
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as unknown;

    if (!isWebhookMessage(payload)) {
      return NextResponse.json({
        success: true,
        message: "Webhook endpoint is reachable. Payload ignored.",
      });
    }

    const normalizedTimestamp = normalizeTimestampMs(payload.payload.timestamp);
    const duplicateExists = receivedMessages.some((message) =>
      isDuplicateWebhookMessage(message, payload, normalizedTimestamp),
    );

    if (duplicateExists) {
      return NextResponse.json({
        success: true,
        message: "Duplicate webhook ignored",
      });
    }

    receivedMessages.push({
      ...payload,
      payload: {
        ...payload.payload,
        timestamp: normalizedTimestamp,
      },
    });

    broadcastWebhookEvent({
      ...payload,
      payload: {
        ...payload.payload,
        timestamp: normalizedTimestamp,
      },
      timestamp: Date.now(),
    });

    if (receivedMessages.length > 100) {
      receivedMessages = receivedMessages.slice(-100);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook received",
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}

// GET /api/webhooks/messages - Retrieve stored messages for dashboard display.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const safeLimit = Number.isNaN(limit) ? 50 : Math.max(1, Math.min(limit, 100));

    let messages = receivedMessages.map((message) => ({
      ...message,
      payload: {
        ...message.payload,
        timestamp: normalizeTimestampMs(message.payload.timestamp),
      },
    }));

    if (session) {
      messages = messages.filter((msg) => msg.session === session);
    }

    messages.sort((a, b) => b.payload.timestamp - a.payload.timestamp);
    messages = messages.slice(0, safeLimit);

    return NextResponse.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching messages:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch messages",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/webhooks/messages - Clear all stored messages.
export async function DELETE() {
  try {
    receivedMessages = [];

    return NextResponse.json({
      success: true,
      message: "All messages cleared",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear messages",
      },
      { status: 500 },
    );
  }
}

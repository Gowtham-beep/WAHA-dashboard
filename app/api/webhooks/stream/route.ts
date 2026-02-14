import { NextRequest } from "next/server";
import { createWebhookEventStream } from "@/lib/webhook-stream";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return createWebhookEventStream(request);
}


type StreamController = ReadableStreamDefaultController<Uint8Array>;

declare global {
  var __wahaWebhookClients__: Set<StreamController> | undefined;
}

function getClients(): Set<StreamController> {
  if (!globalThis.__wahaWebhookClients__) {
    globalThis.__wahaWebhookClients__ = new Set<StreamController>();
  }
  return globalThis.__wahaWebhookClients__;
}

function encodeSSE(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export function createWebhookEventStream(request: Request): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const clients = getClients();
      clients.add(controller);
      controller.enqueue(encodeSSE({ type: "connected" }));

      request.signal.addEventListener("abort", () => {
        clients.delete(controller);
        try {
          controller.close();
        } catch {
          // no-op: stream might already be closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export function broadcastWebhookEvent(payload: unknown): void {
  const clients = getClients();
  const encoded = encodeSSE(payload);

  for (const client of clients) {
    try {
      client.enqueue(encoded);
    } catch {
      clients.delete(client);
    }
  }
}

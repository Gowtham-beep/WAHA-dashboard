interface WAHAConfig {
  baseUrl: string;
  apiKey: string;
}

interface Session {
  name: string;
  status?: string;
  state?: string;
}

interface SendMessageRequest {
  session: string;
  chatId: string;
  text: string;
  reply_to?: string;
  linkPreview?: boolean;
  linkPreviewHighQuality?: boolean;
}

interface SendMessageResponse {
  id: string;
  timestamp: number;
  status: string;
}

interface WebhookMessage {
  event: string;
  session: string;
  payload: {
    id: string;
    timestamp: number;
    from: string;
    body: string;
    hasMedia: boolean;
  };
}

interface SessionWebhook {
  url: string;
  events: string[];
  hmac?: { key: string | null };
  retries?: {
    delaySeconds: number;
    attempts: number;
    policy: string;
  };
  customHeaders?: Record<string, string> | null;
}

class WAHAClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: WAHAConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  private buildHeaders(extraHeaders?: HeadersInit): HeadersInit {
    return {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
      ...extraHeaders,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: this.buildHeaders(options.headers),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WAHA API Error: ${response.status} - ${errorText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error("WAHA API Request Failed:", error);
      throw error;
    }
  }

  async getSessions(): Promise<Session[]> {
    return this.request<Session[]>("/api/sessions", { method: "GET" });
  }

  async getSession(sessionName: string): Promise<Session> {
    return this.request<Session>(`/api/sessions/${sessionName}`, { method: "GET" });
  }

  async startSession(sessionName: string): Promise<Session> {
    return this.request<Session>(`/api/sessions/${sessionName}/start`, { method: "POST" });
  }

  async stopSession(sessionName: string): Promise<void> {
    return this.request<void>(`/api/sessions/${sessionName}/stop`, { method: "POST" });
  }

  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    const payload: SendMessageRequest = {
      ...data,
      reply_to: data.reply_to ?? "",
      linkPreview: data.linkPreview ?? true,
      linkPreviewHighQuality: data.linkPreviewHighQuality ?? true,
    };

    return this.request<SendMessageResponse>("/api/sendText", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getSessionQR(sessionName: string): Promise<{ qr: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/${sessionName}/auth/qr`, {
        method: "GET",
        headers: this.buildHeaders({
          Accept: "application/json, image/png",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WAHA API Error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() || "";

      if (contentType.includes("application/json")) {
        const data = (await response.json()) as { qr?: string };
        return { qr: data.qr || "" };
      }

      if (contentType.includes("image/png")) {
        const buffer = Buffer.from(await response.arrayBuffer());
        return { qr: `data:image/png;base64,${buffer.toString("base64")}` };
      }

      return { qr: await response.text() };
    } catch (error) {
      console.error("WAHA API Request Failed:", error);
      throw error;
    }
  }

  async setWebhook(sessionName: string, webhookUrl: string): Promise<void> {
    return this.request<void>(`/api/sessions/${sessionName}`, {
      method: "PATCH",
      body: JSON.stringify({
        config: {
          webhooks: [
            {
              url: webhookUrl,
              events: ["message"],
            },
          ],
        },
      }),
    });
  }

  async updateSessionWebhooks(sessionName: string, webhooks: SessionWebhook[]): Promise<void> {
    return this.request<void>(`/api/sessions/${sessionName}`, {
      method: "PATCH",
      body: JSON.stringify({
        config: {
          webhooks,
        },
      }),
    });
  }
}

export const wahaClient = new WAHAClient({
  baseUrl: process.env.WAHA_API_URL || "http://localhost:3000",
  apiKey: process.env.WAHA_API_KEY || "your-api-key",
});

export type {
  Session,
  SendMessageRequest,
  SendMessageResponse,
  WebhookMessage,
  SessionWebhook,
};

interface WAHAConfig {
  baseUrl: string;
  apiKey: string;
}

interface Session {
  name: string;
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
    return this.request<{ qr: string }>(`/api/sessions/${sessionName}/auth/qr`, {
      method: "GET",
    });
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
}

export const wahaClient = new WAHAClient({
  baseUrl: process.env.WAHA_API_URL||"http://localhost:8080" ,
  apiKey: process.env.WAHA_API_KEY || "your-api-key",
});

export type { Session, SendMessageRequest, SendMessageResponse, WebhookMessage };

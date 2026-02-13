"use client";

import { useCallback, useEffect, useState } from "react";

type WebhookMessage = {
  event: string;
  session: string;
  payload: {
    id: string;
    timestamp: number;
    from: string;
    body: string;
    hasMedia: boolean;
  };
};

type MessageHistoryProps = {
  selectedSession: string;
  refreshTrigger: number;
};

export default function MessageHistory({ selectedSession, refreshTrigger }: MessageHistoryProps) {
  const [messages, setMessages] = useState<WebhookMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (selectedSession) params.set("session", selectedSession);

      const response = await fetch(`/api/webhooks/messages?${params.toString()}`);
      const result = (await response.json()) as {
        success: boolean;
        data?: WebhookMessage[];
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch messages");
      }

      setMessages(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  }, [selectedSession]);

  async function clearMessages() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/webhooks/messages", { method: "DELETE" });
      const result = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to clear messages");
      }

      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
  }, [loadMessages, refreshTrigger]);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => clearInterval(timer);
  }, [autoRefresh, loadMessages]);

  return (
    <section className="rounded-lg border border-[#dbe3f4] bg-white p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black">Received Messages</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[#333]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4"
            />
            Auto-refresh
          </label>
          <button
            onClick={() => void loadMessages()}
            disabled={loading}
            className="text-sm font-medium text-[#333] underline disabled:opacity-60"
          >
            Refresh
          </button>
          <button
            onClick={() => void clearMessages()}
            disabled={loading}
            className="text-sm font-medium text-[#ff7a7a] underline disabled:opacity-60"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="mt-1 text-sm text-[#333]">
        Showing {messages.length} message(s){selectedSession ? ` for ${selectedSession}` : ""}.
      </p>

      {error ? <p className="mt-3 text-sm text-[#ff7a7a]">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {!loading && messages.length === 0 ? (
          <p className="text-sm text-[#666]">No messages yet.</p>
        ) : null}

        {messages.map((msg) => (
          <article key={msg.payload.id} className="rounded-md border border-[#dbe3f4] bg-[#f7f9ff] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#666]">
              <span>From: {msg.payload.from}</span>
              <span>{new Date(msg.payload.timestamp).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm text-black">{msg.payload.body || "(empty message)"}</p>
            <p className="mt-1 text-xs text-[#666]">Session: {msg.session}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

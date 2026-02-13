"use client";

import { useState, type FormEvent } from "react";

type MessageSenderProps = {
  selectedSession: string;
  onMessageSent: () => void;
};

export default function MessageSender({
  selectedSession,
  onMessageSent,
}: MessageSenderProps) {
  const [chatId, setChatId] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSession) {
      setStatus({ type: "error", text: "Select a session first." });
      return;
    }
    if (!chatId.trim() || !text.trim()) {
      setStatus({ type: "error", text: "chatId and text are required." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: selectedSession,
          chatId: chatId.trim(),
          text: text.trim(),
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send message");
      }

      setStatus({ type: "ok", text: "Message sent successfully." });
      setText("");
      onMessageSent();
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to send message",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Send Message</h2>
      <p className="mt-1 text-sm text-gray-600">
        Current session:{" "}
        <span className="font-medium text-gray-900">{selectedSession || "Not selected"}</span>
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="Recipient (e.g. 1234567890 or 1234567890@c.us)"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          disabled={loading || !selectedSession || !chatId.trim() || !text.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>

      {status ? (
        <p className={`mt-3 text-sm ${status.type === "ok" ? "text-green-700" : "text-red-600"}`}>
          {status.text}
        </p>
      ) : null}
    </section>
  );
}

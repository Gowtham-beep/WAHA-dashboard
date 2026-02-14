"use client";

import { useEffect, useMemo } from "react";
import { formatTimestampIST } from "@/lib/time";

type ChatMessagesModalProps = {
  open: boolean;
  sessionName: string;
  chatId: string;
  chatName: string;
  data: unknown;
  onClose: () => void;
};

type MessageRow = {
  id: string;
  from: string;
  body: string;
  timestamp: string;
  fromMe: boolean;
  hasMedia: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const rec = asRecord(value);
  if (!rec) return [];
  if (Array.isArray(rec.messages)) return rec.messages;
  if (Array.isArray(rec.data)) return rec.data;
  if (Array.isArray(rec.items)) return rec.items;
  return [];
}

function pickString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toRows(data: unknown): MessageRow[] {
  return asList(data).map((item, index) => {
    const rec = asRecord(item) || {};
    const id = pickString(rec.id, `msg-${index + 1}`);
    const from = pickString(rec.from ?? rec.author ?? rec.participant, "unknown");
    const body = pickString(rec.body, "(empty message)");
    const timestamp = formatTimestampIST(rec.timestamp ?? rec.messageTimestamp ?? rec.t, "-");
    const fromMe = Boolean(rec.fromMe);
    const hasMedia = Boolean(rec.hasMedia);
    return { id, from, body, timestamp, fromMe, hasMedia };
  });
}

export default function ChatMessagesModal({
  open,
  sessionName,
  chatId,
  chatName,
  data,
  onClose,
}: ChatMessagesModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const rows = useMemo(() => toRows(data), [data]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-7xl flex-col rounded-xl border border-[#dbe3f4] bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Chat Messages ({rows.length})</h3>
            <p className="text-xs text-[#666]">
              Session: {sessionName || "N/A"} | Chat: {chatName || chatId || "N/A"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-[#dbe3f4] px-3 py-1 text-sm font-medium text-[rgb(41,98,255)] hover:bg-[#f3f7ff]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 overflow-auto rounded-lg border border-[#dbe3f4] bg-[#f8fbff] p-3">
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border border-[#dbe3f4] bg-white p-2 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-[#666]">
                  <span>{row.fromMe ? "You" : row.from}</span>
                  <span>•</span>
                  <span>{row.timestamp}</span>
                  {row.hasMedia ? <span className="rounded bg-[#eef4ff] px-2 py-0.5">media</span> : null}
                </div>
                <p className="break-words">{row.body}</p>
              </div>
            ))}
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#666]">No messages found in payload.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

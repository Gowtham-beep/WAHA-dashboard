"use client";

import { useEffect, useMemo } from "react";

type ChatsOverviewModalProps = {
  open: boolean;
  sessionName: string;
  data: unknown;
  onOpenChat: (chatId: string, chatName: string) => void;
  onClose: () => void;
};

type ChatRow = {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unread: string;
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
  if (Array.isArray(rec.chats)) return rec.chats;
  if (Array.isArray(rec.data)) return rec.data;
  if (Array.isArray(rec.items)) return rec.items;
  return [];
}

function pickString(value: unknown, fallback = "N/A"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function getChatRows(data: unknown): ChatRow[] {
  return asList(data).map((item, index) => {
    const rec = asRecord(item) || {};
    const lastMessageObj = asRecord(rec.lastMessage);
    const id = pickString(rec.id ?? rec.chatId ?? rec.wid ?? rec.remoteJid, `chat-${index + 1}`);
    const title = pickString(rec.name ?? rec.title ?? rec.subject ?? rec.pushName, id);
    const lastMessage = pickString(
      rec.lastMessageText ?? rec.lastBody ?? rec.body ?? lastMessageObj?.body ?? rec.lastMessage,
      "-",
    );
    const timestamp = pickString(
      rec.timestamp ?? rec.lastTimestamp ?? rec.updatedAt ?? rec.t ?? lastMessageObj?.timestamp,
      "-",
    );
    const unread = pickString(rec.unreadCount ?? rec.unread ?? rec.unreadMessages ?? 0, "0");
    return { id, title, lastMessage, timestamp, unread };
  });
}

export default function ChatsOverviewModal({
  open,
  sessionName,
  data,
  onOpenChat,
  onClose,
}: ChatsOverviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const rows = useMemo(() => getChatRows(data), [data]);
  const raw = useMemo(() => JSON.stringify(data, null, 2), [data]);

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
          <h3 className="text-lg font-semibold">
            Chats Overview: {sessionName || "N/A"} ({rows.length})
          </h3>
          <button
            onClick={onClose}
            className="rounded-md border border-[#dbe3f4] px-3 py-1 text-sm font-medium text-[rgb(41,98,255)] hover:bg-[#f3f7ff]"
          >
            Close
          </button>
        </div>
        <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="min-h-0 overflow-auto rounded-lg border border-[#dbe3f4]">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#f5f8ff]">
                <tr>
                  <th className="border-b border-[#dbe3f4] px-3 py-2">Chat</th>
                  <th className="border-b border-[#dbe3f4] px-3 py-2">Last Message</th>
                  <th className="border-b border-[#dbe3f4] px-3 py-2">Unread</th>
                  <th className="border-b border-[#dbe3f4] px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#dbe3f4]">
                    <td className="px-3 py-2">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-[#666]">{row.id}</p>
                      <p className="text-xs text-[#666]">{row.timestamp}</p>
                    </td>
                    <td className="max-w-[340px] truncate px-3 py-2">{row.lastMessage}</td>
                    <td className="px-3 py-2">{row.unread}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onOpenChat(row.id, row.title)}
                        className="rounded-md border border-[#dbe3f4] px-2 py-1 text-xs font-medium text-[rgb(41,98,255)] transition hover:bg-[#f3f7ff]"
                      >
                        Open Messages
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[#666]">
                      No chat rows detected in payload.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="min-h-0 overflow-auto rounded-lg border border-[#dbe3f4] bg-[#f8fbff] p-3">
            <p className="mb-2 text-sm font-semibold">Raw Payload</p>
            <pre className="text-xs">{raw || "{}"}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

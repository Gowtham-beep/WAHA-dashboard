"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import ScreenshotModal from "@/components/ScreenshotModal";
import ChatsOverviewModal from "@/components/ChatsOverviewModal";
import ChatMessagesModal from "@/components/ChatMessagesModal";
import { formatTimestampIST } from "@/lib/time";

type Session = {
  name: string;
  status?: string;
  state?: string;
};

type SessionWebhook = {
  url: string;
  events: string[];
  hmac?: { key: string | null };
  retries?: {
    delaySeconds: number;
    attempts: number;
    policy: string;
  };
  customHeaders?: Record<string, string> | null;
};

type SessionDetail = Session & {
  config?: {
    debug?: boolean;
    ignore?: Record<string, boolean>;
    webhooks?: SessionWebhook[];
  };
  engine?: { engine?: string };
  timestamps?: Record<string, number>;
};

type WebhookMessage = {
  session: string;
  payload: {
    id: string;
    timestamp: number;
    from: string;
    body: string;
  };
};

function extractChatItems(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.chats)) {
      return record.chats.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    }
    if (Array.isArray(record.data)) {
      return record.data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    }
  }
  return [];
}

const EVENT_PRESETS: Record<string, string[]> = {
  minimal: ["session.status", "message"],
  messaging: [
    "session.status",
    "message",
    "message.any",
    "message.ack",
    "message.edited",
    "message.revoked",
  ],
  debug: [
    "session.status",
    "message",
    "event.response",
    "event.response.failed",
    "engine.event",
  ],
};

function statusText(session?: Session | null): string {
  return (session?.status || session?.state || "UNKNOWN").toUpperCase();
}

function needsQrRefresh(status: string): boolean {
  return status === "SCAN_QR_CODE";
}

function statusClass(status: string): string {
  if (status.includes("WORK")) {
    return "border-[rgb(41,98,255)] bg-[rgba(41,98,255,0.18)] text-[rgb(41,98,255)]";
  }
  if (status.includes("STOP") || status.includes("FAIL"))
    return "border-[#FF6C40]/40 bg-[#FF6C40]/10 text-[#FF6C40]";
  return "border-[#dbe3f4] bg-white text-black";
}

const panelClass =
  "rounded-xl border border-[#dbe3f4] bg-white p-4 shadow-[0_8px_28px_rgba(15,43,90,0.06)]";
const btnBase =
  "rounded-md border px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(30,72,140,0.16)] active:translate-y-0 active:shadow-sm disabled:translate-y-0 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed";
const btnPrimary =
  `${btnBase} border-transparent bg-[#2D99FF] text-white hover:bg-[#237fdd]`;
const btnNeutral =
  `${btnBase} border-[#dbe3f4] bg-white text-[rgb(41,98,255)] hover:border-[#b7caef] hover:bg-[#f3f7ff]`;
const btnDanger =
  `${btnBase} border-[#ffd2c3] bg-white text-[#FF6C40] hover:border-[#FF6C40] hover:bg-[#fff4ef]`;
const btnPillNeutral =
  "rounded-full border border-[rgb(41,98,255)] px-2 py-1 text-xs text-[rgb(41,98,255)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-[rgba(41,98,255,0.1)]";
const btnPillDanger =
  "rounded-full border border-[#FF6C40] px-2 py-1 text-xs text-[#FF6C40] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#fff4ef]";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [sessionQR, setSessionQR] = useState("");
  const [sessionScreenshot, setSessionScreenshot] = useState("");
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [chatsOverview, setChatsOverview] = useState<unknown>(null);
  const [isChatsModalOpen, setIsChatsModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<unknown>(null);
  const [isChatMessagesModalOpen, setIsChatMessagesModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [selectedChatName, setSelectedChatName] = useState("");

  const [messages, setMessages] = useState<WebhookMessage[]>([]);
  const [autoMessageRefresh, setAutoMessageRefresh] = useState(true);
  const [autoSessionRefresh, setAutoSessionRefresh] = useState(true);

  const [sessionName, setSessionName] = useState("");
  const [chatId, setChatId] = useState("");
  const [text, setText] = useState("");

  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [webhookPreset, setWebhookPreset] = useState<keyof typeof EVENT_PRESETS>("minimal");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const selectedStatus = statusText(sessionDetail || sessions.find((s) => s.name === selectedSession) || null);
  const webhooks = useMemo(() => sessionDetail?.config?.webhooks || [], [sessionDetail]);
  const webhookUrlCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const webhook of webhooks) {
      map.set(webhook.url, (map.get(webhook.url) || 0) + 1);
    }
    return map;
  }, [webhooks]);
  const duplicateWebhookCount = Array.from(webhookUrlCounts.values()).filter((c) => c > 1).length;
  const chatItems = useMemo(() => extractChatItems(chatsOverview), [chatsOverview]);

  const loadSessions = useCallback(async () => {
    const response = await fetch("/api/sessions");
    const result = (await response.json()) as { success: boolean; data?: Session[]; error?: string };
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to fetch sessions");
    }
    const next = result.data || [];
    setSessions(next);
    if (!selectedSession && next.length > 0) setSelectedSession(next[0].name);
  }, [selectedSession]);

  const loadSessionDetail = useCallback(async (sessionNameArg: string) => {
    if (!sessionNameArg) return;
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionNameArg)}`);
    const result = (await response.json()) as { success: boolean; data?: SessionDetail; error?: string };
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to fetch session detail");
    }
    setSessionDetail(result.data || null);
  }, []);

  const loadMessages = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (selectedSession) params.set("session", selectedSession);
    const response = await fetch(`/api/webhooks/messages?${params.toString()}`);
    const result = (await response.json()) as { success: boolean; data?: WebhookMessage[] };
    if (!response.ok || !result.success) return;
    setMessages(result.data || []);
  }, [selectedSession]);

  const withStatus = useCallback(async (action: () => Promise<void>, successMsg: string) => {
    setLoading(true);
    setStatusMessage("");
    try {
      await action();
      setStatusMessage(successMsg);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  async function startSession(e: FormEvent) {
    e.preventDefault();
    if (!sessionName.trim()) return;
    await withStatus(async () => {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName: sessionName.trim() }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to start session");
      setSelectedSession(sessionName.trim());
      setSessionName("");
      await loadSessions();
      await loadSessionDetail(sessionName.trim());
    }, "Session started.");
  }

  async function stopSession() {
    if (!selectedSession) return;
    await withStatus(async () => {
      const response = await fetch(`/api/sessions/${encodeURIComponent(selectedSession)}/stop`, {
        method: "POST",
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to stop session");
      await loadSessions();
      await loadSessionDetail(selectedSession);
    }, "Session stopped.");
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!selectedSession || !chatId.trim() || !text.trim()) return;
    await withStatus(async () => {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: selectedSession,
          chatId: chatId.trim(),
          text: text.trim(),
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to send message");
      setText("");
      await loadMessages();
    }, "Message sent.");
  }

  const fetchQR = useCallback(async (sessionNameArg = selectedSession, silent = false) => {
    if (!sessionNameArg) return;
    const status = statusText(sessionDetail);
    if (status !== "SCAN_QR_CODE") {
      if (!silent) setStatusMessage(`QR is available only in SCAN_QR_CODE status. Current: ${status}`);
      return;
    }

    const run = async () => {
      const response = await fetch(`/api/sessions/${encodeURIComponent(sessionNameArg)}/qr`);
      const result = (await response.json()) as { success: boolean; data?: { qr?: string }; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to fetch QR");
      setSessionQR(result.data?.qr || "");
    };

    if (silent) {
      await run();
      return;
    }

    await withStatus(run, "QR fetched.");
  }, [selectedSession, sessionDetail, withStatus]);

  const fetchScreenshot = useCallback(async (sessionNameArg = selectedSession) => {
    if (!sessionNameArg) return;
    await withStatus(async () => {
      const response = await fetch(`/api/screenshot?session=${encodeURIComponent(sessionNameArg)}`);
      const result = (await response.json()) as {
        success: boolean;
        data?: { screenshot?: string };
        error?: string;
      };
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to fetch screenshot");
      const nextScreenshot = result.data?.screenshot || "";
      setSessionScreenshot(nextScreenshot);
      setIsScreenshotModalOpen(nextScreenshot.startsWith("data:image/"));
    }, "Screenshot fetched.");
  }, [selectedSession, withStatus]);

  const fetchChatsOverview = useCallback(async (sessionNameArg = selectedSession, limit = 20) => {
    if (!sessionNameArg) return;
    await withStatus(async () => {
      const response = await fetch(
        `/api/${encodeURIComponent(sessionNameArg)}/chats/overview?limit=${limit}`,
      );
      const result = (await response.json()) as { success: boolean; data?: unknown; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to fetch chats overview");
      setChatsOverview(result.data ?? null);
      setIsChatsModalOpen(true);
    }, "Chats overview fetched.");
  }, [selectedSession, withStatus]);

  const fetchChatMessages = useCallback(
    async (
      chatId: string,
      chatName = "",
      sessionNameArg = selectedSession,
      limit = 20,
      offset = 0,
      downloadMedia = false,
      sortBy = "messageTimestamp",
      sortOrder = "desc",
    ) => {
      if (!sessionNameArg || !chatId) return;
      await withStatus(async () => {
        const response = await fetch(
          `/api/${encodeURIComponent(sessionNameArg)}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}&offset=${offset}&downloadMedia=${downloadMedia}&sortBy=${encodeURIComponent(sortBy)}&sortOrder=${encodeURIComponent(sortOrder)}`,
        );
        const result = (await response.json()) as { success: boolean; data?: unknown; error?: string };
        if (!response.ok || !result.success) throw new Error(result.error || "Failed to fetch chat messages");
        setSelectedChatId(chatId);
        setSelectedChatName(chatName || chatId);
        setChatMessages(result.data ?? null);
        setIsChatMessagesModalOpen(true);
      }, "Chat messages fetched.");
    },
    [selectedSession, withStatus],
  );

  async function saveWebhooks(nextWebhooks: SessionWebhook[]) {
    if (!selectedSession) return;
    await withStatus(async () => {
      const response = await fetch(`/api/sessions/${encodeURIComponent(selectedSession)}/webhook`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhooks: nextWebhooks }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to update webhooks");
      await loadSessionDetail(selectedSession);
    }, "Webhooks updated.");
  }

  function defaultWebhook(url: string, events: string[]): SessionWebhook {
    return {
      url,
      events,
      hmac: { key: null },
      retries: {
        delaySeconds: 2,
        attempts: 15,
        policy: "exponential",
      },
      customHeaders: null,
    };
  }

  async function addWebhook(e: FormEvent) {
    e.preventDefault();
    const url = newWebhookUrl.trim().replace("/api/webhook/messages", "/api/webhooks/messages");
    if (!url || !selectedSession) return;
    const next = [...webhooks, defaultWebhook(url, EVENT_PRESETS[webhookPreset])];
    await saveWebhooks(next);
    setNewWebhookUrl("");
  }

  async function removeWebhook(index: number) {
    const next = webhooks.filter((_, i) => i !== index);
    await saveWebhooks(next);
  }

  async function applyPreset(index: number, preset: keyof typeof EVENT_PRESETS) {
    const next = webhooks.map((webhook, i) =>
      i === index ? { ...webhook, events: EVENT_PRESETS[preset] } : webhook,
    );
    await saveWebhooks(next);
  }

  useEffect(() => {
    void withStatus(async () => {
      await loadSessions();
    }, "Ready.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    setSessionQR("");
    setSessionScreenshot("");
    setIsScreenshotModalOpen(false);
    setChatsOverview(null);
    setIsChatsModalOpen(false);
    setChatMessages(null);
    setIsChatMessagesModalOpen(false);
    setSelectedChatId("");
    setSelectedChatName("");
    void withStatus(async () => {
      await loadSessionDetail(selectedSession);
      await loadMessages();
    }, "Session loaded.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession]);

  useEffect(() => {
    if (!autoMessageRefresh) return;
    const timer = setInterval(() => void loadMessages(), 5000);
    return () => clearInterval(timer);
  }, [autoMessageRefresh, loadMessages]);

  useEffect(() => {
    if (!autoSessionRefresh || !selectedSession) return;
    const timer = setInterval(() => void loadSessionDetail(selectedSession), 4000);
    return () => clearInterval(timer);
  }, [autoSessionRefresh, loadSessionDetail, selectedSession]);

  useEffect(() => {
    if (!selectedSession || !sessionDetail) return;
    if (sessionQR) return;
    const status = statusText(sessionDetail);
    if (!needsQrRefresh(status)) return;

    void fetchQR(selectedSession, true);
    const timer = setInterval(() => void fetchQR(selectedSession, true), 12000);
    return () => clearInterval(timer);
  }, [fetchQR, selectedSession, sessionDetail, sessionQR]);

  const sessionTimestamps = Object.entries(sessionDetail?.timestamps || {});

  return (
    <div
      className="min-h-screen bg-white text-black"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(130,106,249,0.14) 0%, rgba(45,153,255,0.12) 45%, rgba(44,217,197,0.1) 100%)",
      }}
    >
      <header className="border-b border-[#dbe3f4] bg-white text-black backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">WAHA Ops Dashboard</h1>
          <div className="text-sm sm:text-base">{selectedSession ? `Session: ${selectedSession}` : "No session selected"}</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] space-y-4 px-4 py-4 sm:px-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className={panelClass}>
            <p className="text-sm text-black">Sessions</p>
            <p className="mt-1 text-3xl font-bold">{sessions.length}</p>
          </article>
          <article className={panelClass}>
            <p className="text-sm text-black">Current Status</p>
            <p className={`mt-2 inline-block rounded-md border px-2 py-1 text-sm font-semibold ${statusClass(selectedStatus)}`}>
              {selectedStatus}
            </p>
          </article>
          <article className={panelClass}>
            <p className="text-sm text-black">Webhook Health</p>
            <p className="mt-1 text-lg font-semibold">
              {webhooks.length} configured, {duplicateWebhookCount} duplicate URL(s)
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className={`${panelClass} text-[#000000]`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Sessions</h2>
              <button
                onClick={() => void withStatus(loadSessions, "Sessions refreshed.")}
                className={`${btnNeutral} px-2 py-1`}
              >
                ↻
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <form onSubmit={startSession} className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={loading || !sessionName.trim()}
                  className={`${btnPrimary} px-4 py-2`}
                >
                  ▷ Start New
                </button>
                <input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Session name"
                  className="rounded-md border border-[#dbe3f4] bg-[#ffffff] px-3 py-2 text-sm text-[#000000] outline-none"
                />
              </form>
              <div className="flex items-center gap-2">
                <input
                  placeholder="Search by Name, Phone"
                  className="rounded-md border border-[#dbe3f4] bg-[#ffffff] px-3 py-2 text-sm text-[#111111] outline-none"
                />
                <button className={`${btnNeutral} px-3 py-2 text-[#111111]`}>
                  Columns ▾
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-[#dbe3f4]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f5f8ff]">
                  <tr>
                    <th className="w-10 border-b border-[#dbe3f4] px-3 py-2" />
                    <th className="border-b border-[#dbe3f4] px-3 py-2">Name</th>
                    <th className="border-b border-[#dbe3f4] px-3 py-2">Account</th>
                    <th className="border-b border-[#dbe3f4] px-3 py-2">Status</th>
                    <th className="border-b border-[#dbe3f4] px-3 py-2">Actions</th>
                  </tr>
                  <tr className="bg-[#ffffff]">
                    <th className="border-b border-[#dbe3f4] px-3 py-2">
                      <div className="h-5 w-5 rounded border border-[#dbe3f4]" />
                    </th>
                    <th className="border-b border-[#dbe3f4] px-3 py-2">
                      <input
                        placeholder="Session"
                        className="w-full rounded-md border border-[#dbe3f4] bg-[#ffffff] px-2 py-1 text-[#111111] outline-none"
                      />
                    </th>
                    <th className="border-b border-[#dbe3f4] px-3 py-2">
                      <input
                        placeholder="Account (Phone Number)"
                        className="w-full rounded-md border border-[#dbe3f4] bg-[#ffffff] px-2 py-1 text-[#111111] outline-none"
                      />
                    </th>
                    <th className="border-b border-[#dbe3f4] px-3 py-2">
                      <select className="w-full rounded-md border border-[#dbe3f4] bg-[#ffffff] px-2 py-1 text-[#111111] outline-none">
                        <option>Any</option>
                      </select>
                    </th>
                    <th className="border-b border-[#dbe3f4] px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const current = statusText(session);
                    const selected = selectedSession === session.name;
                    return (
                      <tr
                        key={session.name}
                        className={`border-b border-[#dbe3f4] ${selected ? "bg-[rgba(41,98,255,0.22)]" : "bg-[#ffffff]"}`}
                      >
                        <td className="px-3 py-3">
                          <div className="h-5 w-5 rounded border border-[#dbe3f4]" />
                        </td>
                        <td className="px-3 py-3 font-medium">{session.name}</td>
                        <td className="px-3 py-3 text-[#555555]">-</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${statusClass(current)}`}>
                            {current}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => setSelectedSession(session.name)}
                              className={btnPillNeutral}
                            >
                              Select
                            </button>
                            <button
                              onClick={() => {
                                void withStatus(async () => {
                                  const response = await fetch(
                                    `/api/sessions/${encodeURIComponent(session.name)}/stop`,
                                    { method: "POST" },
                                  );
                                  const result = (await response.json()) as { success: boolean; error?: string };
                                  if (!response.ok || !result.success) {
                                    throw new Error(result.error || "Failed to stop session");
                                  }
                                  await loadSessions();
                                  await loadSessionDetail(session.name);
                                }, "Session stopped.");
                              }}
                              className={btnPillDanger}
                            >
                              Stop
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-[#555555]">
                        No sessions available.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className={panelClass}>
            <h2 className="text-xl font-semibold">Lifecycle + QR</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => selectedSession && void withStatus(() => loadSessionDetail(selectedSession), "Detail refreshed.")}
                disabled={!selectedSession || loading}
                className={btnNeutral}
              >
                Refresh Detail
              </button>
              <button
                onClick={() => void fetchQR()}
                disabled={!selectedSession || loading || selectedStatus !== "SCAN_QR_CODE"}
                className={btnNeutral}
              >
                Fetch QR
              </button>
              <button
                onClick={() => void fetchScreenshot()}
                disabled={!selectedSession || loading}
                className={btnNeutral}
              >
                Fetch Screenshot
              </button>
              <button
                onClick={() => void fetchChatsOverview()}
                disabled={!selectedSession || loading}
                className={btnNeutral}
              >
                Fetch Chats
              </button>
              <button
                onClick={() => void stopSession()}
                disabled={!selectedSession || loading}
                className={btnDanger}
              >
                Stop Session
              </button>
              <label className="ml-auto flex items-center gap-2 text-sm">
                Auto refresh
                <input
                  type="checkbox"
                  checked={autoSessionRefresh}
                  onChange={(e) => setAutoSessionRefresh(e.target.checked)}
                />
              </label>
            </div>

            <div className="mt-3 rounded-md border border-[#dbe3f4] bg-white p-3 text-sm">
              <p><strong>Status:</strong> {selectedStatus}</p>
              <p><strong>Engine:</strong> {sessionDetail?.engine?.engine || "N/A"}</p>
              <p><strong>Debug:</strong> {String(Boolean(sessionDetail?.config?.debug))}</p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border border-[#dbe3f4] bg-white p-3">
                <p className="mb-1 text-sm font-semibold">Timestamps</p>
                <div className="max-h-36 overflow-auto text-xs">
                  {sessionTimestamps.length === 0 ? "No timestamps." : null}
                  {sessionTimestamps.map(([key, value]) => (
                    <p key={key}>
                      {key}: {formatTimestampIST(value)}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-[#dbe3f4] bg-white p-3">
                <p className="mb-1 text-sm font-semibold">QR Payload</p>
                {sessionQR ? (
                  sessionQR.startsWith("data:image/") ? (
                    <Image
                      src={sessionQR}
                      alt="WhatsApp session QR"
                      width={288}
                      height={288}
                      unoptimized
                      className="mx-auto h-auto max-h-72 w-full max-w-72 rounded-md border border-[#dbe3f4] bg-white object-contain p-2"
                    />
                  ) : (
                    <pre className="max-h-36 overflow-auto text-xs">{sessionQR}</pre>
                  )
                ) : (
                  <p className="text-xs text-[#666]">No QR loaded.</p>
                )}
              </div>
              <div className="rounded-md border border-[#dbe3f4] bg-white p-3">
                <p className="mb-1 text-sm font-semibold">Session Screenshot</p>
                {sessionScreenshot ? (
                  sessionScreenshot.startsWith("data:image/") ? (
                    <>
                      <button
                        onClick={() => setIsScreenshotModalOpen(true)}
                        className="block w-full cursor-zoom-in rounded-md border border-[#dbe3f4] transition hover:border-[#b7caef] hover:bg-[#f3f7ff]"
                      >
                        <Image
                          src={sessionScreenshot}
                          alt="WhatsApp session screenshot"
                          width={480}
                          height={300}
                          unoptimized
                          className="mx-auto h-auto max-h-72 w-full rounded-md bg-white object-contain p-2"
                        />
                      </button>
                      <button
                        onClick={() => setIsScreenshotModalOpen(true)}
                        className={`${btnNeutral} mt-2`}
                      >
                        Open Large View
                      </button>
                    </>
                  ) : (
                    <pre className="max-h-36 overflow-auto text-xs">{sessionScreenshot}</pre>
                  )
                ) : (
                  <p className="text-xs text-[#666]">No screenshot loaded.</p>
                )}
              </div>
              <div className="rounded-md border border-[#dbe3f4] bg-white p-3">
                <p className="mb-1 text-sm font-semibold">Chats Overview</p>
                {chatItems.length > 0 ? (
                  <>
                    <div className="max-h-44 overflow-auto">
                      {chatItems.slice(0, 6).map((chat, index) => {
                        const id = String(chat.id ?? chat.chatId ?? chat.wid ?? `chat-${index + 1}`);
                        const label = String(chat.name ?? chat.title ?? chat.subject ?? id);
                        return (
                          <div key={`${id}-${index}`} className="mb-1 flex items-center justify-between gap-2">
                            <p className="truncate text-xs">
                              {index + 1}. {label}
                            </p>
                            <button
                              onClick={() => void fetchChatMessages(id, label)}
                              className="rounded border border-[#dbe3f4] px-2 py-0.5 text-[10px] text-[rgb(41,98,255)] transition hover:bg-[#f3f7ff]"
                            >
                              Messages
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setIsChatsModalOpen(true)}
                      className={`${btnNeutral} mt-2`}
                    >
                      Open Large View
                    </button>
                  </>
                ) : chatsOverview ? (
                  <>
                    <p className="text-xs text-[#666]">Payload fetched, but chat list was empty.</p>
                    <button
                      onClick={() => setIsChatsModalOpen(true)}
                      className={`${btnNeutral} mt-2`}
                    >
                      Open Raw View
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-[#666]">No chats loaded.</p>
                )}
              </div>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">Send Message</h2>
            <form onSubmit={sendMessage} className="mt-3 space-y-2">
              <input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Phone or chatId"
                className="w-full rounded-md border border-[#dbe3f4] bg-white px-3 py-2 outline-none focus:border-[rgb(41,98,255)]"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Type message..."
                className="w-full rounded-md border border-[#dbe3f4] bg-white px-3 py-2 outline-none focus:border-[rgb(41,98,255)]"
              />
              <button
                type="submit"
                disabled={loading || !selectedSession || !chatId.trim() || !text.trim()}
                className={`${btnPrimary} px-4 py-2`}
              >
                Send
              </button>
            </form>
          </article>

          <article className={panelClass}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Incoming Messages</h2>
              <label className="flex items-center gap-2 text-sm">
                Auto refresh
                <input
                  type="checkbox"
                  checked={autoMessageRefresh}
                  onChange={(e) => setAutoMessageRefresh(e.target.checked)}
                />
              </label>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => void loadMessages()}
                className={btnNeutral}
              >
                Refresh
              </button>
              <button
                onClick={() => void withStatus(async () => {
                  await fetch("/api/webhooks/messages", { method: "DELETE" });
                  setMessages([]);
                }, "Messages cleared.")}
                className={btnDanger}
              >
                Clear
              </button>
            </div>
            <div className="mt-3 max-h-60 space-y-2 overflow-auto">
              {messages.length === 0 ? <p className="text-sm">No messages yet.</p> : null}
              {messages.map((message, index) => (
                <div
                  key={`${message.session}_${message.payload.id}_${message.payload.timestamp}_${index}`}
                  className="rounded-md border border-[#dbe3f4] bg-white p-2 text-sm"
                >
                  <p>
                    <strong>{message.payload.from}</strong> - {formatTimestampIST(message.payload.timestamp)}
                  </p>
                  <p>{message.payload.body || "(empty message)"}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Webhook Manager</h2>
          <p className="mt-1 text-sm">
            Manage multiple webhook URLs and event presets for <strong>{selectedSession || "no selected session"}</strong>.
          </p>

          <form onSubmit={addWebhook} className="mt-3 flex flex-wrap gap-2">
            <input
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              placeholder="https://your-ngrok-url/api/webhooks/messages"
              className="min-w-[260px] flex-1 rounded-md border border-[#dbe3f4] bg-white px-3 py-2 outline-none focus:border-[rgb(41,98,255)]"
            />
            <select
              value={webhookPreset}
              onChange={(e) => setWebhookPreset(e.target.value as keyof typeof EVENT_PRESETS)}
              className="rounded-md border border-[#dbe3f4] bg-white px-3 py-2"
            >
              <option value="minimal">Minimal</option>
              <option value="messaging">Messaging</option>
              <option value="debug">Debug</option>
            </select>
            <button
              type="submit"
              disabled={!selectedSession || !newWebhookUrl.trim() || loading}
              className={`${btnPrimary} px-4 py-2`}
            >
              Add Webhook
            </button>
          </form>

          <div className="mt-3 overflow-x-auto rounded-md border border-[#dbe3f4]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#b11a21]/10">
                <tr>
                  <th className="border-b border-[#dbe3f4] px-3 py-2">URL</th>
                  <th className="border-b border-[#dbe3f4] px-3 py-2">Events</th>
                  <th className="border-b border-[#dbe3f4] px-3 py-2">Retries</th>
                  <th className="border-b border-[#dbe3f4] px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook, index) => {
                  const duplicate = (webhookUrlCounts.get(webhook.url) || 0) > 1;
                  return (
                    <tr key={`${webhook.url}-${index}`} className="border-b border-[#dbe3f4]">
                      <td className="px-3 py-2">
                        <div className="max-w-[420px] truncate">{webhook.url}</div>
                        {duplicate ? <p className="text-xs text-[#FF6C40]">Duplicate URL detected</p> : null}
                      </td>
                      <td className="px-3 py-2">{webhook.events.length} events</td>
                      <td className="px-3 py-2">
                        {webhook.retries
                          ? `${webhook.retries.attempts}x / ${webhook.retries.delaySeconds}s (${webhook.retries.policy})`
                          : "N/A"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => void applyPreset(index, "minimal")}
                            className={`${btnNeutral} rounded px-2 py-1 text-xs`}
                          >
                            Minimal
                          </button>
                          <button
                            onClick={() => void applyPreset(index, "messaging")}
                            className={`${btnNeutral} rounded px-2 py-1 text-xs`}
                          >
                            Messaging
                          </button>
                          <button
                            onClick={() => void applyPreset(index, "debug")}
                            className={`${btnNeutral} rounded px-2 py-1 text-xs`}
                          >
                            Debug
                          </button>
                          <button
                            onClick={() => void removeWebhook(index)}
                            className={`${btnDanger} rounded px-2 py-1 text-xs`}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center">
                      No webhooks configured.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Status</h2>
          <p className={`mt-2 text-sm ${statusMessage.toLowerCase().includes("fail") || statusMessage.toLowerCase().includes("error") ? "text-[#FF6C40]" : ""}`}>
            {statusMessage || "Ready"}
          </p>
        </section>
      </main>
      <ScreenshotModal
        open={isScreenshotModalOpen}
        screenshot={sessionScreenshot}
        sessionName={selectedSession}
        onClose={() => setIsScreenshotModalOpen(false)}
      />
      <ChatsOverviewModal
        open={isChatsModalOpen}
        sessionName={selectedSession}
        data={chatsOverview}
        onOpenChat={(chatId, chatName) => void fetchChatMessages(chatId, chatName)}
        onClose={() => setIsChatsModalOpen(false)}
      />
      <ChatMessagesModal
        open={isChatMessagesModalOpen}
        sessionName={selectedSession}
        chatId={selectedChatId}
        chatName={selectedChatName}
        data={chatMessages}
        onClose={() => setIsChatMessagesModalOpen(false)}
      />
    </div>
  );
}

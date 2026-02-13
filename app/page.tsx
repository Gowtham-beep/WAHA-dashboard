"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Session = {
  name: string;
  status?: string;
  state?: string;
};

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

function getSessionStatus(session: Session): string {
  return (session.status || session.state || "unknown").toLowerCase();
}

function statusPillClass(status: string): string {
  if (status.includes("work") || status.includes("ready") || status.includes("open")) {
    return "border-[#1ABC9C]/40 bg-[#1ABC9C]/15 text-[#0f7661]";
  }
  if (status.includes("stop") || status.includes("close") || status.includes("fail")) {
    return "border-[#FFC107]/40 bg-[#FFC107]/20 text-[#92400e]";
  }
  return "border-slate-300 bg-slate-100 text-slate-700";
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<WebhookMessage[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [chatId, setChatId] = useState("");
  const [text, setText] = useState("");
  const [hideDuplicates, setHideDuplicates] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sending, setSending] = useState(false);
  const [toolsBusy, setToolsBusy] = useState(false);
  const [pageError, setPageError] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const [toolsStatus, setToolsStatus] = useState("");
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<Record<string, unknown> | null>(null);
  const [sessionQR, setSessionQR] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setPageError("");
    try {
      const response = await fetch("/api/sessions");
      const result = (await response.json()) as { success: boolean; data?: Session[]; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch sessions");
      }
      const nextSessions = result.data || [];
      setSessions(nextSessions);
      if (!selectedSession && nextSessions.length > 0) {
        setSelectedSession(nextSessions[0].name);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to fetch sessions");
    } finally {
      setLoadingSessions(false);
    }
  }, [selectedSession]);

  const loadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (selectedSession) params.set("session", selectedSession);
      const response = await fetch(`/api/webhooks/messages?${params.toString()}`);
      const result = (await response.json()) as {
        success: boolean;
        data?: WebhookMessage[];
      };
      if (!response.ok || !result.success) return;
      setMessages(result.data || []);
    } catch {
      // Ignore message polling errors to keep dashboard responsive.
    }
  }, [selectedSession]);

  useEffect(() => {
    void loadSessions();
    void loadMessages();
  }, [loadMessages, loadSessions]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      void loadMessages();
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadMessages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/webhooks/messages`);
    }
  }, []);

  const sessionsWorking = useMemo(
    () => sessions.filter((session) => getSessionStatus(session).includes("work")).length,
    [sessions],
  );

  const filteredWorkers = useMemo(() => {
    return sessions.filter((session) =>
      session.name.toLowerCase().includes(workerFilter.trim().toLowerCase()),
    );
  }, [sessions, workerFilter]);

  const filteredSessions = useMemo(() => {
    const source = hideDuplicates
      ? sessions.filter(
          (session, index, list) => list.findIndex((item) => item.name === session.name) === index,
        )
      : sessions;
    return source.filter((session) =>
      session.name.toLowerCase().includes(sessionFilter.trim().toLowerCase()),
    );
  }, [hideDuplicates, sessionFilter, sessions]);

  async function startSession(e: FormEvent) {
    e.preventDefault();
    if (!sessionName.trim()) return;

    setPageError("");
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName: sessionName.trim() }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to start session");
      }
      setSelectedSession(sessionName.trim());
      setSessionName("");
      await loadSessions();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to start session");
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    setSendStatus("");
    if (!selectedSession || !chatId.trim() || !text.trim()) return;

    setSending(true);
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
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send message");
      }
      setText("");
      setSendStatus("Message sent successfully.");
      await loadMessages();
    } catch (error) {
      setSendStatus(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function clearMessages() {
    await fetch("/api/webhooks/messages", { method: "DELETE" });
    setMessages([]);
  }

  async function loadSelectedSessionDetails() {
    if (!selectedSession) return;
    setToolsBusy(true);
    setToolsStatus("");
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(selectedSession)}`);
      const result = (await response.json()) as {
        success: boolean;
        data?: Record<string, unknown>;
        error?: string;
      };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch session details");
      }
      setSelectedSessionDetails(result.data || null);
      setToolsStatus("Session details loaded.");
    } catch (error) {
      setToolsStatus(error instanceof Error ? error.message : "Failed to fetch session details");
    } finally {
      setToolsBusy(false);
    }
  }

  async function stopSelectedSession() {
    if (!selectedSession) return;
    setToolsBusy(true);
    setToolsStatus("");
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(selectedSession)}/stop`, {
        method: "POST",
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to stop session");
      }
      setToolsStatus("Session stopped.");
      await loadSessions();
    } catch (error) {
      setToolsStatus(error instanceof Error ? error.message : "Failed to stop session");
    } finally {
      setToolsBusy(false);
    }
  }

  async function fetchSessionQR() {
    if (!selectedSession) return;
    setToolsBusy(true);
    setToolsStatus("");
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(selectedSession)}/qr`);
      const result = (await response.json()) as {
        success: boolean;
        data?: { qr?: string };
        error?: string;
      };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch QR");
      }
      setSessionQR(result.data?.qr || "");
      setToolsStatus("QR loaded.");
    } catch (error) {
      setToolsStatus(error instanceof Error ? error.message : "Failed to fetch QR");
    } finally {
      setToolsBusy(false);
    }
  }

  async function setSelectedSessionWebhook() {
    if (!selectedSession || !webhookUrl.trim()) return;
    setToolsBusy(true);
    setToolsStatus("");
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(selectedSession)}/webhook`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to set webhook");
      }
      setToolsStatus("Webhook configured.");
    } catch (error) {
      setToolsStatus(error instanceof Error ? error.message : "Failed to set webhook");
    } finally {
      setToolsBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800">
      <header className="border-b-4 border-[#1ABC9C] bg-white">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <button className="text-2xl text-[#1ABC9C]">☰</button>
            <div className="flex items-center gap-2 text-3xl">🤖</div>
            <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-5 text-2xl text-[#1ABC9C]">
            <button>◌</button>
            <button>◉</button>
            <button className="text-[#FFC107]">↻</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-6 py-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-[#1ABC9C]/30 bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold">Sessions</p>
            <p className="mt-2 text-4xl font-bold">{sessions.length}</p>
            <p className="mt-2 text-lg text-[#1ABC9C]">{sessionsWorking} working</p>
          </article>
          <article className="rounded-2xl border border-[#1ABC9C]/30 bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold">Workers</p>
            <p className="mt-2 text-4xl font-bold">{sessions.length}</p>
            <p className="mt-2 text-lg">
              <span className="text-[#b45309]">{Math.max(0, sessions.length - sessionsWorking)} not connected</span>
              <span className="text-slate-500"> / </span>
              <span className="text-[#1ABC9C]">{sessionsWorking} connected</span>
            </p>
          </article>
          <article className="rounded-2xl border border-[#FFC107]/40 bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold">Updates</p>
            <p className="mt-2 text-3xl font-semibold text-[#1ABC9C]">All workers up to date!</p>
            <p className="mt-2 text-lg text-[#b45309]">Changelog</p>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-[#1ABC9C]/30 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-3xl font-semibold">Workers</h2>
            <div className="flex items-center gap-3">
              <button className="rounded-lg bg-[#FFC107] px-5 py-2 text-lg font-semibold text-slate-900">
                Connect
              </button>
              <input
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                placeholder="Keyword Search"
                className="rounded-lg border border-[#1ABC9C]/40 bg-[#F8F9FA] px-3 py-2 text-lg outline-none focus:border-[#1ABC9C]"
              />
              <button
                onClick={() => void loadSessions()}
                className="rounded-lg border border-[#1ABC9C]/40 px-3 py-2 text-lg text-[#1ABC9C]"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1ABC9C]/30">
            <table className="min-w-full text-left text-lg">
              <thead className="bg-[#1ABC9C]/10 text-slate-800">
                <tr>
                  <th className="border-b border-[#1ABC9C]/20 px-4 py-3">Name</th>
                  <th className="border-b border-[#1ABC9C]/20 px-4 py-3">API</th>
                  <th className="border-b border-[#1ABC9C]/20 px-4 py-3">Info</th>
                  <th className="border-b border-[#1ABC9C]/20 px-4 py-3">Sessions</th>
                  <th className="border-b border-[#1ABC9C]/20 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((session) => {
                  const status = getSessionStatus(session);
                  return (
                    <tr key={`worker-${session.name}`} className="border-b border-[#1ABC9C]/15">
                      <td className="px-4 py-3">WAHA</td>
                      <td className="px-4 py-3 text-[#0f7661]">http://localhost:3000</td>
                      <td className="px-4 py-3 text-slate-600">{session.name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-sm font-semibold ${statusPillClass(status)}`}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <button className="rounded-full border border-[#1ABC9C]/50 px-2 py-1 text-[#1ABC9C]">◉</button>
                          <button className="rounded-full border border-[#FFC107]/50 px-2 py-1 text-[#b45309]">◔</button>
                          <button className="rounded-full border border-slate-300 px-2 py-1 text-slate-500">i</button>
                          <button className="rounded-full border border-[#1ABC9C]/50 px-2 py-1 text-[#0f7661]">✎</button>
                          <button className="rounded-full border border-[#FFC107]/50 px-2 py-1 text-[#92400e]">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No workers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#1ABC9C]/30 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-3xl font-semibold">Sessions</h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-lg text-slate-600">
                Hide Duplicates
                <input
                  type="checkbox"
                  checked={hideDuplicates}
                  onChange={(e) => setHideDuplicates(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>
              <input
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                placeholder="Search by name"
                className="rounded-lg border border-[#1ABC9C]/40 bg-[#F8F9FA] px-3 py-2 text-lg outline-none focus:border-[#1ABC9C]"
              />
              <button
                onClick={() => void loadSessions()}
                className="rounded-lg border border-[#1ABC9C]/40 px-3 py-2 text-lg text-[#1ABC9C]"
              >
                ↻
              </button>
            </div>
          </div>

          <form onSubmit={startSession} className="mb-4 flex flex-wrap items-center gap-3">
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="New session name"
              className="rounded-lg border border-[#1ABC9C]/40 bg-[#F8F9FA] px-3 py-2 text-lg outline-none focus:border-[#1ABC9C]"
            />
            <button
              type="submit"
              disabled={loadingSessions || !sessionName.trim()}
              className="rounded-lg bg-[#FFC107] px-5 py-2 text-lg font-semibold text-slate-900 disabled:opacity-60"
            >
              Start New
            </button>
          </form>

          {pageError ? <p className="mb-3 text-[#b45309]">{pageError}</p> : null}

          <div className="overflow-x-auto rounded-xl border border-[#1ABC9C]/30">
            <table className="min-w-full text-left text-lg">
              <thead className="bg-[#1ABC9C]/10 text-slate-800">
                <tr>
                  <th className="border-b border-[#1ABC9C]/20 px-4 py-3">Name</th>
                  <th className="border-b border-[#1ABC9C]/20 px-4 py-3">Status</th>
                  <th className="border-b border-[#1ABC9C]/20 px-4 py-3">Select</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => {
                  const status = getSessionStatus(session);
                  const selected = selectedSession === session.name;
                  return (
                    <tr key={`session-${session.name}`} className="border-b border-[#1ABC9C]/15">
                      <td className="px-4 py-3">{session.name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-sm font-semibold ${statusPillClass(status)}`}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedSession(session.name)}
                          className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                            selected ? "bg-[#1ABC9C] text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {selected ? "Selected" : "Select"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#1ABC9C]/30 bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-semibold">Send Message</h3>
            <p className="mt-1 text-slate-600">Selected session: {selectedSession || "Not selected"}</p>
            <form onSubmit={sendMessage} className="mt-4 space-y-3">
              <input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Phone or chatId"
                className="w-full rounded-lg border border-[#1ABC9C]/40 bg-[#F8F9FA] px-3 py-2 text-lg outline-none focus:border-[#1ABC9C]"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type message..."
                rows={4}
                className="w-full rounded-lg border border-[#1ABC9C]/40 bg-[#F8F9FA] px-3 py-2 text-lg outline-none focus:border-[#1ABC9C]"
              />
              <button
                type="submit"
                disabled={sending || !selectedSession || !chatId.trim() || !text.trim()}
                className="rounded-lg bg-[#FFC107] px-5 py-2 text-lg font-semibold text-slate-900 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
              {sendStatus ? <p className="text-slate-700">{sendStatus}</p> : null}
            </form>
          </article>

          <article className="rounded-2xl border border-[#1ABC9C]/30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Received Messages</h3>
              <label className="flex items-center gap-2 text-lg text-slate-600">
                Auto-refresh
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void loadMessages()}
                className="rounded-lg border border-[#1ABC9C]/40 px-3 py-1 text-[#1ABC9C]"
              >
                Refresh
              </button>
              <button
                onClick={() => void clearMessages()}
                className="rounded-lg border border-[#FFC107]/60 px-3 py-1 text-[#92400e]"
              >
                Clear
              </button>
            </div>
            <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto">
              {messages.length === 0 ? <p className="text-slate-500">No messages yet.</p> : null}
              {messages.map((message) => (
                <div key={message.payload.id} className="rounded-lg border border-[#1ABC9C]/25 bg-[#F8F9FA] p-3">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">{message.payload.from}</span> -{" "}
                    {new Date(message.payload.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-1 text-slate-800">{message.payload.body || "(empty message)"}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-[#1ABC9C]/30 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-semibold">Session Tools</h3>
          <p className="mt-1 text-slate-600">
            Useful controls for daily ops on <span className="font-semibold">{selectedSession || "no session selected"}</span>.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void loadSelectedSessionDetails()}
              disabled={toolsBusy || !selectedSession}
              className="rounded-lg border border-[#1ABC9C]/40 px-3 py-2 text-[#1ABC9C] disabled:opacity-60"
            >
              Refresh Session Detail
            </button>
            <button
              onClick={() => void fetchSessionQR()}
              disabled={toolsBusy || !selectedSession}
              className="rounded-lg border border-[#1ABC9C]/40 px-3 py-2 text-[#1ABC9C] disabled:opacity-60"
            >
              Get QR
            </button>
            <button
              onClick={() => void stopSelectedSession()}
              disabled={toolsBusy || !selectedSession}
              className="rounded-lg border border-[#FFC107]/60 px-3 py-2 text-[#92400e] disabled:opacity-60"
            >
              Stop Session
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="Webhook URL"
              className="min-w-[280px] flex-1 rounded-lg border border-[#1ABC9C]/40 bg-[#F8F9FA] px-3 py-2 outline-none focus:border-[#1ABC9C]"
            />
            <button
              onClick={() => void setSelectedSessionWebhook()}
              disabled={toolsBusy || !selectedSession || !webhookUrl.trim()}
              className="rounded-lg bg-[#FFC107] px-4 py-2 font-semibold text-slate-900 disabled:opacity-60"
            >
              Set Webhook
            </button>
          </div>

          {toolsStatus ? <p className="mt-3 text-slate-700">{toolsStatus}</p> : null}

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-[#1ABC9C]/20 bg-[#F8F9FA] p-3">
              <p className="mb-2 font-semibold text-slate-700">Session Detail</p>
              <pre className="max-h-56 overflow-auto text-xs text-slate-700">
                {selectedSessionDetails ? JSON.stringify(selectedSessionDetails, null, 2) : "No details loaded."}
              </pre>
            </div>
            <div className="rounded-lg border border-[#1ABC9C]/20 bg-[#F8F9FA] p-3">
              <p className="mb-2 font-semibold text-slate-700">Session QR</p>
              <pre className="max-h-56 overflow-auto text-xs text-slate-700">
                {sessionQR || "No QR loaded."}
              </pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Session = {
  name: string;
  status?: string;
  state?: string;
};

type SessionsResponse = {
  success: boolean;
  data?: Session[];
  error?: string;
};

type SessionManagerProps = {
  selectedSession: string;
  onSessionSelect: (sessionName: string) => void;
  refreshTrigger: number;
};

export default function SessionManager({
  selectedSession,
  onSessionSelect,
  refreshTrigger,
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function getStatusLabel(session: Session): string {
    return session.status || session.state || "Unknown";
  }

  function getStatusClasses(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes("work") || normalized.includes("ready") || normalized.includes("open")) {
      return "bg-[rgba(41,98,255,0.2)] text-[#9fc0ff] border-[rgba(41,98,255,0.5)]";
    }
    if (normalized.includes("stop") || normalized.includes("close") || normalized.includes("fail")) {
      return "bg-[rgba(177,26,33,0.22)] text-[#ff8f95] border-[rgba(177,26,33,0.45)]";
    }
    return "bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.8)] border-[rgba(255,255,255,0.2)]";
  }

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/sessions");
      const result = (await response.json()) as SessionsResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch sessions");
      }

      setSessions(result.data || []);
      if (!selectedSession && result.data && result.data.length > 0) {
        onSessionSelect(result.data[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  }, [onSessionSelect, selectedSession]);

  async function createSession(e: FormEvent) {
    e.preventDefault();
    if (!sessionName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName: sessionName.trim() }),
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to start session");
      }

      onSessionSelect(sessionName.trim());
      setSessionName("");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, [loadSessions, refreshTrigger]);

  return (
    <section className="rounded-lg border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.06)] p-4 shadow-sm backdrop-blur">
      <h2 className="text-lg font-semibold text-white">Session Manager</h2>
      <p className="mt-1 text-sm text-[rgba(255,255,255,0.8)]">Create and select a WAHA session.</p>

      <form onSubmit={createSession} className="mt-4 space-y-3">
        <input
          type="text"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="New session name"
          className="w-full rounded-md border border-[rgba(255,255,255,0.25)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-sm text-white outline-none focus:border-[rgb(41,98,255)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[rgba(255,255,255,0.1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(255,255,255,0.16)] disabled:opacity-60"
        >
          {loading ? "Working..." : "Start Session"}
        </button>
      </form>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Available Sessions</h3>
          <button
            onClick={() => void loadSessions()}
            disabled={loading}
            className="text-xs font-medium text-[rgba(255,255,255,0.85)] underline disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {error ? <p className="text-sm text-[#ff7a7a]">{error}</p> : null}
        {!error && sessions.length === 0 && !loading ? (
          <p className="text-sm text-[rgba(255,255,255,0.65)]">No sessions found.</p>
        ) : null}

        <div className="space-y-2">
          {sessions.map((session) => {
            const active = selectedSession === session.name;
            return (
              <button
                key={session.name}
                onClick={() => onSessionSelect(session.name)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  active
                    ? "border-[rgb(41,98,255)] bg-[rgba(41,98,255,0.24)] text-white"
                    : "border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.92)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{session.name}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${getStatusClasses(
                      getStatusLabel(session),
                    )}`}
                  >
                    {getStatusLabel(session)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

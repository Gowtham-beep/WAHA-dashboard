"use client";

import { useState } from "react";
import SessionManager from "@/components/SessionManager";
import MessageSender from "@/components/MessageSender";
import MessageHistory from "@/components/MessageHistory";

export default function DashboardPage() {
  const [selectedSession, setSelectedSession] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">WAHA Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">WhatsApp Automation & Messaging Platform</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SessionManager
              onSessionSelect={setSelectedSession}
              selectedSession={selectedSession}
              refreshTrigger={refreshTrigger}
            />
          </div>

          <div className="space-y-6 lg:col-span-2">
            <MessageSender
              selectedSession={selectedSession}
              onMessageSent={() => setRefreshTrigger((prev) => prev + 1)}
            />
            <MessageHistory selectedSession={selectedSession} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            WAHA Dashboard - WhatsApp HTTP API Integration
          </p>
        </div>
      </footer>
    </div>
  );
}

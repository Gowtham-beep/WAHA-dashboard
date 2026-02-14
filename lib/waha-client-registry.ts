import { createWAHAClient, type WAHAConfig, wahaClient } from "@/lib/waha-api";

type WahaCredentials = {
  apiUrl: string;
  apiKey: string;
};

const clientCache = new Map<string, ReturnType<typeof createWAHAClient>>();
const sessionCredentials = new Map<string, WahaCredentials>();
let defaultCredentials: WahaCredentials | null = null;

function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/+$/, "");
}

function cacheKey(credentials: WahaCredentials): string {
  return `${credentials.apiUrl}::${credentials.apiKey}`;
}

function getOrCreateClient(credentials: WahaCredentials) {
  const key = cacheKey(credentials);
  const cached = clientCache.get(key);
  if (cached) return cached;

  const client = createWAHAClient({
    baseUrl: credentials.apiUrl,
    apiKey: credentials.apiKey,
  });
  clientCache.set(key, client);
  return client;
}

export function rememberSessionCredentials(sessionName: string, credentials: WAHAConfig): void {
  const next: WahaCredentials = {
    apiUrl: normalizeApiUrl(credentials.baseUrl),
    apiKey: credentials.apiKey.trim(),
  };
  sessionCredentials.set(sessionName, next);
  defaultCredentials = next;
}

export function getClientForSession(sessionName?: string) {
  if (sessionName) {
    const creds = sessionCredentials.get(sessionName);
    if (creds) return getOrCreateClient(creds);
  }
  if (defaultCredentials) return getOrCreateClient(defaultCredentials);
  return wahaClient;
}


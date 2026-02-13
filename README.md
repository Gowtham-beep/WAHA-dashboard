# WAHA Dashboard (Interview Task)

A simple, full-stack WhatsApp dashboard built with Next.js (App Router) and WAHA (WhatsApp HTTP API).

The app supports:
- Session management (list + start)
- Sending WhatsApp messages
- Receiving incoming messages via webhook
- Viewing and clearing message history in the dashboard

## Demo Scope and Approach

This interview implementation prioritizes:
- Clear architecture over over-engineering
- End-to-end functionality (UI -> API routes -> WAHA)
- Readable code with small components and predictable behavior

What I deliberately avoided:
- Heavy abstractions
- Premature state-management libraries
- Complex backend patterns for a small task

## Technical Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- WAHA HTTP API

## Architecture

### High-level flow

1. User interacts with dashboard UI (`app/page.tsx` + components).
2. UI calls internal Next.js API routes under `app/api/*`.
3. API routes call WAHA through a small client wrapper (`lib/waha-api.ts`).
4. Incoming WAHA webhooks are received at `/api/webhooks/messages`.
5. Webhook messages are stored in memory and shown in the UI.

### Why this structure

- Keeps WAHA credentials and raw WAHA API calls server-side.
- Gives frontend a stable internal API (`/api/...`) independent of WAHA changes.
- Makes the project easy to test with `curl` and easy to replace storage later.

## Project Structure

```txt
app/
  api/
    sessions/route.ts             # GET list sessions, POST start session
    messages/send/route.ts        # POST send WhatsApp text message
    webhooks/messages/route.ts    # POST receive webhook, GET history, DELETE clear
  page.tsx                        # Main dashboard page
components/
  SessionManager.tsx              # Session list + create/start
  MessageSender.tsx               # Send message form
  MessageHistory.tsx              # Incoming messages list + clear
lib/
  waha-api.ts                     # WAHA client wrapper and shared types
```

## Environment Configuration

Create/update `.env`:

```env
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=your_waha_api_key
```

Notes:
- `WAHA_API_URL` should be your WAHA server base URL.
- `WAHA_API_KEY` must match the WAHA `X-Api-Key`.
- Current code also has safe local fallbacks in `lib/waha-api.ts`.

## API Endpoints (Internal)

### 1) Sessions

`GET /api/sessions`
- Fetch all WAHA sessions.

`POST /api/sessions`
- Starts a session.
- Body:

```json
{ "sessionName": "default" }
```

### 2) Send Message

`POST /api/messages/send`
- Sends a WhatsApp text message.
- Body:

```json
{
  "session": "default",
  "chatId": "1234567890@c.us",
  "text": "Hi there!"
}
```

Behavior:
- If `chatId` does not include `@...`, code appends `@c.us`.
- WAHA send payload defaults are applied in `wahaClient.sendMessage()`:
  - `reply_to: ""`
  - `linkPreview: true`
  - `linkPreviewHighQuality: true`

### 3) Webhook + History

`POST /api/webhooks/messages`
- Receives incoming message payloads from WAHA webhook events.

`GET /api/webhooks/messages?session=default&limit=50`
- Returns stored incoming messages.
- Supports optional session filter and limit.

`DELETE /api/webhooks/messages`
- Clears stored messages.

## UI Features

### SessionManager
- Fetches sessions
- Starts new session
- Lets user select active session

### MessageSender
- Sends message using selected session
- Simple validation and success/error feedback

### MessageHistory
- Reads incoming webhook messages
- Filters by selected session
- Manual refresh and clear actions

## Running Locally

1. Install dependencies:

```bash
npm install
```

2. Configure `.env` with WAHA URL/API key.

3. Run app:

```bash
npm run dev
```

4. Open:

`http://localhost:3000`

## Quick API Testing (curl)

### List sessions

```bash
curl http://localhost:3000/api/sessions
```

### Start session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"default"}'
```

### Send message

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{"session":"default","chatId":"1234567890","text":"Hello"}'
```

### Read webhook history

```bash
curl "http://localhost:3000/api/webhooks/messages?limit=20"
```

## Webhook Setup with WAHA

WAHA must be configured to post incoming messages to:

`http://<your-dashboard-host>/api/webhooks/messages`

For local development, expose your local server using a tunnel (for example ngrok) and register that public URL in WAHA webhook config.

## Error Handling and Validation

- API routes return consistent response shape:
  - success: `{ success: true, data?: ... }`
  - error: `{ success: false, error: "..." }`
- Required fields are validated in routes.
- WAHA non-2xx responses are converted into readable errors in `waha-api.ts`.

## Interview Tradeoffs

### Chosen tradeoffs

- In-memory storage for webhook messages:
  - Fast to implement and demonstrate
  - No external DB setup needed for evaluation

- Thin WAHA client wrapper:
  - Centralized WAHA headers/auth/error handling
  - Easy to extend without scattering WAHA logic

### Known limitations

- In-memory message history is lost on server restart.
- No authentication/authorization on dashboard or internal routes.
- No retry queue for failed webhook/message operations.
- No test suite yet (linting is enabled).

## How I Would Improve It Next

1. Replace in-memory storage with persistent DB (PostgreSQL/SQLite + Prisma).
2. Add auth (session-based or JWT) for dashboard and API routes.
3. Add webhook signature verification and idempotency.
4. Add unit/integration tests for routes and WAHA client.
5. Add session QR display/start-stop status monitoring for better UX.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Final Notes

This solution is intentionally practical: small, readable, and fully functional for the requested features. It demonstrates API integration, UI wiring, validation, and clear separation between frontend, internal API, and external WAHA service.

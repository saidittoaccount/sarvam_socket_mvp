# Sarvam Socket MVP

Browser voice mock calls with one Sarvam agent (Meena Complicated PED), plus call history with
transcripts and recordings. Next.js on Vercel, server functions only, no separate backend.

## Deploy on Vercel

1. Import this GitHub repo at vercel.com/new. The Next.js preset is detected automatically.
2. Add these environment variables (Production and Preview):

| Variable              | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| `SARVAM_API_KEY`      | Sarvam Samvaad API key                                        |
| `SARVAM_ORG_ID`       | Organisation ID                                               |
| `SARVAM_WORKSPACE_ID` | Workspace ID                                                  |
| `SARVAM_APP_ID`       | Agent ID (`Meena-Compl-3fde0922-8991`)                        |
| `SARVAM_APP_VERSION`  | Optional: pin a committed version                             |
| `APP_PASSCODE`        | Team passcode. Set it: without it anyone can hear recordings. |

3. Deploy. Microphone access needs HTTPS, which Vercel provides.

## Local

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

## How it connects

- The browser uses `sarvam-conv-ai-sdk` (`ConversationAgent`, `BrowserAudioInterface`) for the voice call.
- `/api/sarvam/*` adds the API key to the SDK's signed-URL request. The WebSocket itself goes
  straight from the browser to Sarvam.
- `/api/calls*` use Sarvam's Analytics API for history, transcripts and recordings (no SDK equivalent).

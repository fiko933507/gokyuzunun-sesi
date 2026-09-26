# Gökyüzünün Sesi — Render Voice API

This is the server-only ElevenLabs integration. The public React Native/Expo app must **never** receive `ELEVENLABS_API_KEY`.

## Deploy within the existing Render project

Create a **Web Service** in `gokyuzunun-sesi-api` → Production:

| Field | Value |
| --- | --- |
| Repository | `fiko933507/gokyuzunun-sesi` |
| Branch | `main` |
| Language/Runtime | Node |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Region | Frankfurt |
| Instance | Free (initial testing) |

Add the environment variable `ELEVENLABS_API_KEY` in the **Render service dashboard**. Do not commit it or paste it into chat.

Health: `GET /health` (returns `voiceConfigured: false` until the key is set).
Available profiles: `GET /api/voice-profiles`.
Sample audio: `POST /api/voice-preview` with `{"profile":"weather"}` or `{"profile":"astrology"}`, response is MP3.

Only two fixed demonstration phrases are currently accepted. User-supplied text is intentionally ignored so a public endpoint cannot be used as an unbounded paid TTS proxy. There is basic per-IP rate limiting and an in-memory generation budget, not a production-grade persistent quota. The two clips are cached per process; free-instance restarts clear memory. Set a credit limit in ElevenLabs. Before allowing arbitrary personalized narration, implement user authentication, persistent quotas and paid-cost controls.

Render Free instances may sleep when idle. First requests may be slow. The application will need its API URL configured after the service becomes ready.

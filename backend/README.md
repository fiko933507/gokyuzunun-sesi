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

## Free-plan Voice Design setup

ElevenLabs Voice Library voices cannot be called via the API on Free. Instead,
create two **owned** voices in ElevenLabs Voices → My Voices → Add a voice → Voice Design.
Preview costs credits. Keep the saved voice IDs, not temporary preview IDs.

- Weather: warm, reassuring adult Turkish woman, authentic Istanbul Turkish accent, smooth natural narration, friendly morning presenter, moderate pace, never robotic.
- Astrology: adult Turkish woman, soft velvety intimate storytelling, gentle/mystical but clear and natural Turkish, slower thoughtful cadence, no whispering.

In Render → Environment, add:

- `WEATHER_VOICE_ID`: actual saved weather voice ID
- `ASTROLOGY_VOICE_ID`: actual saved astrology voice ID

Do not replace or reveal `ELEVENLABS_API_KEY`. The old two Voice Library IDs remain
unusable through Free API and are intentionally no longer the backend defaults.

`GET /health` returns `profilesConfigured` flags only; it never leaks the IDs/key.
`POST /api/voice-preview` refuses an unconfigured voice with 503 instead of
spending credits or sending a request with an inaccessible public library voice.

Free-generated audio is for **non-commercial use with attribution** under the
provider's current licensing terms. Confirm an appropriate commercial license
before launching a monetized or public commercial app. A Free credit balance
does not remove feature and licensing restrictions.

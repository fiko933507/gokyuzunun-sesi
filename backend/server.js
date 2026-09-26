// Server-side ElevenLabs proxy. Never expose ELEVENLABS_API_KEY to a mobile client.
const http = require('node:http');

const PORT = Number(process.env.PORT) || 10000;
const KEY = process.env.ELEVENLABS_API_KEY;
const MODEL = 'eleven_multilingual_v2';
const VOICES = Object.freeze({
  weather: {
    id: 'TLSC2qq8RlDdm7tETUHz',
    title: 'Hava durumu',
    text: 'Günaydın. Gökyüzünün Sesi seninle. Bugün gökyüzüne birlikte bakalım. Hava durumunu, günün sıcaklığını ve dışarı çıkarken nelere dikkat etmen gerektiğini sakin bir sesle anlatacağım.',
    settings: { stability: 0.60, similarity_boost: 0.80, style: 0.10, use_speaker_boost: true },
  },
  astrology: {
    id: 'LYfSi2g3Frvxg50fRl91',
    title: 'Astroloji',
    text: 'Gökyüzünün Sesi’ne hoş geldin. Ayın ışığına, gezegenlerin konumlarına ve günün sembollerine birlikte göz atalım. Bu anlatı, merakın ve düşüncelerin için sakin bir yolculuk olsun.',
    settings: { stability: 0.52, similarity_boost: 0.78, style: 0.24, use_speaker_boost: true },
  },
});
const cache = new Map();
const pending = new Map();
const requests = new Map();
let generatedToday = 0;
let currentDay = new Date().toISOString().slice(0, 10);

function json(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function rateLimit(req) {
  // Basic guard for a fixed-text preview, not a substitute for user authentication.
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const old = requests.get(ip) || [];
  const recent = old.filter(time => now - time < 60_000);
  recent.push(now);
  requests.set(ip, recent);
  if (requests.size > 2000) {
    for (const [key, times] of requests) {
      if (times.every(time => now - time >= 60_000)) requests.delete(key);
    }
  }
  return recent.length <= 5;
}
async function speech(profile) {
  if (cache.has(profile)) return cache.get(profile);
  if (pending.has(profile)) return pending.get(profile);
  if (!KEY) throw Object.assign(new Error('ElevenLabs key not configured'), { status: 503 });
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDay) { currentDay = today; generatedToday = 0; }
  if (generatedToday >= 24) throw Object.assign(new Error('Preview budget reached'), { status: 429 });
  generatedToday++;
  const voice = VOICES[profile];
  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);
    try {
      const upstream = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice.id) + '?output_format=mp3_44100_128', {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text: voice.text, model_id: MODEL, voice_settings: voice.settings }),
        signal: controller.signal,
      });
      if (!upstream.ok) {
        // Record only the provider HTTP status and a strictly validated machine-readable
        // error code. Never log the API key, the full provider body, or user text.
        let providerCode = 'unknown';
        try {
          const responseBody = await upstream.json();
          const rawCode = responseBody?.detail?.status ?? responseBody?.code;
          if (typeof rawCode === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(rawCode)) providerCode = rawCode;
        } catch {}
        console.error(JSON.stringify({
          event: 'elevenlabs_rejected', profile,
          providerStatus: upstream.status, providerCode,
        }));
        if (upstream.status === 402) {
          throw Object.assign(new Error('ElevenLabs plan or credits do not permit generation'), { status: 402 });
        }
        throw Object.assign(new Error('Speech provider unavailable'), { status: 502 });
      }
      const data = Buffer.from(await upstream.arrayBuffer());
      if (!data.length || data.length > 5_000_000) throw Object.assign(new Error('Unexpected audio size'), { status: 502 });
      cache.set(profile, data);
      return data;
    } finally {
      clearTimeout(timer);
    }
  })();
  pending.set(profile, promise);
  try { return await promise; } finally { pending.delete(profile); }
}
const server = http.createServer(async (req, res) => {
  const path = (req.url || '').split('?')[0];
  if (req.method === 'GET' && path === '/health') {
    return json(res, 200, { ok: true, service: 'gokyuzunun-sesi-api', voiceConfigured: !!KEY });
  }
  if (req.method === 'GET' && path === '/api/voice-profiles') {
    return json(res, 200, { profiles: Object.entries(VOICES).map(([id, voice]) => ({ id, title: voice.title })) });
  }
  if (req.method === 'POST' && path === '/api/voice-preview') {
    if (!rateLimit(req)) return json(res, 429, { error: 'Too many requests' });
    let body = '';
    try {
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 512) return json(res, 413, { error: 'Request too large' });
      }
      const input = JSON.parse(body);
      const profile = input && typeof input.profile === 'string' ? input.profile : '';
      if (!Object.hasOwn(VOICES, profile)) return json(res, 400, { error: 'Invalid voice profile' });
      const data = await speech(profile);
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': data.length, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
      return res.end(data);
    } catch (err) {
      const status = [400, 402, 413, 429, 503].includes(err.status) ? err.status : 502;
      if (status === 502 && err?.message !== 'Speech provider unavailable') {
        console.error(JSON.stringify({
          event: 'voice_preview_failed', profile: typeof profile === 'string' ? profile : 'unknown',
          reason: err?.name === 'AbortError' ? 'timeout' : err?.code === 'UND_ERR_CONNECT_TIMEOUT' ? 'connection_timeout' : 'unexpected',
        }));
      }
      return json(res, status, { error: status === 503 ? 'Voice service not configured' : status === 429 ? 'Preview budget reached' : status === 402 ? 'ElevenLabs account plan or credits do not permit this voice through the API' : status === 400 ? 'Invalid JSON' : 'Voice could not be generated' });
    }
  }
  return json(res, 404, { error: 'Not found' });
});
if (require.main === module) server.listen(PORT, '0.0.0.0', () => console.log('Gökyüzünün Sesi API listening on port ' + PORT));
module.exports = { server };

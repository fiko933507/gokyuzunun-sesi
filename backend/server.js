// Server-side ElevenLabs proxy. Never expose ELEVENLABS_API_KEY to a mobile client.
const http = require('node:http');
const { narration } = require('./narration');

const PORT = Number(process.env.PORT) || 10000;
const KEY = process.env.ELEVENLABS_API_KEY;
const MODEL = 'eleven_multilingual_v2';
const VOICES = Object.freeze({
  weather: {
    id: process.env.WEATHER_VOICE_ID || null,
    title: 'Hava durumu',
    text: 'Günaydın. Gökyüzünün Sesi seninle. Bugün gökyüzüne birlikte bakalım. Hava durumunu, günün sıcaklığını ve dışarı çıkarken nelere dikkat etmen gerektiğini sakin bir sesle anlatacağım.',
    settings: { stability: 0.60, similarity_boost: 0.80, style: 0.10, use_speaker_boost: true },
  },
  astrology: {
    id: process.env.ASTROLOGY_VOICE_ID || null,
    title: 'Astroloji',
    text: 'Gökyüzünün Sesi’ne hoş geldin. Ayın ışığına, gezegenlerin konumlarına ve günün sembollerine birlikte göz atalım. Bu anlatı, merakın ve düşüncelerin için sakin bir yolculuk olsun.',
    settings: { stability: 0.52, similarity_boost: 0.78, style: 0.24, use_speaker_boost: true },
  },
});
const cache = new Map();
const pending = new Map();
const requests = new Map();
const voiceGenderCache = new Map();
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
async function speech(profile, text = VOICES[profile].text, cacheKey = 'preview:' + profile) {
  if (!KEY) throw Object.assign(new Error('ElevenLabs key not configured'), { status: 503 });
  const voice = VOICES[profile];
  if (!voice.id) throw Object.assign(new Error('Voice ID not configured'), { status: 503 });
  if (!/^[A-Za-z0-9]{20}$/.test(voice.id)) throw Object.assign(new Error('Invalid voice ID configuration'), { status: 503 });
  // A voice ID does not encode gender. Check the provider's actual voice metadata
  // before serving cached or newly generated audio, so an old male MP3 cannot play.
  await requireFemaleVoice(voice.id);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (pending.has(cacheKey)) return pending.get(cacheKey);
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDay) { currentDay = today; generatedToday = 0; }
  if (generatedToday >= 12) throw Object.assign(new Error('Daily voice-generation limit reached'), { status: 429 });
  generatedToday++;
  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);
    try {
      const upstream = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice.id) + '?output_format=mp3_44100_128', {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: MODEL, voice_settings: voice.settings }),
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
      if (cache.size >= 80) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, data);
      return data;
    } finally {
      clearTimeout(timer);
    }
  })();
  pending.set(cacheKey, promise);
  try { return await promise; } finally { pending.delete(cacheKey); }
}
async function requireFemaleVoice(id) {
  const cached = voiceGenderCache.get(id);
  if (cached && Date.now() - cached.checkedAt < 30 * 60_000) {
    if (!cached.allowed) throw Object.assign(new Error('Selected voice is not verified female'), { status: 409 });
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices/' + encodeURIComponent(id), {
      headers: { 'xi-api-key': KEY, Accept: 'application/json' }, signal: controller.signal,
    });
    if (!res.ok) throw Object.assign(new Error('Voice metadata unavailable'), { status: 503 });
    const details = await res.json();
    const gender = String(details?.labels?.gender || '').toLowerCase();
    // Voice Design often leaves gender labels empty, and the dashboard's Edit Voice
    // dialog offers no label editor. Permit only the explicitly configured voice
    // with a female description; do not present this as provider verification.
    const description = String(details?.description || '');
    const describedFemale = !gender && details?.is_owner !== false && /\b(female|woman)\b|kadın/i.test(description);
    const allowed = gender === 'female' || describedFemale;
    voiceGenderCache.set(id, { gender, allowed, describedFemale, name: typeof details?.name === 'string' ? details.name.slice(0, 80) : '', checkedAt: Date.now() });
    if (!allowed) throw Object.assign(new Error('Selected voice is not verified female'), { status: 409 });
  } finally { clearTimeout(timer); }
}
const server = http.createServer(async (req, res) => {
  const path = (req.url || '').split('?')[0];
  if (req.method === 'GET' && path === '/health') {
    return json(res, 200, { ok: true, service: 'gokyuzunun-sesi-api', voiceConfigured: !!KEY, profilesConfigured: { weather: !!VOICES.weather.id, astrology: !!VOICES.astrology.id } });
  }
  if (req.method === 'GET' && path === '/api/voice-profiles') {
    const profiles = [];
    for (const [id, voice] of Object.entries(VOICES)) {
      let status = voice.id && KEY ? 'unverified' : 'unconfigured';
      if (voice.id && KEY) {
        try { await requireFemaleVoice(voice.id); status = voiceGenderCache.get(voice.id)?.describedFemale ? 'female-description-unverified' : 'female'; }
        catch (err) { if (err.status === 409) status = 'not-female'; }
      }
      const verified = voice.id ? voiceGenderCache.get(voice.id) : null;
      profiles.push({ id, title: voice.title, configured: !!voice.id, genderStatus: status,
        genderLabel: verified?.gender || 'missing', voiceName: verified?.name || '' });
    }
    return json(res, 200, { profiles });
  }
  if (req.method === 'POST' && (path === '/api/voice-preview' || path === '/api/narration')) {
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
      const generated = path === '/api/narration' ? await narration(profile,input) : {text:VOICES[profile].text,cacheKey:'preview:'+profile};
      const data = await speech(profile,generated.text,generated.cacheKey);
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': data.length, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
      return res.end(data);
    } catch (err) {
      const status = [400, 402, 409, 413, 429, 503].includes(err.status) ? err.status : 502;
      if (status === 502 && err?.message !== 'Speech provider unavailable') {
        console.error(JSON.stringify({
          event: 'voice_generation_failed', profile: typeof profile === 'string' ? profile : 'unknown',
          reason: err?.name === 'AbortError' ? 'timeout' : err?.code === 'UND_ERR_CONNECT_TIMEOUT' ? 'connection_timeout' : 'unexpected',
        }));
      }
      return json(res, status, { error: status === 409 ? 'Configured voice is not verified female; select a saved female voice ID' : status === 503 ? 'Voice service or selected voice is not configured' : status === 429 ? 'Daily generation budget reached' : status === 402 ? 'ElevenLabs account plan or credits do not permit this voice through the API' : status === 400 ? 'Invalid request' : 'Voice could not be generated' });
    }
  }
  return json(res, 404, { error: 'Not found' });
});
if (require.main === module) server.listen(PORT, '0.0.0.0', () => console.log('Gökyüzünün Sesi API listening on port ' + PORT));
module.exports = { server, requireFemaleVoice };

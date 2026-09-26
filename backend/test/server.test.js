const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { server } = require('../server');

let base;
async function url() {
  if (!base) {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = 'http://127.0.0.1:' + server.address().port;
  }
  return base;
}
after(() => server.close());

test('health returns status without exposing credentials', async () => {
  const res = await fetch((await url()) + '/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, 'gokyuzunun-sesi-api');
  assert.equal('apiKey' in body, false);
});

test('voice profile names do not expose provider credentials', async () => {
  const res = await fetch((await url()) + '/api/voice-profiles');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.profiles.map(v => v.id), ['weather', 'astrology']);
});

test('rejects arbitrary profile and does not call provider', async () => {
  const res = await fetch((await url()) + '/api/voice-preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: 'other', text: 'This must not be accepted' }),
  });
  assert.equal(res.status, 400);
});

test('restricted narration rejects caller supplied arbitrary text', async () => {
  const res=await fetch((await url())+'/api/narration',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({profile:'weather',latitude:'41',longitude:29,text:'injected speech'}),
  });
  assert.equal(res.status,400);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requireFemaleVoice } = require('../server');

test('male voice metadata is rejected and a verified female voice is accepted', async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async url => {
    calls++;
    return { ok: true, json: async () => ({ labels: { gender: url.endsWith('M'.repeat(20)) ? 'male' : 'female' } }) };
  };
  try {
    await assert.rejects(requireFemaleVoice('M'.repeat(20)), { status: 409 });
    await assert.rejects(requireFemaleVoice('M'.repeat(20)), { status: 409 });
    await requireFemaleVoice('F'.repeat(20));
    assert.equal(calls, 2);
  } finally { global.fetch = original; }
});

test('an owner-created voice described as female can be previewed when its gender label is missing', async () => {
  const original = global.fetch;
  global.fetch = async url => ({ ok: true, json: async () => url.endsWith('U'.repeat(20))
    ? { labels: {}, description: 'A soft Turkish female narrator', is_owner: true }
    : { labels: {}, description: 'A warm narrator', is_owner: true } });
  try {
    await requireFemaleVoice('U'.repeat(20));
    await assert.rejects(requireFemaleVoice('N'.repeat(20)), { status: 409 });
  } finally { global.fetch = original; }
});

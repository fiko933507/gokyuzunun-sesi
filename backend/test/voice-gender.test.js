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

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makePulse } = require('./waveform.js');
test('60 ms pulse has unity peak, balanced push/return, and isolated channels', () => {
  for (const rate of [44100, 48000, 96000]) {
    for (const channel of ['left', 'right', 'both']) {
      const samples = makePulse(rate, channel);
      assert.equal(samples[0].length, Math.round(rate * .060));
      samples.forEach((data, index) => {
        if ((channel === 'left' && index === 1) || (channel === 'right' && index === 0)) {
          assert.ok(data.every(v => v === 0)); return;
        }
        assert.ok(Math.max(...data) > .9999);
        assert.ok(data.every(v => Number.isFinite(v) && v >= -.25 && v <= 1));
        assert.ok(Math.abs(data.reduce((a, b) => a + b, 0)) < .001);
        assert.equal(data[0], 0);
        assert.ok(Math.abs(data.at(-1)) < .00001);
      });
    }
  }
});
test('invalid routing and sample rates fail closed', () => {
  assert.throws(() => makePulse(48000, 'invalid'));
  for (const rate of [0, NaN, Infinity, -48000]) assert.throws(() => makePulse(rate, 'left'));
});

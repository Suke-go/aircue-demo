/* Same push/return shape as src/model.rs Part::new("push"), at unity gain. */
(function (root) {
  function makePulse(rate, channel) {
    if (!Number.isFinite(rate) || rate < 8000 || rate > 192000) throw new Error('Invalid sample rate');
    if (!['left', 'right', 'both'].includes(channel)) throw new Error('Invalid channel');
    const frames = Math.round(rate * 0.060);
    const left = new Float32Array(frames), right = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      const t = i / rate * 1000;
      const value = t < 12 ? Math.sin(Math.PI * t / 12) ** 2 : -0.25 * Math.sin(Math.PI * (t - 12) / 48) ** 2;
      if (channel !== 'right') left[i] = value;
      if (channel !== 'left') right[i] = value;
    }
    return [left, right];
  }
  if (typeof module !== 'undefined') module.exports = { makePulse };
  else root.makePulse = makePulse;
})(globalThis);

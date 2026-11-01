// Original synth music for GrandTour, composed for this game and sequenced live with Web Audio:
// pads, bass, lead with echo, and drums. Three tracks; pick one before the run, like a car radio.
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
const Q = { maj: [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], sus4: [0, 5, 7], add9: [0, 4, 7, 14] };
// Melody bars: [step, midi note, length in 16ths]
export const TRACKS = [
  {
    name: 'Coastline Drive', bpm: 124, chords: [[62, 'maj7'], [59, 'm7'], [55, 'maj7'], [57, '7'], [62, 'maj7'], [54, 'm7'], [55, 'maj7'], [57, 'sus4']],
    bass: [0, null, 0, 12, null, 0, 0, null, 0, null, 0, 12, null, 0, 7, null], kick: [0, 7, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12], open: [14],
    lead: [[[0, 81, 3], [3, 78, 1], [4, 81, 2], [6, 83, 2], [8, 81, 4], [12, 78, 2], [14, 76, 2]], [[0, 78, 3], [3, 74, 1], [4, 78, 2], [6, 81, 2], [8, 78, 6], [14, 76, 2]], [[0, 74, 2], [2, 76, 2], [4, 78, 2], [6, 79, 2], [8, 83, 4], [12, 81, 2], [14, 79, 2]], [[0, 78, 4], [4, 76, 4], [8, 73, 2], [10, 76, 2], [12, 81, 4]],
      [[0, 81, 3], [3, 78, 1], [4, 81, 2], [6, 86, 2], [8, 85, 4], [12, 81, 2], [14, 83, 2]], [[0, 81, 3], [3, 78, 1], [4, 76, 2], [6, 78, 2], [8, 73, 6], [14, 76, 2]], [[0, 74, 2], [2, 78, 2], [4, 79, 2], [6, 83, 2], [8, 86, 3], [11, 85, 1], [12, 83, 2], [14, 81, 2]], [[0, 83, 4], [4, 81, 4], [8, 76, 2], [10, 78, 2], [12, 76, 4]]]
  },
  {
    name: 'Neon Avenue', bpm: 108, chords: [[57, 'm7'], [53, 'maj7'], [50, 'm7'], [52, '7'], [57, 'm7'], [53, 'maj7'], [55, 'maj'], [52, '7']],
    bass: [0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 12, null], kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: [], gated: 1,
    lead: [[[0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 69, 4]], [[0, 72, 3], [3, 74, 3], [6, 76, 2], [8, 79, 8]], [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 69, 6], [14, 72, 2]], [[0, 71, 8], [8, 68, 4], [12, 71, 4]],
      [[0, 76, 6], [6, 79, 2], [8, 81, 4], [12, 79, 2], [14, 76, 2]], [[0, 72, 4], [4, 76, 2], [6, 81, 2], [8, 79, 8]], [[0, 83, 4], [4, 81, 2], [6, 79, 2], [8, 74, 6], [14, 76, 2]], [[0, 76, 8], [8, 74, 4], [12, 71, 4]]]
  },
  {
    name: 'Tailwind', bpm: 140, chords: [[52, 'add9'], [59, 'maj'], [49, 'm7'], [57, 'maj7'], [52, 'maj'], [56, 'm7'], [57, 'maj7'], [59, 'sus4']],
    bass: [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, 7, 12, 7], kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [],
    lead: [[[0, 83, 2], [2, 80, 2], [4, 83, 2], [6, 85, 2], [8, 83, 2], [10, 80, 2], [12, 76, 4]], [[0, 78, 2], [2, 75, 2], [4, 78, 2], [6, 83, 6], [12, 81, 2], [14, 80, 2]], [[0, 80, 4], [4, 76, 2], [6, 80, 2], [8, 85, 6], [14, 83, 2]], [[0, 81, 4], [4, 85, 2], [6, 83, 2], [8, 81, 4], [12, 80, 2], [14, 78, 2]],
      [[0, 83, 2], [2, 80, 2], [4, 83, 2], [6, 88, 2], [8, 87, 4], [12, 83, 4]], [[0, 80, 3], [3, 83, 3], [6, 87, 2], [8, 85, 6], [14, 83, 2]], [[0, 85, 2], [2, 83, 2], [4, 81, 2], [6, 80, 2], [8, 81, 2], [10, 83, 2], [12, 85, 4]], [[0, 83, 8], [8, 78, 4], [12, 75, 4]]]
  }
];

export class Music {
  constructor(ctx, out) {
    this.ctx = ctx; this.master = ctx.createGain(); this.master.gain.value = 0.34; this.master.connect(out);
    const d = this.delay = ctx.createDelay(1), fb = ctx.createGain(), wet = this.wet = ctx.createGain();
    fb.gain.value = 0.3; wet.gain.value = 0.22; d.connect(fb).connect(d); d.connect(wet).connect(this.master);
    const nb = this.nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    this.k = -1;
  }
  play(k) {
    this.stop(); if (k < 0 || !TRACKS[k]) return;
    this.k = k; this.tr = TRACKS[k]; this.step = 0; this.dt = 60 / this.tr.bpm / 4; this.nextT = this.ctx.currentTime + 0.08;
    this.delay.delayTime.value = this.dt * 3;
    this.iv = setInterval(() => this.tick(), 25); this.tick();
  }
  stop() { clearInterval(this.iv); this.iv = null; this.k = -1; }
  tick() { const ctx = this.ctx; if (ctx.state !== 'running') return; if (this.nextT < ctx.currentTime - 0.3) this.nextT = ctx.currentTime + 0.02; while (this.nextT < ctx.currentTime + 0.12) { this.note(this.step, this.nextT); this.nextT += this.dt; this.step = (this.step + 1) % 128; } }
  env(g, t, a, peak, d, sus, end, r) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(peak * sus, t + a, d); g.gain.setTargetAtTime(0.0001, end, r); }
  voice(type, f, t, len, vol, cut, o = {}) {
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = o.q || 0.8;
    lp.connect(g).connect(this.master); if (o.echo) g.connect(this.delay);
    for (const det of o.det || [0]) { const os = ctx.createOscillator(); os.type = type; os.frequency.value = f; os.detune.value = det; os.connect(lp); os.start(t); os.stop(t + len + 0.6); }
    this.env(g, t, o.a || 0.01, vol, o.d || 0.12, o.s ?? 0.6, t + len, o.r || 0.06);
  }
  noise(t, len, vol, type, f) { const ctx = this.ctx, s = ctx.createBufferSource(), bf = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = this.nb; bf.type = type; bf.frequency.value = f; s.connect(bf).connect(g).connect(this.master); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02); }
  note(st, t) {
    const tr = this.tr, bar = Math.floor(st / 16), s = st % 16, [root, q] = tr.chords[bar % tr.chords.length], beat = this.dt;
    if (s === 0) Q[q].forEach(iv => this.voice('sawtooth', hz(root + 12 + iv), t, beat * 15.5, 0.035, 1300, { a: 0.18, d: 0.6, s: 0.8, r: 0.35, det: [-7, 7] }));
    const b = tr.bass[s]; if (b != null) this.voice('square', hz(root - 12 + b), t, beat * 0.9, 0.12, 520, { d: 0.08, s: 0.4 });
    for (const [at, n, len] of tr.lead[bar % tr.lead.length]) if (at === s) this.voice('sawtooth', hz(n), t, beat * len * 0.95, 0.07, 2600, { det: [-6, 6], echo: 1, d: 0.2, s: 0.7, r: 0.08 });
    if (tr.kick.includes(s)) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.75, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.25); }
    if (tr.snare.includes(s)) { this.noise(t, tr.gated ? 0.32 : 0.16, 0.32, 'bandpass', 1800); this.voice('triangle', 190, t, 0.05, 0.12, 2000, { d: 0.04, s: 0.1 }); }
    if (tr.hat.includes(s)) this.noise(t, 0.035, s % 4 === 2 ? 0.09 : 0.05, 'highpass', 7500);
    if (tr.open.includes(s)) this.noise(t, 0.2, 0.08, 'highpass', 6500);
  }
}

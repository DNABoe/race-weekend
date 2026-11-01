// Synthesised engine, tyre squeal, off-track rumble and start beeps (Web Audio). Created on the first tap so browsers allow playback.
export class Sound {
  constructor() { try { this.muted = localStorage.getItem('pp-mute') === '1'; } catch (e) { this.muted = false; } }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    const ctx = this.ctx = new C(), out = this.out = ctx.createGain();
    out.gain.value = this.muted ? 0 : 0.6; out.connect(ctx.destination);
    const lp = this.lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3;
    const eg = this.eg = ctx.createGain(); eg.gain.value = 0; lp.connect(eg).connect(out);
    const osc = (type, g) => { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = type; gg.gain.value = g; o.connect(gg).connect(lp); o.start(); return o; };
    this.o1 = osc('sawtooth', 0.32); this.o2 = osc('square', 0.12); this.o3 = osc('sawtooth', 0.12);
    const nb = this.nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = (type, f, q) => { const s = ctx.createBufferSource(), bf = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; s.loop = true; bf.type = type; bf.frequency.value = f; bf.Q.value = q; g.gain.value = 0; s.connect(bf).connect(g).connect(out); s.start(); return g; };
    this.sq = noise('bandpass', 1700, 6); this.rb = noise('lowpass', 160, 1);
    return true;
  }
  update(a) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, f = 70 + a.rpm * 300;
    this.o1.frequency.setTargetAtTime(f, t, 0.03); this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03); this.o3.frequency.setTargetAtTime(f * 2.02, t, 0.03);
    this.lp.frequency.setTargetAtTime(500 + a.rpm * 1800 * a.load, t, 0.05);
    this.eg.gain.setTargetAtTime(a.on ? 0.2 + 0.16 * a.load : 0, t, 0.08);
    this.sq.gain.setTargetAtTime(a.slide * 0.16, t, 0.05);
    this.rb.gain.setTargetAtTime(a.rumble * 0.45, t, 0.05);
  }
  beep(freq, dur, vol = 0.22) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.out); o.start(); o.stop(t + dur + 0.02);
  }
  thud() {
    const c = this.ctx; if (!c) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.nb; f.type = 'lowpass'; f.frequency.value = 380; g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    s.connect(f).connect(g).connect(this.out); s.start(); s.stop(t + 0.3);
  }
  event(e) {
    if (e === 'beep') this.beep(620, 0.18);
    else if (e === 'go') this.beep(990, 0.12, 0.16);
    else if (e === 'thud') this.thud();
    else if (e === 'finish') { this.beep(880, 0.2); setTimeout(() => this.beep(1175, 0.35), 180); }
  }
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('pp-mute', m ? '1' : '0'); } catch (e) {}
    if (this.ctx) this.out.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.05);
  }
  close() { if (this.ctx) this.ctx.close(); this.ctx = null; }
}

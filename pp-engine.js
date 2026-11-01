// Race logic: real-championship grid with you at the back, auto-throttle handling, AI with braking points, slipstream,
// contact, laps, ghost of your best lap, personal bests and the weekend challenge.
import { SEG, buildTrack, segAt, gridD } from './pp-track.js';
import { render, scheme, GHOST, PLAYER_Z } from './pp-render.js';

export const MAXV = SEG * 26;
const ACC = MAXV / 3.4, BRK = MAXV * 0.95, CENT = 0.9, STEER = 2.15, CAR_LEN = SEG * 0.75, CAR_W = 0.3, STEP = 0.05;
const SURF = { road: 1, kerb: 0.94, runoff: 0.85, grass: 0.5, gravel: 0.32 };
const DIFF = { easy: [0.8, 0.1, 0.84], medium: [0.91, 0.09, 0.94], hard: [0.975, 0.07, 1.0] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = (v, L) => ((v % L) + L) % L;
const sgap = (g, L) => { g = wrap(g, L); return g > L / 2 ? g - L : g; };
export const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
export const fmtLap = s => (s == null ? '–:––.–––' : Math.floor(s / 60) + ':' + (s % 60).toFixed(3).padStart(6, '0'));

export function challengeFor(season, round, ideal) {
  const T = Math.ceil(ideal * 1.12 * 10) / 10;
  const list = [
    { text: 'Finish on the podium', ok: r => r.pos <= 3 },
    { text: 'Finish in the top 5 with no more than 2 contacts', ok: r => r.pos <= 5 && r.contacts <= 2 },
    { text: 'Win from the back of the grid', ok: r => r.pos === 1 },
    { text: 'Gain 8 places on the opening lap', ok: r => r.lap1Gain >= 8 },
    { text: 'Set a lap under ' + fmtLap(T), ok: r => r.bestLap != null && r.bestLap <= T }
  ];
  const key = `pp-ch-v1-${season}-${round}`;
  return { ...list[(season * 7 + round * 3) % list.length], key, done: !!store.get(key) };
}

export class Race {
  constructor(o) {
    this.o = o; this.id = o.circuitId; this.tod = o.tod || 'day';
    this.t = buildTrack(o.circuitId, o.km); this.laps = this.t.laps;
    const N = this.t.N, lim = this.t.segs.map(s => { const a = Math.abs(s.curve); return a < 0.1 ? 1 : Math.min(1, Math.sqrt(STEER * 0.92 / (a * CENT))); });
    const vb = lim.slice(), k = 2 * (BRK * 0.8 / MAXV) * (SEG / MAXV);
    for (let pass = 0; pass < 2; pass++) for (let i = N - 1; i >= 0; i--) { const nx = vb[(i + 1) % N]; vb[i] = Math.min(vb[i], Math.sqrt(nx * nx + k)); }
    this.vb = vb; this.ideal = vb.reduce((s, v) => s + SEG / (Math.max(0.15, v) * MAXV), 0);
    this.challenge = challengeFor(o.season || 0, o.round || 0, this.ideal);
    this.best = store.get('pp-best-v1-' + this.id) || {};
    this.ghostData = store.get('pp-ghost-v1-' + this.id);
    this.state = 'intro'; this.time = 0; this.bg = 0; this.introZ = -SEG * 30; this.events = []; this.msg = ''; this.msgT = 0;
    this.setDifficulty(o.difficulty || 'medium');
  }
  setDifficulty(d) { this.diff = DIFF[d] ? d : 'medium'; this.grid(); }
  grid() {
    const [top, spread, skill] = DIFF[this.diff], rv = (this.o.rivals || []).slice(0, 21), n = rv.length;
    const slot = k => ({ d: gridD(k), x: (k % 2 ? 1 : -1) * 0.46 });
    this.cars = rv.map((r, i) => {
      const f = n > 1 ? i / (n - 1) : 0, s = slot(i);
      return { ...r, ai: true, ...s, v: 0, vx: 0, steer: 0, phase: i, pace: top - spread * f + ((i * 37) % 10 - 5) * 0.0015, skill: skill - 0.04 * f, lane: ((i * 53) % 7 - 3) * 0.06, side: 0, fin: null, scheme: scheme(r.color) };
    });
    this.player = { code: 'YOU', ai: false, ...slot(n), v: 0, vx: 0, steer: 0, phase: 0, fin: null, scheme: scheme('#e0262f') };
    this.cars.push(this.player);
    Object.assign(this, { startPos: n + 1, raceT: 0, lights: 0, out: false, contacts: 0, lastHit: -9, lastWall: -9, scrapeT: 0, slip: 0, slide: 0, surface: 'road', lapIdx: -1, lapStartT: null, lapStartD: 0, lapTimes: [], rec: [], recT: 0, lap1Gain: null, result: null, doneT: 0 });
  }
  start() { this.grid(); this.state = 'grid'; this.lightT = 0; this.hold = 0.5 + Math.random() * 1.1; this.events.push('start'); }
  flash(m, s = 1.2) { this.msg = m; this.msgT = s; }
  position(c = this.player) { const key = x => (x.fin != null ? 1e12 - x.fin : x.d); const k = key(c); return 1 + this.cars.filter(o => o !== c && key(o) > k).length; }

  update(dt, inp) {
    this.time += dt;
    if (this.msgT > 0 && (this.msgT -= dt) <= 0) this.msg = '';
    const p = this.player, L = this.t.L;
    if (this.state === 'intro') { this.introZ += MAXV * 0.3 * dt; this.bg += segAt(this.t, this.introZ).curve * 0.3 * dt * 0.1; p.steer = clamp(segAt(this.t, this.introZ + SEG * 4).curve * 0.15, -0.6, 0.6); p.phase += dt * 6; return; }
    if (this.state === 'grid') {
      this.lightT += dt; const lit = Math.min(5, Math.floor(this.lightT));
      if (lit > this.lights) { this.lights = lit; this.events.push('beep'); }
      if (this.lightT >= 5 + this.hold) { this.out = true; this.state = 'race'; this.events.push('go'); this.flash('Lights out', 0.9); }
      return;
    }
    this.raceT += dt;
    if (!p.fin) this.drive(p, dt, inp); else this.autopilot(p, dt);
    this.cars.forEach(c => { if (c.ai) this.ai(c, dt); });
    this.contact(p);
    this.cars.forEach(c => { if (c.ai && c.fin == null && c.d >= this.laps * L) c.fin = this.raceT; });
    this.laps_(p);
    if (this.state === 'done' && (this.doneT += dt) > 1.4 && !this.result) this.finish();
  }
  drive(p, dt, inp) {
    const t = this.t, sp = p.v / MAXV, s = segAt(t, p.d), steer = clamp(inp.steer || 0, -1, 1), side = p.x < 0;
    const ax = Math.abs(p.x);
    this.surface = ax <= 1 ? 'road' : ax < 1.13 && (side ? s.kL : s.kR) ? 'kerb' : t.env === 'street' ? 'runoff' : (side ? s.gL : s.gR) ? 'gravel' : 'grass';
    let top = MAXV * (this.slip > 0.3 ? 1.06 : 1) * SURF[this.surface];
    if (this.scrapeT > 0) { this.scrapeT -= dt; top = Math.min(top, MAXV * 0.45); }
    if (inp.brake) p.v -= BRK * dt; else p.v += ACC * (1 - 0.55 * sp * sp) * (this.slip > 0.3 ? 1.12 : 1) * dt;
    if (p.v > top) p.v -= (p.v - top) * (this.surface === 'road' ? 1.2 : 2.6) * dt;
    p.v = clamp(p.v, 0, MAXV * 1.08);
    const rate = STEER * (0.3 + 0.7 * Math.min(1, sp * 1.8)) * (this.surface === 'gravel' ? 0.5 : this.surface === 'grass' ? 0.75 : 1);
    const demand = s.curve * CENT * sp * sp;
    p.vx += (steer * rate - demand - p.vx) * Math.min(1, dt * 7);
    p.x += p.vx * dt;
    this.slide = sp > 0.3 ? clamp((Math.abs(demand) / rate - 0.72) * 2.6, 0, 1) : 0;
    const wall = t.env === 'street' ? t.wallO - 0.14 : 2.5, pitL = s.wL === 2 ? 1.28 : wall, pitR = s.wR === 2 ? 1.28 : wall;
    const lim = p.x < 0 ? pitL : pitR;
    if (Math.abs(p.x) > lim) {
      // One speed loss per impact; sliding along the wall only caps speed, so the car never gets pinned.
      const into = Math.sign(p.vx) === Math.sign(p.x) ? Math.abs(p.vx) : 0;
      p.x = Math.sign(p.x) * lim; p.vx = -p.vx * 0.3; this.scrapeT = 0.5;
      if (into > 0.25 && this.time - this.lastWall > 0.4) { p.v *= clamp(1 - into * 0.45, 0.4, 0.85); this.hit('Wall'); }
      this.lastWall = this.time;
    }
    p.steer += (steer - p.steer) * Math.min(1, dt * 10);
    p.phase += sp * dt * 22; p.d += p.v * dt;
    this.braking = !!inp.brake;
    this.bg += s.curve * sp * dt * 0.1;
    let slipNow = false;
    this.cars.forEach(c => { if (!c.ai) return; const g = sgap(c.d - p.d, t.L); if (g > SEG * 1.5 && g < SEG * 9 && Math.abs(c.x - p.x) < 0.28) slipNow = true; });
    this.slip = clamp(this.slip + (slipNow ? dt * 2 : -dt * 1.5), 0, 1);
  }
  autopilot(c, dt) { const s = segAt(this.t, c.d); c.v += (MAXV * 0.45 - c.v) * dt; c.x += (0 - c.x) * dt; c.d += c.v * dt; c.steer = clamp(s.curve * 0.1, -0.5, 0.5); c.phase += dt * 10; this.braking = false; this.slide = 0; }
  ai(c, dt) {
    const t = this.t, L = t.L, s = segAt(t, c.d), N = t.N;
    let vt = MAXV * Math.min(c.pace, this.vb[(s.i + 1) % N] * c.skill), xt = clamp(0.55 * Math.tanh(t.segs[(s.i + 5) % N].curve / 4), -0.6, 0.6) + c.lane;
    let ahead = null, gap = 1e9;
    this.cars.forEach(o => { if (o === c) return; const g = sgap(o.d - c.d, L); if (g > 0 && g < 4 * SEG && Math.abs(o.x - c.x) < 0.42 && g < gap) { gap = g; ahead = o; } });
    if (ahead && ahead.v < vt) { c.side = c.side || (ahead.x > c.x ? -1 : 1); xt = ahead.x + c.side * 0.6; if (gap < SEG * 1.6) vt = Math.min(vt, ahead.v); }
    else c.side = 0;
    if (c.fin != null) vt = Math.min(vt, MAXV * 0.45);
    c.v += clamp(vt - c.v, -BRK * dt, ACC * 0.95 * dt);
    c.x += (clamp(xt, -0.85, 0.85) - c.x) * Math.min(1, dt * 1.5);
    c.steer = clamp((xt - c.x) * 3 + s.curve * 0.08, -1, 1); c.phase += (c.v / MAXV) * dt * 22; c.d += c.v * dt;
  }
  contact(p) {
    const L = this.t.L;
    if (p.fin) return;
    this.cars.forEach(c => {
      if (!c.ai) return;
      const g = sgap(c.d - p.d, L), dx = c.x - p.x;
      if (Math.abs(g) >= CAR_LEN || Math.abs(dx) >= CAR_W) return;
      if (g > 0) { if (p.v > c.v) p.v = c.v * 0.9; p.d -= CAR_LEN - g; }
      else { c.v = Math.min(c.v, p.v * 0.95); c.d -= CAR_LEN + g; }
      const push = (CAR_W - Math.abs(dx)) * (dx > 0 ? -1 : 1);
      p.x += push * 0.6; c.x -= push * 0.4; p.vx += push * 2;
      this.hit('Contact');
    });
  }
  hit(m) { if (this.time - this.lastHit > 0.7 && !this.player.fin) { this.contacts++; this.lastHit = this.time; this.flash(m, 0.8); this.events.push('thud'); } }
  laps_(p) {
    const L = this.t.L, idx = Math.floor(p.d / L);
    if (this.lapStartT != null && !p.fin && (this.raceT - this.recT >= STEP)) { this.recT = this.raceT; this.rec.push(Math.round(p.d - this.lapStartD), Math.round(p.x * 100) / 100); }
    if (idx <= this.lapIdx || p.fin) return;
    if (this.lapStartT != null) {
      const lt = this.raceT - this.lapStartT; this.lapTimes.push(lt);
      if (this.best.lap == null || lt < this.best.lap) { this.best = { ...this.best, lap: lt }; store.set('pp-best-v1-' + this.id, this.best); store.set('pp-ghost-v1-' + this.id, { t: lt, s: this.rec }); this.ghostData = { t: lt, s: this.rec }; this.newLap = true; this.flash('Personal best lap', 1.4); }
      if (idx === 1) this.lap1Gain = this.startPos - this.position();
    }
    this.lapIdx = idx; this.lapStartT = this.raceT; this.lapStartD = idx * L; this.rec = []; this.recT = this.raceT;
    if (idx >= this.laps) { p.fin = this.raceT; this.state = 'done'; this.flash('Chequered flag', 2); this.events.push('finish'); }
    else if (idx === this.laps - 1) this.flash('Final lap', 1.4);
  }
  finish() {
    const pos = this.position(), bestLap = this.lapTimes.length ? Math.min(...this.lapTimes) : null;
    const r = { pos, total: this.cars.length, gain: this.startPos - pos, time: this.player.fin, bestLap, contacts: this.contacts, lap1Gain: this.lap1Gain ?? 0, newLap: !!this.newLap };
    r.newPos = this.best.pos == null || pos < this.best.pos;
    if (r.newPos) { this.best = { ...this.best, pos }; store.set('pp-best-v1-' + this.id, this.best); }
    r.challengeDone = this.diff !== 'easy' && this.challenge.ok(r);
    if (r.challengeDone && !this.challenge.done) { store.set(this.challenge.key, 1); this.challenge.done = true; r.challengeNew = true; }
    this.result = r;
  }
  ghost() {
    const g = this.ghostData, p = this.player;
    if (!g || this.lapStartT == null || p.fin || this.state !== 'race') return null;
    const k = (this.raceT - this.lapStartT) / STEP, i = Math.floor(k) * 2;
    if (i + 3 >= g.s.length) return null;
    const f = k - Math.floor(k);
    return { d: this.lapStartD + g.s[i] + (g.s[i + 2] - g.s[i]) * f, x: g.s[i + 1] + (g.s[i + 3] - g.s[i + 1]) * f };
  }
  draw(ctx, W, H) {
    const t = this.t, L = t.L, p = this.player, cam = this.state === 'intro' ? this.introZ : p.d, gh = this.ghost();
    const near = new Set(this.cars.filter(c => c.ai).map(c => [c, sgap(c.d - p.d, L)]).filter(([, g]) => g > 0 && g < SEG * 32).sort((a, b) => a[1] - b[1]).slice(0, 4).map(([c]) => c));
    const cars = this.cars.filter(c => c.ai).map(c => ({ z: wrap(c.d, L), x: c.x, scheme: c.scheme, steer: c.steer, phase: c.phase, code: near.has(c) ? c.code : '', color: c.color }));
    if (gh) cars.push({ z: wrap(gh.d, L), x: gh.x, scheme: GHOST, ghost: true });
    const gravel = this.surface === 'gravel' || this.surface === 'grass';
    render(ctx, W, H, {
      t, z: wrap(cam - PLAYER_Z, L), x: this.state === 'intro' ? 0 : p.x, tod: this.tod, bg: this.bg, cars,
      gantry: { lit: this.state === 'grid' ? this.lights : 0, out: this.out },
      player: { steer: p.steer, phase: p.phase, scheme: p.scheme, time: this.time, brake: this.braking, rumble: this.surface !== 'road' && this.surface !== 'runoff' && p.v > MAXV * 0.1, dust: (gravel ? 1 : this.slide * 0.6) * Math.min(1, p.v / (MAXV * 0.3)), dustColor: gravel ? (t.env === 'desert' || this.surface === 'gravel' ? '#cdb790' : '#7f6a4c') : '#d9dce2' },
      mini: { player: wrap(cam, L) / L, rivals: this.cars.filter(c => c.ai).map(c => ({ f: wrap(c.d, L) / L, color: c.color })), ghost: gh ? wrap(gh.d, L) / L : null }
    });
  }
  snap() {
    const p = this.player, sp = p.v / MAXV, gear = clamp(Math.ceil(sp * 8.2), 1, 8);
    return {
      state: this.state, pos: this.position(), total: this.cars.length, lap: clamp(this.lapIdx + 1, 1, this.laps), laps: this.laps,
      lapTime: this.lapStartT == null ? this.raceT : this.raceT - this.lapStartT, bestLap: this.best.lap ?? null, kmh: Math.round(sp * 330), gear: p.v < 1 ? 'N' : gear,
      slip: this.slip > 0.3, braking: this.braking, msg: this.msg, lights: this.lights, out: this.out, result: this.result
    };
  }
  audio() { const p = this.player, sp = p.v / MAXV, g = clamp(Math.ceil(sp * 8.2), 1, 8); return { rpm: this.state === 'race' || this.state === 'done' ? clamp(sp * 8.2 - (g - 1), 0, 1) * 0.6 + 0.4 * Math.min(1, sp * 3) : 0.15, on: this.state !== 'intro', load: this.braking ? 0.3 : 1, slide: this.slide, rumble: this.surface === 'road' || this.surface === 'runoff' ? 0 : Math.min(1, sp * 2) }; }
}

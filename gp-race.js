// Race logic for the top-down game: grip-limited handling with auto-throttle, AI on a racing line, tyre wear,
// pit stops, rain, DRS pickups, laps, ghost laps and season points.
import { TW, buildCircuit, locate, at, wrapI, rnd, hashStr } from './gp-track.js';

export const VMAX = 300, LAPS = 5, POINTS = [25, 18, 15, 12, 10];
const ACC = 190, BRK = 430, A_LAT = 300, LIMITER = 90, CAR_D = 17, STEP = 0.05, LIFE = 3.6;
const DIFF = { easy: { pace: 0.8, wear: 0.7 }, medium: { pace: 0.9, wear: 1 }, hard: { pace: 0.975, wear: 1 } };
const SURF = { road: [1, 1, 0], kerb: [0.95, 1, 0.05], runoff: [0.9, 0.95, 0.35], grass: [0.55, 0.6, 1.4], gravel: [0.42, 0.4, 3.2] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const angWrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
export const fmt = s => (s == null || !isFinite(s) ? '–:––.–––' : Math.floor(s / 60) + ':' + (s % 60).toFixed(3).padStart(6, '0'));
export const tyreGrip = (tyre, wet) => (tyre === 'wet' ? 0.8 + 0.12 * wet : 1 - 0.45 * wet);
const wearGrip = w => 1 - 0.18 * w - 0.9 * Math.max(0, w - 0.7) ** 2;
export const condKey = w => (w === 'wet' ? 'wet' : 'dry');

export function seasonLoad(season, codes) {
  const s = store.get('gp86-season-v1-' + season);
  return s && s.codes && s.codes.join() === codes.join() ? s : { season, codes, next: 0, pts: Object.fromEntries(codes.map(c => [c, 0])), done: [] };
}
export const seasonSave = s => store.set('gp86-season-v1-' + s.season, s);
export function seasonWeather(season, round) { const r = rnd(season * 31.7 + round * 7.3); return r < 0.62 ? 'dry' : r < 0.82 ? 'changing' : 'wet'; }

export class Race {
  constructor(o) {
    this.o = o; this.mode = o.mode || 'race'; this.id = o.circuit.id; this.t = o.track || buildCircuit(this.id);
    this.laps = this.mode === 'tt' ? Infinity : LAPS; this.diff = DIFF[o.difficulty] || DIFF.medium;
    const t = this.t; let est = 0; for (let i = 0; i < t.N; i++) est += t.ds / Math.min(VMAX, Math.sqrt(A_LAT) * t.vu[i]);
    this.lapEst = est * 1.06;
    const w = o.weather || 'dry', seed = o.seed ?? hashStr(this.id + (o.round || 0)), T = this.lapEst * LAPS * (0.3 + rnd(seed + 1) * 0.2);
    this.rainAt = w === 'wet' ? () => 0.85 : w === 'changing' ? (rnd(seed) > 0.4 ? x => clamp((x - T) / 15, 0, 1) * 0.85 : x => (x < T ? 0.85 : 0)) : () => 0;
    this.bestKey = `gp86-best-v1-${this.id}-${condKey(w)}`; this.ghostKey = `gp86-ghost-v1-${this.id}-${condKey(w)}`;
    this.best = store.get(this.bestKey) || {}; this.ghostData = this.mode === 'tt' ? store.get(this.ghostKey) : null;
    this.reset();
  }
  reset() {
    const t = this.t, rv = this.mode === 'tt' ? [] : (this.o.rivals || []).slice(0, 4);
    Object.assign(this, { time: 0, raceT: 0, state: 'intro', events: [], msg: '', msgT: 0, lights: 0, out: false, parts: [], skids: [], rec: [], recT: 0, contacts: 0, lastHit: -9, result: null, doneT: 0, newBest: false, lastLap: null, hinted: {}, braking: false });
    this.rain = this.rainAt(0); this.wet = this.rain; this.drsCd = t.drs.map(() => 0);
    const tyre = this.wet > 0.4 ? 'wet' : 'slick';
    const mk = (r, k, ai) => {
      const g = t.grid[k], [x, y, h] = at(t, g.i, g.off);
      return { ...r, ai, slot: k, x, y, h, vx: 0, vy: 0, v: 0, steer: 0, pos: g.i, dist: g.i - t.N, i: g.i, loc: { off: g.off, i: g.i, f: 0, nx: 0, ny: 0 }, lapIdx: -1, lapStart: null, best: null, tyre, wear: 0, pits: 0, pit: null, box: false, fin: null, slide: 0, surface: 'road', boost: 0, lastWall: -9, lane: 0, laneT: 0, evalLap: -2, pace: this.diff.pace + (1.5 - k) * 0.006, pitBias: rnd(k * 7.7 + t.N) };
    };
    this.cars = rv.map((r, k) => mk(r, k, true));
    this.player = mk({ code: 'YOU', name: 'You', color: '#ffcc00' }, rv.length, false);
    this.cars.push(this.player);
  }
  start() { this.reset(); this.state = 'grid'; this.lightT = 0; this.hold = 0.5 + Math.random() * 1.1; }
  flash(m, s = 1.2) { this.msg = m; this.msgT = s; }
  order() { return [...this.cars].sort((a, b) => (a.fin != null || b.fin != null ? (a.fin ?? 1e9) - (b.fin ?? 1e9) : b.dist - a.dist)); }
  box() { const p = this.player; if (this.mode === 'tt' || p.pit || p.fin != null || this.state !== 'race') return; p.box = !p.box; this.flash(p.box ? 'Box this lap' : 'Pit stop cancelled', 1); }

  update(dt, inp) {
    this.time += dt;
    if (this.msgT > 0 && (this.msgT -= dt) <= 0) this.msg = '';
    if (this.state === 'intro') return;
    if (this.state === 'grid') {
      this.lightT += dt; const lit = Math.min(5, Math.floor(this.lightT));
      if (lit > this.lights) { this.lights = lit; this.events.push('beep'); }
      if (this.lightT >= 5 + this.hold) { this.out = true; this.state = 'race'; this.events.push('go'); this.flash('Lights out', 0.9); }
      return;
    }
    this.raceT += dt;
    const t = this.t, r = this.rainAt(this.raceT);
    if (r > 0.3 && this.rain <= 0.3) this.flash('Rain is falling', 1.8);
    if (r < 0.1 && this.rain >= 0.1) this.flash('The rain has stopped', 1.6);
    this.rain = r; this.wet += (r - this.wet) * Math.min(1, dt / (r > this.wet ? 8 : 40));
    for (const c of this.cars) {
      if (c.ai && !c.pit && c.evalLap !== c.lapIdx && wrapI(c.pos - t.pit.a, t.N) > t.N - 40) { c.evalLap = c.lapIdx; this.aiPit(c); }
      if (!c.pit && c.box && c.fin == null && this.mode !== 'tt' && wrapI(c.pos - t.pit.a, t.N) < 4) { c.pit = { k: wrapI(c.pos - t.pit.a, t.N), phase: 'in', o0: c.loc.off }; c.v = Math.hypot(c.vx, c.vy); }
      if (c.pit) this.pitMove(c, dt);
      else this.drive(c, dt, c.ai || c.fin != null ? this.aiInput(c, dt, c.fin != null ? 140 : 0) : inp);
      this.progress(c);
    }
    this.collide(); this.pickups(dt); this.hints(); this.fx(dt);
    if (this.state === 'done' && !this.result && (this.doneT += dt) > 1.6) this.finish();
  }
  drive(c, dt, inp) {
    const t = this.t, N = t.N, L = locate(t, c.x, c.y, c.i, c.loc), bv = L.off > 0 ? 2 : 1, ao = Math.abs(L.off);
    let d = L.i + L.f - c.pos; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
    c.dist += d; c.pos = L.i + L.f; c.i = L.i;
    c.surface = ao <= TW / 2 ? 'road' : ao < TW / 2 + 5 && (t.kerb[L.i] & bv) ? 'kerb' : t.env === 'street' ? 'runoff' : (t.grav[L.i] & bv) ? 'gravel' : t.env === 'desert' ? (ao < TW / 2 + 32 ? 'runoff' : 'gravel') : 'grass';
    const S = SURF[c.surface], gF = tyreGrip(c.tyre, this.wet) * wearGrip(c.wear), A = A_LAT * gF * S[0];
    const vmax = VMAX * (c.boost > 0 ? 1.25 : 1) * (c.ai ? 0.86 + 0.14 * c.pace : 1);
    let ch = Math.cos(c.h), sh = Math.sin(c.h), vF = c.vx * ch + c.vy * sh;
    const sp0 = Math.abs(vF), wmax = 3.2 * Math.min(1, sp0 / 50) * (1 - 0.35 * Math.min(1, sp0 / VMAX));
    c.steer += (clamp(inp.steer || 0, -1, 1) - c.steer) * Math.min(1, dt * (c.ai ? 10 : 14));
    c.h += c.steer * wmax * dt;
    ch = Math.cos(c.h); sh = Math.sin(c.h); vF = c.vx * ch + c.vy * sh;
    let vL = -c.vx * sh + c.vy * ch; const vL2 = vL - Math.sign(vL) * Math.min(Math.abs(vL), A * dt);
    vF = Math.sign(vF || 1) * Math.sqrt(Math.max(0, vF * vF + vL * vL - vL2 * vL2)); vL = vL2; c.slide = Math.abs(vL);
    if (inp.brake) vF -= BRK * Math.min(1, gF * S[0] * 1.05) * dt;
    else if (inp.throttle !== 0) vF += ACC * S[1] * (c.boost > 0 ? 1.5 : 1) * Math.max(0, 1 - (vF / vmax) ** 2) * dt;
    vF -= (vF * S[2] + c.slide * 1.1) * dt; if (vF > vmax) vF -= (vF - vmax) * 2 * dt;
    vF = Math.max(0, vF);
    if (!c.ai) this.braking = !!inp.brake && vF > 1;
    c.vx = vF * ch - vL * sh; c.vy = vF * sh + vL * ch; c.x += c.vx * dt; c.y += c.vy * dt;
    const W = locate(t, c.x, c.y, c.i, c.loc), lim = t.wall[W.off > 0 ? 1 : 0][W.i] - 5;
    if (Math.abs(W.off) > lim) {
      // Pushed back inside; one speed loss per impact, and the nose turns back toward the track so a car can never get pinned.
      const sg = Math.sign(W.off), push = Math.abs(W.off) - lim, vn = (c.vx * W.nx + c.vy * W.ny) * sg;
      c.x -= W.nx * sg * push; c.y -= W.ny * sg * push;
      if (vn > 0) { c.vx -= W.nx * sg * vn * 1.3; c.vy -= W.ny * sg * vn * 1.3; }
      if (vn > 45 && this.time - c.lastWall > 0.5) { const k = clamp(1 - vn / 380, 0.45, 0.9); c.vx *= k; c.vy *= k; c.lastWall = this.time; if (!c.ai) this.hit('Barrier'); }
      c.h += angWrap(Math.atan2(t.TY[W.i], t.TX[W.i]) - c.h) * Math.min(1, dt * 2.5);
    }
    c.i = W.i;
    if (this.mode !== 'tt') {
      const life = LIFE * t.L * (c.tyre === 'wet' ? (this.wet > 0.3 ? 1.2 : 0.45) : 1);
      c.wear = Math.min(1.25, c.wear + (vF * dt / life * (c.surface === 'kerb' ? 1.5 : 1) + c.slide * dt * 0.0005) * (c.ai ? 1 : this.diff.wear));
    }
  }
  aiInput(c, dt, cap) {
    const t = this.t, N = t.N, sp = Math.hypot(c.vx, c.vy);
    let ah = null, gap = 1e9;
    for (const o of this.cars) { if (o === c || o.pit) continue; const g = wrapI(o.pos - c.pos, N) * t.ds; if (g > 0 && g < 80 && Math.abs(o.loc.off - c.loc.off) < 18 && g < gap) { gap = g; ah = o; } }
    if (ah && c.laneT <= 0) { c.lane = (ah.loc.off > t.ao[c.i] ? -1 : 1) * TW * 0.3; c.laneT = 1.6; }
    c.laneT -= dt; if (c.laneT <= 0) c.lane *= Math.max(0, 1 - dt * 1.5);
    // Pure pursuit on the racing line; the look-ahead never drops inside the minimum turning circle, so cars can't orbit a point.
    const fi = c.pos + 10 + sp * 0.055, off = clamp(t.ao[wrapI(Math.floor(fi), N)] + c.lane, -(TW / 2 - 9), TW / 2 - 9);
    const [tx, ty] = at(t, fi, off), e = angWrap(Math.atan2(ty - c.y, tx - c.x) - c.h);
    let vu = 1e9; for (let k = 1; k <= 8; k++) vu = Math.min(vu, t.vu[wrapI(c.i + k, N)]);
    let vt = Math.min(VMAX, Math.sqrt(A_LAT * tyreGrip(c.tyre, this.wet) * wearGrip(c.wear)) * vu * (c.ai ? c.pace : 0.9), cap || 1e9);
    if (ah && gap < 34) { const av = Math.hypot(ah.vx, ah.vy); if (av > 50) vt = Math.min(vt, av); else { vt = Math.min(vt, 70); c.lane = (ah.loc.off > c.loc.off ? -1 : 1) * TW * 0.32; c.laneT = 1; } }
    if (Math.abs(e) > 1.2) vt = Math.min(vt, 80);
    return { steer: clamp(e * 3.2, -1, 1), brake: sp > vt + 4, throttle: sp < vt ? 1 : 0 };
  }
  aiPit(c) {
    const left = this.laps - c.dist / this.t.N, wrong = (c.tyre === 'slick' && this.wet > 0.45) || (c.tyre === 'wet' && this.wet < 0.22);
    c.box = left > 0.6 && (wrong || (c.wear > 0.7 + c.pitBias * 0.12 && left > 1.3));
  }
  pitMove(c, dt) {
    const t = this.t, p = t.pit, P = c.pit, box = p.boxes[c.slot % 5];
    const offAt = k => (k < p.ramp ? P.o0 + (p.off(k) - P.o0) * sm(k / p.ramp) : p.off(Math.min(k, p.len)));
    if (P.phase === 'in' && P.k >= p.ramp) P.phase = 'lane';
    if (P.phase === 'lane' && P.k >= box) { P.phase = 'stop'; P.left = c.ai ? 2.2 + rnd(c.slot * 3.1 + this.raceT) * 0.8 : 2.4; c.v = 0; if (!c.ai) this.flash('Pit stop', 1); }
    if (P.phase === 'stop') {
      if ((P.left -= dt) <= 0) { c.tyre = this.wet > 0.4 ? 'wet' : 'slick'; c.wear = 0; c.pits++; c.box = false; P.phase = 'go'; if (!c.ai) this.flash(c.tyre === 'wet' ? 'New wets fitted' : 'New slicks fitted', 1.2); }
    } else {
      let vt = LIMITER;
      if (P.phase === 'lane') vt = Math.min(LIMITER, Math.sqrt(Math.max(0, BRK * (box - P.k) * t.ds)) + 4);
      if (P.phase === 'go' && P.k > p.len - p.ramp) vt = VMAX * 0.7;
      c.v += clamp(vt - c.v, -BRK * dt, ACC * dt);
    }
    const dk = c.v * dt / t.ds; P.k += dk; c.dist += dk; c.pos = wrapI(p.a + P.k, t.N); c.i = Math.floor(c.pos);
    const [x, y] = at(t, p.a + P.k, offAt(P.k)), [x2, y2] = at(t, p.a + P.k + 0.8, offAt(P.k + 0.8));
    c.x = x; c.y = y; c.h = Math.atan2(y2 - y, x2 - x); c.vx = Math.cos(c.h) * c.v; c.vy = Math.sin(c.h) * c.v;
    c.steer = 0; c.slide = 0; c.surface = 'road'; c.loc.off = offAt(P.k);
    if (!c.ai) this.braking = false;
    if (P.k >= p.len) c.pit = null;
  }
  progress(c) {
    const N = this.t.N, lap = Math.floor(c.dist / N);
    if (!c.ai && this.mode === 'tt' && c.lapStart != null && this.raceT - this.recT >= STEP) { this.recT = this.raceT; this.rec.push(Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, Math.round(c.h * 100) / 100); }
    if (lap <= c.lapIdx) return;
    c.lapIdx = lap;
    if (c.lapStart != null) { const lt = this.raceT - c.lapStart; if (c.best == null || lt < c.best) c.best = lt; if (!c.ai) this.lapDone(lt); }
    c.lapStart = this.raceT;
    if (!c.ai) { this.rec = []; this.recT = this.raceT; }
    if (lap >= this.laps && c.fin == null) { c.fin = this.raceT; if (!c.ai) { this.state = 'done'; this.flash('Chequered flag', 2); this.events.push('finish'); } }
    else if (!c.ai && lap === this.laps - 1) this.flash('Final lap', 1.4);
  }
  lapDone(lt) {
    this.lastLap = lt;
    if (this.best.lap == null || lt < this.best.lap) {
      this.best = { ...this.best, lap: lt }; store.set(this.bestKey, this.best); this.newBest = true; this.flash('Personal best lap', 1.4);
      if (this.mode === 'tt') { this.ghostData = { t: lt, s: this.rec }; store.set(this.ghostKey, this.ghostData); }
    } else if (this.mode === 'tt') this.flash('Lap ' + fmt(lt), 1.2);
  }
  collide() {
    const cs = this.cars.filter(c => !c.pit);
    for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
      const A = cs[a], B = cs[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d >= CAR_D || d < 0.01) continue;
      const nx = dx / d, ny = dy / d, ov = (CAR_D - d) / 2, rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
      A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
      if (rv < 0) { const j = rv * 0.6; A.vx += nx * j; A.vy += ny * j; B.vx -= nx * j; B.vy -= ny * j; }
      if ((!A.ai || !B.ai) && rv < -30) this.hit('Contact');
    }
  }
  hit(m) { if (this.time - this.lastHit > 0.7 && this.player.fin == null) { this.contacts++; this.lastHit = this.time; this.flash(m, 0.8); this.events.push('thud'); } }
  pickups(dt) {
    const t = this.t, p = this.player;
    for (let k = 0; k < this.drsCd.length; k++) this.drsCd[k] = Math.max(0, this.drsCd[k] - dt);
    this.cars.forEach(c => { if (c.boost > 0) c.boost = Math.max(0, c.boost - dt); });
    if (p.pit || p.fin != null || this.state !== 'race') return;
    t.drs.forEach((i, k) => { if (!this.drsCd[k] && wrapI(p.pos - i, t.N) < 2.5 && Math.abs(p.loc.off) < TW / 2 + 4) { p.boost = 3; this.drsCd[k] = 9; this.flash('DRS boost', 0.8); this.events.push('drs'); } });
  }
  hints() {
    const p = this.player, h = this.hinted; if (p.fin != null || p.pit || this.mode === 'tt') return;
    const left = this.laps - p.dist / this.t.N, say = (k, m) => { if (!h[k]) { h[k] = 1; this.flash(m, 2.4); } };
    if (p.tyre === 'slick' && this.wet > 0.45 && !p.box) say('w' + p.pits, 'Track is wet: tap Box for wets');
    if (p.tyre === 'wet' && this.wet < 0.2 && !p.box && left > 1) say('d' + p.pits, 'Track is drying: box for slicks');
    if (p.wear > 0.72 && !p.box && left > 1.2) say('t' + p.pits, 'Tyres are worn: box this lap?');
  }
  fx(dt) {
    for (const q of this.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.95; q.vy *= 0.95; }
    this.parts = this.parts.filter(q => q.life > 0).slice(-260);
    for (const c of this.cars) {
      if (c.pit) continue;
      const sp = Math.hypot(c.vx, c.vy), ch = Math.cos(c.h), sh = Math.sin(c.h), rough = c.surface === 'grass' || c.surface === 'gravel';
      if (((rough && sp > 40) || (this.wet > 0.3 && sp > 80)) && Math.random() < 0.6) this.parts.push({ x: c.x - ch * 11 + (Math.random() - 0.5) * 6, y: c.y - sh * 11 + (Math.random() - 0.5) * 6, vx: c.vx * 0.25 + (Math.random() - 0.5) * 30, vy: c.vy * 0.25 + (Math.random() - 0.5) * 30, life: 0.6, max: 0.6, kind: rough ? c.surface : 'spray' });
      if (c.slide > 45 && sp > 70 && this.wet < 0.35 && !rough) for (const s of [-1, 1]) this.skids.push([c.x - ch * 7 - sh * 4.6 * s, c.y - sh * 7 + ch * 4.6 * s, c.h]);
    }
  }
  finish() {
    const t = this.t, N = t.N, p = this.player;
    const est = c => (c.fin != null ? c.fin : this.raceT + Math.max(0, this.laps * N - c.dist) / Math.max(0.2, (c.dist + 20) / Math.max(1, this.raceT)));
    const rows = this.cars.map(c => ({ code: c.code, name: c.name, color: c.color, you: !c.ai, time: est(c), est: c.fin == null, pits: c.pits, best: c.best })).sort((a, b) => a.time - b.time);
    rows.forEach((r, k) => { r.pos = k + 1; r.pts = POINTS[k] || 0; r.gap = k ? r.time - rows[0].time : null; });
    this.result = { rows, pos: rows.findIndex(r => r.you) + 1, total: rows.length, time: p.fin, bestLap: p.best, pits: p.pits, contacts: this.contacts, newBest: this.newBest };
  }
  ghost() {
    const g = this.ghostData, p = this.player;
    if (!g || this.mode !== 'tt' || p.lapStart == null || this.state !== 'race') return null;
    const k = (this.raceT - p.lapStart) / STEP, i = Math.floor(k) * 3, f = k - Math.floor(k);
    if (i + 5 >= g.s.length) return null;
    return { x: g.s[i] + (g.s[i + 3] - g.s[i]) * f, y: g.s[i + 1] + (g.s[i + 4] - g.s[i + 1]) * f, h: g.s[i + 2] + angWrap(g.s[i + 5] - g.s[i + 2]) * f };
  }
  view() { return { t: this.t, cars: this.cars, ghost: this.ghost(), parts: this.parts, skids: this.skids, drs: this.t.drs.map((i, k) => ({ i, on: !this.drsCd[k] })), wet: this.wet, rain: this.rain, time: this.time, player: this.player }; }
  snap() {
    const p = this.player, sp = Math.hypot(p.vx, p.vy);
    return {
      state: this.state, mode: this.mode, pos: this.order().indexOf(p) + 1, total: this.cars.length, lap: Math.max(1, Math.min(this.laps, p.lapIdx + 1)), laps: this.laps,
      lapTime: p.lapStart == null ? 0 : this.raceT - p.lapStart, best: this.best.lap ?? null, last: this.lastLap, kmh: Math.round(sp * 1.1), tyre: p.tyre, wear: p.wear,
      wet: this.wet, rain: this.rain, boost: p.boost / 3, box: p.box, pit: p.pit ? p.pit.phase : null, pitLeft: p.pit && p.pit.phase === 'stop' ? Math.max(0, p.pit.left) : 0,
      braking: this.braking, msg: this.msg, lights: this.lights, out: this.out, result: this.result, hasGhost: !!this.ghostData
    };
  }
  audio() {
    const p = this.player, sp = Math.hypot(p.vx, p.vy) / VMAX, g = clamp(Math.ceil(sp * 8.2), 1, 8), live = this.state === 'race' || this.state === 'done';
    return { rpm: live ? clamp(sp * 8.2 - (g - 1), 0, 1) * 0.6 + 0.4 * Math.min(1, sp * 3) : 0.15, on: this.state !== 'intro', load: this.braking ? 0.3 : 1, slide: clamp((p.slide - 30) / 80, 0, 1), rumble: p.surface === 'grass' || p.surface === 'gravel' ? Math.min(1, sp * 2) : p.surface === 'kerb' ? 0.4 * Math.min(1, sp * 2) : 0 };
  }
}

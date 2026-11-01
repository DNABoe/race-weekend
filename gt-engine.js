// GrandTour game logic: auto-throttle driving with centrifugal pull, traffic, crashes, checkpoints that add time,
// the fork choice, five finishes, score, best score per finish and the weekend challenge.
import { SEG, LANES, PYRAMID, THEMES, buildSection, next, rnd } from './gt-route.js';
import { render, CAM_H, PLAYER_Z } from './gt-render.js';
import { SOLID } from './gt-sprites.js';
import { TRAFFIC } from './gt-cars.js';

export const MAXV = SEG * 24, START_TIME = 72, EXTEND = [0, 52, 50, 48, 46];
const ACC = MAXV / 5, BRK = MAXV * 0.9, CENT = 0.3, STEER = 2.25, OFFMAX = 0.42, CAR = 0.17;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
export const bests = () => store.get('gt-best-v1') || {};
export function challengeText(ch) {
  if (!ch) return '';
  const th = THEMES[ch.key], fin = PYRAMID[4].includes(ch.key);
  return fin ? `Reach the ${th.name} finish` : `Drive through ${th.name} and reach any finish`;
}

export class Tour {
  constructor(o = {}) { this.o = o; this.ch = o.challenge || null; this.chDone = this.ch ? !!store.get(this.ch.id) : false; this.reset(); this.state = 'intro'; }
  reset() {
    Object.assign(this, { segs: [], secs: [], cars: [], branch: {}, z: 0, x: 0, v: 0, steer: 0, spin: 0, bg: 0, time: 0, timer: START_TIME, score: 0, events: [], msg: '', msgT: 0, count: 0, cpDone: {}, result: null, endT: 0, brake: false, rough: false, seed: Math.floor(Math.random() * 1e5) });
    this.append(0, 0, null, 0);
  }
  append(s, j, prev, ox) {
    const key = PYRAMID[s][j], nx = next(s, j), sec = this.secs.length, i0 = this.segs.length;
    const segs = buildSection(key, s, this.seed + s * 31 + j * 7, { start: s === 0, end: s < 4 ? 'fork' : 'goal', left: nx && nx[0], right: nx && nx[1], prev, sec });
    segs.forEach((g, n) => { g.i = i0 + n; g.ox = ox; g.split2 = n < segs.length - 1 ? segs[n + 1].split : g.split; this.segs.push(g); });
    this.secs.push({ s, j, key, i0, n: segs.length, ox, fork: s < 4 ? i0 + segs.length - 140 : i0 + segs.length });
    const count = 24 + s * 9;
    for (let k = 0; k < count; k++) {
      const n = 70 + Math.floor(rnd(this.seed + sec * 97 + k * 3.3) * (segs.length - 270)), lane = Math.floor(rnd(this.seed + k * 5.1 + sec) * 3);
      this.cars.push({ z: (i0 + n) * SEG, x: ox + LANES[lane], lane, tx: LANES[lane], ox, v: MAXV * (0.3 + rnd(k * 7.7 + sec) * 0.2), kind: TRAFFIC[Math.floor(rnd(k * 2.9 + sec) * 4.99)], ci: k + sec, sec, lc: 2 + rnd(k) * 6 });
    }
  }
  start() { this.reset(); this.state = 'count'; this.count = 3.99; this.events.push('beep'); }
  flash(m, s = 1.4) { this.msg = m; this.msgT = s; }
  seg(z) { return this.segs[clamp(Math.floor(z / SEG), 0, this.segs.length - 1)]; }
  roadCenter(s, f) {
    const sp = s.split + (s.split2 - s.split) * f;
    if (sp <= 0) return [s.ox, 0];
    const b = this.branch[s.sec];
    return [s.ox + (b != null ? b : this.x < s.ox ? -1 : 1) * sp, sp];
  }
  update(dt, inp) {
    this.time += dt;
    if (this.msgT > 0 && (this.msgT -= dt) <= 0) this.msg = '';
    if (this.state === 'intro') { this.z += MAXV * 0.25 * dt; if (this.z > (this.segs.length - 400) * SEG) this.z = 0; this.bg += this.seg(this.z).curve * 0.25 * dt * 0.06; return; }
    if (this.state === 'count') { const c0 = Math.ceil(this.count); this.count -= dt; if (Math.ceil(this.count) < c0 && this.count > 0) this.events.push('beep'); if (this.count <= 0) { this.state = 'race'; this.events.push('go'); this.flash('Go', 0.8); } return; }
    const pz = this.z + PLAYER_Z, s = this.seg(pz), f = (pz % SEG) / SEG, [center, split] = this.roadCenter(s, f), xr = this.x - center, sp = this.v / MAXV;
    const racing = this.state === 'race';
    if (racing && (this.timer -= dt) <= 0) { this.timer = 0; this.state = 'over'; this.flash('Time up', 3); this.events.push('finish'); }
    // Fork: the road you're on when the two roads separate is your route.
    const sec = this.secs[s.sec];
    if (split > 1.05 && this.branch[s.sec] == null && sec.s < 4) {
      const b = this.x < s.ox ? -1 : 1; this.branch[s.sec] = b;
      const last = this.segs[sec.i0 + sec.n - 1];
      this.append(sec.s + 1, sec.j + (b > 0 ? 1 : 0), sec.key, sec.ox + b * last.split);
    }
    if (this.spin > 0) {
      this.spin -= dt; this.v = Math.max(0, this.v - BRK * 1.4 * dt);
      if (this.spin <= 0) { this.spin = 0; this.x = center + clamp(xr, -0.4, 0.4); }
    } else {
      const st = clamp(inp.steer || 0, -1, 1); this.steer += (st - this.steer) * Math.min(1, dt * 10);
      this.x += this.steer * STEER * dt * Math.min(1, sp * 2.5) - dt * sp * sp * s.curve * CENT;
      const off = Math.abs(xr) > 1.02, top = off ? MAXV * OFFMAX : MAXV;
      this.rough = off && sp > 0.05;
      this.brake = !!inp.brake && racing;
      if (!racing) this.v = Math.max(0, this.v - BRK * 0.5 * dt);
      else if (this.brake) this.v = Math.max(0, this.v - BRK * dt);
      else this.v += ACC * (1 - 0.5 * sp * sp) * dt;
      if (this.v > top) this.v -= (this.v - top) * (off ? 2.2 : 1) * dt;
      this.v = clamp(this.v, 0, MAXV);
      this.collide(s, center, split);
    }
    const dz = this.v * dt; this.z += dz; this.bg += s.curve * sp * dt * 0.06;
    if (racing) this.score += Math.round(dz * (0.4 + sp * 0.8));
    this.traffic(dt);
    // Checkpoints and the goal.
    for (const q of this.secs) {
      if (q.s > 0 && !this.cpDone[q.i0] && pz >= (q.i0 + 10) * SEG && racing) { this.cpDone[q.i0] = 1; this.timer += EXTEND[q.s]; this.flash(`Checkpoint · +${EXTEND[q.s]} s`, 1.8); this.events.push('cp'); }
      if (q.s === 4 && racing && pz >= (q.i0 + q.n - 100) * SEG) { this.state = 'goal'; this.events.push('finish'); this.flash('Goal', 2.5); this.finish(q.key); }
    }
    if (this.state === 'over' && this.v < 1 && !this.result && (this.endT += dt) > 1.2) this.finish(null);
  }
  collide(s, center, split) {
    const sp = this.v / MAXV;
    if (s.rail && (this.x - s.ox) * s.rail > 1.12) { this.x = s.ox + s.rail * 1.1; this.v *= 0.9; this.hit(false); }
    for (const g of [s, this.segs[s.i + 1]]) {
      if (!g) continue;
      for (const q of g.sprites) {
        let w = SOLID[q.kind], ox = g.ox + q.o;
        if (q.kind === 'arch') { if (Math.abs(Math.abs(this.x - g.ox) - 1.22) < 0.08) w = 0.05, ox = this.x; else continue; }
        if (!w || Math.abs(this.x - ox) > w + CAR) continue;
        if (sp > 0.22) this.crash(); else { this.v = 0; this.x += Math.sign(this.x - ox || 1) * 0.05; }
        return;
      }
    }
    for (const c of this.cars) {
      const dz = c.z - (this.z + PLAYER_Z);
      if (dz < -SEG * 0.6 || dz > SEG * 1.1 || Math.abs(c.x - this.x) > 0.34) continue;
      if (this.v - c.v > MAXV * 0.45) { this.crash(); c.v *= 1.1; return; }
      this.v = Math.min(this.v, c.v * 0.75); this.x += Math.sign(this.x - c.x || 1) * 0.12; this.hit(true);
      return;
    }
  }
  hit(car) { if (this.time - (this.lastHit || -9) > 0.6) { this.lastHit = this.time; this.events.push('thud'); if (car) this.flash('Bump', 0.6); } }
  crash() { this.spin = 1.5; this.events.push('thud'); this.flash('Crash', 1.2); }
  traffic(dt) {
    const pz = this.z + PLAYER_Z;
    this.cars = this.cars.filter(c => c.z > this.z - SEG * 10 && c.z < (this.secs[c.sec].fork - 6) * SEG);
    for (const c of this.cars) {
      c.z += c.v * dt;
      if ((c.lc -= dt) <= 0) { c.lc = 3 + rnd(c.z) * 6; c.lane = clamp(c.lane + (rnd(c.z * 1.3) < 0.5 ? -1 : 1), 0, 2); c.tx = LANES[c.lane]; }
      const gx = c.ox + c.tx; c.x += clamp(gx - c.x, -0.5 * dt, 0.5 * dt);
      if (Math.abs(c.z - pz) < SEG * 3 && Math.abs(c.x - this.x) < 0.3 && c.z > pz) c.v = Math.max(c.v, this.v * 0.6);
    }
  }
  finish(key) {
    const route = this.secs.filter(q => q.i0 * SEG <= this.z + PLAYER_Z + SEG).map(q => q.key), bonus = key ? Math.round(this.timer) * 100000 : 0, total = this.score + bonus;
    const b = bests(), prev = key ? b[key] || 0 : 0, newBest = !!key && total > prev;
    if (newBest) { b[key] = total; store.set('gt-best-v1', b); }
    let chNew = false;
    if (this.ch && key && route.includes(this.ch.key) && !this.chDone) { this.chDone = true; chNew = true; store.set(this.ch.id, 1); }
    this.result = { finish: key, name: key ? THEMES[key].name : null, score: this.score, bonus, total, route, newBest, best: key ? Math.max(prev, total) : null, chNew, chDone: this.chDone, timeLeft: this.timer };
  }
  draw(c, W, H) {
    const pz = this.z + PLAYER_Z, s = this.seg(pz), nx = this.segs[Math.min(this.segs.length - 1, s.i + 1)], f = (pz % SEG) / SEG, py = s.y + ((nx.sec === s.sec ? nx.y : s.y) - s.y) * f;
    const sp = this.v / MAXV, sand = THEMES[s.theme].gL[0];
    render(c, W, H, { segs: this.segs, z: this.z, x: this.x, camY: py + CAM_H, bg: this.bg, time: this.time, cars: this.cars,
      player: { steer: this.steer, brake: this.brake, speed: sp, rough: this.rough, dust: this.rough ? Math.min(1, sp * 3) : 0, dustCol: sand, spin: this.spin > 0 ? 1 : 0 } });
  }
  snap() {
    const s = this.seg(this.z + PLAYER_Z), sec = this.secs[s.sec];
    return { state: this.state, time: Math.ceil(this.timer), score: this.score, kmh: Math.round(this.v / MAXV * 293), stage: sec.s + 1, name: THEMES[sec.key].name, path: this.secs.filter(q => q.i0 <= s.i).map(q => [q.s, q.j]), msg: this.msg, count: Math.ceil(this.count), result: this.result, low: this.timer < 10 && this.state === 'race' };
  }
  audio() { const sp = this.v / MAXV, live = this.state !== 'intro'; return { rpm: live ? clamp(0.25 + sp * 0.75 - (sp > 0.55 ? 0.18 : 0), 0, 1) : 0.15, on: live, load: this.brake ? 0.3 : 1, slide: this.spin > 0 ? 0.8 : 0, rumble: this.rough ? Math.min(1, sp * 2) : 0 }; }
}

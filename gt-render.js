// Draws a GrandTour frame: sky and backdrop for the current theme (blended between sections), the road (two roads at a fork),
// roadside scenery, traffic and the player's coupe.
import { SEG, THEMES } from './gt-route.js';
import { drawScenery } from './gt-sprites.js';
import { drawCoupe, drawTraffic, drawArch, drawFork } from './gt-cars.js';

export const ROAD_W = 2400, CAM_H = 1100, PLAYER_Z = 1300;
const DEPTH = 1 / Math.tan(50 * Math.PI / 180), DRAW = 170, FOG = 3.4;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, t) { if (!b || t >= 1) return a; const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(B[i] + (v - B[i]) * Math.max(0, t)).toString(16).padStart(2, '0')).join(''); }
const rnd = s => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const ROAD = { day: ['#5a5d63', '#55585e'], dusk: ['#4f5158', '#4b4d54'], night: ['#30333b', '#2c2f37'] };

function pal(s) {
  if (s._p) return s._p;
  const T = THEMES[s.theme], P = s.prev ? THEMES[s.prev] : null, t = s.mix, m = (a, b) => (P ? mix(a, b, t) : a);
  const tod = P && t < 0.5 ? P.tod : T.tod, land = T.sea === 1 ? T.gL : T.gR;
  return (s._p = {
    gL: [0, 1].map(i => m(T.gL[i], P && P.gL[i])), gR: [0, 1].map(i => m(T.gR[i], P && P.gR[i])), land: [0, 1].map(i => m(land[i], P && (P.sea === 1 ? P.gL : P.gR)[i])),
    road: [0, 1].map(i => m(ROAD[T.tod][i], P && ROAD[P.tod][i])), fog: m(T.sky[2], P && P.sky[2]), night: tod === 'night', line: tod === 'night' ? '#d9dadf' : '#f4f4f4', fogK: (T.fog || 1)
  });
}
const pt = () => ({ world: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0 }, cz: 0 });
function proj(p, cx, cy, cz, W, H) { p.cz = p.world.z - cz; const sc = DEPTH / Math.max(0.1, p.cz), s = p.screen; s.x = Math.round(W / 2 + sc * (p.world.x - cx) * W / 2); s.y = Math.round(H / 2 - sc * (p.world.y - cy) * H / 2); s.w = Math.round(sc * ROAD_W * W / 2); }
function quad(c, x1, y1, w1, x2, y2, w2, o1, o2, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x1 + w1 * o1, y1); c.lineTo(x1 + w1 * o2, y1); c.lineTo(x2 + w2 * o2, y2); c.lineTo(x2 + w2 * o1, y2); c.closePath(); c.fill(); }

function layer(c, kind, col, W, H, hz, off, L, night, seed) {
  const span = W * 1.6, o = (((off * W) % span) + span) % span;
  c.fillStyle = col; c.beginPath();
  if (kind === 'city') {
    const n = 26, st = span / n;
    for (let k = -1; k <= 1; k++) for (let i = 0; i < n; i++) { const h = H * (0.05 + rnd(i * 3.1 + seed + L * 9) * (L ? 0.1 : 0.15)); c.rect(k * span + i * st - o, hz - h, st * 0.86, h + 2); }
    c.fill();
    if (night && L) { c.fillStyle = 'rgba(244,213,141,0.7)'; for (let k = -1; k <= 1; k++) for (let i = 0; i < 26; i++) for (let j = 0; j < 5; j++) if (rnd(i * 7 + j + seed) > 0.45) c.fillRect(k * span + i * span / 26 - o + span / 26 * (0.15 + (j % 2) * 0.4), hz - H * 0.02 - j * H * 0.016, 1.5, 1.5); }
    return;
  }
  const amp = { hills: L ? 0.05 : 0.08, forest: L ? 0.05 : 0.07, mountains: L ? 0.07 : 0.2, dunes: L ? 0.04 : 0.06, volcano: L ? 0.05 : 0.07, sea: L ? 0 : 0.035 }[kind] * H;
  c.moveTo(-10, hz + 2);
  for (let k = -1; k <= 1; k++) for (let i = 0; i <= 64; i++) {
    const u = i / 64, x = k * span + u * span - o, a = u * 6.283;
    let h = kind === 'forest' ? (0.55 + 0.45 * rnd(i * 1.7 + seed + L)) * (i % 2 ? 0.75 : 1) : kind === 'mountains' && !L ? Math.abs(((u * 5 + rnd(seed) * 3) % 1) - 0.5) * 2 * (0.6 + 0.4 * Math.sin(a * 2 + seed)) : 0.5 + 0.3 * Math.sin(a * 3 + seed + L) + 0.2 * Math.sin(a * 7 + seed * 2);
    if (kind === 'sea') h = u > 0.62 && u < 0.86 ? Math.sin((u - 0.62) / 0.24 * Math.PI) : 0;
    c.lineTo(x, hz - h * amp);
  }
  c.lineTo(W + 10, hz + 2); c.closePath(); c.fill();
  if (kind === 'mountains' && !L) { c.fillStyle = night ? '#9aa3b8' : '#f4f7fb'; for (let k = -1; k <= 1; k++) for (let i = 0; i < 5; i++) { const x = k * span + ((i + 0.5 - rnd(seed) * 3 + 3) % 5) / 5 * span - o; c.beginPath(); c.moveTo(x - amp * 0.18, hz - amp * 0.62); c.lineTo(x, hz - amp * (0.6 + 0.4 * Math.sin(((i + 0.5) / 5) * 12.566 + seed))); c.lineTo(x + amp * 0.18, hz - amp * 0.62); c.fill(); } }
  if (kind === 'volcano' && !L) { const x = ((W * 0.62 - o * 0.5) % span + span) % span - W * 0.2, h = H * 0.17; c.fillStyle = col; c.beginPath(); c.moveTo(x - h * 1.6, hz); c.lineTo(x - h * 0.18, hz - h); c.lineTo(x + h * 0.18, hz - h); c.lineTo(x + h * 1.6, hz); c.fill(); c.fillStyle = '#eef1f6'; c.beginPath(); c.moveTo(x - h * 0.42, hz - h * 0.74); c.lineTo(x - h * 0.18, hz - h); c.lineTo(x + h * 0.18, hz - h); c.lineTo(x + h * 0.42, hz - h * 0.74); c.fill(); }
}
function backdrop(c, W, H, s0, bg, time) {
  const T = THEMES[s0.theme], P = s0.prev ? THEMES[s0.prev] : null, t = s0.mix, sky = [0, 1, 2].map(i => (P ? mix(T.sky[i], P.sky[i], t) : T.sky[i])), night = pal(s0).night, hz = H * 0.5;
  const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, sky[0]); g.addColorStop(0.65, sky[1]); g.addColorStop(1, sky[2]);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const tod = night ? 'night' : (P && t < 0.5 ? P.tod : T.tod);
  if (night) { c.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 50; i++) c.fillRect(rnd(i * 3.1) * W, rnd(i * 5.7) * H * 0.32, 1, 1); c.fillStyle = '#f4f1e6'; c.beginPath(); c.arc(W * 0.78, H * 0.12, H * 0.025, 0, 6.283); c.fill(); }
  else {
    const sx = W * (tod === 'dusk' ? 0.5 : 0.72) - ((bg * 0.12 * W) % W), sy = tod === 'dusk' ? hz - H * 0.07 : H * 0.13, sr = H * (tod === 'dusk' ? 0.06 : 0.03), halo = c.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 5);
    halo.addColorStop(0, tod === 'dusk' ? 'rgba(255,190,120,0.6)' : 'rgba(255,255,240,0.5)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = halo; c.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10); c.fillStyle = tod === 'dusk' ? '#ffd29a' : '#fffdf0'; c.beginPath(); c.arc(sx, sy, sr, 0, 6.283); c.fill();
    c.fillStyle = tod === 'dusk' ? 'rgba(255,214,190,0.45)' : 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 6; i++) { const cx = ((rnd(i * 9.1) * W * 1.6 - bg * 0.3 * W - time * 4) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3, cy = H * (0.06 + rnd(i * 4.3) * 0.24), s = W * (0.05 + rnd(i * 2.2) * 0.06); for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(cx + (k - 1.5) * s * 0.8, cy + (k % 2) * s * 0.15, s * (0.7 + (k % 2) * 0.3), s * 0.42, 0, 0, 6.283); c.fill(); } }
  }
  const draw = (th, a) => { if (a <= 0.01) return; c.globalAlpha = a; layer(c, th.back, th.far, W, H, hz, bg * 0.25, 0, night, th.name.length); layer(c, th.back === 'sea' ? 'hills' : th.back, th.near, W, H, hz + 2, bg * 0.5, 1, night, th.name.length + 3); c.globalAlpha = 1; };
  if (P && P.back !== T.back) { draw(P, 1 - t); draw(T, t); } else draw(T, 1);
}

export function render(c, W, H, v) {
  const segs = v.segs, N = segs.length, i0 = Math.min(N - 2, Math.floor(v.z / SEG)), base = segs[i0], bp = (v.z % SEG) / SEG;
  backdrop(c, W, H, base, v.bg, v.time);
  let xc = 0, dx = -base.curve * bp, maxy = H; const vis = [], order = [];
  for (let n = 0; n < DRAW && i0 + n < N - 1; n++) {
    const i = i0 + n, s = segs[i], nx = segs[i + 1]; s.p1 = s.p1 || pt(); s.p2 = s.p2 || pt();
    s.p1.world.x = s.p2.world.x = s.ox * ROAD_W; s.p1.world.y = s.y; s.p2.world.y = nx.sec === s.sec ? nx.y : s.y; s.p1.world.z = i * SEG; s.p2.world.z = (i + 1) * SEG;
    proj(s.p1, v.x * ROAD_W - xc, v.camY, v.z, W, H); proj(s.p2, v.x * ROAD_W - xc - dx, v.camY, v.z, W, H);
    xc += dx; dx += s.curve; s.fogv = 1 / Math.exp((n / DRAW) ** 2 * FOG * pal(s).fogK); s.clip = maxy; s.behind = s.p1.cz <= DEPTH; order.push(s);
    if (s.behind || s.p2.screen.y >= s.p1.screen.y || s.p2.screen.y >= maxy) continue;
    vis.push(s); maxy = s.p2.screen.y;
  }
  for (let k = vis.length - 1; k >= 0; k--) {
    const s = vis[k], a = s.p1.screen, b = s.p2.screen, P = pal(s), alt = Math.floor(s.i / 3) % 2, sp1 = s.split, sp2 = s.split2;
    const roads = sp1 > 0 ? [-1, 1] : [0];
    c.fillStyle = P.gL[alt]; c.fillRect(0, b.y, W, a.y - b.y + 1);
    const L1 = a.x + a.w * (roads.length > 1 ? -sp1 : 0), L2 = b.x + b.w * (roads.length > 1 ? -sp2 : 0), R1 = a.x + a.w * (roads.length > 1 ? sp1 : 0), R2 = b.x + b.w * (roads.length > 1 ? sp2 : 0);
    c.fillStyle = P.gR[alt]; c.beginPath(); c.moveTo(R1, a.y); c.lineTo(W, a.y); c.lineTo(W, b.y); c.lineTo(R2, b.y); c.fill();
    if (roads.length > 1) { c.fillStyle = P.land[alt]; c.beginPath(); c.moveTo(L1, a.y); c.lineTo(R1, a.y); c.lineTo(R2, b.y); c.lineTo(L2, b.y); c.fill(); }
    for (const r of roads) {
      const x1 = a.x + a.w * r * sp1, x2 = b.x + b.w * r * sp2;
      const rc = ['#d3242c', '#f2f2f2'][Math.floor(s.i / 2) % 2];
      quad(c, x1, a.y, a.w, x2, b.y, b.w, -1.12, -1, rc); quad(c, x1, a.y, a.w, x2, b.y, b.w, 1, 1.12, rc);
      quad(c, x1, a.y, a.w, x2, b.y, b.w, -1, 1, P.road[s.i % 2]);
      quad(c, x1, a.y, a.w, x2, b.y, b.w, -0.97, -0.94, P.line); quad(c, x1, a.y, a.w, x2, b.y, b.w, 0.94, 0.97, P.line);
      if (alt) for (const l of [-0.333, 0.333]) quad(c, x1, a.y, a.w, x2, b.y, b.w, l - 0.012, l + 0.012, P.line);
    }
    const f = 1 - s.fogv; if (f > 0.02) { c.globalAlpha = Math.min(0.92, f); c.fillStyle = P.fog; c.fillRect(0, b.y, W, a.y - b.y + 1); c.globalAlpha = 1; }
  }
  const bucket = new Map();
  for (const car of v.cars) { const i = Math.floor(car.z / SEG); if (i >= i0 && i < i0 + DRAW) { if (!bucket.has(i)) bucket.set(i, []); bucket.get(i).push(car); } }
  for (let k = order.length - 1; k >= 0; k--) {
    const s = order[k]; if (s.behind) continue;
    const a = s.p1.screen, b = s.p2.screen, night = pal(s).night, clip = s.clip < H;
    if (clip) { c.save(); c.beginPath(); c.rect(0, 0, W, s.clip); c.clip(); }
    c.globalAlpha = Math.min(1, s.fogv * 1.3);
    if (s.rail && b.y < a.y) { const x1 = a.x + a.w * s.rail * 1.2, x2 = b.x + b.w * s.rail * 1.2, h1 = a.w * 0.07, h2 = b.w * 0.07; c.fillStyle = night ? '#6a6f78' : '#c9ccd1'; c.beginPath(); c.moveTo(x1, a.y - h1 * 0.35); c.lineTo(x2, b.y - h2 * 0.35); c.lineTo(x2, b.y - h2); c.lineTo(x1, a.y - h1); c.fill(); if (s.i % 4 === 0) { c.fillStyle = '#7d828a'; c.fillRect(x1 - Math.max(0.5, a.w * 0.006), a.y - h1, Math.max(1, a.w * 0.012), h1); } }
    for (const sp of s.sprites) {
      const x = a.x + a.w * sp.o;
      if (sp.kind === 'arch') drawArch(c, x, a.y, a.w, sp.text, sp.goal, night);
      else if (sp.kind === 'fork') drawFork(c, x, a.y, a.w, sp.left, sp.right, night);
      else drawScenery(c, sp, x, a.y, a.w, night, v.time);
    }
    const cs = bucket.get(s.i);
    if (cs) cs.sort((p, q) => q.z - p.z).forEach(car => { const f = (car.z % SEG) / SEG, cx = a.x + (b.x - a.x) * f, cy = a.y + (b.y - a.y) * f, cw = a.w + (b.w - a.w) * f; drawTraffic(c, cx + cw * (car.x - s.ox), cy, Math.min(240, cw * 0.36), car.kind, car.ci, night); });
    c.globalAlpha = 1;
    if (clip) c.restore();
  }
  const p = v.player, cw = Math.min(W * 0.34, H * 0.45), bob = p.speed > 0.05 ? Math.sin(v.time * 40) * 0.6 : 0;
  c.save(); c.translate(W / 2, H - H * 0.03 + bob + (p.rough ? Math.sin(v.time * 70) * 1.8 : 0));
  if (p.dust > 0) { c.fillStyle = p.dustCol; for (let i = 0; i < 6; i++) { const age = ((v.time * 2.4) + i / 6) % 1; c.globalAlpha = (1 - age) * 0.5 * p.dust; c.beginPath(); c.arc((i % 2 ? 1 : -1) * cw * (0.42 + age * 0.3), -cw * 0.04 + age * 30, cw * (0.07 + age * 0.2), 0, 6.283); c.fill(); } c.globalAlpha = 1; }
  if (p.spin) c.rotate(Math.sin(v.time * 18) * 0.12 * p.spin);
  drawCoupe(c, cw, p.spin ? Math.sin(v.time * 22) : p.steer, p.brake, pal(base).night);
  c.restore();
}

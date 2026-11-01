// Builds a pseudo-3D road from a real circuit outline (rw-tracks.js): curvature from the GPS trace, gentle hills,
// kerbs, gravel, walls, grid boxes and scenery placed by corner.
import { trackData } from './rw-tracks.js';

export const SEG = 200, ROAD_W = 2000, CAM_H = 1000;
const REVERSE = new Set(['marina_bay', 'ricard']); // traces stored against the race direction
const STREET = new Set(['monaco', 'marina_bay', 'baku', 'vegas', 'jeddah', 'miami', 'madring']);
const DESERT = new Set(['bahrain', 'losail', 'yas_marina']);
const HILLS = { spa: 1, portimao: 1, red_bull_ring: 0.9, mugello: 0.8, interlagos: 0.7, americas: 0.7, suzuka: 0.6, imola: 0.6, zandvoort: 0.6, nurburgring: 0.6, istanbul: 0.6, catalunya: 0.5, monaco: 0.5, hungaroring: 0.4, rodriguez: 0.3, sepang: 0.3, bahrain: 0.3, baku: 0.25 };
export const K_CURVE = 30, MAX_CURVE = 9, GRID_SP = 1.2;
export const gridD = k => (-(k + 1) * GRID_SP + 0.3) * SEG; // grid slot k sits this far behind the line
export const rnd = s => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const hashStr = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100003, 7);
const pt = (z, y) => ({ world: { x: 0, y, z }, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0, scale: 0 } });

function outline(id) {
  const t = trackData(id);
  if (!t) {
    const P = [];
    for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; P.push([50 + 40 * Math.cos(a) + 6 * Math.cos(2 * a), 50 + 26 * Math.sin(a)]); }
    return { P, w: 100, h: 80 };
  }
  let P = t[2].replace(/[MZ]/g, '').split('L').map(s => s.trim().split(' ').map(Number));
  if (REVERSE.has(id)) P = [P[0], ...P.slice(1).reverse()];
  return { P, w: t[0], h: t[1] };
}

export function buildTrack(id, km) {
  const o = outline(id), P = o.P, n = P.length, cum = [0];
  for (let i = 1; i <= n; i++) { const a = P[i - 1], b = P[i % n]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const Lb = cum[n], N = Math.max(320, Math.min(1000, Math.round((km || 5) * 125)));
  const Q = [];
  for (let i = 0, j = 0; i < N; i++) {
    const d = i * Lb / N;
    while (cum[j + 1] < d) j++;
    const a = P[j], b = P[(j + 1) % n], t = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    Q.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  const hd = Q.map((q, i) => { const r = Q[(i + 1) % N]; return Math.atan2(r[1] - q[1], r[0] - q[0]); });
  let dh = hd.map((h, i) => { let d = hd[(i + 1) % N] - h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; });
  for (let pass = 0; pass < 3; pass++) dh = dh.map((_, i) => { let s = 0; for (let k = -3; k <= 3; k++) s += dh[(i + k + N) % N]; return s / 7; });
  const c = dh.map(d => Math.max(-MAX_CURVE, Math.min(MAX_CURVE, d * K_CURVE)));

  const env = STREET.has(id) ? 'street' : DESERT.has(id) ? 'desert' : 'park', seed = hashStr(id);
  const amp = (HILLS[id] ?? (env === 'park' ? 0.2 : 0)) * 2600, ph = [1, 2, 3, 4].map(k => rnd(seed + k) * 6.283);
  const y = Array.from({ length: N }, (_, i) => { const a = i / N * 6.283; return amp * (0.45 * Math.sin(a + ph[0]) + 0.3 * Math.sin(2 * a + ph[1]) + 0.15 * Math.sin(3 * a + ph[2]) + 0.1 * Math.sin(5 * a + ph[3])); });
  const segs = c.map((cv, i) => ({ i, curve: cv, p1: pt(i * SEG, y[i]), p2: pt((i + 1) * SEG, y[(i + 1) % N]), sprites: [], kL: 0, kR: 0, gL: 0, gR: 0, wL: 0, wR: 0, grid: 0, clip: 0, fog: 1 }));
  const at = i => segs[((i % N) + N) % N];
  let area = 0; for (let i = 0; i < N; i++) { const p = Q[i], q = Q[(i + 1) % N]; area += p[0] * q[1] - q[0] * p[1]; }
  const pitSide = area > 0 ? 1 : -1; // pits sit inside the loop

  segs.forEach((s, i) => {
    const a = Math.abs(s.curve), inR = s.curve > 0;
    if (a > 2.2) inR ? (s.kR = 1) : (s.kL = 1);
    if (a > 4.5) inR ? (s.kL = 1) : (s.kR = 1);
    if (env !== 'street' && a > 3.2) for (let k = 0; k < 7; k++) inR ? (at(i + k).gL = 1) : (at(i + k).gR = 1);
    if (env === 'street') s.wL = s.wR = 1;
  });
  const corners = [];
  for (let i = 0; i < N; i++) {
    if (Math.abs(c[i]) > 3.5 && Math.abs(c[(i - 1 + N) % N]) <= 3.5) {
      let k = i, peak = i;
      while (Math.abs(c[k % N]) > 3.5 && k < i + N) { if (Math.abs(c[k % N]) > Math.abs(c[peak % N])) peak = k; k++; }
      corners.push({ s: i, apex: peak % N, dir: Math.sign(c[peak % N]), sev: Math.abs(c[peak % N]) });
    }
  }
  const busy = new Set(), add = (i, kind, off, extra) => { at(i).sprites.push({ kind, o: off, ...extra }); busy.add(((i % N) + N) % N); };
  const wallO = 1.36;
  // Main straight: pit wall + garages on the pit side, grandstand opposite, start gantry, grid boxes.
  for (let i = -70; i < 26; i++) { const s = at(i); pitSide > 0 ? (s.wR = 2) : (s.wL = 2); }
  for (let i = -66; i < 22; i += 4) add(i, 'pit', pitSide * 2.5);
  for (let i = -48; i < 18; i += 3) add(i, 'stand', -pitSide * (env === 'street' ? 1.8 : 2.3), { big: 1 });
  add(0, 'gantry', 0);
  for (let k = 0; k < 24; k++) { const p = gridD(k) / SEG + 0.5, i = Math.floor(p), s = at(i); s.grid = k % 2 ? 1 : -1; s.gf = p - i; }
  // Corners: brake boards before the big stops, grandstands and tyre walls on the outside.
  corners.forEach(cn => {
    if (cn.sev > 5.5) [1, 2, 3].forEach(b => add(cn.s - b * 10, 'board', -cn.dir * (env === 'street' ? 1.42 : 1.6), { n: b }));
    if (env !== 'street') for (let k = -2; k < 8; k += 2) add(cn.apex + k, 'tyres', -cn.dir * 2.5);
  });
  [...corners].sort((a, b) => b.sev - a.sev).slice(0, 4).forEach(cn => {
    for (let k = -3; k < 10; k += 3) add(cn.apex + k, 'stand', -cn.dir * (env === 'street' ? 1.8 : 3.0));
  });
  for (let i = 0; i < N; i++) {
    if (busy.has(i)) continue;
    const r = rnd(seed + i * 7.31), side = rnd(seed + i * 3.17) > 0.5 ? 1 : -1;
    if (env === 'street') {
      if (i % 2 === 0) add(i, 'building', side * (1.95 + r * 0.9), { h: 0.8 + rnd(i * 1.7 + seed) * 2.2, tone: rnd(i * 2.9) });
      if (i % 14 === 0) add(i, 'banner', -side * 1.37);
    } else if (env === 'desert') {
      if (i % 5 === 0 && r > 0.55) add(i, 'palm', side * (2.7 + r * 3));
      else if (i % 4 === 0 && r < 0.3) add(i, 'shrub', side * (2.2 + r * 6));
      if (i % 32 === 0 && Math.abs(c[i]) < 1.5) add(i, 'banner', side * 1.75);
    } else {
      if (i % 3 === 0 && r > 0.3) add(i, 'tree', side * (2.5 + r * 3.2), { h: 0.8 + rnd(i * 5.1) * 0.6 });
      if (i % 7 === 0 && r < 0.25) add(i, 'tree', -side * (3.2 + r * 4), { h: 1 + r });
      if (i % 30 === 0 && Math.abs(c[i]) < 1.5) add(i, 'banner', side * 1.75);
    }
  }
  const lapSec = N / 17;
  return {
    id, N, L: N * SEG, segs, corners, env, pitSide, wallO, Q, box: [o.w, o.h],
    laps: Math.max(2, Math.min(4, Math.round(110 / lapSec))),
    lights: i => i % 8 === 0 ? ((i / 8) % 2 ? 1 : -1) : 0
  };
}

export const segAt = (t, z) => t.segs[Math.floor((((z % t.L) + t.L) % t.L) / SEG) % t.N];

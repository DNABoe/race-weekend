// Turns a real circuit outline (rw-tracks.js) into a top-down world: centreline, racing line, speed profile,
// run-off and barriers, pit lane, grid slots, DRS gates, kerbs and gravel.
import { trackData } from './rw-tracks.js';

export const WS = 20, TW = 72, DS = 4, BRAKE_RATIO = 1.35;
const REVERSE = new Set(['marina_bay', 'ricard']);
const STREET = new Set(['monaco', 'marina_bay', 'baku', 'vegas', 'jeddah', 'miami', 'madring']);
const DESERT = new Set(['bahrain', 'losail', 'yas_marina']);
export const rnd = s => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
export const hashStr = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100003, 7);
const F = n => new Float32Array(n);
export const wrapI = (i, N) => ((i % N) + N) % N;

function outline(id) {
  const t = trackData(id);
  if (!t) return Array.from({ length: 90 }, (_, i) => { const a = i / 90 * Math.PI * 2; return [50 + 42 * Math.cos(a) + 5 * Math.cos(2 * a), 36 + 26 * Math.sin(a)]; });
  let P = t[2].replace(/[MZ]/g, '').split('L').map(s => s.trim().split(/\s+/).map(Number)).filter(p => p.length === 2 && p.every(Number.isFinite));
  if (REVERSE.has(id)) P = [P[0], ...P.slice(1).reverse()];
  return P;
}
function smoothLoop(a, r, passes) {
  const N = a.length; let src = a;
  for (let p = 0; p < passes; p++) {
    const out = F(N); let s = 0;
    for (let k = -r; k <= r; k++) s += src[wrapI(k, N)];
    for (let i = 0; i < N; i++) { out[i] = s / (2 * r + 1); s += src[wrapI(i + r + 1, N)] - src[wrapI(i - r, N)]; }
    src = out;
  }
  return src;
}
function runMin(a, r) { const N = a.length, o = F(N); for (let i = 0; i < N; i++) { let m = 1e9; for (let k = -r; k <= r; k++) m = Math.min(m, a[wrapI(i + k, N)]); o[i] = m; } return o; }
function resample(X, Y, N) {
  const n = X.length, cum = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) { const a = i - 1, b = i % n; cum[i] = cum[i - 1] + Math.hypot(X[b] - X[a], Y[b] - Y[a]); }
  const L = cum[n], RX = F(N), RY = F(N);
  for (let i = 0, j = 0; i < N; i++) { const d = i * L / N; while (j < n - 1 && cum[j + 1] < d) j++; const b = (j + 1) % n, f = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1); RX[i] = X[j] + (X[b] - X[j]) * f; RY[i] = Y[j] + (Y[b] - Y[j]) * f; }
  return [RX, RY];
}
function curvature(X, Y, ds, w) {
  const N = X.length, d = F(N), K = F(N);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, h = (i + 2) % N;
    let v = Math.atan2(Y[h] - Y[j], X[h] - X[j]) - Math.atan2(Y[j] - Y[i], X[j] - X[i]);
    while (v > Math.PI) v -= 2 * Math.PI; while (v < -Math.PI) v += 2 * Math.PI; d[j] = v;
  }
  for (let i = 0; i < N; i++) { let s = 0; for (let k = -w; k <= w; k++) s += d[wrapI(i + k, N)]; K[i] = s / ((2 * w + 1) * ds); }
  return K; // signed: > 0 turns toward +normal (right-hand corner on screen)
}
function runs(N, start, ok) {
  const out = []; let st = -1;
  for (let k = 0; k <= N; k++) { const good = k < N && ok((start + k) % N); if (good && st < 0) st = k; if (!good && st >= 0) { out.push([(start + st) % N, k - st]); st = -1; } }
  return out;
}

export function buildCircuit(id) {
  const P = outline(id);
  let X = F(P.length), Y = F(P.length), L0 = 0;
  P.forEach((p, i) => { X[i] = p[0] * WS; Y[i] = p[1] * WS; });
  for (let i = 0; i < P.length; i++) { const j = (i + 1) % P.length; L0 += Math.hypot(X[j] - X[i], Y[j] - Y[i]); }
  const N = Math.max(240, Math.round(L0 / DS));
  [X, Y] = resample(X, Y, N);
  X = smoothLoop(X, 3, 2); Y = smoothLoop(Y, 3, 2);
  // The outline is real but the track is drawn much wider, so open up any corner tighter than the width allows.
  for (let it = 0; it < 400; it++) {
    const k = curvature(X, Y, L0 / N, 2), mark = new Uint8Array(N); let bad = 0;
    for (let i = 0; i < N; i++) if (Math.abs(k[i]) > 1 / 54) { bad++; for (let q = -4; q <= 4; q++) mark[wrapI(i + q, N)] = 1; }
    if (!bad) break;
    const nx = X.slice(), ny = Y.slice();
    for (let i = 0; i < N; i++) if (mark[i]) { const a = wrapI(i - 1, N), b = (i + 1) % N; nx[i] = (X[a] + X[i] * 2 + X[b]) / 4; ny[i] = (Y[a] + Y[i] * 2 + Y[b]) / 4; }
    X = nx; Y = ny;
    if (it % 20 === 19) [X, Y] = resample(X, Y, N);
  }
  [X, Y] = resample(X, Y, N);
  let L = 0; for (let i = 0; i < N; i++) { const j = (i + 1) % N; L += Math.hypot(X[j] - X[i], Y[j] - Y[i]); }
  const ds = L / N, TX = F(N), TY = F(N), NX = F(N), NY = F(N);
  for (let i = 0; i < N; i++) { const j = (i + 1) % N, h = wrapI(i - 1, N), dx = X[j] - X[h], dy = Y[j] - Y[h], l = Math.hypot(dx, dy) || 1; TX[i] = dx / l; TY[i] = dy / l; NX[i] = -TY[i]; NY[i] = TX[i]; }
  const K = curvature(X, Y, ds, 4);
  let area = 0; for (let i = 0; i < N; i++) { const j = (i + 1) % N; area += X[i] * Y[j] - X[j] * Y[i]; }
  const env = STREET.has(id) ? 'street' : DESERT.has(id) ? 'desert' : 'park', RUN = env === 'street' ? 12 : 58;

  // Clearance to other parts of the lap on each side (0 = left/-normal, 1 = right/+normal), so run-off never overlaps another section.
  const clr = [F(N).fill(1e4), F(N).fill(1e4)], EX = Math.round(150 / ds);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j += 2) {
    let g = Math.abs(i - j); g = Math.min(g, N - g); if (g < EX) continue;
    const dx = X[j] - X[i], dy = Y[j] - Y[i], d2 = dx * dx + dy * dy; if (d2 > 160000) continue;
    const s = dx * NX[i] + dy * NY[i] > 0 ? 1 : 0, d = Math.sqrt(d2); if (d < clr[s][i]) clr[s][i] = d;
  }
  const wall = [F(N), F(N)], vis = [new Uint8Array(N), new Uint8Array(N)];
  for (const s of [0, 1]) {
    const c = runMin(clr[s], 10);
    for (let i = 0; i < N; i++) { wall[s][i] = TW / 2 + Math.max(8, Math.min(RUN, (c[i] - TW) / 2 - 6)); vis[s][i] = c[i] > TW + 24 ? 1 : 0; }
    wall[s] = smoothLoop(wall[s], 4, 2);
  }
  const KS = curvature(X, Y, ds, 6);
  for (let i = 0; i < N; i++) { const s = KS[i] > 0 ? 1 : 0; wall[s][i] = Math.min(wall[s][i], Math.max(TW / 2 + 8, 0.85 / Math.max(1e-6, Math.abs(KS[i])))); }

  // Pit lane on the straightest stretch around the start line, on whichever side has room (inside of the loop by preference).
  let pw = null;
  for (const lf of [0.11, 0.08]) {
    const ln = Math.round(lf * N);
    for (let s = -Math.round(0.13 * N); s <= Math.round(0.02 * N); s += 2) {
      let mk = 0; for (let k = 0; k <= ln; k += 2) mk = Math.max(mk, Math.abs(K[wrapI(s + k, N)]));
      const score = mk * 1000 + Math.abs(s + 0.06 * N) / N * 2;
      if (!pw || score < pw.score) pw = { score, s, ln, mk };
    }
    if (pw.mk < 1 / 130) break;
  }
  const len = pw.ln, a = wrapI(pw.s, N), ramp = Math.round(0.025 * N), ins = area > 0 ? 1 : 0;
  const room = [1e9, 1e9]; for (let k = 0; k <= len; k++) for (const s of [0, 1]) room[s] = Math.min(room[s], clr[s][(a + k) % N]);
  const ps = room[ins] >= 230 || room[ins] >= room[1 - ins] ? ins : 1 - ins, side = ps ? 1 : -1, PO = TW / 2 + 28;
  for (let k = ramp; k <= len - ramp; k++) { const i = (a + k) % N; wall[ps][i] = TW / 2 + 8; vis[ps][i] = 2; }
  const pit = {
    a, len, ramp, side, PO, PW: 26,
    off: rel => { const u = rel < ramp ? rel / ramp : rel > len - ramp ? (len - rel) / ramp : 1, e = Math.max(0, Math.min(1, u)); return side * (TW / 2 - 12 + (PO - TW / 2 + 12) * e * e * (3 - 2 * e)); },
    boxes: Array.from({ length: 5 }, (_, k) => ramp + 10 + Math.round(k * (len - 2 * ramp - 20) / 4))
  };
  const relPit = i => wrapI(i - a, N);

  // Corners, kerbs and gravel traps.
  let iMin = 0, iMax = 0; for (let i = 0; i < N; i++) { if (Math.abs(K[i]) < Math.abs(K[iMin])) iMin = i; if (Math.abs(K[i]) > Math.abs(K[iMax])) iMax = i; }
  const corners = runs(N, iMin, i => Math.abs(K[i]) > 1 / 350).map(([s, l]) => {
    let ap = s; for (let m = 0; m < l; m++) { const i = (s + m) % N; if (Math.abs(K[i]) > Math.abs(K[ap])) ap = i; }
    return { s, l, ap, dir: Math.sign(K[ap]), k: Math.abs(K[ap]) };
  });
  const kerb = new Uint8Array(N), grav = new Uint8Array(N), bit = d => (d > 0 ? 2 : 1);
  corners.forEach(c => {
    const apRel = wrapI(c.ap - c.s, N);
    for (let m = -2; m <= c.l + 2; m++) kerb[wrapI(c.s + m, N)] |= bit(c.dir);
    if (c.k > 1 / 220) for (let m = apRel; m <= c.l + 8; m++) kerb[wrapI(c.s + m, N)] |= bit(-c.dir);
    if (env !== 'street' && c.k > 1 / 240) for (let m = apRel - 8; m <= c.l + 16; m++) grav[wrapI(c.s + m, N)] |= bit(-c.dir);
  });

  // DRS gates on the two longest straights away from the pit straight.
  const pick = th => runs(N, iMax, i => Math.abs(K[i]) < th).filter(([s, l]) => l >= 45 && relPit(s + Math.round(l * 0.3)) > len).sort((p, q) => q[1] - p[1]).slice(0, 2).map(([s, l]) => (s + Math.round(l * 0.3)) % N);
  let drs = pick(1 / 900); if (!drs.length) drs = pick(1 / 500);

  const grid = Array.from({ length: 5 }, (_, k) => ({ i: wrapI(-Math.round((22 + k * 36) / ds), N), off: (k % 2 ? 1 : -1) * TW * 0.22 }));
  const stands = [{ i: (a + ramp) % N, n: len - 2 * ramp, side: -side }];
  [...corners].sort((p, q) => q.k - p.k).slice(0, 3).forEach(c => stands.push({ i: wrapI(c.ap - 14, N), n: 30, side: -c.dir }));

  // Racing line: repeatedly smooth the path and clamp it inside the track, then a grip-normalised speed profile.
  const lim = TW / 2 - 11; let o = F(N);
  for (let it = 0; it < 4; it++) {
    let qx = F(N), qy = F(N);
    for (let i = 0; i < N; i++) { qx[i] = X[i] + NX[i] * o[i]; qy[i] = Y[i] + NY[i] * o[i]; }
    qx = smoothLoop(qx, 12, 3); qy = smoothLoop(qy, 12, 3);
    for (let i = 0; i < N; i++) o[i] = Math.max(-lim, Math.min(lim, (qx[i] - X[i]) * NX[i] + (qy[i] - Y[i]) * NY[i]));
  }
  o = smoothLoop(o, 3, 2);
  const QX = F(N), QY = F(N); for (let i = 0; i < N; i++) { QX[i] = X[i] + NX[i] * o[i]; QY[i] = Y[i] + NY[i] * o[i]; }
  const KQ = curvature(QX, QY, ds, 3), vu = F(N);
  for (let i = 0; i < N; i++) vu[i] = Math.min(60, 1 / Math.sqrt(Math.max(Math.abs(KQ[i]), 1e-6)));
  for (let p = 0; p < 2; p++) for (let i = N - 1; i >= 0; i--) { const nx = vu[(i + 1) % N]; vu[i] = Math.min(vu[i], Math.sqrt(nx * nx + 2 * BRAKE_RATIO * ds)); }

  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < N; i++) for (const s of [0, 1]) {
    const w = wall[s][i] + 80, sg = s ? 1 : -1, x = X[i] + NX[i] * w * sg, y = Y[i] + NY[i] * w * sg;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { id, env, N, ds, L, X, Y, TX, TY, NX, NY, K, ao: o, QX, QY, vu, clr, wall, vis, kerb, grav, corners, pit, relPit, drs, grid, stands, bbox: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}

export function at(t, fi, off) {
  const N = t.N, i = Math.floor(fi), f = fi - i, a = wrapI(i, N), b = (a + 1) % N;
  const x = t.X[a] + (t.X[b] - t.X[a]) * f, y = t.Y[a] + (t.Y[b] - t.Y[a]) * f, nx = t.NX[a] + (t.NX[b] - t.NX[a]) * f, ny = t.NY[a] + (t.NY[b] - t.NY[a]) * f;
  return [x + nx * off, y + ny * off, Math.atan2(t.TY[a] + (t.TY[b] - t.TY[a]) * f, t.TX[a] + (t.TX[b] - t.TX[a]) * f)];
}

// Nearest centreline position, searched around the car's previous index so overlapping sections never get confused.
export function locate(t, x, y, i0, out) {
  const N = t.N, X = t.X, Y = t.Y; let bi = i0, bd = 1e18;
  for (let k = -9; k <= 9; k++) { const i = wrapI(i0 + k, N), dx = x - X[i], dy = y - Y[i], d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
  if (bd > 40000) for (let i = 0; i < N; i++) { const dx = x - X[i], dy = y - Y[i], d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
  let j = (bi + 1) % N, ex = X[j] - X[bi], ey = Y[j] - Y[bi], f = ((x - X[bi]) * ex + (y - Y[bi]) * ey) / (ex * ex + ey * ey || 1);
  if (f < 0) { j = bi; bi = wrapI(bi - 1, N); ex = X[j] - X[bi]; ey = Y[j] - Y[bi]; f = ((x - X[bi]) * ex + (y - Y[bi]) * ey) / (ex * ex + ey * ey || 1); }
  f = Math.max(0, Math.min(1, f));
  const nx = t.NX[bi] + (t.NX[j] - t.NX[bi]) * f, ny = t.NY[bi] + (t.NY[j] - t.NY[bi]) * f;
  out.i = bi; out.f = f; out.off = (x - X[bi] - ex * f) * nx + (y - Y[bi] - ey * f) * ny; out.nx = nx; out.ny = ny;
  return out;
}

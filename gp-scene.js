// Bakes the static aerial view of a circuit into one canvas: ground, run-off, gravel, asphalt, kerbs, grid,
// pit lane and garages, barriers, grandstands and trees or city blocks. Shadows fall to the lower right.
import { TW, rnd, hashStr, wrapI, at } from './gp-track.js';

const CROWD = ['#d64b3b', '#f2f2f2', '#2f5fa8', '#f2c14e', '#26282c', '#e88a3a', '#6aa84f', '#c7c9cc'];
const ROOF = ['#c9c4bb', '#b7bcc2', '#d8d2c6', '#a9b0b8', '#c2b8a8', '#9da3aa'];
const GROUND = { park: ['#5b8f3d', '#64993f', '#6a9e46'], desert: ['#d8c39a', '#cfb98e', '#8f9297'], street: ['#a3a6ab', '#9a9da2', '#b9bbbf'] };
export const SUN = [4, 5];

export function makeCanvas(w, h) { if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return new OffscreenCanvas(w, h); }
function trace(ctx, t, i0, n, off) { for (let k = 0; k <= n; k++) { const i = wrapI(i0 + k, t.N), o = off(i, k); const x = t.X[i] + t.NX[i] * o, y = t.Y[i] + t.NY[i] * o; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }
function band(ctx, t, i0, n, inner, outer) {
  ctx.beginPath(); trace(ctx, t, i0, n, inner);
  for (let k = n; k >= 0; k--) { const i = wrapI(i0 + k, t.N), o = outer(i, k); ctx.lineTo(t.X[i] + t.NX[i] * o, t.Y[i] + t.NY[i] * o); }
  ctx.closePath();
}
function loop(ctx, t, o) { ctx.beginPath(); trace(ctx, t, 0, t.N - 1, () => o); ctx.closePath(); }
function segs(N, ok) {
  let s0 = 0; while (s0 < N && ok(s0)) s0++;
  if (s0 === N) return [[0, N]];
  const out = []; let st = -1;
  for (let k = 1; k <= N; k++) { const i = (s0 + k) % N, g = ok(i); if (g && st < 0) st = i; if (!g && st >= 0) { out.push([st, wrapI(i - st, N)]); st = -1; } }
  return out;
}
const disc = (ctx, x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); };

export function bakeScene(t, maxPx = 2900) {
  const b = t.bbox, S = Math.min(1.3, maxPx / Math.max(b.w, b.h)), cv = makeCanvas(Math.ceil(b.w * S), Math.ceil(b.h * S)), ctx = cv.getContext('2d');
  const env = t.env, G = GROUND[env], seed = hashStr(t.id), N = t.N, p = t.pit;
  ctx.setTransform(S, 0, 0, S, -b.x * S, -b.y * S); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = G[0]; ctx.fillRect(b.x, b.y, b.w, b.h);
  if (env === 'park') { ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate(0.62); ctx.fillStyle = G[1]; const R = Math.hypot(b.w, b.h) / 2; for (let x = -R; x < R; x += 64) ctx.fillRect(x, -R, 32, 2 * R); ctx.restore(); }
  ctx.fillStyle = env === 'park' ? 'rgba(20,40,10,0.06)' : 'rgba(80,64,40,0.05)';
  for (let k = 0; k < 240; k++) { ctx.beginPath(); ctx.ellipse(b.x + rnd(seed + k) * b.w, b.y + rnd(seed + k * 1.7) * b.h, 30 + rnd(k * 3.1) * 90, 20 + rnd(k * 5.3) * 60, rnd(k) * 3, 0, 6.283); ctx.fill(); }

  const C = 16, gw = Math.ceil(b.w / C), gh = Math.ceil(b.h / C), occ = new Uint8Array(gw * gh);
  const mark = (x, y, r) => { for (let yy = Math.max(0, Math.floor((y - r - b.y) / C)); yy <= Math.min(gh - 1, Math.floor((y + r - b.y) / C)); yy++) for (let xx = Math.max(0, Math.floor((x - r - b.x) / C)); xx <= Math.min(gw - 1, Math.floor((x + r - b.x) / C)); xx++) { const dx = b.x + (xx + 0.5) * C - x, dy = b.y + (yy + 0.5) * C - y; if (dx * dx + dy * dy <= (r + C) * (r + C)) occ[yy * gw + xx] = 1; } };
  const free = (x, y) => { const xx = Math.floor((x - b.x) / C), yy = Math.floor((y - b.y) / C); return xx >= 0 && yy >= 0 && xx < gw && yy < gh && !occ[yy * gw + xx]; };
  for (let i = 0; i < N; i += 2) mark(t.X[i], t.Y[i], Math.max(t.wall[0][i], t.wall[1][i]) + 14);
  for (let k = 0; k <= p.len; k += 3) { const [x, y] = at(t, p.a + k, p.side * (p.PO + 20)); mark(x, y, 46); }

  ctx.strokeStyle = G[2]; ctx.lineWidth = TW + (env === 'park' ? 34 : env === 'desert' ? 64 : 22); loop(ctx, t, 0); ctx.stroke();
  for (const s of [0, 1]) {
    const sg = s ? 1 : -1, bv = s ? 2 : 1;
    for (const [i0, n] of segs(N, i => (t.grav[i] & bv) > 0)) {
      const outer = i => sg * Math.max(TW / 2 + 6, Math.min(t.wall[s][i] - 4, TW / 2 + 52));
      band(ctx, t, i0, n, () => sg * (TW / 2 + 5), outer); ctx.fillStyle = '#dcc9a0'; ctx.fill();
      ctx.fillStyle = 'rgba(150,128,90,0.45)';
      for (let k = 0; k < n; k++) for (let q = 0; q < 5; q++) { const i = wrapI(i0 + k, N), u = rnd(seed + i * 5.1 + q), o = sg * (TW / 2 + 6) + (outer(i) - sg * (TW / 2 + 6)) * u, [x, y] = at(t, i + rnd(i + q * 3.3), o); ctx.fillRect(x, y, 1.1, 1.1); }
    }
  }
  // Pit lane under the track so the entry and exit blend in, garages behind it.
  ctx.strokeStyle = '#56595f'; ctx.lineWidth = p.PW; ctx.beginPath(); trace(ctx, t, p.a, p.len, (i, k) => p.off(k)); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.2;
  for (const e of [-1, 1]) { ctx.beginPath(); trace(ctx, t, p.a + p.ramp, p.len - 2 * p.ramp, (i, k) => p.off(k + p.ramp) + e * p.side * (p.PW / 2 - 2)); ctx.stroke(); }
  const gIn = p.PO + p.PW / 2 + 3, gOut = gIn + 30, gi = p.a + p.ramp, gn = p.len - 2 * p.ramp;
  ctx.save(); ctx.translate(SUN[0], SUN[1]); band(ctx, t, gi, gn, () => p.side * gIn, () => p.side * gOut); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill(); ctx.restore();
  band(ctx, t, gi, gn, () => p.side * gIn, () => p.side * gOut); ctx.fillStyle = '#d9dbde'; ctx.fill();
  ctx.strokeStyle = 'rgba(90,95,102,0.5)'; ctx.lineWidth = 0.8;
  for (let k = 0; k <= gn; k += 4) { const [x1, y1] = at(t, gi + k, p.side * gIn), [x2, y2] = at(t, gi + k, p.side * gOut); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  ctx.fillStyle = '#f4f4f4';
  p.boxes.forEach(k => { const [x, y, h] = at(t, p.a + k, p.side * (p.PO + p.PW / 2 - 6)); ctx.save(); ctx.translate(x, y); ctx.rotate(h); ctx.fillRect(-7, -1, 14, 2); ctx.restore(); });

  ctx.strokeStyle = '#4b4e54'; ctx.lineWidth = TW; loop(ctx, t, 0); ctx.stroke();
  ctx.strokeStyle = '#43464c'; ctx.lineWidth = TW * 0.34; ctx.beginPath(); for (let i = 0; i < N; i++) i ? ctx.lineTo(t.QX[i], t.QY[i]) : ctx.moveTo(t.QX[i], t.QY[i]); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = '#efefef'; ctx.lineWidth = 1.8; for (const e of [-1, 1]) { loop(ctx, t, e * (TW / 2 - 3)); ctx.stroke(); }
  for (const s of [0, 1]) { const sg = s ? 1 : -1, bv = s ? 2 : 1; for (let i = 0; i < N; i++) if (t.kerb[i] & bv) { band(ctx, t, i, 1, () => sg * (TW / 2 - 3), () => sg * (TW / 2 + 5)); ctx.fillStyle = Math.floor(i / 2) % 2 ? '#f3f3f3' : '#d3242c'; ctx.fill(); } }
  { const [x, y, h] = at(t, 0, 0), c = TW / 12; ctx.save(); ctx.translate(x, y); ctx.rotate(h); for (let r = 0; r < 2; r++) for (let k = 0; k < 12; k++) { ctx.fillStyle = (r + k) % 2 ? '#15171a' : '#f4f4f4'; ctx.fillRect(-c + r * c, -TW / 2 + k * c, c, c); } ctx.restore(); }
  ctx.strokeStyle = '#f4f4f4'; ctx.lineWidth = 1.6;
  t.grid.forEach(g => { const [x, y, h] = at(t, g.i, g.off); ctx.save(); ctx.translate(x, y); ctx.rotate(h); ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(16, -10); ctx.lineTo(16, 10); ctx.lineTo(4, 10); ctx.stroke(); ctx.restore(); });

  // Barriers, tyre walls behind the gravel, pit wall.
  for (const s of [0, 1]) {
    const sg = s ? 1 : -1, bv = s ? 2 : 1;
    for (const [i0, n] of segs(N, i => t.vis[s][i] === 1)) { ctx.beginPath(); trace(ctx, t, i0, n, i => sg * (t.wall[s][i] + 3)); ctx.strokeStyle = '#4f5359'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#b4b8bd'; ctx.lineWidth = 1.3; ctx.stroke(); }
    ctx.setLineDash([3, 2.2]); ctx.strokeStyle = '#1d1e21'; ctx.lineWidth = 4.5;
    for (const [i0, n] of segs(N, i => t.vis[s][i] === 1 && (t.grav[i] & bv) > 0)) { ctx.beginPath(); trace(ctx, t, i0, n, i => sg * (t.wall[s][i] + 0.5)); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  ctx.beginPath(); trace(ctx, t, gi, gn, () => p.side * (TW / 2 + 8)); ctx.strokeStyle = '#7c8188'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#eceef0'; ctx.lineWidth = 2.4; ctx.stroke();

  t.stands.forEach((st, si) => {
    const s = st.side > 0 ? 1 : 0, sg = st.side, D = si ? 30 : 40, gap = si ? 16 : 14;
    const inner = i => sg * (t.wall[s][i] + gap), outer = i => sg * (t.wall[s][i] + gap + D);
    let bad = 0; for (let k = 0; k <= st.n; k++) { const i = wrapI(st.i + k, N); if (t.clr[s][i] < t.wall[s][i] + gap + D + TW / 2 + 24) bad++; }
    if (bad > st.n * 0.15) return;
    ctx.save(); ctx.translate(SUN[0] * 1.6, SUN[1] * 1.6); band(ctx, t, st.i, st.n, inner, outer); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); ctx.restore();
    band(ctx, t, st.i, st.n, inner, outer); ctx.fillStyle = '#6f757e'; ctx.fill();
    for (let k = 0; k < st.n; k++) for (let r = 0; r < D * 0.55; r += 2.4) for (let q = 0; q < 2; q++) {
      const i = wrapI(st.i + k, N), f = rnd(seed + k * 13.1 + r * 7.7 + q); if (f < 0.25) continue;
      const [x, y] = at(t, st.i + k + q * 0.5, inner(i) + sg * (2 + r)); ctx.fillStyle = CROWD[Math.floor(f * 97) % CROWD.length]; ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }
    band(ctx, t, st.i, st.n, i => inner(i) + sg * D * 0.58, outer); ctx.fillStyle = '#eceef0'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,126,134,0.6)'; ctx.lineWidth = 0.8;
    for (let k = 0; k <= st.n; k += 5) { const i = wrapI(st.i + k, N), [x1, y1] = at(t, st.i + k, inner(i) + sg * D * 0.58), [x2, y2] = at(t, st.i + k, outer(i)); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    for (let k = 0; k <= st.n; k += 3) { const i = wrapI(st.i + k, N), [x, y] = at(t, st.i + k, inner(i) + sg * D / 2); mark(x, y, D / 2 + 8); }
  });

  if (env === 'street') {
    for (let gy = b.y; gy < b.y + b.h; gy += 62) for (let gx = b.x; gx < b.x + b.w; gx += 62) {
      const r = rnd(seed + gx * 0.37 + gy * 1.91);
      if (r < 0.14) { for (let q = 0; q < 5; q++) { const x = gx + 8 + rnd(gx + q * 7.7) * 46, y = gy + 8 + rnd(gy + q * 3.9) * 46, rr = 5 + rnd(x) * 4; if (free(x, y)) { disc(ctx, x + 2, y + 3, rr, 'rgba(0,0,0,0.25)'); disc(ctx, x, y, rr, '#3f6d2e'); disc(ctx, x - rr * 0.25, y - rr * 0.3, rr * 0.6, '#4f8236'); } } continue; }
      const parts = r > 0.72 ? 2 : 1;
      for (let q = 0; q < parts; q++) {
        const w = parts > 1 ? 24 + rnd(gx + q) * 5 : 28 + rnd(gx + gy * 3.3) * 28, h = 24 + rnd(gx * 2.1 + gy + q) * 30;
        const x = gx + (parts > 1 ? q * 31 : (62 - w) * rnd(gx * 5.5 + gy)), y = gy + (62 - h) * rnd(gy * 4.4 + gx + q);
        if (![[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y + h / 2]].every(([px, py]) => free(px, py))) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 6, y + 7, w, h);
        ctx.fillStyle = ROOF[Math.floor(rnd(x * 1.3 + y) * 60) % ROOF.length]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 3, y + 3, w - 6, h * 0.35);
        ctx.fillStyle = 'rgba(60,64,70,0.35)'; ctx.fillRect(x + w * 0.6, y + h * 0.55, 6, 5); ctx.fillRect(x + w * 0.2, y + h * 0.62, 5, 5);
      }
    }
  } else {
    const wood = (x, y) => Math.sin(x * 0.004 + seed) * Math.cos(y * 0.005 + seed * 0.3) + Math.sin((x + y) * 0.0021 + seed * 0.7) * 0.6, trees = [];
    for (let gy = b.y; gy < b.y + b.h; gy += 15) for (let gx = b.x; gx < b.x + b.w; gx += 15) {
      const x = gx + rnd(gx * 1.3 + gy * 7.1) * 15, y = gy + rnd(gx * 3.7 + gy * 0.9) * 15;
      if (env === 'desert' ? rnd(x + y * 1.1) > 0.05 : wood(x, y) < 0.35 && rnd(x * 2 + y) > 0.04) continue;
      if (free(x, y)) trees.push([x, y, env === 'desert' ? 2.6 + rnd(x) * 2.4 : 6 + rnd(x * 0.7 + y) * 5]);
    }
    trees.forEach(([x, y, r]) => disc(ctx, x + SUN[0] * r / 6, y + SUN[1] * r / 6, r, 'rgba(0,0,0,0.26)'));
    trees.forEach(([x, y, r], k) => {
      if (env === 'desert') { disc(ctx, x, y, r, '#8d8a58'); disc(ctx, x - r * 0.3, y - r * 0.3, r * 0.5, '#a3a06a'); return; }
      disc(ctx, x, y, r, k % 3 ? '#3d6b2c' : '#355f27'); disc(ctx, x - r * 0.22, y - r * 0.25, r * 0.66, '#4c7f35'); disc(ctx, x - r * 0.38, y - r * 0.42, r * 0.3, '#5f9541');
    });
  }
  return { cv, S };
}

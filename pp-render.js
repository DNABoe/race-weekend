// Draws one frame: sky and backdrop, road with kerbs/gravel/lines, walls, scenery and cars back to front, player car, minimap.
import { SEG, ROAD_W, CAM_H, segAt, rnd } from './pp-track.js';
import { drawSprite } from './pp-sprites.js';
import { drawCarSprite, clamp } from './pp-car.js';

const DEPTH = 1 / Math.tan(50 * Math.PI / 180), DRAW = 150, FOG = 4.2;
export const PLAYER_Z = CAM_H;
const PAL = {
  day: { sky: ['#4a82c4', '#8fb8e0', '#dde9f2'], fog: '#dbe6ee', road: ['#5d6066', '#5a5d63'], line: '#f2f2f2', kerb: ['#d3202b', '#f1f1f1'], wall: ['#e3e4e7', '#2f6fd6'], far: '#8fa7a4', near: '#6c8f70', city: ['#a3aebb', '#7d8898'], dune: ['#d9c39d', '#c9ad83'] },
  dusk: { sky: ['#283462', '#b56f7d', '#f2a66c'], fog: '#c99683', road: ['#4b4d55', '#484a52'], line: '#e6dcd6', kerb: ['#b51d27', '#e2d9d3'], wall: ['#b8b3b6', '#28508f'], far: '#6c5c74', near: '#4e4a5c', city: ['#6e5f78', '#4d4660'], dune: ['#b58f7c', '#9f7c6d'] },
  night: { sky: ['#04060c', '#0a1020', '#1b2540'], fog: '#121a2b', road: ['#3c3f46', '#393c43'], line: '#d9dadf', kerb: ['#b3121d', '#d6d7db'], wall: ['#6a6f78', '#1c3566'], far: '#0e1422', near: '#0a0f19', city: ['#121a2a', '#0c121f'], dune: ['#221f22', '#1a181b'] }
};
const GROUND = {
  park: { day: ['#4f8a3a', '#5a9644'], dusk: ['#3d6a36', '#44733d'], night: ['#1b2c18', '#1f321b'] },
  desert: { day: ['#d6c09b', '#dcc7a3'], dusk: ['#b9957e', '#bf9b84'], night: ['#39322a', '#3d362e'] },
  street: { day: ['#7f8288', '#85888e'], dusk: ['#5f6069', '#64656e'], night: ['#24272e', '#272a31'] }
};
const GRAVEL = { day: '#d9c9a6', dusk: '#b39a86', night: '#4a4436' };
export const GHOST = { body: '#e8ecf2', side: '#b9c0ca', accent: '#ffffff', wing: '#9aa3ad', helmet: '#ffffff' };

export function scheme(hex) {
  const n = /^#[0-9a-f]{6}$/i.test(hex || '') ? parseInt(hex.slice(1), 16) : 0x8a919d, R = n >> 16 & 255, G = n >> 8 & 255, B = n & 255;
  const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B, sh = f => '#' + [R, G, B].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join('');
  return { body: sh(1), side: sh(0.66), accent: lum > 150 ? '#15171b' : '#f4f4f4', wing: '#14161a', helmet: lum > 150 ? '#2a2d33' : '#f0f0f0' };
}
function proj(p, cx, cy, cz, W, H) {
  p.camera.x = p.world.x - cx; p.camera.y = p.world.y - cy; p.camera.z = p.world.z - cz;
  const s = p.screen; s.scale = DEPTH / Math.max(0.1, p.camera.z);
  s.x = Math.round(W / 2 + s.scale * p.camera.x * W / 2); s.y = Math.round(H / 2 - s.scale * p.camera.y * H / 2); s.w = Math.round(s.scale * ROAD_W * W / 2);
}
function poly(ctx, x1, y1, x2, y2, x3, y3, x4, y4, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
const band = (ctx, a, b, o1, o2, c) => poly(ctx, a.x + a.w * o1, a.y, a.x + a.w * o2, a.y, b.x + b.w * o2, b.y, b.x + b.w * o1, b.y, c);

function backdrop(ctx, W, H, tod, t, off) {
  const P = PAL[tod], g = ctx.createLinearGradient(0, 0, 0, H * 0.56);
  g.addColorStop(0, P.sky[0]); g.addColorStop(0.62, P.sky[1]); g.addColorStop(1, P.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const hz = H * 0.52, seed = t.N;
  if (tod === 'night') { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 40; i++) ctx.fillRect(rnd(i * 3.1 + seed) * W, rnd(i * 5.7) * H * 0.3, 1, 1); }
  else {
    const sx = ((W * 0.75 - off * 0.15 * W) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3, sy = tod === 'dusk' ? hz - H * 0.07 : H * 0.14, sr = H * (tod === 'dusk' ? 0.05 : 0.028);
    const halo = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 5);
    halo.addColorStop(0, tod === 'dusk' ? 'rgba(255,190,120,0.55)' : 'rgba(255,255,240,0.5)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10);
    ctx.fillStyle = tod === 'dusk' ? '#ffd29a' : '#fffdf0'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.283); ctx.fill();
    ctx.fillStyle = tod === 'dusk' ? 'rgba(255,214,190,0.5)' : 'rgba(255,255,255,0.82)';
    for (let i = 0; i < 6; i++) {
      const cx = ((rnd(i * 9.1 + seed) * W * 1.6 - off * 0.3 * W) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3, cy = H * (0.06 + rnd(i * 4.3) * 0.26), s = W * (0.05 + rnd(i * 2.2) * 0.06);
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(cx + (k - 1.5) * s * 0.8, cy + (k % 2) * s * 0.15, s * (0.7 + (k % 2) * 0.3), s * 0.42, 0, 0, 6.283); ctx.fill(); }
    }
  }
  if (!t._bg) t._bg = [0, 1].map(L => Array.from({ length: 28 }, (_, i) => 0.25 + rnd(i * 2.71 + L * 50 + seed) * 0.75));
  const city = t.env === 'street', cols = city ? P.city : t.env === 'desert' ? P.dune : [P.far, P.near];
  [0, 1].forEach(L => {
    const pts = t._bg[L], n = pts.length, span = W * 1.6, step = span / n, o = (((off * (L ? 0.5 : 0.25) * W) % span) + span) % span;
    const amp = H * (city ? (L ? 0.13 : 0.1) : (L ? 0.06 : 0.09)), base = hz + (L ? 2 : 0);
    ctx.fillStyle = cols[L]; ctx.beginPath();
    if (city) for (let k = -1; k <= 1; k++) for (let i = 0; i < n; i++) ctx.rect(k * span + i * step - o, base - pts[i] * amp, step * 0.84, pts[i] * amp + H);
    else { ctx.moveTo(-10, H); for (let k = -1; k <= 1; k++) for (let i = 0; i <= n; i++) ctx.lineTo(k * span + i * step - o, base - pts[i % n] * amp); ctx.lineTo(W + 10, H); ctx.closePath(); }
    ctx.fill();
    if (city && L && tod !== 'day') { ctx.fillStyle = 'rgba(244,213,141,0.75)'; for (let k = -1; k <= 1; k++) for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) if (rnd(i * 7 + j) > 0.45) ctx.fillRect(k * span + i * step - o + step * (0.15 + (j % 2) * 0.4), base - pts[i] * amp * (0.25 + j * 0.18), 1.5, 1.5); }
  });
}

function road(ctx, W, s, P, gnd, tod) {
  const a = s.p1.screen, b = s.p2.screen, alt = Math.floor(s.i / 3) % 2;
  ctx.fillStyle = gnd[alt]; ctx.fillRect(0, b.y, W, a.y - b.y + 1);
  if (s.gL) band(ctx, a, b, -2.7, -1.12, GRAVEL[tod]);
  if (s.gR) band(ctx, a, b, 1.12, 2.7, GRAVEL[tod]);
  if (s.wL === 2) band(ctx, a, b, -2.4, -1.45, P.road[1]);
  if (s.wR === 2) band(ctx, a, b, 1.45, 2.4, P.road[1]);
  const kc = P.kerb[Math.floor(s.i / 2) % 2];
  if (s.kL) band(ctx, a, b, -1.13, -0.99, kc);
  if (s.kR) band(ctx, a, b, 0.99, 1.13, kc);
  band(ctx, a, b, -1, 1, P.road[s.i % 2]);
  band(ctx, a, b, -0.975, -0.945, P.line); band(ctx, a, b, 0.945, 0.975, P.line);
  if (s.i === 0) {
    const f = 0.6, tx = a.x + (b.x - a.x) * f, tw = a.w + (b.w - a.w) * f, ty = a.y + (b.y - a.y) * f;
    for (let k = 0; k < 16; k++) { const o1 = -1 + k / 8, o2 = o1 + 1 / 8; poly(ctx, a.x + a.w * o1, a.y, a.x + a.w * o2, a.y, tx + tw * o2, ty, tx + tw * o1, ty, k % 2 ? '#15171a' : '#f4f4f4'); }
  }
  if (s.grid) {
    const at = f => [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.w + (b.w - a.w) * f], [x1, y1, w1] = at(s.gf), [x2, y2, w2] = at(Math.min(1, s.gf + 0.12));
    const o1 = s.grid < 0 ? -0.78 : 0.14, o2 = s.grid < 0 ? -0.14 : 0.78, y3 = Math.min(y2, y1 - 1);
    poly(ctx, x1 + w1 * o1, y1, x1 + w1 * o2, y1, x2 + w2 * o2, y3, x2 + w2 * o1, y3, P.line);
  }
  const f = 1 - s.fog;
  if (f > 0.02) { ctx.globalAlpha = Math.min(0.92, f); ctx.fillStyle = P.fog; ctx.fillRect(0, b.y, W, a.y - b.y + 1); ctx.globalAlpha = 1; }
}

function walls(ctx, s, t, P, night) {
  const a = s.p1.screen, b = s.p2.screen;
  [-1, 1].forEach(side => {
    const w = side < 0 ? s.wL : s.wR;
    if (!w || b.y >= a.y) return;
    const o = (w === 2 ? 1.42 : t.wallO) * side, hw = w === 2 ? 0.15 : 0.19, x1 = a.x + a.w * o, x2 = b.x + b.w * o, h1 = a.w * hw, h2 = b.w * hw;
    poly(ctx, x1, a.y, x2, b.y, x2, b.y - h2, x1, a.y - h1, P.wall[w === 1 && Math.floor(s.i / 4) % 3 === 0 ? 1 : 0]);
    if (w === 1) {
      const f1 = a.w * 0.5, f2 = b.w * 0.5;
      ctx.globalAlpha *= 0.22; poly(ctx, x1, a.y - h1, x2, b.y - h2, x2, b.y - h2 - f2, x1, a.y - h1 - f1, night ? '#8b93a3' : '#596270'); ctx.globalAlpha /= 0.22;
      if (s.i % 2 === 0) { ctx.fillStyle = night ? '#6d7482' : '#4d5360'; ctx.fillRect(x1 - Math.max(0.5, a.w * 0.006), a.y - h1 - f1, Math.max(1, a.w * 0.012), f1); }
    }
  });
}

function tag(ctx, x, y, code, color) {
  ctx.font = '600 10px "IBM Plex Mono", monospace';
  const w = ctx.measureText(code).width + 12;
  ctx.fillStyle = 'rgba(10,11,14,0.78)'; ctx.fillRect(x - w / 2, y - 15, w, 14);
  ctx.fillStyle = color; ctx.fillRect(x - w / 2, y - 15, 3, 14);
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(code, x + 1.5, y - 7.6);
}

function minimap(ctx, W, t, m) {
  if (!t._mini) { const S = 84 / Math.max(t.box[0], t.box[1]), p = new Path2D(); t.Q.forEach((q, i) => (i ? p.lineTo(q[0] * S, q[1] * S) : p.moveTo(q[0] * S, q[1] * S))); p.closePath(); t._mini = { p, S, w: t.box[0] * S, h: t.box[1] * S }; }
  const M = t._mini, dot = (f, r, fill, line) => { const q = t.Q[Math.floor((((f % 1) + 1) % 1) * t.N) % t.N]; ctx.beginPath(); ctx.arc(q[0] * M.S, q[1] * M.S, r, 0, 6.283); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (line) { ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke(); } };
  ctx.save(); ctx.translate(W - M.w - 14, 14);
  ctx.fillStyle = 'rgba(8,9,12,0.55)'; ctx.fillRect(-7, -7, M.w + 14, M.h + 14);
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke(M.p);
  m.rivals.forEach(r => dot(r.f, 2.4, r.color));
  if (m.ghost != null) dot(m.ghost, 3, null, 'rgba(255,255,255,0.8)');
  dot(m.player, 3.6, '#ffffff', '#e0262f');
  ctx.restore();
}

function playerCar(ctx, W, H, p) {
  const k = W / 380, cw = 118 * k, ch = cw * 0.82, now = p.time;
  ctx.save(); ctx.translate(W / 2, H - 8 * k + (p.rumble ? Math.sin(now * 70) * 1.6 * k : 0));
  if (p.dust > 0) { ctx.fillStyle = p.dustColor; for (let i = 0; i < 6; i++) { const age = ((now * 2.4) + i / 6) % 1; ctx.globalAlpha = (1 - age) * 0.55 * p.dust; ctx.beginPath(); ctx.arc((i % 2 ? 1 : -1) * cw * (0.42 + age * 0.3), -ch * 0.1 + age * 40 * k, (8 + age * 26) * k, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; }
  drawCarSprite(ctx, cw, ch, p.steer, p.phase, p.scheme, true);
  if (p.brake) { ctx.fillStyle = 'rgba(255,40,40,0.95)'; ctx.beginPath(); ctx.ellipse(0, -ch * 0.13, cw * 0.035, ch * 0.025, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.beginPath(); ctx.ellipse(0, -ch * 0.13, cw * 0.12, ch * 0.07, 0, 0, 6.283); ctx.fill(); }
  ctx.restore();
}

export function render(ctx, W, H, v) {
  const t = v.t, tod = v.tod, night = tod === 'night', P = PAL[tod], gnd = GROUND[t.env][tod];
  const base = segAt(t, v.z), bp = (((v.z % SEG) + SEG) % SEG) / SEG, ps = segAt(t, v.z + PLAYER_Z), pp = ((((v.z + PLAYER_Z) % SEG) + SEG) % SEG) / SEG;
  const py = ps.p1.world.y + (ps.p2.world.y - ps.p1.world.y) * pp;
  backdrop(ctx, W, H, tod, t, v.bg);
  let x = 0, dx = -base.curve * bp, maxy = H;
  const vis = [], order = [];
  for (let n = 0; n < DRAW; n++) {
    const s = t.segs[(base.i + n) % t.N], loop = s.i < base.i ? t.L : 0;
    s.fog = 1 / Math.exp((n / DRAW) ** 2 * FOG);
    proj(s.p1, v.x * ROAD_W - x, py + CAM_H, v.z - loop, W, H);
    proj(s.p2, v.x * ROAD_W - x - dx, py + CAM_H, v.z - loop, W, H);
    x += dx; dx += s.curve;
    s.clip = maxy; s.behind = s.p1.camera.z <= DEPTH; order.push(s);
    if (s.behind || s.p2.screen.y >= s.p1.screen.y || s.p2.screen.y >= maxy) continue;
    vis.push(s); maxy = s.p2.screen.y;
  }
  for (let i = vis.length - 1; i >= 0; i--) road(ctx, W, vis[i], P, gnd, tod);
  const bucket = new Map();
  v.cars.forEach(c => { const i = segAt(t, c.z).i; if (!bucket.has(i)) bucket.set(i, []); bucket.get(i).push(c); });
  for (let n = order.length - 1; n >= 0; n--) {
    const s = order[n];
    if (s.behind) continue;
    const a = s.p1.screen, b = s.p2.screen, clip = s.clip < H;
    if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, s.clip); ctx.clip(); }
    ctx.globalAlpha = clamp(s.fog * 1.25, 0, 1);
    walls(ctx, s, t, P, night);
    s.sprites.forEach(sp => drawSprite(ctx, sp, sp.kind === 'gantry' ? a.x : a.x + a.w * sp.o, a.y, a.w, night, v.gantry));
    const fl = night ? t.lights(s.i) : 0;
    if (fl) drawSprite(ctx, { kind: 'flood' }, a.x + a.w * fl * (t.env === 'street' ? 1.4 : 1.8), a.y, a.w, night);
    const cs = bucket.get(s.i);
    if (cs) cs.sort((p, q) => q.z - p.z).forEach(c => {
      const f = (((c.z % SEG) + SEG) % SEG) / SEG, cx = a.x + (b.x - a.x) * f, cy = a.y + (b.y - a.y) * f, cw = a.w + (b.w - a.w) * f;
      const X = cx + cw * c.x, carW = clamp(cw * 0.36, 1, 170);
      if (carW < 2.5) return;
      const al = ctx.globalAlpha;
      ctx.save(); ctx.translate(X, cy); if (c.ghost) ctx.globalAlpha = al * 0.38;
      drawCarSprite(ctx, carW, carW * 0.82, c.steer || 0, c.phase || 0, c.scheme, false); ctx.restore();
      if (c.code && carW > 15) tag(ctx, X, cy - carW * 0.92, c.code, c.color);
    });
    if (clip) ctx.restore();
  }
  ctx.globalAlpha = 1;
  playerCar(ctx, W, H, v.player);
  minimap(ctx, W, t, v.mini);
}

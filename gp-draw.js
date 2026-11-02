// Draws one frame of the top-down race: baked circuit, skid marks, DRS gates, spray and dust, cars with shadows, rain,
// plus the camera (whole track fitted to the screen, or a closer follow view).
import { TW, at, rnd } from './gp-track.js';
import { makeCanvas } from './gp-scene.js';

export function skidLayer(t, S) { const s = S * 0.5; return { cv: makeCanvas(Math.ceil(t.bbox.w * s), Math.ceil(t.bbox.h * s)), S: s }; }
export function fitCam(t, W, H, pad) {
  const b = t.bbox, aw = W - pad[1] - pad[3], ah = H - pad[0] - pad[2];
  const s0 = Math.min(aw / b.w, ah / b.h), s90 = Math.min(aw / b.h, ah / b.w), rot = s90 > s0 * 1.05 ? Math.PI / 2 : 0;
  return { x: b.x + b.w / 2, y: b.y + b.h / 2, z: Math.max(s0, s90), rot, ox: (pad[3] - pad[1]) / 2, oy: (pad[0] - pad[2]) / 2 };
}
// Close chase view: zoom scales with the screen (and eases out with speed); the camera leads toward the track ahead,
// so the next corner comes into view before the car reaches it. North stays up so point-to-steer directions hold.
export function followCam(cam, fit, p, dt, t, W, H) {
  const sp = Math.hypot(p.vx, p.vy), base = Math.sqrt(W * H) / 560, zt = base * (1.2 - 0.38 * Math.min(1, sp / 300));
  let ax = p.x + p.vx * 0.3, ay = p.y + p.vy * 0.3;
  if (t) { const j = ((p.i + Math.round((60 + sp * 0.85) / t.ds)) % t.N + t.N) % t.N; ax = p.x + (t.X[j] - p.x) * 0.6; ay = p.y + (t.Y[j] - p.y) * 0.6; }
  const k = 1 - Math.exp(-dt * 3);
  if (!cam.follow) Object.assign(cam, { x: ax, y: ay, z: zt, follow: true });
  cam.x += (ax - cam.x) * k; cam.y += (ay - cam.y) * k; cam.z += (zt - cam.z) * (1 - Math.exp(-dt * 1.5)); cam.rot = 0; cam.ox = 0; cam.oy = 0;
  return cam;
}
// Corner overview map: whole circuit with every car as a dot, the player's larger and outlined.
export function drawMinimap(ctx, v, scene, x0, y0, size) {
  const t = v.t, b = t.bbox, s = size / Math.max(b.w, b.h), w = b.w * s, h = b.h * s;
  ctx.save(); ctx.globalAlpha = 0.92;
  ctx.fillStyle = 'rgba(8,9,12,0.66)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 - 6, y0 - 6, w + 12, h + 12, 10) : ctx.rect(x0 - 6, y0 - 6, w + 12, h + 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let i = 0; i <= t.N; i += 2) { const k = i % t.N, X = x0 + (t.X[k] - b.x) * s, Y = y0 + (t.Y[k] - b.y) * s; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
  ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1;
  const pl = v.cars.find(c => !c.ai);
  v.cars.forEach(c => { if (c === pl) return; ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(x0 + (c.x - b.x) * s, y0 + (c.y - b.y) * s, 2.6, 0, 6.283); ctx.fill(); });
  if (pl) { ctx.fillStyle = '#ffcc00'; ctx.strokeStyle = '#0e1016'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x0 + (pl.x - b.x) * s, y0 + (pl.y - b.y) * s, 4, 0, 6.283); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
const shade = (hex, f) => { const n = /^#[0-9a-f]{6}$/i.test(hex || '') ? parseInt(hex.slice(1), 16) : 0x8a919d; return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join(''); };

function body(ctx, c, alpha) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.h); ctx.globalAlpha = alpha;
  if (c.boost > 0) { ctx.strokeStyle = 'rgba(80,210,255,0.8)'; ctx.lineWidth = 1.4; for (const y of [-2.5, 0, 2.5]) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(-20 - Math.random() * 6, y); ctx.stroke(); } }
  ctx.fillStyle = '#15161a';
  ctx.fillRect(4.5, -6.2, 5, 2.6); ctx.fillRect(4.5, 3.6, 5, 2.6); ctx.fillRect(-10, -6.6, 5.6, 3); ctx.fillRect(-10, 3.6, 5.6, 3);
  ctx.fillStyle = c.color;
  ctx.beginPath(); ctx.moveTo(12.5, -0.9); ctx.lineTo(12.5, 0.9); ctx.lineTo(4, 1.6); ctx.lineTo(1.5, 3.6); ctx.lineTo(-6.5, 3.4); ctx.lineTo(-9, 1.6); ctx.lineTo(-9, -1.6); ctx.lineTo(-6.5, -3.4); ctx.lineTo(1.5, -3.6); ctx.lineTo(4, -1.6); ctx.closePath(); ctx.fill();
  ctx.fillRect(10.5, -5.4, 2, 10.8);
  ctx.fillStyle = shade(c.color, 0.55); ctx.fillRect(-12, -4.8, 2.6, 9.6);
  ctx.fillStyle = '#121317'; ctx.beginPath(); ctx.ellipse(-0.5, 0, 2.6, 1.5, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(-0.6, 0, 1.15, 0, 6.283); ctx.fill();
  ctx.restore();
}

export function drawFrame(ctx, W, H, v, scene, skid, cam, opt) {
  const t = v.t, b = t.bbox, cr = Math.cos(cam.rot), sr = Math.sin(cam.rot);
  if (v.skids.length) {
    const k = skid.cv.getContext('2d'); k.setTransform(skid.S, 0, 0, skid.S, -b.x * skid.S, -b.y * skid.S); k.fillStyle = 'rgba(18,18,20,0.3)';
    for (const [x, y, h] of v.skids.splice(0)) { k.save(); k.translate(x, y); k.rotate(h); k.fillRect(-2, -0.9, 4, 1.8); k.restore(); }
  }
  ctx.fillStyle = '#1b1e24'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + cam.ox, H / 2 + cam.oy); ctx.rotate(cam.rot); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(scene.cv, b.x, b.y, b.w, b.h);
  ctx.drawImage(skid.cv, b.x, b.y, b.w, b.h);
  if (v.wet > 0.02) { ctx.fillStyle = `rgba(28,40,58,${0.3 * v.wet})`; ctx.fillRect(b.x, b.y, b.w, b.h); }
  v.drs.forEach(g => {
    const [x, y, h] = at(t, g.i, 0), a = g.on ? 0.55 + 0.35 * Math.sin(v.time * 5) : 0.14;
    ctx.save(); ctx.translate(x, y); ctx.rotate(h);
    ctx.fillStyle = `rgba(60,205,245,${a})`; ctx.fillRect(-2, -TW / 2 + 5, 4, TW - 10);
    ctx.strokeStyle = `rgba(60,205,245,${a})`; ctx.lineWidth = 3; ctx.lineJoin = 'miter';
    for (const dx of [-14, -5]) { ctx.beginPath(); ctx.moveTo(dx - 5, -9); ctx.lineTo(dx + 3, 0); ctx.lineTo(dx - 5, 9); ctx.stroke(); }
    ctx.restore();
  });
  for (const q of v.parts) {
    const a = q.life / q.max;
    ctx.fillStyle = q.kind === 'spray' ? `rgba(225,232,240,${0.32 * a})` : q.kind === 'gravel' ? `rgba(205,185,145,${0.5 * a})` : `rgba(105,92,58,${0.4 * a})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, 3 + (1 - a) * 6, 0, 6.283); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  v.cars.forEach(c => { ctx.save(); ctx.translate(c.x + 2.2, c.y + 2.8); ctx.rotate(c.h); ctx.fillRect(-12, -6, 24.5, 12); ctx.restore(); });
  if (v.ghost) body(ctx, { ...v.ghost, color: '#f4f6fa', boost: 0 }, 0.4);
  v.cars.forEach(c => body(ctx, c, 1));
  ctx.restore();

  if (v.rain > 0.05) {
    ctx.strokeStyle = `rgba(215,228,242,${0.4 * v.rain})`; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0, n = Math.round(110 * v.rain); k < n; k++) {
      const x = ((rnd(k * 3.7) * (W + 80) + v.time * 160 * (0.7 + rnd(k) * 0.6)) % (W + 80)) - 40, y = ((rnd(k * 9.1) * (H + 80) + v.time * 820 * (0.8 + rnd(k * 2.3) * 0.4)) % (H + 80)) - 40;
      ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 15);
    }
    ctx.stroke();
  }
  const scr = (x, y) => { const dx = (x - cam.x) * cam.z, dy = (y - cam.y) * cam.z; return [W / 2 + cam.ox + dx * cr - dy * sr, H / 2 + cam.oy + dx * sr + dy * cr]; };
  const near = cam.z < 0.8;
  ctx.font = '600 9px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  v.cars.forEach(c => {
    const [x, y] = scr(c.x, c.y);
    if (!c.ai) { if (near) { ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.283); ctx.stroke(); } return; }
    if (!opt.tags) return;
    const w = ctx.measureText(c.code).width + 10, ty = y - (near ? 15 : 26);
    ctx.fillStyle = 'rgba(10,11,14,0.78)'; ctx.fillRect(x - w / 2, ty - 6.5, w, 13);
    ctx.fillStyle = c.color; ctx.fillRect(x - w / 2, ty - 6.5, 2.5, 13);
    ctx.fillStyle = '#ffffff'; ctx.fillText(c.code, x + 1.2, ty + 0.5);
  });
}

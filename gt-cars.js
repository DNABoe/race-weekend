// GrandTour vehicles and road furniture: the player's original 80s wedge coupe (rear view), traffic, arches and the fork sign.
const box = (c, x, y, w, h, f) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
const poly = (c, f, ...p) => { c.fillStyle = f; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); };
const rr = (c, x, y, w, h, r, f) => { c.fillStyle = f; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fill(); };

// Player car, drawn with its rear-centre at the origin. steer -1..1 shows a little of the flank; brake lights the bar.
export function drawCoupe(c, W, steer, brake, night) {
  const H = W * 0.46, s = steer * W * 0.05, flank = Math.abs(steer) * W * 0.07, fs = Math.sign(steer);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, -H * 0.02, W * 0.56, H * 0.1, 0, 0, 6.283); c.fill();
  for (const sx of [-1, 1]) rr(c, sx * W * 0.4 - W * 0.09, -H * 0.3, W * 0.18, H * 0.3, W * 0.02, '#141519');
  if (flank > 1) poly(c, '#c9ccd2', fs * W * 0.5, -H * 0.2, fs * (W * 0.5 + flank), -H * 0.32, fs * (W * 0.47 + flank), -H * 0.72, fs * W * 0.46, -H * 0.66);
  poly(c, '#f2f3f5', -W * 0.5, -H * 0.2, W * 0.5, -H * 0.2, W * 0.47, -H * 0.66, W * 0.33 + s, -H * 0.78, -W * 0.33 + s, -H * 0.78, -W * 0.47, -H * 0.66);
  poly(c, '#1a1c22', -W * 0.3 + s, -H * 0.8, W * 0.3 + s, -H * 0.8, W * 0.22 + s * 1.4, -H * 1.02, -W * 0.22 + s * 1.4, -H * 1.02);
  poly(c, '#f2f3f5', -W * 0.24 + s * 1.4, -H * 1.02, W * 0.24 + s * 1.4, -H * 1.02, W * 0.21 + s * 1.5, -H * 1.07, -W * 0.21 + s * 1.5, -H * 1.07);
  box(c, -W * 0.5, -H * 0.5, W, H * 0.035, '#d3242c');
  box(c, -W * 0.44, -H * 0.62, W * 0.88, H * 0.1, '#2a0d10');
  box(c, -W * 0.43, -H * 0.605, W * 0.86, H * 0.07, brake ? '#ff3a3a' : night ? '#c81e24' : '#a8181e');
  box(c, -W * 0.06, -H * 0.605, W * 0.12, H * 0.07, brake ? '#ffd0c0' : '#e8e8e8');
  if (brake || night) { c.fillStyle = brake ? 'rgba(255,50,50,0.28)' : 'rgba(255,40,40,0.14)'; c.fillRect(-W * 0.52, -H * 0.72, W * 1.04, H * 0.3); }
  box(c, -W * 0.5, -H * 0.3, W, H * 0.11, '#2b2d33');
  for (const sx of [-1, 1]) { c.fillStyle = '#9aa0a8'; c.beginPath(); c.ellipse(sx * W * 0.3, -H * 0.24, W * 0.035, H * 0.035, 0, 0, 6.283); c.fill(); }
  box(c, -W * 0.5, -H * 0.86, W, H * 0.05, '#1b1d22');
  for (const sx of [-0.36, 0.33]) box(c, sx * W, -H * 0.86, W * 0.03, H * 0.12, '#1b1d22');
}

const TCOL = ['#c7372f', '#2f5fa8', '#e8e3d6', '#3d7d4a', '#e0a33a', '#5a5f6b', '#7a3f8f', '#2f9aa0'];
export const TRAFFIC = ['hatch', 'sedan', 'van', 'truck', 'pickup'];
// Traffic, rear view, anchored at the rear-centre on the road. W = car width in px.
export function drawTraffic(c, x, y, W, kind, ci, night) {
  if (W < 3) return;
  const col = TCOL[ci % TCOL.length], dark = night ? '#15171c' : '#1d2026';
  const H = { hatch: 0.72, sedan: 0.62, van: 1.0, truck: 1.35, pickup: 0.7 }[kind] * W, L = x - W / 2;
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x, y, W * 0.56, W * 0.08, 0, 0, 6.283); c.fill();
  box(c, L + W * 0.04, y - W * 0.16, W * 0.16, W * 0.16, '#121317'); box(c, L + W * 0.8, y - W * 0.16, W * 0.16, W * 0.16, '#121317');
  if (kind === 'truck') {
    box(c, L - W * 0.05, y - H, W * 1.1, H * 0.86, night ? '#3a3e46' : '#d9dbde');
    box(c, L - W * 0.05, y - H * 0.16, W * 1.1, H * 0.06, dark);
    if (W > 24) { c.strokeStyle = night ? '#4a4e56' : '#b9bdc2'; c.lineWidth = Math.max(1, W * 0.012); c.strokeRect(L + W * 0.02, y - H * 0.95, W * 0.96, H * 0.72); }
  } else {
    const roof = { hatch: 0.82, sedan: 0.66, van: 0.98, pickup: 0.85 }[kind];
    poly(c, col, L, y - W * 0.14, L + W, y - W * 0.14, L + W * 0.97, y - H * 0.55, L + W * (1 - (1 - roof) / 2), y - H, L + W * (1 - roof) / 2, y - H, L + W * 0.03, y - H * 0.55);
    if (kind !== 'pickup') poly(c, dark, L + W * 0.14, y - H * 0.6, L + W * 0.86, y - H * 0.6, L + W * (0.98 - (1 - roof) / 2), y - H * 0.94, L + W * (0.02 + (1 - roof) / 2), y - H * 0.94);
    else box(c, L + W * 0.2, y - H * 0.98, W * 0.6, H * 0.3, dark);
  }
  const ly = kind === 'truck' ? y - H * 0.28 : y - H * 0.42;
  box(c, L + W * 0.03, ly, W * 0.17, W * 0.07, night ? '#ff3a3a' : '#c8261e'); box(c, L + W * 0.8, ly, W * 0.17, W * 0.07, night ? '#ff3a3a' : '#c8261e');
  if (night) { c.fillStyle = 'rgba(255,40,40,0.25)'; c.fillRect(L - W * 0.04, ly - W * 0.06, W * 0.3, W * 0.19); c.fillRect(L + W * 0.74, ly - W * 0.06, W * 0.3, W * 0.19); }
  box(c, x - W * 0.12, y - W * 0.25, W * 0.24, W * 0.06, '#e8e6dc');
}

export function drawArch(c, x, y, w, text, goal, night) {
  if (w < 6) return;
  const span = w * 1.22, H = w * 0.82, bh = w * 0.2;
  for (const sx of [-1, 1]) box(c, x + sx * span - w * 0.04, y - H, w * 0.08, H, night ? '#5a5f68' : '#d9dbde');
  if (goal) { const n = 20, cw = span * 2 / n; for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) box(c, x - span + k * cw, y - H - bh + r * bh / 2, cw + 0.5, bh / 2 + 0.5, (k + r) % 2 ? '#15171a' : '#f4f4f4'); }
  else { box(c, x - span, y - H - bh, span * 2, bh, text === 'START' ? '#1d4e9e' : '#d22f38'); box(c, x - span, y - H - bh, span * 2, Math.max(1, bh * 0.08), '#ffffff'); }
  if (!goal && w > 30) { c.fillStyle = '#ffffff'; c.font = `700 ${Math.round(bh * 0.66)}px Rajdhani, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y - H - bh * 0.46); }
}

export function drawFork(c, x, y, w, left, right, night) {
  if (w < 5) return;
  const BW = w * 1.7, BH = w * 0.46, top = y - w * 0.95;
  for (const sx of [-0.3, 0.3]) box(c, x + sx * BW - w * 0.025, top + BH, w * 0.05, y - top - BH, '#6b7078');
  box(c, x - BW / 2, top, BW, BH, night ? '#0f3d2c' : '#13724f');
  c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, BH * 0.04); c.strokeRect(x - BW / 2 + 2, top + 2, BW - 4, BH - 4);
  box(c, x - Math.max(0.5, BW * 0.004), top + BH * 0.12, Math.max(1, BW * 0.008), BH * 0.76, '#ffffff');
  const fs = Math.round(BH * 0.2);
  for (const [sx, name, arrow] of [[-1, left, '←'], [1, right, '→']]) {
    const cx = x + sx * BW * 0.25;
    if (BW > 60) { c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${Math.round(BH * 0.34)}px Rajdhani, sans-serif`; c.fillText(arrow, cx, top + BH * 0.32); c.font = `600 ${fs}px Rajdhani, sans-serif`; c.fillText(name.toUpperCase(), cx, top + BH * 0.7, BW * 0.46); }
  }
}

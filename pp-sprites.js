// Trackside scenery drawn with flat fills. Every drawer takes the ground anchor (x, y) and w = road half-width in px at that depth.
const CROWD = ['#d64b3b', '#f2f2f2', '#2f5fa8', '#f2c14e', '#26282c', '#e88a3a', '#6aa84f'];
const TONES = ['#b9b2a6', '#9aa3ad', '#c8bfae', '#7f8a96', '#d6d0c4', '#a39a8c'];
const r = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const dim = (night, day, nite) => night ? nite : day;

function tree(ctx, x, y, w, h, night) {
  const s = w * 0.55 * h;
  if (s < 2) return;
  r(ctx, x - s * 0.06, y - s * 0.55, s * 0.12, s * 0.55, dim(night, '#5b4632', '#231c15'));
  const g = night ? ['#1a2a17', '#22351d', '#2a4224'] : ['#3a6329', '#4a7a34', '#5c9140'];
  [[0, -0.95, 0.42, 0], [-0.25, -0.72, 0.32, 1], [0.25, -0.75, 0.3, 1], [0.05, -1.15, 0.28, 2], [-0.1, -0.88, 0.22, 2]].forEach(([dx, dy, rr, k]) => {
    ctx.fillStyle = g[k]; ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, rr * s, 0, 6.283); ctx.fill();
  });
}
function palm(ctx, x, y, w, night) {
  const s = w * 0.7;
  if (s < 2) return;
  ctx.strokeStyle = dim(night, '#8a6d4a', '#2d2419'); ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.6, x + s * 0.05, y - s * 1.1); ctx.stroke();
  ctx.fillStyle = dim(night, '#4b7a33', '#1b2b16');
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.55;
    ctx.beginPath(); ctx.ellipse(x + s * 0.05 + Math.cos(a) * s * 0.28, y - s * 1.1 + Math.sin(a) * s * 0.18 + s * 0.06, s * 0.3, s * 0.06, a, 0, 6.283); ctx.fill();
  }
}
function shrub(ctx, x, y, w, night) {
  const s = w * 0.25;
  if (s < 1.5) return;
  ctx.fillStyle = dim(night, '#7b7a4c', '#2a2a1c'); ctx.beginPath(); ctx.ellipse(x, y - s * 0.3, s, s * 0.4, 0, 0, 6.283); ctx.fill();
}
function stand(ctx, x, y, w, big, night) {
  const W = w * (big ? 2.1 : 1.6), H = w * (big ? 0.95 : 0.75), L = x - W / 2;
  if (W < 4) return;
  r(ctx, L, y - H, W, H, dim(night, '#b9bdc3', '#3a3e46'));
  const rows = Math.max(2, Math.min(9, Math.round(H / 7))), rh = (H * 0.72) / rows;
  for (let i = 0; i < rows; i++) {
    const yy = y - H * 0.08 - (i + 1) * rh;
    r(ctx, L + W * 0.04, yy, W * 0.92, rh * 0.82, dim(night, '#6f7886', '#2c3240'));
    if (W > 70) for (let k = 0; k < 26; k++) {
      const c = CROWD[(i * 7 + k * 3) % CROWD.length];
      r(ctx, L + W * 0.05 + (k / 26) * W * 0.9, yy + rh * 0.1, Math.max(1, W * 0.012), rh * 0.5, night ? c + '99' : c);
    }
  }
  r(ctx, L - W * 0.03, y - H * 1.1, W * 1.06, Math.max(1, H * 0.07), dim(night, '#e7e9ec', '#5a5f68'));
  r(ctx, L, y - H * 1.05, Math.max(1, W * 0.02), H * 0.25, '#7d828a');
  r(ctx, L + W - Math.max(1, W * 0.02), y - H * 1.05, Math.max(1, W * 0.02), H * 0.25, '#7d828a');
  if (night) r(ctx, L, y - H * 1.04, W, Math.max(1, H * 0.02), '#fff3c8');
}
function pit(ctx, x, y, w, night) {
  const W = w * 1.5, H = w * 0.55, L = x - W / 2;
  if (W < 4) return;
  r(ctx, L, y - H, W, H, dim(night, '#e4e6e9', '#4a4f57'));
  r(ctx, L, y - H, W, H * 0.16, dim(night, '#c8262f', '#7a1c22'));
  for (let k = 0; k < 3; k++) r(ctx, L + W * (0.06 + k * 0.32), y - H * 0.7, W * 0.26, H * 0.7, night ? '#d9d2b8' : '#2b2e33');
}
function building(ctx, x, y, w, h, tone, night) {
  const W = w * 1.1, H = w * h, L = x - W / 2;
  if (W < 3) return;
  r(ctx, L, y - H, W, H, night ? '#1d2230' : TONES[Math.floor(tone * TONES.length) % TONES.length]);
  if (W < 14) return;
  const cols = 4, rows = Math.max(2, Math.round(h * 4));
  for (let i = 0; i < rows; i++) for (let k = 0; k < cols; k++) {
    const lit = night && ((i * 5 + k * 3 + Math.floor(tone * 10)) % 3 !== 0);
    r(ctx, L + W * (0.1 + k * 0.21), y - H + H * (0.08 + i * (0.86 / rows)), W * 0.13, H * (0.5 / rows), night ? (lit ? '#f4d58d' : '#2a3142') : '#5d6b7a');
  }
}
function banner(ctx, x, y, w, night) {
  const W = w * 0.95, H = w * 0.2, L = x - W / 2, top = y - w * 0.32;
  if (W < 4) return;
  r(ctx, L + W * 0.08, top + H, Math.max(1, W * 0.02), y - top - H, '#6b7078');
  r(ctx, L + W * 0.9, top + H, Math.max(1, W * 0.02), y - top - H, '#6b7078');
  r(ctx, L, top, W, H, night ? '#9e1b22' : '#d22f38');
  if (W > 40) { ctx.fillStyle = '#ffffff'; ctx.font = `700 ${Math.round(H * 0.6)}px Rajdhani, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('RACE WEEKEND', x, top + H * 0.55); }
}
function board(ctx, x, y, w, n, night) {
  const W = w * 0.16, H = w * 0.2;
  if (W < 2) return;
  r(ctx, x - W * 0.06, y - w * 0.18, W * 0.12, w * 0.18, '#80858c');
  r(ctx, x - W / 2, y - w * 0.18 - H, W, H, night ? '#d8dade' : '#ffffff');
  if (W > 9) { ctx.fillStyle = '#111317'; ctx.font = `700 ${Math.round(H * 0.7)}px Rajdhani, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), x, y - w * 0.18 - H * 0.46); }
}
function tyres(ctx, x, y, w, night) {
  const W = w * 0.55, H = w * 0.13;
  if (W < 3) return;
  r(ctx, x - W / 2, y - H, W, H, '#16181b');
  r(ctx, x - W / 2, y - H * 0.62, W, Math.max(1, H * 0.22), night ? '#7a6e8a' : '#2f6fd6');
}
function flood(ctx, x, y, w) {
  const H = w * 1.7;
  if (H < 6) return;
  r(ctx, x - Math.max(1, w * 0.015), y - H, Math.max(1, w * 0.03), H, '#59606b');
  r(ctx, x - w * 0.12, y - H - w * 0.06, w * 0.24, w * 0.07, '#fff8de');
}
function gantry(ctx, x, y, w, g) {
  const span = w * 1.2, H = w * 0.62, bw = w * 0.9;
  if (w < 6) return;
  r(ctx, x - span - w * 0.03, y - H, w * 0.06, H, '#4b5058');
  r(ctx, x + span - w * 0.03, y - H, w * 0.06, H, '#4b5058');
  r(ctx, x - span, y - H - w * 0.05, span * 2, w * 0.06, '#3c4047');
  r(ctx, x - bw / 2, y - H - w * 0.2, bw, w * 0.15, '#15171b');
  for (let k = 0; k < 5; k++) {
    const on = g && !g.out && k < g.lit;
    ctx.fillStyle = on ? '#ff2a2a' : '#30333a';
    ctx.beginPath(); ctx.arc(x - bw * 0.36 + k * bw * 0.18, y - H - w * 0.125, w * 0.045, 0, 6.283); ctx.fill();
  }
}

export function drawSprite(ctx, sp, x, y, w, night, g) {
  switch (sp.kind) {
    case 'tree': return tree(ctx, x, y, w, sp.h || 1, night);
    case 'palm': return palm(ctx, x, y, w, night);
    case 'shrub': return shrub(ctx, x, y, w, night);
    case 'stand': return stand(ctx, x, y, w, sp.big, night);
    case 'pit': return pit(ctx, x, y, w, night);
    case 'building': return building(ctx, x, y, w, sp.h, sp.tone, night);
    case 'banner': return banner(ctx, x, y, w, night);
    case 'board': return board(ctx, x, y, w, sp.n, night);
    case 'tyres': return tyres(ctx, x, y, w, night);
    case 'flood': return flood(ctx, x, y, w);
    case 'gantry': return gantry(ctx, x, y, w, g);
  }
}

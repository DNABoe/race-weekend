// GrandTour roadside scenery, flat-shaded like the other games. Each drawer gets the ground anchor (x, y) and w = road half-width in px.
export const SOLID = { palm: 0.1, datepalm: 0.12, villa: 0.45, rock: 0.2, poplar: 0.1, oak: 0.18, maple: 0.18, pine: 0.14, cypress: 0.08, blossom: 0.18, stand: 0.7, barn: 0.45, hay: 0.12, tower: 0.4, chalet: 0.4, torii: 0.1, lantern: 0.06, wall: 0.5, keep: 0.3, casa: 0.45, wheel: 0.3, tree: 0.16, neon: 0.08, lamp: 0.04, fork: 0.42, hut: 0.2, umbrella: 0.05, flag: 0.03 };
const CROWD = ['#d64b3b', '#f2f2f2', '#2f5fa8', '#f2c14e', '#26282c', '#e88a3a', '#6aa84f'];
const box = (c, x, y, w, h, f) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
const disc = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, Math.max(0.5, r), 0, 6.283); c.fill(); };
const poly = (c, f, ...p) => { c.fillStyle = f; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); };
const dim = (n, day, nite) => (n ? nite : day);

function windows(c, L, T, W, H, cols, rows, n, seed, lit) {
  for (let i = 0; i < rows; i++) for (let k = 0; k < cols; k++) {
    const on = n && ((i * 7 + k * 3 + seed) % 5 > 1);
    box(c, L + W * (0.12 + k * (0.8 / cols)), T + H * (0.08 + i * (0.86 / rows)), W * (0.5 / cols), H * (0.5 / rows), n ? (on ? lit : '#2a3142') : 'rgba(40,60,80,0.55)');
  }
}
function canopy(c, x, y, s, cols) { [[0, -0.95, 0.42, 0], [-0.25, -0.72, 0.32, 1], [0.25, -0.75, 0.3, 1], [0.05, -1.15, 0.28, 2], [-0.1, -0.88, 0.22, 2]].forEach(([dx, dy, rr, k]) => disc(c, x + dx * s, y + dy * s, rr * s, cols[k])); }

export function drawScenery(c, sp, x, y, w, n, t) {
  const v = sp.v ?? 0.5;
  switch (sp.kind) {
    case 'palm': case 'datepalm': {
      const s = w * (sp.kind === 'palm' ? 0.8 : 0.55) * (0.85 + v * 0.3); if (s < 2) return;
      c.strokeStyle = dim(n, '#8a6d4a', '#2d2419'); c.lineWidth = Math.max(1, s * 0.05);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + s * 0.14, y - s * 0.6, x + s * 0.05, y - s * 1.1); c.stroke();
      c.fillStyle = dim(n, sp.kind === 'palm' ? '#4b7a33' : '#5e7a3a', '#1b2b16');
      for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (k - 3.5) * 0.5; c.beginPath(); c.ellipse(x + s * 0.05 + Math.cos(a) * s * 0.28, y - s * 1.1 + Math.sin(a) * s * 0.17 + s * 0.06, s * 0.3, s * 0.055, a, 0, 6.283); c.fill(); }
      return;
    }
    case 'oak': case 'maple': case 'blossom': case 'tree': case 'shrub': {
      const s = w * (sp.kind === 'shrub' ? 0.22 : 0.6) * (0.8 + v * 0.4); if (s < 2) return;
      if (sp.kind !== 'shrub') box(c, x - s * 0.06, y - s * 0.55, s * 0.12, s * 0.55, dim(n, '#5b4632', '#231c15'));
      const P = { oak: ['#3a6329', '#4a7a34', '#5c9140'], maple: ['#b8452a', '#d0612f', '#e68a3c'], blossom: ['#e7a3b8', '#f1bccb', '#fbd9e3'], tree: ['#24402a', '#2c4f33', '#355c3b'], shrub: ['#4d6f39', '#5b7f43', '#6b8f4e'] }[sp.kind];
      canopy(c, x, y + (sp.kind === 'shrub' ? s * 0.55 : 0), s, n ? P.map(() => '#1a2a1e') : P);
      if (sp.kind === 'blossom' && !n && s > 10) for (let k = 0; k < 7; k++) disc(c, x + (Math.sin(k * 2.3 + v * 9) * 0.35) * s, y - s * (0.75 + Math.cos(k * 1.7) * 0.25), s * 0.035, '#ffffff');
      return;
    }
    case 'poplar': case 'cypress': {
      const s = w * (sp.kind === 'poplar' ? 1.05 : 0.8) * (0.85 + v * 0.3); if (s < 3) return;
      box(c, x - s * 0.03, y - s * 0.12, s * 0.06, s * 0.12, dim(n, '#5b4632', '#231c15'));
      c.fillStyle = dim(n, sp.kind === 'poplar' ? '#3f6e30' : '#2e4f2a', '#16241a'); c.beginPath(); c.ellipse(x, y - s * 0.6, s * (sp.kind === 'poplar' ? 0.16 : 0.11), s * 0.5, 0, 0, 6.283); c.fill();
      c.fillStyle = dim(n, sp.kind === 'poplar' ? '#4f8438' : '#3b6234', '#1c2c20'); c.beginPath(); c.ellipse(x - s * 0.04, y - s * 0.66, s * 0.07, s * 0.36, 0, 0, 6.283); c.fill();
      return;
    }
    case 'pine': {
      const s = w * 0.85 * (0.8 + v * 0.4); if (s < 3) return;
      box(c, x - s * 0.04, y - s * 0.15, s * 0.08, s * 0.15, dim(n, '#4f3b2a', '#1f1812'));
      const g = dim(n, ['#24472c', '#2c5434', '#356040'], ['#101c14', '#13221a', '#16281e']);
      for (let k = 0; k < 3; k++) poly(c, g[k], x - s * (0.32 - k * 0.07), y - s * (0.15 + k * 0.28), x + s * (0.32 - k * 0.07), y - s * (0.15 + k * 0.28), x, y - s * (0.6 + k * 0.3));
      return;
    }
    case 'rock': { const s = w * 0.3 * (0.7 + v * 0.6); if (s < 2) return; c.fillStyle = dim(n, '#8c8a84', '#2e2e30'); c.beginPath(); c.ellipse(x, y - s * 0.35, s, s * 0.45, 0, Math.PI, 0); c.fill(); c.fillStyle = dim(n, '#a6a39b', '#38383a'); c.beginPath(); c.ellipse(x - s * 0.25, y - s * 0.5, s * 0.45, s * 0.22, 0, Math.PI, 0); c.fill(); return; }
    case 'yacht': {
      const s = w * 0.5 * (0.7 + v * 0.6); if (s < 3) return;
      poly(c, dim(n, '#f4f4f2', '#7c8290'), x - s * 0.5, y - s * 0.15, x + s * 0.5, y - s * 0.15, x + s * 0.38, y, x - s * 0.4, y);
      box(c, x - s * 0.02, y - s * 0.95, s * 0.03, s * 0.8, '#8b8f96');
      poly(c, dim(n, '#ffffff', '#9aa0aa'), x + s * 0.02, y - s * 0.92, x + s * 0.42, y - s * 0.2, x + s * 0.02, y - s * 0.2);
      return;
    }
    case 'villa': case 'casa': case 'chalet': case 'barn': {
      const W = w * (sp.kind === 'barn' ? 1.1 : 1.0) * (0.85 + v * 0.3), H = W * (sp.kind === 'chalet' ? 0.5 : 0.55), L = x - W / 2; if (W < 5) return;
      const wallC = { villa: '#f1ece2', casa: ['#e0a458', '#d77a8a', '#7fb3c9', '#e8d27a'][Math.floor(v * 3.99)], chalet: '#a8743f', barn: '#a5372e' }[sp.kind];
      box(c, L, y - H, W, H, n ? '#2a2c34' : wallC);
      if (sp.kind === 'villa') poly(c, dim(n, '#c8673f', '#3a2a24'), L - W * 0.05, y - H, L + W * 1.05, y - H, L + W * 0.85, y - H - W * 0.18, L + W * 0.15, y - H - W * 0.18);
      if (sp.kind === 'chalet' || sp.kind === 'barn') poly(c, dim(n, sp.kind === 'barn' ? '#5a2a26' : '#5b3a22', '#24201e'), L - W * 0.08, y - H, L + W * 1.08, y - H, x, y - H - W * 0.4);
      if (sp.kind === 'casa') box(c, L - W * 0.03, y - H - W * 0.05, W * 1.06, W * 0.05, dim(n, '#f3eee4', '#3a3a40'));
      if (sp.kind === 'barn') { c.strokeStyle = dim(n, '#f2f2f2', '#6a6a70'); c.lineWidth = Math.max(1, W * 0.02); c.strokeRect(x - W * 0.15, y - H * 0.7, W * 0.3, H * 0.7); }
      else windows(c, L, y - H, W, H, 3, 2, n, Math.floor(v * 10), '#f4d58d');
      return;
    }
    case 'tower': {
      const W = w * 0.9 * (0.8 + v * 0.4), H = w * (1.6 + v * 2.2), L = x - W / 2; if (W < 4) return;
      box(c, L, y - H, W, H, n ? '#161c2c' : ['#8fa3b8', '#b7c2cc', '#7f93a6', '#c9cfd4'][Math.floor(v * 3.99)]);
      if (W > 10) windows(c, L, y - H, W, H, 4, Math.max(3, Math.round(H / W * 3)), n, Math.floor(v * 10), '#f4d58d');
      if (n && W > 10) box(c, L + W * 0.45, y - H - W * 0.25, W * 0.1, W * 0.25, '#ff3b3b');
      return;
    }
    case 'wall': case 'keep': {
      const W = w * (sp.kind === 'wall' ? 1.2 : 0.55), H = w * (sp.kind === 'wall' ? 0.45 : 1.1), L = x - W / 2; if (W < 4) return;
      const st = dim(n, '#c9a77a', '#4a3e34'); box(c, L, y - H, W, H, st);
      for (let k = 0; k < 5; k++) box(c, L + k * W / 5, y - H - W * 0.06, W / 10, W * 0.06, st);
      box(c, L, y - H * 0.55, W, Math.max(1, H * 0.04), dim(n, '#b08e62', '#3c322a'));
      if (sp.kind === 'keep') box(c, x - W * 0.08, y - H * 0.7, W * 0.16, H * 0.2, n ? '#f4d58d' : '#3c2f24');
      return;
    }
    case 'stand': {
      const W = w * 1.4, H = w * 0.62, L = x - W / 2; if (W < 5) return;
      box(c, L, y - H, W, H, dim(n, '#b9bdc3', '#3a3e46'));
      const rows = Math.max(2, Math.min(7, Math.round(H / 7)));
      for (let i = 0; i < rows; i++) { const yy = y - H * 0.1 - (i + 1) * (H * 0.75 / rows); box(c, L + W * 0.04, yy, W * 0.92, H * 0.6 / rows, dim(n, '#6f7886', '#2c3240')); if (W > 60) for (let k = 0; k < 20; k++) box(c, L + W * 0.06 + k / 20 * W * 0.88, yy + 1, Math.max(1, W * 0.014), H * 0.3 / rows, CROWD[(i * 5 + k * 3) % 7]); }
      box(c, L - W * 0.03, y - H * 1.08, W * 1.06, Math.max(1, H * 0.07), dim(n, '#e7e9ec', '#5a5f68'));
      return;
    }
    case 'hedge': { const W = w * 0.8, H = w * 0.16; if (W < 4) return; box(c, x - W / 2, y - H, W, H, dim(n, '#3f6b2e', '#16241a')); box(c, x - W / 2, y - H, W, H * 0.3, dim(n, '#4f7d38', '#1a2a1e')); return; }
    case 'hay': { const s = w * 0.16; if (s < 2) return; disc(c, x, y - s, s, dim(n, '#d8b45a', '#4a4030')); c.strokeStyle = dim(n, '#b8943e', '#3a3226'); c.lineWidth = Math.max(0.5, s * 0.1); c.beginPath(); c.arc(x, y - s, s * 0.55, 0, 6.283); c.stroke(); return; }
    case 'hut': { const W = w * 0.5, H = W * 0.75, L = x - W / 2; if (W < 4) return; const cols = ['#e86a5a', '#4aa3c9', '#f2c14e', '#7cc48b']; for (let k = 0; k < 4; k++) box(c, L + k * W / 4, y - H, W / 4, H, n ? '#2a2c34' : cols[(k + Math.floor(v * 4)) % 4]); poly(c, dim(n, '#f4f4f4', '#3a3a40'), L - W * 0.08, y - H, L + W * 1.08, y - H, x, y - H - W * 0.3); return; }
    case 'umbrella': { const s = w * 0.36; if (s < 3) return; box(c, x - s * 0.02, y - s * 0.9, s * 0.04, s * 0.9, '#d8d8d8'); for (let k = 0; k < 4; k++) poly(c, n ? '#3a3a40' : (k % 2 ? '#ffffff' : ['#e8564a', '#2f8fd8', '#f2c14e'][Math.floor(v * 2.99)]), x, y - s * 1.05, x - s * 0.5 + k * s * 0.25, y - s * 0.8, x - s * 0.25 + k * s * 0.25, y - s * 0.8); return; }
    case 'grass': { const s = w * 0.2; if (s < 2) return; c.strokeStyle = dim(n, '#a39a5c', '#3a3626'); c.lineWidth = Math.max(0.6, s * 0.06); c.beginPath(); for (let k = -3; k <= 3; k++) { c.moveTo(x + k * s * 0.12, y); c.lineTo(x + k * s * 0.22, y - s * (0.7 + (k & 1) * 0.3)); } c.stroke(); return; }
    case 'flag': { const s = w * 0.7; if (s < 4) return; box(c, x - s * 0.01, y - s, Math.max(1, s * 0.02), s, '#9aa0a8'); const cols = [['#d22f38', '#ffffff', '#2f5fa8'], ['#f28c28', '#ffffff', '#f28c28']][v > 0.5 ? 1 : 0]; cols.forEach((col, k) => box(c, x, y - s + k * s * 0.08, s * 0.32, s * 0.08, col)); return; }
    case 'agave': { const s = w * 0.28; if (s < 2) return; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.32; poly(c, dim(n, k % 2 ? '#6f9a7a' : '#5f8a6a', '#1e2a22'), x - s * 0.06, y, x + s * 0.06, y, x + Math.cos(a) * s, y + Math.sin(a) * s); } return; }
    case 'torii': {
      const W = w * 0.9, H = w * 0.8, col = dim(n, '#d0352c', '#4a1c1a'); if (W < 5) return;
      box(c, x - W * 0.36, y - H, W * 0.07, H, col); box(c, x + W * 0.29, y - H, W * 0.07, H, col);
      box(c, x - W * 0.5, y - H * 1.05, W, H * 0.09, col); box(c, x - W * 0.42, y - H * 0.8, W * 0.84, H * 0.06, col);
      return;
    }
    case 'lantern': { const s = w * 0.3; if (s < 3) return; const g = dim(n, '#9c9a94', '#3a3a3c'); box(c, x - s * 0.08, y - s * 0.6, s * 0.16, s * 0.6, g); box(c, x - s * 0.22, y - s * 0.85, s * 0.44, s * 0.25, n ? '#f4c86a' : g); poly(c, g, x - s * 0.32, y - s * 0.85, x + s * 0.32, y - s * 0.85, x, y - s * 1.05); return; }
    case 'wheel': {
      const R = w * 1.6, cy = y - R * 1.15; if (R < 8) return;
      c.strokeStyle = dim(n, '#c9ced6', '#8a92a6'); c.lineWidth = Math.max(1, R * 0.03); c.beginPath(); c.arc(x, cy, R, 0, 6.283); c.stroke();
      c.lineWidth = Math.max(0.5, R * 0.01); c.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + t * 0.1; c.moveTo(x, cy); c.lineTo(x + Math.cos(a) * R, cy + Math.sin(a) * R); } c.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + t * 0.1; disc(c, x + Math.cos(a) * R, cy + Math.sin(a) * R, R * 0.06, n ? ['#ff5fa2', '#5fd4f5', '#f4d58d'][k % 3] : '#e8564a'); }
      poly(c, dim(n, '#9aa0a8', '#3a3e46'), x - R * 0.35, y, x + R * 0.35, y, x, cy);
      return;
    }
    case 'neon': {
      const s = w * 1.3, bw = s * 0.62, bh = s * 0.22; if (s < 8) return;
      box(c, x - s * 0.02, y - s * 0.75, s * 0.04, s * 0.75, '#3a3e46');
      const col = ['#ff4fa3', '#45d6ff', '#ffd23f', '#7cff6b'][Math.floor(v * 3.99)], word = ['MOTEL', 'DINER', 'ARCADE', 'CASINO'][Math.floor(v * 3.99)];
      if (n) { c.fillStyle = col + '33'; c.fillRect(x - bw * 0.65, y - s * 0.75 - bh * 1.3, bw * 1.3, bh * 1.6); }
      box(c, x - bw / 2, y - s * 0.75 - bh, bw, bh, '#120a1e');
      c.strokeStyle = col; c.lineWidth = Math.max(1, bh * 0.06); c.strokeRect(x - bw / 2 + 2, y - s * 0.75 - bh + 2, bw - 4, bh - 4);
      if (bw > 40) { c.fillStyle = col; c.font = `700 ${Math.round(bh * 0.5)}px Rajdhani, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(word, x, y - s * 0.75 - bh / 2); }
      return;
    }
    case 'rail': { const W = w * 0.36, H = w * 0.09; if (W < 3) return; box(c, x - W / 2, y - H, W, H * 0.45, dim(n, '#c9ccd1', '#5a5e66')); box(c, x - Math.max(0.5, W * 0.03), y - H, Math.max(1, W * 0.06), H, '#7d828a'); return; }
    case 'lamp': {
      const H = w * 0.95; if (H < 6) return;
      const side = sp.o > 0 ? -1 : 1;
      box(c, x - Math.max(0.5, H * 0.012), y - H, Math.max(1, H * 0.024), H, '#5d636c');
      box(c, x, y - H, side * H * 0.22, Math.max(1, H * 0.02), '#5d636c');
      if (n) { const lx = x + side * H * 0.2, g = c.createRadialGradient(lx, y - H, 0, lx, y - H, H * 0.35); g.addColorStop(0, 'rgba(255,226,160,0.55)'); g.addColorStop(1, 'rgba(255,226,160,0)'); c.fillStyle = g; c.fillRect(lx - H * 0.35, y - H * 1.35, H * 0.7, H * 0.7); }
      box(c, x + side * H * 0.22 - H * 0.04 * (side < 0 ? 1 : 0), y - H, H * 0.05, H * 0.03, n ? '#fff4d0' : '#e8e8e8');
      return;
    }
  }
}

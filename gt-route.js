// GrandTour route: a 5-stage pyramid of 15 themed sections (fork left/right after each stage, 5 finishes),
// inspired by F1 venues. Holds the themes and builds each section's road segments and roadside scenery.
export const SEG = 200, LANES = [-0.66, 0, 0.66], SECTION = 1000, FORK = 140, GOAL = 110;
export const rnd = s => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const SAND = ['#e3cf9f', '#e9d6a7'], GRASS = ['#5f9a45', '#68a34c'];

export const THEMES = {
  monaco: { name: 'Monaco Coast', tod: 'day', sky: ['#3f8fd8', '#9fd0f0', '#e6f3f7'], back: 'sea', far: '#8db1c9', near: '#5e8a52', gL: ['#6b9a48', '#73a24f'], gR: ['#1f7fb0', '#2484b6'], sea: 1, L: [['palm', 0.45], ['villa', 0.3], ['rock', 0.15]], R: [['yacht', 0.1]], curvy: 0.8, hilly: 0.5 },
  monza: { name: 'Monza Parkland', tod: 'day', sky: ['#3d8ad6', '#9cc9ee', '#e9f3f8'], back: 'hills', far: '#86a68b', near: '#56804a', gL: ['#4f8a3a', '#58943f'], gR: ['#4f8a3a', '#58943f'], L: [['poplar', 0.5], ['oak', 0.25], ['stand', 0.04]], R: [['poplar', 0.5], ['hedge', 0.2], ['oak', 0.15]], curvy: 0.45, hilly: 0.2 },
  miami: { name: 'Miami Beach', tod: 'day', sky: ['#2f8fe0', '#8fd3f5', '#f2f7f0'], back: 'sea', far: '#9cc7dc', near: '#e7d3a0', gL: ['#1c8fc0', '#2097c8'], gR: SAND, sea: -1, L: [['yacht', 0.08]], R: [['palm', 0.5], ['hut', 0.18], ['umbrella', 0.2]], curvy: 0.5, hilly: 0.15 },
  spa: { name: 'Spa Forest', tod: 'day', sky: ['#7d8c99', '#aab7c1', '#d0d8de'], back: 'forest', far: '#5a6c63', near: '#3a4e40', gL: ['#3c6b3a', '#437440'], gR: ['#3c6b3a', '#437440'], fog: 1.6, L: [['pine', 0.75], ['rock', 0.08]], R: [['pine', 0.75], ['rock', 0.08]], curvy: 0.7, hilly: 1 },
  silverstone: { name: 'Silverstone Countryside', tod: 'day', sky: ['#5b98d0', '#a9cbe6', '#e3edf3'], back: 'hills', far: '#8aa58a', near: '#6d9461', gL: GRASS, gR: GRASS, L: [['oak', 0.35], ['hedge', 0.3], ['barn', 0.05], ['hay', 0.1]], R: [['oak', 0.35], ['hedge', 0.3], ['hay', 0.1]], curvy: 0.5, hilly: 0.4 },
  jeddah: { name: 'Jeddah Corniche', tod: 'dusk', sky: ['#2c2f5e', '#c26a6a', '#f3a86b'], back: 'city', far: '#5a4a6e', near: '#3e3552', gL: ['#2a4f7a', '#2d5582'], gR: ['#9a8f86', '#a1968c'], sea: 1, lamps: 1, L: [['palm', 0.3], ['tower', 0.25]], R: [['yacht', 0.06]], curvy: 0.6, hilly: 0.1 },
  alps: { name: 'Austrian Alps', tod: 'day', sky: ['#3a86d6', '#94c6ef', '#e9f4fb'], back: 'mountains', far: '#8a9db3', near: '#55744e', gL: ['#5f9446', '#679d4d'], gR: ['#5f9446', '#679d4d'], L: [['pine', 0.45], ['chalet', 0.08], ['rock', 0.12]], R: [['pine', 0.45], ['rock', 0.12]], curvy: 0.9, hilly: 1 },
  suzuka: { name: 'Suzuka Blossom', tod: 'day', sky: ['#7fb2e6', '#cfe3f5', '#fbeef2'], back: 'hills', far: '#9aa7b8', near: '#6f8e6a', gL: ['#6a9a52', '#72a259'], gR: ['#6a9a52', '#72a259'], L: [['blossom', 0.45], ['torii', 0.03], ['pine', 0.15]], R: [['blossom', 0.45], ['lantern', 0.08], ['pine', 0.15]], curvy: 0.85, hilly: 0.6 },
  baku: { name: 'Baku Old Town', tod: 'dusk', sky: ['#3a3566', '#c47a5e', '#f0b27a'], back: 'city', far: '#6b5262', near: '#4a3a48', gL: ['#b9a58a', '#c1ad92'], gR: ['#b9a58a', '#c1ad92'], lamps: 1, L: [['wall', 0.6], ['keep', 0.06]], R: [['wall', 0.6], ['keep', 0.05]], curvy: 0.75, hilly: 0.3 },
  zandvoort: { name: 'Zandvoort Dunes', tod: 'day', sky: ['#5b9bd5', '#a8cdea', '#eaf2f6'], back: 'dunes', far: '#cdbf98', near: '#b5a880', gL: SAND, gR: SAND, L: [['grass', 0.5], ['hut', 0.06], ['flag', 0.04]], R: [['grass', 0.5], ['flag', 0.04]], curvy: 0.6, hilly: 0.7 },
  montreal: { name: 'Montreal Island', tod: 'day', sky: ['#4a92d8', '#a4cdee', '#e7f2f8'], back: 'city', far: '#8796a8', near: '#6f8fa0', gL: ['#2f7fae', '#3386b5'], gR: ['#5c9446', '#649c4c'], sea: -1, L: [['yacht', 0.05]], R: [['maple', 0.45], ['oak', 0.2]], curvy: 0.55, hilly: 0.15 },
  mexico: { name: 'Mexico City Heights', tod: 'day', sky: ['#3d7fd0', '#9cc5ea', '#f1efe2'], back: 'volcano', far: '#8f8aa0', near: '#7a8a5a', gL: ['#9c9a5e', '#a5a365'], gR: ['#9c9a5e', '#a5a365'], L: [['agave', 0.3], ['cypress', 0.25], ['casa', 0.12]], R: [['agave', 0.3], ['cypress', 0.25], ['casa', 0.1]], curvy: 0.7, hilly: 0.8 },
  abudhabi: { name: 'Abu Dhabi Desert', tod: 'dusk', sky: ['#3b2a5a', '#d6704a', '#ffc37a'], back: 'dunes', far: '#b8754a', near: '#94593a', gL: ['#d4a76a', '#dbaf72'], gR: ['#d4a76a', '#dbaf72'], lamps: 1, L: [['datepalm', 0.18], ['shrub', 0.2]], R: [['datepalm', 0.18], ['tower', 0.05], ['shrub', 0.2]], curvy: 0.4, hilly: 0.5 },
  singapore: { name: 'Singapore Night', tod: 'night', sky: ['#05070f', '#0e1730', '#1d2b52'], back: 'city', far: '#18213a', near: '#111829', gL: ['#1c2230', '#202636'], gR: ['#1c2230', '#202636'], lamps: 1, L: [['tower', 0.4], ['wheel', 0.01], ['tree', 0.2]], R: [['tower', 0.4], ['tree', 0.2]], curvy: 0.75, hilly: 0.2 },
  vegas: { name: 'Las Vegas Strip', tod: 'night', sky: ['#0a0614', '#1c0f33', '#3a1d55'], back: 'city', far: '#221636', near: '#160e26', gL: ['#3b2d26', '#41322a'], gR: ['#3b2d26', '#41322a'], lamps: 1, L: [['neon', 0.3], ['tower', 0.3], ['palm', 0.15]], R: [['neon', 0.3], ['tower', 0.3], ['palm', 0.15]], curvy: 0.35, hilly: 0.1 }
};
Object.entries(THEMES).forEach(([k, t]) => { t.key = k; });

export const PYRAMID = [['monaco'], ['monza', 'miami'], ['spa', 'silverstone', 'jeddah'], ['alps', 'suzuka', 'baku', 'zandvoort'], ['montreal', 'mexico', 'abudhabi', 'singapore', 'vegas']];
export const next = (s, j) => (s < 4 ? [PYRAMID[s + 1][j], PYRAMID[s + 1][j + 1]] : null);
// Closest section to each real circuit, for the weekend challenge.
export const VENUE = { monaco: 'monaco', monza: 'monza', imola: 'monza', miami: 'miami', spa: 'spa', silverstone: 'silverstone', catalunya: 'silverstone', jeddah: 'jeddah', red_bull_ring: 'alps', hungaroring: 'alps', suzuka: 'suzuka', shanghai: 'suzuka', baku: 'baku', madring: 'baku', zandvoort: 'zandvoort', villeneuve: 'montreal', albert_park: 'montreal', rodriguez: 'mexico', americas: 'mexico', interlagos: 'mexico', yas_marina: 'abudhabi', bahrain: 'abudhabi', losail: 'abudhabi', marina_bay: 'singapore', vegas: 'vegas' };
export const where = key => { for (let s = 0; s < 5; s++) { const j = PYRAMID[s].indexOf(key); if (j >= 0) return [s, j]; } return [0, 0]; };

const ease = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
function pick(list, r) { let acc = 0; for (const [k, p] of list) { acc += p; if (r < acc) return k; } return null; }

// One section of road. end: 'fork' (two roads split apart) or 'goal'. prev: theme blended in over the first segments.
export function buildSection(key, stage, seed, o = {}) {
  const th = THEMES[key], R = i => rnd(seed * 1.37 + i * 7.13), end = o.end || 'fork', zB = end === 'fork' ? FORK + 20 : GOAL + 30, N = SECTION + (end === 'fork' ? FORK : GOAL);
  const curve = new Float32Array(N), y = new Float32Array(N);
  let i = 70, k = 0;
  while (i < N - zB) {
    if (R(k++) < 0.3) { i += 30 + Math.floor(R(k++) * 70); continue; }
    const len = 70 + Math.floor(R(k++) * 150), mag = (1.4 + R(k++) * 4.4 * th.curvy) * (R(k++) < 0.5 ? -1 : 1);
    for (let j = 0; j < len && i + j < N - zB; j++) { const u = j / len; curve[i + j] = mag * ease(u < 0.25 ? u / 0.25 : u > 0.75 ? (1 - u) / 0.25 : 1); }
    i += len;
  }
  const ph = [R(901), R(902), R(903)].map(v => v * 6.283), P1 = 260 + R(904) * 160, P2 = 120 + R(905) * 80, A = 3400 * th.hilly;
  for (let n = 0; n < N; n++) { const env = ease(n / 90) * ease((N - zB - n) / 90); y[n] = A * env * (0.55 * Math.sin(n / P1 * 6.283 + ph[0]) + 0.45 * Math.sin(n / P2 * 6.283 + ph[1])); }
  const segs = [];
  for (let n = 0; n < N; n++) segs.push({ curve: curve[n], y: y[n], theme: key, prev: o.prev || null, mix: o.prev ? ease(n / 90) : 1, split: 0, sprites: [], stage, sec: o.sec });
  const add = (n, kind, off, ex) => segs[n] && segs[n].sprites.push({ kind, o: off, ...ex });
  if (o.start) {
    add(14, 'arch', 0, { text: 'START' });
    for (let n = 0; n < 50; n += 3) { add(n, 'stand', -1.9); add(n, 'stand', 1.9); }
  } else add(10, 'arch', 0, { text: 'CHECKPOINT', cp: 1 });
  // Roadside scenery, a guard rail on the water side, street lamps after dark.
  for (let n = 20; n < N - (end === 'fork' ? FORK : 0); n++) {
    for (const side of [-1, 1]) {
      const list = side < 0 ? th.L : th.R, water = th.sea === side;
      if (water) segs[n].rail = side;
      if (th.lamps && n % 12 === (side < 0 ? 0 : 6)) add(n, 'lamp', side * 1.28);
      if (n % 2) continue;
      const kind = pick(list, R(n * 3 + (side < 0 ? 1 : 2)));
      if (!kind) continue;
      const far = kind === 'yacht' ? 2.6 + R(n * 5 + side) * 4 : kind === 'rail' ? 1.2 : 1.45 + R(n * 5 + side) * (kind === 'tower' || kind === 'neon' || kind === 'casa' || kind === 'villa' ? 0.9 : 2.2);
      add(n, kind, side * far, { v: R(n * 11 + side) });
    }
  }
  if (end === 'fork') {
    const f0 = N - FORK;
    for (let n = f0; n < N; n++) segs[n].split = 4.6 * Math.pow(ease((n - f0 - 8) / (FORK - 8)), 1.25);
    add(f0 + 22, 'fork', 0, { left: THEMES[o.left].name, right: THEMES[o.right].name });
    for (let n = f0; n < N; n += 2) for (const side of [-1, 1]) {
      const kind = pick(side < 0 ? th.L : th.R, R(n * 3 + 7 + side));
      if (kind && kind !== 'yacht' && kind !== 'rail') add(n, kind, side * (segs[n].split + 1.5 + R(n + side) * 1.6), { v: R(n * 13 + side) });
      if (n > f0 + 40 && n % 6 === 0) add(n, 'shrub', side * Math.max(0, segs[n].split - 1.5) * 0.5, { v: 0.5 });
    }
  } else {
    add(N - GOAL + 10, 'arch', 0, { text: 'GOAL', goal: 1 });
    for (let n = N - GOAL + 12; n < N; n += 3) { add(n, 'stand', -1.9); add(n, 'stand', 1.9); }
  }
  return segs;
}

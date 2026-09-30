// Bakes the ground layer into 512px chunk canvases with organic, noise-displaced terrain edges.
import { TS, T, TINFO, D } from '../world/map.js';
import { valueNoise, fbm, hash2, rgb, shade, mix, mulberry32 } from '../util.js';
import { Painter, OUTLINE } from '../painter.js';
import { OBJECTS } from '../data/objects.js';

export const CH = 32; // tiles per chunk edge
const SZ = CH * TS;

const C = (hex) => rgb(hex);
const P = (...hex) => hex.map(C);

const PAL = {
  grass: P('#4b8a2a', '#529431', '#5a9c36'), grassDk: C('#437d25'), grassLt: C('#6aac40'),
  dgrass: P('#3a6c22', '#40752a', '#467d2c'), dgrassDk: C('#325e1c'), dgrassLt: C('#528a34'),
  dirt: P('#8c6c40', '#83643a', '#957548'), dirtDk: C('#6e5230'), dirtLt: C('#a88858'),
  sand: P('#cfb872', '#d6c07c', '#dcc684'), sandDk: C('#c0a862'), sandLt: C('#e8d498'),
  cobble: P('#8a8883', '#83817b', '#8f8d87', '#7d7b75'), mortar: C('#686660'),
  wood: P('#8a5a2e', '#7e5129', '#936236'), woodGap: C('#4a2e16'),
  stonef: P('#76716a', '#6e6962', '#7d786f'), grout: C('#4e4a44'),
  snow: P('#dde6ee', '#e6edf3', '#eef3f8'), snowDk: C('#c8d6e2'), snowLt: C('#ffffff'),
  swamp: P('#435228', '#4a5a2e', '#526438'), swampDk: C('#3a4824'),
  bog: P('#34462c', '#3a4c30'), bogLt: C('#5a6a3a'),
  ash: P('#433830', '#4a3f36', '#52463c'), ashDk: C('#2a221c'), ashLt: C('#5e5248'),
  lava: P('#d84a16', '#e8641c', '#f08a24'), lavaLt: C('#ffd060'),
  ocean: P('#2a5592', '#2c5a98', '#30609f'), oceanLt: C('#4a7cb8'),
  water: P('#366aa8', '#3a6fb0', '#3e76b8'), waterLt: C('#5a8cc8'),
  bridge: P('#8a6034', '#946a3a', '#7e5830'), rail: C('#4e321a'),
  cave: P('#453c35', '#4b4139', '#51463d'), caveDk: C('#342c26'),
  tiles: P('#8b8780', '#a19d95'), sandf: P('#c9a867', '#c2a05e'), sandfG: C('#9a7a40'),
  farm: P('#6b4a2a', '#5a3c20'), sprout: C('#5a8a2a'),
  ditch: P('#2a231d', '#30281f'),
  ice: P('#aad3ea', '#b6dcf0'), iceLt: C('#e0f2fc'),
  void: C('#0a0908'),
};

const WALLS = {
  [T.WALL]: { top: P('#a29d92', '#958f85', '#aba69b'), front: P('#6d675e', '#625c54', '#736d63'), mortar: C('#3f3a35'), edge: C('#3a3630') },
  [T.WALL_DARK]: { top: P('#7a776e', '#6e6b63', '#808078'), front: P('#4e4b45', '#46443f', '#55524b'), mortar: C('#2e2c28'), edge: C('#26241f'), moss: C('#4a6a2a') },
  [T.WALL_WOOD]: { top: P('#8a5a2e', '#7e5129', '#936236'), front: P('#6e4424', '#63401f', '#77492a'), mortar: C('#3a2210'), edge: C('#2e1a0c'), logs: true },
  [T.WALL_SAND]: { top: P('#d8bc7c', '#d0b474', '#e0c486'), front: P('#b8985a', '#ae8e52', '#c0a062'), mortar: C('#8a6a38'), edge: C('#6a5028') },
  [T.CAVE_WALL]: { top: P('#3a302a', '#342b25', '#40362f'), front: P('#2e2620', '#28211c', '#342b24'), mortar: null, edge: C('#1a1410'), rough: true },
  [T.WALL_ICE]: { top: P('#d8eef8', '#cfe8f4', '#e2f4fc'), front: P('#a8d0e8', '#9cc6e0', '#b2d8ee'), mortar: C('#7aa8c8'), edge: C('#5a88a8') },
};

const CRISP = new Uint8Array(64); for (let i = 0; i < 64; i++) CRISP[i] = TINFO[i] && TINFO[i].crisp ? 1 : 0;
const isWaterT = (t) => t === T.OCEAN || t === T.WATER || t === T.SWAMPWATER;
const isPathT = (t) => t === T.DIRT || t === T.COBBLE;
const isVeg = (t) => t === T.GRASS || t === T.DARKGRASS || t === T.SWAMP;

// Low-frequency noise sampled on a coarse per-chunk grid and bilinearly interpolated (big speedup).
let CX0 = 0, CY0 = 0, CSZ = 0;
const grids = new Map();
function lowNoise(seed, px, py, scale, oct = 2) {
  const key = seed * 1000 + scale;
  let g = grids.get(key);
  const step = Math.max(2, Math.floor(scale / 5));
  const n = Math.ceil((CSZ + 8) / step) + 2;
  if (!g) {
    g = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = CX0 - 4 + i * step, y = CY0 - 4 + j * step;
      g[j * n + i] = oct > 1 ? fbm(x / scale, y / scale, seed, oct) : valueNoise(x / scale, y / scale, seed);
    }
    grids.set(key, g);
  }
  const fx = (px - (CX0 - 4)) / step, fy = (py - (CY0 - 4)) / step;
  let i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= n - 1 || j >= n - 1) return oct > 1 ? fbm(px / scale, py / scale, seed, oct) : valueNoise(px / scale, py / scale, seed);
  const tx = fx - i, ty = fy - j, k = j * n + i;
  const a = g[k], b = g[k + 1], c = g[k + n], d = g[k + n + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

function pick(pal, n) { return pal[Math.max(0, Math.min(pal.length - 1, Math.floor(n * pal.length)))]; }

function tex(t, px, py, world) {
  const lx = px & 15, ly = py & 15;
  const h = hash2(px, py, 1);
  switch (t) {
    case T.GRASS: {
      const n = lowNoise(5, px, py, 40);
      if (h < 0.07) return PAL.grassDk;
      if (h > 0.965) return PAL.grassLt;
      return pick(PAL.grass, (n - 0.25) * 1.9);
    }
    case T.DARKGRASS: {
      const n = lowNoise(6, px, py, 36);
      if (h < 0.08) return PAL.dgrassDk;
      if (h > 0.97) return PAL.dgrassLt;
      return pick(PAL.dgrass, (n - 0.25) * 1.9);
    }
    case T.DIRT: {
      const n = lowNoise(7, px, py, 20, 1);
      if (h < 0.05) return PAL.dirtDk;
      if (h > 0.975) return PAL.dirtLt;
      return pick(PAL.dirt, n);
    }
    case T.SAND: {
      const n = lowNoise(8, px, py, 30);
      if (Math.sin(px * 0.3 + py * 0.12 + n * 9) > 0.9) return PAL.sandDk;
      if (h > 0.975) return PAL.sandLt;
      if (h < 0.03) return PAL.sandDk;
      return pick(PAL.sand, n);
    }
    case T.COBBLE: {
      const row = Math.floor(py / 6), off = (row & 1) * 4;
      const cx = (px + off) % 8, cy = py % 6;
      if (cx === 0 || cy === 0) return PAL.mortar;
      const col = Math.floor((px + off) / 8);
      const base = PAL.cobble[Math.floor(hash2(col, row, 3) * 4)];
      if (cx === 1 && cy === 1) return PAL.cobbleHi[PAL.cobble.indexOf(base)];
      return base;
    }
    case T.WOOD: case T.DOCK: {
      const row = py >> 2;
      if ((py & 3) === 3) return PAL.woodGap;
      if ((px + row * 7) % 24 === 0) return PAL.woodGap;
      const b = PAL.wood[Math.floor(hash2(row, Math.floor((px + row * 7) / 24), 4) * 3)];
      if (t === T.DOCK && (lx === 0 || lx === 15) && (ly === 0 || ly === 15)) return PAL.rail;
      return h < 0.06 ? PAL.woodGap : b;
    }
    case T.STONEFLOOR: {
      const row = py >> 3, off = (row & 1) * 4;
      if (((px + off) & 7) === 0 || (py & 7) === 0) return PAL.grout;
      return PAL.stonef[Math.floor(hash2((px + off) >> 3, row, 5) * 3)];
    }
    case T.SNOW: {
      const n = lowNoise(9, px, py, 34);
      if (h < 0.04) return PAL.snowDk;
      if (h > 0.985) return PAL.snowLt;
      return pick(PAL.snow, n);
    }
    case T.SWAMP: {
      const n = lowNoise(10, px, py, 18);
      if (n > 0.68) return PAL.swampDk;
      if (h < 0.06) return PAL.swampDk;
      return pick(PAL.swamp, n);
    }
    case T.SWAMPWATER: {
      if (h > 0.95) return PAL.bogLt;
      return pick(PAL.bog, lowNoise(11, px, py, 12, 1));
    }
    case T.ASH: {
      const n = lowNoise(12, px, py, 30);
      if (Math.abs(lowNoise(13, px, py, 11, 1) - 0.5) < 0.025) return PAL.ashDk;
      if (h < 0.05) return PAL.ashDk;
      if (h > 0.975) return PAL.ashLt;
      return pick(PAL.ash, n);
    }
    case T.LAVA: {
      const n = lowNoise(14, px, py, 14);
      if (h > 0.97) return PAL.lavaLt;
      return pick(PAL.lava, n);
    }
    case T.OCEAN: {
      const n = lowNoise(15, px, py, 60);
      if (Math.sin(px * 0.22 + py * 0.07 + n * 14) > 0.965 && hash2(px >> 3, py >> 2, 16) > 0.5) return PAL.oceanLt;
      return pick(PAL.ocean, n);
    }
    case T.WATER: {
      const n = lowNoise(17, px, py, 30);
      if (Math.sin(px * 0.3 + py * 0.1 + n * 12) > 0.965) return PAL.waterLt;
      return pick(PAL.water, n);
    }
    case T.BRIDGE: {
      const tx = px >> 4, ty = py >> 4;
      const horiz = !isWaterT(world.t(tx - 1, ty)) || !isWaterT(world.t(tx + 1, ty)) || world.t(tx - 1, ty) === T.BRIDGE || world.t(tx + 1, ty) === T.BRIDGE;
      if (horiz) {
        if ((isWaterT(world.t(tx, ty - 1)) && ly < 2) || (isWaterT(world.t(tx, ty + 1)) && ly > 13)) return (lx & 7) === 0 ? C('#2e1e0e') : PAL.rail;
        if (px % 3 === 2) return PAL.woodGap;
        return PAL.bridge[Math.floor(px / 3) % 3];
      }
      if ((isWaterT(world.t(tx - 1, ty)) && lx < 2) || (isWaterT(world.t(tx + 1, ty)) && lx > 13)) return (ly & 7) === 0 ? C('#2e1e0e') : PAL.rail;
      if (py % 3 === 2) return PAL.woodGap;
      return PAL.bridge[Math.floor(py / 3) % 3];
    }
    case T.CAVE: {
      if (h < 0.06) return PAL.caveDk;
      return pick(PAL.cave, lowNoise(18, px, py, 16));
    }
    case T.CARPET_RED: case T.CARPET_BLUE: {
      const red = t === T.CARPET_RED;
      const tx = px >> 4, ty = py >> 4;
      const base = C(red ? '#8e2222' : '#26428e'), pat = C(red ? '#a83434' : '#3454a4'), gold = C('#c8a030');
      const eL = world.t(tx - 1, ty) !== t, eR = world.t(tx + 1, ty) !== t, eU = world.t(tx, ty - 1) !== t, eD = world.t(tx, ty + 1) !== t;
      if ((eL && lx === 1) || (eR && lx === 14) || (eU && ly === 1) || (eD && ly === 14)) return gold;
      if ((eL && lx === 0) || (eR && lx === 15) || (eU && ly === 0) || (eD && ly === 15)) return C(red ? '#6a1616' : '#1a2e6a');
      if ((lx + ly) % 8 === 0 || (lx - ly + 16) % 8 === 0) return pat;
      return base;
    }
    case T.TILES: {
      if ((px & 7) === 0 || (py & 7) === 0) return PAL.grout;
      return PAL.tiles[((px >> 3) + (py >> 3)) & 1];
    }
    case T.SANDFLOOR: {
      if ((px & 7) === 0 || (py & 7) === 0) return PAL.sandfG;
      return PAL.sandf[Math.floor(hash2(px >> 3, py >> 3, 19) * 2)];
    }
    case T.FARMLAND: {
      if (h > 0.96 && (py & 3) < 2) return PAL.sprout;
      return PAL.farm[(py & 3) < 2 ? 0 : 1];
    }
    case T.DITCH: return pick(PAL.ditch, lowNoise(20, px, py, 6, 1));
    case T.ICE: {
      if ((px + py) % 13 === 0 && h > 0.3) return PAL.iceLt;
      return pick(PAL.ice, lowNoise(21, px, py, 20, 1));
    }
    case T.VOID: return PAL.void;
  }
  const w = WALLS[t];
  if (w) return wallTex(w, t, px, py, world);
  return PAL.void;
}

function wallTex(w, t, px, py, world) {
  const tx = px >> 4, ty = py >> 4, lx = px & 15, ly = py & 15;
  const isW = (x, y) => TINFO[world.t(x, y)].wall;
  const frontH = isW(tx, ty + 1) ? 0 : 7;
  const h = hash2(px, py, 22);
  if (ly >= 16 - frontH) {
    const fy = ly - (16 - frontH);
    if (fy === frontH - 1) return C('#1e1a16');
    if (w.rough) {
      const n = lowNoise(23, px, py, 5);
      return n > 0.62 ? C('#3e342c') : pick(w.front, n);
    }
    if (w.logs) { if (fy % 3 === 2) return w.mortar; return pick(w.front, hash2(tx, fy / 3 | 0, 24)); }
    const row = Math.floor(fy / 3), off = (row & 1) * 3;
    if (fy % 3 === 2 || (px + off) % 6 === 0) return w.mortar;
    if (w.moss && h > 0.85) return w.moss;
    return w.front[Math.floor(hash2((px + off) / 6 | 0, row + ty * 5, 25) * 3)];
  }
  // top face
  if ((lx === 0 && !isW(tx - 1, ty)) || (lx === 15 && !isW(tx + 1, ty)) || (ly === 0 && !isW(tx, ty - 1))) return w.edge;
  if (ly === 1 && !isW(tx, ty - 1) && !w.rough) return w.topHi;
  if (w.rough) {
    const n = lowNoise(26, px, py, 6);
    if (h > 0.93) return C('#4a3e34');
    return pick(w.top, n);
  }
  if (w.moss && h > 0.9) return w.moss;
  const row = py >> 2, off = (row & 1) * 3;
  if ((py & 3) === 0 || ((px + off) % 6) === 0) return w.topLine;
  return w.top[Math.floor(hash2((px + off) / 6 | 0, row, 27) * 3)];
}
const toHex = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('');
for (const w of Object.values(WALLS)) { w.topHi = C(shade(toHex(w.top[2]), 0.18)); w.topLine = C(shade(toHex(w.top[1]), -0.12)); }
PAL.cobbleHi = PAL.cobble.map((c) => C(shade(toHex(c), 0.15)));

// ---------------------------------------------------------------- decor sprites
let DECOR = null;
function buildDecor() {
  const mk = (fn, w = 16, h = 16, ol = true) => { const p = new Painter(w, h); fn(p); if (ol) p.outline(OUTLINE); return p.canvas(); };
  const flower = (col, center) => (v) => mk((p) => {
    const r = mulberry32(v * 13 + col.length);
    for (let i = 0; i < 3; i++) {
      const x = 3 + Math.round(r() * 9), y = 4 + Math.round(r() * 8);
      p.set(x, y + 1, '#3a7a2a'); p.set(x, y + 2, '#3a7a2a');
      p.set(x - 1, y, col); p.set(x + 1, y, col); p.set(x, y - 1, col); p.set(x, y + 1, col); p.set(x, y, center);
    }
  }, 16, 16, false);
  DECOR = {
    [D.FLOWER_W]: [0, 1, 2].map(flower('#f4f4f0', '#e8d040')),
    [D.FLOWER_B]: [0, 1, 2].map(flower('#4a6ae8', '#c8d8ff')),
    [D.FLOWER_Y]: [0, 1, 2].map(flower('#f0d040', '#d87a20')),
    [D.FLOWER_R]: [0, 1, 2].map(flower('#d8303a', '#f0d040')),
    [D.TUFT]: [0, 1, 2].map((v) => mk((p) => { const x = 5 + v * 2; for (let i = 0; i < 4; i++) p.line(x + i, 12, x + i + (i - 1.5) * 0.8, 7 + (i % 2), i % 2 ? '#2e6a1c' : '#5aa03a'); }, 16, 16, false)),
    [D.PEBBLES]: [0, 1].map((v) => mk((p) => { p.ball(5 + v * 3, 10, 2, 1.5, '#8a857c'); p.ball(10 - v, 7, 1.5, 1.2, '#9a958c'); }, 16, 16)),
    [D.MUSHROOM]: [0, 1].map((v) => mk((p) => { p.rect(7, 9, 2, 3, '#f0e8d8'); p.ball(8, 8, 3, 2, v ? '#d8a040' : '#d8302a'); p.set(7, 7, '#ffffff'); p.set(9, 8, '#ffffff'); })),
    [D.BONES]: [0].map(() => mk((p) => { p.line(4, 11, 11, 8, '#e8e4d8'); p.ball(6, 6, 2, 1.7, '#e8e4d8'); p.set(5, 6, '#2a2a2a'); p.set(7, 6, '#2a2a2a'); })),
    [D.SNOWTUFT]: [0, 1].map((v) => mk((p) => { p.ball(6 + v * 3, 10, 3, 1.6, '#ffffff'); p.ball(10 - v, 8, 2, 1.2, '#f4f8fc'); }, 16, 16, false)),
    [D.DEADBUSH]: [0, 1].map((v) => mk((p) => { p.line(8, 13, 5, 7 + v, '#6a5a40'); p.line(8, 13, 11, 6, '#6a5a40'); p.line(8, 13, 8, 5, '#5a4a30'); p.line(6, 9, 3, 8, '#6a5a40'); })),
    [D.LILY]: [0, 1].map((v) => mk((p) => { p.ellipse(8, 9, 3.5, 2.5, '#3a8a3a'); p.set(8, 9, '#2a6a2a'); p.set(9, 8, '#2a6a2a'); if (v) { p.set(7, 8, '#f0c0d0'); p.set(8, 7, '#f8e0e8'); } })),
    [D.REEDS]: [0, 1].map((v) => mk((p) => { for (let i = 0; i < 4; i++) { const x = 5 + i * 2; p.vline(x, 5 + (i % 2) * 2, 14, '#6a8a3a'); if (i % 2 === v) { p.set(x, 4 + (i % 2) * 2, '#6a4a2a'); p.set(x, 5 + (i % 2) * 2, '#6a4a2a'); } } }, 16, 16, false)),
    [D.SHELL]: [0].map(() => mk((p) => { p.ball(8, 9, 2.5, 2, '#f0d8c8'); p.line(7, 8, 8, 10, '#c8a898'); })),
    [D.CRACKS]: [0, 1].map((v) => mk((p) => { p.line(3, 5 + v * 4, 8, 9, '#e0561b'); p.line(8, 9, 13, 7 - v, '#f08a24'); p.set(8, 9, '#ffd060'); }, 16, 16, false)),
    [D.FERN]: [0, 1].map((v) => mk((p) => { for (let i = -2; i <= 2; i++) p.line(8, 13, 8 + i * 2.5, 6 + Math.abs(i), i % 2 ? '#2e7a2a' : '#4a9a3a'); })),
    [D.LEAVES]: [0, 1].map((v) => mk((p) => { const r = mulberry32(v + 50); for (let i = 0; i < 5; i++) p.set(2 + Math.round(r() * 12), 2 + Math.round(r() * 12), ['#c8641e', '#d8a030', '#a84a1a'][i % 3]); }, 16, 16, false)),
    [D.EMBERS]: [0].map(() => mk((p) => { p.set(6, 8, '#f08a24'); p.set(10, 11, '#e0561b'); p.set(8, 5, '#ffd060'); }, 16, 16, false)),
  };
}

// ---------------------------------------------------------------- chunk bake
export function bakeChunk(world, cx, cy) {
  const W = world.W, H = world.H;
  if (!DECOR) buildDecor();
  const x0 = cx * SZ, y0 = cy * SZ;
  const M = SZ + 4;
  CX0 = x0; CY0 = y0; CSZ = SZ; grids.clear();
  const tb = new Uint8Array(M * M);
  // displacement field on a 4px grid, bilinearly interpolated inline
  const GS = 4, GN = Math.ceil(M / GS) + 2;
  const gdx = new Float32Array(GN * GN), gdy = new Float32Array(GN * GN);
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const x = x0 - 2 + i * GS, y = y0 - 2 + j * GS;
    gdx[j * GN + i] = (valueNoise(x / 8, y / 8, 11) - 0.5) * 11;
    gdy[j * GN + i] = (valueNoise(x / 8, y / 8, 12) - 0.5) * 11;
  }
  const ground = world.ground;
  for (let j = 0; j < M; j++) {
    const py = y0 + j - 2;
    const gj = (j / GS) | 0, fy = (j - gj * GS) / GS;
    const ty0 = Math.floor(py / TS);
    for (let i = 0; i < M; i++) {
      const px = x0 + i - 2;
      const tx = Math.floor(px / TS);
      const t0 = tx >= 0 && ty0 >= 0 && tx < W && ty0 < H ? ground[ty0 * W + tx] : T.VOID;
      let t = t0;
      if (!CRISP[t0]) {
        const gi = (i / GS) | 0, fx = (i - gi * GS) / GS, k = gj * GN + gi;
        const dx = gdx[k] + (gdx[k + 1] - gdx[k]) * fx + (gdx[k + GN] - gdx[k]) * fy + (gdx[k] - gdx[k + 1] - gdx[k + GN] + gdx[k + GN + 1]) * fx * fy;
        const dy = gdy[k] + (gdy[k + 1] - gdy[k]) * fx + (gdy[k + GN] - gdy[k]) * fy + (gdy[k] - gdy[k + 1] - gdy[k + GN] + gdy[k + GN + 1]) * fx * fy;
        const sx = Math.floor((px + dx) / TS), sy = Math.floor((py + dy) / TS);
        const t1 = sx >= 0 && sy >= 0 && sx < W && sy < H ? ground[sy * W + sx] : T.VOID;
        t = CRISP[t1] ? t0 : t1;
      }
      tb[j * M + i] = t;
    }
  }
  // per-tile wall-shadow flags: 1 = wall above, 2 = wall to the left
  const shadow = new Uint8Array(CH * CH);
  for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
    const tx = cx * CH + i, ty = cy * CH + j;
    shadow[j * CH + i] = (TINFO[world.t(tx, ty - 1)].wall ? 1 : 0) | (TINFO[world.t(tx - 1, ty)].wall ? 2 : 0);
  }
  const img = new ImageData(SZ, SZ);
  const d = img.data;
  for (let j = 0; j < SZ; j++) {
    const py = y0 + j;
    for (let i = 0; i < SZ; i++) {
      const px = x0 + i;
      const k = (j + 2) * M + (i + 2);
      const t = tb[k];
      let col = tex(t, px, py, world);
      let r = col[0], g = col[1], b = col[2];
      if (!TINFO[t].wall && t !== T.VOID) {
        const tl = tb[k - 1], tr = tb[k + 1], tu = tb[k - M], td = tb[k + M];
        if (isWaterT(t)) {
          if (!isWaterT(tl) || !isWaterT(tr) || !isWaterT(tu) || !isWaterT(td)) { r += (255 - r) * 0.4; g += (255 - g) * 0.4; b += (255 - b) * 0.35; }
          else if (!isWaterT(tb[k - 2]) || !isWaterT(tb[k + 2]) || !isWaterT(tb[k - 2 * M]) || !isWaterT(tb[k + 2 * M])) { r += (255 - r) * 0.14; g += (255 - g) * 0.14; b += (255 - b) * 0.12; }
        } else if (t === T.LAVA) {
          if (tl !== t || tr !== t || tu !== t || td !== t) { r = 58; g = 26; b = 10; }
        } else if (t !== T.BRIDGE && t !== T.DOCK) {
          if (isWaterT(tl) || isWaterT(tr) || isWaterT(tu) || isWaterT(td)) { r = r * 0.55 + 20; g = g * 0.55 + 16; b = b * 0.55 + 8; }
          else if (isPathT(t) && (isVeg(tl) || isVeg(tr) || isVeg(tu) || isVeg(td))) { r *= 0.78; g *= 0.78; b *= 0.78; }
          else if (t === T.SAND && (isVeg(tu) || isVeg(tl))) { r *= 0.9; g *= 0.9; b *= 0.85; }
          else if (isVeg(t) && (tu === T.SNOW)) { r = 200; g = 214; b = 224; }
        }
        // wall shadows (light from the top-left)
        const lx = px & 15, ly = py & 15;
        const sh = shadow[(j >> 4) * CH + (i >> 4)];
        if (sh & 1 && ly < 4) { const f = 0.62 + ly * 0.09; r *= f; g *= f; b *= f; }
        else if (sh & 2 && lx < 3) { const f = 0.72 + lx * 0.08; r *= f; g *= f; b *= f; }
      }
      const o = (j * SZ + i) * 4;
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
  }
  const c = document.createElement('canvas');
  c.width = SZ; c.height = SZ;
  const ctx = c.getContext('2d');
  ctx.putImageData(img, 0, 0);
  // decor
  for (let ty = cy * CH; ty < (cy + 1) * CH && ty < H; ty++)
    for (let tx = cx * CH; tx < (cx + 1) * CH && tx < W; tx++) {
      const dd = world.decor[ty * W + tx];
      if (!dd) continue;
      const set = DECOR[dd];
      if (!set) continue;
      const v = Math.floor(hash2(tx, ty, 30) * set.length);
      const ox = Math.round((hash2(tx, ty, 31) - 0.5) * 6), oy = Math.round((hash2(tx, ty, 32) - 0.5) * 6);
      ctx.drawImage(set[v], (tx - cx * CH) * TS + ox, (ty - cy * CH) * TS + oy);
    }
  return c;
}

// ---------------------------------------------------------------- minimap / world map
export const MAP_SCALE = 4;
export function bakeMap(world) {
  const S = MAP_SCALE;
  const W = world.W, H = world.H;
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W * S, H * S);
  const d = img.data;
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      const t = world.ground[ty * W + tx];
      const base = rgb(TINFO[t].map);
      const o = world.obj(tx, ty);
      for (let j = 0; j < S; j++)
        for (let i = 0; i < S; i++) {
          let [r, g, b] = base;
          const n = hash2(tx * S + i, ty * S + j, 40) * 0.1 - 0.05;
          if (!TINFO[t].wall) { r *= 1 + n; g *= 1 + n; b *= 1 + n; }
          if (TINFO[t].wall && t !== T.CAVE_WALL) {
            // walls as thin white lines on the side facing open ground
            const open = (dx, dy) => !TINFO[world.t(tx + dx, ty + dy)].wall;
            const edge = (i === 0 && open(-1, 0)) || (i === S - 1 && open(1, 0)) || (j === 0 && open(0, -1)) || (j === S - 1 && open(0, 1));
            if (!edge) { const f = rgb('#5a5650'); r = f[0]; g = f[1]; b = f[2]; }
          }
          const q = ((ty * S + j) * W * S + tx * S + i) * 4;
          d[q] = r; d[q + 1] = g; d[q + 2] = b; d[q + 3] = 255;
        }
      if (o && !o.removed && o.x === tx && o.y === ty) {
        const def = OBJECTS[o.type];
        let col = def.map;
        if (def.wc) col = '#1e4414';
        if (def.mine) col = def.ore ? '#7a7066' : '#6a625a';
        if (col) {
          const [r, g, b] = rgb(col);
          for (let j = 1; j < S - 1 + (o.h - 1) * S; j++) for (let i = 1; i < S - 1 + (o.w - 1) * S; i++) {
            const q = ((ty * S + j) * W * S + tx * S + i) * 4;
            d[q] = r; d[q + 1] = g; d[q + 2] = b;
          }
        }
      }
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

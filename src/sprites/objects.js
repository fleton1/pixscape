// Procedural sprites for world objects. Each entry: { c: canvas, frames?: [canvas] }.
import { Painter, OUTLINE } from '../painter.js';
import { shade, mix, hash2, mulberry32 } from '../util.js';

const WOOD = '#8a5a2e', WOOD_D = '#5e3b1c', WOOD_L = '#a8743e';
const STONE = '#8a857c', STONE_D = '#5e5a54', STONE_L = '#aaa59a';

function canopy(p, cx, cy, r, col, seed, opts = {}) {
  const rnd = mulberry32(seed);
  const blobs = opts.blobs || [[0, 0, 1, 0.9], [-0.55, 0.3, 0.6, 0.55], [0.55, 0.3, 0.6, 0.55], [0, -0.45, 0.7, 0.6], [-0.3, -0.2, 0.55, 0.5], [0.35, -0.15, 0.55, 0.5]];
  for (const [bx, by, rx, ry] of blobs) p.ball(cx + bx * r, cy + by * r, rx * r, ry * r, col, { hi: shade(col, 0.22), sh: shade(col, -0.2), dk: shade(col, -0.38) });
  // leaf texture
  for (let i = 0; i < r * r * 0.9; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.95;
    const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.9);
    if (p.alpha(x, y)) p.set(x, y, rnd() < 0.5 ? shade(col, -0.28) : shade(col, 0.28));
  }
  if (opts.fruit) for (let i = 0; i < 6; i++) { const x = Math.round(cx + (rnd() - 0.5) * r * 1.4), y = Math.round(cy + (rnd() - 0.4) * r); if (p.alpha(x, y)) { p.set(x, y, opts.fruit); } }
}

function trunk(p, x, y0, y1, w, col = WOOD) {
  p.rect(x, y0, w, y1 - y0, col);
  p.vline(x, y0, y1 - 1, shade(col, 0.2));
  p.vline(x + w - 1, y0, y1 - 1, shade(col, -0.3));
  p.set(x - 1, y1 - 1, col); p.set(x + w, y1 - 1, col);
}

function makeTree(type, v) {
  const seed = v * 977 + type.length * 31;
  let p;
  switch (type) {
    case 'tree': p = new Painter(26, 32); trunk(p, 11, 20, 31, 4); canopy(p, 13, 13, 10.5, v ? '#4f8f2f' : '#468a2a', seed); break;
    case 'oak': p = new Painter(30, 34); trunk(p, 13, 21, 33, 5, '#6e4a26'); p.line(12, 24, 9, 21, '#6e4a26'); canopy(p, 15, 13, 12.5, '#5a8a26', seed, { fruit: '#8aa83a' }); break;
    case 'willow': {
      p = new Painter(30, 34); trunk(p, 13, 20, 33, 4, '#6a5a3a');
      canopy(p, 15, 12, 11, '#6a9a3a', seed);
      const rnd = mulberry32(seed + 5);
      for (let i = 0; i < 14; i++) { const x = 5 + Math.round(rnd() * 20); const y0 = 10 + Math.round(rnd() * 6); p.vline(x, y0, y0 + 9 + Math.round(rnd() * 6), rnd() < 0.5 ? '#8ab84a' : '#5a8a2a'); }
      break;
    }
    case 'maple': p = new Painter(28, 34); trunk(p, 12, 21, 33, 4, '#5a3a22'); canopy(p, 14, 13, 11.5, v ? '#c8641e' : '#d07a24', seed, { fruit: '#e8b040' }); break;
    case 'yew': p = new Painter(32, 38); trunk(p, 14, 25, 37, 5, '#5a3a22'); canopy(p, 16, 15, 14, '#2e5a24', seed, { blobs: [[0, 0.1, 1, 0.85], [0, -0.55, 0.75, 0.55], [-0.6, 0.35, 0.55, 0.5], [0.6, 0.35, 0.55, 0.5]] }); break;
    case 'teak': p = new Painter(30, 36); trunk(p, 13, 22, 35, 5, '#7a5a34'); canopy(p, 15, 14, 12.5, v ? '#5a7a2a' : '#628a30', seed, { blobs: [[0, 0, 1, 0.75], [-0.5, -0.3, 0.6, 0.5], [0.5, -0.3, 0.6, 0.5]] }); break;
    case 'mahogany': p = new Painter(32, 38); trunk(p, 14, 24, 37, 5, '#6a2a18'); p.line(13, 27, 9, 23, '#6a2a18'); p.line(18, 27, 22, 23, '#6a2a18'); canopy(p, 16, 14, 13.5, v ? '#3a6a24' : '#44762a', seed, { fruit: '#8a3a2a' }); break;
    case 'heartwood': p = new Painter(36, 42); trunk(p, 16, 26, 41, 6, '#4a2a1a'); p.line(18, 30, 18, 38, '#e0501a'); p.set(17, 33, '#ffb040'); canopy(p, 18, 15, 15, v ? '#8a2a1a' : '#9a3a1a', seed, { fruit: '#ffb040' }); break;
    case 'magic_tree': p = new Painter(32, 38); trunk(p, 14, 25, 37, 5, '#4a4a6a'); canopy(p, 16, 15, 13, '#3a9a9a', seed, { fruit: '#c8f8ff' }); break;
    case 'jungle_tree': p = new Painter(32, 36); trunk(p, 14, 23, 35, 5, '#5a4020'); canopy(p, 16, 14, 13, '#2e7a2a', seed); break;
    case 'pine': {
      p = new Painter(22, 34); trunk(p, 9, 27, 33, 4, '#5a3a22');
      for (let i = 0; i < 4; i++) {
        const y = 4 + i * 6, w = 4 + i * 2.6;
        p.poly([[11, y - 2], [11 + w, y + 7], [11 - w, y + 7]], i % 2 ? '#2e5a34' : '#346a3a');
        p.line(11, y - 2, 11 - w, y + 7, '#4a8a4a');
        p.hline(Math.round(11 - w + 1), Math.round(11 + w - 1), y + 7, '#eef4f8');
        p.hline(Math.round(11 - w / 2), Math.round(11 + w / 2 - 1), y + 6, '#f8fbff');
      }
      break;
    }
    case 'palm': {
      p = new Painter(30, 36);
      for (let y = 14; y < 35; y++) { const x = Math.round(14 + Math.sin((y - 14) / 9) * 2); p.rect(x, y, 3, 1, (y % 3) ? '#8a6a3a' : '#6a4a2a'); }
      const fr = [[-12, 4], [-9, -4], [0, -8], [9, -4], [12, 5], [4, 8], [-5, 8]];
      for (const [dx, dy] of fr) { p.line(15, 13, 15 + dx, 13 + dy, '#3a8a2a'); p.line(15, 14, 15 + dx, 14 + dy, '#2a6a1e'); p.set(15 + dx, 15 + dy, '#2a6a1e'); }
      p.ball(15, 14, 2, 1.5, '#6a4a2a');
      break;
    }
    case 'dead_tree': {
      p = new Painter(24, 32); trunk(p, 10, 12, 31, 4, '#5a4a3a');
      p.line(12, 14, 4, 5, '#5a4a3a'); p.line(12, 15, 5, 6, '#4a3a2a'); p.line(12, 12, 19, 3, '#5a4a3a'); p.line(13, 13, 20, 4, '#4a3a2a');
      p.line(7, 8, 5, 2, '#5a4a3a'); p.line(17, 6, 21, 5, '#5a4a3a'); p.line(12, 12, 12, 2, '#5a4a3a');
      break;
    }
    case 'swamp_tree': {
      p = new Painter(30, 34); trunk(p, 13, 18, 33, 5, '#3a3226');
      p.line(14, 20, 6, 30, '#3a3226'); p.line(16, 20, 23, 31, '#3a3226');
      canopy(p, 15, 11, 10, '#4a5a2a', seed);
      const rnd = mulberry32(seed);
      for (let i = 0; i < 10; i++) { const x = 6 + Math.round(rnd() * 18); p.vline(x, 12, 16 + Math.round(rnd() * 8), '#6a7a4a'); }
      break;
    }
  }
  p.outline(OUTLINE);
  return p.canvas();
}

function rockSprite(ore, variant, empty, sand) {
  const p = new Painter(18, 16);
  const base = sand ? '#c4a466' : '#7e786e';
  p.ball(9, 9, 8, 6.5, base, { hi: shade(base, 0.25), sh: shade(base, -0.2), dk: shade(base, -0.4) });
  p.ball(5 + variant, 11, 4, 3.5, shade(base, -0.05));
  p.line(8, 5, 11, 9, shade(base, -0.35));
  if (ore && !empty) {
    const rnd = mulberry32(variant * 17 + ore.length);
    for (let i = 0; i < 6; i++) {
      const x = 4 + Math.round(rnd() * 10), y = 5 + Math.round(rnd() * 7);
      p.set(x, y, ore); p.set(x + 1, y, shade(ore, 0.35)); p.set(x, y + 1, shade(ore, -0.25));
    }
  }
  p.outline(OUTLINE);
  return p.canvas();
}

function build(fn, w, h, outline = true) {
  const p = new Painter(w, h);
  fn(p);
  if (outline) p.outline(OUTLINE);
  return p.canvas();
}

function fenceSprite(mask) {
  // mask bits: 1=N 2=E 4=S 8=W
  const p = new Painter(16, 20);
  const post = (x, y) => { p.rect(x, y, 3, 10, WOOD); p.vline(x, y, y + 9, WOOD_L); p.rect(x, y, 3, 1, WOOD_L); };
  if (mask & 2) { p.rect(8, 9, 8, 2, WOOD); p.rect(8, 14, 8, 2, WOOD); p.hline(8, 15, 9, WOOD_L); }
  if (mask & 8) { p.rect(0, 9, 8, 2, WOOD); p.rect(0, 14, 8, 2, WOOD); p.hline(0, 7, 9, WOOD_L); }
  if (mask & 1) { p.rect(7, 0, 2, 10, WOOD_D); }
  if (mask & 4) { p.rect(7, 12, 2, 8, WOOD_D); }
  post(6, 8);
  p.outline(OUTLINE);
  return p.canvas();
}

function doorSprite(open, vertical, gate, sand) {
  const p = new Painter(16, 18);
  const col = gate ? WOOD : sand ? '#9a6a3a' : '#7a4a22';
  if (!vertical) {
    if (!open) {
      p.rect(1, 2, 14, 16, col);
      for (let x = 1; x < 15; x += 3) p.vline(x, 2, 17, shade(col, -0.3));
      p.hline(1, 14, 5, shade(col, -0.35)); p.hline(1, 14, 13, shade(col, -0.35));
      p.set(11, 10, '#c8b060'); p.hline(1, 14, 2, shade(col, 0.3));
    } else {
      p.rect(0, 2, 3, 16, col); p.vline(0, 2, 17, shade(col, 0.3));
    }
  } else {
    if (!open) { p.rect(6, 0, 4, 18, col); p.vline(6, 0, 17, shade(col, 0.3)); p.hline(6, 9, 6, shade(col, -0.3)); p.hline(6, 9, 12, shade(col, -0.3)); }
    else { p.rect(6, 1, 10, 3, col); p.hline(6, 15, 1, shade(col, 0.3)); }
  }
  p.outline(OUTLINE);
  return p.canvas();
}

export function extraStalls(S) {
  S.stall_fur = [stall('#8a6a3a', (p) => { for (const x of [5, 12, 19, 25]) p.ball(x, 15, 3, 2, '#c8a878'); })];
  S.stall_silver = [stall('#8a8a9a', (p) => { for (const x of [5, 12, 19, 25]) { p.ellipse(x, 15, 2.5, 1.5, '#e8ecf0'); p.set(x - 1, 14, '#ffffff'); } })];
  S.stall_spice = [stall('#c8501a', (p) => { for (const [x, c] of [[5, '#c8501a'], [12, '#e8b020'], [19, '#8a3a1a'], [25, '#e0d060']]) p.ball(x, 15, 3, 2, c); })];
}
function stall(awning, goods) {
  return build((p) => {
    p.rect(2, 10, 2, 14, WOOD_D); p.rect(28, 10, 2, 14, WOOD_D);
    p.rect(1, 14, 30, 8, WOOD); p.hline(1, 30, 14, WOOD_L);
    for (let i = 0; i < 8; i++) p.rect(1 + i * 4, 2, 4, 9, i % 2 ? '#f0ece0' : awning);
    for (let i = 0; i < 8; i++) p.rect(1 + i * 4, 11, 4, 2, i % 2 ? '#d8d4c8' : shade(awning, -0.25));
    goods(p);
  }, 32, 26);
}

export const OBJ_SPRITES = {};

export function buildObjectSprites() {
  const S = OBJ_SPRITES;
  for (const t of ['tree', 'oak', 'willow', 'teak', 'maple', 'mahogany', 'yew', 'magic_tree', 'heartwood', 'pine', 'palm', 'jungle_tree', 'dead_tree', 'swamp_tree']) S[t] = [makeTree(t, 0), makeTree(t, 1)];
  S.stump = [build((p) => { p.ellipse(8, 11, 5, 3.5, '#6a4a26'); p.rect(3, 8, 10, 4, '#6a4a26'); p.ellipse(8, 8, 5, 2.5, '#c8a060'); p.ellipse(8, 8, 2.5, 1.2, '#a8804a'); }, 16, 16)];
  const ores = { copper_rock: '#c8743a', tin_rock: '#c8c3b8', iron_rock: '#8a4a2a', coal_rock: '#1a1816', gold_rock: '#f0c83a', mithril_rock: '#5a6ec8', adamant_rock: '#4a9a5a', rune_rock: '#4ac8d8', silver_rock: '#eef0f4' };
  for (const [k, c] of Object.entries(ores)) S[k] = [rockSprite(c, 0), rockSprite(c, 1)];
  S.clay_rock = [build((p) => { p.ball(9, 10, 8, 5.5, '#a08a68'); p.ball(6, 11, 4, 3, '#b8a07a'); p.line(7, 7, 12, 9, '#7a6448'); }, 18, 16)];
  S.gem_rock = [0, 1].map((v) => { const c = rockSprite('#c040c0', v); return c; });
  S.gem_rock.forEach((c, v) => { const ctx = c.getContext('2d'); for (const [x, y, col] of [[5, 7, '#40a0ff'], [11, 9, '#40e060'], [8, 11, '#ff4040']]) { ctx.fillStyle = col; ctx.fillRect(x + v, y, 1, 1); } });
  // stations
  S.sink = [build((p) => { p.rect(1, 6, 14, 8, WOOD); p.rect(3, 4, 10, 4, STONE_L); p.rect(4, 5, 8, 2, '#4a7ab8'); p.rect(7, 0, 2, 5, '#8a8a8a'); p.rect(7, 0, 4, 1, '#8a8a8a'); }, 16, 16)];
  S.water_pump = [build((p) => { p.rect(6, 4, 4, 14, '#4a5a6a'); p.rect(9, 6, 5, 2, '#4a5a6a'); p.line(6, 5, 1, 1, '#3a3a3a'); p.ellipse(8, 18, 6, 2, STONE); p.set(13, 9, '#6aa0e8'); }, 16, 20)];
  S.sand_pit = [build((p) => { p.ellipse(8, 9, 7, 5, '#b89a58'); p.ellipse(8, 8, 6, 4, '#e0c880'); p.set(6, 7, '#f0dca0'); p.set(10, 9, '#c8a868'); }, 16, 16, false)];
  S.spinning_wheel = [build((p) => { p.ellipse(10, 8, 7, 7, WOOD_D); p.ellipse(10, 8, 5.5, 5.5, null); for (let a = 0; a < 6; a++) p.line(10, 8, Math.round(10 + Math.cos(a) * 6), Math.round(8 + Math.sin(a) * 6), WOOD); p.rect(1, 14, 18, 3, WOOD); p.rect(2, 17, 2, 3, WOOD_D); p.rect(16, 17, 2, 3, WOOD_D); p.ball(3, 12, 2, 2, '#f0ece0'); }, 20, 20)];
  S.pottery_wheel = [build((p) => { p.rect(3, 10, 12, 8, WOOD_D); p.ellipse(9, 9, 7, 2.5, STONE); p.ball(9, 6, 3, 3, '#b8906a'); p.rect(8, 2, 2, 3, '#b8906a'); }, 18, 18)];
  S.pottery_oven = [build((p) => { p.ball(10, 12, 9, 9, '#9a5a3a'); p.rect(1, 14, 18, 8, '#9a5a3a'); p.ellipse(10, 15, 4, 3.5, '#2a1a10'); p.ellipse(10, 16, 3, 2, '#ff8a30'); p.rect(14, 0, 3, 6, STONE_D); }, 20, 22)];
  S.churn = [build((p) => { p.poly([[4, 6], [12, 6], [13, 18], [3, 18]], WOOD); p.hline(3, 13, 9, '#4a4a4a'); p.hline(3, 13, 15, '#4a4a4a'); p.rect(7, 0, 2, 7, WOOD_D); p.rect(5, 0, 6, 1, WOOD_D); }, 16, 20)];
  S.potato_plant = [build((p) => { for (const [x, y] of [[4, 9], [8, 7], [12, 10]]) { p.ball(x, y, 3, 2.5, '#3a7a2a'); p.set(x, y - 1, '#6aa84a'); } p.set(6, 12, '#b8905a'); }, 16, 14)];
  S.tomato_plant = [build((p) => { p.rect(7, 2, 1, 14, '#6a4a2a'); p.ball(6, 7, 4, 4, '#3a7a2a'); p.ball(10, 10, 3.5, 3.5, '#3a7a2a'); for (const [x, y] of [[5, 6], [9, 9], [7, 11]]) { p.ball(x, y, 1.3, 1.3, '#e03028'); } }, 16, 18)];
  S.flax_plant = [build((p) => { for (let i = 0; i < 4; i++) { const x = 3 + i * 3; p.vline(x, 5 + (i % 2), 14, '#6a8a3a'); p.ball(x, 4 + (i % 2), 1.3, 1.3, '#6a8ad8'); } }, 16, 16)];
  S.grape_vine = [build((p) => { p.rect(1, 2, 2, 20, WOOD_D); p.rect(15, 2, 2, 20, WOOD_D); p.hline(1, 16, 3, WOOD); p.ball(9, 9, 7, 6, '#3a7a2a'); for (const [x, y] of [[5, 10], [11, 8], [8, 13], [13, 12]]) { p.ball(x, y, 1.6, 2, '#7a3a9a'); } }, 18, 22)];
  S.manhole = [build((p) => { p.ellipse(8, 8, 7, 5, '#4a4a48'); p.ellipse(8, 8, 6, 4, '#6a6a68'); p.hline(4, 12, 7, '#4a4a48'); p.hline(4, 12, 9, '#4a4a48'); }, 16, 16, false)];
  S.mine_shaft = [build((p) => { p.rect(0, 4, 20, 16, '#1a1410'); p.rect(0, 0, 3, 20, WOOD_D); p.rect(17, 0, 3, 20, WOOD_D); p.rect(0, 0, 20, 3, WOOD); p.rect(6, 6, 2, 14, WOOD); p.rect(12, 6, 2, 14, WOOD); for (let y = 8; y < 20; y += 3) p.hline(6, 13, y, WOOD_L); }, 20, 20)];
  const caveMouth = (rock, dark, glow) => build((p) => { p.ball(16, 18, 15, 14, rock); p.ball(8, 20, 7, 8, shade(rock, -0.1)); p.ball(25, 21, 6, 7, shade(rock, 0.08)); p.ellipse(16, 24, 8, 8, dark); p.rect(8, 24, 17, 8, dark); if (glow) { p.ellipse(16, 28, 5, 3, glow); } }, 32, 32);
  S.cave_entrance = [caveMouth('#6e685e', '#0a0806')];
  S.ice_cave_entrance = [caveMouth('#c8e0f0', '#1a2a3a', '#4a8ab8')];
  S.lava_cave_entrance = [caveMouth('#3a2a24', '#1a0a06', '#ff6020')];
  S.cave_exit = [caveMouth('#4a4238', '#e8e0b0')];
  S.stairs_down = [build((p) => { p.rect(0, 2, 16, 14, STONE_D); for (let i = 0; i < 5; i++) p.rect(1 + i, 3 + i * 2, 14 - i * 2, 2, shade(STONE, -i * 0.12)); }, 16, 16)];
  S.stairs_up = [build((p) => { p.rect(0, 0, 16, 16, STONE_D); for (let i = 0; i < 5; i++) p.rect(1 + i, 13 - i * 2.5, 14 - i * 2, 3, shade(STONE, 0.1 - i * 0.05)); }, 16, 16)];
  S.rope_down = [build((p) => { p.ellipse(8, 10, 7, 5, '#0a0806'); p.rect(7, 0, 2, 12, '#b89a58'); p.rect(5, 0, 6, 2, WOOD_D); }, 16, 16)];
  S.rope_up = [build((p) => { p.rect(7, 0, 2, 22, '#b89a58'); p.ball(8, 22, 2, 1.5, '#b89a58'); }, 16, 24)];
  S.chest_10 = [build((p) => { p.rect(1, 5, 14, 9, '#8a5a2a'); p.rect(1, 3, 14, 4, '#a06a3a'); p.hline(1, 14, 7, '#4a4a4a'); p.rect(7, 6, 2, 3, '#c8b060'); }, 16, 15)];
  S.chest_50 = [build((p) => { p.rect(1, 5, 14, 9, '#6a4a2a'); p.rect(1, 3, 14, 4, '#7a5a3a'); p.hline(1, 14, 7, '#8a8a8a'); p.vline(4, 3, 13, '#8a8a8a'); p.vline(11, 3, 13, '#8a8a8a'); p.rect(7, 6, 2, 3, '#c8c8c8'); }, 16, 15)];
  S.chest_tomb = [build((p) => { p.rect(1, 5, 14, 9, '#b8984a'); p.rect(1, 3, 14, 4, '#d8b860'); p.hline(1, 14, 7, '#6a4a1a'); p.rect(6, 6, 4, 4, '#2a8ab0'); }, 16, 15)];
  S.rocks_empty = [rockSprite(null, 0, true), rockSprite(null, 1, true)];
  S.boulder = [build((p) => { p.ball(10, 10, 9, 7.5, STONE); p.ball(6, 12, 5, 4, shade(STONE, -0.05)); p.line(9, 5, 13, 11, STONE_D); }, 20, 18)];
  S.cracked_sandstone = [build((p) => { p.ball(9, 9, 8, 6.5, '#c9a867'); p.line(5, 6, 9, 10, '#7a5a2a'); p.line(9, 10, 13, 8, '#7a5a2a'); p.set(9, 9, '#fff8c0'); }, 18, 16)];
  S.lava_rock = [build((p) => { p.ball(9, 9, 8, 6, '#2a2220'); p.line(4, 9, 9, 7, '#e0561b'); p.line(9, 7, 13, 11, '#f08a24'); }, 18, 16)];

  S.bank_booth = [build((p) => {
    p.rect(0, 8, 16, 12, WOOD); p.hline(0, 15, 8, WOOD_L); p.rect(0, 16, 16, 4, WOOD_D);
    p.rect(1, 0, 14, 9, '#3a3228'); p.rect(2, 1, 12, 6, '#6a88a0');
    for (let x = 3; x < 14; x += 2) p.vline(x, 1, 6, '#c8b060');
    p.rect(6, 11, 4, 3, '#e8c13a'); p.set(7, 12, '#8a6a10');
  }, 16, 20)];
  S.furnace = [build((p) => {
    p.rect(1, 4, 14, 18, STONE); for (let y = 6; y < 22; y += 3) p.hline(1, 14, y, STONE_D);
    p.rect(5, 0, 6, 5, STONE_D); p.rect(4, 12, 8, 7, '#2a1a10'); p.rect(5, 14, 6, 5, '#f08a24'); p.rect(6, 15, 4, 3, '#ffd060');
    p.hline(1, 14, 4, STONE_L);
  }, 16, 22)];
  S.anvil = [build((p) => { p.rect(5, 9, 6, 5, WOOD_D); p.rect(2, 4, 12, 3, '#4a4a50'); p.rect(0, 4, 3, 2, '#4a4a50'); p.rect(5, 7, 6, 2, '#3a3a40'); p.hline(2, 13, 4, '#7a7a80'); }, 16, 14)];
  S.range = [build((p) => { p.rect(1, 4, 14, 14, '#3a3a40'); p.hline(1, 14, 4, '#6a6a70'); p.rect(3, 12, 10, 4, '#e0561b'); p.rect(4, 13, 8, 2, '#ffb040'); p.ellipse(5, 6, 2.5, 1.5, '#1a1a1a'); p.ellipse(11, 6, 2.5, 1.5, '#1a1a1a'); p.rect(12, 0, 3, 4, '#2a2a30'); }, 16, 18)];
  const fireFrame = (f, camp) => build((p) => {
    if (camp) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.ball(8 + Math.cos(a) * 6, 13 + Math.sin(a) * 2.5, 1.8, 1.4, STONE); }
    p.line(3, 14, 13, 11, '#5a3a1e'); p.line(3, 11, 13, 14, '#6a4a26');
    const h = [8, 10, 9][f];
    p.poly([[4, 13], [8, 13 - h], [12, 13]], '#e0501a');
    p.poly([[5, 13], [7 + (f % 2), 13 - h + 3], [9, 13 - h + 1 + f], [11, 13]], '#f0901e');
    p.poly([[6, 13], [8, 13 - h + 5], [10, 13]], '#ffe070');
  }, 16, 16, false);
  S.fire = [fireFrame(0), fireFrame(1), fireFrame(2)]; S.fire.anim = true;
  S.campfire = [fireFrame(0, 1), fireFrame(1, 1), fireFrame(2, 1)]; S.campfire.anim = true;
  S.fireplace = [0, 1, 2].map((f) => build((p) => { p.rect(0, 2, 16, 14, STONE); p.hline(0, 15, 2, STONE_L); p.rect(3, 7, 10, 9, '#1a1210'); p.poly([[4, 16], [8, 16 - 6 - f], [12, 16]], '#f0901e'); p.poly([[6, 16], [8, 12 - f], [10, 16]], '#ffe070'); }, 16, 16)); S.fireplace.anim = true;
  S.altar = [build((p) => { p.rect(1, 6, 14, 10, STONE_L); p.rect(1, 6, 14, 3, '#f0f0f0'); p.rect(6, 9, 4, 5, '#d8b040'); p.rect(2, 1, 2, 5, '#f0e8d0'); p.rect(12, 1, 2, 5, '#f0e8d0'); p.set(2, 0, '#ffd040'); p.set(12, 0, '#ffd040'); }, 16, 16)];
  S.chaos_altar = [build((p) => { p.rect(1, 6, 14, 10, '#3a2a2a'); p.rect(1, 6, 14, 3, '#8a1a1a'); p.set(8, 11, '#e0501a'); p.rect(2, 1, 2, 5, '#6a1a1a'); p.rect(12, 1, 2, 5, '#6a1a1a'); }, 16, 16)];
  S.fountain = [build((p) => {
    p.ellipse(16, 20, 15, 11, STONE_D); p.ellipse(16, 19, 14, 10, STONE); p.ellipse(16, 19, 11.5, 7.5, '#3a74b8'); p.ellipse(13, 17, 5, 2.5, '#5a94d8');
    p.rect(14, 6, 4, 13, STONE); p.ellipse(16, 8, 5, 2, STONE_L); p.rect(15, 2, 2, 5, STONE_L); p.set(16, 1, '#8ac8ff'); p.set(15, 4, '#8ac8ff'); p.set(17, 5, '#8ac8ff');
  }, 32, 32)];
  S.well = [build((p) => { p.ellipse(8, 14, 7, 4.5, STONE); p.ellipse(8, 13, 5, 2.5, '#1a2a3a'); p.rect(1, 3, 2, 11, WOOD_D); p.rect(13, 3, 2, 11, WOOD_D); p.poly([[0, 4], [8, 0], [16, 4]], '#8a3a2a'); p.hline(3, 12, 6, WOOD); }, 16, 20)];
  S.signpost = [build((p) => { p.rect(7, 4, 2, 16, WOOD_D); p.poly([[2, 3], [13, 3], [15, 5], [13, 7], [2, 7]], WOOD_L); p.poly([[14, 9], [3, 9], [1, 11], [3, 13], [14, 13]], WOOD); }, 16, 20)];
  S.wild_sign = [build((p) => { p.rect(7, 8, 2, 12, WOOD_D); p.rect(1, 1, 14, 9, '#c8b890'); p.ball(8, 5, 2.5, 2.2, '#f0f0f0'); p.set(7, 5, '#1a1a1a'); p.set(9, 5, '#1a1a1a'); p.line(4, 8, 12, 2, '#b02020'); }, 16, 20)];
  S.table = [build((p) => { p.rect(1, 3, 14, 7, WOOD); p.hline(1, 14, 3, WOOD_L); p.rect(2, 10, 2, 4, WOOD_D); p.rect(12, 10, 2, 4, WOOD_D); p.set(5, 5, '#d8d0c0'); p.ellipse(10, 6, 2, 1, '#8a8a8a'); }, 16, 14)];
  S.long_table = [build((p) => { p.rect(1, 3, 30, 7, WOOD); p.hline(1, 30, 3, WOOD_L); for (const x of [2, 15, 28]) p.rect(x, 10, 2, 4, WOOD_D); p.ellipse(7, 6, 2.5, 1.2, '#c8c8c8'); p.set(7, 5, '#c0402a'); p.ellipse(16, 6, 2, 1, '#e8c13a'); p.ellipse(24, 6, 2.5, 1.2, '#c8c8c8'); p.set(24, 5, '#a8702a'); }, 32, 14)];
  S.chair = [build((p) => { p.rect(3, 0, 8, 7, WOOD_D); p.rect(3, 7, 8, 3, WOOD); p.rect(3, 10, 2, 3, WOOD_D); p.rect(9, 10, 2, 3, WOOD_D); }, 14, 14)];
  S.stool = [build((p) => { p.ellipse(6, 3, 4, 2, WOOD); p.rect(2, 4, 2, 5, WOOD_D); p.rect(8, 4, 2, 5, WOOD_D); }, 12, 10)];
  const shelf = (dark, goods) => build((p) => {
    p.rect(0, 0, 16, 20, dark ? '#3a3a2a' : WOOD_D); p.rect(1, 1, 14, 18, dark ? '#2a2a1a' : '#4a2e16');
    for (const y of [6, 12, 18]) p.hline(1, 14, y, dark ? '#4a4a3a' : WOOD);
    const rnd = mulberry32(dark ? 9 : goods ? 5 : 3);
    for (const y of [1, 7, 13]) for (let x = 1; x < 15; x += 2) {
      if (goods) { if (rnd() < 0.6) { p.ellipse(x + 0.5, y + 3.5, 1, 1.5, ['#c84a2a', '#e8d8b0', '#4a8ac8', '#6aa04a'][Math.floor(rnd() * 4)]); } }
      else p.rect(x, y + 1 + Math.round(rnd()), 2, 4, dark ? ['#3a4a2a', '#4a3a2a', '#2a3a3a'][Math.floor(rnd() * 3)] : ['#8a2a2a', '#2a4a8a', '#2a6a3a', '#8a6a2a', '#5a2a6a'][Math.floor(rnd() * 5)]);
    }
  }, 16, 20);
  S.bookshelf = [shelf(false)]; S.shelves = [shelf(false, true)]; S.mortmire_bookcase = [shelf(true)];
  S.bed = [build((p) => { p.rect(1, 0, 14, 20, WOOD_D); p.rect(2, 1, 12, 18, '#e8e4d8'); p.rect(3, 2, 10, 4, '#f8f8f8'); p.rect(2, 8, 12, 11, '#4a6a3a'); p.hline(2, 13, 8, '#6a8a5a'); }, 16, 20)];
  S.barrel = [build((p) => { p.ball(7, 8, 6, 7, '#8a5a2e'); p.hline(1, 12, 4, '#4a4a4a'); p.hline(1, 12, 11, '#4a4a4a'); p.ellipse(7, 2.5, 4, 1.5, '#6a4222'); }, 14, 16)];
  S.crate = [build((p) => { p.rect(1, 2, 13, 12, '#9a6a36'); p.rect(1, 2, 13, 1, WOOD_L); p.line(1, 2, 13, 13, '#6a4a22'); p.line(13, 2, 1, 13, '#6a4a22'); p.rect(1, 2, 1, 12, '#6a4a22'); p.rect(13, 2, 1, 12, '#6a4a22'); }, 15, 15)];
  S.sacks = [build((p) => { p.ball(5, 8, 4.5, 5, '#c8b890'); p.ball(10, 9, 4.5, 4.5, '#b8a880'); p.set(5, 3, '#8a7a5a'); }, 15, 14)];
  S.counter = [build((p) => { p.rect(0, 4, 16, 10, WOOD); p.hline(0, 15, 4, WOOD_L); p.rect(0, 5, 16, 1, WOOD_D); }, 16, 14)];
  S.throne = [build((p) => { p.rect(2, 0, 12, 14, '#c8a030'); p.rect(4, 2, 8, 10, '#a01a1a'); p.rect(1, 12, 14, 8, '#c8a030'); p.rect(3, 13, 10, 5, '#a01a1a'); p.set(8, 0, '#d82a2a'); p.set(3, 0, '#ffe080'); p.set(12, 0, '#ffe080'); }, 16, 22)];
  S.statue = [build((p) => { p.rect(1, 22, 14, 6, STONE_D); p.hline(1, 14, 22, STONE); p.ball(8, 5, 3, 3, STONE_L); p.rect(5, 8, 6, 8, STONE); p.rect(5, 16, 2, 6, STONE); p.rect(9, 16, 2, 6, STONE); p.line(12, 14, 12, 2, STONE_L); p.hline(10, 14, 11, STONE_D); p.rect(2, 9, 3, 5, STONE_D); }, 16, 28)];
  S.torch = [0, 1].map((f) => build((p) => { p.rect(7, 7, 2, 6, WOOD_D); p.rect(6, 6, 4, 2, '#4a4a4a'); p.poly([[6, 6], [8, 1 + f], [10, 6]], '#f0901e'); p.set(8, 4, '#ffe070'); p.set(8, 5, '#ffe070'); }, 16, 16)); S.torch.anim = true;
  S.banner_blue = [build((p) => { p.rect(4, 1, 8, 12, '#2a4a9a'); p.poly([[4, 13], [8, 15], [12, 13]], '#2a4a9a'); p.hline(3, 12, 1, '#c8a030'); p.ball(8, 7, 2, 2, '#e8e8f0'); p.set(8, 4, '#e8e8f0'); p.set(8, 10, '#e8e8f0'); }, 16, 16)];
  S.banner_red = [build((p) => { p.rect(4, 1, 8, 12, '#9a1a1a'); p.poly([[4, 13], [8, 15], [12, 13]], '#9a1a1a'); p.hline(3, 12, 1, '#c8a030'); p.ball(8, 7, 2, 2, '#e8c13a'); }, 16, 16)];
  S.candles = [build((p) => { p.rect(7, 6, 2, 12, '#8a6a2a'); p.hline(2, 13, 6, '#8a6a2a'); for (const x of [2, 7, 12]) { p.rect(x, 2, 2, 4, '#f0e8d0'); p.set(x, 1, '#ffd040'); } p.hline(4, 11, 17, '#8a6a2a'); }, 16, 18)];
  S.lamp_post = [build((p) => { p.rect(7, 6, 2, 18, '#2a2a30'); p.rect(4, 22, 8, 2, '#2a2a30'); p.rect(5, 1, 6, 6, '#2a2a30'); p.rect(6, 2, 4, 4, '#ffe080'); }, 16, 24)];
  for (let m = 0; m < 16; m++) S['fence_' + m] = [fenceSprite(m)];
  for (const o of [0, 1]) for (const v of [0, 1]) {
    S[`door_${o}_${v}`] = [doorSprite(!!o, !!v, false)];
    S[`gate_${o}_${v}`] = [doorSprite(!!o, !!v, true)];
  }
  S.stall_bakery = [stall('#c82a2a', (p) => { p.ball(6, 15, 3, 2, '#c8883a'); p.ball(13, 15, 3, 2, '#d89848'); p.rect(19, 13, 6, 3, '#f0e0e0'); p.rect(19, 12, 6, 1, '#e84a6a'); })];
  S.stall_silk = [stall('#7a2ab0', (p) => { p.rect(4, 13, 7, 3, '#e84a8a'); p.rect(12, 13, 7, 3, '#4a8ae8'); p.rect(20, 13, 7, 3, '#e8c83a'); })];
  S.stall_gem = [stall('#2a5ad8', (p) => { for (const [x, c] of [[5, '#2a5ad8'], [10, '#2ab04a'], [15, '#d82a3a'], [20, '#e8f0f8'], [25, '#a03ad8']]) { p.ball(x, 15, 1.8, 1.5, c); p.set(x - 1, 14, '#ffffff'); } })];
  S.stall_fish = [stall('#2a8a9a', (p) => { for (const x of [5, 12, 19, 25]) { p.ellipse(x, 15, 3, 1.3, '#8aa0b0'); p.set(x - 2, 15, '#1a1a1a'); } })];
  S.ladder_down = [build((p) => { p.ellipse(8, 9, 7, 6, '#1a1410'); p.rect(4, 3, 2, 8, WOOD); p.rect(10, 3, 2, 8, WOOD); for (const y of [4, 7, 10]) p.hline(6, 9, y, WOOD_D); }, 16, 16)];
  S.ladder_up = [build((p) => { p.rect(3, 0, 2, 22, WOOD); p.rect(11, 0, 2, 22, WOOD); for (let y = 2; y < 22; y += 4) p.hline(5, 10, y, WOOD_D); }, 16, 22)];
  S.trapdoor = [build((p) => { p.rect(1, 1, 14, 14, '#6a4222'); for (let x = 1; x < 15; x += 4) p.vline(x, 1, 14, '#4a2e16'); p.rect(6, 7, 4, 2, '#8a8a8a'); }, 16, 16)];
  S.tomb_door = [build((p) => {
    p.rect(0, 0, 32, 32, '#b8985a'); p.rect(2, 2, 28, 30, '#a08048');
    p.rect(6, 8, 20, 24, '#6a5028');
    p.ball(16, 18, 6, 5, '#2a6a7a'); p.line(16, 13, 16, 23, '#1a3a4a'); p.set(13, 16, '#e8c13a'); p.set(19, 16, '#e8c13a');
    for (let x = 2; x < 30; x += 4) p.set(x, 4, '#e8c13a');
  }, 32, 32)];
  S.pyramid = [build((p) => {
    const Wp = 400, Hp = 368, cx = Wp / 2, cy = Hp / 2;
    const base = [216, 188, 124];
    for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) {
      const dx = (x + 0.5 - cx) / (Wp / 2), dy = (y + 0.5 - cy) / (Hp / 2);
      const ax = Math.abs(dx), ay = Math.abs(dy);
      const r = Math.max(ax, ay);
      const steps = 11, sf = r * steps, st = Math.floor(sf), fr = sf - st;
      let f = ax > ay ? (dx > 0 ? -0.2 : 0.06) : (dy > 0 ? -0.08 : 0.14);
      if (Math.abs(ax - ay) < 0.006) f += dx < 0 && dy < 0 ? 0.2 : -0.25;
      if (fr < 0.07) f -= 0.28;
      else if (fr < 0.14) f += 0.1;
      else if ((((ax > ay ? x : y) + st * 7) % 12) === 0) f -= 0.1;
      f += (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) * 0.04;
      let c = base;
      if (r < 1 / steps) { c = [232, 193, 58]; f = ax > ay ? (dx > 0 ? -0.2 : 0.1) : (dy > 0 ? -0.05 : 0.25); }
      const k = f >= 0 ? f : f;
      const col = c.map((v) => Math.max(0, Math.min(255, f >= 0 ? v + (255 - v) * k : v * (1 + k))));
      p.set(x, y, col);
    }
  }, 400, 368, false)];
  extraStalls(S);
  S.chest = [build((p) => { p.rect(1, 5, 14, 9, '#8a5a2a'); p.rect(1, 3, 14, 4, '#a06a3a'); p.hline(1, 14, 7, '#4a4a4a'); p.rect(7, 6, 2, 3, '#c8b060'); }, 16, 15)];
  S.boss_chest = [build((p) => { p.rect(1, 5, 14, 9, '#6a2a2a'); p.rect(1, 3, 14, 4, '#8a3a3a'); p.hline(1, 14, 7, '#e8c13a'); p.vline(1, 3, 13, '#e8c13a'); p.vline(14, 3, 13, '#e8c13a'); p.rect(7, 6, 2, 3, '#ffe080'); }, 16, 15)];
  S.flour_bin = [build((p) => { p.rect(1, 3, 14, 12, WOOD); p.hline(1, 14, 3, WOOD_L); p.rect(3, 4, 10, 3, '#f4f0e8'); p.vline(1, 3, 14, WOOD_D); }, 16, 16)];
  S.wheat = [build((p) => { const r = mulberry32(4); for (let i = 0; i < 7; i++) { const x = 2 + i * 2; const h = 7 + Math.round(r() * 4); p.vline(x, 16 - h, 15, '#b8a040'); p.set(x, 16 - h, '#f0d060'); p.set(x, 17 - h, '#e8c050'); p.set(x + 1, 18 - h, '#e8c050'); } }, 16, 16, false)];
  S.hay = [build((p) => { p.ball(8, 9, 7, 5, '#d8b850'); for (let i = 0; i < 8; i++) p.line(3 + i * 1.5, 6, 2 + i * 1.6, 12, '#b89830'); }, 16, 14)];
  S.trough = [build((p) => { p.rect(1, 3, 30, 8, WOOD); p.rect(3, 4, 26, 4, '#3a74b8'); p.hline(3, 28, 4, '#6a9ad8'); p.rect(2, 11, 2, 2, WOOD_D); p.rect(28, 11, 2, 2, WOOD_D); }, 32, 13)];
  S.cactus = [build((p) => { p.rect(6, 3, 4, 19, '#3d7a2a'); p.ellipse(8, 3, 2, 2, '#3d7a2a'); p.rect(2, 8, 2, 7, '#3d7a2a'); p.rect(2, 14, 4, 2, '#3d7a2a'); p.rect(12, 6, 2, 6, '#3d7a2a'); p.rect(10, 11, 4, 2, '#3d7a2a'); p.vline(7, 3, 20, '#5aa04a'); p.set(8, 1, '#e84a8a'); }, 16, 22)];
  S.tent = [build((p) => { p.poly([[16, 2], [31, 28], [1, 28]], '#c8b890'); p.poly([[16, 2], [22, 28], [10, 28]], '#a89870'); p.poly([[16, 12], [20, 28], [12, 28]], '#3a2a1a'); p.line(16, 2, 1, 28, '#e8d8b0'); p.rect(15, 0, 2, 3, WOOD_D); }, 32, 30)];
  S.gravestone = [build((p) => { p.rect(2, 4, 10, 12, STONE); p.ellipse(7, 4, 5, 3, STONE); p.hline(4, 9, 7, STONE_D); p.vline(7, 6, 11, STONE_D); p.hline(1, 12, 15, '#5a7a3a'); }, 14, 17)];
  S.skulls = [build((p) => { p.ball(6, 10, 2.5, 2, '#e8e4d8'); p.set(5, 10, '#2a2a2a'); p.set(7, 10, '#2a2a2a'); p.line(9, 12, 14, 9, '#e0dcd0'); p.line(3, 13, 7, 14, '#e0dcd0'); }, 16, 16)];
  S.crystal = [build((p) => { p.poly([[6, 0], [9, 5], [9, 20], [3, 20], [3, 5]], '#8ad0f0'); p.poly([[10, 6], [12, 9], [12, 20], [9, 20]], '#6ab0e0'); p.line(5, 2, 5, 18, '#e0f8ff'); }, 14, 22)];
  S.pillar = [build((p) => { p.rect(1, 24, 12, 4, STONE_D); p.rect(3, 4, 8, 20, STONE); p.vline(4, 4, 23, STONE_L); p.vline(9, 4, 23, STONE_D); p.rect(1, 1, 12, 4, STONE_L); }, 14, 28)];
  S.broken_pillar = [build((p) => { p.rect(1, 10, 12, 4, STONE_D); p.rect(3, 2, 8, 8, STONE); p.poly([[3, 2], [6, 0], [8, 3], [11, 1], [11, 3], [3, 3]], STONE); p.vline(4, 2, 9, STONE_L); }, 14, 14)];
  S.obelisk = [build((p) => { p.poly([[6, 0], [10, 4], [10, 28], [2, 28], [2, 4]], '#2a2430'); p.line(3, 4, 3, 27, '#4a4450'); for (let y = 8; y < 26; y += 5) p.set(6, y, '#b04ae8'); }, 12, 30)];
  S.ship = [build((p) => {
    p.poly([[0, 28], [64, 28], [58, 42], [6, 42]], '#6a4222'); p.hline(0, 63, 28, '#a8743e'); p.hline(4, 60, 34, '#4a2e16');
    p.rect(30, 0, 3, 29, WOOD_D); p.poly([[20, 4], [44, 4], [42, 24], [22, 24]], '#f0ece0'); p.poly([[22, 24], [42, 24], [42, 20], [22, 20]], '#d8d0c0');
    p.rect(30, 0, 8, 3, '#b02a2a'); p.rect(54, 22, 8, 6, '#8a5a2e');
  }, 64, 44)];
  S.rowboat = [build((p) => { p.poly([[0, 6], [31, 6], [27, 14], [4, 14]], '#8a5a2e'); p.hline(0, 31, 6, WOOD_L); p.hline(8, 23, 9, WOOD_D); }, 32, 16)];
  S.bush = [build((p) => canopy(p, 8, 8, 6.5, '#3e7a28', 7), 16, 15)];
  S.berry_bush = [build((p) => canopy(p, 8, 8, 6.5, '#3e7a28', 8, { fruit: '#d82a2a' }), 16, 15)];
  S.berry_bush_empty = [build((p) => canopy(p, 8, 8, 6.5, '#3e7a28', 8), 16, 15)];
  S.moonpetal = [0, 1].map((f) => build((p) => { p.line(8, 14, 8, 8, '#4a8a5a'); for (const [x, y] of [[8, 4], [5, 6], [11, 6], [6, 9], [10, 9]]) p.ball(x, y, 2, 2, f ? '#f0f8ff' : '#d0e0ff'); p.ball(8, 7, 1.5, 1.5, '#fffce0'); }, 16, 16)); S.moonpetal.anim = true;
  S.weapon_rack = [build((p) => { p.rect(1, 2, 14, 2, WOOD); p.rect(1, 12, 14, 2, WOOD); p.rect(1, 2, 2, 14, WOOD_D); p.rect(13, 2, 2, 14, WOOD_D); p.vline(5, 0, 13, '#a9aeb5'); p.vline(8, 1, 13, '#b0703a'); p.vline(11, 0, 13, '#4f5fa6'); }, 16, 16)];
  S.armour_stand = [build((p) => { p.rect(7, 16, 2, 4, WOOD_D); p.rect(4, 19, 8, 1, WOOD_D); p.ball(8, 3, 3, 3, '#a9aeb5'); p.rect(4, 6, 8, 8, '#a9aeb5'); p.hline(4, 11, 6, '#d0d4d8'); p.rect(5, 14, 6, 3, '#8a8e94'); }, 16, 20)];
  S.cauldron = [0, 1].map((f) => build((p) => { p.ball(8, 10, 7, 5, '#2a2a2e'); p.ellipse(8, 6, 6, 2, '#4aa03a'); p.set(6 + f * 3, 5, '#8ae07a'); p.set(9 - f, 6, '#8ae07a'); p.rect(2, 14, 2, 2, '#2a2a2e'); p.rect(12, 14, 2, 2, '#2a2a2e'); }, 16, 16)); S.cauldron.anim = true;
  S.potted_plant = [build((p) => { p.poly([[4, 10], [12, 10], [11, 16], [5, 16]], '#a85a3a'); canopy(p, 8, 6, 4.5, '#3e8a2e', 3); }, 16, 17)];
  S.market_cart = [build((p) => { p.rect(2, 4, 26, 10, WOOD); p.hline(2, 27, 4, WOOD_L); p.ball(8, 15, 4, 4, WOOD_D); p.ball(22, 15, 4, 4, WOOD_D); p.ellipse(8, 15, 1.5, 1.5, '#4a4a4a'); p.ellipse(22, 15, 1.5, 1.5, '#4a4a4a'); p.rect(28, 8, 4, 2, WOOD_D); p.ball(10, 3, 3, 2, '#c84a2a'); p.ball(17, 3, 3, 2, '#e8c040'); }, 32, 20)];
  S.scarecrow = [build((p) => { p.rect(7, 8, 2, 18, WOOD_D); p.rect(1, 10, 14, 2, WOOD_D); p.rect(4, 9, 8, 8, '#6a7a3a'); p.ball(8, 5, 3, 3, '#d8c080'); p.rect(3, 1, 10, 2, '#8a6a3a'); p.rect(5, 0, 6, 2, '#8a6a3a'); p.set(7, 5, '#1a1a1a'); p.set(9, 5, '#1a1a1a'); }, 16, 26)];
  S.windmill_sails = [build((p) => {
    p.poly([[12, 60], [36, 60], [32, 20], [16, 20]], '#d8d0c0'); p.poly([[14, 22], [34, 22], [24, 10]], '#8a3a2a');
    for (let y = 26; y < 60; y += 6) p.hline(15, 33, y, '#b8b0a0'); p.rect(21, 48, 6, 12, WOOD_D);
    p.line(24, 18, 6, 2, WOOD_D); p.line(24, 18, 42, 2, WOOD_D); p.line(24, 18, 6, 34, WOOD_D); p.line(24, 18, 42, 34, WOOD_D);
    p.poly([[22, 16], [8, 2], [5, 5], [19, 18]], '#e8e4d8'); p.poly([[26, 16], [40, 2], [43, 5], [29, 18]], '#e8e4d8'); p.poly([[22, 20], [8, 34], [5, 31], [19, 18]], '#e8e4d8'); p.poly([[26, 20], [40, 34], [43, 31], [29, 18]], '#e8e4d8');
    p.ball(24, 18, 2, 2, WOOD_D);
  }, 48, 62)];
  S.dragon_skull = [build((p) => { p.ball(10, 10, 9, 7, '#e8e0c8'); p.poly([[16, 6], [31, 9], [31, 14], [16, 15]], '#e0d8c0'); p.ellipse(9, 9, 2.5, 2, '#2a2420'); p.line(6, 4, 2, 0, '#d8d0b8'); p.line(12, 4, 12, 0, '#d8d0b8'); for (let x = 18; x < 31; x += 3) p.set(x, 15, '#f8f8f0'); }, 32, 18)];
  S.sarcophagus = [build((p) => { p.rect(2, 2, 12, 28, '#c8a050'); p.rect(3, 3, 10, 26, '#b08840'); p.ball(8, 7, 3.5, 3.5, '#e8c13a'); p.set(7, 7, '#1a3a8a'); p.set(9, 7, '#1a3a8a'); p.rect(5, 12, 6, 12, '#2a5aa0'); for (let y = 13; y < 24; y += 2) p.hline(5, 10, y, '#e8c13a'); }, 16, 32)];
  S.portal = [0, 1, 2].map((f) => build((p) => { p.ellipse(8, 12, 7, 11, '#3a1a6a'); p.ellipse(8, 12, 5.5, 9.5, '#7a3ae8'); p.ellipse(8, 12 + f - 1, 3.5, 6.5, '#c89aff'); p.ellipse(8, 12, 1.5, 3, '#f0e8ff'); }, 16, 24)); S.portal.anim = true;
  S.spinning_web = [build((p) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.line(8, 8, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, '#e0e0e0', 150); } p.ellipse(8, 8, 4, 4, null); }, 16, 16, false)];
}

export function fenceMask(world, x, y, isFence) {
  let m = 0;
  if (isFence(x, y - 1)) m |= 1;
  if (isFence(x + 1, y)) m |= 2;
  if (isFence(x, y + 1)) m |= 4;
  if (isFence(x - 1, y)) m |= 8;
  return m;
}

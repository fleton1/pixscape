// Dungeons: each is its own map. They are generated deterministically, like the overworld.
import { World, T } from './map.js';
import { BIOME } from './gen.js';
import { D } from './map.js';
import { mulberry32, hash2 } from '../util.js';
import { makeBuilder } from './build.js';

// Common dungeon scaffolding: fill with wall, carve rooms and corridors, void unreachable rock.
function scaffold(def) {
  const w = new World(def.id, def.W, def.H, { name: def.name, kind: 'dungeon', music: def.music, dark: def.dark ?? 0.86, entrance: def.entrance });
  const rng = mulberry32(def.seed || 1);
  const R = () => rng();
  const B = makeBuilder(w, R);
  const floor = def.floor, wall = def.wall;
  B.fill(0, 0, def.W - 1, def.H - 1, wall);
  w.biome.fill(def.biome);
  B.floor = floor; B.wall = wall; B.R = R;
  // rectangular room with a ragged edge
  B.room = (rx, ry, rw, rh, t = floor) => {
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
      const edge = Math.min(x - rx, rx + rw - 1 - x, y - ry, ry + rh - 1 - y);
      if (edge > 0 || hash2(x, y, 70 + def.seed) > 0.45) B.setT(x, y, t);
    }
  };
  // organic cavern
  B.cavern = (cx, cy, r, t = floor, amp = 0.3) => B.blob(cx, cy, r, t, amp, (x, y) => x > 0 && y > 0 && x < def.W - 1 && y < def.H - 1);
  // L-shaped 2-wide corridor
  B.corridor = (ax, ay, bx, by, t = floor) => {
    let x = ax, y = ay;
    while (x !== bx || y !== by) {
      B.setT(x, y, t); B.setT(x + 1, y, t); B.setT(x, y + 1, t);
      if (x !== bx) x += Math.sign(bx - x); else y += Math.sign(by - y);
    }
    B.setT(bx, by, t);
  };
  B.finish = (decor = [[D.PEBBLES, 0.03], [D.BONES, 0.015]]) => {
    // void rock that is not next to any floor, so the map reads as a cave
    const isFloor = (x, y) => { const t = w.t(x, y); return t !== wall && t !== T.VOID; };
    for (let y = 0; y < def.H; y++) for (let x = 0; x < def.W; x++) {
      if (w.t(x, y) !== wall) continue;
      let near = false;
      for (let j = -2; j <= 2 && !near; j++) for (let i = -2; i <= 2; i++) if (isFloor(x + i, y + j)) { near = true; break; }
      if (!near) B.setT(x, y, T.VOID);
    }
    for (let y = 0; y < def.H; y++) for (let x = 0; x < def.W; x++) {
      if (w.t(x, y) !== floor || w.obj(x, y)) continue;
      const dd = hash2(x, y, 84 + def.seed);
      let acc = 0;
      for (const [d, p] of decor) { acc += p; if (dd < acc) { w.decor[B.idx(x, y)] = d; break; } }
    }
    B.applyAreas();
  };
  return { w, B };
}

// ------------------------------------------------------------------ Highcrest Catacombs (20-40)
function catacombs() {
  const { w, B } = scaffold({ id: 'catacombs', name: 'Highcrest Catacombs', W: 56, H: 62, floor: T.CAVE, wall: T.CAVE_WALL, biome: BIOME.CAVE, music: 'cave', entrance: [245, 119], seed: 11 });
  const { room, corridor, place, spawnIn } = B;
  for (const r of [[6, 44, 14, 11], [5, 24, 18, 11], [31, 19, 18, 18], [5, 4, 20, 11], [29, 44, 20, 11]]) room(...r);
  for (const c of [[12, 44, 12, 34], [22, 29, 32, 29], [13, 24, 13, 14], [40, 36, 40, 44], [20, 49, 29, 49]]) corridor(...c);
  B.area('Highcrest Catacombs', 0, 0, 55, 61, 'cave');
  place('ladder_up', 12, 51, { to: [245, 120, 'main'], msg: 'You climb back up into the crypt.' });
  w.points.arrive = [12, 50];
  for (const [x, y] of [[8, 6], [20, 8], [16, 12], [7, 11], [22, 5]]) w.addObject('spinning_web', x, y);
  for (const [x, y] of [[8, 26], [20, 26], [8, 32], [20, 32]]) place('broken_pillar', x, y);
  for (const [x, y] of [[33, 52], [46, 46], [31, 45]]) w.addObject('skulls', x, y);
  place('boss_chest', 45, 52, { mossy: true });
  place('torch', 6, 44); w.addObject('torch', 13, 44);
  spawnIn('skeleton', 7, 13, 29, 7); spawnIn('hill_giant', 6, 40, 28, 7); spawnIn('giant_spider', 6, 14, 9, 8); spawnIn('zombie', 6, 38, 49, 8); spawnIn('rat', 3, 10, 49, 3);
  B.finish([[D.PEBBLES, 0.03], [D.BONES, 0.015], [D.MUSHROOM, 0.005]]);
  return w;
}

// ------------------------------------------------------------------ Tomb of the Scarab (45-140)
function tomb() {
  // Same layout as before it became its own map, shifted 54 tiles west.
  const { w, B } = scaffold({ id: 'tomb', name: 'Tomb of the Scarab', W: 46, H: 62, floor: T.SANDFLOOR, wall: T.WALL_SAND, biome: BIOME.TOMB, music: 'tomb', entrance: [371, 285], seed: 12 });
  const { room, corridor, place, spawnIn } = B;
  const X = (x) => x - 54;
  for (const [x, y, ww, hh] of [[58, 46, 12, 10], [60, 28, 10, 12], [74, 36, 14, 16], [70, 6, 24, 18]]) room(X(x), y, ww, hh);
  for (const [ax, ay, bx, by] of [[64, 46, 64, 40], [69, 33, 76, 38], [80, 36, 80, 24], [64, 28, 72, 18]]) corridor(X(ax), ay, X(bx), by);
  B.area('Tomb of the Scarab', 0, 0, 45, 61, 'tomb');
  place('ladder_up', X(63), 53, { to: [372, 287, 'main'], msg: 'You climb back into the desert sun.' });
  w.points.arrive = [X(63), 52];
  for (const [x, y] of [[74, 9], [89, 9], [74, 20], [89, 20]]) place('pillar', X(x), y);
  place('sarcophagus', X(81), 7); place('sarcophagus', X(84), 7);
  for (const [x, y] of [[61, 30], [67, 30], [77, 40], [85, 48]]) place('sarcophagus', X(x), y);
  w.addObject('torch', X(70), 6); w.addObject('torch', X(93), 6); w.addObject('torch', X(58), 46);
  place('boss_chest', X(82), 12, { boss: 'scarab' });
  B.npc('scarab_king', X(81), 15, { wander: 1 });
  spawnIn('mummy', 5, X(80), 44, 6); spawnIn('scarab_swarm', 4, X(64), 34, 4); spawnIn('mummy', 2, X(64), 49, 4);
  B.finish([[D.PEBBLES, 0.03], [D.BONES, 0.015]]);
  return w;
}

export const DUNGEONS = { catacombs, tomb };

export function buildDungeons() {
  return Object.values(DUNGEONS).map((f) => f());
}

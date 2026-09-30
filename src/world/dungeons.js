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
  spawnIn('giant_bat', 3, 40, 28, 6); spawnIn('ghost', 2, 38, 49, 6); spawnIn('skeleton_archer', 4, 13, 29, 7);
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
  B.placeNear('chest_tomb', X(62), 31); B.placeNear('chest_tomb', X(86), 49);
  B.finish([[D.PEBBLES, 0.03], [D.BONES, 0.015]]);
  return w;
}

// ------------------------------------------------------------------ Brindlewood Sewers (1-25)
function sewers() {
  const { w, B } = scaffold({ id: 'sewers', name: 'Brindlewood Sewers', W: 60, H: 44, floor: T.STONEFLOOR, wall: T.WALL, biome: BIOME.SEWER, music: 'cave', dark: 0.8, seed: 21 });
  const { room, corridor, place, spawnIn, fill, setT } = B;
  // main tunnel: walkways either side of a sewage channel, with bridges
  fill(3, 18, 56, 26, T.STONEFLOOR);
  fill(8, 21, 52, 23, T.SWAMPWATER);
  for (const x of [14, 28, 42]) fill(x, 21, x + 1, 23, T.BRIDGE);
  room(6, 3, 14, 11); room(38, 3, 16, 12); room(5, 30, 15, 11); room(38, 30, 18, 12);
  corridor(12, 13, 12, 18); corridor(45, 14, 45, 18); corridor(11, 26, 11, 31); corridor(46, 26, 46, 31);
  B.area("Rat King's Lair", 38, 30, 56, 42, 'boss');
  B.area('Brindlewood Sewers', 0, 0, 59, 43, 'cave');
  place('ladder_up', 4, 19, { toMain: true, msg: 'You climb out of the sewers. Fresh air!' });
  w.points.arrive = [5, 20];
  for (const [x, y] of [[3, 24], [20, 19], [34, 25], [50, 19], [9, 4], [44, 4], [8, 39], [55, 32]]) w.addObject('torch', x, y);
  for (const [x, y] of [[16, 5], [17, 5], [7, 12], [50, 13], [6, 38]]) place('crate', x, y);
  for (const [x, y] of [[20, 25], [36, 19], [52, 25]]) place('barrel', x, y);
  B.placeNear('chest_10', 18, 11);
  for (const [x, y] of [[42, 40], [53, 35], [40, 33]]) w.addObject('skulls', x, y);
  spawnIn('rat', 6, 28, 20, 20); spawnIn('giant_rat', 5, 13, 8, 5); spawnIn('sewer_slime', 6, 45, 8, 6);
  spawnIn('bat', 6, 12, 35, 6); spawnIn('giant_rat', 3, 30, 25, 18);
  B.npc('rat_king', 47, 35, { wander: 2 });
  B.finish([[D.PEBBLES, 0.03], [D.BONES, 0.01], [D.CRACKS, 0.02]]);
  return w;
}

// ------------------------------------------------------------------ Crestfall Deeps (15-60): dwarven mine
function deeps() {
  const { w, B } = scaffold({ id: 'deeps', name: 'Crestfall Deeps', W: 80, H: 64, floor: T.CAVE, wall: T.CAVE_WALL, biome: BIOME.CAVE, music: 'mine', dark: 0.82, seed: 22 });
  const { room, cavern, corridor, place, spawnIn, scatter, blob } = B;
  room(3, 3, 24, 16, T.STONEFLOOR);                  // dwarven hall
  cavern(13, 33, 9); cavern(45, 12, 10); cavern(46, 35, 9); cavern(66, 50, 11); cavern(58, 57, 6);
  corridor(14, 18, 14, 26); corridor(26, 10, 36, 12); corridor(44, 21, 45, 27); corridor(21, 34, 38, 34); corridor(53, 39, 60, 45);
  blob(49, 37, 3.5, T.WATER, 0.2);
  B.area('The Deep Seam', 55, 40, 79, 63, 'mine'); w.areas[w.areas.length - 1].pitch = true;
  B.area('Dwarven Hall', 3, 3, 26, 18, 'town');
  B.area('Crestfall Deeps', 0, 0, 79, 63, 'mine');
  place('ladder_up', 6, 4, { toMain: true, msg: 'You climb back up into the daylight.' });
  w.points.arrive = [6, 6];
  // the hall: bank, forge, shop
  for (const x of [10, 11, 12]) place('bank_booth', x, 4);
  B.icon('bank', 11, 4);
  B.npc('banker', 11, 5, { wander: 0, name: 'Dwarf banker' });
  place('furnace', 20, 4); place('anvil', 22, 7); place('anvil', 24, 7); B.icon('furnace', 20, 4); B.icon('anvil', 23, 7);
  place('counter', 5, 13); place('counter', 6, 13); place('counter', 7, 13); place('shelves', 4, 15); place('barrel', 8, 16);
  B.npc('dwarf_trader', 6, 14, { shop: 'dwarf', wander: 0 }); B.icon('shop', 6, 14);
  B.npc('dwarf', 18, 12, { wander: 3 }); B.npc('dwarf', 22, 15, { wander: 3, name: 'Dwarf miner' });
  place('range', 25, 16); place('long_table', 14, 12); place('stool', 14, 11); place('stool', 15, 11);
  for (const [x, y] of [[4, 8], [25, 4], [16, 17], [4, 17]]) w.addObject('torch', x, y);
  // galleries
  scatter('iron_rock', 5, 13, 33, 7); scatter('coal_rock', 5, 13, 33, 7); scatter('silver_rock', 3, 13, 33, 7); scatter('clay_rock', 3, 13, 33, 7);
  scatter('gold_rock', 3, 45, 12, 8); scatter('gem_rock', 3, 45, 12, 8); scatter('silver_rock', 2, 45, 12, 8); scatter('coal_rock', 3, 45, 12, 8);
  scatter('mithril_rock', 4, 66, 50, 9); scatter('adamant_rock', 3, 66, 50, 9); scatter('gem_rock', 2, 58, 57, 4); scatter('coal_rock', 4, 66, 50, 9);
  for (const [x, y] of [[13, 25], [36, 12], [44, 26], [58, 44]]) w.addObject('torch', x, y);
  w.fishHints = [[47, 34, 'spot_cave'], [51, 38, 'spot_cave']];
  spawnIn('cave_goblin', 7, 13, 33, 7); spawnIn('giant_bat', 4, 45, 12, 8); spawnIn('tunnel_crawler', 5, 46, 35, 7);
  spawnIn('rock_golem_mob', 5, 66, 50, 9); spawnIn('tunnel_crawler', 3, 58, 57, 4);
  B.finish([[D.PEBBLES, 0.05], [D.BONES, 0.008], [D.MUSHROOM, 0.006]]);
  fishSpots(w, B);
  return w;
}

// ------------------------------------------------------------------ Mortmire Crypt (30-60)
function crypt() {
  const { w, B } = scaffold({ id: 'crypt', name: 'Mortmire Crypt', W: 60, H: 50, floor: T.STONEFLOOR, wall: T.WALL_DARK, biome: BIOME.CRYPT, music: 'swamp', dark: 0.88, seed: 23 });
  const { room, cavern, corridor, place, spawnIn, blob } = B;
  room(3, 3, 14, 10); room(22, 3, 16, 12); room(41, 4, 16, 18); room(6, 24, 22, 15, T.CAVE); room(34, 30, 22, 16, T.TILES);
  corridor(16, 7, 22, 7); corridor(37, 8, 41, 8); corridor(9, 12, 9, 24); corridor(48, 21, 48, 30); corridor(27, 32, 34, 36);
  blob(49, 12, 4, T.SWAMPWATER, 0.3);
  B.area('Sanctum of the Drowned', 34, 30, 55, 45, 'boss');
  B.area('Mortmire Crypt', 0, 0, 59, 49, 'swamp');
  place('stairs_up', 5, 4, { toMain: true, msg: 'You climb the stairs back into the manor.' });
  w.points.arrive = [5, 6];
  for (const [x, y] of [[26, 4], [30, 4], [34, 4], [24, 13], [28, 13], [32, 13]]) place('sarcophagus', x, y);
  for (const [x, y] of [[10, 26], [16, 26], [22, 26], [10, 36], [16, 36], [22, 36]]) place('gravestone', x, y);
  for (const [x, y] of [[43, 6], [54, 6], [43, 19], [54, 19]]) place('broken_pillar', x, y);
  for (const [x, y] of [[36, 32], [53, 32], [36, 43], [53, 43]]) place('pillar', x, y);
  place('altar', 44, 44); place('altar', 45, 44); place('candles', 42, 44); place('candles', 47, 44);
  for (const [x, y] of [[3, 7], [17, 7], [22, 9], [38, 9], [6, 30], [27, 30], [34, 36], [55, 36]]) w.addObject('torch', x, y);
  B.placeNear('chest_50', 36, 13);
  for (const [x, y] of [[24, 9], [30, 10], [12, 32], [20, 33]]) w.addObject('skulls', x, y);
  spawnIn('zombie', 4, 10, 8, 5); spawnIn('skeleton_warrior', 5, 30, 9, 6); spawnIn('banshee', 6, 48, 13, 6);
  spawnIn('ghoul', 5, 17, 31, 9); spawnIn('wraith', 4, 40, 38, 5);
  B.npc('drowned_abbot', 46, 38, { wander: 2 });
  B.finish([[D.BONES, 0.02], [D.CRACKS, 0.03], [D.PEBBLES, 0.01]]);
  return w;
}

// ------------------------------------------------------------------ Hollowroot Caverns (40-100)
function hollowroot() {
  const { w, B } = scaffold({ id: 'hollowroot', name: 'Hollowroot Caverns', W: 70, H: 60, floor: T.DARKGRASS, wall: T.CAVE_WALL, biome: BIOME.HOLLOW, music: 'elven', dark: 0.62, seed: 24 });
  const { cavern, corridor, place, spawnIn, scatter, blob } = B;
  cavern(12, 14, 8); cavern(38, 14, 11); cavern(18, 42, 10); cavern(50, 42, 12); cavern(32, 30, 5);
  corridor(12, 14, 38, 14); corridor(14, 14, 16, 42); corridor(34, 14, 32, 30); corridor(32, 30, 50, 42); corridor(18, 43, 50, 43);
  blob(14, 47, 2.2, T.WATER, 0.2);
  B.area('Heartwood Grove', 28, 4, 49, 24, 'grove');
  B.area('Hollowroot Caverns', 0, 0, 69, 59, 'elven');
  place('cave_exit', 6, 7, { toMain: true, msg: 'You step out into the forest.' });
  w.points.arrive = [7, 10];
  scatter('heartwood', 3, 38, 12, 8); scatter('mahogany', 3, 38, 14, 9); scatter('yew', 2, 12, 14, 6); scatter('teak', 2, 18, 42, 8);
  for (const [x, y] of [[10, 10], [30, 28], [34, 28]]) place('crystal', x, y);
  w.fishHints = [[14, 47, 'spot_lure']];
  spawnIn('moss_giant', 5, 12, 16, 6); spawnIn('treant', 4, 38, 16, 8); spawnIn('baby_blue_dragon', 6, 18, 42, 7);
  spawnIn('blue_dragon', 5, 50, 42, 9); spawnIn('jungle_spider', 3, 32, 30, 4);
  B.finish([[D.FERN, 0.06], [D.MUSHROOM, 0.03], [D.TUFT, 0.05], [D.FLOWER_B, 0.01]]);
  fishSpots(w, B);
  return w;
}

// ------------------------------------------------------------------ Frostpeak Ice Caves (50-110)
function icecaves() {
  const { w, B } = scaffold({ id: 'icecaves', name: 'Frostpeak Ice Caves', W: 70, H: 60, floor: T.ICE, wall: T.WALL_ICE, biome: BIOME.ICECAVE, music: 'frost', dark: 0.66, seed: 25 });
  const { cavern, corridor, place, spawnIn, blob } = B;
  cavern(12, 30, 8); cavern(34, 16, 10); cavern(34, 44, 10); cavern(57, 16, 9); cavern(57, 45, 10);
  corridor(19, 29, 27, 20); corridor(19, 31, 27, 42); corridor(43, 16, 49, 16); corridor(34, 25, 34, 35); corridor(43, 44, 48, 45);
  for (const [cx, cy, r] of [[12, 30, 4], [34, 44, 4], [57, 16, 4]]) blob(cx, cy, r, T.SNOW, 0.4, (x, y) => w.t(x, y) === T.ICE);
  B.area("Hrimfang's Hollow", 48, 36, 69, 59, 'boss');
  B.area('Frostpeak Ice Caves', 0, 0, 69, 59, 'frost');
  place('cave_exit', 5, 28, { toMain: true, msg: 'You step out into the biting wind.' });
  w.points.arrive = [6, 31];
  for (const [x, y] of [[9, 26], [31, 11], [38, 21], [30, 48], [60, 12], [52, 50], [63, 49]]) place('crystal', x, y);
  spawnIn('ice_spider', 5, 12, 30, 6); spawnIn('frost_troll', 5, 34, 16, 8); spawnIn('ice_giant', 4, 34, 44, 8); spawnIn('ice_spider', 3, 34, 44, 8);
  spawnIn('frost_wyrm', 4, 57, 16, 7);
  B.npc('hrimfang', 57, 45, { wander: 2 });
  B.finish([[D.SNOWTUFT, 0.05], [D.PEBBLES, 0.02]]);
  return w;
}

// ------------------------------------------------------------------ Cinderhold Depths (70-150)
function depths() {
  const { w, B } = scaffold({ id: 'depths', name: 'Cinderhold Depths', W: 80, H: 64, floor: T.ASH, wall: T.CAVE_WALL, biome: BIOME.LAVACAVE, music: 'volcano', dark: 0.72, seed: 26 });
  const { cavern, corridor, place, spawnIn, scatter, blob } = B;
  cavern(14, 18, 9); cavern(40, 12, 10); cavern(40, 38, 11); cavern(65, 22, 10); cavern(64, 50, 11);
  corridor(22, 16, 31, 13); corridor(16, 26, 31, 37); corridor(49, 12, 57, 20); corridor(50, 38, 55, 48); corridor(64, 31, 64, 40);
  for (const [cx, cy, r] of [[40, 40, 3], [67, 24, 2.5], [60, 54, 3], [12, 20, 2]]) blob(cx, cy, r, T.LAVA, 0.3, (x, y) => w.t(x, y) === T.ASH);
  B.area('The Black Roost', 53, 39, 79, 63, 'boss');
  B.area('Cinderhold Depths', 0, 0, 79, 63, 'volcano');
  place('cave_exit', 8, 10, { toMain: true, msg: 'You climb out of the volcano, coughing.' });
  w.points.arrive = [9, 13];
  scatter('rune_rock', 2, 40, 36, 9); scatter('adamant_rock', 3, 40, 36, 9); scatter('coal_rock', 3, 14, 18, 7);
  for (const [x, y] of [[20, 12], [36, 6], [46, 44], [70, 18], [58, 46]]) place('lava_rock', x, y);
  spawnIn('lava_imp', 5, 14, 18, 7); spawnIn('fire_giant', 5, 40, 12, 8); spawnIn('cinderhound', 4, 40, 12, 8);
  spawnIn('obsidian_golem', 4, 40, 38, 9); spawnIn('fire_giant', 2, 40, 38, 9); spawnIn('red_dragon', 4, 65, 22, 8); spawnIn('black_dragon', 4, 64, 50, 9);
  B.finish([[D.EMBERS, 0.04], [D.CRACKS, 0.04], [D.BONES, 0.01]]);
  return w;
}

// Fishing spots inside dungeons: the nearest water tile with a walkable shore.
function fishSpots(w, B) {
  for (const [cx, cy, type] of w.fishHints || []) {
    let done = false;
    for (let r = 0; r < 6 && !done; r++)
      for (let j = -r; j <= r && !done; j++) for (let i = -r; i <= r && !done; i++) {
        const x = cx + i, y = cy + j;
        if (!w.isWater(x, y) || w.obj(x, y)) continue;
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => B.walkable(x + dx, y + dy))) continue;
        w.addObject(type, x, y); B.icon('fish', x, y); done = true;
      }
  }
}

export const DUNGEONS = { catacombs, tomb, sewers, deeps, crypt, hollowroot, icecaves, depths };

export function buildDungeons() {
  return Object.values(DUNGEONS).map((f) => f());
}

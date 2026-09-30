// Deterministic world generation: continents, biomes, rivers, towns, roads, dungeons and spawns.
import { World, OW_W, OW_H, T, TINFO, D } from './map.js';
import { mulberry32, fbm, valueNoise, hash2 } from '../util.js';
import { Heap } from './path.js';
import { OBJECTS } from '../data/objects.js';
import { makeBuilder } from './build.js';
import { ALTAR_SITES, RUNE } from '../data/magic.js';
import { COURSES, SHORTCUTS, DIRS } from '../data/agility.js';

export const BIOME = { OCEAN: 0, KINGDOM: 1, WILD: 2, FROST: 3, DESERT: 4, SWAMP: 5, ELVEN: 6, TROPIC: 7, VOLCANIC: 8, CAVE: 9, TOMB: 10, SEWER: 11, CRYPT: 12, ICECAVE: 13, LAVACAVE: 14, HOLLOW: 15 };
export const BIOME_INFO = {
  [BIOME.OCEAN]: { name: 'The Endless Sea', music: 'sea' },
  [BIOME.KINGDOM]: { name: 'Aldermoor', music: 'kingdom' },
  [BIOME.WILD]: { name: 'The Wilderness', music: 'wild' },
  [BIOME.FROST]: { name: 'Frostpeak', music: 'frost' },
  [BIOME.DESERT]: { name: 'Sundral Desert', music: 'desert' },
  [BIOME.SWAMP]: { name: 'Mortmire Swamp', music: 'swamp' },
  [BIOME.ELVEN]: { name: 'Elderglen Forest', music: 'elven' },
  [BIOME.TROPIC]: { name: 'Palmera Isle', music: 'tropic' },
  [BIOME.VOLCANIC]: { name: 'Cinderhold', music: 'volcano' },
  [BIOME.CAVE]: { name: 'Highcrest Catacombs', music: 'cave' },
  [BIOME.TOMB]: { name: 'Tomb of the Scarab', music: 'tomb' },
  [BIOME.SEWER]: { name: 'Sewers', music: 'cave' },
  [BIOME.CRYPT]: { name: 'Crypt', music: 'cave' },
  [BIOME.ICECAVE]: { name: 'Ice caves', music: 'frost' },
  [BIOME.LAVACAVE]: { name: 'Depths', music: 'volcano' },
  [BIOME.HOLLOW]: { name: 'Caverns', music: 'cave' },
};

// The overworld. Dungeons live in dungeons.js as their own maps.
export function generateWorld() {
  const W = OW_W, H = OW_H;
  const w = new World('main', W, H, { kind: 'overworld' });
  const rng = mulberry32(20260926);
  const R = () => rng();
  const B = makeBuilder(w, R);
  const { reserved, idx, inb, reserve, setT, getT, area, place, fill, building, fenceRect, npc, walkable, spawnIn, icon, carve, blob, placeNear, entrance } = B;

  // ------------------------------------------------------------ landmasses
  const MAIN = [[116, 12], [180, 8], [260, 10], [330, 14], [372, 26], [380, 60], [372, 100], [386, 130], [414, 150], [419, 319], [262, 319], [250, 262], [232, 258], [210, 262], [186, 252], [160, 236], [142, 212], [126, 198], [118, 176], [124, 150], [112, 130], [114, 100], [108, 60], [110, 30]];
  const WEST = [[14, 80], [50, 70], [84, 78], [92, 110], [88, 150], [94, 190], [88, 232], [70, 262], [40, 270], [16, 252], [8, 200], [12, 140]];
  const inPoly = (pts, x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const nx = x + (fbm(x / 14, y / 14, 1, 4) - 0.5) * 18;
      const ny = y + (fbm(x / 14, y / 14, 2, 4) - 0.5) * 18;
      let land = 0;
      if (inPoly(MAIN, nx, ny)) land = 1;
      else if (inPoly(WEST, nx, ny)) land = 2;
      else if (inEll(nx, ny, 160, 290, 26, 18)) land = 3;
      else if (inEll(nx, ny, 96, 300, 16, 12)) land = 4;
      else if (fbm(x / 7, y / 7, 3, 3) > 0.785 && !(x < 108 && y < 70)) land = 5; // islets
      let b = BIOME.OCEAN;
      if (land === 1) {
        const dn = (fbm(x / 20, y / 20, 4, 3) - 0.5) * 30;
        if (y < 80 && x < 332) b = BIOME.WILD;
        else if ((x > 332 && y < 140) || (x > 302 && y < 138 && y >= 80)) b = BIOME.FROST;
        else if ((x - 252) + (y - 168) * 1.3 + dn > 0 && x > 238 && y > 150) b = BIOME.DESERT;
        else if (inEll(x + dn * 0.3, y, 198, 232, 44, 26)) b = BIOME.SWAMP;
        else b = BIOME.KINGDOM;
      } else if (land === 2) b = BIOME.ELVEN;
      else if (land === 3) b = BIOME.TROPIC;
      else if (land === 4) b = BIOME.VOLCANIC;
      else if (land === 5) b = BIOME.KINGDOM;
      w.biome[idx(x, y)] = b;
      let t = T.OCEAN;
      switch (b) {
        case BIOME.KINGDOM: t = fbm(x / 18, y / 18, 5, 3) > 0.6 ? T.DARKGRASS : T.GRASS; break;
        case BIOME.WILD: t = fbm(x / 16, y / 16, 6, 3) > 0.62 ? T.DARKGRASS : T.ASH; break;
        case BIOME.FROST: t = T.SNOW; break;
        case BIOME.DESERT: t = T.SAND; break;
        case BIOME.SWAMP: t = fbm(x / 6, y / 6, 7, 3) > 0.64 ? T.SWAMPWATER : T.SWAMP; break;
        case BIOME.ELVEN: t = fbm(x / 16, y / 16, 8, 3) > 0.5 ? T.DARKGRASS : T.GRASS; break;
        case BIOME.TROPIC: t = fbm(x / 10, y / 10, 9, 3) > 0.55 ? T.DARKGRASS : T.GRASS; break;
        case BIOME.VOLCANIC: t = T.ASH; break;
      }
      w.ground[idx(x, y)] = t;
    }

  // ------------------------------------------------------------ rivers & lakes
  carve([[318, 60], [300, 84], [276, 104], [258, 128], [244, 150], [239, 175], [230, 200], [216, 230], [210, 266]], 1.5);
  carve([[272, 8], [266, 38], [282, 66], [300, 84]], 1.2);
  carve([[416, 150], [386, 186], [362, 220], [347, 255], [340, 290], [334, 319]], 1.7);
  carve([[40, 72], [30, 118], [28, 168], [36, 220], [30, 270]], 1.4);
  blob(174, 180, 4.5, T.WATER);
  blob(300, 262, 4, T.WATER);
  blob(318, 58, 8, T.ICE, 0.25);
  blob(300, 28, 7, T.LAVA); blob(318, 44, 5, T.LAVA); blob(262, 20, 4, T.LAVA);
  // cinderhold lava rivers
  carve([[96, 300], [86, 290], [80, 286]], 1, T.LAVA);
  carve([[96, 300], [108, 308]], 0.9, T.LAVA);

  // ------------------------------------------------------------ beaches
  const oceanDist = new Uint8Array(W * H).fill(255);
  {
    let q = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (getT(x, y) === T.OCEAN) { oceanDist[idx(x, y)] = 0; q.push(idx(x, y)); }
    for (let d = 1; d <= 3; d++) {
      const nq = [];
      for (const k of q) {
        const x = k % W, y = (k / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (!inb(nx, ny) || oceanDist[idx(nx, ny)] <= d) continue;
          oceanDist[idx(nx, ny)] = d; nq.push(idx(nx, ny));
        }
      }
      q = nq;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = w.biome[idx(x, y)], t = getT(x, y);
      if (oceanDist[idx(x, y)] <= 2 && (t === T.GRASS || t === T.DARKGRASS || t === T.SWAMP) && b !== BIOME.WILD) setT(x, y, T.SAND);
      if (oceanDist[idx(x, y)] <= 1 && t === T.ASH && b === BIOME.VOLCANIC) setT(x, y, T.DIRT);
    }
  }

  // ================================================================ BRINDLEWOOD
  area('Brindlewood', 184, 144, 232, 186, 'town');
  fill(184, 146, 228, 184, T.GRASS);
  for (let y = 160; y <= 176; y++) for (let x = 194; x <= 220; x++) if (((x - 206) / 12) ** 2 + ((y - 168) / 7.5) ** 2 <= 1) setT(x, y, T.COBBLE);
  // castle
  building(186, 148, 17, 13, { floor: T.STONEFLOOR, doors: [[5, 12], [6, 12]] });
  fill(191, 149, 192, 159, T.CARPET_RED);
  for (let y = 149; y <= 159; y++) setT(197, y, T.WALL);
  setT(197, 156, T.STONEFLOOR); w.addObject('door', 197, 156, { vert: true });
  fill(198, 149, 201, 159, T.TILES);
  place('throne', 191, 149); place('throne', 192, 149);
  place('bank_booth', 187, 151); place('bank_booth', 187, 152); place('bank_booth', 187, 153); icon('bank', 187, 152);
  w.addObject('banner_blue', 189, 148); w.addObject('banner_blue', 194, 148); w.addObject('torch', 186, 152); w.addObject('torch', 186, 157);
  w.addObject('banner_red', 199, 148);
  place('range', 201, 150); icon('cook', 201, 150); place('table', 199, 151); place('barrel', 201, 158); place('sacks', 198, 158); place('shelves', 200, 149);
  place('long_table', 189, 157); place('chair', 189, 156); place('chair', 190, 156); place('candles', 196, 149); place('armour_stand', 196, 158); place('statue', 187, 159);
  w.itemSpawns.push({ item: 'pot', x: 199, y: 150, respawn: 30 });
  npc('duke', 193, 152); npc('cook', 199, 154); npc('banker', 188, 152, { wander: 0 });
  // general store
  building(210, 150, 8, 7, { doors: [[3, 6]] });
  place('counter', 212, 153); place('counter', 213, 153); place('counter', 214, 153); place('counter', 215, 153);
  place('shelves', 211, 151); place('shelves', 216, 151); place('barrel', 216, 155); place('crate', 211, 155);
  npc('shopkeeper', 213, 152, { shop: 'brindle_general', wander: 1 }); icon('shop', 213, 152);
  // church
  building(208, 172, 8, 9, { floor: T.STONEFLOOR, doors: [[3, 0]] });
  fill(211, 173, 212, 178, T.CARPET_RED);
  place('altar', 211, 179); place('altar', 212, 179); icon('altar', 211, 179);
  place('candles', 209, 179); place('candles', 214, 179);
  for (const y of [174, 176]) { place('stool', 209, y); place('stool', 210, y); place('stool', 213, y); place('stool', 214, y); }
  npc('priest', 212, 177, { wander: 2 });
  // houses
  building(196, 173, 6, 5, { doors: [[2, 0]] }); place('bed', 197, 174); place('table', 199, 175); place('chair', 200, 175); place('bookshelf', 200, 174);
  building(219, 164, 6, 6, { doors: [[0, 3]] }); place('range', 223, 165); place('table', 221, 167); place('barrel', 223, 168); place('bed', 220, 165); icon('cook', 223, 165);
  place('fountain', 205, 167); place('signpost', 200, 165);
  for (const [x, y] of [[196, 163], [216, 163], [196, 172], [218, 176]]) place('lamp_post', x, y);
  place('well', 222, 176);
  npc('guide', 204, 170, { wander: 1 });
  spawnIn('man', 3, 206, 168, 7); spawnIn('woman', 2, 206, 168, 7);
  w.points.spawn = [206, 171];
  w.labels.push({ name: 'Brindlewood', x: 206, y: 168, size: 2 });

  // ================================================================ FARM
  area("Hilda's Farm", 158, 130, 192, 152, 'farm');
  fill(158, 131, 192, 146, T.GRASS);
  fenceRect(169, 133, 181, 143, [[175, 143]]);
  place('trough', 177, 135); place('hay', 179, 141);
  spawnIn('cow', 3, 175, 138, 4); spawnIn('cow_brown', 2, 175, 138, 4); npc('dairy_cow', 171, 135, { wander: 0 });
  fenceRect(183, 133, 190, 139, [[186, 139]]);
  spawnIn('chicken', 5, 186, 136, 2);
  w.itemSpawns.push({ item: 'egg', x: 184, y: 134, respawn: 25 }, { item: 'egg', x: 189, y: 135, respawn: 25 });
  building(183, 142, 7, 5, { doors: [[3, 4]] }); place('bed', 184, 143); place('table', 187, 143); place('fireplace', 188, 143);
  w.itemSpawns.push({ item: 'bucket', x: 185, y: 144, respawn: 30 });
  npc('hilda', 186, 144, { wander: 2 });
  fill(169, 146, 180, 151, T.FARMLAND);
  for (let y = 146; y <= 151; y++) for (let x = 169; x <= 180; x++) if ((x + y) % 2 === 0 && !(x === 175 && y === 148)) w.addObject('wheat', x, y);
  place('scarecrow', 175, 148);
  building(160, 141, 5, 5, { doors: [[2, 4]] }); place('flour_bin', 162, 142); place('sacks', 161, 143);
  place('windmill_sails', 160, 137);
  spawnIn('farmer', 2, 176, 147, 5);
  w.labels.push({ name: "Hilda's Farm", x: 176, y: 140, size: 1 });

  // ================================================================ HIGHCREST
  area('Highcrest', 204, 90, 252, 128, 'city');
  fill(206, 92, 250, 126, T.GRASS);
  for (let x = 206; x <= 250; x++) { setT(x, 92, T.WALL); setT(x, 126, T.WALL); }
  for (let y = 92; y <= 126; y++) { setT(206, y, T.WALL); setT(250, y, T.WALL); }
  fill(226, 92, 230, 126, T.COBBLE); fill(206, 106, 250, 110, T.COBBLE); fill(220, 101, 236, 115, T.COBBLE);
  reserve(204, 90, 49, 39);
  // palace
  building(208, 93, 17, 11, { floor: T.STONEFLOOR, doors: [[8, 10], [9, 10]] });
  fill(216, 94, 217, 102, T.CARPET_BLUE);
  place('throne', 216, 94); place('throne', 217, 94);
  w.addObject('banner_blue', 212, 93); w.addObject('banner_blue', 221, 93); w.addObject('torch', 208, 97); w.addObject('torch', 224, 97);
  place('statue', 210, 95); place('statue', 223, 95); place('candles', 214, 94); place('candles', 219, 94); place('weapon_rack', 209, 101); place('armour_stand', 223, 101);
  npc('king', 217, 96, { wander: 1 }); npc('knight', 214, 99, { wander: 2 }); npc('knight', 220, 99, { wander: 2 });
  // bank
  building(233, 94, 10, 7, { floor: T.TILES, doors: [[4, 6], [5, 6]] });
  for (let x = 235; x <= 240; x++) place('bank_booth', x, 96);
  icon('bank', 237, 96); npc('banker', 236, 95, { wander: 0 }); npc('banker', 239, 95, { wander: 0 });
  // tavern
  building(243, 94, 7, 8, { doors: [[3, 7]] });
  place('counter', 244, 97); place('counter', 245, 97); place('counter', 246, 97); place('barrel', 247, 95); place('barrel', 248, 95);
  place('table', 245, 99); place('stool', 244, 99); place('stool', 247, 99);
  npc('bartender', 245, 96, { shop: 'tavern', wander: 1 }); icon('shop', 245, 96);
  // smithy
  building(208, 113, 10, 7, { floor: T.STONEFLOOR, doors: [[5, 0]] });
  place('furnace', 209, 114); place('furnace', 210, 114); place('anvil', 213, 117); place('anvil', 215, 117); place('barrel', 216, 114); place('weapon_rack', 216, 118);
  icon('furnace', 209, 114); icon('anvil', 214, 117);
  npc('smith', 212, 116, { shop: 'smithy', wander: 1 });
  // sword shop
  building(219, 113, 6, 6, { doors: [[2, 0]] }); place('weapon_rack', 220, 117); place('weapon_rack', 223, 117); place('counter', 222, 115);
  npc('shopkeeper', 222, 116, { shop: 'swords', name: 'Weaponsmith', wander: 1 }); icon('shop', 221, 116);
  // armour shop
  building(233, 113, 7, 6, { doors: [[3, 0]] }); place('armour_stand', 234, 117); place('armour_stand', 238, 117); place('counter', 236, 115);
  npc('shopkeeper', 236, 116, { shop: 'armour', name: 'Armourer', wander: 1 }); icon('shop', 236, 116);
  // crypt
  building(242, 116, 7, 7, { floor: T.STONEFLOOR, wall: T.WALL_DARK, doors: [[3, 0]] });
  place('trapdoor', 245, 119, { to: [12, 50, 'catacombs'], msg: 'You climb down into the catacombs.' }); icon('ladder', 245, 119);
  place('candles', 243, 117); place('candles', 247, 117); place('sarcophagus', 243, 119);
  for (const [x, y] of [[235, 121], [237, 123], [239, 121], [233, 123]]) place('gravestone', x, y);
  // stalls & square
  place('fountain', 227, 104);
  place('stall_bakery', 221, 105); place('stall_silk', 233, 103); place('stall_gem', 223, 111); place('stall_fish', 233, 112);
  for (const [x, y] of [[225, 99], [231, 99], [225, 117], [231, 117], [212, 110], [244, 110]]) place('lamp_post', x, y);
  // houses & greenery
  building(209, 121, 6, 5, { doors: [[3, 0]] }); place('bed', 210, 123); place('table', 212, 123);
  for (const [x, y] of [[219, 121], [222, 123], [241, 124], [209, 105], [212, 104]]) w.addObject(R() < 0.5 ? 'oak' : 'tree', x, y);
  spawnIn('guard', 5, 228, 108, 14); spawnIn('man', 2, 228, 108, 12); spawnIn('woman', 2, 228, 108, 12);
  npc('guard', 227, 124, { wander: 2 }); npc('guard', 229, 94, { wander: 2 });
  npc('monk', 238, 124, { wander: 3 });
  w.labels.push({ name: 'Highcrest', x: 228, y: 108, size: 2 });
  for (const [x, y] of [[196, 100], [198, 95], [194, 104], [200, 90]]) w.addObject('yew', x, y);

  // ================================================================ GOBLIN CAMP
  area('Goblin Camp', 150, 110, 180, 132, 'goblin');
  blob(164, 121, 10, T.DIRT, 0.2);
  place('tent', 156, 115); place('tent', 162, 112); place('tent', 157, 125); place('tent', 174, 112);
  place('campfire', 163, 120); place('crate', 160, 119); place('crate', 159, 120); place('barrel', 166, 118);
  w.addObject('skulls', 158, 122); w.addObject('skulls', 170, 130);
  building(167, 123, 8, 7, { wall: T.WALL_WOOD, floor: T.DIRT, doors: [[3, 0], [4, 0]] });
  w.addObject('banner_red', 170, 129); w.addObject('torch', 167, 126);
  npc('goblin_warlord', 170, 126, { wander: 2 });
  spawnIn('goblin', 9, 162, 120, 9); spawnIn('goblin_warrior', 3, 164, 118, 7);
  w.labels.push({ name: 'Goblin Camp', x: 164, y: 118, size: 1 });

  // ================================================================ PORT SELBY
  area('Port Selby', 110, 146, 148, 176, 'port');
  fill(126, 148, 146, 174, T.GRASS);
  fill(126, 156, 140, 162, T.COBBLE);
  building(127, 148, 7, 6, { doors: [[3, 5]] }); place('counter', 129, 151); place('counter', 130, 151); place('shelves', 128, 149); place('barrel', 132, 149);
  npc('fisher', 130, 150, { shop: 'fishing', name: 'Fisherman Jory', wander: 1 }); icon('shop', 130, 150);
  building(136, 148, 9, 7, { doors: [[4, 6]] }); place('counter', 138, 150); place('counter', 139, 150); place('range', 143, 149); place('table', 141, 152); place('stool', 140, 152); place('stool', 142, 152); place('barrel', 137, 149);
  icon('cook', 143, 149); npc('bartender', 139, 149, { shop: 'tavern', name: 'Barkeep Molly', wander: 1 });
  building(127, 164, 7, 5, { floor: T.TILES, doors: [[3, 0]] }); place('bank_booth', 128, 166); place('bank_booth', 129, 166); place('bank_booth', 130, 166); icon('bank', 129, 166);
  building(136, 164, 7, 6, { doors: [[3, 0]] }); place('bed', 141, 165); place('table', 138, 167); place('chair', 139, 167); place('crate', 141, 168);
  npc('captain', 138, 166, { wander: 1 });
  place('market_cart', 131, 171);
  const pier = (x, y, dir, len, name) => {
    // walk from (x,y) in dir until ocean, then extend a 2-wide pier
    let cx = x;
    while (inb(cx, y) && getT(cx, y) !== T.OCEAN) cx += dir;
    const start = cx - dir;
    for (let k = -1; k <= len; k++) { setT(start + k * dir, y, T.DOCK); setT(start + k * dir, y + 1, T.DOCK); }
    const end = start + len * dir;
    reserve(Math.min(start, end) - 1, y - 1, len + 3, 4);
    w.docks[name] = [end, y];
    return { start, end };
  };
  const ps = pier(126, 158, -1, 9, 'selby');
  place('rowboat', ps.end - 2, 160);
  npc('sailor', ps.end, 159, { wander: 0, name: 'Sailor Finn' });
  const ps2 = pier(126, 169, -1, 7, 'selby2');
  w.fishHints = [[ps.end + 2, 157, 'spot_net'], [ps.end + 5, 157, 'spot_net'], [ps2.end + 2, 168, 'spot_cage'], [ps2.end + 4, 171, 'spot_cage'], [ps.end + 3, 161, 'spot_net']];
  spawnIn('man', 2, 134, 160, 5); spawnIn('woman', 1, 134, 160, 5);
  w.labels.push({ name: 'Port Selby', x: 134, y: 160, size: 2 });

  // ================================================================ CRESTFALL MINE
  area('Crestfall Mine', 254, 130, 272, 148, 'mine');
  blob(263, 139, 7, T.DIRT, 0.3);
  w.mines = [
    { cx: 263, cy: 139, r: 6, rocks: { copper_rock: 5, tin_rock: 5, iron_rock: 4, coal_rock: 2 } },
    { cx: 192, cy: 86, r: 4, rocks: { iron_rock: 3, coal_rock: 3, tin_rock: 2 } },
    { cx: 290, cy: 242, r: 6, rocks: { gold_rock: 3, coal_rock: 4, mithril_rock: 2, iron_rock: 3 } },
    { cx: 346, cy: 76, r: 4, rocks: { adamant_rock: 3, mithril_rock: 2, coal_rock: 2 } },
    { cx: 354, cy: 62, r: 3, rocks: { rune_rock: 2 } },
    { cx: 338, cy: 122, r: 4, rocks: { coal_rock: 4, iron_rock: 2 } },
    { cx: 190, cy: 55, r: 4, rocks: { mithril_rock: 3, adamant_rock: 2, coal_rock: 2 } },
    { cx: 250, cy: 17, r: 2, rocks: { rune_rock: 2 } },
    { cx: 72, cy: 210, r: 4, rocks: { gold_rock: 2, copper_rock: 2, tin_rock: 2, iron_rock: 2 } },
    { cx: 40, cy: 26, r: 5, rocks: { coal_rock: 3, mithril_rock: 3 } },
  ];
  w.labels.push({ name: 'Crestfall Mine', x: 263, y: 136, size: 1 });

  // ================================================================ SANDHAVEN
  area('Sandhaven', 300, 198, 342, 236, 'desert_town');
  fill(302, 200, 340, 234, T.SAND);
  fill(304, 211, 336, 214, T.SANDFLOOR);
  building(305, 202, 8, 6, { wall: T.WALL_SAND, floor: T.SANDFLOOR, doors: [[4, 5]] });
  place('bank_booth', 307, 203); place('bank_booth', 308, 203); place('bank_booth', 309, 203); icon('bank', 308, 203);
  building(317, 202, 8, 6, { wall: T.WALL_SAND, floor: T.SANDFLOOR, doors: [[3, 5]] });
  place('counter', 319, 204); place('counter', 320, 204); place('shelves', 323, 203); place('crate', 318, 203);
  npc('merchant', 320, 203, { shop: 'sandhaven', wander: 1 }); icon('shop', 320, 203);
  building(305, 217, 7, 6, { wall: T.WALL_SAND, floor: T.SANDFLOOR, doors: [[3, 0]] });
  place('furnace', 306, 220); place('anvil', 309, 220); icon('furnace', 306, 220); icon('anvil', 309, 220);
  building(315, 218, 6, 5, { wall: T.WALL_SAND, floor: T.SANDFLOOR, doors: [[2, 0]] }); place('bed', 316, 219); place('range', 319, 219); icon('cook', 319, 219);
  place('stall_gem', 326, 208); place('market_cart', 312, 209);
  blob(325, 227, 3, T.WATER);
  for (const [x, y] of [[321, 225], [329, 225], [322, 230], [328, 230]]) w.addObject('palm', x, y);
  place('tent', 330, 216); place('tent', 334, 219); place('crate', 332, 215); place('crate', 336, 222); place('table', 331, 222);
  npc('petra', 332, 221, { wander: 2 });
  spawnIn('man', 2, 318, 212, 6, { look: 'desert' });
  w.labels.push({ name: 'Sandhaven', x: 320, y: 212, size: 2 });
  // bandit camp
  area('Bandit Camp', 342, 234, 360, 250, 'desert');
  place('tent', 346, 238); place('tent', 352, 236); place('tent', 350, 244); place('campfire', 349, 241); place('crate', 355, 242);
  npc('bandit_leader', 351, 240, { wander: 3 }); spawnIn('bandit', 5, 350, 241, 6);
  // pyramid
  area('The Great Pyramid', 356, 258, 388, 296, 'tomb');
  fill(358, 260, 386, 285, T.SAND);
  w.addObject('pyramid', 360, 262);
  reserve(356, 258, 32, 38);
  fill(364, 285, 380, 292, T.SANDFLOOR);
  place('tomb_door', 371, 285); icon('quest', 371, 285);
  place('statue', 366, 287); place('statue', 377, 287); place('pillar', 364, 290); place('pillar', 380, 290);
  place('cracked_sandstone', 386, 292);
  w.labels.push({ name: 'The Great Pyramid', x: 372, y: 272, size: 1 });
  spawnIn('scorpion', 8, 290, 242, 10); spawnIn('king_scorpion', 3, 290, 242, 7); spawnIn('desert_wolf', 5, 360, 210, 18); spawnIn('scorpion', 6, 350, 285, 14);

  // ================================================================ MORTMIRE
  area('Mortmire', 160, 206, 240, 254, 'swamp');
  building(189, 219, 13, 10, { wall: T.WALL_DARK, floor: T.WOOD, doors: [[6, 9]] });
  place('mortmire_bookcase', 191, 220); place('bookshelf', 192, 220); place('bookshelf', 198, 220); place('table', 194, 223); place('candles', 199, 223); place('cauldron', 191, 226);
  w.addObject('spinning_web', 200, 220); w.addObject('spinning_web', 190, 227);
  npc('ghost', 194, 225, { wander: 3 }); npc('ghost', 198, 226, { wander: 3 }); npc('ghost', 192, 222, { wander: 3 });
  fill(181, 229, 191, 237, T.SWAMP);
  for (let i = 0; i < 8; i++) place('gravestone', 183 + (i % 4) * 2, 231 + Math.floor(i / 4) * 3);
  fill(171, 234, 182, 245, T.SWAMP);
  building(173, 237, 7, 6, { wall: T.WALL_WOOD, floor: T.WOOD, doors: [[3, 0]] }); place('cauldron', 175, 239); place('shelves', 178, 238); place('bed', 178, 240);
  npc('witch', 176, 240, { wander: 1 });
  spawnIn('zombie', 6, 200, 232, 16); spawnIn('ghoul', 4, 210, 240, 12); spawnIn('giant_rat', 4, 180, 214, 10);
  w.labels.push({ name: 'Mortmire', x: 196, y: 232, size: 2 });

  // ================================================================ FROSTHOLD
  area('Frosthold', 326, 92, 352, 116, 'frost');
  building(333, 99, 9, 6, { wall: T.WALL_WOOD, floor: T.WOOD, doors: [[4, 5]] });
  place('fireplace', 334, 100); place('bed', 339, 100); place('table', 337, 101); place('crate', 340, 103);
  npc('hermit', 336, 102, { wander: 1, shop: 'frost' }); icon('shop', 336, 102);
  place('campfire', 337, 108);
  for (const [x, y] of [[344, 90], [351, 70], [358, 58], [326, 72], [362, 96], [348, 110]]) place('crystal', x, y);
  reserve(355, 85, 7, 7); place('moonpetal', 358, 88, { petal: 2 });
  spawnIn('ice_wolf', 5, 345, 80, 16); spawnIn('ice_giant', 5, 352, 66, 10); spawnIn('ice_wolf', 3, 320, 110, 10);
  w.labels.push({ name: 'Frostpeak', x: 348, y: 82, size: 2 });

  // ================================================================ WILDERNESS
  for (let x = 100; x <= 336; x++) {
    const y = 80;
    const t = getT(x, y);
    if (t !== T.OCEAN && t !== T.WATER && t !== T.VOID) { setT(x, y, T.DITCH); if (getT(x, y + 1) !== T.WATER && getT(x, y + 1) !== T.OCEAN) setT(x, y + 1, T.DITCH); }
  }
  // ruins of the tyrant
  area('Ruins of the Tyrant', 216, 14, 246, 42, 'boss');
  blob(231, 28, 12, T.STONEFLOOR, 0.15);
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = Math.round(231 + Math.cos(a) * 13), y = Math.round(28 + Math.sin(a) * 12);
    if (Math.sin(a * 5) > -0.35) setT(x, y, T.WALL_DARK);
  }
  reserve(216, 14, 31, 30);
  for (const [x, y] of [[224, 22], [238, 22], [224, 34], [238, 34]]) place('broken_pillar', x, y);
  place('pillar', 228, 19); place('pillar', 234, 19);
  npc('bone_tyrant', 230, 27, { wander: 2 });
  place('chaos_altar', 288, 58); icon('altar', 288, 58);
  for (const [x, y] of [[160, 40], [300, 64], [200, 22], [265, 48]]) place('obelisk', x, y);
  for (let i = 0; i < 10; i++) { const x = 176 + (i % 5) * 3, y = 64 + Math.floor(i / 5) * 3; place('gravestone', x, y); }
  for (const x of [148, 226, 276, 318]) place('wild_sign', x, 82);
  area('Wilderness Ruins', 244, 44, 262, 60, 'wild');
  for (let i = 0; i < 16; i++) { const x = 246 + Math.round(R() * 14), y = 46 + Math.round(R() * 12); setT(x, y, T.WALL_DARK); }
  spawnIn('dark_wizard', 6, 225, 74, 18); spawnIn('skeleton', 6, 252, 54, 10); spawnIn('zombie', 4, 182, 66, 8);
  spawnIn('chaos_knight', 5, 160, 60, 14); spawnIn('green_dragon', 5, 170, 28, 16); spawnIn('lesser_demon', 5, 296, 40, 14);
  spawnIn('bandit', 3, 205, 50, 10); spawnIn('wolf', 4, 130, 45, 12);
  w.labels.push({ name: 'The Wilderness', x: 225, y: 50, size: 3 });

  // ================================================================ ELDERGLEN
  area('Elderglen', 36, 144, 70, 176, 'elven');
  fill(38, 146, 68, 174, T.GRASS);
  fill(38, 157, 68, 159, T.DIRT);
  building(40, 149, 8, 6, { wall: T.WALL_WOOD, doors: [[3, 5]] }); place('bank_booth', 41, 150); place('bank_booth', 42, 150); place('bank_booth', 43, 150); icon('bank', 42, 150);
  building(51, 149, 8, 6, { wall: T.WALL_WOOD, doors: [[3, 5]] }); place('counter', 53, 151); place('counter', 54, 151); place('shelves', 57, 150);
  npc('elf', 54, 150, { shop: 'elven', name: 'Elven trader', wander: 1 }); icon('shop', 54, 150);
  building(44, 162, 8, 7, { wall: T.WALL_WOOD, doors: [[3, 0]] }); place('bed', 45, 166); place('bookshelf', 49, 163); place('potted_plant', 50, 167); place('table', 47, 165);
  npc('sylwen', 47, 166, { wander: 2 });
  building(56, 162, 7, 6, { wall: T.WALL_WOOD, doors: [[3, 0]] }); place('range', 61, 163); place('table', 58, 165); icon('cook', 61, 163);
  place('fountain', 62, 154);
  spawnIn('elf', 4, 52, 160, 10);
  const ep = pier(66, 158, 1, 7, 'elderglen'); w._ep = ep;
  npc('sailor', ep.end, 158, { wander: 0, name: 'Elven sailor' });
  w.fishHints.push([ep.end - 2, 157, 'spot_net'], [ep.end - 4, 160, 'spot_net']);
  area('Magic Grove', 18, 100, 40, 122, 'grove');
  blob(28, 111, 7, T.GRASS, 0.2);
  for (const [x, y] of [[24, 108], [32, 108], [24, 115], [32, 115]]) w.addObject('magic_tree', x, y);
  reserve(18, 100, 22, 22);
  place('moonpetal', 28, 111, { petal: 1 });
  spawnIn('moss_giant', 6, 55, 225, 14); spawnIn('bear', 4, 60, 110, 16); spawnIn('wolf', 3, 70, 130, 12); spawnIn('jungle_spider', 3, 30, 240, 10);
  w.labels.push({ name: 'Elderglen', x: 52, y: 158, size: 2 });

  // ================================================================ PALMERA
  area('Palmera', 136, 272, 186, 310, 'tropic');
  fill(152, 276, 166, 282, T.SAND);
  building(150, 277, 6, 5, { wall: T.WALL_WOOD, doors: [[2, 4]] }); place('counter', 152, 279); npc('shopkeeper', 152, 278, { shop: 'palmera', name: 'Trader Kalu', wander: 0 }); icon('shop', 152, 278);
  building(158, 277, 5, 4, { wall: T.WALL_WOOD, doors: [[2, 3]] }); place('bed', 159, 278);
  place('campfire', 157, 284);
  {
    let y = 278; while (inb(160, y) && getT(160, y) !== T.OCEAN) y--;
    for (let k = -1; k <= 6; k++) { setT(160, y - k, T.DOCK); setT(161, y - k, T.DOCK); }
    w.docks.palmera = [160, y - 6]; reserve(158, y - 7, 5, 9); w._palmY = y;
    npc('sailor', 161, y - 6, { wander: 0, name: 'Island sailor' });
    w.fishHints.push([159, y - 4, 'spot_cage'], [162, y - 2, 'spot_cage'], [162, y - 5, 'spot_cage']);
  }
  w.fishHints.push([160, 309, 'spot_shark'], [140, 296, 'spot_shark'], [178, 305, 'spot_cage']);
  blob(165, 294, 2.5, T.GRASS, 0.1); reserve(162, 291, 7, 7);
  place('moonpetal', 165, 294, { petal: 3 });
  spawnIn('monkey', 5, 160, 288, 12); spawnIn('jungle_spider', 4, 166, 296, 8);
  w.labels.push({ name: 'Palmera', x: 160, y: 290, size: 1 });

  // ================================================================ CINDERHOLD
  area('Cinderhold', 78, 286, 114, 314, 'volcano');
  blob(98, 301, 6, T.ASH, 0.1);
  {
    let y = 300; while (inb(100, y) && getT(100, y) !== T.OCEAN) y--;
    for (let k = -1; k <= 4; k++) { setT(100, y - k, T.DOCK); setT(101, y - k, T.DOCK); }
    w.docks.cinderhold = [100, y - 4]; reserve(98, y - 6, 5, 8);
    npc('captain', 101, y - 4, { wander: 0, name: 'Captain Rook', cinder: true });
  }
  place('dragon_skull', 90, 296); place('dragon_skull', 104, 306);
  npc('emberwing', 97, 302, { wander: 2 });
  spawnIn('baby_red_dragon', 4, 94, 296, 9); spawnIn('lava_imp', 4, 100, 298, 10);
  w.labels.push({ name: 'Cinderhold', x: 96, y: 296, size: 1 });
  w.points.cinderholdDock = w.docks.cinderhold;

  // ================================================================ 1.1: DUNGEON ENTRANCES
  entrance('manhole', 214, 181, 'sewers', 'You climb down into the stinking sewers.');
  entrance('mine_shaft', 268, 136, 'deeps', 'You climb down the long ladder into Crestfall Deeps.');
  entrance('stairs_down', 197, 225, 'crypt', 'You descend into the crypt beneath the manor.', true);
  entrance('cave_entrance', 60, 196, 'hollowroot', 'You duck into the roots of the forest.');
  entrance('ice_cave_entrance', 352, 90, 'icecaves', 'You enter the freezing caves.');
  entrance('lava_cave_entrance', 88, 292, 'depths', 'You squeeze down into the heart of the volcano.');

  // ================================================================ 1.1: SKILLING ADDITIONS
  // Brindlewood crafting yard and tanner
  area('Crafting yard', 184, 176, 195, 184, 'town');
  placeNear('pottery_wheel', 187, 178); placeNear('pottery_oven', 190, 178); placeNear('spinning_wheel', 193, 178);
  npc('potter', 189, 181, { shop: 'crafting', wander: 1 }); icon('shop', 189, 181); icon('craft', 190, 178);
  npc('tanner', 199, 175, { wander: 1 }); icon('craft', 199, 175);
  placeNear('sink', 200, 152);
  // Hilda's farm: sheep pen, fields, dairy churn, water pump
  fenceRect(165, 130, 172, 134, [[168, 134]]);
  spawnIn('sheep', 4, 168, 132, 2);
  fill(160, 147, 166, 151, T.FARMLAND);
  for (let y = 147; y <= 151; y++) for (let x = 160; x <= 166; x++) if ((x + y) % 2 === 0) w.addObject(y < 149 ? 'potato_plant' : 'tomato_plant', x, y);
  placeNear('churn', 184, 145); placeNear('water_pump', 181, 145);
  // Elderglen flax field and vineyard
  for (let y = 170; y <= 173; y++) for (let x = 60; x <= 66; x++) if ((x + y) % 2 === 0 && walkable(x, y)) w.addObject('flax_plant', x, y);
  for (const [x, y] of [[40, 170], [42, 170], [44, 170]]) placeNear('grape_vine', x, y);
  // sand
  placeNear('sand_pit', 123, 152); placeNear('sand_pit', 326, 224);
  // thieving: stalls, chests, marks
  placeNear('stall_silver', 236, 104); placeNear('stall_fur', 342, 108); placeNear('stall_spice', 330, 208);
  placeNear('chest_10', 213, 123); placeNear('chest_50', 139, 167);
  npc('hero', 212, 98, { wander: 2 }); npc('hero', 221, 98, { wander: 2 });
  spawnIn('warrior', 3, 228, 118, 6); spawnIn('rogue', 2, 134, 170, 4); spawnIn('rogue', 2, 150, 84, 6);
  // beaches: crabs
  spawnIn('rock_crab', 6, 117, 138, 5); spawnIn('rock_crab', 4, 114, 186, 5); spawnIn('sand_crab', 6, 148, 296, 7);
  // trees
  for (const [x, y] of [[26, 126], [33, 128]]) placeNear('heartwood', x, y);

  // ================================================================ 1.3: MAGIC & RUNECRAFT
  npc('archmage', 231, 120, { shop: 'magic', wander: 1 }); icon('shop', 231, 120); icon('rune', 231, 120);
  w.points.exit_essence = [231, 121];
  for (const [rune, [x, y]] of Object.entries(ALTAR_SITES)) {
    const o = entrance('mysterious_ruins', x, y, 'altar_' + rune, `You are pulled into the ${RUNE[rune].name.toLowerCase()} altar.`);
    o.rune = rune;
  }
  spawnIn('cultist', 5, 285, 62, 6); spawnIn('cultist', 3, 268, 68, 5);

  // ================================================================ 1.4: AGILITY & HERBLORE
  // course tiles, plus a margin kept free of trees (the scatter pass skips reserved tiles)
  const clearTile = (x, y, t) => { const o = w.obj(x, y); if (o) w.removeObject(o); setT(x, y, t); reserve(x - 1, y - 1, 3, 3); };
  for (const c of COURSES) {
    const floor = T[c.floor];
    let [x, y] = c.start;
    clearTile(x, y, floor);
    const obs = [];
    for (const st of c.steps) {
      const [dx, dy] = DIRS[st[1]];
      if (st[0] === 'walk') { for (let i = 0; i < st[2]; i++) { x += dx; y += dy; clearTile(x, y, floor); } continue; }
      const [type, , gap, g] = st;
      const ox = x + dx, oy = y + dy;
      clearTile(ox, oy, floor);
      for (let k = 1; k <= gap; k++) {
        clearTile(ox + dx * k, oy + dy * k, T[g]);
        // show what you cross: logs, stones and ropes over the gap
        const seg = type === 'log_balance' ? 'log_segment' : type === 'stepping_stone' ? 'stone_segment' : ['rope_swing', 'zip_line', 'ledge'].includes(type) ? 'rope_segment' : null;
        if (seg) w.addObject(seg, ox + dx * k, oy + dy * k);
      }
      const lx = ox + dx * (gap + 1), ly = oy + dy * (gap + 1);
      clearTile(lx, ly, floor);
      const o = w.addObject(type, ox, oy);
      o.agility = { to: [lx, ly], course: c.id, index: obs.length, lvl: c.lvl, xp: c.xp };
      obs.push(o);
      x = lx; y = ly;
    }
    for (const o of obs) o.agility.count = obs.length;
    obs[obs.length - 1].agility.last = true;
    icon('agility', c.start[0], c.start[1]);
    w.labels.push({ name: c.name, x: c.start[0] + 3, y: c.start[1] - 2, size: 1 });
  }
  for (const sc of SHORTCUTS) {
    let a = sc.a, b = sc.b, at = null;
    if (sc.across) {
      // walk from `from` until the water starts, then until it ends
      const [dx, dy] = DIRS[sc.dir];
      let [x, y] = sc.from, n = 0;
      while (!w.isWater(x + dx, y + dy) && n++ < 20) { x += dx; y += dy; }
      a = [x, y]; at = [x + dx, y + dy];
      x += dx; y += dy; n = 0;
      while (w.isWater(x, y) && n++ < 20) { if (n > 1) w.addObject('stone_segment', x, y); x += dx; y += dy; }
      b = [x, y];
    } else at = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    // both ends must be open ground
    for (const [ex, ey] of [a, b]) clearTile(ex, ey, TINFO[getT(ex, ey)].block ? T.DIRT : getT(ex, ey));
    reserve(at[0], at[1]);
    const old = w.obj(at[0], at[1]); if (old) w.removeObject(old);
    const o = w.addObject(sc.type, at[0], at[1]);
    o.agility = { a, b, lvl: sc.lvl, xp: sc.xp };
    icon('agility', at[0], at[1]);
  }
  npc('grace', 224, 122, { wander: 2 }); icon('agility', 224, 122);
  npc('apothecary', 181, 241, { shop: 'apothecary', wander: 1 }); icon('shop', 181, 241);
  for (const [x, y] of [[176, 246], [186, 238], [206, 244], [214, 226]]) placeNear('fungus_log', x, y);
  for (const [x, y] of [[146, 300], [170, 302], [126, 176], [118, 150]]) placeNear('snape_grass_plant', x, y);
  for (const [x, y] of [[92, 292], [104, 300], [86, 304]]) placeNear('fire_lily_plant', x, y);
  for (const [x, y] of [[300, 228], [340, 230], [310, 250], [360, 260]]) placeNear('desert_bloom_plant', x, y);
  for (const [x, y] of [[62, 176], [30, 184], [70, 150]]) placeNear('white_berry_bush', x, y);

  // ================================================================ 1.2: RANGED
  spawnIn('goblin_archer', 3, 162, 120, 8); spawnIn('bandit_archer', 3, 350, 241, 6);
  npc('elf_bowyer', 51, 170, { shop: 'bowyer', wander: 1 }); icon('shop', 51, 170);
  npc('shopkeeper', 241, 111, { shop: 'fletcher', name: 'Fletcher Oswin', wander: 1 }); icon('shop', 241, 111);
  // extra rocks and fishing
  w.mines.push({ cx: 150, cy: 178, r: 3, rocks: { clay_rock: 4 } }, { cx: 72, cy: 210, r: 4, rocks: { silver_rock: 2, clay_rock: 2 } });
  w.mines[0].rocks.silver_rock = 2; w.mines[2].rocks.gem_rock = 2;
  w.fishHints.push([ps.end + 1, 164, 'spot_bignet'], [ps.end + 2, 166, 'spot_bignet'], [140, 300, 'spot_monk'], [182, 296, 'spot_monk'], [84, 306, 'spot_angler'], [110, 294, 'spot_angler'], [200, 10, 'spot_darkcrab'], [166, 14, 'spot_darkcrab']);

  // ================================================================ ROADS
  const roadCost = (x, y) => {
    const t = getT(x, y);
    if (t === T.OCEAN || t === T.VOID || t === T.LAVA || TINFO[t].wall) return -1;
    const o = w.obj(x, y);
    if (o && !OBJECTS[o.type].door && OBJECTS[o.type].blocks) return -1;
    if (t === T.DIRT || t === T.COBBLE || t === T.BRIDGE) return 0.35;
    if (t === T.WATER || t === T.SWAMPWATER) return 14;
    if (TINFO[t].crisp) return 3;
    if (t === T.DARKGRASS) return 1.3;
    if (t === T.SWAMP) return 2;
    return 1;
  };
  const road = (ax, ay, bx, by) => {
    const heap = new Heap();
    const g = new Float32Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1);
    const s = idx(ax, ay), e = idx(bx, by);
    g[s] = 0; heap.push(s, 0);
    let n = 0;
    while (heap.size && n++ < 200000) {
      const c = heap.pop();
      if (c === e) break;
      const cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!inb(nx, ny)) continue;
        const cost = roadCost(nx, ny);
        if (cost < 0) continue;
        const ni = idx(nx, ny), ng = g[c] + cost + (hash2(nx, ny, 90) * 0.3);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = c; heap.push(ni, ng + (Math.abs(nx - bx) + Math.abs(ny - by)) * 0.35); }
      }
    }
    if (from[e] < 0) return;
    for (let c = e; c >= 0; c = from[c]) {
      const x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) {
        const tx = x + dx, ty = y + dy, t = getT(tx, ty);
        if (t === T.WATER || t === T.SWAMPWATER) setT(tx, ty, T.BRIDGE);
        else if ([T.GRASS, T.DARKGRASS, T.SAND, T.SNOW, T.SWAMP, T.ASH, T.DITCH].includes(t)) {
          const o = w.obj(tx, ty);
          if (o && !OBJECTS[o.type].door) continue;
          setT(tx, ty, T.DIRT);
        }
      }
    }
  };
  road(206, 176, 228, 128);
  road(196, 168, 128, 160);
  road(218, 168, 258, 139);
  road(262, 142, 314, 210);
  road(228, 91, 228, 60);
  road(251, 108, 334, 106);
  road(206, 176, 200, 230);
  road(330, 214, 372, 288);
  road(206, 108, 170, 121);
  road(196, 168, 178, 146);
  road(186, 147, 176, 144);
  road(200, 166, 192, 161);
  road(66, 158, w._ep.start, 158);
  road(157, 283, 160, w._palmY + 1);
  road(228, 60, 231, 41);
  road(40, 158, 66, 158);
  road(314, 212, 290, 242);
  road(100, 296, 97, 305);

  // ================================================================ FISHING SPOTS
  const usedSpot = new Set();
  const fishSpot = (type, cx, cy) => {
    for (let r = 0; r < 8; r++)
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
        const x = cx + i, y = cy + j;
        if (!w.isWater(x, y) || w.obj(x, y) || usedSpot.has(idx(x, y))) continue;
        let shore = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (walkable(x + dx, y + dy)) shore = true;
        if (!shore) continue;
        w.addObject(type, x, y); usedSpot.add(idx(x, y)); icon('fish', x, y);
        return;
      }
  };
  for (const [x, y, t] of w.fishHints) fishSpot(t, x, y);
  for (const [x, y] of [[241, 162], [241, 170], [238, 182], [236, 190]]) fishSpot('spot_lure', x, y);
  for (const [x, y] of [[30, 130], [28, 145], [31, 180]]) fishSpot('spot_lure', x, y);
  for (const [x, y] of [[345, 240], [352, 228]]) fishSpot('spot_lure', x, y);
  for (const [x, y] of [[300, 88], [290, 94]]) fishSpot('spot_lure', x, y);
  for (const [x, y] of [[196, 262], [214, 264]]) fishSpot('spot_net', x, y);

  // ================================================================ MINES
  for (const m of w.mines) {
    for (const [type, n] of Object.entries(m.rocks)) {
      let k = n, tries = 0;
      while (k > 0 && tries++ < 300) {
        const x = Math.round(m.cx + (R() * 2 - 1) * m.r), y = Math.round(m.cy + (R() * 2 - 1) * m.r);
        if (!walkable(x, y) || w.obj(x, y)) continue;
        const t = getT(x, y);
        if (t === T.BRIDGE || t === T.DOCK || TINFO[t].crisp && t !== T.CAVE) continue;
        w.addObject(type, x, y); reserve(x, y); k--;
      }
    }
    icon('mine', m.cx, m.cy);
  }

  B.applyAreas();
  const townAreas = new Set(w.areas.filter((a) => ['town', 'city', 'port', 'desert_town', 'farm', 'elven'].includes(a.music)).map((a) => a.id));

  // ================================================================ SCATTER: trees, rocks, decor
  const nearWater = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (getT(x + i, y + j) === T.WATER || getT(x + i, y + j) === T.SWAMPWATER) return true; return false; };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      const t = w.ground[k], b = w.biome[k];
      if (reserved[k] || w.objAt[k] >= 0) continue;
      const natural = t === T.GRASS || t === T.DARKGRASS || t === T.SNOW || t === T.SAND || t === T.SWAMP || t === T.ASH;
      if (!natural) {
        if (t === T.WATER && hash2(x, y, 80) < 0.03 && nearWater(x, y, 0)) w.decor[k] = D.LILY;
        if (t === T.LAVA) continue;
        continue;
      }
      // keep roads clear
      let nearRoad = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nt = getT(x + dx, y + dy); if (nt === T.DIRT || nt === T.COBBLE || nt === T.BRIDGE || nt === T.DOCK) nearRoad = true; }
      const inTown = townAreas.has(w.area[k]);
      const h0 = hash2(x, y, 81), h = h0 * (inTown ? 5 : 1), h2 = hash2(x, y, 82);
      const forest = fbm(x / 18, y / 18, 5, 3);
      let tree = null;
      switch (b) {
        case BIOME.KINGDOM: {
          const dens = t === T.DARKGRASS ? 0.3 : forest > 0.52 ? 0.08 : 0.018;
          if (h < dens && t !== T.SAND) {
            if (nearWater(x, y, 2) && h2 < 0.6) tree = 'willow';
            else if (x > 255 && x < 300 && y > 84 && y < 128 && h2 < 0.45) tree = 'maple';
            else if (h2 < 0.24) tree = 'oak';
            else if (h2 > 0.992) tree = 'yew';
            else tree = 'tree';
          }
          break;
        }
        case BIOME.ELVEN:
          if (h < (t === T.DARKGRASS ? 0.34 : 0.07) && t !== T.SAND) {
            if (nearWater(x, y, 2) && h2 < 0.6) tree = 'willow';
            else if (h2 < 0.06) tree = 'teak';
            else if (h2 < 0.3) tree = 'oak';
            else if (h2 < 0.36) tree = 'yew';
            else if (h2 < 0.46) tree = 'maple';
            else tree = 'tree';
          }
          break;
        case BIOME.WILD:
          if (h < (t === T.DARKGRASS ? 0.12 : 0.03)) tree = h2 < 0.06 ? 'yew' : h2 < 0.075 ? 'magic_tree' : 'dead_tree';
          break;
        case BIOME.FROST: if (h < 0.09) tree = 'pine'; break;
        case BIOME.DESERT:
          if (h < 0.012) tree = 'cactus';
          else if (nearWater(x, y, 2) && h < 0.12) tree = 'palm';
          break;
        case BIOME.SWAMP: if (h < 0.12) tree = h2 < 0.4 ? 'swamp_tree' : 'dead_tree'; break;
        case BIOME.TROPIC: if (h < (t === T.DARKGRASS ? 0.4 : t === T.SAND ? 0.05 : 0.12)) tree = t === T.SAND || h2 < 0.4 ? 'palm' : h2 < 0.6 ? 'teak' : h2 < 0.75 ? 'mahogany' : 'jungle_tree'; break;
        case BIOME.VOLCANIC: if (h < 0.03) tree = h2 < 0.5 ? 'dead_tree' : 'lava_rock'; break;
      }
      if (tree && !nearRoad) { w.addObject(tree, x, y); continue; }
      if (!nearRoad && !inTown && h0 > 0.994 && b !== BIOME.DESERT) { w.addObject(b === BIOME.KINGDOM || b === BIOME.ELVEN ? (h2 < 0.3 ? 'berry_bush' : 'bush') : 'boulder', x, y); continue; }
      if (!nearRoad && !inTown && b === BIOME.DESERT && h0 > 0.993) { w.addObject('boulder', x, y); continue; }
      // decor
      const dd = hash2(x, y, 83);
      if (t === T.GRASS || t === T.DARKGRASS) {
        if (dd < 0.035) w.decor[k] = [D.FLOWER_W, D.FLOWER_B, D.FLOWER_Y, D.FLOWER_R][Math.floor(h2 * 4)];
        else if (dd < 0.11) w.decor[k] = D.TUFT;
        else if (dd < 0.12) w.decor[k] = D.PEBBLES;
        else if (dd < 0.13 && t === T.DARKGRASS) w.decor[k] = D.MUSHROOM;
        else if (dd < 0.15 && t === T.DARKGRASS) w.decor[k] = D.FERN;
        else if (dd < 0.16 && x > 255 && x < 300 && y > 84 && y < 128) w.decor[k] = D.LEAVES;
        if (nearWater(x, y, 1) && dd > 0.8) w.decor[k] = D.REEDS;
      } else if (t === T.SAND) {
        if (dd < 0.012) w.decor[k] = D.SHELL; else if (dd < 0.03) w.decor[k] = D.PEBBLES; else if (dd < 0.036 && b === BIOME.DESERT) w.decor[k] = D.BONES;
      } else if (t === T.SNOW) { if (dd < 0.07) w.decor[k] = D.SNOWTUFT; }
      else if (t === T.ASH) {
        if (dd < 0.03) w.decor[k] = D.DEADBUSH; else if (dd < 0.045) w.decor[k] = D.BONES; else if (dd < 0.08 && (b === BIOME.VOLCANIC || y < 50)) w.decor[k] = D.CRACKS; else if (dd < 0.09) w.decor[k] = D.EMBERS;
      } else if (t === T.SWAMP) { if (dd < 0.05) w.decor[k] = D.DEADBUSH; else if (dd < 0.1 && nearWater(x, y, 1)) w.decor[k] = D.REEDS; else if (dd < 0.12) w.decor[k] = D.MUSHROOM; }
    }
  // ================================================================ ROAMING SPAWNS
  spawnIn('chicken', 3, 196, 186, 5); spawnIn('rat', 4, 214, 186, 10);
  spawnIn('spider', 5, 170, 170, 10); spawnIn('giant_rat', 4, 150, 140, 10);
  spawnIn('highwayman', 3, 164, 162, 10); spawnIn('highwayman', 2, 250, 150, 8);
  spawnIn('bear', 4, 280, 110, 12); spawnIn('wolf', 3, 285, 95, 8);
  spawnIn('man', 1, 263, 136, 3); spawnIn('goblin', 4, 230, 140, 8); spawnIn('hill_giant', 3, 150, 100, 8);
  spawnIn('cow', 3, 244, 200, 5);


  w.labels.push(
    { name: 'Aldermoor', x: 200, y: 115, size: 3, faint: true }, { name: 'Sundral Desert', x: 340, y: 250, size: 3, faint: true },
    { name: 'Elderglen Forest', x: 50, y: 200, size: 3, faint: true }, { name: 'Mortmire Swamp', x: 205, y: 244, size: 2, faint: true },
    { name: 'Magic Grove', x: 28, y: 106, size: 1 }, { name: 'Ruins of the Tyrant', x: 231, y: 12, size: 1 }, { name: 'Frosthold', x: 337, y: 97, size: 1 },
  );
  return w;
}

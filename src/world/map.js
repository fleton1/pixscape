// Tile map: terrain, decor, objects, collision.
import { OBJECTS } from '../data/objects.js';

// The overworld's size. Dungeons and other areas are separate World instances with their own size.
export const OW_W = 420, OW_H = 320;
export const TS = 16; // pixels per tile

export const T = {
  OCEAN: 0, WATER: 1, GRASS: 2, DARKGRASS: 3, DIRT: 4, SAND: 5, COBBLE: 6, WOOD: 7, STONEFLOOR: 8, SNOW: 9,
  SWAMP: 10, SWAMPWATER: 11, ASH: 12, LAVA: 13, BRIDGE: 14, VOID: 15, CAVE: 16, CARPET_RED: 17, CARPET_BLUE: 18,
  TILES: 19, SANDFLOOR: 20, FARMLAND: 21, DITCH: 22, ICE: 23, DOCK: 24,
  WALL: 30, WALL_WOOD: 31, WALL_SAND: 32, CAVE_WALL: 33, WALL_DARK: 34, WALL_ICE: 35,
};

// block: impassable; crisp: hard edges (man-made); water: fishing-adjacent / shore rules
export const TINFO = [];
const def = (id, o) => (TINFO[id] = { block: false, crisp: false, water: false, wall: false, ...o });
def(T.OCEAN, { name: 'Sea', block: true, water: true, map: '#2e5a96' });
def(T.WATER, { name: 'Water', block: true, water: true, map: '#3a6fb0' });
def(T.GRASS, { name: 'Grass', map: '#4d8a2c' });
def(T.DARKGRASS, { name: 'Grass', map: '#3c6f22' });
def(T.DIRT, { name: 'Path', map: '#86683c' });
def(T.SAND, { name: 'Sand', map: '#d2bb74' });
def(T.COBBLE, { name: 'Road', map: '#7f7e78' });
def(T.WOOD, { name: 'Floor', crisp: true, map: '#6e4a28' });
def(T.STONEFLOOR, { name: 'Floor', crisp: true, map: '#6b675f' });
def(T.SNOW, { name: 'Snow', map: '#e2eaf1' });
def(T.SWAMP, { name: 'Swamp', map: '#4c5b30' });
def(T.SWAMPWATER, { name: 'Bog', block: true, water: true, map: '#35462d' });
def(T.ASH, { name: 'Ash', map: '#4a3f36' });
def(T.LAVA, { name: 'Lava', block: true, map: '#e0561b' });
def(T.BRIDGE, { name: 'Bridge', crisp: true, map: '#8a6034' });
def(T.VOID, { name: 'Darkness', block: true, crisp: true, map: '#000000' });
def(T.CAVE, { name: 'Cave floor', map: '#4b4139' });
def(T.CARPET_RED, { name: 'Carpet', crisp: true, map: '#8e2222' });
def(T.CARPET_BLUE, { name: 'Carpet', crisp: true, map: '#26428e' });
def(T.TILES, { name: 'Floor', crisp: true, map: '#8b8780' });
def(T.SANDFLOOR, { name: 'Floor', crisp: true, map: '#c4a162' });
def(T.FARMLAND, { name: 'Field', crisp: true, map: '#6b4a2a' });
def(T.DITCH, { name: 'Ditch', map: '#2a231d' });
def(T.ICE, { name: 'Ice', map: '#aad3ea' });
def(T.DOCK, { name: 'Pier', crisp: true, map: '#7a5530' });
def(T.WALL, { name: 'Wall', block: true, crisp: true, wall: true, map: '#e8e8e8' });
def(T.WALL_WOOD, { name: 'Wall', block: true, crisp: true, wall: true, map: '#e8e8e8' });
def(T.WALL_SAND, { name: 'Wall', block: true, crisp: true, wall: true, map: '#f0e6c8' });
def(T.CAVE_WALL, { name: 'Rock', block: true, crisp: true, wall: true, map: '#2a221c' });
def(T.WALL_DARK, { name: 'Ruins', block: true, crisp: true, wall: true, map: '#b0b0a8' });
def(T.WALL_ICE, { name: 'Ice wall', block: true, crisp: true, wall: true, map: '#dff2ff' });

export const D = { NONE: 0, FLOWER_W: 1, FLOWER_B: 2, FLOWER_Y: 3, FLOWER_R: 4, TUFT: 5, PEBBLES: 6, MUSHROOM: 7, BONES: 8, SNOWTUFT: 9, DEADBUSH: 10, LILY: 11, REEDS: 12, SHELL: 13, CRACKS: 14, FERN: 15, LEAVES: 16, EMBERS: 17 };

// One map: the overworld ('main') or a dungeon. Only the map the player is on is simulated; the
// others keep their NPCs, ground items and objects frozen until the player comes back.
//   kind:     'overworld' | 'dungeon'
//   dark:     0..1 darkness overlay (dungeons); light sources and the player cut through it
//   entrance: [x, y] on the overworld, shown on the world map while the player is inside
export class World {
  constructor(id = 'main', W = OW_W, H = OW_H, meta = {}) {
    this.id = id; this.W = W; this.H = H;
    this.name = meta.name || ''; this.kind = meta.kind || 'overworld';
    this.music = meta.music || null; this.dark = meta.dark || 0; this.entrance = meta.entrance || null;
    this.wild = meta.wild || 0; this.multi = !!meta.multi;   // Wilderness level of a dungeon; multi-combat
    this.ground = new Uint8Array(W * H);
    this.decor = new Uint8Array(W * H);
    this.biome = new Uint8Array(W * H);
    this.area = new Uint8Array(W * H);
    this.objAt = new Int32Array(W * H).fill(-1);
    this.objects = [];
    this.spawns = [];
    this.labels = [];
    this.areas = [];
    this.mapIcons = [];
    this.itemSpawns = [];
    this.points = {};
    this.docks = {};
    // live state
    this.npcs = [];
    this.npcById = new Map();
    this.groundItems = [];
    this.chunks = new Map(); // baked ground chunks (renderer cache)
  }
  idx(x, y) { return y * this.W + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  t(x, y) { return this.inb(x, y) ? this.ground[y * this.W + x] : T.VOID; }
  set(x, y, t) { if (this.inb(x, y)) this.ground[y * this.W + x] = t; }
  obj(x, y) {
    if (!this.inb(x, y)) return null;
    const i = this.objAt[y * this.W + x];
    return i >= 0 ? this.objects[i] : null;
  }
  blocked(x, y) {
    if (!this.inb(x, y)) return true;
    const i = y * this.W + x;
    if (TINFO[this.ground[i]].block) return true;
    const o = this.objAt[i];
    if (o >= 0) {
      const ob = this.objects[o];
      const d = OBJECTS[ob.type];
      if (d.door) return !ob.open;
      if (d.blocks) return true;
    }
    return false;
  }
  // Diagonal steps may not cut corners.
  canStep(fx, fy, tx, ty) {
    if (this.blocked(tx, ty)) return false;
    if (fx !== tx && fy !== ty) {
      if (this.blocked(tx, fy) || this.blocked(fx, ty)) return false;
    }
    return true;
  }
  addObject(type, x, y, extra = {}) {
    const d = OBJECTS[type];
    if (!d) throw new Error('unknown object ' + type);
    const w = d.w || 1, h = d.h || 1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!this.inb(x + i, y + j) || this.objAt[this.idx(x + i, y + j)] >= 0) return null;
    }
    const o = { id: this.objects.length, type, x, y, w, h, open: d.door ? true : undefined, depleted: 0, ...extra };
    this.objects.push(o);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.objAt[this.idx(x + i, y + j)] = o.id;
    return o;
  }
  removeObject(o) {
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      const k = this.idx(o.x + i, o.y + j);
      if (this.objAt[k] === o.id) this.objAt[k] = -1;
    }
    o.removed = true;
  }
  // Line of sight for ranged attacks: walls, rock and tall blocking objects (trees, pillars) block it;
  // water and low objects don't.
  sees(x0, y0, x1, y1) {
    let x = x0, y = y0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (x !== x1 || y !== y1) {
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
      if (x === x1 && y === y1) break;
      const t = this.t(x, y);
      if (TINFO[t].wall || t === T.VOID) return false;
      const o = this.obj(x, y);
      if (o && OBJECTS[o.type].blocks && OBJECTS[o.type].tall) return false;
    }
    return true;
  }
  // Rebuild index for a re-added dynamic object (fires).
  isWater(x, y) { return TINFO[this.t(x, y)].water; }
}

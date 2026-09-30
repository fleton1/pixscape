// Location helpers: wilderness level, area & biome names.
import { G } from './state.js';
import { BIOME, BIOME_INFO } from '../world/gen.js';

export function biomeAt(x, y) { const w = G.world; return w.inb(x, y) ? w.biome[y * w.W + x] : BIOME.OCEAN; }
export function areaAt(x, y) { const w = G.world; const a = w.inb(x, y) ? w.area[y * w.W + x] : 0; return a ? w.areas[a - 1] : null; }
export function wildLevel(x, y) {
  if (!G.world || biomeAt(x, y) !== BIOME.WILD) return 0;
  return Math.max(1, Math.floor((80 - y) / 1.2) + 1);
}
export function underground() { return G.world.kind === 'dungeon'; }
export function placeName(x, y) {
  const a = areaAt(x, y);
  if (a) return a.name;
  return G.world.name || BIOME_INFO[biomeAt(x, y)]?.name || '';
}
export function musicAt(x, y) {
  const a = areaAt(x, y);
  if (a && a.music) return a.music;
  return G.world.music || BIOME_INFO[biomeAt(x, y)]?.music || 'kingdom';
}

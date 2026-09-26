// Location helpers: wilderness level, area & biome names.
import { G } from './state.js';
import { W } from '../world/map.js';
import { BIOME, BIOME_INFO, AREAS } from '../world/gen.js';

export function biomeAt(x, y) { return G.world.biome[y * W + x]; }
export function areaAt(x, y) { const a = G.world.area[y * W + x]; return a ? AREAS[a - 1] : null; }
export function wildLevel(x, y) {
  if (!G.world || biomeAt(x, y) !== BIOME.WILD) return 0;
  return Math.max(1, Math.floor((80 - y) / 1.2) + 1);
}
export function underground(x, y) { const b = biomeAt(x, y); return b === BIOME.CAVE || b === BIOME.TOMB; }
export function placeName(x, y) {
  const a = areaAt(x, y);
  if (a) return a.name;
  return BIOME_INFO[biomeAt(x, y)]?.name || '';
}
export function musicAt(x, y) {
  const a = areaAt(x, y);
  if (a && a.music) return a.music;
  return BIOME_INFO[biomeAt(x, y)]?.music || 'kingdom';
}

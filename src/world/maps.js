// Every map in the game: the overworld plus the dungeons.
import { generateWorld } from './gen.js';
import { buildDungeons } from './dungeons.js';

export function buildWorlds() {
  const worlds = new Map();
  const main = generateWorld();
  worlds.set(main.id, main);
  for (const d of buildDungeons()) worlds.set(d.id, d);
  return worlds;
}

// Every map in the game: the overworld plus the dungeons, linked by their entrances and exits.
import { generateWorld } from './gen.js';
import { buildDungeons } from './dungeons.js';

export function buildWorlds() {
  const worlds = new Map();
  const main = generateWorld();
  worlds.set(main.id, main);
  for (const d of buildDungeons()) worlds.set(d.id, d);
  // Overworld entrances lead to each dungeon's arrival point; dungeon exits lead back out beside them.
  for (const o of main.objects) {
    if (!o.toMap) continue;
    const d = worlds.get(o.toMap);
    if (!d) throw new Error('entrance to unknown map ' + o.toMap);
    o.to = [...d.points.arrive, d.id];
    d.entrance = [o.x, o.y];
  }
  for (const d of worlds.values()) {
    for (const o of d.objects) if (o.toMain) o.to = [...main.points['exit_' + d.id], 'main'];
  }
  return worlds;
}

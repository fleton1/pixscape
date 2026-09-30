#!/usr/bin/env node
// Content validator: `node tools/validate.mjs`. Exits non-zero on errors.
// Checks that data references resolve, every item can be obtained, every monster drops something,
// and every map's ladders, portals and spawns are reachable on foot from where the player arrives.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => join(ROOT, 'src', p);
const { ITEMS } = await import(src('data/items.js'));
const { NPCS, RARE_TABLE } = await import(src('data/npcs.js'));
const { OBJECTS } = await import(src('data/objects.js'));
const { SHOPS } = await import(src('data/skills.js'));
const { buildWorlds } = await import(src('world/maps.js'));
const content = await import(src('data/recipes.js'));

const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
const itemOk = (id, where) => { if (id && !ITEMS[id]) err(`${where}: unknown item '${id}'`); };

// ------------------------------------------------------------------ sources of items
const sources = new Map(); // item -> [where]
const addSource = (id, where) => { if (!id) return; itemOk(id, where); if (!sources.has(id)) sources.set(id, []); sources.get(id).push(where); };

for (const [id, n] of Object.entries(NPCS)) {
  const d = n.drops;
  if (n.hp && n.lvl) {
    const any = d && ((d.always && d.always.length) || (d.main || []).some((x) => x.item) || (d.uniques || []).length || d.rare || d.clue);
    if (!any) err(`npc '${id}' (${n.name}) is a monster with no loot`);
  }
  for (const [it] of d?.always || []) addSource(it, `drop:${id}`);
  for (const x of d?.main || []) addSource(x.item, `drop:${id}`);
  for (const x of d?.uniques || []) addSource(x.item, `unique:${id}`);
  for (const [it] of d?.extra || []) addSource(it, `drop:${id}`);
  for (const l of n.pickpocket?.loot || []) addSource(Array.isArray(l) ? l[0] : l.id || l.item, `pickpocket:${id}`);
}
for (const x of RARE_TABLE) addSource(x.item, 'rare table');
for (const [sid, s] of Object.entries(SHOPS)) for (const [it] of s.items) addSource(it, `shop:${sid}`);
for (const [oid, o] of Object.entries(OBJECTS)) {
  if (o.wc) addSource(o.wc.log, `tree:${oid}`);
  if (o.mine) addSource(o.mine.ore, `rock:${oid}`);
  if (o.crop) addSource(o.crop, `crop:${oid}`);
}
// Generic tables exported by data modules: anything shaped like { out } / { bar } / { fish } is a product.
const walk = (v, where, seen = new Set()) => {
  if (!v || typeof v !== 'object' || seen.has(v)) return;
  seen.add(v);
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, where, seen)); return; }
  for (const k of ['out', 'bar', 'fish', 'product', 'gives', 'burnt', 'to']) if (typeof v[k] === 'string') addSource(v[k], where);
  for (const k of ['loot', 'rewards']) if (Array.isArray(v[k])) for (const l of v[k]) addSource(typeof l === 'string' ? l : l.id || l.item, where);
  for (const [k, x] of Object.entries(v)) if (typeof x === 'object') walk(x, where + '.' + k, seen);
};
const { COOKING, SMELTING, JEWELLERY, GEMS } = await import(src('data/items.js'));
walk(COOKING, 'cooking'); walk(SMELTING, 'smelting'); walk(JEWELLERY, 'jewellery');
for (const g of GEMS) addSource(g.id, 'gem cutting');
const skilling = await import(src('game/skilling.js')).catch((e) => { warn('could not import skilling.js: ' + e.message); return {}; });
walk(skilling.FISH, 'fishing'); walk(skilling.STALLS, 'stalls');
for (const [k, v] of Object.entries(content)) walk(v, 'content.' + k);
for (const it of Object.values(ITEMS)) if (it.smith) addSource(it.id, 'smithing');
for (const it of Object.values(ITEMS)) if (it.cut) addSource(it.id, 'gem cutting');
const magic = await import(src('data/magic.js'));
for (const pairs of Object.values(magic.ENCHANTS)) for (const [from, to] of pairs) { itemOk(from, 'enchant'); addSource(to, 'enchant'); }
for (const it of Object.values(ITEMS)) if (it.charges !== undefined) addSource(it.id, 'jewellery charges');
for (const r of magic.RUNES) addSource(r.item, 'runecraft');
for (const s of magic.SPELLS) if (s.orb) addSource(s.orb, 'charge orb');
const { HERBS, GRACEFUL } = await import(src('data/items.js'));
for (const id of Object.keys(GRACEFUL)) addSource(id, 'grace');
for (const h of HERBS) { addSource('grimy_' + h.id, 'herb drops'); addSource(h.id, 'cleaning'); }
for (const s of magic.SPELLS) for (const rn of Object.keys(s.runes)) if (!magic.RUNE[rn]) err(`spell ${s.id}: unknown rune ${rn}`);
for (const r of content.RECIPES || []) {
  for (const id of [...Object.keys(r.in), ...r.keep, ...Object.keys(r.returns)]) itemOk(id, `recipe ${r.id}`);
  if (r.burn) addSource(r.burn.item, `recipe ${r.id}`);
}

// Items the code hands out directly (quests, clues, special objects): any quoted id in src/.
const codeText = [];
const readAll = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) readAll(p); else if (p.endsWith('.js')) codeText.push(readFileSync(p, 'utf8')); } };
readAll(join(ROOT, 'src', 'game'));
const code = codeText.join('\n');

// ------------------------------------------------------------------ maps
const worlds = buildWorlds();
for (const w of worlds.values()) {
  for (const s of w.itemSpawns) addSource(s.item, `ground spawn:${w.id}`);
  for (const s of w.spawns) if (!NPCS[s.npc]) err(`${w.id}: spawn of unknown npc '${s.npc}' at ${s.x},${s.y}`);
}

const unsourced = Object.keys(ITEMS).filter((id) => !sources.has(id) && !new RegExp(`['"\`]${id}['"\`]`).test(code));
for (const id of unsourced) warn(`item '${id}' (${ITEMS[id].name}) has no source`);

// Reachability: flood fill from where the player arrives on each map.
function flood(w, seeds) {
  const seen = new Uint8Array(w.W * w.H);
  const q = [];
  for (const [x, y] of seeds) if (w.inb(x, y) && !w.blocked(x, y)) { seen[y * w.W + x] = 1; q.push(x, y); }
  while (q.length) {
    const y = q.pop(), x = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!w.inb(nx, ny)) continue;
      const k = ny * w.W + nx;
      if (seen[k]) continue;
      // doors count as passable for reachability
      const o = w.obj(nx, ny);
      if (w.blocked(nx, ny) && !(o && OBJECTS[o.type].door)) continue;
      seen[k] = 1; q.push(nx, ny);
    }
  }
  return seen;
}
const reachable = new Map();
const main = worlds.get('main');
for (const w of worlds.values()) {
  const seeds = [];
  if (w === main) { seeds.push(main.points.spawn); for (const d of Object.values(main.docks)) seeds.push(d); }
  if (w.points.arrive) seeds.push(w.points.arrive);
  // arrive points of any ladder leading into this map
  for (const o of worlds.values()) for (const ob of o.objects) if (ob.to && (ob.to[2] || o.id) === w.id) seeds.push([ob.to[0], ob.to[1]]);
  reachable.set(w.id, flood(w, seeds));
}
const near = (w, x, y, ww = 1, hh = 1) => {
  const seen = reachable.get(w.id);
  for (let j = y - 1; j <= y + hh; j++) for (let i = x - 1; i <= x + ww; i++) if (w.inb(i, j) && seen[j * w.W + i]) return true;
  return false;
};
for (const w of worlds.values()) {
  for (const o of w.objects) {
    if (o.to) {
      const target = worlds.get(o.to[2] || w.id);
      if (!target) { err(`${w.id}: ${o.type} at ${o.x},${o.y} leads to unknown map '${o.to[2]}'`); continue; }
      if (target.blocked(o.to[0], o.to[1])) err(`${w.id}: ${o.type} at ${o.x},${o.y} lands on a blocked tile ${o.to} in ${target.id}`);
      if (!near(w, o.x, o.y, o.w, o.h)) err(`${w.id}: ${o.type} at ${o.x},${o.y} can't be reached`);
    }
    if (o.agility) {
      const ends = o.agility.to ? [o.agility.to] : [o.agility.a, o.agility.b];
      for (const [x, y] of ends) if (w.blocked(x, y)) err(`${w.id}: ${o.type} at ${o.x},${o.y} lands on blocked ${x},${y}`);
      if (o.agility.a) { if (!near(w, o.agility.a[0] - 1, o.agility.a[1] - 1, 3, 3) && !near(w, o.agility.b[0] - 1, o.agility.b[1] - 1, 3, 3)) warn(`${w.id}: shortcut at ${o.x},${o.y} can't be reached`); }
      else if (!near(w, o.x, o.y)) err(`${w.id}: ${o.type} (course ${o.agility.course}) at ${o.x},${o.y} can't be reached`);
    }
    const d = OBJECTS[o.type];
    if (w.kind === 'dungeon' && d.actions?.length && !d.door && !near(w, o.x, o.y, o.w, o.h)) warn(`${w.id}: ${o.type} at ${o.x},${o.y} can't be reached`);
  }
  for (const s of w.spawns) {
    const n = NPCS[s.npc];
    if (!n) continue;
    const important = w.kind === 'dungeon' || n.boss || !n.hp;
    if (important && !near(w, s.x, s.y, n.size || 1, n.size || 1)) (w.kind === 'dungeon' || n.boss ? err : warn)(`${w.id}: ${s.npc} at ${s.x},${s.y} can't be reached`);
  }
}

// ------------------------------------------------------------------ report
const counts = { items: Object.keys(ITEMS).length, npcs: Object.keys(NPCS).length, monsters: Object.values(NPCS).filter((n) => n.hp).length, objects: Object.keys(OBJECTS).length, maps: worlds.size };
console.log('content:', Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', '));
for (const m of warnings) console.log('warn  ' + m);
for (const m of errors) console.log('ERROR ' + m);
console.log(`${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);

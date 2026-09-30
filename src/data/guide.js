// Skill guides: every unlock for every skill, gathered from the game data so it never goes stale.
import { ITEMS, SMELTING, FIREMAKING, COOKING, JEWELLERY, BONES } from './items.js';
import { OBJECTS } from './objects.js';
import { NPCS } from './npcs.js';
import { PRAYERS } from './skills.js';
import { RECIPES, recipeOut } from './recipes.js';
import { FISH, STALLS } from '../game/skilling.js';
import { THIEF_CHESTS } from '../game/crafting.js';
import { SPELLS, RUNES } from './magic.js';
import { HERBS } from './items.js';
import { COURSES, SHORTCUTS } from './agility.js';
import { SLAYER_REQ, MASTERS } from './slayer.js';
import { CROPS, PREY } from './farming.js';

let cache = null;

// -> { skill: [{ lvl, item?, text, group }] } sorted by level
export function skillGuide() {
  if (cache) return cache;
  const G = {};
  const add = (skill, lvl, text, item, group) => {
    (G[skill] ||= []);
    if (!G[skill].some((e) => e.text === text && e.lvl === lvl)) G[skill].push({ lvl, text, item, group });
  };
  // gathering
  const seenTrees = new Set();
  for (const o of Object.values(OBJECTS)) {
    if (o.wc && !seenTrees.has(o.wc.log + o.wc.lvl)) { seenTrees.add(o.wc.log + o.wc.lvl); add('woodcutting', o.wc.lvl, o.name, o.wc.log, 'Trees'); }
    if (o.mine) add('mining', o.mine.lvl, o.gems ? 'Gem rocks' : ITEMS[o.mine.ore].name, o.mine.ore || 'uncut_sapphire', 'Rocks');
  }
  for (const [key, list] of Object.entries(FISH)) for (const f of list) add('fishing', f.lvl, ITEMS[f.fish].name.replace('Raw ', ''), f.fish, key.split('@')[0]);
  for (const [id, f] of Object.entries(FIREMAKING)) add('firemaking', f.lvl, ITEMS[id].name, id, 'Logs');
  add('firemaking', 50, 'The Frost Heart, in Frostpeak Keep just south of Frosthold', 'supply_crate', 'Activities');
  // processing
  for (const [raw, c] of Object.entries(COOKING)) add('cooking', c.lvl, ITEMS[c.out].name, c.out, 'Fire or range');
  for (const s of SMELTING) add('smithing', s.lvl, ITEMS[s.bar].name, s.bar, 'Smelting');
  for (const it of Object.values(ITEMS)) if (it.smith) add('smithing', it.smith.lvl, it.name, it.id, ITEMS[it.smith.bar].name.replace(' bar', ''));
  for (const it of Object.values(ITEMS)) if (it.cut) add('crafting', it.cut.lvl, `Cut ${it.name.toLowerCase()}`, it.id, 'Gems');
  for (const j of JEWELLERY) add('crafting', j.lvl, ITEMS[j.out].name, j.out, 'Jewellery');
  for (const r of RECIPES) {
    if (!r.skill || !r.xp) continue;
    const [out] = recipeOut(r);
    add(r.skill, r.lvl, ITEMS[out].name, out, r.station ? r.station.replace('_', ' ') : 'Crafted');
  }
  // thieving
  for (const [id, n] of Object.entries(NPCS)) if (n.pickpocket) add('thieving', n.pickpocket.lvl, `Pickpocket ${n.name.toLowerCase()}`, null, 'Pickpocket');
  for (const [id, s] of Object.entries(STALLS)) add('thieving', s.lvl, `${id[0].toUpperCase() + id.slice(1)} stall`, s.loot[0].id, 'Stalls');
  for (const [id, c] of Object.entries(THIEF_CHESTS)) add('thieving', c.lvl, `Chest (${id === 'tomb' ? 'tomb' : c.loot[0].qty[0] + ' coins'})`, 'casket', 'Chests');
  // farming & hunter
  for (const c of Object.values(CROPS)) add('farming', c.lvl, `${c.name} (${c.patch}, ${c.minutes} min)`, c.seed, c.patch);
  for (const [id, pr] of Object.entries(PREY)) add('hunter', pr.lvl, pr.name, pr.loot?.[pr.loot.length - 1]?.[0] || null, pr.trap === 'snare' ? 'Bird snare' : pr.trap === 'box' ? 'Box trap' : 'Butterfly net');
  add('hunter', 1, 'One more trap at a time every 20 levels', 'bird_snare', 'Traps');
  // slayer
  for (const [id, lvl] of Object.entries(SLAYER_REQ)) add('slayer', lvl, NPCS[id].name, null, 'Monsters');
  for (const m of Object.values(MASTERS)) add('slayer', m.minSlayer || 1, `${m.name} in ${m.where} (combat ${m.minCombat}+)`, 'slayer_gem', 'Masters');
  add('slayer', 1, 'Slayer helmet: +15% against your task (400 points)', 'slayer_helmet', 'Rewards');
  // herblore & agility
  for (const h of HERBS) add('herblore', h.lvl, `Clean ${h.name.toLowerCase()}`, h.id, 'Herbs');
  for (const c of COURSES) add('agility', c.lvl, `${c.name} (${c.xp * c.steps.filter((s) => s[0] !== 'walk').length + c.lap} xp a lap)`, 'mark_of_grace', 'Courses');
  for (const s of SHORTCUTS) add('agility', s.lvl, `Shortcut: ${s.id.replace(/_/g, ' ')}`, null, 'Shortcuts');
  add('agility', 1, 'Faster run energy recovery with every level', null, 'Running');
  // magic & runecraft
  for (const s of SPELLS) if (s.lvl > 0) add('magic', s.lvl, s.name, null, s.type === 'combat' ? 'Combat' : s.type === 'teleport' ? 'Teleport' : 'Utility');
  for (const r of RUNES) {
    add('runecraft', r.lvl, `${r.name} runes (${r.xp} xp)`, r.item, 'Altars');
    if (r.step) for (let l = r.step; l <= 99; l += r.step) add('runecraft', l, `${1 + Math.floor(l / r.step)} ${r.name.toLowerCase()} runes per essence`, r.item, 'Multiples');
  }
  // prayer
  for (const pr of PRAYERS) add('prayer', pr.lvl, `${pr.name}: ${pr.desc}`, null, 'Prayers');
  for (const [id, xp] of Object.entries(BONES)) if (xp) add('prayer', 1, `${ITEMS[id].name} (${xp} xp)`, id, 'Bones');
  // equipment requirements
  for (const it of Object.values(ITEMS)) {
    const req = it.equip?.req;
    if (!req) continue;
    for (const [sk, lvl] of Object.entries(req)) if (lvl > 1) add(sk, lvl, it.name, it.id, it.equip.slot === 'weapon' ? 'Weapons' : 'Armour');
    if (it.tool) add(it.tool.type === 'axe' ? 'woodcutting' : 'mining', it.tool.lvl, it.name, it.id, 'Tools');
  }
  for (const k of Object.keys(G)) G[k].sort((a, b) => a.lvl - b.lvl || a.text.localeCompare(b.text));
  cache = G;
  return G;
}

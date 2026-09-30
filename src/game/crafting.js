// The recipe engine (see data/recipes.js), plus tanning, crops, shearing and trapped chests.
import { G, msg, sfx } from './state.js';
import { ITEMS } from '../data/items.js';
import { OBJECTS } from '../data/objects.js';
import { RECIPES, STATIONS, TANNING, recipeOut } from '../data/recipes.js';
import { SKILL_NAMES } from '../data/skills.js';
import { startAction } from './skilling.js';
import { clamp, randInt, aOrAn, pickWeighted } from '../util.js';
import { damagePlayer } from './combat.js';

export function stationOf(o) {
  return Object.keys(STATIONS).filter((s) => STATIONS[s].includes(o.type));
}

// Recipes made by using item `a` on item `b` (order doesn't matter).
export function recipesForPair(a, b) {
  return RECIPES.filter((r) => !r.station && a !== b && [a, b].every((id) => r.in[id] || r.keep.includes(id)));
}
// Recipes made at an object, optionally only those using `item`.
export function recipesForStation(o, item = null) {
  const st = stationOf(o);
  return RECIPES.filter((r) => r.station && st.includes(r.station) && (!item || r.in[item]));
}

// How many times the player can make a recipe right now.
// For batch recipes this counts actions (each makes up to `batch`).
export function makeableCount(r) {
  const n = unitsAvailable(r);
  return r.batch ? Math.ceil(n / r.batch) : n;
}
function unitsAvailable(r) {
  const p = G.player;
  if (r.keep.some((t) => !p.has(t))) return 0;
  let n = Infinity;
  for (const [id, q] of Object.entries(r.in)) n = Math.min(n, Math.floor(p.count(id) / q));
  return n === Infinity ? 0 : n;
}
export function levelOk(r) { return !r.skill || G.player.lvl(r.skill) >= r.lvl; }

// Offer the recipes: make straight away when there's a single obvious choice, else open the menu.
export function offerRecipes(list, title, o = null) {
  const p = G.player;
  if (!list.length) return false;
  // collapse variants that make the same thing (e.g. dough from jug/bucket/bowl): keep one the player can make
  const byOut = new Map();
  for (const r of list) {
    const k = recipeOut(r)[0];
    const cur = byOut.get(k);
    if (!cur || (!makeableCount(cur) && makeableCount(r))) byOut.set(k, r);
  }
  const opts = [...byOut.values()];
  if (opts.length === 1 && makeableCount(opts[0]) <= 1) { make(opts[0], 1, o); return true; }
  G.ui.openMakeMenu(title || 'What would you like to make?', opts, (r, qty) => make(r, qty, o));
  p.faceTile && o && p.faceTile(o.x, o.y);
  return true;
}

function burnChance(r, o) {
  const p = G.player, lvl = p.lvl(r.skill || 'cooking');
  if (!r.burn || lvl >= r.burn.stop) return 0;
  const onRange = o && o.type === 'range';
  return clamp(0.55 * (1 - (lvl - r.lvl) / (r.burn.stop - r.lvl)) - (onRange ? 0.08 : 0), 0, 0.65);
}

// Make `qty` of a recipe, one every few ticks, stopping when something runs out.
export function make(r, qty = 1, o = null) {
  const p = G.player;
  if (!levelOk(r)) { msg(`You need ${aOrAn(SKILL_NAMES[r.skill])} level of ${r.lvl} to make that.`); return; }
  const missingTool = r.keep.find((t) => !p.has(t));
  if (missingTool) { msg(`You need ${aOrAn(ITEMS[missingTool].name.toLowerCase())} to do that.`); return; }
  if (!makeableCount(r)) { msg("You don't have the ingredients to make that."); return; }
  const [outId, outQty] = recipeOut(r);
  let made = 0;
  if (o) p.faceTile(o.x, o.y);
  const once = () => {
    if (o && o.removed) return false;
    if (made >= qty || !makeableCount(r)) return false;
    const units = r.batch ? Math.min(r.batch, unitsAvailable(r)) : 1;
    for (const [id, q] of Object.entries(r.in)) p.remove(id, q * units);
    for (const [id, q] of Object.entries(r.returns)) p.add(id, q * units);
    made++;
    if (Math.random() < burnChance(r, o)) {
      p.add(r.burn.item);
      msg(r.verb === 'cook' ? `You accidentally burn the ${ITEMS[outId].name.toLowerCase()}.` : `The ${ITEMS[outId].name.toLowerCase()} is ruined.`);
      sfx('error');
    } else {
      p.add(outId, outQty * units);
      p.tally('made', outId, outQty * units);
      if (r.skill && r.xp) p.addXp(r.skill, r.xp * units);
      sfx(r.verb === 'cook' ? 'cook' : r.verb === 'fill' ? 'splash' : 'click');
      if (units > 1) msg(`You make ${units} ${ITEMS[outId].name.toLowerCase()}${units > 1 && !ITEMS[outId].name.endsWith('s') ? 's' : ''}.`);
      else if (qty === 1 || made === 1) msg(r.verb === 'fill' ? `You fill the ${ITEMS[Object.keys(r.in)[0]].name.toLowerCase()}.` : r.verb === 'light' ? `You light the ${ITEMS[Object.keys(r.in)[0]].name.toLowerCase()}.` : `You make ${aOrAn(ITEMS[outId].name.toLowerCase())}.`);
    }
    return made < qty && makeableCount(r) ? r.ticks || 2 : false;
  };
  startAction(once, 1, r.verb !== 'fill' && r.verb !== 'light');
}

// ------------------------------------------------------------------ tanner
export async function tannerTalk(d) {
  const p = G.player;
  await d.npc('Hides tanned while you wait! Cowhide to leather for 1 coin, hard leather for 3. Dragonhide for 20 coins a piece.');
  const have = TANNING.filter((t) => p.has(t.from));
  if (!have.length) { await d.npc('Come back when you have some hides.'); return; }
  const c = await d.options([...have.map((t) => `${ITEMS[t.to].name} (${t.fee} coins each)`), 'No thanks.']);
  if (c >= have.length) return;
  const t = have[c];
  let n = 0;
  while (p.has(t.from) && p.has('coins', t.fee)) { p.remove(t.from, 1); p.remove('coins', t.fee); p.add(t.to, 1); n++; }
  d.end();
  if (n) { msg(`The tanner tans ${n} ${n === 1 ? 'hide' : 'hides'} for you.`); sfx('coins'); }
  else msg("You don't have enough coins.");
}

// ------------------------------------------------------------------ crops, sheep
export function pickCrop(o) {
  const p = G.player, d = OBJECTS[o.type];
  if (o.depleted > G.tick) { msg('There is nothing left to pick yet.'); return; }
  if (!p.canAdd(d.crop)) { msg('Your inventory is full.'); return; }
  p.playAnim('attack', 1, 'work');
  p.add(d.crop);
  msg(`You pick ${aOrAn(ITEMS[d.crop].name.toLowerCase())}.`);
  sfx('pickup');
  if (Math.random() < 0.4) o.depleted = G.tick + (d.respawn || 20);
}

export function shear(n) {
  const p = G.player;
  if (!p.has('shears')) { msg('You need a set of shears to do this.'); return; }
  if (n.shornUntil > G.tick) { msg('This sheep has already been shorn.'); return; }
  if (!p.canAdd('wool')) { msg('Your inventory is full.'); return; }
  p.playAnim('attack', 2, 'work');
  if (Math.random() < 0.25) { msg('The sheep manages to get away from you!'); return; }
  n.shornUntil = G.tick + 60;
  p.add('wool');
  msg('You get some wool.'); sfx('pickup');
}

// ------------------------------------------------------------------ trapped chests (Thieving)
export const THIEF_CHESTS = {
  coins10: { lvl: 13, xp: 7.8, respawn: 12, loot: [{ w: 1, item: 'coins', qty: [10, 10] }] },
  coins50: { lvl: 43, xp: 125, respawn: 40, loot: [{ w: 90, item: 'coins', qty: [50, 50] }, { w: 8, item: 'uncut_jade', qty: [1, 1] }, { w: 2, item: 'uncut_sapphire', qty: [1, 1] }] },
  tomb: { lvl: 72, xp: 280, respawn: 90, loot: [{ w: 40, item: 'coins', qty: [300, 800] }, { w: 25, item: 'gold_bar', qty: [2, 4] }, { w: 20, item: 'uncut_ruby', qty: [1, 2] }, { w: 10, item: 'uncut_diamond', qty: [1, 1] }, { w: 5, item: 'spice', qty: [2, 4] }] },
};
export function searchChest(o) {
  const p = G.player, c = THIEF_CHESTS[OBJECTS[o.type].thiefChest];
  if (p.lvl('thieving') < c.lvl) { msg(`You need a Thieving level of ${c.lvl} to open this chest.`); return; }
  if (o.depleted > G.tick) { msg('The chest is empty. Someone got here first... you.'); return; }
  msg('You search the chest for traps...');
  p.playAnim('attack', 2, 'work');
  startAction(() => {
    const ok = Math.random() < clamp(0.6 + (p.lvl('thieving') - c.lvl) * 0.02, 0.6, 0.95);
    if (!ok) { msg('You set off a trap!', '#ef1020'); damagePlayer(randInt(2, Math.max(3, Math.floor(c.lvl / 10))), null); return false; }
    const e = pickWeighted(c.loot);
    const qty = randInt(e.qty[0], e.qty[1]);
    p.give(e.item, qty);
    p.addXp('thieving', c.xp);
    o.depleted = G.tick + c.respawn;
    msg(`You disarm the trap and find ${qty > 1 ? qty + ' ' : ''}${ITEMS[e.item].name.toLowerCase()} inside.`);
    sfx('coins');
    return false;
  }, 3);
}

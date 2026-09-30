// The Frost Heart: a Firemaking activity in Frostpeak Keep. Chop frozen roots, keep the four braziers
// lit and fed, and wear the heart down before the cold wears you down. Points earn supply crates.
import { G, msg, sfx } from './state.js';
import { ITEMS } from '../data/items.js';
import { startAction } from './skilling.js';
import { damagePlayer, givePet } from './combat.js';
import { HERBS } from '../data/items.js';
import { randInt, pickWeighted } from '../util.js';

const HEART_MAX = 300;
export const brazier = { heart: HEART_MAX, points: 0, pause: 0 };

const here = () => G.world.id === 'braziers';
const braziers = () => G.world.objects.filter((o) => o.type === 'brazier' && !o.removed);

export function tickBraziers() {
  if (!here()) return;
  const p = G.player;
  if (brazier.pause > 0) { if (--brazier.pause === 0) { brazier.heart = HEART_MAX; msg('The Frost Heart stirs again. Light the braziers!', '#0000aa'); } G.ui.dirty('event'); return; }
  const lit = braziers().filter((o) => o.lit && !o.broken);
  // lit braziers slowly burn the heart; it recovers when none are lit
  if (!lit.length && brazier.heart < HEART_MAX && G.tick % 3 === 0) brazier.heart++;
  for (const o of lit) {
    if (Math.random() < 1 / 90) { o.lit = false; msg('A brazier has gone out!'); }
    else if (Math.random() < 1 / 240) { o.lit = false; o.broken = true; msg('The cold has shattered a brazier! Fix it with a hammer.', '#ef1020'); }
  }
  // the cold bites, less so next to a lit brazier
  // (scaled to your Hitpoints; warm gear and pyromancer pieces each take the edge off)
  if (G.tick % 8 === 0 && !p.dead) {
    const warm = lit.some((o) => Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) <= 3);
    const gear = ['warm_gloves', 'pyromancer_hood', 'pyromancer_garb', 'pyromancer_robe', 'pyromancer_boots'].filter((id) => p.hasEquipped(id)).length;
    const blast = G.tick % 64 === 0;
    let dmg = Math.random() < (warm ? 0.3 : 0.6) ? Math.ceil(p.maxHp * (blast ? 0.08 : 0.03) * (1 - gear * 0.15)) : 0;
    if (blast) msg('The Frost Heart pulses. A wave of cold washes over you!', '#0000aa');
    if (dmg) damagePlayer(dmg, null, 'hit');
  }
  G.ui.dirty('event');
}

export function useBrazier(o, option) {
  const p = G.player;
  if (brazier.pause > 0) { msg('The heart is dormant. Wait for it to stir.'); return; }
  if (o.broken) {
    if (!p.has('hammer')) { msg('You need a hammer to fix the brazier.'); return; }
    o.broken = false; brazier.points += 25; p.addXp('firemaking', p.lvl('firemaking') * 2); sfx('anvil'); msg('You fix the brazier.');
    return;
  }
  if (!o.lit) {
    if (p.lvl('firemaking') < 50) { msg('You need a Firemaking level of 50 to light the braziers.'); return; }
    if (!p.has('tinderbox')) { msg('You need a tinderbox to light the brazier.'); return; }
    o.lit = true; brazier.points += 25; p.addXp('firemaking', p.lvl('firemaking') * 4); sfx('fire'); msg('You light the brazier.');
    return;
  }
  if (!p.has('frost_root')) { msg('You need frost roots to feed the brazier. Chop them from the frozen roots.'); return; }
  p.faceTile(o.x, o.y);
  startAction(() => {
    if (!o.lit || o.broken || !p.has('frost_root') || brazier.pause) return false;
    p.remove('frost_root');
    brazier.heart -= 4; brazier.points += 10;
    p.addXp('firemaking', p.lvl('firemaking') * 3 * pyroBonus(p));
    sfx('fire');
    if (brazier.heart <= 0) { win(); return false; }
    return 3;
  }, 1);
}

function pyroBonus(p) {
  const n = ['pyromancer_hood', 'pyromancer_garb', 'pyromancer_robe', 'pyromancer_boots'].filter((id) => p.hasEquipped(id)).length;
  return 1 + n * 0.025 + (n === 4 ? 0.025 : 0);
}

function win() {
  const p = G.player;
  const crates = Math.min(5, Math.floor(brazier.points / 100));
  if (crates) { p.give('supply_crate', crates); msg(`The Frost Heart shatters! You earn ${crates} supply crate${crates > 1 ? 's' : ''} for ${brazier.points} points.`, '#0000aa'); }
  else msg(`The Frost Heart shatters, but you only earned ${brazier.points} points. You need 100 for a crate.`, '#ef1020');
  p.stats.hearts = (p.stats.hearts || 0) + 1;
  if (p.stats.hearts === 1 || p.stats.hearts % 25 === 0) p.logEvent(`Subdued the Frost Heart (${p.stats.hearts})`);
  G.ui.announce('The Frost Heart is subdued!', 'drop'); sfx('quest');
  brazier.points = 0; brazier.pause = 30;
  for (const o of braziers()) { o.lit = false; o.broken = false; }
}

// Supply crates scale with your skills.
export function openCrate(slot) {
  const p = G.player;
  p.removeSlot(slot, 1);
  const tier = (s) => p.lvl(s);
  const pickBy = (lvl, list) => (list.filter(([, l]) => lvl >= l).pop() || list[0])[0];
  const rolls = [
    () => [pickBy(tier('woodcutting'), [['logs', 1], ['oak_logs', 15], ['willow_logs', 30], ['maple_logs', 45], ['yew_logs', 60], ['magic_logs', 75]]), randInt(10, 25)],
    () => [pickBy(tier('mining'), [['iron_ore', 1], ['coal', 30], ['gold_ore', 40], ['mithril_ore', 55], ['adamantite_ore', 70], ['runite_ore', 85]]), randInt(5, 15)],
    () => [pickBy(tier('fishing'), [['raw_shrimps', 1], ['raw_trout', 20], ['raw_lobster', 40], ['raw_swordfish', 50], ['raw_shark', 76]]), randInt(5, 15)],
    () => ['grimy_' + pickBy(tier('herblore'), HERBS.map((h) => [h.id, h.lvl])), randInt(2, 6)],
    () => ['coins', randInt(500, 3000)],
    () => [['uncut_sapphire', 'uncut_emerald', 'uncut_ruby', 'uncut_diamond'][randInt(0, 3)], randInt(1, 3)],
  ];
  const got = [];
  for (let i = 0; i < 3; i++) { const [id, q] = rolls[randInt(0, rolls.length - 1)](); p.give(id, q); got.push([id, q]); }
  const rare = pickWeighted([{ w: 1, id: 'pyromancer_hood' }, { w: 1, id: 'pyromancer_garb' }, { w: 1, id: 'pyromancer_robe' }, { w: 1, id: 'pyromancer_boots' }, { w: 1, id: 'warm_gloves' }, { w: 195, id: null }]);
  if (rare.id) { p.give(rare.id); got.push([rare.id, 1]); G.ui.announce(`Rare find: ${ITEMS[rare.id].name}!`, 'drop'); }
  if (Math.random() < 1 / 300) givePet('phoenix');
  G.ui.showLoot('Supply crate', got);
  sfx('rare');
}

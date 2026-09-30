// Farming (patches that grow in real time), Hunter (traps and butterflies) and the standing stones.
import { G, msg, sfx } from './state.js';
import { ITEMS } from '../data/items.js';
import { OBJECTS } from '../data/objects.js';
import { CROPS, PREY, GROUNDS } from '../data/farming.js';
import { startAction } from './skilling.js';
import { questEvent } from './questengine.js';
import { randInt, clamp, aOrAn } from '../util.js';

// ================================================================== farming
const patchKey = (o) => `${G.world.id}:${o.x}:${o.y}`;
export function patchState(o) {
  const f = (G.player.flags.farm ||= {});
  return f[patchKey(o)] || (f[patchKey(o)] = { weeds: 3 });
}
// 0..4 growth stages; 4 means ready.
export function growth(st) {
  if (!st.crop) return 0;
  const c = CROPS[st.crop];
  return clamp(Math.floor(((Date.now() - st.planted) / 60000 / c.minutes) * 4), 0, 4);
}
export function patchLabel(o) {
  const st = patchState(o);
  if (st.weeds) return 'The patch is overgrown with weeds.';
  if (!st.crop) return 'The patch is empty and ready for planting.';
  const c = CROPS[st.crop], g = growth(st);
  if (g >= 4) return `The ${c.name.toLowerCase()} ${c.patch === 'tree' ? 'is fully grown. Check its health.' : 'is ready to harvest.'}`;
  const left = Math.ceil(c.minutes * (1 - (Date.now() - st.planted) / 60000 / c.minutes));
  return `The ${c.name.toLowerCase()} is growing (stage ${g + 1} of 4, about ${left} minute${left === 1 ? '' : 's'} left).`;
}

export function usePatch(o) {
  const p = G.player, st = patchState(o), kind = OBJECTS[o.type].patch;
  if (st.weeds) {
    if (!p.has('rake')) { msg('You need a rake to clear the weeds.'); return; }
    p.faceTile(o.x, o.y);
    startAction(() => {
      if (!st.weeds) return false;
      st.weeds--; p.addXp('farming', 4); sfx('chop');
      if (Math.random() < 0.5) p.add('weeds');
      if (!st.weeds) { msg('You clear the patch of weeds.'); return false; }
      return 3;
    }, 2);
    return;
  }
  if (!st.crop) { msg(`Use ${kind === 'tree' ? 'a tree seed' : kind === 'herb' ? 'a herb seed' : 'allotment seeds'} on the patch to plant it.`); return; }
  const c = CROPS[st.crop];
  if (growth(st) < 4) { msg(patchLabel(o)); return; }
  if (c.patch === 'tree') {
    const logs = randInt(c.yield[0], c.yield[1]);
    p.addXp('farming', c.harvest); p.give(c.produce, logs);
    msg(`You check the health of the ${c.name.toLowerCase()}. It's thriving! You gather ${logs} ${ITEMS[c.produce].name.toLowerCase()} and clear the patch.`, '#0000aa');
    delete st.crop; sfx('treefall');
    questEvent('harvest', st.last = c.id);
    return;
  }
  if (c.patch === 'allotment' && !p.has('spade')) { msg('You need a spade to dig up the crop.'); return; }
  let left = randInt(c.yield[0], c.yield[1]) + (st.compost ? 2 : 0);
  p.faceTile(o.x, o.y);
  startAction(() => {
    if (!st.crop) return false;
    if (!p.canAdd(c.produce)) { msg('Your inventory is too full.'); return false; }
    p.add(c.produce); p.addXp('farming', c.harvest); p.tally('farmed', c.produce); sfx('pickup');
    questEvent('harvest', c.id);
    if (--left <= 0) { msg(`The ${kind} patch is now empty.`); delete st.crop; st.compost = false; return false; }
    return 2;
  }, 1);
}

export function usePatchItem(o, itemId) {
  const p = G.player, st = patchState(o), kind = OBJECTS[o.type].patch;
  if (itemId === 'compost') {
    if (st.weeds) { msg('Clear the weeds first.'); return true; }
    if (st.compost) { msg('This patch has already been treated with compost.'); return true; }
    p.remove('compost'); p.add('bucket'); st.compost = true; p.addXp('farming', 18); msg('You treat the patch with compost.'); sfx('splash');
    return true;
  }
  const c = Object.values(CROPS).find((x) => x.seed === itemId);
  if (!c) return false;
  if (c.patch !== kind) { msg(`That seed won't grow in a ${kind} patch.`); return true; }
  if (st.weeds) { msg('This patch needs weeding first.'); return true; }
  if (st.crop) { msg('Something is already growing here.'); return true; }
  if (p.lvl('farming') < c.lvl) { msg(`You need a Farming level of ${c.lvl} to plant that.`); return true; }
  const tool = kind === 'tree' ? 'spade' : 'seed_dibber';
  if (!p.has(tool)) { msg(`You need ${aOrAn(ITEMS[tool].name.toLowerCase())} to plant that.`); return true; }
  const n = kind === 'allotment' ? 3 : 1;
  if (!p.has(itemId, n)) { msg(`You need ${n} ${ITEMS[itemId].name.toLowerCase()}s to plant an allotment.`); return true; }
  p.remove(itemId, n);
  Object.assign(st, { crop: c.id, planted: Date.now() });
  p.addXp('farming', c.plant); p.playAnim('attack', 2); sfx('bury');
  msg(`You plant ${n > 1 ? n + ' ' + ITEMS[itemId].name.toLowerCase() + 's' : aOrAn(ITEMS[itemId].name.toLowerCase())}. It will take about ${c.minutes} minutes to grow.`);
  return true;
}

// ================================================================== hunter
export function groundAt(x, y) {
  if (G.world !== G.overworld) return null;
  return GROUNDS.find((g) => x >= g.rect[0] && y >= g.rect[1] && x <= g.rect[2] && y <= g.rect[3]) || null;
}
const trapLimit = () => 1 + Math.floor(G.player.lvl('hunter') / 20);
export function layTrap(slot) {
  const p = G.player, it = p.inv[slot];
  const type = it.id === 'bird_snare' ? 'snare' : 'box';
  const g = groundAt(p.x, p.y);
  const prey = g && (type === 'snare' ? g.snare : g.box);
  if (!prey) { msg(type === 'snare' ? 'There are no birds to catch here.' : 'Nothing lives here that would walk into a box trap.'); return; }
  // pick the best creature the player can catch here
  const choices = [g[type], g[type + '2']].filter((id) => id && PREY[id].lvl <= p.lvl('hunter'));
  if (!choices.length) { msg(`You need a Hunter level of ${PREY[prey].lvl} to catch the ${PREY[prey].name.toLowerCase()}s here.`); return; }
  const mine = G.world.objects.filter((o) => o.trap && !o.removed).length;
  if (mine >= trapLimit()) { msg(`You can only have ${trapLimit()} trap${trapLimit() > 1 ? 's' : ''} out at your Hunter level.`); return; }
  if (G.world.obj(p.x, p.y)) { msg('You can\'t lay a trap here.'); return; }
  p.removeSlot(slot, 1);
  const o = G.world.addObject(type === 'snare' ? 'snare_set' : 'box_set', p.x, p.y, { trap: { type, prey: choices[choices.length - 1], at: G.tick, caught: false } });
  p.playAnim('attack', 2); sfx('click');
  msg('You lay the trap. Give it time.');
  // step off the trap
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!G.world.blocked(p.x + dx, p.y + dy)) { G.game.walkTo(p.x + dx, p.y + dy); break; }
  return o;
}
// Called every tick for the current map.
export function tickTraps() {
  const p = G.player;
  for (const o of G.world.objects) {
    if (!o.trap || o.removed) continue;
    const t = o.trap;
    if (!t.caught && G.tick - t.at > 4) {
      const chance = 0.02 + (p.lvl('hunter') - PREY[t.prey].lvl) * 0.0015;
      if (Math.random() < clamp(chance, 0.01, 0.08)) { t.caught = true; t.at = G.tick; o.type = t.type === 'snare' ? 'snare_caught' : 'box_caught'; }
    }
    // left too long, the trap falls over
    if (G.tick - t.at > (t.caught ? 400 : 250)) {
      G.world.removeObject(o);
      G.game.dropGround(t.type === 'snare' ? 'bird_snare' : 'box_trap', 1, o.x, o.y);
    }
  }
}
export function checkTrap(o) {
  const p = G.player, t = o.trap;
  const item = t.type === 'snare' ? 'bird_snare' : 'box_trap';
  if (!t.caught) { G.world.removeObject(o); p.add(item); msg('You dismantle the trap.'); return; }
  const prey = PREY[t.prey];
  G.world.removeObject(o);
  p.add(item);
  for (const [id, q] of prey.loot) p.give(id, q);
  p.addXp('hunter', prey.xp); p.tally('hunted', t.prey); sfx('pickup');
  questEvent('hunt', t.prey);
  msg(`You've caught ${aOrAn(prey.name.toLowerCase())}.`);
}
// Butterflies are caught from their NPCs with a net.
export function catchButterfly(n) {
  const p = G.player, prey = PREY[n.defId];
  if (!p.hasEquipped('butterfly_net') && !p.has('butterfly_net')) { msg('You need a butterfly net to catch that.'); return; }
  if (p.lvl('hunter') < prey.lvl) { msg(`You need a Hunter level of ${prey.lvl} to catch that.`); return; }
  p.playAnim('attack', 2);
  const ok = Math.random() < clamp(0.45 + (p.lvl('hunter') - prey.lvl) * 0.02, 0.45, 0.9);
  if (!ok) { msg('The butterfly flutters out of reach.'); return; }
  n.dead = true; n.respawnAt = G.tick + 25;
  p.addXp('hunter', prey.xp); p.tally('hunted', n.defId); sfx('pickup');
  questEvent('hunt', n.defId);
  msg(`You catch the ${prey.name.toLowerCase()}, admire it, and let it go.`);
}

// ================================================================== standing stones
// Rings of standing stones link to each other. A ring must be visited once before you can travel to it.
export async function stoneTalk(d, o) {
  const p = G.player;
  const rings = (p.flags.rings ||= {});
  if (!rings[o.ring]) { rings[o.ring] = true; msg(`You attune to the ${o.ring} stones.`, '#0000aa'); }
  const dests = Object.keys(rings).filter((r) => r !== o.ring);
  if (!dests.length) { await d.msg('The stones hum. Visit another ring of stones and you will be able to travel between them.'); return; }
  const c = await d.options([...dests, 'Stay here.']);
  if (c >= dests.length) return;
  d.end();
  const [x, y] = G.overworld.points['ring_' + dests[c]];
  sfx('teleport');
  G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() });
  G.game.teleport(x, y, `The stones carry you to ${dests[c]}.`, true, 'main');
}

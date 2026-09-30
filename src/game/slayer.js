// Slayer tasks, points and the special rules of slayer monsters.
import { G, msg, sfx } from './state.js';
import { ITEMS } from '../data/items.js';
import { NPCS } from '../data/npcs.js';
import { CATEGORIES, MASTERS, SLAYER_REQ, SLAYER_REWARDS } from '../data/slayer.js';
import { pickWeighted, randInt, commas } from '../util.js';

export function task() { return G.player.slayer && G.player.slayer.left > 0 ? G.player.slayer : null; }
export function onTask(n) { const t = task(); return !!t && CATEGORIES[t.cat].npcs.includes(n.defId); }
export function taskText() {
  const t = task();
  return t ? `You're assigned to kill ${CATEGORIES[t.cat].name.toLowerCase()}; only ${t.left} more to go.` : 'You need something new to hunt. Speak to a slayer master.';
}

// Can the player hurt this monster at all?
export function slayerCheck(n) {
  const req = SLAYER_REQ[n.defId];
  if (!req || G.player.lvl('slayer') >= req) return true;
  msg(`You need a Slayer level of ${req} to know how to wound this creature.`);
  return false;
}
// The slayer helmet: 15% more accuracy and damage against the current task.
export function helmBonus(n) {
  return G.player.equip.head?.id === 'slayer_helmet' && onTask(n) ? 1.15 : 1;
}

// Gargoyles only die to a rock hammer; returns true if the kill should be stopped.
export function preventKill(n) {
  if (!n.def.needsHammer) return false;
  if (G.player.has('rock_hammer')) { msg(`You smash the ${n.name.toLowerCase()} to pieces with your rock hammer.`); return false; }
  n.hp = 1;
  msg(`The ${n.name.toLowerCase()} cracks, but won't break. You need a rock hammer to finish it.`, '#ef1020');
  return true;
}

// A stonegaze's glare drains your combat stats unless you carry a mirror shield.
export function gaze(n) {
  const p = G.player;
  if (!n.def.gaze || p.equip.shield?.id === 'mirror_shield') return;
  for (const s of ['attack', 'strength', 'defence', 'ranged', 'magic']) { const k = p.skills[s]; k.cur = Math.max(1, k.cur - randInt(1, 2)); }
  msg('The stonegaze\'s glare weakens you. A mirror shield would help.', '#ef1020');
  G.ui && G.ui.dirty('skills');
}

// Called for every monster the player kills.
export function onKill(n) {
  const p = G.player, t = task();
  if (!t || !onTask(n)) return;
  t.left--;
  p.addXp('slayer', n.maxHp);
  if (t.left > 0) return;
  const m = MASTERS[t.master];
  t.streak = (t.streak || 0) + 1;
  const pts = m.points * (t.streak % 50 === 0 ? 15 : t.streak % 10 === 0 ? 5 : 1);
  p.slayerPoints = (p.slayerPoints || 0) + pts;
  msg(`You've completed ${t.streak} tasks in a row and received ${pts} points; return to a slayer master.`, '#0000aa');
  G.ui && G.ui.announce('Slayer task complete!', 'drop');
  sfx('rare');
}

function assign(masterId) {
  const p = G.player, m = MASTERS[masterId];
  const combat = p.combatLevel(), slay = p.lvl('slayer');
  const options = m.tasks.filter(([cat]) => (CATEGORIES[cat].slayer || 1) <= slay).map(([cat, w, a, b]) => ({ w, cat, a, b }));
  const pick = pickWeighted(options);
  const streak = p.slayer ? p.slayer.streak || 0 : 0;
  p.slayer = { master: masterId, cat: pick.cat, left: randInt(pick.a, pick.b), streak };
  p.slayer.total = p.slayer.left;
  if (combat < 20 && masterId !== 'brannoc') p.slayer.left = Math.ceil(p.slayer.left / 2);
  return p.slayer;
}

// Dialogue scripts for the three masters.
export async function masterTalk(d, n, option = 'Talk-to') {
  const p = G.player, id = n.def.master, m = MASTERS[id];
  if (option === 'Rewards') return rewards(d);
  if (option === 'Talk-to') {
    await d.npc(`I'm ${m.name}, slayer master of ${m.where}. I give out tasks: kill so many of a kind of creature, and I'll reward you for it.`);
    const c = await d.options(['I need a new assignment.', 'How am I getting on with my task?', 'Tell me about Slayer.', 'Show me the rewards.', 'Goodbye.']);
    if (c === 1) { await d.npc(taskText()); return; }
    if (c === 2) {
      await d.npc('Kills on task earn Slayer experience equal to the creature\'s hitpoints. Finish a task for points; every tenth in a row pays five times over.');
      await d.npc('Some creatures can only be hurt by an experienced slayer. Gargoyles need a rock hammer to finish, and stonegazes a mirror shield. I sell both for points.');
      return;
    }
    if (c === 3) return rewards(d);
    if (c !== 0) return;
  }
  if (p.combatLevel() < m.minCombat) { await d.npc(`You're not strong enough for my tasks yet. Come back at combat level ${m.minCombat}, or see Brannoc in Brindlewood.`); return; }
  if (m.minSlayer && p.lvl('slayer') < m.minSlayer) { await d.npc(`I only teach slayers of level ${m.minSlayer} and up.`); return; }
  if (task()) { await d.npc(taskText() + ' Finish it first, or pay 30 points to cancel it.'); return; }
  const t = assign(id);
  if (!p.hasAnywhere('slayer_gem')) { p.give('slayer_gem'); await d.npc('Take this gem. It will remind you of your task.'); }
  await d.npc(`Your new task is to kill ${t.left} ${CATEGORIES[t.cat].name.toLowerCase()}. Good luck.`);
  G.ui.dirty('skills');
}

async function rewards(d) {
  const p = G.player;
  for (;;) {
    await d.npc(`You have ${commas(p.slayerPoints || 0)} slayer points.`);
    const c = await d.options([...SLAYER_REWARDS.map((r) => `${r.name} (${r.cost})`), 'Nothing, thanks.']);
    if (c >= SLAYER_REWARDS.length) return;
    const r = SLAYER_REWARDS[c];
    if ((p.slayerPoints || 0) < r.cost) { await d.npc('You don\'t have enough points for that.'); continue; }
    if (r.id === 'skip') { if (!task()) { await d.npc('You don\'t have a task to cancel.'); continue; } p.slayer.left = 0; }
    else if (r.item) { if (!p.canAdd(r.item)) { await d.npc('Your pack is full.'); return; } p.add(r.item); }
    else for (const [id, q] of r.bundle) p.give(id, q);
    p.slayerPoints -= r.cost;
    sfx('coins');
  }
}
export { NPCS, ITEMS };

// Magic (the standard spellbook) and Runecraft.
import { G, msg, sfx, after } from './state.js';
import { ITEMS, SMELTING } from '../data/items.js';
import { OBJECTS } from '../data/objects.js';
import { SPELL, RUNE, STAFF_RUNES, ENCHANTS, JEWEL_TELEPORTS } from '../data/magic.js';
import { SKILL_NAMES } from '../data/skills.js';
import { startAction } from './skilling.js';
import { wildLevel } from './world_info.js';
import { npcDefRoll, hitChance, killNpc, projectile } from './combat.js';
import { helmBonus } from './slayer.js';
import { randInt, commas, aOrAn } from '../util.js';

// ------------------------------------------------------------------ runes
function staffRunes(p) { const w = p.equip.weapon; return (w && STAFF_RUNES[w.id]) || []; }
export function missingRune(p, spell) {
  const free = staffRunes(p);
  for (const [r, n] of Object.entries(spell.runes)) if (!free.includes(r) && p.count(RUNE[r].item) < n) return RUNE[r].name;
  return null;
}
function takeRunes(p, spell) {
  const free = staffRunes(p);
  for (const [r, n] of Object.entries(spell.runes)) if (!free.includes(r)) p.remove(RUNE[r].item, n);
}
// Level and runes; says why not when it can't.
export function canCast(spell, quiet = false) {
  const p = G.player;
  if (p.lvl('magic') < spell.lvl) { if (!quiet) msg(`You need a Magic level of ${spell.lvl} to cast ${spell.name}.`); return false; }
  const miss = missingRune(p, spell);
  if (miss) { if (!quiet) msg(`You do not have enough ${miss} runes to cast this spell.`); return false; }
  return true;
}
export function runeText(spell) {
  return Object.entries(spell.runes).map(([r, n]) => `${n} ${RUNE[r].name}`).join(', ');
}

// ------------------------------------------------------------------ choosing a spell
// Spells that need a target put the game in "cast on" mode, like using an item.
export function selectSpell(id) {
  const s = SPELL[id], p = G.player;
  if (s.type === 'home') { G.game.homeTeleport(); return; }
  if (!canCast(s)) return;
  if (s.type === 'teleport') { castTeleport(s); return; }
  G.useItem = null;
  G.useSpell = { id };
  msg(s.type === 'combat' ? `Choose a target for ${s.name}.` : s.type === 'charge' ? 'Cast it on an obelisk.' : `Choose an item for ${s.name}.`);
  G.ui.dirty('magic'); G.ui.dirty('inv');
  if (s.type !== 'combat' && s.type !== 'charge') G.ui.setTab('inventory');
  p.path = [];
}
export function clearSpell() { if (G.useSpell) { G.useSpell = null; G.ui.dirty('magic'); G.ui.dirty('inv'); } }

// ------------------------------------------------------------------ teleports
function castTeleport(s) {
  const p = G.player;
  if (wildLevel(p.x, p.y) > 20) { msg('A mysterious force blocks your teleport spell! You can\'t teleport above level 20 Wilderness.'); return; }
  if (G.tick - p.lastHitTick < 8 && p.lastHitBy) { /* allowed, like the classic game */ }
  takeRunes(p, s);
  p.addXp('magic', s.xp);
  teleportTo(s.to[0], s.to[1], 'main', `You teleport to ${s.place}.`);
}
function teleportTo(x, y, map, text) {
  const p = G.player;
  p.path = []; p.target = null; p.action = null;
  sfx('teleport');
  G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() });
  p.playAnim('attack', 2);
  after(2, () => { G.game.teleport(x, y, text, true, map); after(1, () => G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() })); });
}

// ------------------------------------------------------------------ spells on items
export function castOnItem(slot) {
  const p = G.player, s = SPELL[G.useSpell.id], it = p.inv[slot];
  clearSpell();
  if (!it) return;
  const item = ITEMS[it.id];
  if (!canCast(s)) return;
  if (s.type === 'alch') {
    if (it.id === 'coins') { msg('Coins are already made of gold.'); return; }
    if (item.quest || it.id.endsWith('_rune')) { msg('You can\'t use this spell on that item.'); return; }
    const coins = Math.max(1, Math.floor(item.value * s.rate));
    takeRunes(p, s);
    p.removeSlot(slot, 1);
    p.add('coins', coins);
    p.addXp('magic', s.xp);
    sfx('coins'); p.playAnim('attack', 2);
    G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() });
    msg(`You turn the ${item.name.toLowerCase()} into ${commas(coins)} coins.`);
    G.ui.setTab('magic');
    return;
  }
  if (s.type === 'superheat') {
    const r = SMELTING.find((x) => x.ores[it.id]);
    if (!r) { msg('You need to cast superheat item on ore.'); return; }
    let ores = { ...r.ores };
    if (it.id === 'iron_ore' && p.count('coal') >= 2) ores = { iron_ore: 1, coal: 2 };   // iron + coal makes steel
    const bar = it.id === 'iron_ore' && ores.coal ? SMELTING.find((x) => x.bar === 'steel_bar') : r;
    if (p.lvl('smithing') < bar.lvl) { msg(`You need a Smithing level of ${bar.lvl} to smelt this.`); return; }
    for (const [o, n] of Object.entries(bar.ores)) if (p.count(o) < n) { msg(`You need ${n} ${ITEMS[o].name.toLowerCase()} to make ${aOrAn(ITEMS[bar.bar].name.toLowerCase())}.`); return; }
    takeRunes(p, s);
    for (const [o, n] of Object.entries(bar.ores)) p.remove(o, n);
    p.add(bar.bar);
    p.addXp('magic', s.xp); p.addXp('smithing', bar.xp);
    sfx('fire'); p.playAnim('attack', 2);
    msg(`You superheat the ore into ${aOrAn(ITEMS[bar.bar].name.toLowerCase())}.`);
    G.ui.setTab('magic');
    return;
  }
  if (s.type === 'enchant') {
    const pair = ENCHANTS[s.gem].find(([from]) => from === it.id);
    if (!pair) { msg(`That spell only works on ${ENCHANTS[s.gem].map(([f]) => ITEMS[f].name.toLowerCase()).join(' or ')}.`); return; }
    takeRunes(p, s);
    p.removeSlot(slot, 1);
    p.add(pair[1]);
    if (pair[1] === 'ring_of_recoil') p.flags.recoil = 40;
    p.addXp('magic', s.xp);
    sfx('teleport'); p.playAnim('attack', 2);
    msg(`You enchant the ${item.name.toLowerCase()}.`);
    G.ui.setTab('magic');
    return;
  }
  msg('Nothing interesting happens.');
}

// ------------------------------------------------------------------ orbs at obelisks
export function castOnObject(o) {
  const p = G.player, s = SPELL[G.useSpell.id];
  clearSpell();
  if (s.type !== 'charge') { msg('Nothing interesting happens.'); return; }
  if (o.type !== 'obelisk') { msg('You need to cast this on an obelisk.'); return; }
  if (!p.has('unpowered_orb')) { msg('You need an unpowered orb to charge.'); return; }
  p.faceTile(o.x, o.y);
  startAction(() => {
    if (!p.has('unpowered_orb') || !canCast(s, true)) return false;
    takeRunes(p, s);
    p.remove('unpowered_orb');
    p.add(s.orb);
    p.addXp('magic', s.xp);
    sfx('teleport');
    G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() });
    msg(`You charge the orb. It hums with ${s.orb.replace('_orb', '')} energy.`);
    return p.has('unpowered_orb') && canCast(s, true) ? 5 : false;
  }, 1);
}

// ------------------------------------------------------------------ combat spells
export function castOnNpc(n) {
  const s = SPELL[G.useSpell.id];
  clearSpell();
  if (s.type !== 'combat') { msg('Nothing interesting happens.'); return; }
  if (!n.combat) { msg('You can\'t attack that.'); return; }
  G.game.setTarget('npc', n, 'Cast', { spell: s.id });
}
function magicRoll(p) {
  const b = p.bonuses();
  const eff = Math.floor(p.cur('magic') * p.prayerMult('mag')) + 8;
  return eff * (b.mag + 64);
}
// Cast `spellId` at `n` (called when in range). Returns false if the spell couldn't be cast.
export function magicAttack(n, spellId) {
  const p = G.player, s = SPELL[spellId];
  if (!canCast(s)) { p.target = null; return false; }
  takeRunes(p, s);
  p.attackCd = 5;
  p.playAnim('attack', 2);
  p.faceTile(n.x + (n.size - 1) / 2, n.y + (n.size - 1) / 2);
  const dist = Math.max(Math.abs(n.x - p.x), Math.abs(n.y - p.y));
  const flight = 1 + Math.floor(dist / 4);
  projectile(p, n, s.color, flight, s.tier === 'Wave' || s.tier === 'Blast' ? 'fire' : 'bolt');
  sfx('teleport');
  const bonus = helmBonus(n);
  const hit = Math.random() < hitChance(magicRoll(p) * bonus, npcDefRoll(n, 'magic'));
  const dmg = hit ? randInt(0, Math.floor(s.max * bonus)) : 0;
  p.addXp('magic', s.xp);
  if (!n.target) { n.target = p; n.returning = false; if (n.attackCd <= 0) n.attackCd = 1 + flight; }
  after(flight, () => {
    if (n.dead) return;
    if (!hit) { n.hitsplat(0, 'block'); G.effects.push({ kind: 'poof', x: n.x, y: n.y, t: performance.now() }); return; }
    const real = Math.min(dmg, n.hp);
    n.hp -= real;
    n.hitsplat(dmg, dmg > 0 ? 'hit' : 'block');
    if (real > 0) { p.addXp('magic', real * 2); p.addXp('hitpoints', real * 1.33); }
    n.lastHitTick = G.tick;
    if (n.hp <= 0) killNpc(n);
  });
  return true;
}

// ------------------------------------------------------------------ enchanted jewellery
export function rubJewellery(slotOrEquip) {
  const p = G.player;
  const s = typeof slotOrEquip === 'number' ? p.inv[slotOrEquip] : p.equip[slotOrEquip];
  if (!s) return;
  const it = ITEMS[s.id];
  if (!it.jewelTele) return;
  if (wildLevel(p.x, p.y) > 30) { msg('The jewellery is dull here. You can\'t teleport above level 30 Wilderness.'); return; }
  const dests = JEWEL_TELEPORTS[it.jewelTele];
  G.ui.dialogue(G.player, async (d) => {
    const c = await d.options([...dests.map((x) => x[0]), 'Nowhere.']);
    if (c >= dests.length) return;
    d.end();
    const dest = dests[c];
    // use up a charge
    const next = it.jewelTele === 'glory' ? `amulet_of_glory_${it.charges - 1}` : it.charges > 1 ? `travellers_necklace_${it.charges - 1}` : null;
    if (next) s.id = next; else { if (typeof slotOrEquip === 'number') p.inv[slotOrEquip] = null; else p.equip[slotOrEquip] = null; msg('Your necklace crumbles to dust.'); }
    G.ui.dirty('inv'); G.ui.dirty('equip');
    if (dest.length === 2) {
      const w = G.worlds.get(dest[1]);
      const [x, y] = G.overworld.points['exit_' + w.id] || w.entrance;
      teleportTo(x, y, 'main', `You travel to the entrance of ${dest[0]}.`);
    } else teleportTo(dest[1], dest[2], dest[3], `You teleport to ${dest[0]}.`);
  });
}

// Called when the player takes damage from `src`.
export function jewelleryOnHit(dmg, src) {
  const p = G.player, ring = p.equip.ring;
  if (!ring || dmg <= 0) return;
  if (ring.id === 'ring_of_recoil' && src && !src.dead && src.hp) {
    const back = Math.max(1, Math.floor(dmg / 10));
    src.hp = Math.max(0, src.hp - back);
    src.hitsplat(back, 'hit');
    if (src.hp <= 0) killNpc(src);
    p.flags.recoil = (p.flags.recoil ?? 40) - back;
    if (p.flags.recoil <= 0) { p.equip.ring = null; p.flags.recoil = 40; msg('Your Ring of Recoil has shattered.', '#ef1020'); G.ui.dirty('equip'); }
  }
  if (ring.id === 'ring_of_life' && p.hp > 0 && p.hp <= p.maxHp / 10 && wildLevel(p.x, p.y) <= 30) {
    p.equip.ring = null;
    msg('Your Ring of Life saves you and is destroyed in the process.', '#ef1020');
    G.ui.dirty('equip');
    G.game.teleport(...G.game.home(), null, true, 'main');
  }
}

// ------------------------------------------------------------------ runecraft
export function enterRuins(o) {
  const p = G.player, rune = OBJECTS[o.type].rune || o.rune;
  const tiara = p.equip.head && ITEMS[p.equip.head.id].talisman === rune;
  const talisman = p.inv.some((s) => s && ITEMS[s.id].talisman === rune);
  if (!tiara && !talisman) { msg('You feel a powerful force take hold of you... but nothing happens. Perhaps a talisman would help.'); return; }
  sfx('teleport');
  G.game.teleport(o.to[0], o.to[1], `You feel a powerful force take hold of you and pull you into the ${RUNE[rune].name.toLowerCase()} altar.`, true, o.to[2]);
}
export function craftRunes(o) {
  const p = G.player, r = RUNE[o.rune];
  if (p.lvl('runecraft') < r.lvl) { msg(`You need a Runecraft level of ${r.lvl} to infuse ${r.name.toLowerCase()} runes.`); return; }
  const n = p.count('rune_essence');
  if (!n) { msg('You don\'t have any rune essence.'); return; }
  const mult = r.step ? 1 + Math.floor(p.lvl('runecraft') / r.step) : 1;
  p.faceTile(o.x, o.y);
  p.playAnim('attack', 2);
  sfx('teleport');
  G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() });
  after(1, () => {
    const have = p.remove('rune_essence', n);
    p.add(r.item, have * mult);
    p.addXp('runecraft', have * r.xp);
    msg(`You bind the temple's power into ${commas(have * mult)} ${r.name.toLowerCase()} runes.`);
  });
}
export { SKILL_NAMES };

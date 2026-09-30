// Context menus and everything that happens when you click on stuff.
import { G, msg, sfx, after } from './state.js';
import { ITEMS, COOKING, BONES, FIREMAKING, POTIONS, SMELTING } from '../data/items.js';
import { OBJECTS } from '../data/objects.js';
import { NPCS } from '../data/npcs.js';
import { SKILL_NAMES } from '../data/skills.js';
import { chop, mine, fish, cook, lightLogs, feedFire, stealStall, pickpocket, bury, offerBones, prayAt, cutGem } from './skilling.js';
import { recipesForPair, recipesForStation, offerRecipes, pickCrop, shear, searchChest } from './crafting.js';
import { castOnItem, castOnNpc, castOnObject, clearSpell, rubJewellery, enterRuins, craftRunes } from './magic.js';
import { SPELL } from '../data/magic.js';
import { crossObstacle } from './agility.js';
import { HERBS } from '../data/items.js';
import { DIALOGUE, searchObject, pickObject, combineTablets, tombDoor, openChest, dig, readClue, openCasket, rubLamp } from './quests.js';
import { npcLevelColor } from './combat.js';
import { placeName, areaAt } from './world_info.js';
import { commas, cap } from '../util.js';

const Y = (s) => `<span class="m-npc">${s}</span>`;
const C = (s) => `<span class="m-obj">${s}</span>`;
const O = (s) => `<span class="m-item">${s}</span>`;

// ------------------------------------------------------------------ world menu
export function worldMenu(hit) {
  const p = G.player;
  const E = [];
  const ex = [];
  if (G.useSpell) {
    const s = SPELL[G.useSpell.id];
    const nm = `<span style="color:#00ff80">${s.name}</span>`;
    if (s.type === 'combat') for (const n of hit.npcs) if (n.combat) E.push({ text: `Cast ${nm} -> ${Y(n.name)}`, fn: () => castOnNpc(n) });
    if (s.type === 'charge' && hit.obj) E.push({ text: `Cast ${nm} -> ${C(OBJECTS[hit.obj.type].name)}`, fn: () => castOnObject(hit.obj) });
    E.push({ text: 'Walk here', fn: () => { clearSpell(); walk(hit); } });
    E.push({ text: 'Cancel', fn: () => clearSpell() });
    return E;
  }
  const use = G.useItem;
  if (use) {
    const nm = ITEMS[use.id].name;
    for (const n of hit.npcs) E.push({ text: `Use ${O(nm)} -> ${Y(n.name)}`, fn: () => useOn('npc', n) });
    for (const g of hit.items) E.push({ text: `Use ${O(nm)} -> ${O(ITEMS[g.id].name)}`, fn: () => { msg('Nothing interesting happens.'); G.useItem = null; } });
    if (hit.obj) E.push({ text: `Use ${O(nm)} -> ${C(OBJECTS[hit.obj.type].name)}`, fn: () => useOn('obj', hit.obj) });
    E.push({ text: 'Walk here', fn: () => { G.useItem = null; walk(hit); } });
    E.push({ text: 'Cancel', fn: () => { G.useItem = null; } });
    return E;
  }
  for (const n of hit.npcs) {
    const d = n.def;
    const lvl = d.lvl ? ` <span style="color:${npcLevelColor(d.lvl)}">(level-${d.lvl})</span>` : '';
    for (const a of d.actions) E.push({ text: `${a} ${Y(n.name)}${a === 'Attack' || !d.actions.includes('Attack') ? lvl : ''}`, fn: () => G.game.setTarget('npc', n, a), npc: n });
    ex.push({ text: `Examine ${Y(n.name)}${lvl}`, fn: () => msg(d.examine || 'It\'s a ' + n.name + '.') });
  }
  for (const g of [...hit.items].reverse()) {
    const it = ITEMS[g.id];
    E.push({ text: `Take ${O(it.name)}${g.qty > 1 ? ` (${commas(g.qty)})` : ''}`, fn: () => G.game.setTarget('item', g, 'Take') });
    ex.push({ text: `Examine ${O(it.name)}`, fn: () => msg(it.examine || 'An item.') });
  }
  if (hit.obj) {
    const o = hit.obj, d = OBJECTS[o.type];
    let acts = d.actions;
    if (d.door) acts = [o.open ? 'Close' : 'Open'];
    const depleted = o.depleted > G.tick;
    const name = depleted && d.wc ? 'Tree stump' : depleted && d.mine ? 'Rocks' : d.name;
    if (!(depleted && (d.wc || d.mine))) for (const a of acts) E.push({ text: `${a} ${C(name)}`, fn: () => G.game.setTarget('obj', o, a) });
    ex.push({ text: `Examine ${C(name)}`, fn: () => msg(depleted && d.wc ? 'This tree has been cut down.' : depleted && d.mine ? 'There is no ore currently available in this rock.' : d.examine || 'Nothing special.') });
  }
  E.push({ text: 'Walk here', fn: () => walk(hit), walk: true });
  E.push(...ex);
  E.push({ text: 'Cancel', fn: () => {} });
  return E;
}

function walk(hit) {
  const reached = G.game.walkTo(hit.x, hit.y);
  G.ui.clickMark(hit.sx, hit.sy, 'yellow');
  return reached;
}

// ------------------------------------------------------------------ npc & object actions
export function performNpc(n, option) {
  const p = G.player;
  switch (option) {
    case 'Talk-to': {
      const d = NPCS[n.defId];
      const script = DIALOGUE[d.talk] || DIALOGUE.townsfolk;
      n.busyUntil = G.tick + 200;
      G.ui.dialogue(n, script, () => { n.busyUntil = G.tick + 2; });
      break;
    }
    case 'Trade': if (n.spawn.shop) G.ui.openShop(n.spawn.shop); break;
    case 'Bank': G.ui.openBank(); break;
    case 'Pickpocket': pickpocket(n); break;
    case 'Shear': shear(n); break;
    case 'Teleport': {
      const w = G.worlds.get('essence');
      n.say('Senventior disthine molenko!');
      G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() }); sfx('teleport');
      after(2, () => G.game.teleport(...w.points.arrive, 'You are teleported to the rune essence mine.', true, 'essence'));
      break;
    }
    case 'Milk':
      if (!p.has('bucket')) { msg('You need a bucket to milk the cow.'); return; }
      p.playAnim('attack', 2);
      after(1, () => { p.remove('bucket'); p.add('bucket_of_milk'); msg('You milk the cow.'); sfx('splash'); });
      break;
    case 'Travel': {
      const here = n.spawn.name === 'Elven sailor' ? 'elderglen' : n.spawn.name === 'Island sailor' ? 'palmera' : 'selby';
      n.busyUntil = G.tick + 200;
      G.ui.dialogue(n, async (d) => { await d.npc('Where would you like to go?'); await G.game.travelMenu(d, here); }, () => { n.busyUntil = G.tick + 2; });
      break;
    }
  }
}

export function performObj(o, option, useItem) {
  const p = G.player;
  const d = OBJECTS[o.type];
  if (useItem) { useOnObjAction(useItem, o); return; }
  if (d.door && (option === 'Open' || option === 'Close')) {
    o.open = !o.open;
    sfx('door');
    return;
  }
  if (d.obstacle && option === d.actions[0]) { crossObstacle(o); return; }
  switch (option) {
    case 'Chop down': chop(o); break;
    case 'Mine': mine(o); break;
    case 'Net': case 'Bait': case 'Lure': case 'Cage': case 'Harpoon': fish(o, option); break;
    case 'Bank': G.ui.openBank(); break;
    case 'Smelt': G.ui.openFurnace(); break;
    case 'Smith': G.ui.openAnvil(); break;
    case 'Cook': cook(o); break;
    case 'Pray-at': prayAt(o); break;
    case 'Read': readSign(o); break;
    case 'Climb-down': case 'Climb-up': case 'Walk-down': case 'Walk-up': case 'Exit':
      if (!o.to) { msg('It doesn\'t lead anywhere.'); break; }
      p.playAnim('attack', 1);
      sfx('ladder');
      G.game.teleport(o.to[0], o.to[1], o.msg, true, o.to[2]);
      break;
    case 'Enter':
      if (o.type === 'mysterious_ruins') enterRuins(o);
      else if (o.to) { sfx('ladder'); G.game.teleport(o.to[0], o.to[1], o.msg, true, o.to[2]); }
      else if (o.type === 'tomb_door') tombDoor(o, false);
      else if (o.type === 'portal') G.game.teleport(...G.game.home(), 'The portal whisks you away.', true, 'main');
      break;
    case 'Search': searchObject(o); break;
    case 'Take-flour':
      if (!p.has('pot')) { msg('You need an empty pot to hold the flour.'); return; }
      p.remove('pot'); p.add('pot_of_flour'); msg('You fill the pot with flour.'); sfx('pickup');
      break;
    case 'Pick': case 'Pick-from': if (d.crop) pickCrop(o); else pickObject(o); break;
    case 'Steal-from': stealStall(o); break;
    case 'Open': openChest(o); break;
    case 'Search-for-traps': searchChest(o); break;
    case 'Craft-rune': craftRunes(o); break;
    case 'Spin': case 'Form': case 'Fire': case 'Churn':
      if (!offerRecipes(recipesForStation(o), `What would you like to ${option.toLowerCase()}?`, o)) msg('You have nothing to use here.');
      break;
  }
}

function readSign(o) {
  if (o.type === 'wild_sign') { G.ui.showClue('WARNING!<br><br>Beyond this point is the Wilderness. Monsters here are vicious and will attack on sight.<br><br>If you die here, you will lose all but your three most valuable items.<br><br>Deeper = deadlier.'); return; }
  const dirs = [];
  for (const a of G.world.areas) {
    const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2;
    const dx = cx - o.x, dy = cy - o.y, d = Math.hypot(dx, dy);
    if (d < 8 || d > 90) continue;
    const ang = Math.atan2(dy, dx);
    const dir = ['East', 'South-east', 'South', 'South-west', 'West', 'North-west', 'North', 'North-east'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    dirs.push({ d, t: `<b>${dir}:</b> ${a.name}` });
  }
  dirs.sort((a, b) => a.d - b.d);
  G.ui.showClue(`<b>${placeName(o.x, o.y)}</b><br><br>` + dirs.slice(0, 5).map((x) => x.t).join('<br>'));
}

export function pickupItem(g) {
  const p = G.player;
  if (!p.canAdd(g.id, 1)) { msg('You don\'t have enough inventory space to hold that item.'); sfx('error'); return; }
  G.game.removeGround(g);
  if (g.spawn) g.spawn.nextAt = G.tick + g.spawn.respawn;
  p.add(g.id, g.qty);
  sfx('pickup');
}

// ------------------------------------------------------------------ use-item logic
function useOn(kind, target) {
  const use = G.useItem;
  G.useItem = null;
  G.ui.dirty('inv');
  if (!use) return;
  if (kind === 'npc') {
    if (target.defId === 'dairy_cow' && use.id === 'bucket') G.game.setTarget('npc', target, 'Milk');
    else if (use.id === 'shears' && target.def.actions.includes('Shear')) G.game.setTarget('npc', target, 'Shear');
    else msg('Nothing interesting happens.');
    return;
  }
  G.game.setTarget('obj', target, 'Use');
  if (G.player.target) G.player.target.useItem = use.id;
}

function useOnObjAction(itemId, o) {
  const p = G.player;
  const d = OBJECTS[o.type];
  if (!p.has(itemId)) return;
  if (d.cook && COOKING[itemId]) return cook(o, itemId);
  if (o.type === 'rune_altar' && itemId === 'rune_essence') return craftRunes(o);
  if (o.type === 'mysterious_ruins' && ITEMS[itemId].talisman) return enterRuins(o);
  if ((o.type === 'fire' || o.type === 'campfire') && FIREMAKING[itemId]) return feedFire(o, itemId);
  if (offerRecipes(recipesForStation(o, itemId), null, o)) return;
  if (o.type === 'furnace' && (SMELTING.some((s) => Object.keys(s.ores).includes(itemId)) || itemId === 'gold_bar')) return G.ui.openFurnace(itemId === 'gold_bar' ? 'jewellery' : 'bars');
  if (o.type === 'anvil' && itemId.endsWith('_bar')) return G.ui.openAnvil(itemId.replace('_bar', ''));
  if ((o.type === 'altar' || o.type === 'chaos_altar') && BONES[itemId]) return offerBones(itemId, o);
  if (o.type === 'tomb_door' && itemId === 'scarab_tablet') return tombDoor(o, true);
  if (o.type === 'flour_bin' && itemId === 'pot') return performObj(o, 'Take-flour');
  msg('Nothing interesting happens.');
}

export function useOnItem(a, b) {
  const p = G.player;
  const A = p.inv[a], B = p.inv[b];
  G.useItem = null;
  G.ui.dirty('inv');
  if (!A || !B || a === b) return;
  const pair = (x, y) => (A.id === x && B.id.match(y)) || (B.id === x && A.id.match(y));
  const slotOf = (re) => (A.id.match(re) ? a : b);
  if (pair('tinderbox', /logs$/)) return lightLogs(slotOf(/logs$/));
  if (pair('chisel', /^uncut_/)) return cutGem(A.id.startsWith('uncut_') ? A.id : B.id);
  if (A.id.startsWith('tablet_') && B.id.startsWith('tablet_')) return combineTablets();
  if (offerRecipes(recipesForPair(A.id, B.id))) return;
  msg('Nothing interesting happens.');
}

// ------------------------------------------------------------------ inventory item options
export function itemOptions(slot) {
  const p = G.player;
  const s = p.inv[slot];
  if (!s) return [];
  const it = ITEMS[s.id];
  const nm = O(it.name);
  const E = [];
  if (G.useSpell) {
    const sp = SPELL[G.useSpell.id];
    E.push({ text: `Cast <span style="color:#00ff80">${sp.name}</span> -> ${nm}`, fn: () => castOnItem(slot) });
    E.push({ text: 'Cancel', fn: () => clearSpell() });
    return E;
  }
  if (G.useItem) {
    const u = ITEMS[G.useItem.id].name;
    E.push({ text: `Use ${O(u)} -> ${nm}`, fn: () => useOnItem(G.useItem.slot, slot) });
    E.push({ text: 'Cancel', fn: () => { G.useItem = null; G.ui.dirty('inv'); } });
    return E;
  }
  if (it.food) E.push({ text: `Eat ${nm}`, fn: () => eat(slot) });
  if (POTIONS[s.id]) E.push({ text: `Drink ${nm}`, fn: () => drink(slot) });
  if (BONES[s.id] !== undefined && s.id !== 'ashes') E.push({ text: `${s.id.endsWith('ashes') ? 'Scatter' : 'Bury'} ${nm}`, fn: () => bury(slot) });
  if (it.equip) E.push({ text: `${it.equip.slot === 'weapon' || it.equip.slot === 'shield' ? 'Wield' : 'Wear'} ${nm}`, fn: () => p.equipFromSlot(slot) });
  if (FIREMAKING[s.id]) E.push({ text: `Light ${nm}`, fn: () => lightLogs(slot) });
  if (s.id === 'clue_scroll') E.push({ text: `Read ${nm}`, fn: () => readClue() });
  if (s.id === 'casket' || s.id === 'reward_casket') E.push({ text: `Open ${nm}`, fn: () => openCasket(slot, s.id === 'reward_casket') });
  if (s.id === 'lamp') E.push({ text: `Rub ${nm}`, fn: () => rubLamp(slot) });
  if (s.id === 'spade') E.push({ text: `Dig ${nm}`, fn: () => { p.path = []; p.target = null; dig(); } });
  if (s.id === 'bird_nest') E.push({ text: `Search ${nm}`, fn: () => searchNest(slot) });
  if (it.herb) E.push({ text: `Clean ${nm}`, fn: () => cleanHerb(slot) });
  if (it.jewelTele) E.push({ text: `Rub ${nm}`, fn: () => rubJewellery(slot) });
  E.push({ text: `Use ${nm}`, fn: () => { G.useItem = { slot, id: s.id }; G.ui.dirty('inv'); } });
  E.push({ text: `Drop ${nm}`, fn: () => dropSlot(slot) });
  E.push({ text: `Examine ${nm}`, fn: () => msg(it.examine + (it.value > 1 ? ` <span style="color:#7f7f7f">(${commas(it.value)} coins)</span>` : '')) });
  return E;
}

export function dropSlot(slot) {
  const p = G.player;
  const s = p.removeSlot(slot);
  if (!s) return;
  if (ITEMS[s.id].quest && s.id.startsWith('tablet')) msg('You drop the fragment. Careful, it might break!');
  G.game.dropGround(s.id, s.qty, p.x, p.y, { life: 300 });
  sfx('drop');
}

export function eat(slot) {
  const p = G.player;
  const s = p.inv[slot];
  if (!s || G.tick < (p.eatCd || 0)) return;
  const it = ITEMS[s.id];
  p.eatCd = G.tick + 2;
  p.removeSlot(slot, 1);
  if (s.id === 'cake') { /* cakes are one-bite here */ }
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + it.food.heal);
  p.attackCd = Math.max(p.attackCd, 2);
  msg(`You eat the ${it.name.toLowerCase()}.` + (p.hp > before ? ' It heals some health.' : ''));
  sfx('eat');
  G.ui.dirty('orbs');
}

export function drink(slot) {
  const p = G.player;
  const s = p.inv[slot];
  if (!s || G.tick < (p.eatCd || 0)) return;
  const pot = POTIONS[s.id];
  p.eatCd = G.tick + 2;
  p.removeSlot(slot, 1);
  if (pot.boost) for (const [sk, [a, f]] of Object.entries(pot.boost)) {
    const k = p.skills[sk];
    k.cur = Math.max(k.cur, k.lvl + a + Math.floor(k.lvl * f));
  }
  if (pot.restore) { const k = p.skills.prayer; k.cur = Math.min(k.lvl, k.cur + pot.restore[0] + Math.floor(k.lvl * pot.restore[1])); }
  if (pot.restoreStats) for (const [sk, k] of Object.entries(p.skills)) if (sk !== 'hitpoints' && sk !== 'prayer' && k.cur < k.lvl) k.cur = Math.min(k.lvl, k.cur + pot.restoreStats[0] + Math.floor(k.lvl * pot.restoreStats[1]));
  if (pot.cure) { if (p.poison) msg('You are no longer poisoned.'); p.poison = null; p.poisonImmune = G.tick + pot.cure; }
  if (pot.energy) p.runEnergy = Math.min(100, p.runEnergy + pot.energy);
  if (pot.antifire) { p.antifireUntil = G.tick + pot.antifire; msg('You feel protected from dragonfire.'); }
  msg(`You drink the ${ITEMS[s.id].name.toLowerCase()}.`);
  sfx('drink');
  G.ui.dirty('skills'); G.ui.dirty('orbs');
}

function cleanHerb(slot) {
  const p = G.player, s = p.inv[slot], h = HERBS.find((x) => x.id === ITEMS[s.id].herb);
  if (p.lvl('herblore') < h.lvl) { msg(`You need a Herblore level of ${h.lvl} to clean this herb.`); return; }
  p.inv[slot] = { id: h.id, qty: 1 };
  p.addXp('herblore', h.xp);
  msg(`You clean the ${h.name.toLowerCase()}.`);
  sfx('pickup'); G.ui.dirty('inv');
}

function searchNest(slot) {
  const p = G.player;
  p.removeSlot(slot, 1);
  const r = Math.random();
  const id = r < 0.5 ? 'uncut_sapphire' : r < 0.75 ? 'uncut_emerald' : r < 0.9 ? 'uncut_ruby' : r < 0.99 ? 'gold_ring' : 'uncut_diamond';
  p.give(id);
  msg(`You take ${ITEMS[id].name.toLowerCase()} out of the bird's nest.`);
}

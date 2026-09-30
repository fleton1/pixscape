// Skilling actions. Repeating actions live on player.action = { fn, next }.
import { G, msg, sfx, after } from './state.js';
import { ITEMS, FIREMAKING, COOKING, SMELTING, BONES, GEMS, JEWELLERY, METALS } from '../data/items.js';
import { OBJECTS } from '../data/objects.js';
import { SKILL_NAMES } from '../data/skills.js';
import { clamp, randInt, pickWeighted, aOrAn, cap } from '../util.js';
import { givePet } from './combat.js';
import { damagePlayer } from './combat.js';
import { mineStar } from './events.js';

// anim: true (pose from the tool in hand), false (none) or a pose style such as 'fish' or 'work'
export function startAction(fn, delay = 1, anim = true) {
  const p = G.player;
  p.action = { fn, next: G.tick + delay, anim };
}
export function stopAction() { G.player.action = null; }

export function tickAction() {
  const p = G.player;
  const a = p.action;
  if (!a || p.dead) return;
  if (a.anim) p.playAnim('attack', 2, typeof a.anim === 'string' ? a.anim : ({ axe: 'chop', pickaxe: 'crush' })[p.toolLook && p.toolLook.kind] || 'work');
  if (G.tick < a.next) return;
  const r = a.fn();
  if (r === false || r === undefined) { if (p.action === a) p.action = null; return; }
  a.next = G.tick + r;
}

function bestTool(type) {
  const p = G.player;
  let best = null;
  const consider = (id) => {
    const t = ITEMS[id]?.tool;
    if (t && t.type === type && p.lvl(type === 'axe' ? 'woodcutting' : 'mining') >= t.lvl && (!best || t.power > best.power)) best = { ...t, id };
  };
  for (const s of p.inv) if (s) consider(s.id);
  if (p.equip.weapon) consider(p.equip.weapon.id);
  return best;
}
function anyTool(type) {
  const p = G.player;
  return [...p.inv, p.equip.weapon].some((s) => s && ITEMS[s.id]?.tool?.type === type);
}

function skillPet(chance, id) { if (Math.random() < chance) givePet(id); }

// ------------------------------------------------------------ woodcutting
export function chop(o) {
  const p = G.player, d = OBJECTS[o.type], wc = d.wc;
  if (d.quest === 'lost_grove' && p.stage('lost_grove') < 100) { msg('The magic tree shimmers. The elves of Elderglen protect it... perhaps they would let you, one day.'); return; }
  if (p.lvl('woodcutting') < wc.lvl) { msg(`You need a Woodcutting level of ${wc.lvl} to chop down this tree.`); return; }
  const axe = bestTool('axe');
  if (!axe) { msg(anyTool('axe') ? 'You do not have an axe which you have the Woodcutting level to use.' : 'You need an axe to chop down this tree.'); return; }
  if (!p.canAdd(wc.log)) { msg('Your inventory is too full to hold any more logs.'); return; }
  msg('You swing your axe at the tree.');
  p.faceTile(o.x, o.y);
  p.toolLook = ITEMS[axe.id].equip.look;
  const diff = { 1: 0, 15: 0.08, 30: 0.12, 45: 0.2, 60: 0.3, 75: 0.38 }[wc.lvl] ?? 0.1;
  startAction(() => {
    if (o.depleted > G.tick || o.removed) return false;
    if (!p.canAdd(wc.log)) { msg('Your inventory is too full to hold any more logs.'); return false; }
    sfx('chop');
    const chance = clamp(0.28 + (p.lvl('woodcutting') - wc.lvl) * 0.014 + axe.power * 0.05 - diff, 0.06, 0.92);
    if (Math.random() < chance) {
      p.add(wc.log);
      p.addXp('woodcutting', wc.xp);
      msg(`You get some ${ITEMS[wc.log].name.toLowerCase()}.`);
      if (Math.random() < 1 / 200) { G.game.dropGround('bird_nest', 1, p.x, p.y); msg('A bird\'s nest falls out of the tree!', '#ef1020'); }
      skillPet(1 / 4000, 'beaver');
      if (wc.deplete === 1 || Math.random() < 1 / wc.deplete) {
        o.depleted = G.tick + wc.respawn;
        sfx('treefall');
        return false;
      }
    }
    return 4;
  }, 2);
}

// ------------------------------------------------------------ mining
export function mine(o) {
  const p = G.player, d = OBJECTS[o.type];
  if (o.type === 'fallen_star') { msg('You start mining the star.'); p.faceTile(o.x, o.y); startAction(() => (mineStar(o) ? 4 : false), 2); return; }
  if (o.type === 'cracked_sandstone') return G.game.questMine(o);
  const m = d.mine;
  if (!m) return;
  const gems = !!d.gems;
  if (o.depleted > G.tick) { msg('There is currently no ore available in this rock.'); return; }
  if (p.lvl('mining') < m.lvl) { msg(`You need a Mining level of ${m.lvl} to mine this rock.`); return; }
  const pick = bestTool('pick');
  if (!pick) { msg(anyTool('pick') ? 'You do not have a pickaxe which you have the Mining level to use.' : 'You need a pickaxe to mine this rock.'); return; }
  if (p.freeSlots() === 0 && (gems || !p.canAdd(m.ore))) { msg('Your inventory is too full to hold any more ore.'); return; }
  msg('You swing your pick at the rock.');
  p.faceTile(o.x, o.y);
  p.toolLook = ITEMS[pick.id].equip.look;
  const diff = m.lvl >= 85 ? 0.4 : m.lvl >= 70 ? 0.32 : m.lvl >= 55 ? 0.26 : m.lvl >= 40 ? 0.2 : m.lvl >= 30 ? 0.14 : m.lvl >= 15 ? 0.08 : 0;
  startAction(() => {
    if (o.depleted > G.tick) return false;
    if (p.freeSlots() === 0 && (gems || !p.canAdd(m.ore))) { msg('Your inventory is too full to hold any more ore.'); return false; }
    sfx('mine');
    const chance = clamp(0.3 + (p.lvl('mining') - m.lvl) * 0.013 + pick.power * 0.05 - diff, 0.05, 0.92);
    if (Math.random() < chance) {
      if (gems) {
        const g = pickWeighted(GEM_ROCK);
        p.add(g.id);
        msg(`You just mined ${aOrAn(ITEMS[g.id].name.replace('Uncut ', '').toLowerCase())}!`);
      } else {
        p.add(m.ore);
        p.tally('mined', m.ore);
        msg(`You manage to mine some ${ITEMS[m.ore].name.toLowerCase().replace(' ore', '')}.`);
      }
      p.addXp('mining', m.xp);
      if (Math.random() < 1 / 120) {
        const g = pickWeighted([{ w: 50, id: 'uncut_sapphire' }, { w: 25, id: 'uncut_emerald' }, { w: 15, id: 'uncut_ruby' }, { w: 8, id: 'uncut_diamond' }, { w: 1, id: 'uncut_dragonstone' }]);
        p.give(g.id); msg(`You just found ${aOrAn(ITEMS[g.id].name.replace('Uncut ', ''))}!`, '#ef1020');
      }
      skillPet(1 / 4000, 'rock_golem');
      if (d.infinite) return 4;   // essence never runs out
      o.depleted = G.tick + m.respawn;
      return false;
    }
    return 4;
  }, 2);
}

export const GEM_ROCK = [{ w: 30, id: 'uncut_opal' }, { w: 25, id: 'uncut_jade' }, { w: 18, id: 'uncut_red_topaz' }, { w: 12, id: 'uncut_sapphire' }, { w: 8, id: 'uncut_emerald' }, { w: 5, id: 'uncut_ruby' }, { w: 2, id: 'uncut_diamond' }];

// ------------------------------------------------------------ fishing
const FISH = {
  Net: [{ fish: 'raw_shrimps', lvl: 1, xp: 10 }, { fish: 'raw_anchovies', lvl: 15, xp: 40 }],
  'Net@spot_monk': [{ fish: 'raw_monkfish', lvl: 62, xp: 120 }],
  'Big net': [{ fish: 'raw_mackerel', lvl: 16, xp: 20 }, { fish: 'raw_cod', lvl: 23, xp: 45 }, { fish: 'raw_bass', lvl: 46, xp: 100 }],
  'Harpoon@spot_bignet': [{ fish: 'raw_shark', lvl: 76, xp: 110 }],
  'Bait@spot_cave': [{ fish: 'raw_cave_eel', lvl: 38, xp: 80 }],
  'Bait@spot_angler': [{ fish: 'raw_anglerfish', lvl: 82, xp: 120 }],
  'Cage@spot_darkcrab': [{ fish: 'raw_dark_crab', lvl: 85, xp: 130 }],
  'Harpoon@spot_monk': [{ fish: 'raw_tuna', lvl: 35, xp: 80 }, { fish: 'raw_swordfish', lvl: 50, xp: 100 }],
  'Bait@spot_net': [{ fish: 'raw_sardine', lvl: 5, xp: 20 }, { fish: 'raw_herring', lvl: 10, xp: 30 }],
  Lure: [{ fish: 'raw_trout', lvl: 20, xp: 50 }, { fish: 'raw_salmon', lvl: 30, xp: 70 }],
  'Bait@spot_lure': [{ fish: 'raw_pike', lvl: 25, xp: 60 }],
  Cage: [{ fish: 'raw_lobster', lvl: 40, xp: 90 }],
  'Harpoon@spot_cage': [{ fish: 'raw_tuna', lvl: 35, xp: 80 }, { fish: 'raw_swordfish', lvl: 50, xp: 100 }],
  'Harpoon@spot_shark': [{ fish: 'raw_shark', lvl: 76, xp: 110 }],
};
const FISH_TOOL = { Net: ['small_net'], 'Big net': ['big_net'], Bait: ['fishing_rod', 'fishing_bait'], Lure: ['fly_rod', 'feather'], Cage: ['lobster_pot'], Harpoon: ['harpoon'] };

export function fish(o, option) {
  const p = G.player;
  const table = FISH[`${option}@${o.type}`] || FISH[option];
  if (!table) return;
  const lvl = p.lvl('fishing');
  const avail = table.filter((f) => lvl >= f.lvl);
  if (!avail.length) { msg(`You need a Fishing level of ${table[0].lvl} to fish here.`); return; }
  const [tool, bait] = FISH_TOOL[option];
  if (!p.has(tool)) { msg(`You need ${aOrAn(ITEMS[tool].name.toLowerCase())} to fish here.`); return; }
  if (bait && !p.has(bait)) { msg(`You don't have any ${ITEMS[bait].name.toLowerCase()} left.`); return; }
  if (p.freeSlots() === 0) { msg('Your inventory is too full to hold any more fish.'); return; }
  msg(option === 'Cage' ? 'You attempt to catch a lobster.' : option === 'Harpoon' ? 'You start harpooning fish.' : 'You cast out your line.');
  p.faceTile(o.x, o.y);
  p.toolLook = { kind: option === 'Harpoon' ? 'longsword' : 'staff', color: option === 'Harpoon' ? '#9a9a9a' : '#6a4a2a' };
  startAction(() => {
    if (p.freeSlots() === 0) { msg('Your inventory is too full to hold any more fish.'); return false; }
    if (bait && !p.has(bait)) { msg(`You have run out of ${ITEMS[bait].name.toLowerCase()}.`); return false; }
    // pick the highest fish we might catch, rolling down
    for (const f of [...avail].reverse()) {
      const chance = clamp(0.36 + (lvl - f.lvl) * 0.014, 0.12, 0.85);
      if (Math.random() < chance) {
        if (bait) p.remove(bait, 1);
        p.add(f.fish);
        p.tally('caught', f.fish);
        p.addXp('fishing', f.xp);
        msg(`You catch ${f.fish.includes('shrimp') || f.fish.includes('anchov') ? 'some' : 'a'} ${ITEMS[f.fish].name.replace('Raw ', '')}.`);
        sfx('splash');
        skillPet(1 / 4000, 'heron');
        if (Math.random() < 1 / 250) { p.give('casket'); msg('You fish up a casket!', '#ef1020'); }
        if (option === 'Big net' && Math.random() < 0.08) { p.give('seaweed'); msg('You also catch some seaweed.'); }
        return 4;
      }
    }
    return 4;
  }, 3, 'fish');
}

// ------------------------------------------------------------ firemaking
// Using logs on an existing fire burns them one after another, no tinderbox needed.
export function feedFire(o, logId) {
  const p = G.player, fm = FIREMAKING[logId];
  if (p.lvl('firemaking') < fm.lvl) { msg(`You need a Firemaking level of ${fm.lvl} to burn these logs.`); return; }
  p.faceTile(o.x, o.y);
  msg('You add the logs to the fire.');
  startAction(() => {
    if (o.removed || !p.has(logId)) return false;
    p.remove(logId, 1);
    p.addXp('firemaking', fm.xp);
    if (o.expires) o.expires = Math.max(o.expires, G.tick + 30);
    sfx('tinder');
    return p.has(logId) ? 4 : false;
  }, 2);
}
export function lightLogs(slot) {
  const p = G.player;
  const s = p.inv[slot];
  if (!s) return;
  const fm = FIREMAKING[s.id];
  if (!fm) return;
  if (!p.has('tinderbox')) { msg('You need a tinderbox to light a fire.'); return; }
  if (p.lvl('firemaking') < fm.lvl) { msg(`You need a Firemaking level of ${fm.lvl} to burn these logs.`); return; }
  const w = G.world;
  if (w.obj(p.x, p.y) || G.groundItems.some((g) => g.x === p.x && g.y === p.y && g.fire)) { msg('You can\'t light a fire here.'); return; }
  const t = w.t(p.x, p.y);
  if ([14, 7, 8, 17, 18, 19, 20, 24].includes(t)) { msg('You can\'t light a fire here.'); return; }
  const logId = s.id;
  p.removeSlot(slot, 1);
  msg('You attempt to light the logs.');
  const gi = G.game.dropGround(logId, 1, p.x, p.y, { fire: true });
  let tries = 0;
  startAction(() => {
    if (p.x !== gi.x || p.y !== gi.y || !G.groundItems.includes(gi)) return false;
    sfx('tinder');
    const chance = clamp(0.45 + (p.lvl('firemaking') - fm.lvl) * 0.02, 0.3, 1);
    if (Math.random() < chance || ++tries > 8) {
      G.game.removeGround(gi);
      const fire = w.addObject('fire', p.x, p.y, { expires: G.tick + randInt(60, 100) });
      if (fire) G.world.dirtyObjects = true;
      p.addXp('firemaking', fm.xp);
      msg('The fire catches and the logs begin to burn.');
      sfx('fire');
      // step west (or any free direction)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
        if (!w.blocked(p.x + dx, p.y + dy)) { G.game.walkTo(p.x + dx, p.y + dy); break; }
      }
      p.faceTile(fire.x, fire.y);
      return false;
    }
    return 2;
  }, 2);
}

// ------------------------------------------------------------ cooking
export function cook(o, itemId) {
  const p = G.player;
  let id = itemId;
  if (!id) id = p.inv.find((s) => s && COOKING[s.id])?.id;
  if (!id || !COOKING[id]) { msg('You have nothing to cook.'); return; }
  const c = COOKING[id];
  if (p.lvl('cooking') < c.lvl) { msg(`You need a Cooking level of ${c.lvl} to cook this.`); return; }
  const range = o.type === 'range';
  p.faceTile(o.x, o.y);
  startAction(() => {
    if (o.removed || !p.has(id)) return false;
    p.remove(id, 1);
    const lvl = p.lvl('cooking');
    const burn = lvl >= c.stop ? 0 : clamp(0.55 * (1 - (lvl - c.lvl) / (c.stop - c.lvl)) - (range ? 0.08 : 0), 0, 0.65);
    sfx('cook');
    if (Math.random() < burn) {
      p.add(c.burnt);
      msg(`You accidentally burn the ${ITEMS[c.out].name.toLowerCase()}.`);
    } else {
      p.add(c.out);
      p.tally('made', c.out);
      p.addXp('cooking', c.xp);
      msg(`You successfully cook ${aOrAn(ITEMS[c.out].name.toLowerCase())}.`);
    }
    return p.has(id) ? 3 : false;
  }, 2);
}

// ------------------------------------------------------------ smithing
export function smelt(bar) {
  const p = G.player;
  const r = SMELTING.find((s) => s.bar === bar);
  const can = () => Object.entries(r.ores).every(([o, n]) => p.count(o) >= n);
  if (p.lvl('smithing') < r.lvl) { msg(`You need a Smithing level of ${r.lvl} to smelt this.`); return; }
  if (!can()) { msg(`You don't have the ores to make ${aOrAn(ITEMS[bar].name.toLowerCase())}.`); return; }
  startAction(() => {
    if (!can()) return false;
    for (const [o, n] of Object.entries(r.ores)) p.remove(o, n);
    sfx('smelt');
    if (r.fail && p.equip.ring?.id !== 'ring_of_forging' && Math.random() < r.fail * clamp(1 - (p.lvl('smithing') - 15) / 45, 0.2, 1)) { msg('The ore is too impure and you fail to refine it.'); return 3; }
    p.add(bar);
    p.addXp('smithing', r.xp);
    msg(`You retrieve a bar of ${ITEMS[bar].name.replace(' bar', '').toLowerCase()}.`);
    return 3;
  }, 2);
}

export function smith(itemId, amount) {
  const p = G.player;
  const it = ITEMS[itemId], s = it.smith;
  if (!p.has('hammer')) { msg('You need a hammer to work the metal with.'); return; }
  if (p.lvl('smithing') < s.lvl) { msg(`You need a Smithing level of ${s.lvl} to make ${aOrAn(it.name.toLowerCase())}.`); return; }
  let made = 0;
  const xpPer = SMELTING.find((r) => r.bar === s.bar).smithXp;
  startAction(() => {
    if (made >= amount || p.count(s.bar) < s.bars) { if (made === 0) msg(`You don't have enough bars to make ${aOrAn(it.name.toLowerCase())}.`); return false; }
    p.remove(s.bar, s.bars);
    p.add(itemId, s.qty || 1);
    p.tally('made', itemId, s.qty || 1);
    p.addXp('smithing', xpPer * s.bars);
    sfx('anvil');
    msg(`You hammer the ${ITEMS[s.bar].name.replace(' bar', '').toLowerCase()} and make ${s.qty > 1 ? s.qty + ' ' + it.name.toLowerCase() : aOrAn(it.name.toLowerCase())}.`);
    made++;
    return made < amount && p.count(s.bar) >= s.bars ? 5 : false;
  }, 3);
}

// ------------------------------------------------------------ crafting
export function cutGem(uncutId) {
  const p = G.player;
  const gem = Object.values(ITEMS).find((i) => i.cut && i.cut.from === uncutId);
  if (!gem) return;
  if (p.lvl('crafting') < gem.cut.lvl) { msg(`You need a Crafting level of ${gem.cut.lvl} to cut that gem.`); return; }
  startAction(() => {
    if (!p.has(uncutId)) return false;
    p.remove(uncutId, 1); p.add(gem.id); p.addXp('crafting', gem.cut.xp);
    sfx('chisel');
    msg(`You cut the ${gem.name.toLowerCase()}.`);
    return p.has(uncutId) ? 2 : false;
  }, 1);
}

export function craftJewellery(out, amount = 28) {
  const p = G.player;
  const r = JEWELLERY.find((j) => j.out === out);
  if (p.lvl('crafting') < r.lvl) { msg(`You need a Crafting level of ${r.lvl} to make that.`); return; }
  if (!p.has(r.mould)) { msg(`You need ${aOrAn(ITEMS[r.mould].name.toLowerCase())} to make that.`); return; }
  let made = 0;
  startAction(() => {
    if (made >= amount || !p.has('gold_bar') || (r.gem && !p.has(r.gem))) return false;
    p.remove('gold_bar', 1); if (r.gem) p.remove(r.gem, 1);
    p.add(out); p.addXp('crafting', r.xp); made++;
    sfx('smelt');
    msg(`You make ${aOrAn(ITEMS[out].name.toLowerCase())}.`);
    return 3;
  }, 2);
}

// ------------------------------------------------------------ thieving
const STALLS = {
  bakery: { lvl: 5, xp: 16, loot: [{ w: 60, id: 'bread' }, { w: 30, id: 'cake' }, { w: 10, id: 'stew' }], respawn: 4 },
  silk: { lvl: 20, xp: 24, loot: [{ w: 1, id: 'silk' }], respawn: 8 },
  fur: { lvl: 35, xp: 36, loot: [{ w: 1, id: 'fur' }], respawn: 14 },
  silver: { lvl: 50, xp: 54, loot: [{ w: 70, id: 'silver_ore' }, { w: 30, id: 'silver_bar' }], respawn: 20 },
  spice: { lvl: 65, xp: 81, loot: [{ w: 1, id: 'spice' }], respawn: 30 },
  gem: { lvl: 75, xp: 160, loot: [{ w: 60, id: 'uncut_sapphire' }, { w: 25, id: 'uncut_emerald' }, { w: 11, id: 'uncut_ruby' }, { w: 4, id: 'uncut_diamond' }], respawn: 30 },
};
export function stealStall(o) {
  const p = G.player;
  const st = STALLS[OBJECTS[o.type].stall];
  if (p.lvl('thieving') < st.lvl) { msg(`You need a Thieving level of ${st.lvl} to steal from this stall.`); return; }
  if (o.depleted > G.tick) { msg('The stall is empty right now.'); return; }
  if (p.freeSlots() === 0) { msg('You don\'t have enough inventory space.'); return; }
  p.faceTile(o.x, o.y);
  p.playAnim('attack', 2, 'work');
  after(1, () => {
    // guards may notice
    const guard = G.npcs.find((n) => !n.dead && n.defId === 'guard' && n.distTo(p.x, p.y) <= 4);
    if (guard && Math.random() < 0.12) {
      guard.say('Hey! Get your hands off there!');
      guard.target = p;
      return;
    }
    const e = pickWeighted(st.loot);
    p.add(e.id); p.addXp('thieving', st.xp);
    msg(`You steal ${aOrAn(ITEMS[e.id].name.toLowerCase())}.`);
    sfx('pickup');
    skillPet(1 / 3000, 'rocky');
    o.depleted = G.tick + st.respawn;
  });
}

export function pickpocket(n) {
  const p = G.player;
  const pp = n.def.pickpocket;
  if (p.lvl('thieving') < pp.lvl) { msg(`You need a Thieving level of ${pp.lvl} to pickpocket the ${n.name.toLowerCase()}.`); return; }
  if (G.tick < p.stunnedUntil) { msg('You\'re stunned!'); return; }
  msg(`You attempt to pick the ${n.name.toLowerCase()}'s pocket.`);
  p.faceTile(n.x, n.y);
  p.playAnim('attack', 2, 'work');
  n.busyUntil = G.tick + 2;
  after(1, () => {
    const chance = clamp(0.55 + (p.lvl('thieving') - pp.lvl) * 0.018, 0.5, 0.95);
    if (Math.random() < chance) {
      for (const [id, a, b, ch = 1] of pp.loot) if (Math.random() < ch) p.add(id, randInt(a, b));
      p.addXp('thieving', pp.xp);
      msg(`You pick the ${n.name.toLowerCase()}'s pocket.`);
      sfx('coins');
      skillPet(1 / 3000, 'rocky');
      if (p.target && p.target.ref === n && p.target.option === 'Pickpocket') p.repeatPick = n;
    } else {
      msg(`You fail to pick the ${n.name.toLowerCase()}'s pocket.`);
      n.say('What do you think you\'re doing?');
      n.faceTile(p.x, p.y);
      p.stunnedUntil = G.tick + 4;
      p.path = [];
      G.effects.push({ kind: 'stun', follow: p, t: performance.now() });
      damagePlayer(randInt(1, pp.dmg + 1), null);
      msg('You have been stunned.');
    }
  });
}

// ------------------------------------------------------------ prayer
export function bury(slot) {
  const p = G.player;
  const s = p.inv[slot];
  if (!s || BONES[s.id] === undefined) return;
  if (G.tick < (p.buryCd || 0)) return;
  p.buryCd = G.tick + 2;
  p.removeSlot(slot, 1);
  p.playAnim('attack', 1, 'work');
  msg('You dig a hole in the ground...');
  sfx('bury');
  after(1, () => { msg('You bury the bones.'); p.addXp('prayer', BONES[s.id]); });
}
export function offerBones(itemId, o) {
  const p = G.player;
  const mult = o.type === 'chaos_altar' ? 3.5 : 2;
  startAction(() => {
    if (!p.has(itemId)) return false;
    p.remove(itemId, 1);
    p.addXp('prayer', BONES[itemId] * mult);
    G.effects.push({ kind: 'holy', x: o.x, y: o.y, t: performance.now() });
    sfx('bury');
    msg(o.type === 'chaos_altar' ? 'The Dark Lord is pleased with your offering.' : 'The gods are pleased with your offering.');
    return p.has(itemId) ? 3 : false;
  }, 1);
}
export function prayAt(o) {
  const p = G.player;
  const pr = p.skills.prayer;
  p.playAnim('attack', 2, 'work');
  if (pr.cur >= pr.lvl) { msg('You already have full prayer points.'); return; }
  pr.cur = pr.lvl;
  msg('You recharge your Prayer points.');
  sfx('holy');
  G.effects.push({ kind: 'holy', x: o.x, y: o.y, t: performance.now() });
  G.ui.dirty('orbs');
}

export { STALLS, FISH };

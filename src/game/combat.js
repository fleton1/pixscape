// Melee combat maths (OSRS-style accuracy/max hit), NPC attacks, boss mechanics, loot and death.
import { G, msg, sfx, after } from './state.js';
import { ITEMS } from '../data/items.js';
import { NPCS, RARE_TABLE, PETS } from '../data/npcs.js';
import { HERBS } from '../data/items.js';
import { pickWeighted, randInt, commas } from '../util.js';
import { spawnNpc } from './npc.js';
import { wildLevel } from './world_info.js';
import { touchingCardinal, withinRange } from './entity.js';
import { magicAttack, jewelleryOnHit } from './magic.js';
import { preventKill, onKill, helmBonus, gaze } from './slayer.js';

const STYLE_XP = { accurate: 'attack', aggressive: 'strength', defensive: 'defence' };

// The combat triangle: monsters can be weak (`weak: 'ranged'`) or resistant (`strong: 'ranged'`)
// to a style, which shifts their defence against it.
export function npcDefRoll(n, style) {
  const d = n.def;
  const bonus = (d.defBonus || 0) + (d.weak === style ? -30 : 0) + (d.strong === style ? 45 : 0);
  // monsters resist spells with their wits rather than their armour
  const lvl = style === 'magic' ? d.mdef ?? Math.round(d.def * 0.7) : d.def;
  return (lvl + 9) * ((style === 'magic' ? bonus / 2 : bonus) + 64);
}

// Can the player hit `n` from (x, y)? Melee needs to stand next to it, ranged needs range and sight.
export function canHitFrom(p, n, x, y, spell = null) {
  const reach = spell ? 10 : p.attackRange();
  if (reach <= 1) return touchingCardinal(x, y, n.x, n.y, n.size);
  if (!withinRange(x, y, n.x, n.y, n.size, reach)) return false;
  const tx = Math.max(n.x, Math.min(x, n.x + n.size - 1)), ty = Math.max(n.y, Math.min(y, n.y + n.size - 1));
  return G.world.sees(x, y, tx, ty);
}

export function playerRangedMaxHit(p) {
  const b = p.bonuses();
  const eff = Math.floor(p.cur('ranged') * p.prayerMult('rng')) + (p.rangedStyle === 'accurate' ? 3 : 0) + 8;
  return Math.floor(0.5 + (eff * (b.rstr + 64)) / 640);
}
function playerRangedRoll(p) {
  const b = p.bonuses();
  const eff = Math.floor(p.cur('ranged') * p.prayerMult('rng')) + (p.rangedStyle === 'accurate' ? 3 : 0) + 8;
  return eff * (b.rng + 64);
}

// Fire at `n`. Uses up the arrow, bolt or dart; most can be picked up again where they land.
function playerRangedAttack(n) {
  const p = G.player, r = p.rangedWeapon();
  const slot = r.type === 'thrown' ? 'weapon' : 'ammo';
  const ammo = p.equip[slot];
  if (!ammo) { msg(r.type === 'crossbow' ? 'There are no bolts left in your quiver.' : 'There is no ammo left in your quiver.'); p.target = null; return; }
  if (!p.ammoFits()) { msg(r.type === 'crossbow' ? 'You can\'t use that ammo with your crossbow.' : 'You can\'t use that ammo with your bow.'); p.target = null; return; }
  const ammoId = ammo.id;
  if (--ammo.qty <= 0) { p.equip[slot] = null; p.lookDirty = true; }
  G.ui && (G.ui.dirty('equip'), G.ui.dirty('combat'));
  p.attackCd = p.attackSpeed();
  p.playAnim('attack', 2);
  p.faceTile(n.x + (n.size - 1) / 2, n.y + (n.size - 1) / 2);
  const dist = Math.max(Math.abs(n.x - p.x), Math.abs(n.y - p.y));
  const flight = 1 + Math.floor(dist / 4);
  projectile(p, n, ITEMS[ammoId].icon.color || '#c8c8c8', flight, r.type === 'thrown' ? 'dart' : 'arrow');
  sfx('miss');
  const bonus = helmBonus(n);
  const roll = () => { const mh = Math.floor(playerRangedMaxHit(p) * bonus); return Math.random() < hitChance(playerRangedRoll(p) * bonus, npcDefRoll(n, 'ranged')) ? randInt(Math.min(1, mh), mh) : 0; };
  let dmg = roll();
  // the shadowbow looses a second arrow when there is one to spare
  if (r.double && p.equip.ammo && p.equip.ammo.qty > 0) {
    if (--p.equip.ammo.qty <= 0) p.equip.ammo = null;
    projectile(p, n, ITEMS[ammoId].icon.color || '#c8c8c8', flight + 1, 'arrow');
    dmg += roll();
  }
  if (!n.target) { n.target = p; n.returning = false; if (n.attackCd <= 0) n.attackCd = 1 + flight; }
  after(flight, () => {
    if (Math.random() < 0.75) dropAmmo(ammoId, n.x + Math.floor(n.size / 2), n.y + Math.floor(n.size / 2));
    if (n.dead) return;
    const real = Math.min(dmg, n.hp);
    n.hp -= real;
    n.hitsplat(dmg, dmg > 0 ? 'hit' : 'block');
    if (dmg > 0) sfx('hit');
    if (real > 0) {
      if (p.rangedStyle === 'longrange') { p.addXp('ranged', real * 2); p.addXp('defence', real * 2); }
      else p.addXp('ranged', real * 4);
      p.addXp('hitpoints', real * 1.33);
    }
    n.lastHitTick = G.tick;
    if (n.hp <= 0) killNpc(n);
  });
}
function dropAmmo(id, x, y) {
  const g = G.groundItems.find((q) => q.id === id && q.x === x && q.y === y && !q.loot);
  if (g) { g.qty++; g.expire = G.tick + 300; } else G.game.dropGround(id, 1, x, y);
}

export function hitChance(att, def) {
  return att > def ? 1 - (def + 2) / (2 * (att + 1)) : att / (2 * (def + 1));
}

export function playerMaxHit(p) {
  const b = p.bonuses();
  const effStr = Math.floor(p.cur('strength') * p.prayerMult('str')) + (p.style === 'aggressive' ? 3 : 0) + 8;
  return Math.floor(0.5 + (effStr * (b.str + 64)) / 640);
}
export function playerAttRoll(p) {
  const b = p.bonuses();
  const eff = Math.floor(p.cur('attack') * p.prayerMult('att')) + (p.style === 'accurate' ? 3 : 0) + 8;
  return eff * (b.att + 64);
}
export function playerDefRoll(p) {
  const b = p.bonuses();
  const eff = Math.floor(p.cur('defence') * p.prayerMult('def')) + (p.style === 'defensive' ? 3 : 0) + 8;
  return eff * (b.def + 64);
}

export function playerAttack(n) {
  const p = G.player;
  if (p.castingSpell()) { magicAttack(n, p.autocast); return; }
  if (p.rangedWeapon()) { playerRangedAttack(n); return; }
  p.attackCd = p.attackSpeed();
  p.playAnim('attack', 2);
  p.faceTile(n.x + (n.size - 1) / 2, n.y + (n.size - 1) / 2);
  const bonus = helmBonus(n);
  const hit = Math.random() < hitChance(playerAttRoll(p) * bonus, npcDefRoll(n, 'melee'));
  const mh = Math.floor(playerMaxHit(p) * bonus);
  const dmg = hit ? randInt(Math.min(1, mh), mh) : 0;
  const real = Math.min(dmg, n.hp);
  n.hp -= real;
  n.hitsplat(dmg, dmg > 0 ? 'hit' : 'block');
  sfx(dmg > 0 ? 'hit' : 'miss');
  if (real > 0) {
    p.addXp(STYLE_XP[p.style], real * 4);
    p.addXp('hitpoints', real * 1.33);
  }
  n.lastHitTick = G.tick;
  if (n.hp <= 0) { killNpc(n); return; }
  if (!n.target) { n.target = p; n.returning = false; if (n.attackCd <= 0) n.attackCd = 1; }
}

// Venomous monsters (npcs.js `poison: n`) sometimes poison: n damage every 30 ticks, weakening over time.
export function tryPoison(strength) {
  const p = G.player;
  if (p.poison || G.tick < (p.poisonImmune || 0) || Math.random() > 0.25) return;
  p.poison = { dmg: strength, hits: 0, next: G.tick + 30 };
  msg('You have been poisoned!', '#008000');
  G.ui && G.ui.dirty('orbs');
}
export function tickPoison() {
  const p = G.player, ps = p.poison;
  if (!ps || p.dead || G.tick < ps.next) return;
  damagePlayer(Math.min(ps.dmg, p.hp), null, 'poison');
  ps.next = G.tick + 30;
  if (++ps.hits % 4 === 0) ps.dmg--;
  if (ps.dmg <= 0) { p.poison = null; msg('The poison has worn off.'); G.ui && G.ui.dirty('orbs'); }
}

export function damagePlayer(dmg, src, kind = 'hit') {
  const p = G.player;
  if (p.dead) return;
  dmg = Math.max(0, Math.min(dmg, p.hp));
  p.hp -= dmg;
  p.hitsplat(dmg, dmg > 0 ? kind : 'block');
  if (src) { p.lastHitBy = src; p.lastHitTick = G.tick; }
  if (dmg > 0) sfx('hurt');
  jewelleryOnHit(dmg, src);
  if (p.hp > 0 && p.hp < p.maxHp / 10 && p.prayers.has('redemption')) {
    const pr = p.skills.prayer;
    p.hp += Math.floor(pr.lvl / 4);
    pr.cur = 0; p.prayers.clear();
    msg('Your Redemption prayer heals you!', '#0000ff'); sfx('prayoff');
    G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() });
    G.ui && G.ui.dirty('prayer');
  }
  G.ui && G.ui.dirty('orbs');
  // auto retaliate
  if (src && G.settings.autoRetaliate && !p.target && !p.path.length && !p.action && !G.ui?.dialogueOpen()) {
    p.target = { kind: 'npc', ref: src, option: 'Attack' };
  }
  if (p.hp <= 0) killPlayer();
}

function npcRoll(n) {
  const d = n.def;
  const att = (d.att + 9) * ((d.attBonus || 0) + 64);
  return Math.random() < hitChance(att, playerDefRoll(G.player));
}
function npcDmg(n) {
  return npcRoll(n) ? randInt(1, n.def.maxHit) : 0;
}

export function npcAttack(n) {
  const p = G.player;
  const d = n.def;
  n.attackCount++;
  n.playAnim('attack', 2);
  // dragonfire
  if (d.dragonfire && (d.mech === 'fire' ? n.attackCount % 3 === 0 || !touchingCardinal(p.x, p.y, n.x, n.y, n.size) : Math.random() < 0.25)) {
    dragonfire(n, d.dragonfire);
    return;
  }
  if (d.mech === 'swarm' && n.attackCount % 3 === 0) {
    projectile(n, p, '#2a6a7a', 2, 'swarm');
    after(1, () => {
      if (p.dead) return;
      let dmg = randInt(4, 14);
      if (p.protecting('range')) dmg = 0;
      n.say('Skree-kkt!');
      damagePlayer(dmg, n);
    });
    return;
  }
  const style = d.style || 'melee';
  if (style === 'range') {
    projectile(n, p, d.arrowColor || '#b0703a', 2, 'arrow');
    after(1, () => {
      if (p.dead) return;
      const dmg = npcDmg(n);
      damagePlayer(p.protecting('range') ? 0 : dmg, n);
    });
    return;
  }
  if (style === 'magic') {
    projectile(n, p, '#8a3ae8', 2, 'bolt');
    after(1, () => {
      if (p.dead) return;
      const dmg = npcDmg(n);
      damagePlayer(p.protecting('magic') ? 0 : dmg, n);
    });
    return;
  }
  let dmg = npcDmg(n);
  if (p.protecting('melee')) dmg = n.boss ? Math.floor(dmg * 0.25) : 0;
  sfx(dmg ? 'hit' : 'miss');
  damagePlayer(dmg, n);
  if (d.poison && dmg > 0) tryPoison(d.poison);
  gaze(n);
}

function dragonfire(n, max) {
  const p = G.player;
  projectile(n, p, '#f08a24', 2, 'fire');
  sfx('fire');
  after(1, () => {
    if (p.dead) return;
    let cap = max;
    const shield = p.hasAntifire() || G.tick < (p.antifireUntil || 0), prot = p.protecting('magic');
    if (shield && prot) cap = 2; else if (shield) cap = Math.ceil(max * 0.16); else if (prot) cap = Math.ceil(max * 0.3);
    const dmg = randInt(0, cap);
    if (!shield && !prot) msg('You are badly burnt by the dragonfire!', '#ef1020');
    else if (!shield) msg('You manage to resist some of the dragonfire.');
    else msg('Your shield absorbs most of the dragon\'s fiery breath!');
    damagePlayer(dmg, n, 'fire');
  });
}

export function projectile(from, to, color, ticks, kind) {
  G.projectiles.push({ fx: from.x + ((from.size || 1) - 1) / 2, fy: from.y + ((from.size || 1) - 1) / 2, target: to, color, t0: performance.now(), dur: ticks * 600 * 0.9, kind });
}

// Boss behaviour that runs every tick while engaged.
export function bossTick(n) {
  const p = G.player;
  const pct = n.hp / n.maxHp;
  n.phase = n.phase || 0;
  switch (n.defId) {
    case 'goblin_warlord':
      if (pct < 0.5 && n.phase === 0) {
        n.phase = 1; n.say('LADS! TO ME!');
        for (let i = 0; i < 2; i++) summon('goblin_warrior', n);
      }
      break;
    case 'scarab_king':
      if ((pct < 0.66 && n.phase === 0) || (pct < 0.33 && n.phase === 1)) {
        n.phase++; n.say('Rise, my children!');
        for (let i = 0; i < 2; i++) summon('scarab_swarm', n);
      }
      break;
    case 'emberwing':
      if (G.tick % 12 === 0) {
        n.say('*Emberwing rears back and roars*');
        const tiles = [[p.x, p.y]];
        for (let i = 0; i < 6; i++) tiles.push([p.x + randInt(-2, 2), p.y + randInt(-2, 2)]);
        G.telegraphs.push({ tiles, at: G.tick + 3, dmg: [12, 24], color: '#f08a24', kind: 'fire', src: n, t0: performance.now() });
      }
      if (pct < 0.3 && n.phase === 0) { n.phase = 1; n.say('*Emberwing\'s scales glow white hot*'); n.def = { ...n.def, maxHit: 26, speed: 4 }; }
      break;
    case 'bone_tyrant':
      if (G.tick % 9 === 0) {
        n.say('KNEEL!');
        const tiles = [];
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) tiles.push([p.x + i, p.y + j]);
        G.telegraphs.push({ tiles, at: G.tick + 3, dmg: [18, 34], color: '#d8d0b0', kind: 'slam', src: n, t0: performance.now() });
      }
      if (pct < 0.5 && n.phase === 0) { n.phase = 1; n.say('Soldiers of bone, awaken!'); for (let i = 0; i < 3; i++) summon('skeleton', n); }
      break;
    default: if (n.def.mechs) runMechs(n, pct);
  }
}

// Data-driven boss mechanics (npcs.js `mechs`):
//   summon: at hp fractions, call `n` of `npc`      aoe: every N ticks, telegraphed tiles
//   enrage: below a fraction, hit harder and faster
function runMechs(n, pct) {
  const p = G.player;
  n.fired = n.fired || {};
  n.def.mechs.forEach((m, i) => {
    if (m.type === 'summon') {
      m.at.forEach((f, j) => {
        const k = `${i}.${j}`;
        if (pct < f && !n.fired[k]) { n.fired[k] = true; if (m.say) n.say(m.say); for (let c = 0; c < m.n; c++) summon(m.npc, n); }
      });
    } else if (m.type === 'aoe' && G.tick % m.every === 0) {
      if (m.say) n.say(m.say);
      const tiles = [[p.x, p.y]];
      if (m.pattern === 'square') { for (let j = -1; j <= 1; j++) for (let q = -1; q <= 1; q++) if (j || q) tiles.push([p.x + q, p.y + j]); }
      else for (let c = 0; c < m.n; c++) tiles.push([p.x + randInt(-2, 2), p.y + randInt(-2, 2)]);
      G.telegraphs.push({ tiles, at: G.tick + 3, dmg: m.dmg, color: m.color, kind: m.kind || 'slam', src: n, t0: performance.now() });
    } else if (m.type === 'enrage' && pct < m.at && !n.fired['e' + i]) {
      n.fired['e' + i] = true;
      if (m.say) n.say(m.say);
      n.def = { ...n.def, maxHit: m.maxHit ?? n.def.maxHit, speed: m.speed ?? n.def.speed };
    }
  });
}

function summon(id, n) {
  for (let tries = 0; tries < 20; tries++) {
    const x = n.x + randInt(-3, 3 + n.size), y = n.y + randInt(-3, 3 + n.size);
    if (G.world.blocked(x, y) || n.occupies(x, y)) continue;
    const s = spawnNpc(id, { x, y, wander: 3, temp: true });
    s.target = G.player;
    G.effects.push({ kind: 'poof', x, y, t: performance.now() });
    return s;
  }
}

export function tickTelegraphs() {
  const p = G.player;
  G.telegraphs = G.telegraphs.filter((t) => {
    if (G.tick < t.at) return true;
    G.effects.push({ kind: t.kind === 'fire' ? 'explode' : 'slam', tiles: t.tiles, t: performance.now() });
    sfx(t.kind === 'fire' ? 'fire' : 'slam');
    if (!p.dead && t.tiles.some(([x, y]) => x === p.x && y === p.y)) damagePlayer(randInt(t.dmg[0], t.dmg[1]), t.src, t.kind === 'fire' ? 'fire' : 'hit');
    return false;
  });
}

// ------------------------------------------------------------------ death & loot
export function killNpc(n) {
  const p = G.player;
  if (n.dead || preventKill(n)) return;
  n.dead = true;
  n.target = null;
  n.respawnAt = G.tick + (n.def.respawn || 20);
  G.effects.push({ kind: 'death', npc: n, t: performance.now() });
  sfx('death');
  if (p.target && p.target.ref === n) p.target = null;
  p.stats.kills[n.defId] = (p.stats.kills[n.defId] || 0) + 1;
  if (n.boss) msg(`Your ${n.name} kill count is: ${p.stats.kills[n.defId]}.`, '#ef1020');
  const cx = n.x + Math.floor((n.size - 1) / 2), cy = n.y + Math.floor((n.size - 1) / 2);
  after(1, () => dropLoot(n, cx, cy));
  if (n.temp) after(2, () => { const i = G.npcs.indexOf(n); if (i >= 0) G.npcs.splice(i, 1); G.npcById.delete(n.id); });
  onKill(n);
  G.game.onNpcKilled && G.game.onNpcKilled(n);
}

const NO_HERBS = new Set(['cow', 'chicken', 'sheep', 'rat', 'bat', 'crab', 'golem', 'slime', 'swarm', 'wolf', 'bear', 'monkey']);
export function herbFor(lvl) {
  const ok = HERBS.filter((h, i) => i < 3 || h.lvl <= lvl + 10);
  return 'grimy_' + pickWeighted(ok.map((h) => ({ w: 100 / (1 + h.lvl / 8), id: h.id }))).id;
}
function dropLoot(n, x, y) {
  const d = n.def.drops || {};
  if (n.temp && n.defId !== 'goblin_warrior') return;
  const drop = (id, qty = 1) => G.game.dropGround(id, qty, x, y, { loot: true });
  for (const [id, q] of d.always || []) drop(id, q);
  if (d.main && d.main.length) {
    const e = pickWeighted(d.main);
    if (e.item) drop(e.item, randInt(e.qty[0], e.qty[1]));
  }
  if (d.rare && Math.random() < d.rare) {
    const e = pickWeighted(RARE_TABLE);
    drop(e.item, e.qty ? randInt(e.qty[0], e.qty[1]) : 1);
  }
  for (const u of d.uniques || []) if (Math.random() < u.chance) drop(u.item, 1);
  for (const [id, a, b, ch] of d.extra || []) if (Math.random() < ch) drop(id, randInt(a, b));
  // herbs: most monsters carry them, better herbs from tougher monsters
  const lvl = n.def.lvl || 0;
  if (lvl >= 5 && d.herbs !== 0 && !NO_HERBS.has(n.def.look?.kind) && Math.random() < (d.herbs ?? (n.boss ? 0.5 : 0.06))) drop(herbFor(lvl), 1);
  const p = G.player;
  if (d.clue && Math.random() < d.clue && !p.hasAnywhere('clue_scroll') && !G.groundItems.some((g) => g.id === 'clue_scroll')) drop('clue_scroll', 1);
  if (d.pet && Math.random() < d.pet.chance) givePet(d.pet.id);
  G.game.questDrops && G.game.questDrops(n, drop);
}

export function givePet(id) {
  const p = G.player;
  if (p.collection['pet_' + id]) { msg('You have a funny feeling like you would have been followed...', '#ef1020'); return; }
  p.collection['pet_' + id] = 1;
  if (!p.pet) {
    p.pet = id;
    msg('You have a funny feeling like you\'re being followed.', '#ef1020');
  } else msg(`You feel something weird sneaking into your backpack... your ${PETS[id].name} has been sent to your pet house.`, '#ef1020');
  G.ui && G.ui.announce(`<span style="color:#ff981f">${PETS[id].name}</span> has joined you!`, 'pet');
  sfx('rare');
  G.game.spawnPet && G.game.spawnPet();
}

export function killPlayer() {
  const p = G.player;
  if (p.dead) return;
  p.dead = true;
  p.path = []; p.target = null; p.action = null;
  p.prayers.clear();
  msg('Oh dear, you are dead!', '#ef1020');
  sfx('dead');
  G.effects.push({ kind: 'playerdeath', t: performance.now() });
  const wl = wildLevel(p.x, p.y);
  const dx = p.x, dy = p.y;
  const keepN = p.prayers.has('protect_item') ? 4 : 3;
  for (const n of G.npcs) if (n.target === p) { n.target = null; n.returning = true; }
  after(4, () => {
    if (wl > 0) {
      // Wilderness rules: keep the 3 most valuable items, the rest stays behind.
      const all = [];
      p.inv.forEach((s, i) => s && all.push({ where: 'inv', i, id: s.id, qty: s.qty }));
      for (const [slot, e] of Object.entries(p.equip)) if (e) all.push({ where: 'equip', slot, id: e.id, qty: e.qty });
      all.sort((a, b) => (ITEMS[b.id].stack ? 0 : ITEMS[b.id].value) - (ITEMS[a.id].stack ? 0 : ITEMS[a.id].value));
      const keep = all.filter((e) => !ITEMS[e.id].stack).slice(0, keepN);
      let lostVal = 0;
      for (const e of all) {
        if (keep.includes(e)) continue;
        if (e.where === 'inv') p.inv[e.i] = null; else p.equip[e.slot] = null;
        G.game.dropGround(e.id, e.qty, dx, dy, { owner: true, life: 3000 });
        lostVal += ITEMS[e.id].value * e.qty;
      }
      if (lostVal) msg(`Your items (${commas(lostVal)} coins worth) lie where you fell in the Wilderness. Hurry back!`, '#ef1020');
      p.lookDirty = true;
    }
    for (const s of Object.keys(p.skills)) p.skills[s].cur = p.skills[s].lvl;
    p.runEnergy = 100;
    p.dead = false;
    const [sx, sy] = G.game.home();
    if (G.world !== G.overworld) G.game.enterMap('main');
    p.teleport(sx, sy);
    if (G.pet) G.pet.teleport(sx, sy);
    p.stats.deaths++;
    msg(wl > 0 ? 'You have been returned to Brindlewood.' : 'You wake up in Brindlewood, your belongings safe. Death is kind outside the Wilderness.', '#0000ff');
    G.ui && (G.ui.dirty('inv'), G.ui.dirty('equip'), G.ui.dirty('orbs'), G.ui.dirty('skills'));
  });
}

export function npcLevelColor(lvl) {
  const d = G.player.combatLevel() - lvl;
  if (d >= 10) return '#00ff00';
  if (d >= 7) return '#40ff00';
  if (d >= 4) return '#80ff00';
  if (d >= 1) return '#c0ff00';
  if (d === 0) return '#ffff00';
  if (d >= -3) return '#ff8000';
  if (d >= -6) return '#ff6000';
  if (d >= -9) return '#ff3000';
  return '#ff0000';
}

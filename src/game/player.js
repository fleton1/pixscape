// The player: skills, inventory, equipment, bank, quest progress.
import { Mover } from './entity.js';
import { G, msg, sfx } from './state.js';
import { SKILLS, SKILL_NAMES, PRAYERS } from '../data/skills.js';
import { ITEMS, SLOTS } from '../data/items.js';
import { levelForXp, xpForLevel } from '../util.js';

export const INV_SIZE = 28;

export class Player extends Mover {
  constructor(x, y) {
    super(x, y);
    this.name = 'Adventurer';
    this.skills = {};
    for (const s of SKILLS) this.skills[s] = { xp: 0, lvl: 1, cur: 1 };
    this.skills.hitpoints = { xp: xpForLevel(10), lvl: 10, cur: 10 };
    this.inv = new Array(INV_SIZE).fill(null);
    this.equip = {};
    for (const s of SLOTS) this.equip[s] = null;
    this.bank = [];
    this.path = [];
    this.running = true;
    this.runEnergy = 100;
    this.style = 'accurate';
    this.prayers = new Set();
    this.prayerDrain = 0;
    this.target = null;       // {kind, ref, option}
    this.action = null;       // repeating skilling action
    this.attackCd = 0;
    this.stunnedUntil = 0;
    this.quests = {};
    this.questPoints = 0;
    this.collection = {};
    this.pet = null;
    this.clue = null;
    this.lastHitBy = null;
    this.lastHitTick = -100;
    this.dead = false;
    this.flags = {};
    this.look = { kind: 'human', skin: '#e0b088', hair: '#6a4020', hairStyle: 'short', shirt: '#5a7a2a', pants: '#5a4a32', shoes: '#3a2a1a' };
    this.stats = { kills: {}, deaths: 0, totalXpGained: 0, playTicks: 0 };
  }

  // ---------------- skills
  lvl(s) { return this.skills[s].lvl; }
  cur(s) { return this.skills[s].cur; }
  get hp() { return this.skills.hitpoints.cur; }
  set hp(v) { this.skills.hitpoints.cur = Math.max(0, Math.min(v, this.skills.hitpoints.lvl + 30)); }
  get maxHp() { return this.skills.hitpoints.lvl; }
  get prayerPts() { return this.skills.prayer.cur; }
  totalLevel() { return SKILLS.reduce((a, s) => a + this.skills[s].lvl, 0); }
  totalXp() { return SKILLS.reduce((a, s) => a + this.skills[s].xp, 0); }
  combatLevel() {
    const s = this.skills;
    const base = 0.25 * (s.defence.lvl + s.hitpoints.lvl + Math.floor(s.prayer.lvl / 2));
    const melee = 0.325 * (s.attack.lvl + s.strength.lvl);
    return Math.floor(base + melee);
  }
  addXp(skill, amount, raw = false) {
    const rate = raw ? 1 : G.settings.xpRate || 1;
    const gain = amount * rate;
    const sk = this.skills[skill];
    const before = sk.lvl;
    sk.xp = Math.min(200000000, sk.xp + gain);
    this.stats.totalXpGained += gain;
    sk.lvl = levelForXp(sk.xp);
    G.ui && G.ui.xpDrop(skill, gain);
    if (sk.lvl > before) {
      const d = sk.lvl - before;
      sk.cur += d;
      G.ui && G.ui.levelUp(skill, sk.lvl);
      sfx('levelup');
      G.effects.push({ kind: 'fireworks', x: this.x, y: this.y, t: performance.now(), follow: this });
      if (sk.lvl === 99) msg(`Wow! You have reached the maximum level in ${SKILL_NAMES[skill]}!`, '#ef1020');
    }
    G.ui && G.ui.dirty('skills');
  }

  // ---------------- inventory
  freeSlots() { return this.inv.filter((s) => !s).length; }
  count(id) {
    let n = 0;
    for (const s of this.inv) if (s && s.id === id) n += s.qty;
    return n;
  }
  has(id, n = 1) { return this.count(id) >= n; }
  hasEquipped(id) { return Object.values(this.equip).some((e) => e && e.id === id); }
  hasAnywhere(id) { return this.has(id) || this.hasEquipped(id) || this.bank.some((b) => b.id === id); }
  canAdd(id, qty = 1) {
    if (ITEMS[id].stack) return this.inv.some((s) => s && s.id === id) || this.freeSlots() > 0;
    return this.freeSlots() >= qty;
  }
  // returns quantity that didn't fit
  add(id, qty = 1) {
    const it = ITEMS[id];
    if (!it) { console.warn('no item', id); return qty; }
    let left = qty;
    if (it.stack) {
      const s = this.inv.find((x) => x && x.id === id);
      if (s) { s.qty += left; left = 0; }
      else { const i = this.inv.indexOf(null); if (i >= 0) { this.inv[i] = { id, qty: left }; left = 0; } }
    } else {
      while (left > 0) {
        const i = this.inv.indexOf(null);
        if (i < 0) break;
        this.inv[i] = { id, qty: 1 }; left--;
      }
    }
    if (it.rare || it.clue) this.logCollection(id);
    G.ui && G.ui.dirty('inv');
    return left;
  }
  // add or drop to floor
  give(id, qty = 1) {
    const left = this.add(id, qty);
    if (left > 0) {
      G.game.dropGround(id, left, this.x, this.y);
      msg('Your inventory is too full, so it falls to the floor.', '#ef1020');
    }
  }
  remove(id, qty = 1) {
    let left = qty;
    for (let i = 0; i < this.inv.length && left > 0; i++) {
      const s = this.inv[i];
      if (!s || s.id !== id) continue;
      const take = Math.min(s.qty, left);
      s.qty -= take; left -= take;
      if (s.qty <= 0) this.inv[i] = null;
    }
    G.ui && G.ui.dirty('inv');
    return qty - left;
  }
  removeSlot(i, qty = Infinity) {
    const s = this.inv[i];
    if (!s) return null;
    const take = Math.min(qty, s.qty);
    s.qty -= take;
    if (s.qty <= 0) this.inv[i] = null;
    G.ui && G.ui.dirty('inv');
    return { id: s.id, qty: take };
  }
  logCollection(id) {
    const first = !this.collection[id];
    this.collection[id] = (this.collection[id] || 0) + 1;
    if (first && ITEMS[id]?.rare) msg(`New item added to your collection log: ${ITEMS[id].name}`, '#ef1020');
  }

  // ---------------- equipment
  bonuses() {
    const b = { att: 0, str: 0, def: 0, prayer: 0 };
    for (const s of SLOTS) {
      const e = this.equip[s];
      if (!e) continue;
      const eq = ITEMS[e.id].equip;
      b.att += eq.att || 0; b.str += eq.str || 0; b.def += eq.def || 0; b.prayer += eq.prayer || 0;
    }
    return b;
  }
  weapon() { return this.equip.weapon ? ITEMS[this.equip.weapon.id] : null; }
  attackSpeed() { const w = this.weapon(); return w ? w.equip.speed || 4 : 4; }
  hasAntifire() { const s = this.equip.shield; return s && ITEMS[s.id].equip.antifire; }
  prayerMult(stat) {
    let m = 1;
    for (const id of this.prayers) { const p = PRAYERS.find((x) => x.id === id); if (p && p[stat]) m = Math.max(m, 1 + p[stat]); }
    return m;
  }
  protecting(style) {
    for (const id of this.prayers) { const p = PRAYERS.find((x) => x.id === id); if (p && p.protect === style) return true; }
    return false;
  }
  canEquip(id) {
    const eq = ITEMS[id].equip;
    if (!eq) return 'You can\'t wear that.';
    for (const [sk, lv] of Object.entries(eq.req || {})) if (this.lvl(sk) < lv) return `You need a ${SKILL_NAMES[sk]} level of ${lv} to wear this.`;
    if (eq.quest && (this.quests[eq.quest] || 0) < 100) return 'You need to complete Dragon\'s Bane to wear this.';
    return null;
  }
  equipFromSlot(i) {
    const s = this.inv[i];
    if (!s) return;
    const it = ITEMS[s.id];
    const err = this.canEquip(s.id);
    if (err) { msg(err); return; }
    const slot = it.equip.slot;
    const toRemove = [];
    if (it.equip.twoHanded && this.equip.shield) toRemove.push('shield');
    if (slot === 'shield' && this.equip.weapon && ITEMS[this.equip.weapon.id].equip.twoHanded) toRemove.push('weapon');
    const needed = toRemove.length - 1;
    if (needed > this.freeSlots()) { msg('You don\'t have enough free inventory space to do that.'); return; }
    this.inv[i] = null;
    const old = this.equip[slot];
    this.equip[slot] = { id: s.id, qty: s.qty };
    if (old) this.inv[i] = old;
    for (const r of toRemove) { const o = this.equip[r]; this.equip[r] = null; this.add(o.id, o.qty); }
    sfx('equip');
    this.lookDirty = true;
    G.ui && (G.ui.dirty('inv'), G.ui.dirty('equip'), G.ui.dirty('combat'));
    if (slot === 'weapon') this.attackCd = Math.max(this.attackCd, 1);
  }
  unequip(slot) {
    const e = this.equip[slot];
    if (!e) return;
    if (!this.canAdd(e.id, 1)) { msg('You don\'t have enough free inventory space to do that.'); return; }
    this.equip[slot] = null;
    this.add(e.id, e.qty);
    this.lookDirty = true;
    sfx('equip');
    G.ui && (G.ui.dirty('equip'), G.ui.dirty('combat'));
  }
  // Appearance with equipment applied.
  appearance() {
    const L = { ...this.look };
    const e = this.equip;
    const lk = (slot) => (e[slot] ? ITEMS[e[slot].id].equip.look : null);
    if (e.head) { const l = lk('head'); if (['fullhelm', 'medhelm', 'coif'].includes(l.kind)) L.helm = l; else L.hat = l; }
    if (e.body) { const l = lk('body'); if (l.kind === 'shirt') L.shirt = l.color; else L.body = l; }
    if (e.legs) { const l = lk('legs'); if (l.kind === 'pants') L.pants = l.color; else L.legs = l; }
    if (e.cape) L.cape = lk('cape');
    if (e.weapon) L.weapon = lk('weapon');
    if (e.shield) L.shield = lk('shield');
    if (e.feet) L.shoes = lk('feet').color;
    if (e.hands) L.gloves = lk('hands').color;
    if (e.neck) L.neck = lk('neck').color;
    return L;
  }
  appearanceKey() {
    return JSON.stringify([this.look, Object.values(this.equip).map((x) => x && x.id)]);
  }

  // ---------------- quests
  stage(q) { return this.quests[q] || 0; }
  setStage(q, s) { this.quests[q] = s; G.ui && G.ui.dirty('quests'); }
}

// The Vesper Exchange: Broker Casimir trades almost anything at a market price. Prices drift over
// real time, and your own trading pushes them: buy a lot and the price climbs, sell a lot and it sinks.
import { G, msg, sfx } from './state.js';
import { ITEMS, SMELTING, COOKING, FIREMAKING, POTIONS, METALS, HERBS } from '../data/items.js';
import { NPCS } from '../data/npcs.js';
import { OBJECTS } from '../data/objects.js';
import { RECIPES } from '../data/recipes.js';
import { SHOPS } from '../data/skills.js';
import { CROPS } from '../data/farming.js';
import { hash2 } from '../util.js';

const HOUR = 3600e3;
let buyable = null;

// Everything that enters the world by ordinary means: shops, common drops, gathering and making.
// Quest items, rewards, rare uniques and clue items are never for sale.
function buildBuyable() {
  const set = new Set();
  const addId = (id) => { if (Array.isArray(id)) id = id[0]; if (typeof id === 'string' && ITEMS[id]) set.add(id); };
  for (const [k, s] of Object.entries(SHOPS)) if (k !== 'traveller') for (const [id] of s.items || []) addId(id);
  for (const d of Object.values(NPCS)) {
    for (const [id] of d.drops?.always || []) addId(id);
    for (const e of d.drops?.main || []) addId(e.item);
  }
  for (const o of Object.values(OBJECTS)) { if (o.mine) addId(o.mine.ore); if (o.wc) addId(o.wc.log); }
  for (const [raw, c] of Object.entries(COOKING)) { addId(raw); addId(c.out); }
  for (const id of Object.keys(FIREMAKING)) addId(id);
  for (const s of SMELTING) addId(s.bar);
  for (const r of RECIPES) addId(r.out);
  for (const id of Object.keys(POTIONS)) addId(id);
  for (const h of HERBS) { addId('grimy_' + h.id); addId(h.id); addId(h.id + '_potion_unf'); }
  for (const c of Object.values(CROPS)) { addId(c.seed); addId(c.produce); }
  const metal = new RegExp(`^(${Object.keys(METALS).filter((m) => m !== 'dragon').join('|')})_`);
  for (const [id, it] of Object.entries(ITEMS)) if (metal.test(id) && it.equip) set.add(id);
  for (const id of [...set]) {
    const it = ITEMS[id];
    if (id === 'coins' || it.quest || it.rare || it.clue || it.graceful || it.value < 1 || /_diary_|lamp|frost_root|supply_crate/.test(id)) set.delete(id);
  }
  return set;
}
export const canBuy = (id) => (buyable ||= buildBuyable()).has(id);
export const canSell = (id) => id !== 'coins' && ITEMS[id] && ITEMS[id].value > 0 && !ITEMS[id].quest;

// Pressure from your own trading, which eases back to nothing over a few hours.
function pressure(id) {
  const m = (G.player.flags.market ||= {});
  const e = m[id];
  if (!e) return 0;
  const ease = Math.pow(0.5, (Date.now() - e.t) / (2 * HOUR));
  return e.v * ease;
}
function push(id, dv) {
  const m = (G.player.flags.market ||= {});
  m[id] = { v: Math.max(-0.35, Math.min(0.35, pressure(id) + dv)), t: Date.now() };
}

// Market multiplier: two slow waves per item (hours and days), plus pressure.
export function marketMult(id) {
  const t = Date.now() / HOUR;
  const a = hash2(id.length, id.charCodeAt(0) + id.charCodeAt(id.length - 1) * 7, 3) * Math.PI * 2;
  const wave = 0.1 * Math.sin(t / 5 + a) + 0.06 * Math.sin(t / 37 + a * 3);
  return Math.max(0.5, 1 + wave + pressure(id));
}
export const exBuyPrice = (id) => Math.max(1, Math.round(ITEMS[id].value * marketMult(id) * 1.03));
export const exSellPrice = (id) => Math.max(1, Math.floor(ITEMS[id].value * marketMult(id) * 0.9));
export function trend(id) {
  const now = marketMult(id), t = Date.now() / HOUR;
  const a = hash2(id.length, id.charCodeAt(0) + id.charCodeAt(id.length - 1) * 7, 3) * Math.PI * 2;
  const d = Math.cos(t / 5 + a) * 0.02 + Math.cos(t / 37 + a * 3) * 0.0016;
  return d > 0.004 ? 'up' : d < -0.004 ? 'down' : 'flat';
}

export function exBuy(id, qty) {
  const p = G.player;
  if (!canBuy(id)) { msg('The broker has none of those to sell.'); return 0; }
  let n = 0;
  for (; n < qty; n++) {
    const price = exBuyPrice(id);
    if (!p.has('coins', price)) { if (!n) msg("You don't have enough coins."); break; }
    if (!p.canAdd(id)) { if (!n) msg("You don't have enough inventory space."); break; }
    p.remove('coins', price); p.add(id, 1);
    push(id, 0.004);
  }
  if (n) { sfx('coins'); msg(`You buy ${n} x ${ITEMS[id].name} on the Exchange.`); }
  return n;
}

export function exSell(id, qty) {
  const p = G.player;
  if (!canSell(id)) { msg('The broker won\'t trade that.'); return 0; }
  let n = 0;
  for (; n < qty && p.has(id); n++) {
    const price = exSellPrice(id);
    p.remove(id, 1); p.add('coins', price);
    push(id, -0.004);
  }
  if (n) { sfx('coins'); msg(`You sell ${n} x ${ITEMS[id].name} on the Exchange.`); }
  return n;
}

export function exchangeList(filter) {
  const f = filter.trim().toLowerCase();
  const held = [...new Set(G.player.inv.filter(Boolean).map((s) => s.id))].filter(canSell);
  if (!f) return held;
  buyable ||= buildBuyable();
  const hits = [...new Set([...held, ...buyable])].filter((id) => ITEMS[id].name.toLowerCase().includes(f));
  return hits.sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name)).slice(0, 40);
}

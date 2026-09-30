// World events: every so often something happens somewhere in the world, for a limited time.
import { G, msg, sfx } from './state.js';
import { ITEMS } from '../data/items.js';
import { SHOPS } from '../data/skills.js';
import { spawnNpc, removeNpc } from './npc.js';
import { randInt, pickWeighted } from '../util.js';

const MIN = 100; // ticks per minute
const mins = (t) => { const m = Math.max(1, Math.round(t / MIN)); return `${m} minute${m > 1 ? 's' : ''}`; };
const STAR_SPOTS = [[222, 136], [268, 150], [300, 196], [192, 108], [150, 176], [60, 200], [470, 230], [280, 340], [340, 120], [240, 190]];
const TRAVELLER_STOCK = ['lamp', 'dragon_arrowtips', 'mystic_gloves', 'mystic_boots', 'yew_seed', 'magic_seed', 'grimy_torchbloom', 'grimy_snapdrake', 'super_combat', 'antifire_potion', 'uncut_dragonstone', 'graceful_boots', 'blue_partyhat', 'crown', 'red_beret', 'ranger_boots', 'amulet_of_glory_4', 'ring_of_life'];

export const events = {
  next: 0, active: null,
  describe() {
    const a = this.active;
    if (!a) return `No event right now. The next one is in about ${mins(this.next - G.tick)}.`;
    return `${a.text} (${mins(a.ends - G.tick)} left)`;
  },
  tick() {
    if (!this.next) this.next = G.tick + randInt(8, 15) * MIN;
    if (this.active && G.tick >= this.active.ends) this.end();
    if (!this.active && G.tick >= this.next) this.start(pickWeighted([{ w: 4, k: 'star' }, { w: 3, k: 'raid' }, { w: 3, k: 'merchant' }]).k);
  },
  start(kind) {
    const w = G.overworld;
    const announce = (text, where) => {
      msg(`<span style="color:#ef1020">World event:</span> ${text}`);
      G.ui && G.ui.announce(where, 'drop');
      sfx('quest');
    };
    if (kind === 'star') {
      for (let tries = 0; tries < 20; tries++) {
        const [cx, cy] = STAR_SPOTS[randInt(0, STAR_SPOTS.length - 1)];
        const x = cx + randInt(-4, 4), y = cy + randInt(-4, 4);
        if (w.blocked(x, y) || w.obj(x, y) || w.blocked(x + 1, y + 1)) continue;
        const o = w.addObject('fallen_star', x, y, { dust: randInt(60, 120) });
        if (!o) continue;
        const where = placeHint(x, y);
        this.active = { kind, o, ends: G.tick + 12 * MIN, text: `A shooting star has landed ${where}.` };
        announce(`A shooting star has crashed ${where}! Bring a pickaxe.`, 'A shooting star falls!');
        return;
      }
    } else if (kind === 'raid') {
      const spawned = [];
      for (let i = 0; i < 8; i++) {
        const x = 176 + randInt(-6, 6), y = 140 + randInt(-5, 5);
        if (w.blocked(x, y)) continue;
        spawned.push(spawnNpc(i % 3 === 2 ? 'goblin_archer' : 'goblin_warrior', { x, y, wander: 4, temp: true, event: true }, w));
      }
      this.active = { kind, npcs: spawned, ends: G.tick + 10 * MIN, text: 'Goblins are raiding Hilda\'s farm.' };
      announce('Goblins are raiding Hilda\'s farm! Drive them off for a reward.', 'Goblin raid!');
    } else if (kind === 'merchant') {
      const stock = [...TRAVELLER_STOCK].sort(() => Math.random() - 0.5).slice(0, 6).map((id) => [id, randInt(1, 3)]);
      SHOPS.traveller = { name: 'Zeph the Wanderer', items: stock, markup: 2.5 };
      if (G.ui) G.ui.shopStock.traveller = undefined;
      const n = spawnNpc('traveller', { x: 207, y: 166, wander: 2, shop: 'traveller', temp: true }, w);
      this.active = { kind, npcs: [n], ends: G.tick + 10 * MIN, text: 'A travelling merchant is visiting Brindlewood.' };
      announce('A travelling merchant has arrived by the Brindlewood fountain, with rare goods for a short while.', 'A merchant arrives!');
    }
    if (!this.active) this.next = G.tick + 2 * MIN;
  },
  end() {
    const a = this.active;
    if (a.o && !a.o.removed) G.overworld.removeObject(a.o);
    for (const n of a.npcs || []) if (!n.dead) removeNpc(n, G.overworld);
    msg(a.kind === 'star' ? 'The shooting star has crumbled away.' : a.kind === 'raid' ? 'The goblin raid is over.' : 'The travelling merchant has moved on.');
    this.active = null;
    this.next = G.tick + randInt(15, 30) * MIN;
  },
};

function placeHint(x, y) {
  const w = G.overworld;
  let best = null, bd = 1e9;
  for (const a of w.areas) {
    const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2, d = Math.hypot(cx - x, cy - y);
    if (d < bd) { bd = d; best = a; }
  }
  if (!best) return 'somewhere';
  if (bd < 12) return `in ${best.name}`;
  const ang = Math.atan2(y - (best.y0 + best.y1) / 2, x - (best.x0 + best.x1) / 2);
  const dir = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
  return `${dir} of ${best.name}`;
}

// Mining a fallen star: stardust, and a star sprite's thanks when it's gone.
export function mineStar(o) {
  const p = G.player;
  if (![...p.inv, p.equip.weapon].some((s) => s && ITEMS[s.id].tool?.type === 'pick')) { msg('You need a pickaxe to mine the star.'); return false; }
  if (o.dust <= 0) return false;
  o.dust--;
  p.add('stardust', 1);
  p.addXp('mining', 12 + p.lvl('mining') * 0.6);
  if (o.dust <= 0) {
    G.overworld.removeObject(o);
    const coins = 500 + p.lvl('mining') * 40;
    p.give('coins', coins); p.give('cosmic_rune', 20); p.give(['uncut_sapphire', 'uncut_emerald', 'uncut_ruby', 'uncut_diamond'][randInt(0, 3)]);
    msg(`The star crumbles, and a star sprite thanks you with ${coins} coins, cosmic runes and a gem.`, '#0000aa');
    G.player.logEvent('Mined a shooting star to the core');
    if (events.active && events.active.o === o) events.end();
    return false;
  }
  return true;
}

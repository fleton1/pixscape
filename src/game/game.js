// Game loop: ticks, player movement, targets, ground items, travel, saving.
import { G, msg, sfx, after, TICK_MS } from './state.js';
import { Player } from './player.js';
import { spawnNpc, tickNpc } from './npc.js';
import { Mover, touchingCardinal, rectDist } from './entity.js';
import { playerAttack, tickTelegraphs, canHitFrom, tickPoison } from './combat.js';
import { gracefulPieces } from './agility.js';
import { slayerCheck } from './slayer.js';
import { questVisit } from './questengine.js';
import { tickTraps } from './farming.js';
import { magicAttack } from './magic.js';
import { tickAction } from './skilling.js';
import { findPath } from '../world/path.js';
import { ITEMS } from '../data/items.js';
import { OBJECTS } from '../data/objects.js';
import { PRAYERS, TRAVEL } from '../data/skills.js';
import { SKILLS } from '../data/skills.js';
import { wildLevel, placeName, musicAt, areaAt, underground } from './world_info.js';
import { questDrops, questMine } from './quests.js';
import { performNpc, performObj, pickupItem } from './actions.js';
import { commas, cheb } from '../util.js';

const SAVE_KEY = 'pixscape_save_v1';
const SAVE_VERSION = 2;

export const game = {
  init(worlds) {
    G.worlds = worlds;
    G.overworld = worlds.get('main');
    G.world = G.overworld;
    const [sx, sy] = G.overworld.points.spawn;
    G.player = new Player(sx, sy);
    for (const w of worlds.values()) for (const s of w.spawns) spawnNpc(s.npc, s, w);
    G.dynObjs = [];
    const loaded = this.load();
    if (!loaded) this.newGame();
    this.spawnPet();
    this.lastArea = null;
    this.lastWild = 0;
  },

  resetPlayer() {
    G.world = G.overworld;
    const [sx, sy] = G.overworld.points.spawn;
    G.player = new Player(sx, sy);
    G.groundItems = [];
    this.newGame();
    this.spawnPet();
  },

  newGame() {
    const p = G.player;
    for (const [id, q] of [['bronze_axe', 1], ['bronze_pickaxe', 1], ['small_net', 1], ['tinderbox', 1], ['bread', 2], ['coins', 25]]) p.add(id, q);
    p.equip.weapon = { id: 'bronze_scimitar', qty: 1 };
    p.equip.shield = { id: 'wooden_shield', qty: 1 };
    p.fresh = true;
  },

  // ------------------------------------------------------------ ticking
  tick() {
    G.tick++;
    G.lastTickAt = performance.now();
    const p = G.player;
    const now = G.lastTickAt;
    p.stats.playTicks++;
    let ranSteps = 0;
    if (!p.dead) {
      if (p.attackCd > 0) p.attackCd--;
      if (G.tick >= p.stunnedUntil) {
        this.processTarget(true);
        ranSteps = this.stepPlayer(now);
        this.processTarget(false);
      }
      if (!p.path.length) tickAction();
      if (p.repeatPick) { const n = p.repeatPick; p.repeatPick = null; }
    }
    // pet follows
    if (G.pet) {
      const pe = G.pet;
      const d = cheb(pe.x, pe.y, p.x, p.y);
      if (d > 12) pe.teleport(p.x, p.y + 1);
      else if (d > 1) {
        const dx = Math.sign(p.x - pe.x), dy = Math.sign(p.y - pe.y);
        const tries = [[dx, dy], [dx, 0], [0, dy]];
        for (const [a, b] of tries) {
          if ((a || b) && !G.world.blocked(pe.x + a, pe.y + b) && !(pe.x + a === p.x && pe.y + b === p.y)) { pe.x += a; pe.y += b; pe.moved([[pe.x, pe.y]], now); break; }
        }
        if (d > 2 && Math.random() < 0.5) {
          const [a, b] = [Math.sign(p.x - pe.x), Math.sign(p.y - pe.y)];
          if (!G.world.blocked(pe.x + a, pe.y + b) && !(pe.x + a === p.x && pe.y + b === p.y)) { pe.x += a; pe.y += b; pe.moved([[pe.x - a, pe.y - b], [pe.x, pe.y]], now); }
        }
      }
    }
    // npcs near the player (far ones are frozen for performance)
    for (const n of G.npcs) {
      if (Math.abs(n.x - p.x) > 40 || Math.abs(n.y - p.y) > 32) { if (n.dead && G.tick >= n.respawnAt) tickNpc(n); continue; }
      tickNpc(n);
    }
    tickTelegraphs();
    // timers
    if (G.timers.length) {
      const due = G.timers.filter((t) => t.at <= G.tick);
      G.timers = G.timers.filter((t) => t.at > G.tick);
      for (const t of due) t.fn();
    }
    this.tickStats(ranSteps);
    this.tickWorld();
    this.checkArea();
    if (G.tick % 50 === 0) this.save();
    G.ui && G.ui.dirty('orbs');
  },

  tickStats(ranSteps) {
    const p = G.player;
    if (p.dead) return;
    const hpS = p.skills.hitpoints;
    const rapid = p.prayers.has('rapid_heal');
    if (G.tick % (rapid ? 8 : 16) === 0 && hpS.cur < hpS.lvl) { hpS.cur++; }
    if (G.tick % 50 === 0) {
      for (const s of SKILLS) {
        if (s === 'hitpoints' || s === 'prayer') continue;
        const k = p.skills[s];
        if (k.cur > k.lvl) { if (!p.prayers.has('preserve') || G.tick % 100 === 0) k.cur--; } else if (k.cur < k.lvl) k.cur++;
      }
      if (hpS.cur > hpS.lvl) hpS.cur--;
      G.ui && G.ui.dirty('skills');
    }
    // prayer drain
    if (p.prayers.size) {
      let rate = 0;
      for (const id of p.prayers) rate += PRAYERS.find((x) => x.id === id).drain;
      const bonus = p.bonuses().prayer;
      p.prayerDrain += rate / (1 + bonus / 30);
      while (p.prayerDrain >= 1) {
        p.prayerDrain -= 1;
        p.skills.prayer.cur = Math.max(0, p.skills.prayer.cur - 1);
      }
      if (p.skills.prayer.cur <= 0) {
        p.prayers.clear(); msg('You have run out of Prayer points, you can recharge at an altar.'); sfx('prayoff');
        G.ui && G.ui.dirty('prayer');
      }
    }
    // run energy
    tickPoison();
    const grace = gracefulPieces(p);
    if (ranSteps >= 2) p.runEnergy = Math.max(0, p.runEnergy - 0.55 * (1 - 0.04 * grace));
    else p.runEnergy = Math.min(100, p.runEnergy + (p.path.length ? 0.3 : 0.55) * (1 + p.lvl('agility') / 100) * (grace === 6 ? 1.3 : 1));
    if (p.runEnergy <= 0 && p.running) { p.running = false; }
  },

  tickWorld() {
    const w = G.world;
    tickTraps();
    // fires burn out
    for (const o of w.objects) {
      if (o.type === 'fire' && !o.removed && o.expires && G.tick >= o.expires) {
        w.removeObject(o);
        this.dropGround('ashes', 1, o.x, o.y);
      }
    }
    // ground items
    G.groundItems = G.groundItems.filter((g) => G.tick < g.expire);
    for (const s of w.itemSpawns) {
      const present = G.groundItems.some((g) => g.spawn === s);
      if (present) continue;
      if (!s.nextAt) s.nextAt = G.tick + s.respawn;
      if (G.tick >= s.nextAt) { s.nextAt = 0; this.dropGround(s.item, 1, s.x, s.y, { spawn: s, life: 1e9 }); }
    }
  },

  checkArea() {
    const p = G.player;
    const name = placeName(p.x, p.y);
    if (name !== this.lastArea) {
      if (this.lastArea !== null) G.ui && G.ui.areaBanner(name);
      if (this.lastArea === undefined) this.lastArea = null;
      this.lastArea = name;
      G.audio && G.audio.setTrack(musicAt(p.x, p.y));
      questVisit(G.world.id, name);
      (p.flags.visited ||= {})[G.world.id] = true;
      (p.flags.areas ||= {})[name] = true;
    }
    const wl = wildLevel(p.x, p.y);
    if (wl && !this.lastWild) {
      msg('You have entered the Wilderness. Monsters here are aggressive, and if you die you will lose all but your 3 most valuable items.', '#ef1020');
      sfx('warning');
    }
    if (wl !== this.lastWild) { this.lastWild = wl; G.ui && G.ui.dirty('wild'); }
  },

  // ------------------------------------------------------------ movement
  stepPlayer(now) {
    const p = G.player;
    if (!p.path.length) return 0;
    const steps = p.running && p.runEnergy > 0 && p.path.length > 1 ? 2 : 1;
    const pts = [];
    for (let i = 0; i < steps && p.path.length; i++) {
      const [nx, ny] = p.path[0];
      if (!G.world.canStep(p.x, p.y, nx, ny)) {
        const last = p.path[p.path.length - 1];
        const r = findPath(G.world, p.x, p.y, (x, y) => x === last[0] && y === last[1], last[0], last[1]);
        p.path = r.path;
        break;
      }
      p.path.shift();
      p.x = nx; p.y = ny;
      pts.push([nx, ny]);
    }
    if (pts.length) p.moved(pts, now);
    return pts.length;
  },

  walkTo(x, y) {
    const p = G.player;
    p.target = null; p.action = null; p.toolLook = null;
    G.ui && G.ui.closeInterfaces();
    const r = findPath(G.world, p.x, p.y, (a, b) => a === x && b === y, x, y);
    p.path = r.path;
    return r.reached;
  },

  setTarget(kind, ref, option, extra = {}) {
    const p = G.player;
    p.action = null; p.toolLook = null;
    G.ui && G.ui.closeInterfaces();
    p.target = { kind, ref, option, pathFor: null, ...extra };
    this.pathToTarget(true);
    // perform immediately if already there
    this.processTarget(false);
  },

  goalFor(t) {
    const p = G.player;
    if (t.kind === 'npc') {
      const n = t.ref;
      if (t.option === 'Attack' || t.option === 'Cast') return (x, y) => canHitFrom(p, n, x, y, t.spell);
      return (x, y) => { const [dx, dy] = rectDist(x, y, n.x, n.y, n.size); return Math.max(dx, dy) === 1; };
    }
    if (t.kind === 'obj') {
      const o = t.ref;
      if (OBJECTS[o.type].door) return (x, y) => { const dx = Math.abs(x - o.x), dy = Math.abs(y - o.y); return dx + dy <= 1; };
      if (!OBJECTS[o.type].blocks) return (x, y) => cheb(x, y, o.x, o.y) <= 1;
      return (x, y) => { const dx = Math.max(o.x - x, 0, x - (o.x + o.w - 1)), dy = Math.max(o.y - y, 0, y - (o.y + o.h - 1)); return Math.max(dx, dy) === 1; };
    }
    if (t.kind === 'item') {
      const g = t.ref;
      if (G.world.blocked(g.x, g.y)) return (x, y) => cheb(x, y, g.x, g.y) === 1;
      return (x, y) => x === g.x && y === g.y;
    }
    return () => false;
  },

  pathToTarget(force) {
    const p = G.player, t = p.target;
    if (!t) return;
    const goal = this.goalFor(t);
    const ref = t.ref;
    const tx = ref.x, ty = ref.y;
    const key = `${tx},${ty}`;
    if (!force && t.pathFor === key) return;
    t.pathFor = key;
    if (goal(p.x, p.y)) { p.path = []; return; }
    const r = findPath(G.world, p.x, p.y, goal, tx, ty);
    p.path = r.path;
    t.unreachable = !r.reached;
  },

  processTarget(before) {
    const p = G.player, t = p.target;
    if (!t) return;
    if (t.kind === 'npc') {
      const n = t.ref;
      if (n.dead || !G.npcById.has(n.id)) { p.target = null; return; }
      if (t.option === 'Attack' || t.option === 'Cast') {
        if (canHitFrom(p, n, p.x, p.y, t.spell)) {
          p.path = [];
          p.faceTile(n.x + (n.size - 1) / 2, n.y + (n.size - 1) / 2);
          if (!slayerCheck(n)) { p.target = null; return; }
          // a single cast, then stop (autocast keeps going through Attack)
          if (p.attackCd <= 0) { if (t.option === 'Cast') { magicAttack(n, t.spell); p.target = null; } else playerAttack(n); }
        } else if (before) this.pathToTarget(false);
        else if (!p.path.length && t.unreachable) { p.target = null; msg('I can\'t reach that!'); }
        return;
      }
      const [dx, dy] = rectDist(p.x, p.y, n.x, n.y, n.size);
      const d = Math.max(dx, dy);
      if ((d === 1 || (d === 2 && !p.path.length)) && !before) {
        p.path = []; p.target = null;
        p.faceTile(n.x, n.y); n.faceTile(p.x, p.y);
        performNpc(n, t.option);
      } else if (before) this.pathToTarget(false);
      else if (!p.path.length) { p.target = null; if (d > 2) msg('I can\'t reach that!'); }
      return;
    }
    if (before) return;
    if (t.kind === 'obj') {
      const o = t.ref;
      if (o.removed) { p.target = null; return; }
      if (this.goalFor(t)(p.x, p.y)) {
        p.path = []; p.target = null;
        p.faceTile(o.x + (o.w - 1) / 2, o.y + (o.h - 1) / 2);
        performObj(o, t.option, t.useItem);
      } else if (!p.path.length) { p.target = null; msg('I can\'t reach that!'); }
      return;
    }
    if (t.kind === 'item') {
      const g = t.ref;
      if (!G.groundItems.includes(g)) { p.target = null; return; }
      if (this.goalFor(t)(p.x, p.y)) { p.target = null; p.path = []; pickupItem(g); }
      else if (!p.path.length) { p.target = null; msg('I can\'t reach that!'); }
    }
  },

  // ------------------------------------------------------------ ground items
  dropGround(id, qty, x, y, opts = {}) {
    const it = ITEMS[id];
    const g = { id, qty, x, y, expire: G.tick + (opts.life || 300), t: performance.now(), ...opts };
    const valuable = opts.loot && (it.rare || it.value * qty >= 8000);
    if (valuable) {
      g.beam = it.rare ? '#ff4ad8' : it.value * qty >= 50000 ? '#ff981f' : '#ffd84a';
      msg(`<span style="color:#ef1020">Valuable drop: ${qty > 1 ? commas(qty) + ' x ' : ''}${it.name} (${commas(it.value * qty)} coins)</span>`);
      sfx('rare');
      if (it.rare) G.ui && G.ui.announce(`Rare drop: <span style="color:#ff981f">${it.name}</span>!`, 'drop');
      if (it.rare) G.player.logCollection(id);
    }
    if (id === 'clue_scroll' && opts.loot) { g.beam = '#e8d8a8'; msg('A clue scroll has dropped!', '#ef1020'); }
    G.groundItems.push(g);
    return g;
  },
  removeGround(g) { const i = G.groundItems.indexOf(g); if (i >= 0) G.groundItems.splice(i, 1); },

  // ------------------------------------------------------------ travel
  // Move the player, optionally to another map ('main' is the overworld).
  teleport(x, y, text, anim = true, map = null) {
    const p = G.player;
    p.path = []; p.target = null; p.action = null;
    const go = () => {
      if (map && map !== G.world.id) this.enterMap(map);
      // settle on a walkable tile
      for (let r = 0; r < 4; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        if (!G.world.blocked(x + i, y + j)) { p.teleport(x + i, y + j); if (G.pet) G.pet.teleport(x + i, y + j); r = 9; j = 9; i = 9; }
      }
      if (text) msg(text);
      this.checkArea();
    };
    if (anim && G.ui) G.ui.fade(go); else go();
  },
  enterMap(id) {
    const w = G.worlds.get(id);
    if (!w) throw new Error('No map ' + id);
    G.world = w;
    G.projectiles.length = 0; G.effects.length = 0; G.telegraphs.length = 0;
    G.hoverTile = null;
    for (const n of w.npcs) if (n.target) { n.target = null; n.returning = true; }
    G.renderer && G.renderer.mapChanged();
    G.minimap && G.minimap.mapChanged();
    this.lastArea = undefined;
  },
  home() { return G.overworld.points.spawn; },
  // Radius of the light around the player in dark maps. Pitch-black areas need a light source.
  playerLight() {
    const p = G.player, a = areaAt(p.x, p.y);
    if (!a || !a.pitch) return 6.5;
    return p.lightSource() ? 5.5 : 1.6;
  },
  sail(dest) {
    const d = G.world.docks[dest];
    if (!d) return;
    sfx('sail');
    this.teleport(d[0] + (dest === 'elderglen' ? -1 : dest === 'selby' ? 1 : 0), d[1], `You board the ship and sail to ${{ selby: 'Port Selby', elderglen: 'Elderglen', palmera: 'Palmera', cinderhold: 'Cinderhold' }[dest]}.`);
  },
  async travelMenu(d, here) {
    const p = G.player;
    const opts = TRAVEL[here];
    const c = await d.options([...opts.map(([n]) => `${n} (30 coins)`), 'No thanks.']);
    if (c >= opts.length) return;
    if (!p.has('coins', 30)) { await d.npc('Sorry, friend. No coin, no voyage.'); return; }
    p.remove('coins', 30);
    d.end();
    this.sail(opts[c][1]);
  },
  homeTeleport() {
    const p = G.player;
    if (p.dead) return;
    if (wildLevel(p.x, p.y) > 20) { msg('A mysterious force blocks your teleport spell! You can\'t teleport above level 20 Wilderness.'); return; }
    if (G.tick - p.lastHitTick < 8) { msg('You can\'t do that while in combat.'); return; }
    p.path = []; p.target = null;
    msg('You begin casting Home Teleport...');
    sfx('teleport');
    let n = 0;
    p.action = {
      next: G.tick + 1, anim: false,
      fn: () => {
        G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() });
        if (++n < 6) return 1;
        const [x, y] = this.home();
        this.teleport(x, y, 'You teleport home to Brindlewood.', false, 'main');
        G.effects.push({ kind: 'sparkle', follow: p, t: performance.now() });
        return false;
      },
    };
  },

  spawnPet() {
    const p = G.player;
    if (!p.pet) { G.pet = null; return; }
    G.pet = new Mover(p.x, p.y + 1);
    G.pet.petId = p.pet;
  },
  questDrops(n, drop) { questDrops(n, drop); },
  questMine(o) { questMine(o); },
  onNpcKilled(n) {},

  // ------------------------------------------------------------ persistence
  save() {
    const p = G.player;
    if (!p || p.dead) return;
    const data = {
      v: SAVE_VERSION,
      p: {
        map: G.world.id, x: p.x, y: p.y, name: p.name, skills: p.skills, inv: p.inv, equip: p.equip, bank: p.bank, quests: p.quests, qp: p.questPoints,
        collection: p.collection, pet: p.pet, clue: p.clue, flags: p.flags, stats: p.stats, style: p.style, rstyle: p.rangedStyle, autocast: p.autocast, slayer: p.slayer, spts: p.slayerPoints, running: p.running, runEnergy: p.runEnergy, look: p.look,
      },
      settings: G.settings,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  },
  load() {
    let data;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { data = null; }
    if (!data || !data.p) return false;
    migrateSave(data);
    const p = G.player, d = data.p;
    Object.assign(G.settings, data.settings || {});
    const w = G.worlds.get(d.map) || G.overworld;
    G.world = w;
    p.teleport(d.x, d.y);
    if (w.blocked(d.x, d.y)) p.teleport(...(w.points.arrive || w.points.spawn));
    p.name = d.name || p.name;
    for (const s of SKILLS) if (d.skills?.[s]) p.skills[s] = d.skills[s];
    const item = (s) => (s && ITEMS[s.id] ? s : null);
    p.inv = (d.inv || []).map(item);
    while (p.inv.length < 28) p.inv.push(null);
    for (const k of Object.keys(p.equip)) p.equip[k] = item(d.equip?.[k]);
    p.bank = (d.bank || []).filter(item);
    p.quests = d.quests || {}; p.questPoints = d.qp || 0; p.collection = d.collection || {}; p.pet = d.pet || null; p.clue = d.clue || null;
    p.flags = d.flags || {}; p.stats = { ...p.stats, ...(d.stats || {}) }; p.style = d.style || 'accurate'; p.rangedStyle = d.rstyle || 'accurate'; p.autocast = d.autocast || null; p.slayer = d.slayer || null; p.slayerPoints = d.spts || 0; p.running = d.running ?? true; p.runEnergy = d.runEnergy ?? 100;
    if (d.look) p.look = d.look;
    return true;
  },
  saveText() { try { return localStorage.getItem(SAVE_KEY) || ''; } catch (e) { return ''; } },
  // Replace the save with an exported one. Returns an error message, or null on success.
  importSave(text) {
    let data;
    try { data = JSON.parse(String(text).trim()); } catch (e) { return 'That doesn\'t look like a PixScape save.'; }
    if (!data || !data.p || !data.p.skills) return 'That doesn\'t look like a PixScape save.';
    G.player.dead = true;   // stop the autosave from overwriting it before the reload
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { return 'Could not store the save.'; }
    return null;
  },
  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  },
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
};

// Bring an older save up to SAVE_VERSION.
export function migrateSave(data) {
  const d = data.p;
  if ((data.v || 1) < 2) {
    // v1 kept the dungeons in the overworld's north-west corner; they are separate maps now.
    d.map = 'main';
    if (d.x < 100 && d.y < 62) {
      if (d.x <= 52) d.map = 'catacombs';
      else { d.map = 'tomb'; d.x -= 54; }
    }
  }
  // Renamed items: old id -> new id.
  const rename = (s) => { if (s && ITEM_ALIASES[s.id]) s.id = ITEM_ALIASES[s.id]; return s; };
  (d.inv || []).forEach(rename); (d.bank || []).forEach(rename); Object.values(d.equip || {}).forEach(rename);
  data.v = SAVE_VERSION;
  return data;
}
const ITEM_ALIASES = {};

G.game = game;

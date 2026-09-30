// NPC instances and their per-tick AI.
import { Mover, touchingCardinal, withinRange, rectDist } from './entity.js';
import { G } from './state.js';
import { NPCS } from '../data/npcs.js';
import { npcAttack, bossTick } from './combat.js';
import { wildLevel } from './world_info.js';

let nextId = 1;

export class NPC extends Mover {
  constructor(defId, spawn) {
    super(spawn.x, spawn.y);
    this.id = nextId++;
    this.defId = defId;
    this.def = NPCS[defId];
    if (!this.def) throw new Error('No npc ' + defId);
    this.spawn = spawn;
    this.sx = spawn.x; this.sy = spawn.y;
    this.size = this.def.size || 1;
    this.maxHp = this.def.hp || 0;
    this.hp = this.maxHp;
    this.wander = spawn.wander ?? this.def.wander ?? 3;
    this.target = null;
    this.attackCd = 0;
    this.dead = false;
    this.respawnAt = 0;
    this.busyUntil = 0;
    this.attackCount = 0;
    this.temp = !!spawn.temp;
    this.facing = 'down';
  }
  get name() { return this.spawn.name || this.def.name; }
  get combat() { return !!this.def.hp; }
  get boss() { return !!this.def.boss; }
  occupies(x, y) { return x >= this.x && y >= this.y && x < this.x + this.size && y < this.y + this.size; }
  canStand(x, y) {
    const w = G.world, p = G.player;
    for (let j = 0; j < this.size; j++) for (let i = 0; i < this.size; i++) {
      if (w.blocked(x + i, y + j)) return false;
      if (p && !p.dead && p.x === x + i && p.y === y + j) return false;
    }
    return true;
  }
  tryStep(dx, dy) {
    if (!dx && !dy) return false;
    const nx = this.x + dx, ny = this.y + dy;
    if (!this.canStand(nx, ny)) return false;
    if (dx && dy && (!this.canStand(this.x + dx, this.y) || !this.canStand(this.x, this.y + dy))) return false;
    this.x = nx; this.y = ny;
    this.moved([[nx, ny]], performance.now());
    return true;
  }
  stepToward(tx, ty) {
    const sx = tx < this.x ? -1 : tx > this.x + this.size - 1 ? 1 : 0;
    const sy = ty < this.y ? -1 : ty > this.y + this.size - 1 ? 1 : 0;
    if (sx && sy) {
      const [dx, dy] = rectDist(tx, ty, this.x, this.y, this.size);
      if (dx === 1 && dy === 1) return this.tryStep(sx, 0) || this.tryStep(0, sy);
      return this.tryStep(sx, sy) || this.tryStep(sx, 0) || this.tryStep(0, sy);
    }
    return this.tryStep(sx, sy);
  }
  inAttackRange(p) {
    const style = this.def.style || 'melee';
    if (style === 'melee' && !this.def.reach) return touchingCardinal(p.x, p.y, this.x, this.y, this.size);
    return withinRange(p.x, p.y, this.x, this.y, this.size, this.def.range || 1);
  }
  distTo(x, y) { const [dx, dy] = rectDist(x, y, this.x, this.y, this.size); return Math.max(dx, dy); }
}

export function spawnNpc(defId, spawn, world = G.world) {
  const n = new NPC(defId, spawn);
  world.npcs.push(n);
  world.npcById.set(n.id, n);
  return n;
}

export function removeNpc(n, world = G.world) {
  const i = world.npcs.indexOf(n);
  if (i >= 0) world.npcs.splice(i, 1);
  world.npcById.delete(n.id);
}

export function tickNpc(n) {
  const p = G.player;
  if (n.dead) {
    if (!n.temp && G.tick >= n.respawnAt) {
      n.dead = false; n.hp = n.maxHp; n.teleport(n.sx, n.sy); n.target = null; n.attackCount = 0; n.phase = 0; n.fired = {}; n.def = NPCS[n.defId];
    }
    return;
  }
  if (n.attackCd > 0) n.attackCd--;
  if (G.tick < n.busyUntil) { if (G.player) n.faceTile(p.x, p.y); return; }
  if (n.target) {
    const leash = Math.max(n.wander + 10, 14);
    const far = Math.abs(n.x - n.sx) > leash || Math.abs(n.y - n.sy) > leash;
    if (p.dead || far || n.distTo(p.x, p.y) > 16) {
      n.target = null; n.returning = true;
    } else {
      if (n.boss) bossTick(n);
      if (n.inAttackRange(p)) {
        n.faceTile(p.x, p.y);
        if (n.attackCd <= 0) { npcAttack(n); n.attackCd = n.def.speed || 4; }
      } else {
        n.stepToward(p.x, p.y);
      }
      return;
    }
  }
  // aggression
  if (n.combat && n.def.aggressive && !p.dead && p.hp > 0) {
    const wl = wildLevel(p.x, p.y);
    const range = n.boss ? 6 : wl ? 5 : 3;
    const lvlOk = n.boss || wl > 0 || p.combatLevel() <= n.def.lvl * 2;
    const single = n.boss || G.world.multi || !p.lastHitBy || p.lastHitBy === n || G.tick - p.lastHitTick > 8;
    const d = n.distTo(p.x, p.y);
    if (d <= range && lvlOk && single && !p.flags.tolerant?.[n.id]) {
      n.target = p; n.returning = false;
      return;
    }
  }
  if (n.returning) {
    if (n.x === n.sx && n.y === n.sy) n.returning = false;
    else if (!n.stepToward(n.sx, n.sy)) { if (Math.random() < 0.1) { n.teleport(n.sx, n.sy); n.returning = false; } }
    if (n.boss && n.hp < n.maxHp && Math.random() < 0.3) n.hp = Math.min(n.maxHp, n.hp + 1);
    return;
  }
  if (n.wander > 0 && Math.random() < 0.13) {
    const dx = Math.floor(Math.random() * 3) - 1, dy = Math.floor(Math.random() * 3) - 1;
    const nx = n.x + dx, ny = n.y + dy;
    if (Math.abs(nx - n.sx) <= n.wander && Math.abs(ny - n.sy) <= n.wander) n.tryStep(dx, dy);
  }
  if (!n.combat && n.hp < n.maxHp) n.hp++;
}

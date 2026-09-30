// World renderer.
import { G, TICK_MS } from '../game/state.js';
import { TS, T, TINFO } from '../world/map.js';
import { bakeChunk, CH } from '../sprites/terrain.js';
import { OBJ_SPRITES } from '../sprites/objects.js';
import { buildSprite } from '../sprites/chars.js';
import { iconFor } from '../sprites/items.js';
import { OBJECTS } from '../data/objects.js';
import { ITEMS } from '../data/items.js';
import { PETS } from '../data/npcs.js';
import { hash2, clamp } from '../util.js';
import { BIOME } from '../world/gen.js';
import { biomeAt, wildLevel } from '../game/world_info.js';

const FLAT = new Set(['torch', 'banner_blue', 'banner_red', 'skulls', 'spinning_web', 'trapdoor', 'manhole', 'sand_pit', 'wheat', 'moonpetal', 'chair', 'stool', 'potato_plant', 'flax_plant']);
const LIGHTS = { heartwood: [3, '#ff7040'], lava_cave_entrance: [3.5, '#ff7030'], pottery_oven: [2.5, '#ff9040'], torch: [3.5, '#ffb050'], fire: [4, '#ffa040'], campfire: [4.5, '#ffa040'], fireplace: [3.5, '#ffa040'], candles: [2.5, '#ffd080'], crystal: [3, '#80d0ff'], obelisk: [3, '#c060ff'], lamp_post: [3.5, '#ffe0a0'], furnace: [3.5, '#ff9040'], portal: [3, '#c090ff'], moonpetal: [2, '#d0e8ff'], cauldron: [2, '#80ff80'], range: [2.5, '#ff9040'] };

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d');
    this.particles = [];
    this.clicks = [];
    this.shakeUntil = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    this.cv.width = window.innerWidth; this.cv.height = window.innerHeight;
    this.light.width = this.cv.width; this.light.height = this.cv.height;
    this.ctx.imageSmoothingEnabled = false;
  }
  get Z() { return G.settings.zoom; }

  // Baked ground chunks are cached on each map, so switching maps and back costs nothing.
  get chunks() { return G.world.chunks; }
  chunk(cx, cy, force) {
    const k = cy * 1000 + cx;
    let c = this.chunks.get(k);
    if (c) return c;
    if (!force && this.bakedThisFrame >= 1) return null;
    this.bakedThisFrame++;
    c = bakeChunk(G.world, cx, cy);
    this.chunks.set(k, c);
    return c;
  }
  invalidateTile(x, y) { this.chunks.delete(Math.floor(y / CH) * 1000 + Math.floor(x / CH)); }
  mapChanged() { this.warmed = false; this.particles.length = 0; this.clicks.length = 0; }

  // ------------------------------------------------------------- camera
  camera(now) {
    const p = G.player;
    const [rx, ry] = p.renderPos(now);
    const Z = this.Z;
    const vw = this.cv.width / Z, vh = this.cv.height / Z;
    const inset = G.ui ? G.ui.viewInsets() : { right: 0, bottom: 0 };
    let cx = rx * TS + TS / 2 - vw / 2 - inset.right / 2 / Z;
    let cy = ry * TS + TS / 2 - vh / 2 - inset.bottom / 2 / Z;
    if (now < this.shakeUntil) { cx += (Math.random() - 0.5) * 4; cy += (Math.random() - 0.5) * 4; }
    this.camX = Math.round(cx * Z) / Z; this.camY = Math.round(cy * Z) / Z;
    this.vw = vw; this.vh = vh;
  }
  toScreen(wx, wy) { return [(wx - this.camX) * this.Z, (wy - this.camY) * this.Z]; }
  toWorld(sx, sy) { return [sx / this.Z + this.camX, sy / this.Z + this.camY]; }

  // ------------------------------------------------------------- sprites
  entitySprite(e) {
    if (e === G.player) {
      const look = e.appearance();
      if (e.action && e.toolLook) look.weapon = e.toolLook, look.shield = null;
      const key = 'pl_' + JSON.stringify(look);
      return buildSprite(look, key);
    }
    if (e.petId) {
      const pd = PETS[e.petId];
      const look = pd.look.kind === 'human' ? { ...pd.look, tiny: true, short: false } : pd.look;
      return buildSprite(look, 'pet_' + e.petId);
    }
    return buildSprite(e.def.look, 'npc_' + e.defId);
  }
  frameOf(e, set, now) {
    let anim = 'idle', f = 0;
    if (now < e.animUntil && e.anim === 'attack') { anim = 'attack'; f = Math.max(0, Math.min(1, Math.floor((now - e.animStart) / (TICK_MS * 0.5)))); }
    else if (e.isMoving(now)) { anim = 'walk'; f = Math.floor(now / 140) % 4; }
    else { f = Math.floor((now + (e.id || 0) * 137) / 650) % 2; }
    const facing = set.humanoid ? e.facing : e.hface;
    return set.frames[facing][anim][f];
  }

  // ------------------------------------------------------------- main
  render(now) {
    const ctx = this.ctx, Z = this.Z, w = G.world;
    this.bakedThisFrame = 0;
    this.camera(now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(Z, 0, 0, Z, -this.camX * Z, -this.camY * Z);
    ctx.imageSmoothingEnabled = false;
    const tx0 = Math.max(0, Math.floor(this.camX / TS) - 1), ty0 = Math.max(0, Math.floor(this.camY / TS) - 1);
    const W = w.W, H = w.H;
    const tx1 = Math.min(W - 1, Math.ceil((this.camX + this.vw) / TS) + 1), ty1 = Math.min(H - 1, Math.ceil((this.camY + this.vh) / TS) + 3);
    this.view = { tx0, ty0, tx1, ty1 };
    // ground chunks
    const first = !this.warmed;
    for (let cy = Math.floor(ty0 / CH); cy <= Math.floor(ty1 / CH); cy++)
      for (let cx = Math.floor(tx0 / CH); cx <= Math.floor(tx1 / CH); cx++) {
        const c = this.chunk(cx, cy, first);
        if (c) ctx.drawImage(c, cx * CH * TS, cy * CH * TS);
      }
    this.warmed = true;
    // pre-bake one neighbouring chunk per frame when nothing else was baked
    if (this.bakedThisFrame === 0 && !this.idleBaking) {
      const cx0 = Math.floor(tx0 / CH) - 1, cx1 = Math.floor(tx1 / CH) + 1, cy0 = Math.floor(ty0 / CH) - 1, cy1 = Math.floor(ty1 / CH) + 1;
      outer: for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cy < 0 || cx * CH >= W || cy * CH >= H || this.chunks.has(cy * 1000 + cx)) continue;
        this.idleBaking = true;
        const bakeFor = G.world;
        const go = () => { this.idleBaking = false; if (G.world !== bakeFor) return; this.bakedThisFrame = 0; this.chunk(cx, cy, true); };
        if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 500 }); else setTimeout(go, 50);
        break outer;
      }
    }
    this.animatedGround(now, tx0, ty0, tx1, ty1);
    this.drawTelegraphs(now);
    // flat objects + collect sorted drawables
    const sorted = [];
    const seen = new Set();
    for (let ty = ty0; ty <= ty1 + 2 && ty < H; ty++)
      for (let tx = tx0 - 2; tx <= tx1 + 2; tx++) {
        const o = w.obj(tx, ty);
        if (!o || o.removed || seen.has(o.id)) continue;
        seen.add(o.id);
        if (FLAT.has(o.type)) this.drawObject(o, now);
        else sorted.push({ y: o.y + o.h - 0.5, x: o.x, o });
      }
    this.drawGroundItems(now);
    const p = G.player;
    for (const n of G.npcs) {
      if (n.dead || n.x + n.size < tx0 - 2 || n.x > tx1 + 2 || n.y + n.size < ty0 || n.y > ty1 + 3) continue;
      const [rx, ry] = n.renderPos(now);
      sorted.push({ y: ry + n.size - 0.5 + 0.01, x: rx, e: n });
    }
    if (G.pet) { const [rx, ry] = G.pet.renderPos(now); sorted.push({ y: ry + 0.5, x: rx, e: G.pet }); }
    if (!p.dead || now - (p.deathT || 0) < 1500) { const [rx, ry] = p.renderPos(now); sorted.push({ y: ry + 0.5 + 0.02, x: rx, e: p }); }
    sorted.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const d of sorted) {
      if (d.o) this.drawObject(d.o, now);
      else this.drawEntity(d.e, now);
    }
    this.drawBeams(now);
    this.drawProjectiles(now);
    this.drawEffects(now);
    this.drawOverheads(now);
    this.drawParticles(now);
    // lighting overlay (screen space)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawLighting(now);
    this.drawClicks(now);
  }

  animatedGround(now, tx0, ty0, tx1, ty1) {
    const ctx = this.ctx, w = G.world;
    const t = now / 1000;
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++) {
        const g = w.ground[ty * w.W + tx];
        if (g === T.OCEAN || g === T.WATER) {
          const h = hash2(tx, ty, 5);
          const ph = (t * 0.6 + h * 10) % 3;
          if (ph < 1) {
            const a = Math.sin(ph * Math.PI) * 0.5;
            ctx.fillStyle = `rgba(210,235,255,${a})`;
            const px = tx * TS + Math.floor(h * 11) + 2, py = ty * TS + Math.floor(hash2(tx, ty, 6) * 12) + 2;
            ctx.fillRect(px, py, 3, 1);
            ctx.fillRect(px + 1, py - 1, 1, 1);
          }
        } else if (g === T.LAVA) {
          const h = hash2(tx, ty, 7);
          const a = 0.25 + 0.25 * Math.sin(t * 2 + h * 20);
          ctx.fillStyle = `rgba(255,210,90,${a})`;
          ctx.fillRect(tx * TS + Math.floor(h * 10), ty * TS + Math.floor(hash2(tx, ty, 8) * 10), 4, 3);
        }
      }
  }

  drawObject(o, now) {
    const ctx = this.ctx, d = OBJECTS[o.type];
    let key = o.type;
    const depleted = o.depleted > G.tick;
    if (d.fishing) { this.drawSpot(o, now); return; }
    if (depleted && d.wc) key = 'stump';
    else if (depleted && d.mine) key = 'rocks_empty';
    else if (depleted && o.type === 'berry_bush') key = 'berry_bush_empty';
    else if (depleted && o.type === 'wheat') return;
    else if (d.fence) key = 'fence_' + this.fenceMask(o);
    else if (d.door) key = `${d.gate ? 'gate' : 'door'}_${o.open ? 1 : 0}_${o.vert ? 1 : 0}`;
    const set = OBJ_SPRITES[key];
    if (!set) return;
    let spr;
    if (set.anim) spr = set[Math.floor(now / 160 + o.id) % set.length];
    else spr = set[Math.floor(hash2(o.x, o.y, 9) * set.length)];
    const bx = o.x * TS + (o.w * TS - spr.width) / 2;
    let by = (o.y + o.h) * TS - spr.height;
    if (key.startsWith('banner') || key === 'torch') by = o.y * TS + 2;
    if (d.tall && !depleted) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(o.x * TS + o.w * TS / 2, (o.y + o.h) * TS - 3, o.w * 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.drawImage(spr, Math.round(bx), Math.round(by));
    if (o.type === 'magic_tree' && !depleted) {
      for (let i = 0; i < 3; i++) {
        const ph = (now / 900 + i * 0.37 + o.id * 0.1) % 1;
        ctx.fillStyle = `rgba(200,250,255,${Math.sin(ph * Math.PI)})`;
        ctx.fillRect(Math.round(bx + 6 + hash2(o.id, i, 1) * 20), Math.round(by + 6 + hash2(o.id, i, 2) * 18 - ph * 4), 1, 1);
      }
    }
  }
  fenceMask(o) {
    const w = G.world;
    const f = (x, y) => { const q = w.obj(x, y); return q && (OBJECTS[q.type].fence || OBJECTS[q.type].gate); };
    let m = 0;
    if (f(o.x, o.y - 1)) m |= 1; if (f(o.x + 1, o.y)) m |= 2; if (f(o.x, o.y + 1)) m |= 4; if (f(o.x - 1, o.y)) m |= 8;
    return m;
  }
  drawSpot(o, now) {
    const ctx = this.ctx;
    const cx = o.x * TS + 8, cy = o.y * TS + 9;
    for (let i = 0; i < 3; i++) {
      const ph = ((now / 1400) + i / 3 + o.id * 0.13) % 1;
      ctx.strokeStyle = `rgba(230,245,255,${0.75 * (1 - ph)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, 2 + ph * 6, 1 + ph * 3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const jump = (now / 1000 + o.id * 0.7) % 3.2;
    if (jump < 0.5) {
      const h = Math.sin(jump / 0.5 * Math.PI) * 5;
      ctx.fillStyle = o.type === 'spot_shark' ? '#5a6a76' : '#c0d0e0';
      ctx.fillRect(cx - 2 + jump * 6, cy - h - 1, 3, 2);
    }
  }

  drawGroundItems(now) {
    const ctx = this.ctx, v = this.view;
    const byTile = new Map();
    for (const g of G.groundItems) {
      if (g.x < v.tx0 || g.x > v.tx1 || g.y < v.ty0 || g.y > v.ty1) continue;
      const k = g.y * 100000 + g.x;
      if (!byTile.has(k)) byTile.set(k, []);
      byTile.get(k).push(g);
    }
    for (const list of byTile.values()) {
      list.slice(-3).forEach((g, i) => {
        const age = now - g.t;
        const drop = age < 200 ? (1 - age / 200) * 4 : 0;
        ctx.drawImage(iconFor(g.id, g.qty), g.x * TS + i * 2 - 1, g.y * TS - drop - i * 2);
      });
    }
  }

  drawEntity(e, now) {
    const ctx = this.ctx;
    const set = this.entitySprite(e);
    const spr = this.frameOf(e, set, now);
    const [rx, ry] = e.renderPos(now);
    const size = e.size || 1;
    const fx = (rx + size / 2) * TS, fy = (ry + size) * TS - 2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(fx, fy - 1, Math.max(5, set.w * 0.28), 2.5 + size * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    let alpha = 1;
    if (e === G.player && e.dead) alpha = 0.4;
    if (e.def && e.def.look.kind === 'ghost') alpha = 0.85;
    if (alpha < 1) ctx.globalAlpha = alpha;
    const x = Math.round(fx - set.ax), y = Math.round(fy - set.ay);
    ctx.drawImage(spr, x, y);
    if (e === G.player && e.hitFlash && now - e.hitFlash < 120) { /* reserved */ }
    ctx.globalAlpha = 1;
    e._top = y; e._sx = x; e._sw = spr.width; e._sh = spr.height; e._fx = fx;
    // glowing weapon bits (staves / fang)
    if (set.glow) for (const [gx, gy] of set.glow) {
      ctx.fillStyle = `rgba(255,200,120,${0.4 + 0.3 * Math.sin(now / 150)})`;
      ctx.fillRect(x + gx - 1, y + gy - 1, 3, 3);
    }
  }

  drawOverheads(now) {
    const ctx = this.ctx;
    const ents = [G.player, ...G.npcs.filter((n) => !n.dead && n._top !== undefined && n.x >= this.view.tx0 - 2 && n.x <= this.view.tx1 + 2 && n.y >= this.view.ty0 - 2 && n.y <= this.view.ty1 + 2)];
    ctx.textAlign = 'center';
    for (const e of ents) {
      if (e._top === undefined) continue;
      const cx = e._fx, top = e._top;
      const inCombat = e === G.player ? G.tick - e.lastHitTick < 10 || (e.target && e.target.option === 'Attack') : e.target || e.hp < e.maxHp;
      let y = top - 2;
      if (inCombat && (e.maxHp || e === G.player)) {
        const max = e === G.player ? e.maxHp : e.maxHp, hp = e.hp;
        const bw = Math.max(16, (e.size || 1) * 16);
        ctx.fillStyle = '#c00000'; ctx.fillRect(Math.round(cx - bw / 2), y - 3, bw, 2.5);
        ctx.fillStyle = '#00c000'; ctx.fillRect(Math.round(cx - bw / 2), y - 3, Math.round(bw * clamp(hp / max, 0, 1)), 2.5);
        y -= 5;
      }
      // hitsplats
      e.hitsplats = e.hitsplats.filter((h) => now - h.t < 1200);
      e.hitsplats.forEach((h, i) => {
        const hx = cx + [0, -7, 7, 0][i % 4], hy = (e._top + e._sh * 0.45) + [0, 4, 4, -6][i % 4];
        const rise = Math.min(1, (now - h.t) / 150);
        ctx.globalAlpha = now - h.t > 1000 ? 1 - (now - h.t - 1000) / 200 : 1;
        ctx.fillStyle = h.kind === 'block' ? '#2a5ad8' : h.kind === 'fire' ? '#e07010' : '#b01010';
        ctx.beginPath(); ctx.arc(hx, hy - rise, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.7; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 7px "Pixelify Sans", monospace';
        ctx.fillText(String(h.dmg), hx, hy - rise + 2.5);
        ctx.globalAlpha = 1;
      });
      if (e.overhead && G.tick < e.overhead.until) {
        ctx.font = '7px "Pixelify Sans", monospace';
        ctx.fillStyle = '#000'; ctx.fillText(e.overhead.text, cx + 0.5, y - 1.5);
        ctx.fillStyle = e === G.player ? '#ffff00' : '#ffff00'; ctx.fillText(e.overhead.text, cx, y - 2);
      }
      // stun stars
      if (e === G.player && G.tick < e.stunnedUntil) {
        for (let i = 0; i < 3; i++) {
          const a = now / 200 + i * 2.1;
          ctx.fillStyle = '#ffe040';
          ctx.fillRect(cx + Math.cos(a) * 6, top + 1 + Math.sin(a) * 2, 2, 2);
        }
      }
    }
    // wilderness skull above player
    const wl = wildLevel(G.player.x, G.player.y);
    if (wl && G.player._top !== undefined) {
      ctx.fillStyle = '#e8e8e0';
      const sx = G.player._fx, sy = G.player._top - 9;
      ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(sx - 1.5, sy + 1, 3, 2);
      ctx.fillStyle = '#000'; ctx.fillRect(sx - 1.5, sy - 0.5, 1, 1); ctx.fillRect(sx + 0.5, sy - 0.5, 1, 1);
    }
  }

  drawBeams(now) {
    const ctx = this.ctx;
    for (const g of G.groundItems) {
      if (!g.beam) continue;
      const x = g.x * TS + 8, y = g.y * TS + 10;
      const pulse = 0.55 + 0.25 * Math.sin(now / 250);
      const grad = ctx.createLinearGradient(0, y - 70, 0, y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, g.beam);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = grad;
      ctx.fillRect(x - 2, y - 70, 4, 70);
      ctx.globalAlpha = pulse * 0.4;
      ctx.fillRect(x - 4, y - 50, 8, 50);
      ctx.globalAlpha = 1;
    }
  }

  drawTelegraphs(now) {
    const ctx = this.ctx;
    for (const t of G.telegraphs) {
      const left = (t.at - G.tick);
      const a = 0.25 + 0.2 * Math.sin(now / 90) + (3 - left) * 0.1;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 1;
      for (const [x, y] of t.tiles) {
        ctx.globalAlpha = a * 0.8;
        ctx.fillRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2);
        ctx.globalAlpha = Math.min(1, a + 0.4);
        ctx.strokeRect(x * TS + 1.5, y * TS + 1.5, TS - 3, TS - 3);
        // shrinking warning ring
        const k = Math.max(0, (t.at - G.tick) - (now - G.lastTickAt) / TICK_MS) / 3;
        ctx.beginPath(); ctx.arc(x * TS + 8, y * TS + 8, 2 + k * 8, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawProjectiles(now) {
    const ctx = this.ctx;
    G.projectiles = G.projectiles.filter((pr) => now - pr.t0 < pr.dur);
    for (const pr of G.projectiles) {
      const k = (now - pr.t0) / pr.dur;
      const [tx, ty] = pr.target.renderPos(now);
      const ts = (pr.target.size || 1) / 2;
      const x = ((pr.fx + 0.5) + (tx + ts - (pr.fx + 0.5)) * k) * TS, y = ((pr.fy + 0.5) + (ty + ts - (pr.fy + 0.5)) * k) * TS - 8 - Math.sin(k * Math.PI) * 8;
      if (pr.kind === 'fire') {
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = ['#ffe070', '#f08a24', '#e0501a'][i % 3];
          ctx.globalAlpha = 1 - i * 0.14;
          const bk = Math.max(0, k - i * 0.04);
          const bx = ((pr.fx + 0.5) + (tx + ts - (pr.fx + 0.5)) * bk) * TS, byy = ((pr.fy + 0.5) + (ty + ts - (pr.fy + 0.5)) * bk) * TS - 8 - Math.sin(bk * Math.PI) * 8;
          ctx.beginPath(); ctx.arc(bx, byy, 4 - i * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (pr.kind === 'swarm') {
        for (let i = 0; i < 6; i++) { ctx.fillStyle = '#1e3a4a'; ctx.fillRect(x + Math.sin(now / 50 + i) * 4, y + Math.cos(now / 60 + i * 2) * 3, 2, 2); }
      } else {
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }
  }

  drawEffects(now) {
    const ctx = this.ctx;
    G.effects = G.effects.filter((ef) => now - ef.t < (ef.kind === 'fireworks' ? 1600 : ef.kind === 'death' ? 700 : ef.kind === 'playerdeath' ? 2400 : 900));
    for (const ef of G.effects) {
      const k = (now - ef.t);
      let ex = ef.x, ey = ef.y;
      if (ef.follow) [ex, ey] = ef.follow.renderPos(now);
      const px = (ex + 0.5) * TS, py = (ey + 0.5) * TS;
      switch (ef.kind) {
        case 'fireworks': {
          for (let i = 0; i < 26; i++) {
            const a = (i / 26) * Math.PI * 2 + (i % 2) * 0.1, sp = 18 + (i % 5) * 4;
            const r = (k / 1600) * sp;
            ctx.fillStyle = ['#ffe040', '#ff6040', '#40c0ff', '#80ff60', '#ff80ff'][i % 5];
            ctx.globalAlpha = 1 - k / 1600;
            ctx.fillRect(px + Math.cos(a) * r, py - 14 + Math.sin(a) * r * 0.8 + (k / 1600) ** 2 * 10, 1.5, 1.5);
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'death': {
          const n = ef.npc;
          const set = this.entitySprite(n);
          const spr = set.frames[set.humanoid ? n.facing : n.hface].idle[0];
          ctx.globalAlpha = 1 - k / 700;
          const fx = (n.x + n.size / 2) * TS, fy = (n.y + n.size) * TS - 2;
          ctx.drawImage(spr, Math.round(fx - set.ax), Math.round(fy - set.ay + (k / 700) * 4));
          ctx.globalAlpha = 1;
          break;
        }
        case 'poof': {
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.fillStyle = `rgba(200,200,200,${1 - k / 900})`; ctx.beginPath(); ctx.arc(px + Math.cos(a) * k / 90, py + Math.sin(a) * k / 120, 2.5, 0, 7); ctx.fill(); }
          break;
        }
        case 'explode': case 'slam': {
          for (const [x, y] of ef.tiles) {
            ctx.fillStyle = ef.kind === 'explode' ? `rgba(255,${160 - k / 8},40,${1 - k / 900})` : `rgba(220,210,180,${0.8 - k / 1100})`;
            const r = 3 + k / 90;
            ctx.beginPath(); ctx.arc(x * TS + 8, y * TS + 8, r, 0, 7); ctx.fill();
          }
          if (ef.kind === 'slam' && k < 50) this.shakeUntil = now + 300;
          break;
        }
        case 'holy': case 'sparkle': {
          for (let i = 0; i < 10; i++) {
            const h = hash2(i, Math.floor(ef.t), 3);
            ctx.fillStyle = ef.kind === 'holy' ? `rgba(255,255,220,${1 - k / 900})` : `rgba(160,120,255,${1 - k / 900})`;
            ctx.fillRect(px - 8 + h * 16, py - (k / 900) * 20 - hash2(i, 2, Math.floor(ef.t)) * 10, 1.5, 1.5);
          }
          break;
        }
        case 'shake': this.shakeUntil = ef.t + 900; break;
        case 'playerdeath': G.player.deathT = ef.t; break;
      }
    }
  }

  // ------------------------------------------------------------- ambience
  drawParticles(now) {
    if (!G.settings.particles) return;
    const ctx = this.ctx;
    const p = G.player;
    const b = biomeAt(p.x, p.y);
    const kind = { [BIOME.FROST]: 'snow', [BIOME.DESERT]: 'sand', [BIOME.WILD]: 'ember', [BIOME.VOLCANIC]: 'ember', [BIOME.SWAMP]: 'firefly', [BIOME.ELVEN]: 'firefly', [BIOME.CAVE]: 'dust', [BIOME.TOMB]: 'dust', [BIOME.TROPIC]: 'pollen', [BIOME.KINGDOM]: 'pollen',
      [BIOME.SEWER]: 'dust', [BIOME.CRYPT]: 'dust', [BIOME.ICECAVE]: 'snow', [BIOME.LAVACAVE]: 'ember', [BIOME.HOLLOW]: 'firefly' }[b];
    const target = { snow: 140, sand: 60, ember: 50, firefly: 30, dust: 40, pollen: 14 }[kind] || 0;
    const dt = Math.min(50, now - (this.lastPT || now)); this.lastPT = now;
    while (this.particles.length < target) this.particles.push(this.newParticle(kind, true));
    if (this.particles.length > target) this.particles.length = target;
    for (let i = 0; i < this.particles.length; i++) {
      let q = this.particles[i];
      if (q.kind !== kind) q = this.particles[i] = this.newParticle(kind, true);
      q.x += q.vx * dt / 16; q.y += q.vy * dt / 16;
      if (kind === 'snow') q.x += Math.sin(now / 700 + q.s) * 0.1;
      if (q.x < this.camX - 20 || q.x > this.camX + this.vw + 20 || q.y < this.camY - 20 || q.y > this.camY + this.vh + 20) this.particles[i] = this.newParticle(kind, false);
      let a = 1;
      if (kind === 'firefly') a = 0.5 + 0.5 * Math.sin(now / 300 + q.s * 7);
      ctx.fillStyle = q.c;
      ctx.globalAlpha = a * q.a;
      ctx.fillRect(q.x, q.y, q.r, q.r);
    }
    ctx.globalAlpha = 1;
  }
  newParticle(kind, anywhere) {
    const r = Math.random;
    let x = this.camX + r() * this.vw, y = this.camY + r() * this.vh;
    if (!anywhere) {
      if (kind === 'snow') y = this.camY - 10;
      else if (kind === 'ember') y = this.camY + this.vh + 10;
      else if (kind === 'sand') x = this.camX - 10;
    }
    const base = { kind, x, y, s: r() * 10, a: 1, r: 1 };
    switch (kind) {
      case 'snow': return { ...base, vx: -0.15 + r() * 0.1, vy: 0.35 + r() * 0.4, c: '#ffffff', r: r() < 0.3 ? 2 : 1, a: 0.9 };
      case 'sand': return { ...base, vx: 1.2 + r(), vy: 0.1 * (r() - 0.5), c: '#e8d098', a: 0.6 };
      case 'ember': return { ...base, vx: (r() - 0.5) * 0.2, vy: -0.25 - r() * 0.3, c: r() < 0.5 ? '#ff8030' : '#ffc040', a: 0.8 };
      case 'firefly': return { ...base, vx: (r() - 0.5) * 0.15, vy: (r() - 0.5) * 0.15, c: '#e0ff70', r: 1.5 };
      case 'dust': return { ...base, vx: (r() - 0.5) * 0.08, vy: (r() - 0.5) * 0.08, c: '#d0c0a0', a: 0.4 };
      case 'pollen': return { ...base, vx: 0.1 + r() * 0.1, vy: (r() - 0.5) * 0.1, c: '#fff8d0', a: 0.5 };
    }
    return base;
  }

  drawLighting(now) {
    const p = G.player;
    const dark = G.world.dark;
    const ctx = this.ctx;
    const Wd = this.cv.width, Hd = this.cv.height;
    if (dark) {
      const l = this.lctx;
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, Wd, Hd);
      l.fillStyle = `rgba(6,4,10,${dark})`;
      l.fillRect(0, 0, Wd, Hd);
      l.globalCompositeOperation = 'destination-out';
      const Z = this.Z;
      const hole = (wx, wy, r, flick = 0) => {
        const [sx, sy] = this.toScreen(wx, wy);
        const rr = r * TS * Z * (1 + flick);
        const g = l.createRadialGradient(sx, sy, rr * 0.1, sx, sy, rr);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = g; l.beginPath(); l.arc(sx, sy, rr, 0, 7); l.fill();
      };
      const [rx, ry] = p.renderPos(now);
      hole((rx + 0.5) * TS, (ry + 0.3) * TS, G.game.playerLight());
      const v = this.view;
      for (let ty = v.ty0; ty <= v.ty1; ty++) for (let tx = v.tx0; tx <= v.tx1; tx++) {
        const o = G.world.obj(tx, ty);
        if (o && o.x === tx && o.y === ty && LIGHTS[o.type]) hole((tx + o.w / 2) * TS, (ty + 0.5) * TS, LIGHTS[o.type][0], Math.sin(now / 120 + tx) * 0.04);
      }
      ctx.drawImage(this.light, 0, 0);
      // warm glow tint
      ctx.globalCompositeOperation = 'lighter';
      for (let ty = this.view.ty0; ty <= this.view.ty1; ty++) for (let tx = this.view.tx0; tx <= this.view.tx1; tx++) {
        const o = G.world.obj(tx, ty);
        if (!o || o.x !== tx || o.y !== ty || !LIGHTS[o.type]) continue;
        const [sx, sy] = this.toScreen((tx + o.w / 2) * TS, (ty + 0.5) * TS);
        const rr = LIGHTS[o.type][0] * TS * this.Z * 0.7;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
        g.addColorStop(0, LIGHTS[o.type][1] + '40'); g.addColorStop(1, LIGHTS[o.type][1] + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // vignette
    const g = ctx.createRadialGradient(Wd / 2, Hd / 2, Math.min(Wd, Hd) * 0.45, Wd / 2, Hd / 2, Math.max(Wd, Hd) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, wildLevel(p.x, p.y) ? 'rgba(40,0,0,0.45)' : 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
    // death fade
    const dT = G.player.deathT;
    if (dT && now - dT < 2400) {
      const k = (now - dT) / 2400;
      ctx.fillStyle = `rgba(0,0,0,${Math.sin(k * Math.PI) * 0.85})`;
      ctx.fillRect(0, 0, Wd, Hd);
    }
  }

  // ------------------------------------------------------------- clicks & picking
  clickMark(sx, sy, color) { this.clicks.push({ sx, sy, color, t: performance.now() }); }
  drawClicks(now) {
    const ctx = this.ctx;
    this.clicks = this.clicks.filter((c) => now - c.t < 400);
    for (const c of this.clicks) {
      const k = (now - c.t) / 400;
      const s = 7 * (1 - k * 0.5);
      ctx.strokeStyle = c.color === 'red' ? '#ff2020' : '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.sx - s, c.sy - s); ctx.lineTo(c.sx + s, c.sy + s);
      ctx.moveTo(c.sx + s, c.sy - s); ctx.lineTo(c.sx - s, c.sy + s);
      ctx.stroke();
    }
  }

  pick(sx, sy) {
    const [wx, wy] = this.toWorld(sx, sy);
    const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    const hit = { x: tx, y: ty, sx, sy, npcs: [], items: [], obj: null };
    const now = performance.now();
    // NPCs by sprite box
    const cand = [];
    for (const n of G.npcs) {
      if (n.dead || n._sx === undefined) continue;
      if (Math.abs(n.x - tx) > 6 || Math.abs(n.y - ty) > 6) continue;
      const set = this.entitySprite(n);
      const bx0 = n._sx + set.w * 0.18, bx1 = n._sx + set.w * 0.82, by0 = n._top + set.h * 0.25, by1 = n._top + set.h;
      if ((wx >= bx0 && wx <= bx1 && wy >= by0 && wy <= by1) || n.occupies(tx, ty)) cand.push(n);
    }
    cand.sort((a, b) => b.y - a.y);
    hit.npcs = cand;
    hit.items = G.groundItems.filter((g) => g.x === tx && g.y === ty);
    // objects: footprint first, then tall sprites overlapping from below
    let o = G.world.obj(tx, ty);
    if (o && (o.removed || OBJECTS[o.type].decor)) o = null;
    if (!o) {
      for (let dy = 1; dy <= 2 && !o; dy++) for (let dx = -1; dx <= 1 && !o; dx++) {
        const q = G.world.obj(tx + dx, ty + dy);
        if (!q || q.removed || !OBJECTS[q.type].tall) continue;
        const set = OBJ_SPRITES[q.type];
        if (!set) continue;
        const spr = set[0];
        const bx = q.x * TS + (q.w * TS - spr.width) / 2, by = (q.y + q.h) * TS - spr.height;
        if (wx >= bx + 3 && wx <= bx + spr.width - 3 && wy >= by + 2 && wy <= (q.y + q.h) * TS) o = q;
      }
    }
    hit.obj = o;
    return hit;
  }
}

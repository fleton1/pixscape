// Circular minimap and the full-screen world map.
import { G } from '../game/state.js';
import { TS } from '../world/map.js';
import { bakeMap, MAP_SCALE } from '../sprites/terrain.js';
import { bakeAtlasSoon, ATLAS_SCALE } from './atlas.js';
import { Painter, OUTLINE } from '../painter.js';
import { storyStarters } from '../game/questengine.js';

// Each map's minimap image is baked once, the first time the player is there.
function mapImage(w) { return w.mapImage || (w.mapImage = bakeMap(w)); }

export const MAP_ICONS = {};
function buildIcons() {
  const mk = (fn) => { const p = new Painter(11, 11); p.ellipse(5.5, 5.5, 5.5, 5.5, '#2a2218'); p.ellipse(5.5, 5.5, 4.5, 4.5, '#6a5838'); fn(p); p.outline(OUTLINE); return p.canvas(); };
  MAP_ICONS.bank = mk((p) => { p.ellipse(5.5, 5.5, 3.5, 3.5, '#e8c13a'); p.vline(5, 3, 8, '#8a6a10'); p.hline(4, 6, 4, '#8a6a10'); p.hline(4, 6, 7, '#8a6a10'); });
  MAP_ICONS.shop = mk((p) => { p.ball(5.5, 6.5, 3, 3, '#c89a50'); p.rect(4, 2, 3, 2, '#8a5a2a'); p.set(5, 6, '#e8c13a'); });
  MAP_ICONS.cook = mk((p) => { p.ball(5.5, 6.5, 3, 2.5, '#3a3a3a'); p.rect(3, 3, 5, 1, '#d0d0d0'); p.set(5, 2, '#f0a040'); });
  MAP_ICONS.furnace = mk((p) => { p.rect(3, 3, 5, 6, '#8a857c'); p.rect(4, 6, 3, 2, '#f08a24'); });
  MAP_ICONS.anvil = mk((p) => { p.rect(2, 4, 7, 2, '#3a3a40'); p.rect(4, 6, 3, 2, '#3a3a40'); p.hline(2, 8, 4, '#8a8a90'); });
  MAP_ICONS.altar = mk((p) => { p.vline(5, 2, 8, '#f0f0f0'); p.hline(3, 7, 4, '#f0f0f0'); });
  MAP_ICONS.ladder = mk((p) => { p.vline(3, 2, 8, '#c89a50'); p.vline(7, 2, 8, '#c89a50'); p.hline(3, 7, 4, '#c89a50'); p.hline(3, 7, 7, '#c89a50'); });
  MAP_ICONS.fish = mk((p) => { p.ellipse(5, 5.5, 3, 1.8, '#6ab0e8'); p.set(8, 4, '#6ab0e8'); p.set(8, 6, '#6ab0e8'); p.set(3, 5, '#1a1a1a'); });
  MAP_ICONS.mine = mk((p) => { p.line(3, 8, 7, 4, '#8a5a2a'); p.line(3, 3, 8, 5, '#b0b0b0'); });
  MAP_ICONS.quest = mk((p) => { p.ellipse(5.5, 5.5, 4, 4, '#2a5ad8'); p.vline(5, 3, 6, '#ffffff'); p.set(5, 8, '#ffffff'); });
  MAP_ICONS.farm = mk((p) => { p.rect(3, 6, 6, 3, '#6a4a2a'); p.line(6, 6, 6, 3, '#4aa03a'); p.set(5, 3, '#4aa03a'); p.set(7, 3, '#4aa03a'); });
  MAP_ICONS.stones = mk((p) => { for (const [x, y] of [[3, 4], [8, 4], [3, 8], [8, 8], [5, 2]]) p.rect(x, y, 1, 2, '#c8c8d0'); p.set(5, 6, '#a0e0ff'); });
  MAP_ICONS.slayer = mk((p) => { p.ball(5.5, 5, 3.5, 3, '#e8e4d8'); p.set(4, 5, '#1a1a1a'); p.set(7, 5, '#1a1a1a'); p.rect(4, 7, 4, 2, '#e8e4d8'); });
  MAP_ICONS.agility = mk((p) => { p.ball(6, 3, 1.3, 1.3, '#e0b088'); p.line(6, 4, 5, 7, '#6ae0e0'); p.line(5, 7, 3, 9, '#6ae0e0'); p.line(5, 7, 7, 9, '#6ae0e0'); p.line(3, 5, 8, 5, '#6ae0e0'); });
  MAP_ICONS.rune = mk((p) => { p.ball(5.5, 5.5, 3.5, 3.5, '#a8a098'); p.line(4, 4, 7, 7, '#e8c13a'); p.line(7, 4, 4, 7, '#e8c13a'); });
  MAP_ICONS.craft = mk((p) => { p.line(3, 8, 8, 3, '#c8c8c8'); p.ball(4, 4, 1.5, 1.5, '#e8c13a'); p.set(7, 7, '#8a5a2a'); });
  MAP_ICONS.stall = mk((p) => { p.rect(2, 3, 7, 2, '#d82a2a'); p.rect(3, 5, 5, 3, '#8a5a2a'); });
}

export class Minimap {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    buildIcons();
    this.S = MAP_SCALE;
    this.questIcons = [];
  }
  get map() { return mapImage(G.world); }
  mapChanged() { this.refreshQuestIcons(); }
  refreshQuestIcons() {
    const starts = [['cook', 'feast'], ['hilda', 'goblin_trouble'], ['sylwen', 'lost_grove'], ['petra', 'sands'], ['king', 'dragons_bane'], ...storyStarters()];
    this.questIcons = [];
    for (const n of G.npcs) for (const [npc, q] of starts) if (n.defId === npc) this.questIcons.push({ x: n.sx, y: n.sy, q });
  }
  draw(now) {
    const ctx = this.ctx, S = this.S;
    const R = this.cv.width / 2;
    const p = G.player;
    const [rx, ry] = p.renderPos(now);
    ctx.save();
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.beginPath(); ctx.arc(R, R, R - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R * 2, R * 2);
    ctx.imageSmoothingEnabled = false;
    const cx = (rx + 0.5) * S, cy = (ry + 0.5) * S;
    ctx.drawImage(this.map, Math.round(cx - R), Math.round(cy - R), R * 2, R * 2, 0, 0, R * 2, R * 2);
    const toM = (x, y) => [R + (x + 0.5) * S - cx, R + (y + 0.5) * S - cy];
    // map icons
    for (const ic of G.world.mapIcons) {
      const [mx, my] = toM(ic.x, ic.y);
      if (mx < -8 || my < -8 || mx > R * 2 + 8 || my > R * 2 + 8) continue;
      const img = MAP_ICONS[ic.type];
      if (img) ctx.drawImage(img, Math.round(mx - 5), Math.round(my - 5));
    }
    for (const q of this.questIcons) {
      if (G.player.stage(q.q) >= 100) continue;
      const [mx, my] = toM(q.x, q.y);
      ctx.drawImage(MAP_ICONS.quest, Math.round(mx - 5), Math.round(my - 5));
    }
    // items (red), npcs (yellow)
    ctx.fillStyle = '#ff0000';
    for (const g of G.groundItems) { const [mx, my] = toM(g.x, g.y); if (mx > 0 && my > 0 && mx < R * 2 && my < R * 2) ctx.fillRect(mx - 1.5, my - 1.5, 3, 3); }
    for (const n of G.npcs) {
      if (n.dead) continue;
      const [nx, ny] = n.renderPos(now);
      const [mx, my] = toM(nx + (n.size - 1) / 2, ny + (n.size - 1) / 2);
      if (mx < 0 || my < 0 || mx > R * 2 || my > R * 2) continue;
      ctx.fillStyle = '#000'; ctx.fillRect(mx - 2, my - 2, 4, 4);
      ctx.fillStyle = n.boss ? '#ff3030' : '#ffff00'; ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }
    if (G.pet) { const [nx, ny] = G.pet.renderPos(now); const [mx, my] = toM(nx, ny); ctx.fillStyle = '#ffff00'; ctx.fillRect(mx - 1.5, my - 1.5, 3, 3); }
    // player
    ctx.fillStyle = '#fff'; ctx.fillRect(R - 1.5, R - 1.5, 4, 4);
    // destination flag
    if (p.path.length) {
      const [dx, dy] = p.path[p.path.length - 1];
      const [mx, my] = toM(dx, dy);
      ctx.fillStyle = '#ff2020'; ctx.fillRect(mx, my - 6, 1, 7); ctx.fillRect(mx + 1, my - 6, 4, 3);
    }
    ctx.restore();
  }
  // Minimap click -> tile
  clickToTile(mx, my) {
    const R = this.cv.width / 2;
    const [rx, ry] = G.player.renderPos(performance.now());
    const dx = (mx - R) / this.S, dy = (my - R) / this.S;
    if (Math.hypot(mx - R, my - R) > R - 2) return null;
    return [Math.round(rx + dx), Math.round(ry + dy)];
  }
}

// Map icons worth showing when zoomed out; the rest appear as you zoom in.
const KEY_ICONS = new Set(['bank', 'quest', 'altar', 'rune', 'ladder', 'agility', 'slayer', 'stones', 'minigame']);
const MIN_ZOOM = 0.25, MAX_ZOOM = 2.5;

export class WorldMap {
  constructor(canvas, minimap) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.mm = minimap;
    this.zoom = 0.6; this.target = 0.6; this.ox = 0; this.oy = 0;
    this.anchor = null; // screen point that stays put while zooming
    this.drag = null;
    const pt = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('mousedown', (e) => { const [x, y] = pt(e); this.drag = [x, y, this.ox, this.oy]; canvas.classList.add('grabbing'); });
    window.addEventListener('mouseup', () => { this.drag = null; canvas.classList.remove('grabbing'); });
    canvas.addEventListener('mousemove', (e) => {
      if (!this.drag) return;
      const [x, y] = pt(e), s = this.zoom * MAP_SCALE;
      this.ox = this.drag[2] - (x - this.drag[0]) / s;
      this.oy = this.drag[3] - (y - this.drag[1]) / s;
      this.kick();
    });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomBy(e.deltaY > 0 ? 0.8 : 1.25, ...pt(e)); }, { passive: false });
    canvas.addEventListener('dblclick', (e) => this.zoomBy(1.6, ...pt(e)));
    // touch: one finger pans, two fingers pinch-zoom around their midpoint
    let g = null;
    const grab = (e) => {
      const r = canvas.getBoundingClientRect();
      const pts = [...e.touches].map((t) => [t.clientX - r.left, t.clientY - r.top]);
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const d = pts.length > 1 ? Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) : 0;
      return { n: pts.length, cx, cy, d };
    };
    const start = (e) => {
      e.preventDefault();
      if (!e.touches.length) { g = null; return; }
      const s = this.zoom * MAP_SCALE;
      const f = grab(e);
      // the world point under the fingers stays under the fingers
      g = { ...f, zoom: this.zoom, wx: this.ox + (f.cx - this.lw / 2) / s, wy: this.oy + (f.cy - this.lh / 2) / s };
    };
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchend', start, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!g) return;
      const f = grab(e);
      if (f.n !== g.n) return;
      if (f.n > 1 && g.d) this.zoom = this.target = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, g.zoom * f.d / g.d));
      this.anchor = null;
      const s = this.zoom * MAP_SCALE;
      this.ox = g.wx - (f.cx - this.lw / 2) / s;
      this.oy = g.wy - (f.cy - this.lh / 2) / s;
      this.kick();
    }, { passive: false });
    const btn = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = (e) => { e.stopPropagation(); fn(); }; };
    btn('wm-in', () => this.zoomBy(1.5));
    btn('wm-out', () => this.zoomBy(1 / 1.5));
    btn('wm-me', () => { const h = this.here(); this.glide = { x: h.x, y: h.y }; this.kick(); });
  }
  // zoom toward a screen point (default: the centre), eased over a few frames
  zoomBy(f, sx = this.lw / 2, sy = this.lh / 2) {
    this.target = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.target * f));
    const s = this.zoom * MAP_SCALE;
    this.anchor = { sx, sy, wx: this.ox + (sx - this.lw / 2) / s, wy: this.oy + (sy - this.lh / 2) / s };
    this.kick();
  }
  // the canvas is sized in device pixels for sharp text and edges; everything else works in CSS pixels
  get lw() { return this.cv.width / (this.dpr || 1); }
  get lh() { return this.cv.height / (this.dpr || 1); }
  fit() { this.dpr = Math.min(2, window.devicePixelRatio || 1); this.cv.width = Math.round(this.cv.clientWidth * this.dpr); this.cv.height = Math.round(this.cv.clientHeight * this.dpr); }
  resize() { this.fit(); this.draw(); }
  // The world map always shows the overworld. Inside a dungeon it marks the dungeon's entrance.
  here() {
    const w = G.world, p = G.player;
    if (w === G.overworld) return { x: p.x, y: p.y, name: null };
    const [x, y] = w.entrance || G.overworld.points.spawn;
    return { x, y, name: w.name };
  }
  open() {
    this.fit();
    const h = this.here();
    this.ox = h.x; this.oy = h.y;
    // settle in from a little further out
    this.zoom = Math.max(MIN_ZOOM, this.target * 0.8);
    this.anchor = null; this.glide = null;
    bakeAtlasSoon(G.overworld);
    this.draw();
  }
  kick() { if (!this.anim) { this.anim = true; requestAnimationFrame(() => { this.anim = false; if (this.cv.offsetParent) this.draw(); }); } }
  step() {
    let moving = false;
    if (Math.abs(this.target - this.zoom) > 0.001) {
      this.zoom += (this.target - this.zoom) * 0.22;
      if (Math.abs(this.target - this.zoom) < 0.002) this.zoom = this.target;
      if (this.anchor) {
        const s = this.zoom * MAP_SCALE, a = this.anchor;
        this.ox = a.wx - (a.sx - this.lw / 2) / s;
        this.oy = a.wy - (a.sy - this.lh / 2) / s;
      }
      moving = true;
    } else this.anchor = null;
    if (this.glide) {
      this.ox += (this.glide.x - this.ox) * 0.18; this.oy += (this.glide.y - this.oy) * 0.18;
      if (Math.hypot(this.glide.x - this.ox, this.glide.y - this.oy) < 0.3) this.glide = null;
      moving = true;
    }
    return moving;
  }
  draw() {
    this.step();
    const ctx = this.ctx, cw = this.lw, ch = this.lh;
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    const s = this.zoom * MAP_SCALE;
    const ow = G.overworld, W = ow.W, H = ow.H;
    // the painted atlas once it is ready; the minimap's plain image until then
    const atlas = ow.atlas || mapImage(ow);
    const AS = ow.atlas ? ATLAS_SCALE : MAP_SCALE;
    // the open sea beyond the edges
    ctx.fillStyle = '#2b5689'; ctx.fillRect(0, 0, cw, ch);
    const x0 = this.ox - cw / 2 / s, y0 = this.oy - ch / 2 / s;
    ctx.save();
    ctx.translate(Math.round(-x0 * s), Math.round(-y0 * s));
    const k = s / AS;
    ctx.imageSmoothingEnabled = k < 1;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(atlas, 0, 0, W * AS, H * AS, 0, 0, W * s, H * s);
    ctx.imageSmoothingEnabled = false;
    // icons: the key ones from afar, all of them up close
    if (this.zoom >= 0.4) {
      const all = this.zoom >= 0.85, big = this.zoom >= 1.6 ? 2 : 1;
      for (const ic of ow.mapIcons) {
        if (!all && !KEY_ICONS.has(ic.type)) continue;
        const img = MAP_ICONS[ic.type];
        if (img) ctx.drawImage(img, Math.round(ic.x * s - 5.5 * big), Math.round(ic.y * s - 5.5 * big), 11 * big, 11 * big);
      }
    }
    // labels, biggest first; a label that would overlap one already placed is left out
    const placed = [];
    const labels = [...ow.labels].sort((a, b) => b.size - a.size);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const l of labels) {
      if (l.size === 1 && this.zoom < 0.7) continue;
      if (l.size === 2 && this.zoom < 0.35) continue;
      const base = [0, 12, 15, 21][l.size];
      const size = Math.round(base * Math.min(1.5, Math.max(0.85, this.zoom * 1.25)));
      const region = l.size === 3;
      ctx.font = `${l.faint ? 'italic ' : ''}${region ? 600 : 400} ${size}px "Pixelify Sans", monospace`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = region ? `${Math.round(size * 0.18)}px` : '0px';
      const text = region ? l.name.toUpperCase() : l.name;
      const tw = ctx.measureText(text).width, x = l.x * s, y = l.y * s;
      const box = [x - tw / 2 - 4, y - size / 2 - 3, x + tw / 2 + 4, y + size / 2 + 3];
      if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      ctx.lineWidth = region ? 4 : 3.5;
      ctx.strokeStyle = region ? 'rgba(28,22,14,0.7)' : 'rgba(20,16,10,0.85)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = region ? (l.faint ? 'rgba(244,234,208,0.8)' : '#f4ead0') : l.faint ? 'rgba(255,240,205,0.85)' : '#ffd98a';
      ctx.fillText(text, x, y);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    // you are here
    const h = this.here();
    const t = performance.now();
    const hx = h.x * s, hy = h.y * s;
    const ring = (t % 1600) / 1600;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - ring)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, 5 + ring * 14, 0, 7); ctx.stroke();
    ctx.fillStyle = h.name ? '#ffd84a' : '#ffffff'; ctx.strokeStyle = '#1a1510'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 7); ctx.fill(); ctx.stroke();
    if (h.name) {
      ctx.font = '14px "Pixelify Sans", monospace'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(20,16,10,0.85)'; ctx.strokeText(`You are in ${h.name}`, hx, hy - 13);
      ctx.fillStyle = '#ffd84a'; ctx.fillText(`You are in ${h.name}`, hx, hy - 13);
    }
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
    // soft vignette at the edges, like an old chart
    const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.45, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.6);
    vg.addColorStop(0, 'rgba(20,14,6,0)'); vg.addColorStop(1, 'rgba(20,14,6,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
    this.compass(ctx, cw - 44, ch - 48);
    ctx.font = '13px "Pixelify Sans", monospace'; ctx.textAlign = 'left';
    const hint = G.touch ? 'Drag to pan, pinch to zoom' : 'Drag to pan, scroll or double-click to zoom, M or Esc to close';
    const hw = ctx.measureText(hint).width;
    ctx.fillStyle = 'rgba(26,21,16,0.8)'; ctx.fillRect(8, ch - 30, hw + 16, 22);
    ctx.fillStyle = '#e8dcc0'; ctx.fillText(hint, 16, ch - 15);
    // keep animating while zooming or gliding, and for the pulsing marker
    this.kick();
  }
  compass(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(26,21,16,0.75)'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); ctx.stroke();
    const pt = (a, r) => [Math.sin(a) * r, -Math.cos(a) * r];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.fillStyle = i === 0 ? '#d8a84a' : '#e8dcc0';
      ctx.beginPath(); ctx.moveTo(...pt(a, 17)); ctx.lineTo(...pt(a + 0.35, 5)); ctx.lineTo(0, 0); ctx.lineTo(...pt(a - 0.35, 5)); ctx.closePath(); ctx.fill();
    }
    ctx.font = '11px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#f4ead0';
    ctx.fillText('N', 0, -25 + 2);
    ctx.restore();
  }
}

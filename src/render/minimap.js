// Circular minimap and the full-screen world map.
import { G } from '../game/state.js';
import { W, H, TS } from '../world/map.js';
import { bakeMap, MAP_SCALE } from '../sprites/terrain.js';
import { Painter, OUTLINE } from '../painter.js';
import { AREAS } from '../world/gen.js';
import { underground } from '../game/world_info.js';

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
  MAP_ICONS.stall = mk((p) => { p.rect(2, 3, 7, 2, '#d82a2a'); p.rect(3, 5, 5, 3, '#8a5a2a'); });
}

export class Minimap {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    buildIcons();
    this.map = bakeMap(G.world);
    this.S = MAP_SCALE;
    this.questIcons = [];
  }
  refreshQuestIcons() {
    const starts = { cook: 'feast', hilda: 'goblin_trouble', sylwen: 'lost_grove', petra: 'sands', king: 'dragons_bane' };
    this.questIcons = [];
    for (const n of G.npcs) if (starts[n.defId]) this.questIcons.push({ x: n.sx, y: n.sy, q: starts[n.defId] });
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
    if (underground(p.x, p.y)) {
      // hide the overworld around dungeon edges
      ctx.fillStyle = '#000';
      const [ex, ey] = toM(-0.5, -0.5);
      ctx.fillRect(ex + 100 * S, 0, R * 2, R * 2);
      ctx.fillRect(0, ey + 59 * S, R * 2, R * 2);
    }
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

export class WorldMap {
  constructor(canvas, minimap) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.mm = minimap;
    this.zoom = 0.5; this.ox = 0; this.oy = 0;
    this.drag = null;
    canvas.addEventListener('mousedown', (e) => { this.drag = [e.offsetX, e.offsetY, this.ox, this.oy]; });
    window.addEventListener('mouseup', () => { this.drag = null; });
    canvas.addEventListener('mousemove', (e) => {
      if (!this.drag) return;
      this.ox = this.drag[2] - (e.offsetX - this.drag[0]) / (this.zoom * MAP_SCALE);
      this.oy = this.drag[3] - (e.offsetY - this.drag[1]) / (this.zoom * MAP_SCALE);
      this.draw();
    });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = Math.max(0.25, Math.min(2, this.zoom * (e.deltaY > 0 ? 0.85 : 1.18))); this.draw(); }, { passive: false });
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
      g = { ...f, zoom: this.zoom, wx: this.ox + (f.cx - this.cv.width / 2) / s, wy: this.oy + (f.cy - this.cv.height / 2) / s };
    };
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchend', start, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!g) return;
      const f = grab(e);
      if (f.n !== g.n) return;
      if (f.n > 1 && g.d) this.zoom = Math.max(0.25, Math.min(2, g.zoom * f.d / g.d));
      const s = this.zoom * MAP_SCALE;
      this.ox = g.wx - (f.cx - this.cv.width / 2) / s;
      this.oy = g.wy - (f.cy - this.cv.height / 2) / s;
      this.draw();
    }, { passive: false });
  }
  resize() { this.cv.width = this.cv.clientWidth; this.cv.height = this.cv.clientHeight; this.draw(); }
  open() {
    const p = G.player;
    this.cv.width = this.cv.clientWidth; this.cv.height = this.cv.clientHeight;
    if (underground(p.x, p.y)) { this.ox = 225; this.oy = 160; } else { this.ox = p.x; this.oy = p.y; }
    this.draw();
  }
  draw() {
    const ctx = this.ctx, cw = this.cv.width, ch = this.cv.height;
    const s = this.zoom * MAP_SCALE;
    ctx.fillStyle = '#2e5a96'; ctx.fillRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = this.zoom < 1;
    const x0 = this.ox - cw / 2 / s, y0 = this.oy - ch / 2 / s;
    ctx.save();
    ctx.translate(-x0 * s, -y0 * s);
    ctx.drawImage(this.mm.map, 0, 0, W * MAP_SCALE, H * MAP_SCALE, 0, 0, W * s, H * s);
    // hide the underground region
    ctx.fillStyle = '#2e5a96'; ctx.fillRect(0, 0, 100 * s, 62 * s);
    ctx.imageSmoothingEnabled = false;
    for (const ic of G.world.mapIcons) {
      if (ic.x < 100 && ic.y < 62) continue;
      const img = MAP_ICONS[ic.type];
      if (img && this.zoom >= 0.4) ctx.drawImage(img, ic.x * s - 5, ic.y * s - 5);
    }
    // labels
    ctx.textAlign = 'center';
    for (const l of G.world.labels) {
      if (l.x < 100 && l.y < 62) continue;
      const size = [0, 12, 16, 22][l.size] * Math.min(1.4, Math.max(0.8, this.zoom * 1.4));
      ctx.font = `${l.faint ? 'italic ' : ''}${size}px "Pixelify Sans", monospace`;
      ctx.fillStyle = '#000'; ctx.fillText(l.name, l.x * s + 1, l.y * s + 1);
      ctx.fillStyle = l.faint ? 'rgba(255,240,200,0.75)' : '#ff981f'; ctx.fillText(l.name, l.x * s, l.y * s);
    }
    const p = G.player;
    if (!underground(p.x, p.y)) {
      const t = performance.now();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x * s, p.y * s, 4 + Math.sin(t / 200), 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    ctx.font = '14px "Pixelify Sans", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffdd88';
    ctx.fillText(G.touch ? 'Drag to pan - Pinch to zoom' : 'Drag to pan - Scroll to zoom - M or Esc to close', 12, ch - 12);
    if (!this.anim) { this.anim = true; requestAnimationFrame(() => { this.anim = false; if (this.cv.offsetParent) this.draw(); }); }
  }
}

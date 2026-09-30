// Shared movement/animation bookkeeping for anything that walks around on tiles.
import { G, TICK_MS } from './state.js';

export class Mover {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.seg = [[x, y]];
    this.segStart = 0;
    this.facing = 'down';
    this.hface = 'right';
    this.anim = 'idle';
    this.animStart = 0;
    this.animUntil = 0;
    this.hitsplats = [];
    this.overhead = null;
    this.size = 1;
  }
  // Record the tiles walked this tick (for smooth interpolation).
  moved(points, now) {
    const [rx, ry] = this.renderPos(now);
    this.seg = [[rx, ry], ...points];
    this.segStart = now;
    const [lx, ly] = points[points.length - 1];
    const [px, py] = points.length > 1 ? points[points.length - 2] : [rx, ry];
    this.faceDir(lx - px, ly - py);
  }
  teleport(x, y) { this.x = x; this.y = y; this.seg = [[x, y]]; }
  faceDir(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy) + 0.01) this.facing = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.facing = dy > 0 ? 'down' : 'up';
    if (dx) this.hface = dx > 0 ? 'right' : 'left';
  }
  faceTile(tx, ty) { this.faceDir(tx - this.x, ty - this.y); }
  renderPos(now) {
    const s = this.seg;
    if (s.length === 1) return s[0];
    const t = Math.min(1, Math.max(0, (now - this.segStart) / TICK_MS));
    const n = s.length - 1;
    const f = t * n;
    const i = Math.min(n - 1, Math.floor(f));
    const k = f - i;
    return [s[i][0] + (s[i + 1][0] - s[i][0]) * k, s[i][1] + (s[i + 1][1] - s[i][1]) * k];
  }
  isMoving(now) { return this.seg.length > 1 && now - this.segStart < TICK_MS; }
  // style picks the pose for humanoids ('slash', 'bow', 'cast', 'chop', 'work', ...); null lets the
  // renderer work it out from what the entity is holding
  playAnim(name, ticks, style = null) { const now = performance.now(); this.anim = name; this.animStyle = style; this.animStart = now; this.animUntil = now + ticks * TICK_MS; }
  hitsplat(dmg, kind = 'hit') {
    this.hitsplats.push({ dmg, kind, t: performance.now() });
    if (this.hitsplats.length > 4) this.hitsplats.shift();
  }
  say(text, ticks = 5) { this.overhead = { text, until: G.tick + ticks }; }
}

// footprint helpers for sized entities
export function rectDist(px, py, x, y, size) {
  const dx = Math.max(x - px, 0, px - (x + size - 1));
  const dy = Math.max(y - py, 0, py - (y + size - 1));
  return [dx, dy];
}
export function touchingCardinal(px, py, x, y, size) {
  const [dx, dy] = rectDist(px, py, x, y, size);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}
export function withinRange(px, py, x, y, size, r) {
  const [dx, dy] = rectDist(px, py, x, y, size);
  return Math.max(dx, dy) <= r && !(dx === 0 && dy === 0);
}

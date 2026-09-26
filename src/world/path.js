// A* pathfinding (8-directional, no corner cutting) + a small binary heap.
import { W, H } from './map.js';

export class Heap {
  constructor() { this.a = []; this.p = []; }
  get size() { return this.a.length; }
  push(v, pr) {
    const a = this.a, p = this.p;
    a.push(v); p.push(pr);
    let i = a.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (p[j] <= pr) break;
      a[i] = a[j]; p[i] = p[j]; i = j;
    }
    a[i] = v; p[i] = pr;
  }
  pop() {
    const a = this.a, p = this.p;
    const top = a[0];
    const lv = a.pop(), lp = p.pop();
    if (a.length) {
      let i = 0;
      for (;;) {
        let l = 2 * i + 1, r = l + 1, m = i;
        let mp = lp;
        if (l < a.length && p[l] < mp) { m = l; mp = p[l]; }
        if (r < a.length && p[r] < mp) { m = r; mp = p[r]; }
        if (m === i) break;
        a[i] = a[m]; p[i] = p[m]; i = m;
      }
      a[i] = lv; p[i] = lp;
    }
    return top;
  }
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const gScore = new Float32Array(W * H);
const came = new Int32Array(W * H);
const stamp = new Uint32Array(W * H);
let curStamp = 1;

// Finds a path from (sx,sy) to any tile where goal(x,y) is true. Returns array of [x,y] steps (excluding start).
// If unreachable, returns a path to the explored tile closest to (tx,ty).
export function findPath(world, sx, sy, goal, tx, ty, maxNodes = 12000) {
  curStamp++;
  const heap = new Heap();
  const start = sy * W + sx;
  stamp[start] = curStamp; gScore[start] = 0; came[start] = -1;
  heap.push(start, 0);
  let best = start, bestH = Infinity, found = -1, n = 0;
  const h = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  while (heap.size && n++ < maxNodes) {
    const cur = heap.pop();
    const cx = cur % W, cy = (cur / W) | 0;
    if (goal(cx, cy)) { found = cur; break; }
    const hh = h(cx, cy);
    if (hh < bestH || (hh === bestH && gScore[cur] < gScore[best])) { bestH = hh; best = cur; }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (!world.canStep(cx, cy, nx, ny)) continue;
      const ni = ny * W + nx;
      const g = gScore[cur] + (dx && dy ? 1.001 : 1);
      if (stamp[ni] === curStamp && g >= gScore[ni]) continue;
      stamp[ni] = curStamp; gScore[ni] = g; came[ni] = cur;
      heap.push(ni, g + h(nx, ny));
    }
  }
  const end = found >= 0 ? found : best;
  const path = [];
  for (let c = end; c !== start && c >= 0; c = came[c]) path.push([c % W, (c / W) | 0]);
  path.reverse();
  return { path, reached: found >= 0 };
}

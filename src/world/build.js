// Map-building helpers shared by the overworld generator and the dungeons.
import { T, TINFO } from './map.js';
import { valueNoise, hash2 } from '../util.js';

export function makeBuilder(w, R) {
  const W = w.W, H = w.H;
  const reserved = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const reserve = (x, y, ww = 1, hh = 1) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (inb(i, j)) reserved[idx(i, j)] = 1; };
  const setT = (x, y, t) => { if (inb(x, y)) w.ground[idx(x, y)] = t; };
  const getT = (x, y) => w.t(x, y);

  const area = (name, x0, y0, x1, y1, music) => { w.areas.push({ id: w.areas.length + 1, name, x0, y0, x1, y1, music }); };
  // Stamp area ids onto tiles; earlier areas win where they overlap.
  const applyAreas = () => {
    for (const a of w.areas) for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) if (inb(x, y) && !w.area[idx(x, y)]) w.area[idx(x, y)] = a.id;
  };

  const place = (type, x, y, extra) => {
    const o = w.addObject(type, x, y, extra);
    if (o) reserve(x, y, o.w, o.h);
    return o;
  };
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t); };
  const building = (x, y, ww, hh, o = {}) => {
    const wall = o.wall ?? T.WALL, floor = o.floor ?? T.WOOD;
    for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) {
      const edge = i === 0 || j === 0 || i === ww - 1 || j === hh - 1;
      setT(x + i, y + j, edge ? wall : floor);
    }
    reserve(x - 1, y - 1, ww + 2, hh + 2);
    for (const [dx, dy] of o.doors || []) {
      setT(x + dx, y + dy, floor);
      const vert = dx === 0 || dx === ww - 1;
      w.addObject(o.gate ? 'gate' : 'door', x + dx, y + dy, { vert });
      // clear the outside step
      const ox = x + dx + (dx === 0 ? -1 : dx === ww - 1 ? 1 : 0), oy = y + dy + (dy === 0 ? -1 : dy === hh - 1 ? 1 : 0);
      if (TINFO[getT(ox, oy)].block && !TINFO[getT(ox, oy)].wall) setT(ox, oy, T.DIRT);
    }
    for (const [dx, dy] of o.open || []) setT(x + dx, y + dy, floor);
  };
  const fenceLine = (x0, y0, x1, y1, gates = []) => {
    const pts = [];
    if (y0 === y1) for (let x = x0; x <= x1; x++) pts.push([x, y0]);
    else for (let y = y0; y <= y1; y++) pts.push([x0, y]);
    for (const [x, y] of pts) {
      if (gates.some(([gx, gy]) => gx === x && gy === y)) { w.addObject('gate', x, y, { vert: x0 === x1 }); continue; }
      if (w.obj(x, y)) continue;
      w.addObject('fence', x, y); reserve(x, y);
    }
  };
  const fenceRect = (x0, y0, x1, y1, gates = []) => {
    reserve(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    fenceLine(x0, y0, x1, y0, gates); fenceLine(x0, y1, x1, y1, gates);
    fenceLine(x0, y0 + 1, x0, y1 - 1, gates); fenceLine(x1, y0 + 1, x1, y1 - 1, gates);
  };
  const npc = (id, x, y, extra = {}) => w.spawns.push({ npc: id, x, y, ...extra });
  const walkable = (x, y) => inb(x, y) && !w.blocked(x, y);
  const spawnIn = (id, n, cx, cy, r, extra = {}, ok = () => true) => {
    let tries = 0;
    while (n > 0 && tries++ < 500) {
      const x = Math.round(cx + (R() * 2 - 1) * r), y = Math.round(cy + (R() * 2 - 1) * r);
      if (!walkable(x, y) || getT(x, y) === T.OCEAN || !ok(x, y)) continue;
      npc(id, x, y, extra); n--;
    }
  };
  const icon = (type, x, y) => w.mapIcons.push({ type, x, y });

  const carve = (pts, width, t = T.WATER, keep = (tt) => tt !== T.OCEAN && tt !== T.VOID) => {
    for (let s = 0; s + 1 < pts.length; s++) {
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let k = 0; k <= len * 2; k++) {
        const f = k / (len * 2);
        const cx = x0 + (x1 - x0) * f + (valueNoise(k * 0.08 + s * 3, 0, 50) - 0.5) * 3, cy = y0 + (y1 - y0) * f + (valueNoise(0, k * 0.08 + s * 3, 51) - 0.5) * 3;
        const r = width * (0.85 + valueNoise(k * 0.1, s, 52) * 0.3);
        for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++)
          for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++)
            if ((i - cx) ** 2 + (j - cy) ** 2 <= r * r && inb(i, j) && keep(getT(i, j))) setT(i, j, t);
      }
    }
  };
  const blob = (cx, cy, r, t, amp = 0.35, pred = () => true) => {
    for (let j = Math.floor(cy - r - 3); j <= cy + r + 3; j++)
      for (let i = Math.floor(cx - r - 3); i <= cx + r + 3; i++) {
        if (!inb(i, j)) continue;
        const d = Math.hypot(i - cx, j - cy) / r;
        if (d < 1 + (valueNoise(i / 3, j / 3, 60 + r) - 0.5) * amp * 2 && pred(i, j)) setT(i, j, t);
      }
  };
  // Place `n` of an object at random free, walkable spots within r of (cx, cy).
  const scatter = (type, n, cx, cy, r, ok = () => true) => {
    let tries = 0;
    while (n > 0 && tries++ < 400) {
      const x = Math.round(cx + (R() * 2 - 1) * r), y = Math.round(cy + (R() * 2 - 1) * r);
      if (!walkable(x, y) || w.obj(x, y) || reserved[idx(x, y)] || !ok(x, y)) continue;
      if (place(type, x, y)) n--;
    }
  };

  return { W, H, idx, inb, reserved, reserve, setT, getT, area, applyAreas, place, fill, building, fenceLine, fenceRect, npc, walkable, spawnIn, icon, carve, blob, scatter, hash2 };
}

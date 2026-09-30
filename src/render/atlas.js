// The world map's painted atlas: the overworld drawn like an illustrated map rather than a tile dump.
// Land colours blend softly (with a little wobble so biome borders don't run ruler-straight), water
// deepens away from the shore with foam along the coast, buildings read as rooftops, forests as
// canopies. Baked once, the first time the map is opened.
import { T, TINFO } from '../world/map.js';
import { OBJECTS } from '../data/objects.js';
import { hash2, mix, shade } from '../util.js';

export const ATLAS_SCALE = 4; // pixels per tile

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PARCH = '#e8dcb8';
// land that blends softly into its neighbours
const SOFT = {
  [T.GRASS]: '#5f9340', [T.DARKGRASS]: '#4c7a33', [T.SAND]: '#d9c285', [T.SNOW]: '#eef1f2', [T.SWAMP]: '#5c663c',
  [T.ASH]: '#5b4f45', [T.ICE]: '#b9d8e8', [T.CAVE]: '#5a5048',
};
const ROAD = { [T.DIRT]: '#a2865a', [T.COBBLE]: '#9d988c' };
const ROOF_FLOORS = new Set([T.WOOD, T.STONEFLOOR, T.CARPET_RED, T.CARPET_BLUE, T.TILES, T.SANDFLOOR]);
const WATER = { [T.OCEAN]: 1, [T.WATER]: 1, [T.SWAMPWATER]: 2 };
const TREE_COL = { pine: '#2c5230', palm: '#4f8a3a', dead_tree: '#6b5b4a', swamp_tree: '#3e4a2a', magic_tree: '#3a8a86', jungle_tree: '#2b642a', heartwood: '#7a3a2a', maple: '#8a5a24', willow: '#4f7a34', yew: '#2a4a24' };

// smooth value noise, for the wobble and the relief shading
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, seed) => vnoise(x, y, seed) * 0.55 + vnoise(x * 2.1, y * 2.1, seed + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, seed + 13) * 0.15;

// Bakes in slices so the game never stalls: call bakeAtlasSoon(world) and the atlas appears on
// world.atlas when it is done. bakeAtlas(world) does it all at once.
export function bakeAtlas(w) {
  const it = atlasSteps(w);
  let r;
  do r = it.next(); while (!r.done);
  return r.value;
}
export function bakeAtlasSoon(w, done) {
  if (w.atlas || w.atlasBaking) return;
  w.atlasBaking = true;
  const it = atlasSteps(w);
  // idle time when there is some; otherwise a few milliseconds a frame, so it always finishes
  const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 60 }) : (f) => setTimeout(() => f({ timeRemaining: () => 8 }), 16);
  const work = (dl) => {
    const until = performance.now() + Math.max(6, Math.min(12, dl.timeRemaining()));
    let r;
    do r = it.next(); while (!r.done && performance.now() < until);
    if (r.done) { w.atlas = r.value; w.atlasBaking = false; done && done(); }
    else idle(work);
  };
  idle(work);
}

function* atlasSteps(w) {
  const S = ATLAS_SCALE, W = w.W, H = w.H, PW = W * S, PH = H * S;
  const g = w.ground;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.OCEAN : g[y * W + x]);

  // ---- specks of sand out at sea read as shoals, not islands
  const shoal = new Uint8Array(W * H);
  {
    const seen = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (seen[i] || WATER[g[i]] || g[i] !== T.SAND) continue;
      const comp = [i], stack = [i]; seen[i] = 1;
      while (stack.length && comp.length <= 6) {
        const k = stack.pop(), x = k % W, y = (k / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, j = ny * W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[j] || WATER[g[j]]) continue;
          seen[j] = 1; comp.push(j); stack.push(j);
        }
      }
      if (comp.length <= 6 && !stack.length) for (const k of comp) shoal[k] = 1;
    }
  }
  const isWater = (i) => WATER[g[i]] || shoal[i];

  // ---- water depth: distance (in tiles) from the nearest land, up to 12 (two-pass chamfer, so the
  // depth bands follow the coast instead of forming diamonds)
  const dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = isWater(i) ? 99 : 0;
  const D1 = 1, D2 = 1.41;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let v = dist[i];
    if (!v) continue;
    if (x > 0) v = Math.min(v, dist[i - 1] + D1);
    if (y > 0) { v = Math.min(v, dist[i - W] + D1); if (x > 0) v = Math.min(v, dist[i - W - 1] + D2); if (x < W - 1) v = Math.min(v, dist[i - W + 1] + D2); }
    dist[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; let v = dist[i];
    if (!v) continue;
    if (x < W - 1) v = Math.min(v, dist[i + 1] + D1);
    if (y < H - 1) { v = Math.min(v, dist[i + W] + D1); if (x < W - 1) v = Math.min(v, dist[i + W + 1] + D2); if (x > 0) v = Math.min(v, dist[i + W - 1] + D2); }
    dist[i] = v;
  }
  const depthAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 12 : Math.min(12, dist[y * W + x]));

  yield;
  // ---- wobble and relief, worked out per tile corner and blended per pixel (much cheaper than per pixel)
  const GW = W + 1;
  const warpX = new Float32Array(GW * (H + 1)), warpY = new Float32Array(GW * (H + 1)), relief = new Float32Array(GW * (H + 1));
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
    const i = y * GW + x;
    warpX[i] = (vnoise(x * 0.09, y * 0.09, 31) - 0.5) * 6 + (vnoise(x * 0.35, y * 0.35, 33) - 0.5) * 1.6;
    warpY[i] = (vnoise(x * 0.09, y * 0.09, 47) - 0.5) * 6 + (vnoise(x * 0.35, y * 0.35, 49) - 0.5) * 1.6;
    relief[i] = 1 + (fbm((x - 0.6) * 0.12, (y - 0.6) * 0.12, 11) - fbm((x + 0.6) * 0.12, (y + 0.6) * 0.12, 11)) * 0.9 + (fbm(x * 0.5, y * 0.5, 2) - 0.5) * 0.08;
  }
  const grid = (arr, fx, fy) => {
    const x0 = Math.min(W - 1, Math.max(0, Math.floor(fx))), y0 = Math.min(H - 1, Math.max(0, Math.floor(fy))), u = fx - x0, v = fy - y0, i = y0 * GW + x0;
    return arr[i] * (1 - u) * (1 - v) + arr[i + 1] * u * (1 - v) + arr[i + GW] * (1 - u) * v + arr[i + GW + 1] * u * v;
  };

  yield;
  // ---- rooftops: each connected patch of indoor floor is one building with its own roof colour
  const roofId = new Int32Array(W * H).fill(-1);
  const roofCol = [];
  for (let i = 0; i < W * H; i++) {
    if (roofId[i] >= 0 || !ROOF_FLOORS.has(g[i])) continue;
    const id = roofCol.length, stack = [i];
    roofId[i] = id;
    let n = 0, sx = 0, sy = 0;
    while (stack.length) {
      const k = stack.pop(), x = k % W, y = (k / W) | 0; n++; sx += x; sy += y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || roofId[j] >= 0 || !ROOF_FLOORS.has(g[j])) continue;
        roofId[j] = id; stack.push(j);
      }
    }
    const cx = Math.round(sx / n), cy = Math.round(sy / n);
    // roof palette follows the land around the building
    const land = at(cx, cy - 6) === T.SAND || at(cx, cy + 6) === T.SAND ? 'desert' : at(cx, cy - 6) === T.SNOW || at(cx, cy + 6) === T.SNOW ? 'frost' : 'kingdom';
    const pal = { kingdom: ['#9a4b35', '#8a5a3a', '#7d4a3e', '#6f6a73'], desert: ['#c9a56a', '#b98f58', '#d4b27a'], frost: ['#6f7f8e', '#8a95a0'] }[land];
    roofCol.push(rgb(pal[Math.floor(hash2(cx, cy, 91) * pal.length)]));
  }

  const soft = {};
  for (const k of Object.keys(SOFT)) soft[k] = rgb(mix(SOFT[k], PARCH, 0.1));
  const road = {}; for (const k of Object.keys(ROAD)) road[k] = rgb(ROAD[k]);
  const deep = rgb('#2b5689'), shallow = rgb('#5e9dcb'), river = rgb('#4f8cc2'), bog = rgb('#46583a');
  const wallC = { [T.WALL]: '#8d877c', [T.WALL_WOOD]: '#7a5a3a', [T.WALL_SAND]: '#c8b080', [T.CAVE_WALL]: '#6b6158', [T.WALL_DARK]: '#77726a', [T.WALL_ICE]: '#cfe6f2' };

  const c = document.createElement('canvas'); c.width = PW; c.height = PH;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(PW, PH), d = img.data;
  yield;
  const softAt = (tx, ty, fallback) => soft[at(tx, ty)] || fallback;

  for (let py = 0; py < PH; py++) {
    if (py % 8 === 0) yield;
    const fy = (py + 0.5) / S, ty = Math.floor(fy);
    for (let px = 0; px < PW; px++) {
      const fx = (px + 0.5) / S, tx = Math.floor(fx);
      const t = at(tx, ty);
      let r, gg, b;
      const sh = shoal[ty * W + tx];
      if (WATER[t] || sh) {
        // depth, blended between tile centres
        const ax = fx - 0.5, ay = fy - 0.5, x0 = Math.floor(ax), y0 = Math.floor(ay), u = ax - x0, v = ay - y0;
        const dd = depthAt(x0, y0) * (1 - u) * (1 - v) + depthAt(x0 + 1, y0) * u * (1 - v) + depthAt(x0, y0 + 1) * (1 - u) * v + depthAt(x0 + 1, y0 + 1) * u * v;
        if (t === T.SWAMPWATER) [r, gg, b] = bog;
        else if (sh) { r = (shallow[0] + soft[T.SAND][0]) / 2; gg = (shallow[1] + soft[T.SAND][1]) / 2; b = (shallow[2] + soft[T.SAND][2]) / 2; }
        else {
          const k = Math.min(1, Math.max(0, (dd - 0.6) / 7));
          const base = t === T.WATER ? river : shallow;
          r = base[0] + (deep[0] - base[0]) * k; gg = base[1] + (deep[1] - base[1]) * k; b = base[2] + (deep[2] - base[2]) * k;
          if (dd < 0.95) { r += 34; gg += 34; b += 26; } // foam along the shore
          // wave marks out at sea
          if (dd > 4 && hash2(Math.floor(px / 9), Math.floor(py / 5), 17) > 0.96 && (px % 9) < 4 && (py % 5) === 0) { r += 16; gg += 20; b += 24; }
        }
        const n = (hash2(px, py, 5) - 0.5) * 5; r += n; gg += n; b += n;
      } else if (TINFO[t].wall) {
        const [cr, cg, cb] = rgb(wallC[t] || '#8d877c');
        const lx = px % S, ly = py % S;
        const openL = !TINFO[at(tx - 1, ty)].wall, openU = !TINFO[at(tx, ty - 1)].wall, openR = !TINFO[at(tx + 1, ty)].wall, openD = !TINFO[at(tx, ty + 1)].wall;
        let k = 1;
        if ((ly === 0 && openU) || (lx === 0 && openL)) k = 1.22;
        else if ((ly === S - 1 && openD) || (lx === S - 1 && openR)) k = 0.72;
        if (t === T.CAVE_WALL) k *= 0.85 + fbm(fx * 0.3, fy * 0.3, 3) * 0.35;
        r = cr * k; gg = cg * k; b = cb * k;
      } else if (roofId[ty * W + tx] >= 0) {
        const id = roofId[ty * W + tx];
        [r, gg, b] = roofCol[id];
        const same = (x, y) => x >= 0 && y >= 0 && x < W && y < H && roofId[y * W + x] === id;
        const lx = px % S, ly = py % S;
        let k = 1;
        if (ly === 0 && !same(tx, ty - 1)) k = 1.25;
        else if (lx === 0 && !same(tx - 1, ty)) k = 1.12;
        else if (ly === S - 1 && !same(tx, ty + 1)) k = 0.7;
        else if (lx === S - 1 && !same(tx + 1, ty)) k = 0.82;
        else if (ly % 2 === 0) k = 0.94; // tiles/shingles
        r *= k; gg *= k; b *= k;
      } else if (road[t]) {
        [r, gg, b] = road[t];
        const n = (hash2(px, py, 8) - 0.5) * 10; r += n; gg += n; b += n;
        // soften the verge into the land beside it
        const lx = px % S, ly = py % S;
        const edge = (lx === 0 && !road[at(tx - 1, ty)]) || (lx === S - 1 && !road[at(tx + 1, ty)]) || (ly === 0 && !road[at(tx, ty - 1)]) || (ly === S - 1 && !road[at(tx, ty + 1)]);
        if (edge) { r *= 0.9; gg *= 0.9; b *= 0.88; }
      } else if (t === T.BRIDGE || t === T.DOCK) {
        [r, gg, b] = rgb('#8a6034');
        if ((t === T.BRIDGE ? px : py) % 2 === 0) { r *= 0.82; gg *= 0.82; b *= 0.82; }
      } else if (t === T.FARMLAND) {
        [r, gg, b] = rgb('#7a5a34');
        if (py % 2 === 0) { r *= 0.8; gg *= 0.8; b *= 0.8; } else { r += 4; gg += 14; b += 2; }
      } else if (t === T.LAVA) {
        const h = fbm(fx * 0.7, fy * 0.7, 21);
        [r, gg, b] = h > 0.55 ? rgb('#ffb040') : rgb('#e0561b');
      } else if (t === T.VOID) { r = 17; gg = 15; b = 14; }
      else if (t === T.DITCH) { [r, gg, b] = rgb('#2a231d'); }
      else {
        // soft land: sample a slightly wobbled position and blend the four nearest tile colours
        const own = soft[t] || rgb(mix(TINFO[t].map, PARCH, 0.1));
        const wx = fx + grid(warpX, fx, fy), wy = fy + grid(warpY, fx, fy);
        const ax = wx - 0.5, ay = wy - 0.5, x0 = Math.floor(ax), y0 = Math.floor(ay), u = ax - x0, v = ay - y0;
        const c00 = softAt(x0, y0, own), c10 = softAt(x0 + 1, y0, own), c01 = softAt(x0, y0 + 1, own), c11 = softAt(x0 + 1, y0 + 1, own);
        const w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
        r = c00[0] * w00 + c10[0] * w10 + c01[0] * w01 + c11[0] * w11;
        gg = c00[1] * w00 + c10[1] * w10 + c01[1] * w01 + c11[1] * w11;
        b = c00[2] * w00 + c10[2] * w10 + c01[2] * w01 + c11[2] * w11;
        // gentle relief: light from the north-west
        const k = grid(relief, fx, fy);
        r *= k; gg *= k; b *= k;
        // the coastline: a darker rim where land meets water
        const wAt = (x, y) => x < 0 || y < 0 || x >= W || y >= H || WATER[g[y * W + x]] || shoal[y * W + x];
        const nearWater = wAt(Math.floor((px - 0.5) / S), ty) || wAt(Math.floor((px + 1.5) / S), ty) || wAt(tx, Math.floor((py - 0.5) / S)) || wAt(tx, Math.floor((py + 1.5) / S));
        if (nearWater) { r = r * 0.6 + 20; gg = gg * 0.6 + 16; b = b * 0.6 + 10; }
        const n = (hash2(px, py, 6) - 0.5) * 6; r += n; gg += n; b += n;
      }
      const o = (py * PW + px) * 4;
      d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // ---- forests and rocks, painted over the ground
  for (const o of w.objects) {
    if (o.removed) continue;
    const def = OBJECTS[o.type];
    if (!def) continue;
    const cx = o.x * S + S / 2, cy = o.y * S + S / 2;
    if (def.wc) {
      const snowy = at(o.x, o.y) === T.SNOW;
      const col = TREE_COL[o.type] || (snowy ? '#3a5a4a' : '#3a6a2a');
      ctx.fillStyle = 'rgba(20,28,10,0.22)'; ctx.beginPath(); ctx.arc(cx + 0.8, cy + 1.2, 2, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 1.9, 0, 7); ctx.fill();
      ctx.fillStyle = shade(col, 0.28); ctx.fillRect(cx - 1.5, cy - 1.5, 1.5, 1);
      if (snowy) { ctx.fillStyle = '#f4f8fa'; ctx.fillRect(cx - 1, cy - 2, 2, 1); }
    } else if (def.mine) {
      ctx.fillStyle = '#6f6960'; ctx.fillRect(cx - 1.5, cy - 1, 3, 2.5);
      ctx.fillStyle = '#a8a195'; ctx.fillRect(cx - 1.5, cy - 1, 2, 1);
    }
  }
  return c;
}

// Tiny RGBA pixel buffer with drawing primitives used by all sprite generators.
import { rgb, shade } from './util.js';

export const OUTLINE = '#17110c';

export class Painter {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const [r, g, b] = typeof c === 'string' ? rgb(c) : c;
    const i = (y * this.w + x) * 4;
    if (a >= 255) { this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255; return; }
    const t = a / 255, ea = this.d[i + 3] / 255;
    const na = t + ea * (1 - t);
    this.d[i] = (r * t + this.d[i] * ea * (1 - t)) / (na || 1);
    this.d[i + 1] = (g * t + this.d[i + 1] * ea * (1 - t)) / (na || 1);
    this.d[i + 2] = (b * t + this.d[i + 2] * ea * (1 - t)) / (na || 1);
    this.d[i + 3] = na * 255;
  }
  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  getHex(x, y) {
    const i = (y * this.w + x) * 4;
    return this.d[i + 3] ? '#' + [0, 1, 2].map((k) => this.d[i + k].toString(16).padStart(2, '0')).join('') : null;
  }
  clear(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[(y * this.w + x) * 4 + 3] = 0;
  }
  rect(x, y, w, h, c, a) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.set(x, y, c); }
  line(x0, y0, x1, y1, c, a) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  ellipse(cx, cy, rx, ry, c, a) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, c, a);
      }
  }
  // Ellipse with banded lighting from the top-left for a chunky volumetric look.
  ball(cx, cy, rx, ry, base, opts = {}) {
    const hi = opts.hi ?? shade(base, 0.25), sh = opts.sh ?? shade(base, -0.25), dk = opts.dk ?? shade(base, -0.45);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const l = -nx * 0.55 - ny * 0.75 + (1 - r2) * 0.35;
        const c = l > 0.55 ? hi : l > -0.05 ? base : l > -0.55 ? sh : dk;
        this.set(x, y, c);
      }
  }
  poly(pts, c, a) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const py = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= py && y1 > py) || (y1 <= py && y0 > py)) xs.push(x0 + ((py - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, c, a);
    }
  }
  // Dark outline around every opaque region.
  outline(c = OUTLINE, diag = false) {
    const add = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y)) continue;
        if (this.alpha(x - 1, y) > 128 || this.alpha(x + 1, y) > 128 || this.alpha(x, y - 1) > 128 || this.alpha(x, y + 1) > 128 ||
          (diag && (this.alpha(x - 1, y - 1) > 128 || this.alpha(x + 1, y + 1) > 128 || this.alpha(x + 1, y - 1) > 128 || this.alpha(x - 1, y + 1) > 128)))
          add.push(x, y);
      }
    for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c);
    return this;
  }
  // Recolour every pixel through a mapping function (hex -> hex).
  remap(fn) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const h = this.getHex(x, y);
        if (h) { const n = fn(h, x, y); if (n) this.set(x, y, n); }
      }
    return this;
  }
  blit(src, ox, oy, flip = false) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (!src.d[i + 3]) continue;
        this.set(ox + (flip ? src.w - 1 - x : x), oy + y, [src.d[i], src.d[i + 1], src.d[i + 2]], src.d[i + 3]);
      }
  }
  flipped() {
    const p = new Painter(this.w, this.h);
    p.blit(this, 0, 0, true);
    return p;
  }
  canvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

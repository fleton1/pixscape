// Shared helpers: RNG, noise, colour maths, OSRS xp curve.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const sstep = (t) => t * t * (3 - 2 * t);

export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = sstep(x - xi), yf = sstep(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

export function fbm(x, y, seed = 0, oct = 4) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    sum += valueNoise(x * f, y * f, seed + i * 101) * amp;
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

const rgbCache = new Map();
export function rgb(hex) {
  let c = rgbCache.get(hex);
  if (c) return c;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  rgbCache.set(hex, c);
  return c;
}
export const toHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

// f > 0 lightens toward white, f < 0 darkens toward black
export function shade(hex, f) {
  const [r, g, b] = rgb(hex);
  if (f >= 0) return toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
  return toHex(r * (1 + f), g * (1 + f), b * (1 + f));
}
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return toHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}

// ---- OSRS experience curve ----
export const XP_TABLE = [0, 0];
{
  let pts = 0;
  for (let lvl = 1; lvl < 100; lvl++) {
    pts += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    XP_TABLE[lvl + 1] = Math.floor(pts / 4);
  }
}
export function levelForXp(xp) {
  for (let l = 99; l >= 1; l--) if (xp >= XP_TABLE[l]) return l;
  return 1;
}
export const xpForLevel = (l) => XP_TABLE[l];

export function fmtNum(n) {
  if (n >= 10000000) return Math.floor(n / 1000000) + 'M';
  if (n >= 100000) return Math.floor(n / 1000) + 'K';
  return String(n);
}
export const commas = (n) => Math.floor(n).toLocaleString('en-US');

export function pickWeighted(list, rand = Math.random) {
  let total = 0;
  for (const e of list) total += e.w;
  let r = rand() * total;
  for (const e of list) { r -= e.w; if (r <= 0) return e; }
  return list[list.length - 1];
}
export const randInt = (a, b, rand = Math.random) => a + Math.floor(rand() * (b - a + 1));
export const aOrAn = (s) => (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

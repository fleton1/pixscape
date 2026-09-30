// 16x16 procedural item icons.
import { Painter, OUTLINE } from '../painter.js';
import { shade, mix } from '../util.js';
import { ITEMS } from '../data/items.js';

const GOLD = '#e8c13a';

function diagBlade(p, x0, y0, len, color, width = 2, curve = 0) {
  const hi = shade(color, 0.4), sh = shade(color, -0.3);
  for (let t = 0; t < len; t++) {
    const c = curve ? Math.round(curve * Math.pow(t / len, 2) * 3) : 0;
    const x = x0 + t, y = y0 - t;
    p.set(x - c, y - c * 0, hi);
    if (width > 1) p.set(x + 1 - c, y, color);
    if (width > 2) p.set(x + 1 - c, y + 1, sh);
  }
}

function draw(icon, p) {
  const c = icon.color || '#888';
  const hi = shade(c, 0.3), sh = shade(c, -0.3), dk = shade(c, -0.5);
  switch (icon.kind) {
    case 'coins':
      for (const [x, y] of [[4, 10], [8, 11], [6, 7], [10, 8], [8, 5]]) { p.ellipse(x + 0.5, y + 0.5, 3, 2, '#c89a20'); p.ellipse(x + 0.5, y, 3, 1.6, GOLD); p.set(x, y - 1, '#fff2a0'); }
      break;
    case 'log':
      p.poly([[2, 10], [11, 3], [14, 6], [5, 13]], c);
      p.line(3, 10, 11, 4, shade(c, 0.25));
      p.line(5, 12, 13, 6, sh);
      p.ellipse(12.5, 4.5, 2, 2, mix(c, '#e8c890', 0.5)); p.set(12, 4, sh);
      break;
    case 'ore':
      p.ball(8, 9, 5.5, 4.5, '#5a544c');
      for (const [x, y] of [[6, 7], [9, 9], [7, 11], [10, 6]]) { p.set(x, y, c); p.set(x + 1, y, shade(c, 0.3)); }
      break;
    case 'bar':
      p.poly([[2, 10], [6, 6], [14, 6], [10, 10]], shade(c, 0.35));
      p.rect(2, 10, 8, 3, c); p.poly([[10, 10], [14, 6], [14, 9], [10, 13]], sh);
      break;
    case 'scimitar': diagBlade(p, 4, 11, 9, c, 2, 1); p.line(2, 11, 5, 14, GOLD); p.line(1, 14, 3, 12, '#5a3a1e'); if (icon.gilded) p.set(8, 8, GOLD); break;
    case 'longsword': diagBlade(p, 4, 11, 10, c, 2); p.line(2, 10, 6, 14, '#8a6a2a'); p.line(1, 15, 3, 13, '#5a3a1e'); break;
    case 'twohand': diagBlade(p, 4, 11, 11, c, 3); p.line(1, 9, 7, 15, '#8a6a2a'); p.line(0, 15, 2, 13, '#5a3a1e'); break;
    case 'battleaxe': p.line(2, 14, 12, 4, '#6a4a2a'); p.poly([[8, 3], [14, 1], [15, 8], [11, 9]], c); p.line(14, 1, 15, 8, hi); break;
    case 'axe': p.line(3, 14, 11, 5, '#6a4a2a'); p.poly([[9, 3], [13, 2], [14, 7], [11, 7]], c); p.line(13, 2, 14, 7, hi); break;
    case 'pickaxe': p.line(3, 14, 10, 6, '#6a4a2a'); p.poly([[3, 4], [8, 3], [14, 7], [15, 11], [10, 6]], c); p.line(4, 4, 8, 3, hi); break;
    case 'cleaver': p.line(2, 14, 6, 10, '#4a3a2a'); p.poly([[5, 9], [10, 3], [15, 7], [9, 12]], c); p.line(10, 3, 15, 7, hi); p.set(9, 7, '#8a2020'); break;
    case 'maul': p.line(2, 14, 10, 6, '#c8c0a0'); p.poly([[7, 5], [11, 1], [15, 5], [11, 9]], c); p.line(11, 1, 15, 5, '#f0ead0'); break;
    case 'fang': diagBlade(p, 4, 11, 10, c, 2, 1.5); p.line(1, 14, 4, 11, '#3a1a10'); p.set(9, 6, '#ffd060'); p.set(12, 3, '#ffd060'); break;
    case 'fullhelm': case 'medhelm':
      p.ball(8, 8, 5.5, 5.5, c);
      p.rect(3, 12, 11, 2, sh);
      if (icon.kind === 'fullhelm') { p.rect(5, 8, 7, 1, '#1a1a1a'); p.rect(7, 9, 3, 3, '#1a1a1a'); }
      else { p.rect(3, 9, 11, 5, null); for (let x = 3; x < 14; x++) for (let y = 10; y < 14; y++) p.clear(x, y); p.rect(7, 9, 3, 4, c); }
      if (icon.gilded) { p.rect(3, 12, 11, 1, GOLD); p.vline(8, 3, 7, GOLD); }
      break;
    case 'platebody': case 'chainbody': case 'leatherbody': case 'robe':
      p.poly([[3, 3], [6, 2], [10, 2], [13, 3], [15, 9], [12, 9], [12, 14], [4, 14], [4, 9], [1, 9]], c);
      p.line(6, 3, 6, 13, icon.kind === 'robe' ? sh : hi);
      if (icon.kind === 'platebody') { p.hline(5, 11, 7, sh); p.rect(7, 4, 2, 3, hi); }
      if (icon.kind === 'chainbody') for (let y = 4; y < 13; y++) for (let x = 5; x < 12; x++) if ((x + y) % 2) p.set(x, y, sh);
      if (icon.kind === 'robe') { p.poly([[4, 14], [12, 14], [13, 15], [3, 15]], sh); }
      p.rect(6, 1, 4, 1, null); p.clear(7, 2); p.clear(8, 2);
      if (icon.gilded) { p.vline(8, 3, 13, GOLD); p.hline(4, 12, 13, GOLD); }
      if (icon.studs) for (const [x, y] of [[8, 5], [10, 7], [8, 9], [10, 11], [5, 11]]) p.set(x, y, '#d0d0d0');
      if (icon.scaly) for (let y = 4; y < 13; y += 2) for (let x = 5 + (y % 4 ? 1 : 0); x < 12; x += 2) p.set(x, y, hi);
      break;
    case 'platelegs': case 'chaps':
      p.rect(4, 2, 8, 3, c); p.rect(4, 5, 3, 9, c); p.rect(9, 5, 3, 9, c);
      p.vline(5, 3, 13, hi); p.vline(10, 3, 13, hi); p.hline(4, 11, 2, sh);
      if (icon.studs) for (const [x, y] of [[5, 7], [10, 7], [5, 11], [10, 11]]) p.set(x, y, '#d0d0d0');
      break;
    case 'plateskirt': p.rect(5, 2, 6, 3, c); p.poly([[5, 5], [11, 5], [13, 14], [3, 14]], c); p.line(7, 5, 6, 13, hi); p.hline(4, 12, 13, sh); break;
    case 'vambraces': for (const x of [3, 9]) { p.rect(x, 4, 4, 9, c); p.vline(x, 4, 12, hi); p.hline(x, x + 3, 4, sh); p.hline(x, x + 3, 12, sh); } break;
    case 'dagger': diagBlade(p, 6, 9, 5, c, 2); p.line(4, 9, 7, 12, GOLD); p.line(3, 13, 5, 11, '#5a3a1e'); break;
    case 'sword': diagBlade(p, 5, 10, 8, c, 2); p.line(3, 10, 6, 13, '#8a6a2a'); p.line(2, 14, 4, 12, '#5a3a1e'); break;
    case 'mace': p.line(3, 14, 10, 7, '#6a4a2a'); p.ball(11, 5, 3.5, 3.5, c); p.set(10, 4, hi); for (const [x, y] of [[11, 1], [15, 5], [8, 3], [13, 8]]) p.set(x, y, sh); break;
    case 'warhammer': p.line(2, 14, 10, 6, '#6a4a2a'); p.poly([[7, 4], [11, 0], [15, 4], [11, 8]], c); p.line(11, 0, 15, 4, hi); break;
    case 'frostblade': diagBlade(p, 4, 11, 10, c, 2, 1); p.line(1, 14, 4, 11, '#2a4a6a'); p.set(8, 7, '#e8f8ff'); p.set(11, 4, '#e8f8ff'); break;
    case 'knife': p.line(3, 13, 7, 9, '#6a4a2a'); p.line(4, 14, 8, 10, '#5a3a1a'); p.line(8, 8, 13, 3, '#d0d0d0'); p.line(9, 9, 14, 4, '#9a9a9a'); break;
    case 'shaft': for (let i = 0; i < 3; i++) p.line(2 + i * 2, 14, 12 + i * 2, 2, '#b08850'); break;
    case 'arrow':
      for (let i = 0; i < (icon.headless ? 3 : 3); i++) {
        const o = i * 2;
        p.line(2 + o, 14, 11 + o, 4, '#a07840');
        p.set(2 + o, 13, '#e8e8e8'); p.set(3 + o, 14, '#e8e8e8'); p.set(1 + o, 14, '#d84a4a');
        if (!icon.headless) { p.set(12 + o, 3, c); p.set(13 + o, 2, hi); p.set(11 + o, 3, c); p.set(12 + o, 4, c); }
      }
      break;
    case 'arrowtips': for (const [x, y] of [[4, 5], [9, 4], [6, 10], [11, 9]]) p.poly([[x, y - 2], [x + 2, y + 1], [x - 2, y + 1]], c); break;
    case 'darttip': for (const [x, y] of [[5, 6], [10, 5], [7, 11]]) { p.line(x - 1, y + 2, x + 1, y - 2, c); p.set(x + 1, y - 2, hi); } break;
    case 'dart': for (const [x, y] of [[3, 12], [7, 9]]) { p.line(x, y, x + 5, y - 5, c); p.set(x + 5, y - 5, hi); p.set(x - 1, y + 1, '#e8e8e8'); p.set(x, y + 1, '#e8e8e8'); } break;
    case 'shortbow': case 'longbow': {
      const long = icon.kind === 'longbow';
      const pts = long ? [[3, 1], [7, 3], [10, 7], [12, 11], [13, 15]] : [[4, 2], [8, 4], [10, 8], [11, 12], [11, 14]];
      for (let i = 0; i + 1 < pts.length; i++) { p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c); p.line(pts[i][0] - 1, pts[i][1], pts[i + 1][0] - 1, pts[i + 1][1], sh); }
      if (!icon.unstrung) p.line(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1], '#e8e0c8');
      break;
    }
    case 'stock': p.line(2, 13, 11, 4, c); p.line(3, 13, 12, 4, sh); p.line(2, 14, 4, 12, sh); p.rect(9, 5, 2, 2, dk); break;
    case 'limbs': p.line(2, 10, 8, 6, c); p.line(8, 6, 14, 10, c); p.line(2, 11, 8, 7, sh); p.line(8, 7, 14, 11, sh); break;
    case 'crossbow': p.line(2, 14, 11, 5, '#6a4a2a'); p.line(3, 14, 12, 5, '#5a3a1a'); p.line(5, 3, 14, 12, c); p.line(6, 3, 15, 12, sh); if (!icon.unstrung) p.line(5, 4, 13, 12, '#e8e0c8'); break;
    case 'bolt': for (const [x, y] of [[3, 12], [6, 9], [9, 6]]) { p.line(x, y, x + 4, y - 4, '#8a6a4a'); p.set(x + 4, y - 4, c); p.set(x + 5, y - 5, hi); if (!icon.unf) p.set(x - 1, y + 1, '#d8d8d8'); } break;
    case 'studs': for (const [x, y] of [[4, 5], [9, 4], [6, 9], [11, 9], [8, 13]]) { p.ball(x, y, 1.8, 1.8, '#9aa0a8'); p.set(x - 1, y - 1, '#e0e4e8'); } break;
    case 'lump': p.ball(8, 10, 5.5, 4, c); p.ball(6, 8, 2.5, 2, shade(c, 0.2)); if (icon.glass) { p.set(6, 7, '#ffffff'); p.ellipse(10, 11, 1.5, 1, '#e8ffff'); } break;
    case 'jug': p.poly([[5, 4], [11, 4], [13, 8], [12, 14], [4, 14], [3, 8]], '#b8a888'); p.rect(6, 2, 4, 2, '#a89878'); p.line(13, 6, 14, 10, '#a89878'); if (icon.color) p.ellipse(8, 5, 2.5, 1, icon.color); break;
    case 'dough': p.ball(8, 10, 6, 3.5, c); p.ellipse(7, 9, 3, 1.2, shade(c, 0.15)); break;
    case 'pizza': p.ellipse(8, 9, 7, 5, '#d8a860'); p.ellipse(8, 9, 5.5, 3.8, icon.plain ? '#e8d8b0' : c); if (icon.cheese) for (const [x, y] of [[6, 8], [9, 7], [10, 10], [5, 10]]) p.set(x, y, '#f8e070'); if (icon.top) for (const [x, y] of [[7, 9], [10, 8], [8, 11]]) p.set(x, y, icon.top); if (icon.burnt) p.ellipse(8, 9, 6, 4, '#2a2420'); break;
    case 'pie': p.ellipse(8, 10, 7, 4, icon.burnt ? '#2a2420' : '#c89a5a'); p.ellipse(8, 9, 5.5, 3, icon.burnt ? '#1a1410' : icon.empty ? '#8a6a3a' : icon.raw ? mix(c, '#f0e0c0', 0.3) : c); if (!icon.empty && !icon.burnt && !icon.raw) { p.line(5, 8, 11, 8, '#e0b870'); p.line(6, 10, 10, 10, '#e0b870'); } break;
    case 'piedish': p.ellipse(8, 10, 7, 4, icon.unfired ? '#c8a888' : '#a0603a'); p.ellipse(8, 9, 5, 2.5, icon.unfired ? '#b09070' : '#7a4a2a'); break;
    case 'potato': p.ball(8, 9, 5.5, 4, '#b8905a'); for (const [x, y] of [[6, 8], [10, 10], [9, 7]]) p.set(x, y, '#7a5a30'); break;
    case 'tomato': p.ball(8, 9, 5, 4.5, '#d8302a'); p.set(6, 7, '#ff8a80'); p.poly([[6, 4], [8, 6], [10, 4], [8, 5]], '#3a8a2a'); break;
    case 'cheese': p.poly([[2, 11], [13, 5], [14, 11], [3, 14]], '#f0c840'); p.line(2, 11, 13, 5, '#f8e070'); for (const [x, y] of [[7, 10], [11, 9], [5, 12]]) p.set(x, y, '#c89a20'); break;
    case 'chocolate': p.rect(3, 4, 10, 8, '#5a3018'); for (let x = 5; x < 13; x += 3) p.vline(x, 4, 11, '#3a1a08'); p.hline(3, 12, 8, '#3a1a08'); p.rect(3, 9, 10, 4, '#b02a2a'); break;
    case 'caketin': p.ellipse(8, 11, 6.5, 3, '#9a9a98'); p.rect(2, 7, 13, 4, '#8a8a88'); p.ellipse(8, 7, 6.5, 2.5, icon.burnt ? '#2a2420' : icon.raw ? '#f0e0b0' : '#6a6a68'); break;
    case 'seaweed': for (let i = 0; i < 3; i++) p.line(5 + i * 3, 14, 4 + i * 3 + (i % 2 ? 2 : -1), 3, i % 2 ? '#3a6a2a' : '#4a7a3a'); break;
    case 'powder': p.ellipse(8, 11, 6, 3.5, c); p.ellipse(8, 10, 4, 2, shade(c, 0.2)); p.set(6, 9, shade(c, 0.4)); break;
    case 'pipe': p.line(2, 14, 13, 3, '#8a8a88'); p.line(3, 14, 14, 3, '#6a6a68'); p.ellipse(14, 2, 1.5, 1.5, '#b0b0b0'); break;
    case 'glass': p.rect(5, 3, 6, 11, '#c8e8f0', 170); p.vline(6, 4, 12, '#ffffff'); p.hline(5, 10, 13, '#a8c8d0'); break;
    case 'vial': p.rect(7, 2, 2, 3, '#a8c8d0'); p.ball(8, 10, 3.5, 4, '#d0e8f0', { a: 200 }); p.set(7, 8, '#ffffff'); break;
    case 'orb': p.ball(8, 8, 5.5, 5.5, icon.color || '#c8e8f0'); p.ball(6, 6, 2, 2, '#ffffff'); break;
    case 'essence': p.poly([[3, 6], [7, 2], [13, 4], [14, 11], [8, 14], [2, 11]], '#c8c4d8'); p.line(4, 7, 8, 3, '#e8e4f0'); p.set(9, 8, '#ffffff'); p.line(8, 14, 14, 11, '#9890b0'); break;
    case 'rune': p.poly([[3, 4], [8, 2], [13, 4], [14, 10], [8, 14], [2, 10]], '#8a8278'); p.poly([[4, 5], [8, 3], [12, 5], [12, 9], [8, 12], [4, 9]], '#a8a098'); p.ball(8, 8, 2.6, 2.6, c); p.set(7, 7, '#ffffff'); break;
    case 'talisman': p.ball(8, 9, 5.5, 5, '#8a8278'); p.ball(8, 9, 4, 3.5, '#a8a098'); p.line(6, 7, 10, 11, c); p.line(10, 7, 6, 11, c); p.set(8, 9, '#ffffff'); p.line(5, 3, 8, 5, '#6a4a2a'); p.line(11, 3, 8, 5, '#6a4a2a'); break;
    case 'tiara': p.hline(2, 13, 10, '#c8ccd0'); p.hline(2, 13, 11, '#9aa0a8'); p.poly([[5, 10], [8, 5], [11, 10]], '#d8dce0'); p.ball(8, 8, 1.6, 1.6, icon.color || '#e8e8f0'); break;
    case 'staff':
      p.line(2, 15, 12, 5, '#6a4a2a'); p.line(3, 15, 13, 5, '#5a3a1a');
      if (!icon.plain) { p.ball(13, 3, 2.8, 2.8, c); p.set(12, 2, '#ffffff'); } else p.ball(13, 4, 1.8, 1.8, '#8a6a4a');
      break;
    case 'lantern': p.rect(5, 5, 6, 9, '#6a6a68'); p.rect(6, 6, 4, 7, icon.empty ? '#a8c8d0' : icon.lit ? '#ffd860' : '#e8e0c0'); p.hline(4, 11, 4, '#4a4a48'); p.hline(4, 11, 14, '#4a4a48'); p.line(6, 4, 8, 1, '#4a4a48'); p.line(10, 4, 8, 1, '#4a4a48'); if (icon.lit) p.set(8, 8, '#ff8020'); break;
    case 'candle': p.rect(6, 6, 4, 9, '#f0ece0'); p.vline(6, 6, 14, '#ffffff'); p.set(8, 5, '#3a3a3a'); if (icon.lit) { p.ball(8, 3, 1.5, 2, '#ffb020'); p.set(8, 3, '#fff0a0'); } break;
    case 'shears': p.line(3, 3, 11, 11, '#b0b0b0'); p.line(3, 11, 11, 3, '#9a9a9a'); p.ball(12, 12, 2, 2, '#2a4ab0'); p.ball(12, 2, 2, 2, '#2a4ab0'); break;
    case 'wool': if (icon.ball) { p.ball(8, 8, 5.5, 5.5, '#f0ece0'); p.line(4, 6, 12, 9, '#c8c0b0'); p.line(5, 10, 11, 5, '#c8c0b0'); } else { p.ball(6, 9, 4, 3.5, '#f0ece0'); p.ball(10, 7, 4, 3.5, '#f4f0e8'); p.ball(10, 11, 3, 2.5, '#e8e4d8'); } break;
    case 'flax': p.line(8, 15, 8, 5, '#6a8a3a'); p.line(8, 9, 5, 4, '#6a8a3a'); p.line(8, 8, 11, 3, '#6a8a3a'); for (const [x, y] of [[8, 4], [5, 3], [11, 2]]) p.ball(x, y, 1.5, 1.5, '#6a8ad8'); break;
    case 'string': p.ellipse(8, 8, 5, 5, '#e8e0c8'); p.ellipse(8, 8, 3.5, 3.5, null); for (let y = 5; y < 12; y++) for (let x = 5; x < 12; x++) { const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8); if (d < 3.3) p.clear(x, y); } break;
    case 'needle': p.line(3, 13, 13, 3, '#c0c0c0'); p.set(12, 3, '#1a1a1a'); break;
    case 'thread': p.ball(8, 9, 4, 5, '#e8e0c8'); p.rect(4, 3, 8, 2, '#8a5a2a'); p.rect(4, 13, 8, 2, '#8a5a2a'); break;
    case 'bignet': for (let i = 0; i < 7; i++) { p.line(2 + i * 2, 2, 2 + i * 2, 13, '#b8a880'); p.line(2, 2 + i * 2, 14, 2 + i * 2, '#b8a880'); } p.hline(2, 14, 2, '#6a4a2a'); break;
    case 'necklace': p.ellipse(8, 7, 5, 5.5, '#c89a20'); p.ellipse(8, 7, 4, 4.5, null); for (let y = 2; y < 12; y++) for (let x = 4; x < 13; x++) { const nx = (x + 0.5 - 8) / 4, ny = (y + 0.5 - 7) / 4.5; if (nx * nx + ny * ny < 1) p.clear(x, y); } p.ball(8, 12, 2, 2, c === '#888' ? GOLD : c); break;
    case 'bracelet': p.ellipse(8, 9, 6, 3.5, GOLD); p.ellipse(8, 9, 4, 2, null); for (let y = 7; y < 12; y++) for (let x = 4; x < 13; x++) { const nx = (x + 0.5 - 8) / 4, ny = (y + 0.5 - 9) / 2; if (nx * nx + ny * ny < 1) p.clear(x, y); } if (icon.color) p.ball(8, 6.5, 1.8, 1.5, icon.color); break;
    case 'kiteshield': case 'antidragon': case 'dfs':
      p.poly([[3, 2], [13, 2], [13, 8], [8, 15], [3, 8]], icon.kind === 'dfs' ? '#3a3a42' : icon.kind === 'antidragon' ? '#7a7a80' : c);
      p.hline(3, 12, 2, hi); p.line(3, 3, 3, 8, hi);
      if (icon.kind === 'antidragon') { p.rect(7, 5, 3, 3, '#3a8a3a'); p.set(9, 5, '#e8c040'); }
      else if (icon.kind === 'dfs') { p.ball(8, 7, 2.5, 3, '#e8702a'); p.set(8, 6, '#ffe08a'); }
      else { p.vline(8, 4, 12, sh); p.hline(5, 11, 6, sh); }
      break;
    case 'sqshield': p.rect(3, 2, 10, 12, c); p.hline(3, 12, 2, hi); p.vline(3, 2, 13, hi); p.rect(7, 6, 2, 4, sh); break;
    case 'woodshield': p.ball(8, 8, 6, 6, '#8a5a2b'); p.ellipse(8, 8, 1.5, 1.5, '#b0b0b0'); p.hline(3, 13, 6, '#6a4020'); p.hline(3, 13, 10, '#6a4020'); break;
    case 'gloves': p.rect(4, 4, 5, 8, c); p.rect(9, 7, 2, 3, c); p.rect(4, 11, 5, 3, sh); p.vline(5, 4, 10, hi); break;
    case 'boots': p.rect(3, 3, 4, 8, c); p.rect(3, 10, 8, 3, c); p.vline(4, 3, 11, hi); p.hline(3, 10, 13, sh); p.rect(9, 5, 3, 5, sh); p.rect(9, 9, 5, 3, sh); break;
    case 'coif': p.ball(8, 8, 5.5, 6, c); p.ellipse(8, 9, 3, 3.5, '#e0b088'); break;
    case 'chefhat': p.ball(8, 5, 5, 4, '#f8f8f8'); p.rect(4, 7, 8, 6, '#f0f0f0'); p.hline(4, 11, 12, '#c8c8c8'); break;
    case 'wizhat': p.poly([[8, 1], [12, 12], [4, 12]], c); p.rect(1, 12, 14, 2, c); p.set(8, 7, GOLD); p.line(8, 1, 5, 11, hi); break;
    case 'beret': p.ellipse(8, 9, 7, 3.5, c); p.rect(7, 4, 2, 2, c); p.hline(3, 12, 8, hi); break;
    case 'partyhat': p.poly([[8, 1], [14, 13], [2, 13]], c); p.line(8, 1, 3, 12, hi); p.set(8, 7, shade(c, 0.6)); break;
    case 'crown': p.rect(2, 7, 12, 6, GOLD); p.poly([[2, 7], [2, 2], [5, 6], [8, 1], [11, 6], [14, 2], [14, 7]], GOLD); p.set(8, 9, '#d82a2a'); p.set(4, 10, '#2a5ad8'); p.set(12, 10, '#2ab04a'); break;
    case 'cape': p.poly([[5, 1], [11, 1], [14, 15], [2, 15]], c); p.line(5, 1, 3, 14, hi); p.line(11, 1, 13, 14, sh); break;
    case 'gem': p.poly([[4, 6], [6, 3], [10, 3], [12, 6], [8, 13]], c); p.hline(4, 12, 6, shade(c, 0.4)); p.set(6, 4, '#ffffff'); p.line(8, 6, 8, 12, sh); break;
    case 'uncut': p.ball(8, 9, 5, 4, c); p.set(6, 7, '#ffffff'); p.set(10, 11, dk); break;
    case 'ring': p.ellipse(8, 10, 5, 4, GOLD); p.ellipse(8, 10, 3, 2.2, null); for (let y = 8; y < 13; y++) for (let x = 5; x < 12; x++) { const nx = (x + 0.5 - 8) / 3, ny = (y + 0.5 - 10) / 2.2; if (nx * nx + ny * ny <= 1) p.clear(x, y); } if (icon.color) p.ball(8, 5, 2, 2, icon.color); break;
    case 'amulet': p.line(3, 1, 7, 9, '#c89a20'); p.line(13, 1, 9, 9, '#c89a20'); p.ball(8, 11, 3, 3, GOLD); if (icon.color) p.ball(8, 11, 1.8, 1.8, icon.color); break;
    case 'locket': p.line(3, 1, 7, 8, '#c89a20'); p.line(13, 1, 9, 8, '#c89a20'); p.ball(8, 11, 3.5, 3.5, GOLD); p.set(8, 11, '#8a6a20'); break;
    case 'potion':
      p.rect(6, 2, 4, 2, '#8a6a4a'); p.rect(7, 4, 2, 2, '#c8e0e8');
      p.ball(8, 10, 5, 4.8, '#d0e8f0'); p.ball(8, 11, 4.2, 3.6, c); p.set(6, 8, '#ffffff');
      break;
    case 'fish': case 'shrimp': case 'lobster': {
      const cc = icon.burnt ? '#2a2420' : icon.raw ? c : mix(c, '#b07030', 0.45);
      if (icon.kind === 'fish') {
        p.ball(7, 8, 5.5, 3, cc); p.poly([[12, 8], [15, 5], [15, 11]], shade(cc, -0.15));
        p.set(3, 7, '#1a1a1a'); p.hline(4, 9, 9, shade(cc, 0.25));
      } else if (icon.kind === 'shrimp') {
        for (let i = 0; i < 4; i++) p.ball(5 + i * 2, 6 + Math.abs(i - 1.5) * 1.5 + i, 2, 1.8, i % 2 ? shade(cc, -0.1) : cc);
        p.line(4, 5, 1, 2, shade(cc, -0.2)); p.set(4, 6, '#1a1a1a');
      } else {
        p.ball(9, 9, 3, 4.5, cc); p.ball(4, 4, 2.5, 2, cc); p.ball(12, 4, 2.5, 2, cc);
        p.line(6, 6, 8, 7, cc); p.line(11, 6, 10, 7, cc); p.poly([[7, 13], [11, 13], [12, 15], [6, 15]], shade(cc, -0.15));
      }
      break;
    }
    case 'meat': p.ball(8, 8, 5.5, 4.5, c); p.ellipse(9, 7, 2, 1.5, shade(c, 0.3)); p.ellipse(4, 10, 1.5, 1.5, '#f0e8d8'); break;
    case 'drumstick': p.ball(9, 7, 4.5, 4, c); p.line(6, 10, 3, 13, '#f0e8d8'); p.set(2, 13, '#f0e8d8'); p.set(3, 14, '#f0e8d8'); break;
    case 'bread': p.ball(8, 9, 6, 4, icon.burnt ? '#2a2018' : '#c8883a'); p.line(5, 7, 6, 8, '#8a5a20'); p.line(8, 6, 9, 8, '#8a5a20'); p.line(11, 7, 12, 8, '#8a5a20'); break;
    case 'cake': p.rect(3, 7, 10, 6, icon.choc ? '#6a3a1a' : '#e8c890'); p.rect(3, 6, 10, 2, icon.choc ? '#4a2008' : '#f8f0f0'); p.rect(3, 10, 10, 1, '#d84a6a'); p.set(8, 4, '#d82a2a'); p.set(8, 5, '#2a8a2a'); break;
    case 'berries': for (const [x, y] of [[6, 8], [9, 7], [8, 10], [11, 10], [5, 11]]) { p.ball(x, y, 1.8, 1.8, c); p.set(x - 1, y - 1, '#ffa0a0'); } p.line(9, 3, 9, 6, '#3a6a2a'); break;
    case 'banana': p.poly([[3, 4], [5, 4], [8, 10], [13, 11], [12, 13], [6, 12]], '#f0d040'); p.set(3, 3, '#5a4a20'); break;
    case 'bowl': p.ellipse(8, 9, 6, 4, '#8a5a30'); p.ellipse(8, 8, 5, 2, c); p.set(6, 8, '#e8b060'); break;
    case 'bones':
      p.line(3, 12, 12, 3, icon.color || '#e8e4d8'); p.line(4, 12, 13, 3, icon.color || '#e8e4d8');
      for (const [x, y] of [[2, 12], [3, 13], [12, 2], [13, 3]]) p.ball(x + 0.5, y + 0.5, icon.big ? 2 : 1.5, icon.big ? 2 : 1.5, icon.color || '#f0ece0');
      if (icon.big) p.line(5, 12, 14, 3, '#d8d0c0');
      break;
    case 'ashes': p.ellipse(8, 11, 6, 3, '#5a5650'); p.ellipse(8, 10, 4, 2, '#7a766e'); p.set(6, 9, '#9a968e'); break;
    case 'tinderbox': p.rect(3, 5, 10, 7, '#8a6a4a'); p.rect(3, 5, 10, 2, '#a88a6a'); p.rect(11, 8, 2, 2, '#c0c0c0'); break;
    case 'net': for (let i = 0; i < 5; i++) { p.line(3 + i * 2, 3, 3 + i * 2, 12, '#c8b890'); p.line(3, 3 + i * 2, 11, 3 + i * 2, '#c8b890'); } p.line(11, 12, 15, 15, '#6a4a2a'); break;
    case 'rod': case 'flyrod': p.line(2, 14, 13, 2, '#6a4a2a'); p.line(13, 2, 14, 9, '#e0e0e0'); if (icon.kind === 'flyrod') p.set(14, 9, '#d82a2a'); p.rect(3, 11, 2, 2, '#4a4a4a'); break;
    case 'lobsterpot': p.ball(8, 9, 6, 5, '#8a6a3a'); for (let x = 3; x < 14; x += 2) p.vline(x, 5, 13, '#5a3a1a'); p.hline(2, 13, 9, '#5a3a1a'); break;
    case 'harpoon': p.line(2, 14, 12, 4, '#8a8a8a'); p.poly([[11, 2], [15, 1], [14, 5]], '#c8c8c8'); p.line(10, 3, 13, 6, '#c8c8c8'); p.rect(2, 12, 3, 2, '#6a4a2a'); break;
    case 'hammer': p.line(3, 14, 10, 7, '#8a5a2a'); p.poly([[7, 3], [11, 1], [14, 5], [10, 7]], '#8a8a8a'); p.line(11, 1, 14, 5, '#c0c0c0'); break;
    case 'chisel': p.line(3, 13, 7, 9, '#8a5a2a'); p.line(4, 14, 8, 10, '#8a5a2a'); p.line(8, 8, 13, 3, '#b0b0b0'); p.line(9, 9, 13, 5, '#8a8a8a'); break;
    case 'spade': p.line(3, 3, 9, 9, '#8a5a2a'); p.hline(1, 5, 3, '#8a5a2a'); p.poly([[8, 10], [11, 7], [15, 11], [12, 15]], '#9a9a9a'); p.set(12, 9, '#d0d0d0'); break;
    case 'mould_ring': case 'mould_amulet': p.rect(2, 4, 12, 9, '#8a8a88'); p.rect(2, 4, 12, 1, '#b0b0b0'); if (icon.tiara) { p.hline(4, 12, 9, '#4a4a48'); p.poly([[6, 9], [8, 6], [10, 9]], '#4a4a48'); } else if (icon.necklace) p.ellipse(8, 8.5, 4, 3, '#4a4a48'); else if (icon.bracelet) p.ellipse(8, 8.5, 4, 1.8, '#4a4a48'); else if (icon.holy) { p.vline(8, 6, 11, '#4a4a48'); p.hline(6, 10, 8, '#4a4a48'); } else if (icon.kind === 'mould_ring') p.ellipse(8, 8.5, 2.5, 2.5, '#4a4a48'); else p.ball(8, 9, 2.5, 3, '#4a4a48'); break;
    case 'bucket': case 'bucket_milk': p.poly([[3, 5], [13, 5], [12, 14], [4, 14]], '#8a8a88'); p.hline(3, 13, 5, '#b0b0b0'); p.hline(4, 12, 9, '#6a6a68'); if (icon.kind === 'bucket_milk') p.ellipse(8, 5.5, 4.5, 1.2, '#f8f8f8'); if (icon.color) p.ellipse(8, 5.5, 4.5, 1.2, icon.color); p.line(3, 5, 8, 1, '#5a5a58'); p.line(13, 5, 8, 1, '#5a5a58'); break;
    case 'pot': case 'pot_flour': p.ball(8, 10, 5.5, 4.5, icon.unfired ? '#c8a888' : '#9a5a3a'); p.rect(5, 4, 6, 2, icon.unfired ? '#b09070' : '#8a4a2a'); if (icon.kind === 'pot_flour') p.ellipse(8, 5, 3, 1.2, '#f4f0e8'); break;
    case 'egg': p.ball(8, 9, 3.8, 4.8, '#f0e8d0'); p.set(6, 7, '#ffffff'); break;
    case 'grain': for (let i = 0; i < 3; i++) { p.line(5 + i * 3, 14, 6 + i * 2, 3, '#b8a040'); for (let j = 0; j < 4; j++) p.set(6 + i * 2 + (j % 2), 4 + j * 2, '#e8c860'); } break;
    case 'cloth': p.poly([[2, 5], [12, 3], [14, 11], [4, 13]], c); p.line(3, 6, 12, 4, shade(c, 0.35)); p.line(4, 9, 13, 7, sh); p.line(5, 12, 13, 10, sh); break;
    case 'hide': if (icon.scaly) { p.poly([[3, 4], [13, 3], [14, 12], [8, 14], [2, 12]], c); for (let y = 5; y < 13; y += 2) for (let x = 4 + (y % 4 ? 1 : 0); x < 13; x += 2) p.set(x, y, hi); } else { p.poly([[3, 4], [13, 3], [14, 12], [8, 14], [2, 12]], '#e8e0d0'); p.ellipse(6, 7, 2, 1.5, '#1e1e1e'); p.ellipse(11, 10, 2, 1.5, '#1e1e1e'); } break;
    case 'feather': p.line(3, 14, 12, 2, '#e8e4d8'); p.poly([[5, 11], [10, 3], [13, 3], [8, 12]], '#f4f0e8'); p.line(4, 13, 12, 3, '#c8c0b0'); break;
    case 'bait': p.ball(6, 10, 2.5, 2, '#b86a5a'); p.ball(10, 9, 2.5, 2, '#a85a4a'); p.ball(8, 6, 2.5, 2, '#c87a6a'); break;
    case 'clue': p.poly([[3, 3], [13, 2], [13, 13], [3, 14]], '#e8d8a8'); p.rect(3, 2, 10, 2, '#c8b080'); p.rect(3, 13, 10, 2, '#c8b080'); for (let y = 6; y < 12; y += 2) p.hline(5, 11, y, '#8a7a5a'); break;
    case 'casket': p.rect(2, 6, 12, 8, '#8a5a2a'); p.rect(2, 4, 12, 3, '#a06a3a'); p.hline(2, 13, 7, GOLD); p.rect(7, 7, 2, 3, GOLD); break;
    case 'lamp': p.ellipse(8, 11, 6, 2.5, GOLD); p.poly([[11, 10], [15, 7], [14, 10]], GOLD); p.ball(6, 8, 2, 1.5, '#c89a20'); p.set(15, 6, '#ffa040'); break;
    case 'tablet': p.poly([[3, 3], [13, 4], [12, 13], [4, 12]], c); p.line(5, 6, 10, 7, sh); p.line(5, 9, 9, 10, sh); p.set(8, 8, shade(c, 0.4)); break;
    case 'heart': p.ball(6, 7, 3, 3, c); p.ball(10, 7, 3, 3, c); p.poly([[3, 8], [13, 8], [8, 14]], c); p.set(6, 6, '#e0ffff'); break;
    case 'head': p.ball(7, 8, 5.5, 4.5, c); p.poly([[10, 6], [15, 8], [15, 11], [10, 11]], c); p.set(9, 7, '#ffd84a'); p.line(5, 4, 3, 1, '#e8dcc0'); p.line(7, 4, 6, 1, '#e8dcc0'); break;
    case 'flower': p.line(8, 14, 8, 8, '#3a8a3a'); for (const [x, y] of [[8, 4], [5, 6], [11, 6], [6, 9], [10, 9]]) p.ball(x, y, 2, 2, c); p.ball(8, 7, 1.5, 1.5, '#fff8c0'); break;
    case 'scroll': p.rect(3, 4, 10, 8, c); p.ellipse(3, 8, 1.5, 4, shade(c, -0.2)); p.ellipse(13, 8, 1.5, 4, shade(c, -0.2)); p.line(5, 6, 10, 9, '#8a2a2a'); p.set(10, 9, '#8a2a2a'); break;
    case 'key': p.ball(4, 5, 3, 3, c); p.ellipse(4, 5, 1, 1, null); p.clear(4, 5); p.line(6, 7, 13, 14, c); p.line(10, 11, 12, 9, c); p.line(12, 13, 14, 11, c); break;
    case 'nest': p.ellipse(8, 10, 6, 3.5, '#8a6a3a'); p.ellipse(8, 9, 4, 2, '#5a4020'); p.ball(7, 8, 1.5, 1.8, '#e8e0f0'); p.ball(10, 8, 1.5, 1.8, '#d8e8f0'); break;
    default: p.ball(8, 8, 5, 5, c);
  }
}

const iconCache = new Map();
export function itemIcon(id) {
  let c = iconCache.get(id);
  if (c) return c;
  const it = ITEMS[id];
  const p = new Painter(16, 16);
  draw(it.icon || { kind: '?' }, p);
  p.outline(OUTLINE);
  c = p.canvas();
  iconCache.set(id, c);
  return c;
}

// coin pile varies by stack size like OSRS
export function coinIcon(n) {
  const key = 'coins_' + (n >= 10000 ? 5 : n >= 1000 ? 4 : n >= 100 ? 3 : n >= 5 ? 2 : 1);
  let c = iconCache.get(key);
  if (c) return c;
  const p = new Painter(16, 16);
  const count = key.at(-1) | 0;
  const pos = [[8, 11], [5, 10], [11, 10], [7, 7], [10, 6]];
  for (let i = 0; i < count; i++) {
    const [x, y] = pos[i];
    p.ellipse(x + 0.5, y + 0.5, 3, 2, '#c89a20'); p.ellipse(x + 0.5, y, 3, 1.6, GOLD); p.set(x, y - 1, '#fff2a0');
  }
  if (count >= 5) { p.rect(2, 3, 5, 3, '#2a8a3a'); }
  p.outline(OUTLINE);
  c = p.canvas();
  iconCache.set(key, c);
  return c;
}

export function iconFor(id, qty = 1) {
  return id === 'coins' ? coinIcon(qty) : itemIcon(id);
}

export function iconURL(id, qty) {
  const key = 'url_' + id + (id === 'coins' ? '_' + (qty >= 10000 ? 5 : qty >= 1000 ? 4 : qty >= 100 ? 3 : qty >= 5 ? 2 : 1) : '');
  let u = iconCache.get(key);
  if (!u) { u = iconFor(id, qty).toDataURL(); iconCache.set(key, u); }
  return u;
}

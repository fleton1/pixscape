// Procedural UI icons: skills, side tabs, prayers, orbs.
import { Painter, OUTLINE } from '../painter.js';
import { shade } from '../util.js';

const cache = new Map();
function mk(key, w, h, fn, outline = true) {
  if (cache.has(key)) return cache.get(key);
  const p = new Painter(w, h);
  fn(p);
  if (outline) p.outline(OUTLINE);
  const url = p.canvas().toDataURL();
  cache.set(key, url);
  return url;
}

const SKILL_DRAW = {
  attack: (p) => { p.line(3, 13, 12, 4, '#c8c8c8'); p.line(4, 13, 13, 4, '#9a9a9a'); p.line(2, 10, 6, 14, '#e8c13a'); p.line(1, 15, 3, 13, '#6a4a2a'); },
  hitpoints: (p) => { p.ball(5, 6, 3.2, 3.2, '#d82020'); p.ball(10, 6, 3.2, 3.2, '#d82020'); p.poly([[2, 7], [13, 7], [7.5, 14]], '#d82020'); p.set(4, 5, '#ff9090'); },
  mining: (p) => { p.line(3, 14, 10, 7, '#8a5a2a'); p.poly([[3, 5], [8, 3], [14, 7], [15, 11], [10, 6]], '#9a9a9a'); },
  strength: (p) => { p.ball(8, 8, 5, 4, '#e0b088'); p.rect(2, 10, 5, 4, '#e0b088'); p.line(5, 7, 10, 7, '#b08058'); p.rect(12, 2, 3, 5, '#e0b088'); },
  thieving: (p) => { p.ball(8, 8, 6, 4, '#3a2a3a'); p.rect(4, 6, 3, 2, '#e8e8e8'); p.rect(9, 6, 3, 2, '#e8e8e8'); p.set(5, 7, '#1a1a1a'); p.set(10, 7, '#1a1a1a'); },
  smithing: (p) => { p.rect(2, 10, 12, 3, '#4a4a50'); p.rect(5, 13, 6, 2, '#4a4a50'); p.line(5, 9, 11, 3, '#8a5a2a'); p.poly([[9, 1], [13, 2], [12, 5], [8, 4]], '#9a9a9a'); },
  defence: (p) => { p.poly([[3, 2], [13, 2], [13, 8], [8, 15], [3, 8]], '#4a6ab0'); p.vline(8, 3, 13, '#c8c8c8'); p.hline(4, 12, 6, '#c8c8c8'); },
  crafting: (p) => { p.poly([[4, 6], [6, 3], [10, 3], [12, 6], [8, 13]], '#d82a3a'); p.hline(4, 12, 6, '#ff8a9a'); p.line(11, 12, 15, 15, '#8a5a2a'); },
  fishing: (p) => { p.ball(7, 8, 5.5, 3, '#6a9ac8'); p.poly([[12, 8], [15, 5], [15, 11]], '#4a7aa8'); p.set(3, 7, '#1a1a1a'); },
  prayer: (p) => { const c = '#f0f0e0'; p.poly([[8, 1], [10, 6], [15, 8], [10, 10], [8, 15], [6, 10], [1, 8], [6, 6]], c); p.set(8, 8, '#a0c8ff'); },
  firemaking: (p) => { p.poly([[4, 14], [3, 8], [6, 3], [7, 7], [9, 1], [12, 7], [13, 14]], '#e0501a'); p.poly([[6, 14], [7, 9], [9, 6], [10, 10], [11, 14]], '#ffc040'); },
  cooking: (p) => { p.ball(8, 5, 5, 3.5, '#f8f8f8'); p.rect(4, 6, 8, 6, '#f0f0f0'); p.hline(4, 11, 11, '#b0b0b0'); },
  woodcutting: (p) => { p.line(4, 15, 11, 5, '#8a5a2a'); p.poly([[9, 2], [14, 1], [15, 7], [11, 7]], '#9a9a9a'); p.set(3, 4, '#3a7a2a'); p.ball(4, 5, 2.5, 2.5, '#3a7a2a'); },
};
export function skillIcon(s) { return mk('sk_' + s, 16, 16, SKILL_DRAW[s]); }

const TAB_DRAW = {
  combat: (p) => { p.line(3, 3, 14, 14, '#c8c8c8'); p.line(14, 3, 3, 14, '#c8c8c8'); p.line(2, 11, 6, 15, '#e8c13a'); p.line(15, 11, 11, 15, '#e8c13a'); },
  skills: (p) => { p.rect(2, 9, 3, 6, '#3ab04a'); p.rect(7, 5, 3, 10, '#d82a2a'); p.rect(12, 2, 3, 13, '#2a5ad8'); },
  quests: (p) => { p.poly([[3, 3], [14, 2], [14, 14], [3, 15]], '#e8d8a8'); p.rect(3, 2, 11, 2, '#c8a870'); p.ball(8.5, 9, 3.5, 3.5, '#2a5ad8'); p.vline(8, 7, 9, '#fff'); p.set(8, 11, '#fff'); },
  inventory: (p) => { p.ball(8.5, 10, 6, 5.5, '#8a5a2a'); p.rect(5, 3, 7, 3, '#6a4020'); p.rect(6, 9, 5, 3, '#a8743e'); },
  equipment: (p) => { p.ball(8.5, 4, 3, 3, '#a9aeb5'); p.rect(5, 7, 7, 6, '#a9aeb5'); p.rect(3, 7, 2, 5, '#a9aeb5'); p.rect(12, 7, 2, 5, '#a9aeb5'); p.rect(6, 13, 2, 3, '#7a7e84'); p.rect(9, 13, 2, 3, '#7a7e84'); },
  prayer: (p) => SKILL_DRAW.prayer(p),
  magic: (p) => { p.rect(3, 2, 11, 13, '#2a3aa0'); p.rect(4, 3, 9, 11, '#3a4ab0'); p.poly([[8.5, 5], [10, 8], [8.5, 11], [7, 8]], '#a0d8ff'); p.vline(3, 2, 14, '#e8c13a'); },
  settings: (p) => { p.line(3, 14, 10, 7, '#9a9a9a'); p.line(4, 14, 11, 7, '#7a7a7a'); p.ball(11.5, 5.5, 3.5, 3.5, '#9a9a9a'); p.clear(13, 4); p.clear(12, 4); p.clear(13, 3); },
  log: (p) => { p.rect(3, 2, 11, 13, '#6a4020'); p.rect(4, 3, 9, 11, '#e8d8a8'); p.hline(5, 11, 5, '#8a7a5a'); p.hline(5, 11, 8, '#8a7a5a'); p.hline(5, 9, 11, '#8a7a5a'); },
};
export function tabIcon(t) { return mk('tab_' + t, 17, 17, TAB_DRAW[t]); }

const PRAYER_COLORS = { thick_skin: '#b09070', burst_str: '#c04040', clarity: '#c0a040', rock_skin: '#8a8070', superhuman: '#e04040', reflexes: '#e0c040', rapid_heal: '#e04080', steel_skin: '#a0a8b0', ultimate_str: '#ff5050', incredible: '#ffe050', protect_magic: '#6a8aff', protect_range: '#6ad06a', protect_melee: '#e0e0e0', chivalry: '#e8c13a', protect_item: '#e8c878', redemption: '#f0f0f0', preserve: '#8ae0c8' };
export function prayerIcon(id, on) {
  return mk('pr_' + id + on, 18, 18, (p) => {
    const c = PRAYER_COLORS[id] || '#fff';
    if (on) p.ellipse(9, 9, 9, 9, '#a09060');
    if (id.startsWith('protect')) {
      p.poly([[4, 3], [14, 3], [14, 9], [9, 15], [4, 9]], c);
      if (id === 'protect_melee') { p.line(6, 6, 12, 12, '#6a6a6a'); p.line(12, 6, 6, 12, '#6a6a6a'); }
      if (id === 'protect_magic') p.ball(9, 8, 2.5, 2.5, '#2a3aa0');
      if (id === 'protect_range') { p.line(6, 12, 12, 5, '#6a4a2a'); p.set(12, 5, '#c8c8c8'); }
    } else if (id.includes('skin')) { p.ball(9, 9, 5, 6, c); p.hline(5, 13, 8, shade(c, -0.3)); }
    else if (id.includes('str') || id === 'superhuman') { p.ball(9, 10, 5, 4, c); p.rect(12, 3, 3, 5, c); }
    else if (id === 'redemption') { p.ball(9, 9, 6, 6, '#e04080'); p.rect(8, 5, 2, 8, c); p.rect(5, 8, 8, 2, c); }
    else if (id === 'preserve') { p.poly([[4, 3], [14, 3], [9, 9]], c); p.poly([[4, 15], [14, 15], [9, 9]], c); p.hline(4, 14, 2, '#8a6a2a'); p.hline(4, 14, 16, '#8a6a2a'); }
    else if (id === 'rapid_heal') { p.ball(6, 7, 3, 3, c); p.ball(12, 7, 3, 3, c); p.poly([[3, 8], [15, 8], [9, 15]], c); }
    else if (id === 'chivalry') { p.poly([[3, 3], [15, 3], [15, 9], [9, 16], [3, 9]], c); p.line(9, 4, 9, 13, '#fff'); p.line(5, 7, 13, 7, '#fff'); }
    else { p.ball(9, 9, 6, 4, c); p.ball(9, 9, 2.2, 2.2, '#1a1a1a'); p.set(8, 8, '#fff'); }
  });
}

export function orbIcon(kind) {
  return mk('orb_' + kind, 16, 16, (p) => {
    if (kind === 'hp') SKILL_DRAW.hitpoints(p);
    else if (kind === 'prayer') SKILL_DRAW.prayer(p);
    else if (kind === 'run') { p.rect(4, 3, 5, 8, '#e8c080'); p.rect(4, 10, 9, 3, '#e8c080'); p.hline(4, 12, 13, '#a07840'); p.rect(3, 3, 7, 2, '#c09060'); }
    else if (kind === 'xp') { p.rect(1, 4, 14, 8, '#d8b060'); }
  });
}

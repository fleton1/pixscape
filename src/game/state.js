// Global game state shared by all modules.
export const TICK_MS = 600;

export const G = {
  world: null,
  player: null,
  npcs: [],
  npcById: new Map(),
  groundItems: [],
  projectiles: [],
  effects: [],
  telegraphs: [],
  tick: 0,
  lastTickAt: 0,
  ui: null,
  audio: null,
  settings: { music: 0.5, sfx: 0.6, zoom: 3, autoRetaliate: true, runDefault: true, xpDrops: true, particles: true, roofs: true },
  paused: false,
  hoverTile: null,
  timers: [],
  // true on phones/tablets: tap = left-click, press-and-hold = right-click, pinch = zoom
  touch: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
};

// Schedule fn to run after n ticks.
export function after(n, fn) { G.timers.push({ at: G.tick + n, fn }); }

export function msg(text, color) { G.ui && G.ui.chat(text, color); }
export function sfx(name) { G.audio && G.audio.sfx(name); }

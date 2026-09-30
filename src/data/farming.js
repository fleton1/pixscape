// Farming and Hunter data.
import { HERBS } from './items.js';

// ------------------------------------------------------------------ farming
// Crops grow in real time (minutes for the whole crop), so they keep growing while the game is shut.
//   patch: allotment | herb | tree;  plant/harvest: XP;  yield: [min, max] (trees give logs + check XP)
export const CROPS = {};
const crop = (id, o) => (CROPS[id] = { id, ...o });
[
  ['potato', 'Potato', 1, 8, 9, 10, '#b8905a'], ['onion', 'Onion', 5, 9.5, 10.5, 10, '#e8d8a8'], ['cabbage', 'Cabbage', 7, 10, 11.5, 12, '#6ab04a'],
  ['tomato', 'Tomato', 12, 12.5, 14, 14, '#d8302a'], ['sweetcorn', 'Sweetcorn', 20, 17, 19, 16, '#f0d040'], ['strawberry', 'Strawberry', 31, 26, 29, 18, '#e83a4a'],
  ['watermelon', 'Watermelon', 47, 48.5, 54.5, 22, '#3a8a3a'],
].forEach(([id, name, lvl, plant, harvest, minutes, color]) =>
  crop(id, { patch: 'allotment', name, seed: id + '_seed', lvl, plant, harvest, minutes, produce: id, yield: [3, 8], color }));
const HERB_SEED_LVL = [9, 14, 19, 26, 32, 38, 44, 50, 56, 62, 67, 73, 79, 85];
HERBS.forEach((h, i) => crop(h.id, { patch: 'herb', name: h.name, seed: h.id + '_seed', lvl: HERB_SEED_LVL[i], plant: 11 + i * 4, harvest: 12.5 + i * 6, minutes: 20, produce: 'grimy_' + h.id, yield: [3, 7], color: h.color }));
[
  ['oak', 'Oak', 15, 14, 467.3, 40, 'oak_logs'], ['willow', 'Willow', 30, 25, 1456.5, 60, 'willow_logs'], ['maple', 'Maple', 45, 45, 3403.4, 90, 'maple_logs'],
  ['yew', 'Yew', 60, 81, 7069.9, 150, 'yew_logs'], ['magic', 'Magic', 75, 145.5, 13768.3, 240, 'magic_logs'],
].forEach(([id, name, lvl, plant, check, minutes, logs]) =>
  crop(id + '_tree', { patch: 'tree', name: name + ' tree', seed: id + '_seed', lvl, plant, harvest: check, minutes, produce: logs, yield: [8, 14], color: '#3a7a2a' }));

// ------------------------------------------------------------------ hunter
//   trap: snare (birds) | box (ferrets, chinchompas) | net (butterflies, caught by hand from NPCs)
export const PREY = {
  crimson_swift: { name: 'Crimson swift', trap: 'snare', lvl: 1, xp: 34, loot: [['bones', 1], ['raw_bird_meat', 1], ['feather', 5]] },
  copper_longtail: { name: 'Copper longtail', trap: 'snare', lvl: 9, xp: 61, loot: [['bones', 1], ['raw_bird_meat', 1], ['feather', 8]] },
  cerulean_twitch: { name: 'Cerulean twitch', trap: 'snare', lvl: 11, xp: 64.6, loot: [['bones', 1], ['raw_bird_meat', 1], ['feather', 10]] },
  tropical_wagtail: { name: 'Tropical wagtail', trap: 'snare', lvl: 19, xp: 95.2, loot: [['bones', 1], ['raw_bird_meat', 1], ['feather', 15]] },
  ferret: { name: 'Ferret', trap: 'box', lvl: 27, xp: 115, loot: [['fur', 1]] },
  grey_chinchompa: { name: 'Grey chinchompa', trap: 'box', lvl: 53, xp: 198.4, loot: [['grey_chinchompa', 1]] },
  red_chinchompa: { name: 'Red chinchompa', trap: 'box', lvl: 63, xp: 265, loot: [['red_chinchompa', 1]] },
  black_chinchompa: { name: 'Black chinchompa', trap: 'box', lvl: 73, xp: 315, loot: [['black_chinchompa', 1]] },
  ruby_harvest: { name: 'Ruby harvest', trap: 'net', lvl: 15, xp: 24, color: '#d82a3a' },
  sapphire_glacialis: { name: 'Sapphire glacialis', trap: 'net', lvl: 25, xp: 34, color: '#2a5ad8' },
  snowy_knight: { name: 'Snowy knight', trap: 'net', lvl: 35, xp: 44, color: '#f0f0f8' },
  black_warlock: { name: 'Black warlock', trap: 'net', lvl: 45, xp: 54, color: '#2a2a34' },
};

// Where traps work: overworld rectangles and what lives there.
export const GROUNDS = [
  { name: "Hilda's meadow", rect: [150, 128, 196, 160], snare: 'crimson_swift' },
  { name: 'Brindlewood fields', rect: [184, 186, 236, 204], snare: 'crimson_swift' },
  { name: 'Elderglen woods', rect: [20, 176, 80, 230], snare: 'copper_longtail' },
  { name: 'Frostpeak slopes', rect: [320, 30, 380, 120], snare: 'cerulean_twitch' },
  { name: 'Tanglewood', rect: [232, 330, 346, 426], snare: 'tropical_wagtail', box: 'red_chinchompa' },
  { name: 'Vesperan Steppe', rect: [410, 150, 548, 330], box: 'grey_chinchompa', box2: 'ferret' },
  { name: 'The Wilderness', rect: [110, 10, 330, 78], box: 'black_chinchompa' },
];

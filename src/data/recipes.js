// Recipes: everything made by combining items, at a station or by hand.
//   in:      items consumed        keep:    tools needed but not used up
//   out:     item made (or [item, qty])   returns: empty containers handed back
//   station: null (use item on item) or the object type(s) it needs, e.g. 'range'
//   burn:    { item, stop } - chance to fail into `item`, falling to 0 at level `stop`
// Recipes are also what the skill guides list, so every unlock shows up there automatically.
import { DHIDES, ITEMS, BOW_WOODS, AMMO_METALS, STOCKS } from './items.js';

export const RECIPES = [];
const r = (o) => RECIPES.push({ skill: null, lvl: 1, xp: 0, in: {}, keep: [], returns: {}, station: null, ...o });

// Stations and the object types that count as them.
export const STATIONS = {
  range: ['range', 'fireplace'],
  fire: ['fire', 'campfire', 'range', 'fireplace'],
  water: ['fountain', 'well', 'sink', 'water_pump'],
  sand: ['sand_pit'],
  furnace: ['furnace'],
  spinning_wheel: ['spinning_wheel'],
  pottery_wheel: ['pottery_wheel'],
  pottery_oven: ['pottery_oven'],
  churn: ['churn'],
};

// ------------------------------------------------------------------ water & sand
for (const [empty, full] of [['jug', 'jug_of_water'], ['bucket', 'bucket_of_water'], ['bowl', 'bowl_of_water']]) r({ id: 'fill_' + full, in: { [empty]: 1 }, out: full, station: 'water', verb: 'fill', ticks: 1 });
r({ id: 'fill_sand', in: { bucket: 1 }, out: 'bucket_of_sand', station: 'sand', verb: 'fill', ticks: 1 });

// ------------------------------------------------------------------ cooking prep
const WATERS = [['jug_of_water', 'jug'], ['bucket_of_water', 'bucket'], ['bowl_of_water', 'bowl']];
for (const out of ['bread_dough', 'pastry_dough', 'pizza_base'])
  for (const [water, empty] of WATERS) r({ id: `${out}_${water}`, skill: 'cooking', in: { pot_of_flour: 1, [water]: 1 }, out, returns: { pot: 1, [empty]: 1 } });
r({ id: 'pie_shell', skill: 'cooking', in: { pastry_dough: 1, pie_dish: 1 }, out: 'pie_shell' });
r({ id: 'uncooked_redberry_pie', skill: 'cooking', lvl: 10, in: { pie_shell: 1, redberries: 1 }, out: 'uncooked_redberry_pie' });
r({ id: 'uncooked_meat_pie', skill: 'cooking', lvl: 20, in: { pie_shell: 1, cooked_meat: 1 }, out: 'uncooked_meat_pie' });
r({ id: 'uncooked_meat_pie_chicken', skill: 'cooking', lvl: 20, in: { pie_shell: 1, cooked_chicken: 1 }, out: 'uncooked_meat_pie' });
r({ id: 'incomplete_stew', skill: 'cooking', lvl: 25, in: { bowl_of_water: 1, potato: 1 }, out: 'incomplete_stew' });
r({ id: 'uncooked_stew', skill: 'cooking', lvl: 25, in: { incomplete_stew: 1, cooked_meat: 1 }, out: 'uncooked_stew' });
r({ id: 'incomplete_pizza', skill: 'cooking', lvl: 35, in: { pizza_base: 1, tomato: 1 }, out: 'incomplete_pizza' });
r({ id: 'uncooked_pizza', skill: 'cooking', lvl: 35, in: { incomplete_pizza: 1, cheese: 1 }, out: 'uncooked_pizza' });
r({ id: 'uncooked_cake', skill: 'cooking', lvl: 40, in: { cake_tin: 1, pot_of_flour: 1, egg: 1, bucket_of_milk: 1 }, out: 'uncooked_cake', returns: { pot: 1, bucket: 1 } });
r({ id: 'meat_pizza', skill: 'cooking', lvl: 45, xp: 26, in: { plain_pizza: 1, cooked_meat: 1 }, out: 'meat_pizza' });
r({ id: 'uncooked_fish_pie', skill: 'cooking', lvl: 47, in: { pie_shell: 1, trout: 1, cod: 1 }, out: 'uncooked_fish_pie' });
r({ id: 'chocolate_cake', skill: 'cooking', lvl: 50, xp: 30, in: { cake: 1, chocolate_bar: 1 }, out: 'chocolate_cake' });
r({ id: 'anchovy_pizza', skill: 'cooking', lvl: 55, xp: 39, in: { plain_pizza: 1, anchovies: 1 }, out: 'anchovy_pizza' });
r({ id: 'jug_of_wine', skill: 'cooking', lvl: 35, xp: 200, in: { jug_of_water: 1, grapes: 1 }, out: 'jug_of_wine', burn: { item: 'jug_of_bad_wine', stop: 68 }, ticks: 3 });

// ------------------------------------------------------------------ baking (range) and other cooking
const bake = (id, lvl, xp, input, stop, burnt, extra = {}) => r({ id: 'bake_' + id, skill: 'cooking', lvl, xp, in: { [input]: 1 }, out: id, station: 'range', burn: { item: burnt, stop }, ticks: 3, verb: 'cook', ...extra });
bake('bread', 1, 40, 'bread_dough', 35, 'burnt_bread');
bake('redberry_pie', 10, 78, 'uncooked_redberry_pie', 44, 'burnt_pie');
bake('meat_pie', 20, 110, 'uncooked_meat_pie', 54, 'burnt_pie');
bake('stew', 25, 117, 'uncooked_stew', 58, 'burnt_stew', { station: 'fire' });
bake('plain_pizza', 35, 143, 'uncooked_pizza', 68, 'burnt_pizza');
bake('cake', 40, 180, 'uncooked_cake', 74, 'burnt_cake', { returns: { cake_tin: 1 } });
bake('fish_pie', 47, 164, 'uncooked_fish_pie', 81, 'burnt_pie');
r({ id: 'soda_ash', skill: 'cooking', xp: 1, in: { seaweed: 1 }, out: 'soda_ash', station: 'fire', verb: 'cook' });
r({ id: 'cheese', skill: 'cooking', lvl: 20, xp: 41, in: { bucket_of_milk: 1 }, out: 'cheese', returns: { bucket: 1 }, station: 'churn', ticks: 3 });

// ------------------------------------------------------------------ crafting: pottery
r({ id: 'soft_clay_station', skill: 'crafting', in: { clay: 1 }, out: 'soft_clay', station: 'water', ticks: 1 });
for (const [water, empty] of WATERS) r({ id: 'soft_clay_' + water, skill: 'crafting', in: { clay: 1, [water]: 1 }, out: 'soft_clay', returns: { [empty]: 1 }, ticks: 1 });
for (const [id, lvl, xp, fxp] of [['pot', 1, 6.3, 6.3], ['pie_dish', 7, 15, 10], ['bowl', 8, 18, 15]]) {
  r({ id: 'form_' + id, skill: 'crafting', lvl, xp, in: { soft_clay: 1 }, out: 'unfired_' + id, station: 'pottery_wheel' });
  r({ id: 'fire_' + id, skill: 'crafting', lvl, xp: fxp, in: { ['unfired_' + id]: 1 }, out: id, station: 'pottery_oven', ticks: 3 });
}

// ------------------------------------------------------------------ crafting: glass & light
r({ id: 'molten_glass', skill: 'crafting', xp: 20, in: { bucket_of_sand: 1, soda_ash: 1 }, out: 'molten_glass', returns: { bucket: 1 }, station: 'furnace', ticks: 3 });
for (const [id, lvl, xp] of [['beer_glass', 1, 17.5], ['empty_lantern', 4, 19], ['vial', 33, 35], ['unpowered_orb', 46, 52.5]])
  r({ id: 'blow_' + id, skill: 'crafting', lvl, xp, in: { molten_glass: 1 }, keep: ['glassblowing_pipe'], out: id });
r({ id: 'candle_lantern', skill: 'crafting', lvl: 4, in: { empty_lantern: 1, candle: 1 }, out: 'candle_lantern' });
r({ id: 'light_lantern', in: { candle_lantern: 1 }, keep: ['tinderbox'], out: 'lit_lantern', verb: 'light', ticks: 1 });
r({ id: 'light_candle', in: { candle: 1 }, keep: ['tinderbox'], out: 'lit_candle', verb: 'light', ticks: 1 });

// ------------------------------------------------------------------ crafting: silver
r({ id: 'holy_symbol', skill: 'crafting', lvl: 16, xp: 50, in: { silver_bar: 1 }, keep: ['holy_mould'], out: 'holy_symbol', station: 'furnace', ticks: 3 });

// ------------------------------------------------------------------ crafting: spinning
r({ id: 'ball_of_wool', skill: 'crafting', xp: 2.5, in: { wool: 1 }, out: 'ball_of_wool', station: 'spinning_wheel' });
r({ id: 'bow_string', skill: 'crafting', lvl: 10, xp: 15, in: { flax: 1 }, out: 'bow_string', station: 'spinning_wheel' });

// ------------------------------------------------------------------ crafting: leather
const sew = (out, lvl, xp, input, n = 1, extra = {}) => r({ id: 'sew_' + out, skill: 'crafting', lvl, xp, in: { [input]: n, thread: 1, ...extra }, keep: ['needle'], out, ticks: 3 });
sew('leather_gloves', 1, 13.8, 'leather');
sew('leather_boots', 7, 16.25, 'leather');
sew('coif', 9, 18.5, 'leather');
sew('leather_vambraces', 11, 22, 'leather');
sew('leather_body', 14, 25, 'leather');
sew('leather_chaps', 18, 27, 'leather');
sew('hardleather_body', 28, 35, 'hard_leather');
r({ id: 'studded_body', skill: 'crafting', lvl: 41, xp: 40, in: { leather_body: 1, steel_studs: 1 }, out: 'studded_body', ticks: 3 });
r({ id: 'studded_chaps', skill: 'crafting', lvl: 44, xp: 42, in: { leather_chaps: 1, steel_studs: 1 }, out: 'studded_chaps', ticks: 3 });
for (const h of DHIDES) {
  const leather = h.id + '_dragon_leather';
  sew(h.id + '_dhide_vamb', h.lvl, h.xp, leather, 1);
  sew(h.id + '_dhide_chaps', h.lvl + 3, h.xp * 2, leather, 2);
  sew(h.id + '_dhide_body', h.lvl + 6, h.xp * 3, leather, 3);
}

// ------------------------------------------------------------------ fletching
//   batch: make up to this many per action (arrows and darts come in bundles like 15 or 10)
for (const [logs, lvl, n, xp] of [['logs', 1, 15, 5], ['oak_logs', 15, 30, 10], ['willow_logs', 30, 45, 15], ['maple_logs', 45, 60, 20], ['yew_logs', 60, 75, 25], ['magic_logs', 75, 90, 30]])
  r({ id: 'shafts_' + logs, skill: 'fletching', lvl, xp, in: { [logs]: 1 }, keep: ['knife'], out: ['arrow_shaft', n], verb: 'cut' });
for (const b of BOW_WOODS) {
  ['shortbow', 'longbow'].forEach((k, i) => {
    r({ id: `cut_${b.pre}${k}`, skill: 'fletching', lvl: b.fl[i], xp: b.xp[i], in: { [b.logs]: 1 }, keep: ['knife'], out: `${b.pre}${k}_u`, verb: 'cut' });
    r({ id: `string_${b.pre}${k}`, skill: 'fletching', lvl: b.fl[i], xp: b.xp[i], in: { [`${b.pre}${k}_u`]: 1, bow_string: 1 }, out: `${b.pre}${k}` });
  });
}
for (const [id, , logs, lvl, xp] of STOCKS) r({ id: 'cut_' + id, skill: 'fletching', lvl, xp, in: { [logs]: 1 }, keep: ['knife'], out: id, verb: 'cut' });
r({ id: 'headless_arrow', skill: 'fletching', xp: 1, in: { arrow_shaft: 1, feather: 1 }, out: 'headless_arrow', batch: 15 });
for (const a of AMMO_METALS) {
  r({ id: a.m + '_arrow', skill: 'fletching', lvl: a.arrow[1], xp: a.arrow[2], in: { headless_arrow: 1, [a.m + '_arrowtips']: 1 }, out: a.m + '_arrow', batch: 15 });
  if (!a.dart) continue;
  r({ id: a.m + '_dart', skill: 'fletching', lvl: a.dart[1], xp: a.dart[2], in: { [a.m + '_dart_tip']: 1, feather: 1 }, out: a.m + '_dart', batch: 10 });
  const [lvl, xp, , , stock] = a.xbow;
  r({ id: a.m + '_crossbow_u', skill: 'fletching', lvl, xp, in: { [stock]: 1, [a.m + '_limbs']: 1 }, keep: ['hammer'], out: a.m + '_crossbow_u', ticks: 3 });
  r({ id: a.m + '_crossbow', skill: 'fletching', lvl, xp, in: { [a.m + '_crossbow_u']: 1, bow_string: 1 }, out: a.m + '_crossbow' });
  r({ id: a.m + '_bolts', skill: 'fletching', lvl, xp: [0.5, 1.5, 3.5, 5, 7, 10][a.tier], in: { [a.m + '_bolts_unf']: 1, feather: 1 }, out: a.m + '_bolts', batch: 10 });
}

// Tanning is a paid service (the tanner), not a recipe: hide -> leather, and the fee.
export const TANNING = [
  { from: 'cowhide', to: 'leather', fee: 1 },
  { from: 'cowhide', to: 'hard_leather', fee: 3, hard: true },
  ...DHIDES.map((h) => ({ from: h.id + '_dragonhide', to: h.id + '_dragon_leather', fee: 20 })),
];

export function recipeName(rec) { const [id] = Array.isArray(rec.out) ? rec.out : [rec.out]; return ITEMS[id].name; }
export function recipeOut(rec) { return Array.isArray(rec.out) ? rec.out : [rec.out, 1]; }

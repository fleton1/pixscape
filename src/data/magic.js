// Magic and Runecraft data: runes, altars, the standard spellbook and staffs.

export const RUNES = [
  // id, name, colour, runecraft level, xp per essence, level step for an extra rune per essence (0 = never)
  ['air', 'Air', '#d8e8f0', 1, 5, 11], ['mind', 'Mind', '#e8a040', 2, 5.5, 14], ['water', 'Water', '#3a7ad8', 5, 6, 19],
  ['earth', 'Earth', '#8a6a3a', 9, 6.5, 26], ['fire', 'Fire', '#e0401a', 14, 7, 35], ['body', 'Body', '#4a6ac8', 20, 7.5, 46],
  ['cosmic', 'Cosmic', '#e8d850', 27, 8, 59], ['chaos', 'Chaos', '#e8a020', 35, 8.5, 74], ['nature', 'Nature', '#3ab04a', 44, 9, 91],
  ['law', 'Law', '#2a3ad8', 54, 9.5, 0], ['death', 'Death', '#e8e8e8', 65, 10, 0], ['blood', 'Blood', '#b01a1a', 77, 10.5, 0],
].map(([id, name, color, lvl, xp, step]) => ({ id, name, color, lvl, xp, step, item: id + '_rune' }));
export const RUNE = Object.fromEntries(RUNES.map((r) => [r.id, r]));

// Where each altar's ruins stand on the overworld (the realm maps are generated in world/altars.js).
export const ALTAR_SITES = {
  air: [206, 196], mind: [176, 106], water: [172, 184], earth: [280, 146], fire: [306, 250], body: [196, 128],
  cosmic: [170, 292], chaos: [270, 66], nature: [30, 176], law: [334, 128], death: [110, 300], blood: [214, 34],
};

// Elemental staves count as an endless supply of their rune.
export const STAFF_RUNES = {
  staff_of_air: ['air'], staff_of_water: ['water'], staff_of_earth: ['earth'], staff_of_fire: ['fire'],
  air_battlestaff: ['air'], water_battlestaff: ['water'], earth_battlestaff: ['earth'], fire_battlestaff: ['fire'],
};

// ------------------------------------------------------------------ the standard spellbook
//   type: combat (max hit), teleport (to [x, y]), alch, superheat, enchant (from -> to), charge (orb), home
export const SPELLS = [];
const S = (o) => SPELLS.push({ runes: {}, ...o });
S({ id: 'home', name: 'Home Teleport', lvl: 0, type: 'home', desc: 'Teleports you to Brindlewood.' });
const ELEM = [['wind', 'air', '#d8e8f0'], ['water', 'water', '#3a7ad8'], ['earth', 'earth', '#8a6a3a'], ['fire', 'fire', '#e0401a']];
const TIERS = [
  // tier name, levels, max hits, xp, catalyst rune, element rune counts
  ['Strike', [1, 5, 9, 13], [2, 4, 6, 8], [5.5, 7.5, 9.5, 11.5], 'mind', [[1], [1, 1], [1, 2], [1, 3]]],
  ['Bolt', [17, 23, 29, 35], [9, 10, 11, 12], [13.5, 16.5, 19.5, 22.5], 'chaos', [[2], [2, 2], [2, 3], [3, 4]]],
  ['Blast', [41, 47, 53, 59], [13, 14, 15, 16], [25.5, 28.5, 31.5, 34.5], 'death', [[3], [3, 3], [3, 4], [4, 5]]],
  ['Wave', [62, 65, 70, 75], [17, 18, 19, 20], [36, 37.5, 40, 42.5], 'blood', [[5], [5, 7], [5, 7], [5, 7]]],
];
const combat = [];
TIERS.forEach(([tier, lvls, hits, xps, cat, counts]) => {
  ELEM.forEach(([word, rune, color], i) => {
    const runes = { [cat]: 1, air: counts[i][0] };
    if (rune !== 'air') runes[rune] = counts[i][1];
    combat.push({ id: `${word}_${tier.toLowerCase()}`, name: `${word[0].toUpperCase() + word.slice(1)} ${tier}`, lvl: lvls[i], type: 'combat', max: hits[i], xp: xps[i], runes, color, tier });
  });
});
const utility = [
  { id: 'enchant_1', name: 'Enchant Sapphire', lvl: 7, type: 'enchant', runes: { water: 1, cosmic: 1 }, xp: 17.5, gem: 'sapphire' },
  { id: 'low_alch', name: 'Low Alchemy', lvl: 21, type: 'alch', runes: { fire: 3, nature: 1 }, xp: 31, rate: 0.4 },
  { id: 'brindle_tele', name: 'Brindlewood Teleport', lvl: 25, type: 'teleport', runes: { law: 1, air: 3, fire: 1 }, xp: 35, to: [206, 171], place: 'Brindlewood' },
  { id: 'enchant_2', name: 'Enchant Emerald', lvl: 27, type: 'enchant', runes: { air: 3, cosmic: 1 }, xp: 37, gem: 'emerald' },
  { id: 'highcrest_tele', name: 'Highcrest Teleport', lvl: 31, type: 'teleport', runes: { law: 1, air: 3, water: 1 }, xp: 41, to: [228, 108], place: 'Highcrest' },
  { id: 'selby_tele', name: 'Port Selby Teleport', lvl: 37, type: 'teleport', runes: { law: 1, air: 1, water: 1, earth: 1 }, xp: 48, to: [134, 160], place: 'Port Selby' },
  { id: 'superheat', name: 'Superheat Item', lvl: 43, type: 'superheat', runes: { fire: 4, nature: 1 }, xp: 53 },
  { id: 'sandhaven_tele', name: 'Sandhaven Teleport', lvl: 45, type: 'teleport', runes: { law: 2, air: 3, fire: 2 }, xp: 55.5, to: [320, 213], place: 'Sandhaven' },
  { id: 'enchant_3', name: 'Enchant Ruby', lvl: 49, type: 'enchant', runes: { fire: 5, cosmic: 1 }, xp: 59, gem: 'ruby' },
  { id: 'elderglen_tele', name: 'Elderglen Teleport', lvl: 51, type: 'teleport', runes: { law: 2, water: 2, earth: 2 }, xp: 61, to: [52, 158], place: 'Elderglen' },
  { id: 'high_alch', name: 'High Alchemy', lvl: 55, type: 'alch', runes: { fire: 5, nature: 1 }, xp: 65, rate: 0.6 },
  { id: 'charge_water', name: 'Charge Water Orb', lvl: 56, type: 'charge', runes: { water: 30, cosmic: 3 }, xp: 56, orb: 'water_orb' },
  { id: 'enchant_4', name: 'Enchant Diamond', lvl: 57, type: 'enchant', runes: { earth: 10, cosmic: 1 }, xp: 67, gem: 'diamond' },
  { id: 'frost_tele', name: 'Frosthold Teleport', lvl: 58, type: 'teleport', runes: { law: 2, water: 4, air: 2 }, xp: 68, to: [337, 106], place: 'Frosthold' },
  { id: 'charge_earth', name: 'Charge Earth Orb', lvl: 60, type: 'charge', runes: { earth: 30, cosmic: 3 }, xp: 70, orb: 'earth_orb' },
  { id: 'charge_fire', name: 'Charge Fire Orb', lvl: 63, type: 'charge', runes: { fire: 30, cosmic: 3 }, xp: 73, orb: 'fire_orb' },
  { id: 'palmera_tele', name: 'Palmera Teleport', lvl: 64, type: 'teleport', runes: { law: 2, water: 3, fire: 2 }, xp: 74, to: [157, 282], place: 'Palmera' },
  { id: 'charge_air', name: 'Charge Air Orb', lvl: 66, type: 'charge', runes: { air: 30, cosmic: 3 }, xp: 76, orb: 'air_orb' },
  { id: 'enchant_5', name: 'Enchant Dragonstone', lvl: 68, type: 'enchant', runes: { water: 15, earth: 15, cosmic: 1 }, xp: 78, gem: 'dragonstone' },
];
// The book is ordered by level, like the classic one.
SPELLS.push(...[...combat, ...utility].sort((a, b) => a.lvl - b.lvl));
export const SPELL = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

// Enchanting: what each gem's spell turns jewellery into.
export const ENCHANTS = {
  sapphire: [['sapphire_ring', 'ring_of_recoil']],
  emerald: [['emerald_necklace', 'travellers_necklace_8']],
  ruby: [['ruby_ring', 'ring_of_forging']],
  diamond: [['diamond_ring', 'ring_of_life']],
  dragonstone: [['dragonstone_amulet', 'amulet_of_glory_4']],
};
// Where charged jewellery can take you.
export const JEWEL_TELEPORTS = {
  glory: [['Brindlewood', 206, 171, 'main'], ['Highcrest', 228, 108, 'main'], ['Port Selby', 134, 160, 'main'], ['Sandhaven', 320, 213, 'main']],
  travellers: [['Brindlewood Sewers', 'sewers'], ['Crestfall Deeps', 'deeps'], ['Mortmire Crypt', 'crypt'], ['Hollowroot Caverns', 'hollowroot'], ['Frostpeak Ice Caves', 'icecaves'], ['Cinderhold Depths', 'depths']],
};

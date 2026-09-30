import { DIARIES, TIERS, diaryItem } from './diaries.js';
import { RUNES } from './magic.js';
// Item registry. `icon` drives the procedural icon painter; `look` drives how it appears when worn.

export const ITEMS = {};
const add = (id, o) => (ITEMS[id] = { id, value: 1, stack: false, examine: '', ...o });

export const SLOTS = ['head', 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];

export const METALS = {
  bronze: { name: 'Bronze', lvl: 1, smith: 1, color: '#b0703a', val: 1, t: 0 },
  iron: { name: 'Iron', lvl: 1, smith: 15, color: '#6f6c6a', val: 3.5, t: 1 },
  steel: { name: 'Steel', lvl: 5, smith: 30, color: '#a9aeb5', val: 12, t: 2 },
  mithril: { name: 'Mithril', lvl: 20, smith: 50, color: '#4f5fa6', val: 32, t: 3 },
  adamant: { name: 'Adamant', lvl: 30, smith: 70, color: '#4a7e52', val: 80, t: 4 },
  rune: { name: 'Rune', lvl: 40, smith: 85, color: '#3a9cb6', val: 800, t: 5 },
  dragon: { name: 'Dragon', lvl: 60, smith: null, color: '#b3261c', val: 3000, t: 6 },
};
const TIER_ATT = [7, 10, 15, 21, 29, 45, 67];
const TIER_DEF = {
  fullhelm: [4, 6, 9, 13, 19, 30, 34], platebody: [15, 21, 32, 46, 65, 82, 104], platelegs: [8, 11, 17, 24, 33, 51, 68], kiteshield: [6, 9, 13, 19, 27, 44, 50],
  medhelm: [3, 4, 6, 9, 13, 20], chainbody: [9, 13, 19, 28, 39, 50], sqshield: [5, 7, 10, 15, 21, 34], plateskirt: [8, 11, 17, 24, 33, 51],
};

// weapon kinds: speed, att/str multipliers, bars to smith, level offset for smithing
// `newer` kinds were added in 1.1 and have no dragon version.
export const SMITHABLES = [
  { kind: 'dagger', name: 'dagger', bars: 1, off: 0, slot: 'weapon', speed: 4, a: 0.6, s: 0.5, newer: true },
  { kind: 'mace', name: 'mace', bars: 1, off: 2, slot: 'weapon', speed: 5, a: 0.8, s: 0.85, prayer: 1, newer: true },
  { kind: 'medhelm', name: 'med helm', bars: 1, off: 3, slot: 'head', newer: true },
  { kind: 'sword', name: 'sword', bars: 1, off: 4, slot: 'weapon', speed: 4, a: 0.85, s: 0.8, newer: true },
  { kind: 'scimitar', name: 'scimitar', bars: 2, off: 5, slot: 'weapon', speed: 4, a: 1, s: 1 },
  { kind: 'longsword', name: 'longsword', bars: 2, off: 6, slot: 'weapon', speed: 5, a: 1.15, s: 1.25 },
  { kind: 'battleaxe', name: 'battleaxe', bars: 3, off: 10, slot: 'weapon', speed: 6, a: 1.05, s: 1.6 },
  { kind: 'twohand', name: '2h sword', bars: 3, off: 14, slot: 'weapon', speed: 7, a: 1.3, s: 2, twoHanded: true },
  { kind: 'fullhelm', name: 'full helm', bars: 2, off: 7, slot: 'head' },
  { kind: 'sqshield', name: 'sq shield', bars: 2, off: 8, slot: 'shield', newer: true },
  { kind: 'warhammer', name: 'warhammer', bars: 3, off: 9, slot: 'weapon', speed: 6, a: 0.9, s: 1.35, newer: true },
  { kind: 'chainbody', name: 'chainbody', bars: 3, off: 11, slot: 'body', newer: true },
  { kind: 'platelegs', name: 'platelegs', bars: 3, off: 16, slot: 'legs' },
  { kind: 'plateskirt', name: 'plateskirt', bars: 3, off: 16, slot: 'legs', newer: true },
  { kind: 'kiteshield', name: 'kiteshield', bars: 3, off: 12, slot: 'shield' },
  { kind: 'platebody', name: 'platebody', bars: 5, off: 18, slot: 'body' },
  { kind: 'axe', name: 'axe', bars: 1, off: 1, slot: 'weapon', speed: 5, a: 0.6, s: 0.6, tool: 'axe' },
  { kind: 'pickaxe', name: 'pickaxe', bars: 2, off: 5, slot: 'weapon', speed: 5, a: 0.6, s: 0.55, tool: 'pick' },
];

for (const [m, M] of Object.entries(METALS)) {
  if (m !== 'dragon') add(m + '_bar', { name: M.name + ' bar', value: Math.round(8 * M.val), icon: { kind: 'bar', color: M.color }, examine: `It's a bar of ${m}.` });
  for (const s of SMITHABLES) {
    if (s.newer && m === 'dragon') continue;
    const id = `${m}_${s.kind}`;
    const o = { name: `${M.name} ${s.name}`, value: Math.round(s.bars * 20 * M.val), icon: { kind: s.kind, color: M.color }, smith: M.smith != null ? { lvl: Math.min(99, M.smith + s.off), bars: s.bars, bar: m + '_bar' } : null, metal: m, examine: `A ${m} ${s.name}.` };
    const eq = { slot: s.slot, att: 0, str: 0, def: 0, look: { kind: s.kind === 'plateskirt' ? 'platelegs' : s.kind, color: M.color } };
    if (s.speed) {
      eq.att = Math.round(TIER_ATT[M.t] * s.a); eq.str = Math.round((TIER_ATT[M.t] - 1) * s.s); eq.speed = s.speed;
      if (s.prayer) eq.prayer = s.prayer + M.t;
      eq.req = { attack: M.lvl }; if (s.twoHanded) eq.twoHanded = true;
    } else {
      eq.def = TIER_DEF[s.kind][M.t]; eq.req = { defence: M.lvl };
      // metal armour gets in the way of aiming
      eq.rng = { fullhelm: -3, medhelm: -1, platebody: -10, chainbody: -5, platelegs: -7, plateskirt: -6, kiteshield: -8, sqshield: -6 }[s.kind] || 0;
      if (s.kind === 'platebody' && m === 'rune') eq.quest = 'dragons_bane';
    }
    if (s.tool) {
      o.tool = { type: s.tool, lvl: M.lvl === 5 ? 6 : M.lvl + (M.lvl > 1 ? 1 : 0), power: M.t + 1 };
      eq.req = { attack: 1 };
    }
    o.equip = eq;
    add(id, o);
  }
}
// dragon specifics: only a few exist and they drop rarely; medium helm instead of full helm
ITEMS.dragon_fullhelm.name = 'Dragon med helm';
ITEMS.dragon_fullhelm.equip.look.kind = 'medhelm';
ITEMS.dragon_fullhelm.icon.kind = 'medhelm';
ITEMS.dragon_platebody.name = 'Dragon chainbody';
ITEMS.dragon_platebody.icon.kind = 'chainbody';
ITEMS.dragon_kiteshield.name = 'Dragon sq shield';
ITEMS.dragon_kiteshield.icon.kind = 'sqshield';
ITEMS.dragon_kiteshield.equip.look.kind = 'sqshield';
for (const k of Object.keys(ITEMS)) if (k.startsWith('dragon_')) ITEMS[k].rare = true;

// ---------- resources ----------
add('coins', { name: 'Coins', stack: true, value: 1, icon: { kind: 'coins' }, examine: 'Lovely money!' });
const logs = [['logs', 'Logs', '#8a5a2b', 1, 40], ['oak_logs', 'Oak logs', '#a0703a', 15, 60], ['willow_logs', 'Willow logs', '#7d6a3a', 30, 90], ['teak_logs', 'Teak logs', '#9a6a3a', 35, 105], ['maple_logs', 'Maple logs', '#b0582a', 45, 135], ['mahogany_logs', 'Mahogany logs', '#7a2e1c', 50, 157.5], ['yew_logs', 'Yew logs', '#6a3a1c', 60, 202.5], ['magic_logs', 'Magic logs', '#3a5aa0', 75, 303.8], ['heartwood_logs', 'Heartwood logs', '#c8402a', 90, 350]];
export const FIREMAKING = {};
for (const [id, name, c, lvl, xp] of logs) {
  add(id, { name, value: Math.round(xp * 0.6), icon: { kind: 'log', color: c }, examine: 'Logs cut from a tree.' });
  FIREMAKING[id] = { lvl, xp };
}
ITEMS.magic_logs.value = 800; ITEMS.yew_logs.value = 250; ITEMS.teak_logs.value = 90; ITEMS.mahogany_logs.value = 280; ITEMS.heartwood_logs.value = 1100;
const ores = [['copper_ore', 'Copper ore', '#c8743a'], ['tin_ore', 'Tin ore', '#b8b3a8'], ['iron_ore', 'Iron ore', '#7a4a33'], ['coal', 'Coal', '#2a2826'], ['gold_ore', 'Gold ore', '#e8c13a'], ['mithril_ore', 'Mithril ore', '#4a5ea8'], ['adamantite_ore', 'Adamantite ore', '#4a8a52'], ['runite_ore', 'Runite ore', '#4ab7c8'], ['silver_ore', 'Silver ore', '#d8dce0']];
ores.forEach(([id, name, c], i) => add(id, { name, value: [5, 5, 17, 45, 150, 162, 400, 3200, 75][i], icon: { kind: 'ore', color: c }, examine: 'An ore.' }));
add('gold_bar', { name: 'Gold bar', value: 300, icon: { kind: 'bar', color: '#e8c13a' }, examine: "It's a bar of gold." });
add('silver_bar', { name: 'Silver bar', value: 150, icon: { kind: 'bar', color: '#d8dce0' }, examine: "It's a bar of silver." });
add('clay', { name: 'Clay', value: 2, icon: { kind: 'lump', color: '#b8a888' }, examine: 'Some hard dry clay.' });

export const SMELTING = [
  { bar: 'bronze_bar', lvl: 1, xp: 6.2, ores: { copper_ore: 1, tin_ore: 1 }, smithXp: 12.5 },
  { bar: 'iron_bar', lvl: 15, xp: 12.5, ores: { iron_ore: 1 }, fail: 0.5, smithXp: 25 },
  { bar: 'steel_bar', lvl: 30, xp: 17.5, ores: { iron_ore: 1, coal: 2 }, smithXp: 37.5 },
  { bar: 'silver_bar', lvl: 20, xp: 13.7, ores: { silver_ore: 1 } },
  { bar: 'gold_bar', lvl: 40, xp: 22.5, ores: { gold_ore: 1 } },
  { bar: 'mithril_bar', lvl: 50, xp: 30, ores: { mithril_ore: 1, coal: 4 }, smithXp: 50 },
  { bar: 'adamant_bar', lvl: 70, xp: 37.5, ores: { adamantite_ore: 1, coal: 6 }, smithXp: 62.5 },
  { bar: 'rune_bar', lvl: 85, xp: 50, ores: { runite_ore: 1, coal: 8 }, smithXp: 75 },
];

// ---------- fish & food ----------
export const COOKING = {};
const fish = [
  // id, name, colour, cook lvl, cook xp, heal, stopBurn, value
  ['shrimps', 'Shrimps', '#e39a8a', 1, 30, 3, 34, 5],
  ['anchovies', 'Anchovies', '#8aa0b8', 1, 30, 1, 34, 8],
  ['sardine', 'Sardine', '#9ab0c0', 1, 40, 4, 38, 10],
  ['herring', 'Herring', '#b0b8a0', 5, 50, 5, 41, 15],
  ['mackerel', 'Mackerel', '#7a9a8a', 10, 60, 6, 45, 12],
  ['trout', 'Trout', '#c09a70', 15, 70, 7, 49, 20],
  ['cod', 'Cod', '#a09a7a', 18, 75, 7, 52, 18],
  ['pike', 'Pike', '#8a9a6a', 20, 80, 8, 54, 25],
  ['salmon', 'Salmon', '#e0806a', 25, 90, 9, 58, 40],
  ['tuna', 'Tuna', '#7080a0', 30, 100, 10, 63, 60],
  ['cave_eel', 'Cave eel', '#6a7a5a', 38, 115, 8, 70, 45],
  ['lobster', 'Lobster', '#d04a2a', 40, 120, 12, 74, 150],
  ['bass', 'Bass', '#5a7a6a', 43, 130, 13, 80, 90],
  ['swordfish', 'Swordfish', '#6a8ab0', 45, 140, 14, 86, 250],
  ['monkfish', 'Monkfish', '#8a7a6a', 62, 150, 16, 90, 230],
  ['shark', 'Shark', '#7a8a96', 80, 210, 20, 99, 800],
  ['anglerfish', 'Anglerfish', '#4a4a6a', 84, 230, 22, 99, 1200],
  ['dark_crab', 'Dark crab', '#3a2a4a', 90, 215, 22, 99, 1000],
];
const fishKind = (id) => (id === 'lobster' || id === 'dark_crab' ? 'lobster' : id === 'shrimps' || id === 'anchovies' ? 'shrimp' : 'fish');
for (const [id, name, c, lvl, xp, heal, stop, val] of fish) {
  add('raw_' + id, { name: 'Raw ' + name.toLowerCase(), value: val, icon: { kind: fishKind(id), color: c, raw: true }, examine: 'I should try cooking this.' });
  add(id, { name, value: Math.round(val * 1.3), icon: { kind: fishKind(id), color: c }, food: { heal }, examine: 'Some nicely cooked fish.' });
  COOKING['raw_' + id] = { lvl, xp, out: id, burnt: 'burnt_fish', stop };
}
add('burnt_fish', { name: 'Burnt fish', value: 1, icon: { kind: 'fish', color: '#2a2420', burnt: true }, examine: 'Oops!' });
add('raw_beef', { name: 'Raw beef', value: 5, icon: { kind: 'meat', color: '#c0404a', raw: true }, examine: 'I need to cook this first.' });
add('raw_chicken', { name: 'Raw chicken', value: 5, icon: { kind: 'drumstick', color: '#e8b0a0', raw: true }, examine: 'I need to cook this first.' });
add('cooked_meat', { name: 'Cooked meat', value: 6, icon: { kind: 'meat', color: '#7a4020' }, food: { heal: 3 }, examine: 'Mmm this looks tasty.' });
add('cooked_chicken', { name: 'Cooked chicken', value: 6, icon: { kind: 'drumstick', color: '#b0703a' }, food: { heal: 3 }, examine: 'Mmm this looks tasty.' });
add('burnt_meat', { name: 'Burnt meat', value: 1, icon: { kind: 'meat', color: '#2a2420' }, examine: 'Oh dear.' });
COOKING.raw_beef = { lvl: 1, xp: 30, out: 'cooked_meat', burnt: 'burnt_meat', stop: 34 };
COOKING.raw_chicken = { lvl: 1, xp: 30, out: 'cooked_chicken', burnt: 'burnt_meat', stop: 34 };
add('bread', { name: 'Bread', value: 12, icon: { kind: 'bread' }, food: { heal: 5 }, examine: 'Nice crusty bread.' });
add('cake', { name: 'Cake', value: 50, icon: { kind: 'cake' }, food: { heal: 12 }, examine: 'A whole cake!' });
add('redberries', { name: 'Redberries', value: 3, icon: { kind: 'berries', color: '#c0202a' }, food: { heal: 2 }, examine: 'Sweet and juicy.' });
add('banana', { name: 'Banana', value: 2, icon: { kind: 'banana' }, food: { heal: 2 }, examine: 'Mmm. Banana.' });
add('stew', { name: 'Stew', value: 20, icon: { kind: 'bowl', color: '#8a5a2a' }, food: { heal: 11 }, examine: "It's a meat and potato stew." });

// ---------- bones ----------
export const BONES = { bones: 4.5, bat_bones: 5.3, big_bones: 15, babydragon_bones: 30, wyrm_bones: 50, dragon_bones: 72, demon_ashes: 25, ashes: 0 };
add('bat_bones', { name: 'Bat bones', value: 20, icon: { kind: 'bones', color: '#d8d0c0' }, examine: 'Bat bones. Nice and light.' });
add('wyrm_bones', { name: 'Wyrm bones', value: 900, icon: { kind: 'bones', big: true, color: '#c8e0e8' }, examine: 'The frost still clings to them.' });
add('demon_ashes', { name: 'Demon ashes', value: 300, icon: { kind: 'ashes', color: '#8a2a1a' }, examine: 'They are still warm.' });
add('bones', { name: 'Bones', value: 1, icon: { kind: 'bones' }, examine: 'Bones are for burying!' });
add('big_bones', { name: 'Big bones', value: 60, icon: { kind: 'bones', big: true }, examine: 'Ew, it has lumps of flesh on it.' });
add('babydragon_bones', { name: 'Babydragon bones', value: 400, icon: { kind: 'bones', color: '#e8e0b0' }, examine: 'Ew, it has lumps of flesh on it.' });
add('dragon_bones', { name: 'Dragon bones', value: 2000, icon: { kind: 'bones', big: true, color: '#d8d0a0' }, examine: 'These would feed a hungry dog for a week.' });
add('ashes', { name: 'Ashes', value: 1, icon: { kind: 'ashes' }, examine: 'A heap of ashes.' });

// ---------- tools & misc ----------
const misc = [
  ['tinderbox', 'Tinderbox', 'tinderbox', 1, 'Useful for lighting a fire.'],
  ['small_net', 'Small fishing net', 'net', 5, 'Useful for catching small fish.'],
  ['big_net', 'Big fishing net', 'bignet', 20, 'Useful for catching lots of fish.'],
  ['fishing_rod', 'Fishing rod', 'rod', 5, 'Useful for catching sardine or herring.'],
  ['fly_rod', 'Fly fishing rod', 'flyrod', 5, 'Useful for catching salmon or trout.'],
  ['lobster_pot', 'Lobster pot', 'lobsterpot', 20, 'Useful for catching lobsters.'],
  ['harpoon', 'Harpoon', 'harpoon', 45, 'Useful for catching really big fish.'],
  ['hammer', 'Hammer', 'hammer', 1, 'Good for hitting things!'],
  ['chisel', 'Chisel', 'chisel', 1, 'Good for detailed crafting.'],
  ['spade', 'Spade', 'spade', 3, 'A slightly muddy spade.'],
  ['ring_mould', 'Ring mould', 'mould_ring', 5, 'Used to make gold rings.'],
  ['amulet_mould', 'Amulet mould', 'mould_amulet', 5, 'Used to make gold amulets.'],
  ['bucket', 'Bucket', 'bucket', 2, "It's an empty bucket."],
  ['bucket_of_milk', 'Bucket of milk', 'bucket_milk', 6, "It's a bucket of milk."],
  ['pot', 'Pot', 'pot', 1, 'This pot is empty.'],
  ['pot_of_flour', 'Pot of flour', 'pot_flour', 14, 'There is flour in this pot.'],
  ['egg', 'Egg', 'egg', 4, 'A nice fresh egg.'],
  ['grain', 'Grain', 'grain', 2, 'Some wheat heads.'],
  ['cowhide', 'Cowhide', 'hide', 20, 'I should take this to a tanner.'],
  ['casket', 'Casket', 'casket', 50, 'I hope there is treasure in it.'],
  ['lamp', 'Antique lamp', 'lamp', 1, 'I wonder what happens if I rub it...'],
];
for (const [id, name, kind, value, ex] of misc) add(id, { name, value, icon: { kind }, examine: ex });
ITEMS.spade.examine = 'A slightly muddy spade. Perfect for digging up treasure.';
add('feather', { name: 'Feather', stack: true, value: 2, icon: { kind: 'feather' }, examine: 'Used for fly-fishing.' });
add('fishing_bait', { name: 'Fishing bait', stack: true, value: 3, icon: { kind: 'bait' }, examine: 'For use with a fishing rod.' });
add('silk', { name: 'Silk', value: 60, icon: { kind: 'cloth', color: '#e84a8a' }, examine: 'It\'s a sheet of silk.' });
add('reward_casket', { name: 'Reward casket', value: 0, icon: { kind: 'casket', color: '#e8c13a' }, examine: 'A casket from a treasure trail!' });
add('clue_scroll', { name: 'Clue scroll', value: 0, icon: { kind: 'clue' }, examine: 'A clue!', clue: true });

// ---------- gems & jewellery ----------
export const GEMS = [
  { id: 'sapphire', name: 'Sapphire', color: '#2a5ad8', lvl: 20, xp: 50, val: 250 },
  { id: 'emerald', name: 'Emerald', color: '#2ab04a', lvl: 27, xp: 67.5, val: 500 },
  { id: 'ruby', name: 'Ruby', color: '#d82a3a', lvl: 34, xp: 85, val: 1000 },
  { id: 'diamond', name: 'Diamond', color: '#e8f0f8', lvl: 43, xp: 107.5, val: 2000 },
  { id: 'dragonstone', name: 'Dragonstone', color: '#a03ad8', lvl: 55, xp: 137.5, val: 10000 },
];
export const JEWELLERY = [];
const amuletNames = { gold: 'Gold amulet', sapphire: 'Amulet of focus', emerald: 'Amulet of defence', ruby: 'Amulet of strength', diamond: 'Amulet of power', dragonstone: 'Dragonstone amulet' };
const amuletStats = { gold: [0, 0, 0], sapphire: [5, 0, 0], emerald: [0, 0, 7], ruby: [0, 10, 0], diamond: [6, 6, 6], dragonstone: [10, 6, 10] };
const ringLvl = { gold: [5, 15], sapphire: [20, 40], emerald: [27, 55], ruby: [34, 70], diamond: [43, 85], dragonstone: [55, 100] };
const amuLvl = { gold: [8, 30], sapphire: [24, 65], emerald: [31, 70], ruby: [50, 85], diamond: [70, 100], dragonstone: [80, 150] };
for (const g of [{ id: 'gold', color: '#e8c13a', val: 150 }, ...GEMS]) {
  if (g.id !== 'gold') {
    add('uncut_' + g.id, { name: 'Uncut ' + g.name.toLowerCase(), value: Math.round(g.val / 2), icon: { kind: 'uncut', color: g.color }, examine: 'An uncut gem.' });
    add(g.id, { name: g.name, value: g.val, icon: { kind: 'gem', color: g.color }, examine: 'This looks valuable.', cut: { from: 'uncut_' + g.id, lvl: g.lvl, xp: g.xp } });
  }
  const gem = g.id === 'gold' ? null : g.id;
  const rid = g.id + '_ring', aid = g.id === 'gold' ? 'gold_amulet' : g.id + '_amulet';
  const b = Math.max(0, GEMS.findIndex((x) => x.id === g.id) + 1);
  add(rid, { name: g.id === 'gold' ? 'Gold ring' : g.name + ' ring', value: g.val + 200, icon: { kind: 'ring', color: g.id === 'gold' ? null : g.color }, equip: { slot: 'ring', att: b, str: b, def: b, look: {} }, examine: 'A valuable ring.' });
  const [aa, as, ad] = amuletStats[g.id];
  add(aid, { name: amuletNames[g.id], value: g.val + 350, icon: { kind: 'amulet', color: g.id === 'gold' ? null : g.color }, equip: { slot: 'neck', att: aa, str: as, def: ad, look: { color: g.id === 'gold' ? '#e8c13a' : g.color } }, examine: 'A shiny amulet.' });
  JEWELLERY.push({ out: rid, gem, mould: 'ring_mould', lvl: ringLvl[g.id][0], xp: ringLvl[g.id][1] });
  JEWELLERY.push({ out: aid, gem, mould: 'amulet_mould', lvl: amuLvl[g.id][0], xp: amuLvl[g.id][1] });
}
ITEMS.dragonstone_amulet.rare = true;
ITEMS.uncut_dragonstone.rare = true;

// ---------- potions ----------
export const POTIONS = {
  attack_potion: { boost: { attack: [3, 0.1] } },
  strength_potion: { boost: { strength: [3, 0.1] } },
  defence_potion: { boost: { defence: [3, 0.1] } },
  super_attack: { boost: { attack: [5, 0.15] } },
  super_strength: { boost: { strength: [5, 0.15] } },
  super_defence: { boost: { defence: [5, 0.15] } },
  prayer_potion: { restore: [7, 0.25] },
};
add('attack_potion', { name: 'Attack potion', value: 30, icon: { kind: 'potion', color: '#3a8ad8' }, examine: 'A potion that boosts Attack.' });
add('strength_potion', { name: 'Strength potion', value: 40, icon: { kind: 'potion', color: '#d8d8d0' }, examine: 'A potion that boosts Strength.' });
add('defence_potion', { name: 'Defence potion', value: 40, icon: { kind: 'potion', color: '#3ad85a' }, examine: 'A potion that boosts Defence.' });
add('super_attack', { name: 'Super attack', value: 150, icon: { kind: 'potion', color: '#2a4ad8' }, examine: 'A potion that greatly boosts Attack.' });
add('super_strength', { name: 'Super strength', value: 200, icon: { kind: 'potion', color: '#e8e8f0' }, examine: 'A potion that greatly boosts Strength.' });
add('super_defence', { name: 'Super defence', value: 150, icon: { kind: 'potion', color: '#e8c13a' }, examine: 'A potion that greatly boosts Defence.' });
add('prayer_potion', { name: 'Prayer potion', value: 250, icon: { kind: 'potion', color: '#3ad8b0' }, examine: 'A potion that restores Prayer points.' });

// ---------- wearables ----------
const wear = (id, name, slot, stats, icon, look, value = 50, extra = {}) =>
  add(id, { name, value, icon, equip: { slot, att: 0, str: 0, def: 0, prayer: 0, ...stats, look }, examine: extra.examine || `A ${name.toLowerCase()}.`, ...extra });
wear('wooden_shield', 'Wooden shield', 'shield', { def: 3 }, { kind: 'woodshield' }, { kind: 'woodshield', color: '#8a5a2b' }, 20);
wear('leather_body', 'Leather body', 'body', { def: 8, rng: 8 }, { kind: 'leatherbody', color: '#8a5a2b' }, { kind: 'shirt', color: '#8a5a2b' }, 30);
wear('leather_chaps', 'Leather chaps', 'legs', { def: 4, rng: 4 }, { kind: 'chaps', color: '#7a4a22' }, { kind: 'pants', color: '#7a4a22' }, 25);
wear('leather_gloves', 'Leather gloves', 'hands', { def: 1 }, { kind: 'gloves', color: '#7a4a22' }, { color: '#7a4a22' }, 10);
wear('leather_boots', 'Leather boots', 'feet', { def: 1 }, { kind: 'boots', color: '#6a3a1a' }, { color: '#5a3218' }, 10);
wear('coif', 'Coif', 'head', { def: 2, rng: 2 }, { kind: 'coif', color: '#8a5a2b' }, { kind: 'coif', color: '#8a5a2b' }, 20);
wear('chef_hat', "Chef's hat", 'head', {}, { kind: 'chefhat' }, { kind: 'chefhat', color: '#f0f0f0' }, 2);
wear('wizard_hat', 'Wizard hat', 'head', { def: 0 }, { kind: 'wizhat', color: '#2a3aa0' }, { kind: 'wizhat', color: '#2a3aa0' }, 10);
wear('wizard_robe', 'Wizard robe top', 'body', { def: 0 }, { kind: 'robe', color: '#2a3aa0' }, { kind: 'robe', color: '#2a3aa0' }, 20);
wear('dark_wizard_hat', 'Dark wizard hat', 'head', { def: 0 }, { kind: 'wizhat', color: '#2a2230' }, { kind: 'wizhat', color: '#2a2230' }, 40);
wear('dark_wizard_robe', 'Dark wizard robe', 'body', { def: 1 }, { kind: 'robe', color: '#2a2230' }, { kind: 'robe', color: '#2a2230' }, 60);
wear('monk_robe', "Monk's robe", 'body', { prayer: 6 }, { kind: 'robe', color: '#6a4a2a' }, { kind: 'robe', color: '#6a4a2a' }, 40);
wear('holy_symbol', 'Holy symbol', 'neck', { prayer: 8 }, { kind: 'amulet', color: '#d8d8d8' }, { color: '#d8d8d8' }, 200);
const capes = [['red', '#b02a2a'], ['blue', '#2a4ab0'], ['green', '#2a8a3a'], ['yellow', '#d8b02a'], ['purple', '#7a2ab0'], ['black', '#1e1e24'], ['orange', '#d8702a']];
for (const [c, hex] of capes) wear(`${c}_cape`, `${c[0].toUpperCase() + c.slice(1)} cape`, 'cape', { def: 1 }, { kind: 'cape', color: hex }, { color: hex }, 20);
const berets = [['red', '#b02a2a'], ['blue', '#2a4ab0'], ['black', '#1e1e24'], ['white', '#e8e8e8']];
for (const [c, hex] of berets) wear(`${c}_beret`, `${c[0].toUpperCase() + c.slice(1)} beret`, 'head', {}, { kind: 'beret', color: hex }, { kind: 'beret', color: hex }, 500, { rare: true });
wear('ranger_boots', 'Ranger boots', 'feet', { rng: 8, def: 5 }, { kind: 'boots', color: '#2a6a2a' }, { color: '#2a6a2a' }, 25000, { rare: true, examine: 'Legendary boots. Rarely seen.' });
wear('holy_sandals', 'Holy sandals', 'feet', { prayer: 4, def: 2 }, { kind: 'boots', color: '#e0c890' }, { color: '#e0c890' }, 8000, { rare: true });
wear('gilded_scimitar', 'Gilded scimitar', 'weapon', { att: 47, str: 45, speed: 4, req: { attack: 40 } }, { kind: 'scimitar', color: '#3a9cb6', gilded: true }, { kind: 'scimitar', color: '#e8c13a' }, 60000, { rare: true });
wear('gilded_platebody', 'Gilded platebody', 'body', { def: 82, req: { defence: 40 } }, { kind: 'platebody', color: '#3a9cb6', gilded: true }, { kind: 'platebody', color: '#3a9cb6', trim: '#e8c13a' }, 90000, { rare: true });
wear('gilded_fullhelm', 'Gilded full helm', 'head', { def: 30, req: { defence: 40 } }, { kind: 'fullhelm', color: '#3a9cb6', gilded: true }, { kind: 'fullhelm', color: '#3a9cb6', trim: '#e8c13a' }, 50000, { rare: true });
wear('blue_partyhat', 'Blue partyhat', 'head', {}, { kind: 'partyhat', color: '#2a5ad8' }, { kind: 'partyhat', color: '#2a5ad8' }, 5000000, { rare: true, examine: 'A legend among adventurers.' });
wear('red_partyhat', 'Red partyhat', 'head', {}, { kind: 'partyhat', color: '#d82a2a' }, { kind: 'partyhat', color: '#d82a2a' }, 5000000, { rare: true, examine: 'A legend among adventurers.' });
wear('crown', 'Crown', 'head', { def: 2 }, { kind: 'crown' }, { kind: 'crown', color: '#e8c13a' }, 5000, { rare: true });

// ---------- boss uniques ----------
wear('warlord_cleaver', "Warlord's cleaver", 'weapon', { att: 32, str: 36, speed: 4, req: { attack: 30 } }, { kind: 'cleaver', color: '#8a8a88' }, { kind: 'cleaver', color: '#8a8a88' }, 20000, { rare: true, examine: 'Crude, heavy and still sticky.' });
wear('goblin_war_helm', 'Goblin war helm', 'head', { def: 14, str: 2, req: { defence: 20 } }, { kind: 'medhelm', color: '#5a6a2a' }, { kind: 'medhelm', color: '#5a6a2a' }, 12000, { rare: true, examine: 'It smells of goblin.' });
wear('scarab_helm', 'Scarab helm', 'head', { def: 28, str: 3, req: { defence: 45 } }, { kind: 'fullhelm', color: '#2a6a7a', gilded: true }, { kind: 'fullhelm', color: '#2a5a6a', trim: '#e8c13a' }, 120000, { rare: true, examine: 'Carved from the shell of an ancient beetle.' });
wear('khepri_amulet', 'Khepri amulet', 'neck', { att: 12, str: 12, def: 6, prayer: 2 }, { kind: 'amulet', color: '#2ab0d8' }, { color: '#2ab0d8' }, 250000, { rare: true, examine: 'The sun beetle watches over you.' });
wear('dragonfire_shield', 'Dragonfire shield', 'shield', { def: 70, req: { defence: 75 }, antifire: true }, { kind: 'dfs' }, { kind: 'dfs', color: '#4a4a52' }, 900000, { rare: true, examine: 'A shield forged from a dragon\'s visage. It glows warmly.' });
wear('emberwing_fang', "Emberwing's fang", 'weapon', { att: 82, str: 80, speed: 4, req: { attack: 70 } }, { kind: 'fang', color: '#e8702a' }, { kind: 'fang', color: '#e8702a' }, 1500000, { rare: true, examine: 'Still hot. It thirsts for battle.' });
wear('tyrant_maul', "Tyrant's maul", 'weapon', { att: 70, str: 118, speed: 6, twoHanded: true, req: { strength: 70 } }, { kind: 'maul', color: '#d8d0b0' }, { kind: 'maul', color: '#d8d0b0' }, 1200000, { rare: true, examine: 'Carved from a single colossal bone.' });
wear('tyrant_ring', "Tyrant's ring", 'ring', { str: 8, att: 2 }, { kind: 'ring', color: '#e8e0c0' }, {}, 400000, { rare: true, examine: 'A ring of bone. It grips your finger tightly.' });
wear('cape_of_the_wilds', 'Cape of the wilds', 'cape', { att: 4, str: 4, def: 6, prayer: 2 }, { kind: 'cape', color: '#5a1a1a' }, { color: '#5a1a1a', trim: '#d8a02a' }, 300000, { rare: true, examine: 'Worn by those who conquer the wilderness.' });
wear('anti_dragon_shield', 'Anti-dragon shield', 'shield', { def: 7, antifire: true }, { kind: 'antidragon' }, { kind: 'antidragon', color: '#6a6a70' }, 20, { examine: 'This provides partial protection from dragonfire.' });
wear('rat_crown', 'Rat crown', 'head', { def: 4 }, { kind: 'crown', color: '#8a8a88' }, { kind: 'crown', color: '#a8a8a0' }, 3000, { rare: true, examine: 'Tiny, tarnished and still warm.' });
wear('abbots_censer', "Abbot's censer", 'weapon', { att: 40, str: 42, prayer: 8, speed: 5, req: { attack: 50 } }, { kind: 'mace', color: '#8ab0b0' }, { kind: 'mace', color: '#8ab0b0' }, 180000, { rare: true, examine: 'It still smokes with incense.' });
wear('frostbite_blade', 'Frostbite blade', 'weapon', { att: 72, str: 70, speed: 4, req: { attack: 65 } }, { kind: 'frostblade', color: '#a8e0f8' }, { kind: 'frostblade', color: '#a8e0f8' }, 1100000, { rare: true, examine: 'Cold enough to burn.' });
wear('frost_cape', 'Frost cape', 'cape', { att: 3, str: 3, def: 8, prayer: 1 }, { kind: 'cape', color: '#c8e8f8' }, { color: '#c8e8f8', trim: '#4a8ab8' }, 250000, { rare: true, examine: 'Woven from wyrm-frost.' });
wear('elven_bow_cape', 'Elvenweave cape', 'cape', { def: 3, prayer: 3 }, { kind: 'cape', color: '#4aa06a' }, { color: '#4aa06a', trim: '#e8e0a0' }, 5000, { examine: 'Woven from moonlight and leaves.' });

// ---------- quest items ----------
const quest = (id, name, kind, color, ex) => add(id, { name, value: 0, icon: { kind, color }, examine: ex, quest: true });
quest('hildas_locket', "Hilda's locket", 'locket', '#e8c13a', "A golden locket. There's a tiny portrait inside.");
quest('tablet_1', 'Tablet fragment (sun)', 'tablet', '#c9a867', 'A sandstone fragment carved with a sun.');
quest('tablet_2', 'Tablet fragment (eye)', 'tablet', '#b89858', 'A sandstone fragment carved with an eye.');
quest('tablet_3', 'Tablet fragment (beetle)', 'tablet', '#a88848', 'A sandstone fragment carved with a beetle.');
quest('scarab_tablet', 'Scarab tablet', 'tablet', '#e0c070', 'The complete tablet. It fits a door somewhere...');
quest('heart_of_scarab', 'Heart of the Scarab', 'heart', '#2ab0d8', 'It pulses with a faint blue light.');
quest('emberwing_head', "Emberwing's head", 'head', '#b3261c', 'The head of the great dragon Emberwing.');
quest('moonpetal_flower', 'Moonpetal', 'flower', '#d8e8ff', 'A glowing flower.');

// ---------- skilling drops ----------
add('bird_nest', { name: "Bird's nest", value: 300, icon: { kind: 'nest' }, examine: 'It fell out of the tree.', rare: false });
add('giant_key', { name: 'Mossy key', value: 0, icon: { kind: 'key', color: '#5a8a3a' }, examine: 'A key covered in moss. It opens something big.' });

// =====================================================================================
// 1.1 skill buildout: kitchen, pottery, glass, leather & dragonhide, spinning, jewellery,
// thieving goods. Recipes that make these live in data/recipes.js.
// =====================================================================================
const simple = (id, name, icon, value, examine, extra = {}) => add(id, { name, value, icon, examine, ...extra });

// ---------- containers & water ----------
simple('jug', 'Jug', { kind: 'jug' }, 1, 'An empty jug.');
simple('jug_of_water', 'Jug of water', { kind: 'jug', color: '#4a8ad8' }, 1, 'It\'s full of water.');
simple('bucket_of_water', 'Bucket of water', { kind: 'bucket', color: '#4a8ad8' }, 6, 'It\'s a bucket of water.');
simple('bucket_of_sand', 'Bucket of sand', { kind: 'bucket', color: '#e0c880' }, 6, 'It\'s a bucket of sand.');
simple('bowl', 'Bowl', { kind: 'bowl', color: '#6a4a2a', empty: true }, 4, 'Useful for mixing things.');
simple('bowl_of_water', 'Bowl of water', { kind: 'bowl', color: '#4a8ad8' }, 4, 'It\'s a bowl of water.');

// ---------- kitchen ----------
simple('bread_dough', 'Bread dough', { kind: 'dough', color: '#e8d8b0' }, 10, 'Some uncooked dough.');
simple('pastry_dough', 'Pastry dough', { kind: 'dough', color: '#f0e0c0' }, 10, 'Some pastry dough.');
simple('pizza_base', 'Pizza base', { kind: 'pizza', color: '#e8d8b0', plain: true }, 10, 'It\'s a pizza base.');
simple('potato', 'Potato', { kind: 'potato' }, 2, 'A potato.', { food: { heal: 1 } });
simple('tomato', 'Tomato', { kind: 'tomato' }, 4, 'A ripe tomato.', { food: { heal: 2 } });
simple('cheese', 'Cheese', { kind: 'cheese' }, 8, 'A wedge of cheese.', { food: { heal: 2 } });
simple('grapes', 'Grapes', { kind: 'berries', color: '#7a3a9a' }, 4, 'Good grapes for wine making.');
simple('chocolate_bar', 'Chocolate bar', { kind: 'chocolate' }, 15, 'Mmmmm chocolate.', { food: { heal: 3 } });
simple('cake_tin', 'Cake tin', { kind: 'caketin' }, 10, 'Useful for baking cakes.');
simple('pie_dish', 'Pie dish', { kind: 'piedish' }, 3, 'Deep enough to make a pie.');
simple('pie_shell', 'Pie shell', { kind: 'pie', color: '#e8d0a0', empty: true }, 10, 'I need to find a filling for this pie.');
simple('seaweed', 'Seaweed', { kind: 'seaweed' }, 2, 'Slightly damp seaweed.');
simple('soda_ash', 'Soda ash', { kind: 'powder', color: '#e8e4d8' }, 2, 'One of the ingredients for making glass.');
const pie = (id, name, filling, heal, value) => {
  simple('uncooked_' + id, 'Uncooked ' + name.toLowerCase(), { kind: 'pie', color: filling, raw: true }, value, 'This would be much tastier cooked.');
  simple(id, name, { kind: 'pie', color: filling }, value * 2, 'Freshly baked.', { food: { heal } });
};
pie('redberry_pie', 'Redberry pie', '#c0202a', 10, 12);
pie('meat_pie', 'Meat pie', '#8a4a2a', 12, 16);
pie('fish_pie', 'Fish pie', '#c0a080', 14, 30);
simple('burnt_bread', 'Burnt bread', { kind: 'bread', burnt: true }, 1, 'Well, it\'s definitely cooked.');
simple('burnt_pie', 'Burnt pie', { kind: 'pie', color: '#2a2420', burnt: true }, 1, 'Oops. Burnt.');
simple('incomplete_stew', 'Incomplete stew', { kind: 'bowl', color: '#a88a5a' }, 4, 'I need to add something more to it.');
simple('uncooked_stew', 'Uncooked stew', { kind: 'bowl', color: '#a0703a' }, 10, 'I need to cook this.');
simple('burnt_stew', 'Burnt stew', { kind: 'bowl', color: '#2a2420' }, 1, 'Oops. Burnt.');
simple('incomplete_pizza', 'Incomplete pizza', { kind: 'pizza', color: '#d83a2a' }, 12, 'I need to add some cheese.');
simple('uncooked_pizza', 'Uncooked pizza', { kind: 'pizza', color: '#d83a2a', cheese: true, raw: true }, 16, 'This needs cooking.');
simple('plain_pizza', 'Plain pizza', { kind: 'pizza', color: '#d83a2a', cheese: true }, 40, 'A cheese and tomato pizza.', { food: { heal: 14 } });
simple('meat_pizza', 'Meat pizza', { kind: 'pizza', color: '#d83a2a', cheese: true, top: '#7a3a1a' }, 60, 'A pizza with bits of meat on it.', { food: { heal: 16 } });
simple('anchovy_pizza', 'Anchovy pizza', { kind: 'pizza', color: '#d83a2a', cheese: true, top: '#8aa0b8' }, 80, 'A pizza with anchovies.', { food: { heal: 18 } });
simple('burnt_pizza', 'Burnt pizza', { kind: 'pizza', color: '#2a2420', burnt: true }, 1, 'Oops. Burnt.');
simple('uncooked_cake', 'Uncooked cake', { kind: 'caketin', raw: true }, 20, 'Now all I need to do is cook it.');
simple('chocolate_cake', 'Chocolate cake', { kind: 'cake', choc: true }, 90, 'This looks very tasty.', { food: { heal: 15 } });
simple('burnt_cake', 'Burnt cake', { kind: 'caketin', burnt: true }, 1, 'Argh, what a mess!');
simple('jug_of_wine', 'Jug of wine', { kind: 'jug', color: '#8a1a4a' }, 60, 'It\'s full of wine.', { food: { heal: 11 } });
simple('jug_of_bad_wine', 'Jug of bad wine', { kind: 'jug', color: '#4a5a2a' }, 1, 'Oh dear, this wine is terrible!');
ITEMS.stew.examine = 'It\'s a meat and potato stew.';

// ---------- pottery ----------
simple('soft_clay', 'Soft clay', { kind: 'lump', color: '#c89a6a' }, 8, 'Clay that\'s ready to be used.');
simple('unfired_pot', 'Unfired pot', { kind: 'pot', color: '#c8a888', unfired: true }, 3, 'I need to put this in a pottery oven.');
simple('unfired_pie_dish', 'Unfired pie dish', { kind: 'piedish', unfired: true }, 3, 'I need to put this in a pottery oven.');
simple('unfired_bowl', 'Unfired bowl', { kind: 'bowl', color: '#c8a888', unfired: true }, 3, 'I need to put this in a pottery oven.');

// ---------- glass & light ----------
simple('molten_glass', 'Molten glass', { kind: 'lump', color: '#a8e0e8', glass: true }, 15, 'Hot glass ready to be blown.');
simple('glassblowing_pipe', 'Glassblowing pipe', { kind: 'pipe' }, 2, 'Use this on molten glass to make things.');
simple('beer_glass', 'Beer glass', { kind: 'glass' }, 2, 'I need to fill this with beer.');
simple('vial', 'Vial', { kind: 'vial' }, 3, 'An empty vial.');
simple('unpowered_orb', 'Unpowered orb', { kind: 'orb' }, 60, 'I\'d like to charge this with magic one day.');
simple('empty_lantern', 'Empty lantern', { kind: 'lantern', empty: true }, 20, 'It needs a candle.');
simple('candle', 'Candle', { kind: 'candle' }, 3, 'A white candle.');
simple('lit_candle', 'Lit candle', { kind: 'candle', lit: true }, 3, 'A lit candle. It lights up dark caves.', { light: true });
simple('candle_lantern', 'Candle lantern', { kind: 'lantern' }, 25, 'It needs lighting.');
simple('lit_lantern', 'Lit lantern', { kind: 'lantern', lit: true }, 25, 'A lit lantern. It lights up dark caves.', { light: true });

// ---------- spinning ----------
simple('shears', 'Shears', { kind: 'shears' }, 1, 'For shearing sheep.');
simple('wool', 'Wool', { kind: 'wool' }, 1, 'I think this came from a sheep.');
simple('ball_of_wool', 'Ball of wool', { kind: 'wool', ball: true }, 2, 'Spun from sheep\'s wool.');
simple('flax', 'Flax', { kind: 'flax' }, 5, 'A plant cultivated for fibres.');
simple('bow_string', 'Bow string', { kind: 'string' }, 100, 'I need a bow stave to attach this to.');

// ---------- leather & hides ----------
simple('needle', 'Needle', { kind: 'needle' }, 1, 'Used with a thread to make clothes.');
add('thread', { name: 'Thread', stack: true, value: 1, icon: { kind: 'thread' }, examine: 'Use with a needle to make leather things.' });
simple('leather', 'Leather', { kind: 'cloth', color: '#9a6a3a' }, 15, 'It\'s a piece of leather.');
simple('hard_leather', 'Hard leather', { kind: 'cloth', color: '#6a4a22' }, 30, 'It\'s a piece of hard leather.');
add('steel_studs', { name: 'Steel studs', stack: true, value: 30, icon: { kind: 'studs' }, examine: 'A set of studs for leather armour.', smith: { lvl: 36, bars: 1, bar: 'steel_bar' } });
wear('leather_vambraces', 'Leather vambraces', 'hands', { rng: 4, def: 2 }, { kind: 'vambraces', color: '#8a5a2b' }, { color: '#8a5a2b' }, 18);
wear('hardleather_body', 'Hardleather body', 'body', { def: 12, rng: 8, req: { defence: 10 } }, { kind: 'leatherbody', color: '#6a4a22' }, { kind: 'shirt', color: '#6a4a22' }, 80);
wear('studded_body', 'Studded body', 'body', { def: 18, rng: 11, req: { defence: 20, ranged: 20 } }, { kind: 'leatherbody', color: '#7a5a32', studs: true }, { kind: 'shirt', color: '#7a5a32' }, 300);
wear('studded_chaps', 'Studded chaps', 'legs', { def: 10, rng: 6, req: { ranged: 20 } }, { kind: 'chaps', color: '#7a5a32', studs: true }, { kind: 'pants', color: '#7a5a32' }, 250);
export const DHIDES = [
  { id: 'green', name: 'Green', color: '#3a8a3a', lvl: 57, xp: 62, def: [4, 12, 25], rng: [8, 11, 15], req: 40, val: 1600 },
  { id: 'blue', name: 'Blue', color: '#2a5ab0', lvl: 66, xp: 70, def: [5, 15, 32], rng: [9, 14, 20], req: 50, val: 2000 },
  { id: 'red', name: 'Red', color: '#b02a2a', lvl: 73, xp: 78, def: [6, 18, 40], rng: [10, 17, 25], req: 60, val: 2600 },
  { id: 'black', name: 'Black', color: '#2a2a30', lvl: 79, xp: 86, def: [7, 22, 48], rng: [11, 20, 30], req: 70, val: 3600 },
];
for (const h of DHIDES) {
  simple(h.id + '_dragonhide', `${h.name} dragonhide`, { kind: 'hide', color: h.color, scaly: true }, Math.round(h.val / 2), 'The scaly rough hide from a dragon.');
  simple(h.id + '_dragon_leather', `${h.name} dragon leather`, { kind: 'cloth', color: h.color }, h.val, 'It\'s a piece of prepared dragonhide.');
  wear(h.id + '_dhide_vamb', `${h.name} d'hide vambraces`, 'hands', { rng: h.rng[0], def: h.def[0], req: { ranged: h.req } }, { kind: 'vambraces', color: h.color }, { color: h.color }, h.val * 1.2);
  wear(h.id + '_dhide_chaps', `${h.name} d'hide chaps`, 'legs', { rng: h.rng[1], def: h.def[1], req: { ranged: h.req } }, { kind: 'chaps', color: h.color }, { kind: 'pants', color: h.color }, h.val * 2.4);
  wear(h.id + '_dhide_body', `${h.name} d'hide body`, 'body', { rng: h.rng[2], def: h.def[2], req: { defence: 40, ranged: h.req } }, { kind: 'leatherbody', color: h.color, scaly: true }, { kind: 'shirt', color: h.color }, h.val * 3.6);
}

// ---------- gems & jewellery ----------
export const SEMI_GEMS = [
  { id: 'opal', name: 'Opal', color: '#e8e0f0', lvl: 1, xp: 15, val: 30 },
  { id: 'jade', name: 'Jade', color: '#6ab07a', lvl: 13, xp: 20, val: 60 },
  { id: 'red_topaz', name: 'Red topaz', color: '#e86a3a', lvl: 16, xp: 25, val: 90 },
];
for (const g of SEMI_GEMS) {
  simple('uncut_' + g.id, 'Uncut ' + g.name.toLowerCase(), { kind: 'uncut', color: g.color }, Math.round(g.val / 2), 'An uncut semi-precious stone.');
  add(g.id, { name: g.name, value: g.val, icon: { kind: 'gem', color: g.color }, examine: 'A semi-precious stone.', cut: { from: 'uncut_' + g.id, lvl: g.lvl, xp: g.xp } });
}
simple('necklace_mould', 'Necklace mould', { kind: 'mould_ring', necklace: true }, 5, 'Used to make gold necklaces.');
simple('bracelet_mould', 'Bracelet mould', { kind: 'mould_ring', bracelet: true }, 5, 'Used to make gold bracelets.');
simple('holy_mould', 'Holy mould', { kind: 'mould_ring', holy: true }, 5, 'A mould for holy symbols.');
{
  const lv = { gold: [[6, 20], [7, 25]], sapphire: [[22, 55], [23, 60]], emerald: [[29, 60], [30, 65]], ruby: [[40, 75], [42, 80]], diamond: [[56, 90], [58, 95]], dragonstone: [[72, 105], [74, 110]] };
  const names = { gold: 'Gold', sapphire: 'Sapphire', emerald: 'Emerald', ruby: 'Ruby', diamond: 'Diamond', dragonstone: 'Dragonstone' };
  const cols = { gold: null, sapphire: '#2a5ad8', emerald: '#2ab04a', ruby: '#d82a3a', diamond: '#e8f0f8', dragonstone: '#a03ad8' };
  Object.keys(lv).forEach((g, i) => {
    const gem = g === 'gold' ? null : g, val = [150, 250, 500, 1000, 2000, 10000][i];
    add(g + '_necklace', { name: names[g] + ' necklace', value: val + 300, icon: { kind: 'necklace', color: cols[g] }, equip: { slot: 'neck', att: i, str: 0, def: i * 2, prayer: 0, look: { color: cols[g] || '#e8c13a' } }, examine: 'A shiny necklace.' });
    add(g + '_bracelet', { name: names[g] + ' bracelet', value: val + 250, icon: { kind: 'bracelet', color: cols[g] }, equip: { slot: 'hands', att: i, str: i, def: i, prayer: 0, look: { color: cols[g] || '#e8c13a' } }, examine: 'A shiny bracelet.' });
    JEWELLERY.push({ out: g + '_necklace', gem, mould: 'necklace_mould', lvl: lv[g][0][0], xp: lv[g][0][1] });
    JEWELLERY.push({ out: g + '_bracelet', gem, mould: 'bracelet_mould', lvl: lv[g][1][0], xp: lv[g][1][1] });
  });
  JEWELLERY.sort((a, b) => a.lvl - b.lvl);
}

// ---------- thieving goods ----------
simple('fur', 'Fur', { kind: 'cloth', color: '#b89a6a' }, 120, 'Warm, soft fur.');
simple('spice', 'Spice', { kind: 'powder', color: '#c8501a' }, 230, 'A small pouch of expensive spice.');
simple('lockpick', 'Lockpick', { kind: 'key', color: '#9a9a9a' }, 20, 'For picking locks.');

// =====================================================================================
// 1.2 Ranged & Fletching: bows, arrows, darts, crossbows, bolts.
//   equip.ranged = { type: 'bow' | 'crossbow' | 'thrown', range, tier }  (tier = best ammo it fires)
//   ammo items:    equip.slot 'ammo', equip.ammo = { type: 'arrow' | 'bolt', tier }, equip.rstr
// Recipes for all of these are in data/recipes.js.
// =====================================================================================
add('knife', { name: 'Knife', value: 6, icon: { kind: 'knife' }, examine: 'A dangerous looking knife.' });
add('arrow_shaft', { name: 'Arrow shaft', stack: true, value: 1, icon: { kind: 'shaft' }, examine: 'A wooden arrow shaft.' });
add('headless_arrow', { name: 'Headless arrow', stack: true, value: 1, icon: { kind: 'arrow', headless: true }, examine: 'A wooden arrow shaft with flights attached.' });
export const BOW_WOODS = [
  { pre: '', logs: 'logs', name: '', color: '#8a5a2b', req: 1, fl: [5, 10], xp: [5, 10], rng: 8, tier: 1, val: 50 },
  { pre: 'oak_', logs: 'oak_logs', name: 'Oak ', color: '#a0703a', req: 5, fl: [20, 25], xp: [16.5, 25], rng: 14, tier: 2, val: 150 },
  { pre: 'willow_', logs: 'willow_logs', name: 'Willow ', color: '#7d6a3a', req: 20, fl: [35, 40], xp: [33.3, 41.5], rng: 20, tier: 3, val: 400 },
  { pre: 'maple_', logs: 'maple_logs', name: 'Maple ', color: '#b0582a', req: 30, fl: [50, 55], xp: [50, 58.3], rng: 29, tier: 4, val: 800 },
  { pre: 'yew_', logs: 'yew_logs', name: 'Yew ', color: '#6a3a1c', req: 40, fl: [65, 70], xp: [67.5, 75], rng: 47, tier: 5, val: 1600 },
  { pre: 'magic_', logs: 'magic_logs', name: 'Magic ', color: '#3a5aa0', req: 50, fl: [80, 85], xp: [83.3, 91.5], rng: 69, tier: 5, val: 4000 },
  { pre: 'heartwood_', logs: 'heartwood_logs', name: 'Heartwood ', color: '#c8402a', req: 65, fl: [92, 96], xp: [110, 120], rng: 82, tier: 6, val: 30000 },
];
for (const b of BOW_WOODS) {
  for (const [k, range, speed] of [['shortbow', 7, 4], ['longbow', 9, 6]]) {
    const id = b.pre + k, nm = b.name + k;
    add(id + '_u', { name: `${nm[0].toUpperCase() + nm.slice(1)} (u)`, value: Math.round(b.val * (k === 'longbow' ? 1.2 : 1) * 0.6), icon: { kind: k, color: b.color, unstrung: true }, examine: 'I need to find a string for this.' });
    add(id, { name: nm[0].toUpperCase() + nm.slice(1), value: Math.round(b.val * (k === 'longbow' ? 1.2 : 1)), icon: { kind: k, color: b.color }, examine: `A ${nm.toLowerCase()}.`,
      equip: { slot: 'weapon', att: 0, str: 0, def: 0, rng: b.rng, speed, twoHanded: true, req: { ranged: b.req }, ranged: { type: 'bow', range, tier: b.tier }, look: { kind: k, color: b.color } } });
  }
}
ITEMS.heartwood_shortbow.rare = false;
export const AMMO_METALS = [
  // metal, tier, arrow rstr, arrow fletch lvl/xp, dart rstr, dart fletch lvl/xp, dart req, bolt rstr, crossbow fletch lvl/xp, crossbow rng, crossbow req, stock
  { m: 'bronze', tier: 0, arrow: [7, 1, 1.3], dart: [1, 10, 1.8, 1], bolt: 10, xbow: [9, 12, 18, 1, 'wooden_stock'], val: 1 },
  { m: 'iron', tier: 1, arrow: [10, 15, 2.5], dart: [3, 22, 3.8, 1], bolt: 22, xbow: [39, 22, 30, 16, 'oak_stock'], val: 3 },
  { m: 'steel', tier: 2, arrow: [16, 30, 5], dart: [4, 37, 7.5, 5], bolt: 32, xbow: [46, 27, 42, 26, 'willow_stock'], val: 12 },
  { m: 'mithril', tier: 3, arrow: [22, 45, 7.5], dart: [7, 52, 11.2, 20], bolt: 44, xbow: [54, 32, 52, 36, 'teak_stock'], val: 32 },
  { m: 'adamant', tier: 4, arrow: [31, 60, 10], dart: [10, 67, 15, 30], bolt: 56, xbow: [61, 41, 61, 46, 'maple_stock'], val: 80 },
  { m: 'rune', tier: 5, arrow: [49, 75, 12.5], dart: [14, 81, 18.8, 40], bolt: 72, xbow: [69, 50, 90, 61, 'mahogany_stock'], val: 200 },
  { m: 'dragon', tier: 6, arrow: [60, 90, 15], val: 900 },
];
export const STOCKS = [['wooden_stock', 'Wooden stock', 'logs', 9, 6], ['oak_stock', 'Oak stock', 'oak_logs', 24, 16], ['willow_stock', 'Willow stock', 'willow_logs', 39, 22], ['teak_stock', 'Teak stock', 'teak_logs', 46, 27], ['maple_stock', 'Maple stock', 'maple_logs', 54, 32], ['mahogany_stock', 'Mahogany stock', 'mahogany_logs', 61, 41]];
for (const [id, name, logs, lvl, xp] of STOCKS) add(id, { name, value: 20 + lvl * 3, icon: { kind: 'stock', color: ITEMS[logs].icon.color }, examine: 'A crossbow stock.' });
for (const a of AMMO_METALS) {
  const M = METALS[a.m], Nm = M.name;
  const smith = (off, qty) => (M.smith != null ? { lvl: Math.min(99, M.smith + off), bars: 1, bar: a.m + '_bar', qty } : null);
  add(a.m + '_arrowtips', { name: `${Nm} arrowtips`, stack: true, value: Math.max(1, Math.round(a.val * 0.4)), icon: { kind: 'arrowtips', color: M.color }, examine: 'I can make some arrows with these.', smith: smith(5, 15), rare: a.m === 'dragon' });
  add(a.m + '_arrow', { name: `${Nm} arrow`, stack: true, value: a.val, icon: { kind: 'arrow', color: M.color }, examine: `Arrows with ${a.m} heads.`,
    equip: { slot: 'ammo', att: 0, str: 0, def: 0, rstr: a.arrow[0], ammo: { type: 'arrow', tier: a.tier }, look: {} } });
  if (!a.dart) continue;
  add(a.m + '_dart_tip', { name: `${Nm} dart tip`, stack: true, value: Math.max(1, Math.round(a.val * 0.5)), icon: { kind: 'darttip', color: M.color }, examine: 'Deadly, once it has flights.', smith: smith(4, 10) });
  add(a.m + '_dart', { name: `${Nm} dart`, stack: true, value: a.val + 1, icon: { kind: 'dart', color: M.color }, examine: `A deadly throwing dart with ${a.m} tip.`,
    equip: { slot: 'weapon', att: 0, str: 0, def: 0, rng: 2 + a.tier * 2, rstr: a.dart[0], speed: 3, req: { ranged: a.dart[3] }, ranged: { type: 'thrown', range: 4 }, look: { kind: 'dart', color: M.color } } });
  add(a.m + '_limbs', { name: `${Nm} limbs`, value: a.val * 20, icon: { kind: 'limbs', color: M.color }, examine: 'A pair of crossbow limbs.', smith: smith(6, 1) });
  add(a.m + '_crossbow_u', { name: `${Nm} crossbow (u)`, value: a.val * 30, icon: { kind: 'crossbow', color: M.color, unstrung: true }, examine: 'It needs a string.' });
  add(a.m + '_crossbow', { name: `${Nm} crossbow`, value: a.val * 40, icon: { kind: 'crossbow', color: M.color }, examine: `A ${a.m} crossbow.`,
    equip: { slot: 'weapon', att: 0, str: 0, def: 0, rng: a.xbow[2], speed: 5, req: { ranged: a.xbow[3] }, ranged: { type: 'crossbow', range: 7, tier: a.tier }, look: { kind: 'crossbow', color: M.color } } });
  add(a.m + '_bolts_unf', { name: `${Nm} bolts (unf)`, stack: true, value: Math.max(1, Math.round(a.val * 0.5)), icon: { kind: 'bolt', color: M.color, unf: true }, examine: 'Unfeathered bolts.', smith: smith(3, 10) });
  add(a.m + '_bolts', { name: `${Nm} bolts`, stack: true, value: a.val * 2, icon: { kind: 'bolt', color: M.color }, examine: `Crossbow bolts with ${a.m} tips.`,
    equip: { slot: 'ammo', att: 0, str: 0, def: 0, rstr: a.bolt, ammo: { type: 'bolt', tier: a.tier }, look: {} } });
}

// =====================================================================================
// 1.3 Magic & Runecraft
// =====================================================================================
add('rune_essence', { name: 'Rune essence', value: 4, icon: { kind: 'essence' }, examine: 'An uncharged rune stone.' });
add('tiara_mould', { name: 'Tiara mould', value: 5, icon: { kind: 'mould_ring', tiara: true }, examine: 'A mould for tiaras.' });
add('tiara', { name: 'Tiara', value: 100, icon: { kind: 'tiara' }, equip: { slot: 'head', att: 0, str: 0, def: 0, look: { kind: 'crown', color: '#d8dce0' } }, examine: 'A silver tiara. It could be bound to an altar.' });
for (const r of RUNES) {
  add(r.item, { name: `${r.name} rune`, stack: true, value: [4, 3, 4, 4, 4, 16, 50, 90, 180, 240, 300, 400][RUNES.indexOf(r)], icon: { kind: 'rune', color: r.color }, examine: `One of the 12 runes of power: ${r.name.toLowerCase()}.` });
  add(r.id + '_talisman', { name: `${r.name} talisman`, value: 30 + r.lvl * 4, icon: { kind: 'talisman', color: r.color }, examine: `A mysterious power emanates from it. It pulls toward the ${r.name.toLowerCase()} altar.`, talisman: r.id });
  add(r.id + '_tiara', { name: `${r.name} tiara`, value: 150 + r.lvl * 5, icon: { kind: 'tiara', color: r.color }, talisman: r.id,
    equip: { slot: 'head', att: 0, str: 0, def: 0, look: { kind: 'crown', color: '#d8dce0' } }, examine: `A tiara bound to the ${r.name.toLowerCase()} altar.` });
}
// staves (equip.magic marks a weapon that can autocast)
const staff = (id, name, color, mag, att, str, value, req = {}, extra = {}) => add(id, { name, value, icon: { kind: 'staff', color }, examine: extra.examine || `A ${name.toLowerCase()}.`, ...extra,
  equip: { slot: 'weapon', att, str, def: 0, mag, speed: 5, twoHanded: true, req, magic: true, look: { kind: 'staff', color } } });
staff('staff', 'Staff', '#8a3ad8', 6, 2, 3, 15);
for (const [e, c] of [['air', '#d8e8f0'], ['water', '#3a7ad8'], ['earth', '#8a6a3a'], ['fire', '#e0401a']]) {
  staff(`staff_of_${e}`, `Staff of ${e}`, c, 10, 3, 4, 1500, {}, { examine: `A magical staff that provides endless ${e} runes.` });
  staff(`${e}_battlestaff`, `${e[0].toUpperCase() + e.slice(1)} battlestaff`, c, 12, 9, 12, 9000, { magic: 30, attack: 30 }, { examine: `A powerful battlestaff. It provides endless ${e} runes.` });
  add(`${e}_orb`, { name: `${e[0].toUpperCase() + e.slice(1)} orb`, value: 900, icon: { kind: 'orb', color: c }, examine: `A magic glowing orb of ${e}.` });
}
add('battlestaff', { name: 'Battlestaff', value: 5000, icon: { kind: 'staff', color: '#6a4a2a', plain: true }, examine: 'A staff waiting for an orb.',
  equip: { slot: 'weapon', att: 9, str: 12, def: 0, mag: 10, speed: 5, twoHanded: true, req: { attack: 30 }, magic: true, look: { kind: 'staff', color: '#6a4a2a' } } });
// robes
wear('mystic_hat', 'Mystic hat', 'head', { mag: 4, def: 2, req: { magic: 40, defence: 20 } }, { kind: 'wizhat', color: '#2a4ab0' }, { kind: 'wizhat', color: '#2a4ab0' }, 15000);
wear('mystic_top', 'Mystic robe top', 'body', { mag: 20, def: 20, req: { magic: 40, defence: 20 } }, { kind: 'robe', color: '#2a4ab0' }, { kind: 'robe', color: '#2a4ab0' }, 120000);
wear('mystic_bottom', 'Mystic robe bottom', 'legs', { mag: 15, def: 15, req: { magic: 40, defence: 20 } }, { kind: 'chaps', color: '#2a4ab0' }, { kind: 'pants', color: '#2a4ab0' }, 80000);
wear('mystic_gloves', 'Mystic gloves', 'hands', { mag: 5, def: 2, req: { magic: 40, defence: 20 } }, { kind: 'gloves', color: '#2a4ab0' }, { color: '#2a4ab0' }, 10000);
wear('mystic_boots', 'Mystic boots', 'feet', { mag: 3, def: 2, req: { magic: 40, defence: 20 } }, { kind: 'boots', color: '#2a4ab0' }, { color: '#2a4ab0' }, 10000);
Object.assign(ITEMS.wizard_hat.equip, { mag: 2 }); Object.assign(ITEMS.wizard_robe.equip, { mag: 3 });
Object.assign(ITEMS.dark_wizard_hat.equip, { mag: 2 }); Object.assign(ITEMS.dark_wizard_robe.equip, { mag: 3 });
// enchanted jewellery; charges are separate items, like the classic game
wear('ring_of_recoil', 'Ring of recoil', 'ring', { def: 1 }, { kind: 'ring', color: '#2a5ad8' }, {}, 900, { examine: 'Hurts whoever hurts you. It crumbles after enough use.' });
wear('ring_of_forging', 'Ring of forging', 'ring', { def: 2 }, { kind: 'ring', color: '#d82a3a' }, {}, 1400, { examine: 'Iron is always pure while you wear it.' });
wear('ring_of_life', 'Ring of life', 'ring', { def: 3 }, { kind: 'ring', color: '#e8f0f8' }, {}, 3500, { examine: 'Saves you once, when you are nearly dead.' });
for (let c = 8; c >= 1; c--) wear(`travellers_necklace_${c}`, `Traveller's necklace (${c})`, 'neck', { def: 2 }, { kind: 'necklace', color: '#2ab04a' }, { color: '#2ab04a' }, 800 + c * 60, { examine: 'Rub it to travel to a dungeon entrance.', jewelTele: 'travellers', charges: c });
for (let c = 4; c >= 0; c--) wear(`amulet_of_glory_${c}`, c ? `Amulet of glory (${c})` : 'Amulet of glory', 'neck', { att: 10, str: 6, def: 10, mag: 10, rng: 10 }, { kind: 'amulet', color: '#a03ad8' }, { color: '#a03ad8' }, 12000 + c * 500, { examine: c ? 'Rub it to teleport.' : 'It has run out of charges.', jewelTele: c ? 'glory' : null, charges: c });

// =====================================================================================
// 1.4 Herblore & Agility
// =====================================================================================
// Herbs (PixScape's own flora): clean level/xp, and the level band of monsters that drop them.
export const HERBS = [
  ['brightleaf', 'Brightleaf', '#6ab04a', 3, 2.5], ['marshmint', 'Marshmint', '#4a9a6a', 5, 3.8], ['tarroot', 'Tarroot', '#8a7a3a', 11, 5],
  ['harrowbloom', 'Harrowbloom', '#b0803a', 20, 6.3], ['rannet', 'Rannet', '#3a8a3a', 25, 7.5], ['toadweed', 'Toadweed', '#6a8a2a', 30, 8],
  ['iris', 'Iris', '#6a6ad8', 40, 8.8], ['avenroot', 'Avenroot', '#9a6a3a', 48, 10], ['kwellwort', 'Kwellwort', '#4a7a4a', 54, 11.3],
  ['snapdrake', 'Snapdrake', '#c83a3a', 59, 11.8], ['cadenroot', 'Cadenroot', '#8a3a6a', 65, 12.5], ['lanternbloom', 'Lanternbloom', '#e8b030', 67, 13.1],
  ['dwarfmoss', 'Dwarfmoss', '#5a6a3a', 70, 13.8], ['torchbloom', 'Torchbloom', '#e8602a', 75, 15],
].map(([id, name, color, lvl, xp]) => ({ id, name, color, lvl, xp }));
for (const h of HERBS) {
  add('grimy_' + h.id, { name: `Grimy ${h.name.toLowerCase()}`, value: 5 + h.lvl * 4, icon: { kind: 'herb', color: h.color, grimy: true }, examine: 'I need to clean this herb before I can use it.', herb: h.id });
  add(h.id, { name: h.name, value: 8 + h.lvl * 5, icon: { kind: 'herb', color: h.color }, examine: `A fresh ${h.name.toLowerCase()} leaf.` });
  add(h.id + '_potion_unf', { name: `${h.name} potion (unf)`, value: 10 + h.lvl * 5, icon: { kind: 'potion', color: h.color, unf: true }, examine: 'I need another ingredient to finish this potion.' });
}
add('vial_of_water', { name: 'Vial of water', value: 4, icon: { kind: 'potion', color: '#a8c8f0' }, examine: 'A glass vial full of water.' });
add('pestle_and_mortar', { name: 'Pestle and mortar', value: 4, icon: { kind: 'pestle' }, examine: 'I can grind things for potions in this.' });
// secondaries
const second = [
  ['eye_of_newt', 'Eye of newt', { kind: 'eye' }, 3, 'It seems to be looking at me.'],
  ['seashell', 'Seashell', { kind: 'shell' }, 5, 'A pretty spiral shell.'],
  ['crushed_shell', 'Crushed shell', { kind: 'powder', color: '#f0e8e0' }, 20, 'Ground seashell. Good against poison.'],
  ['limpwurt_root', 'Limpwurt root', { kind: 'root', color: '#c8a870' }, 30, 'The root of a limpwurt plant.'],
  ['red_spiders_eggs', "Red spiders' eggs", { kind: 'eggs', color: '#c83a2a' }, 40, 'Eurgh! They\'re still moving.'],
  ['chocolate_dust', 'Chocolate dust', { kind: 'powder', color: '#5a3018' }, 20, 'It\'s ground up chocolate.'],
  ['white_berries', 'White berries', { kind: 'berries', color: '#f0f0e8' }, 30, 'Poisonous berries. Perfect for potions.'],
  ['snape_grass', 'Snape grass', { kind: 'grass', color: '#6ab06a' }, 30, 'Strange spiky grass.'],
  ['bog_fungus', 'Bog fungus', { kind: 'fungus', color: '#8a7a5a' }, 50, 'It grows on dead things in the swamp.'],
  ['dragon_scale', 'Blue dragon scale', { kind: 'scale', color: '#2a5ab0' }, 60, 'A large shiny scale.'],
  ['dragon_scale_dust', 'Dragon scale dust', { kind: 'powder', color: '#4a7ad8' }, 90, 'Finely ground blue dragon scale.'],
  ['fire_lily', 'Fire lily', { kind: 'flower', color: '#e8501a' }, 90, 'It grows where the ground is hot.'],
  ['desert_bloom', 'Desert bloom', { kind: 'flower', color: '#e8c050' }, 80, 'A tough little cactus flower.'],
];
for (const [id, name, icon, value, examine] of second) add(id, { name, value, icon, examine });
// potions made with Herblore (some already exist from earlier releases)
const potion = (id, name, color, value, ex) => { if (!ITEMS[id]) add(id, { name, value, icon: { kind: 'potion', color }, examine: ex }); };
potion('antipoison', 'Antipoison', '#e8a0c0', 60, 'Cures poison and protects against it for a while.');
potion('energy_potion', 'Energy potion', '#c8a870', 50, 'Restores 20% run energy.');
potion('restore_potion', 'Restore potion', '#e05050', 80, 'Restores lowered stats.');
potion('superantipoison', 'Superantipoison', '#e870b0', 150, 'Cures poison and protects against it for a long time.');
potion('super_energy', 'Super energy', '#a0602a', 150, 'Restores 40% run energy.');
potion('super_restore', 'Super restore', '#e0306a', 400, 'Restores stats and prayer.');
potion('antifire_potion', 'Antifire potion', '#8a3ad8', 500, 'Protects against dragonfire for a while.');
potion('ranging_potion', 'Ranging potion', '#3ab0b0', 400, 'Boosts Ranged.');
potion('magic_potion', 'Magic potion', '#3a3ad8', 400, 'Boosts Magic.');
potion('super_combat', 'Super combat potion', '#3a6a2a', 1200, 'Boosts Attack, Strength and Defence.');
potion('agility_potion', 'Agility potion', '#8ac8e8', 120, 'Boosts Agility.');
Object.assign(POTIONS, {
  antipoison: { cure: 150 }, superantipoison: { cure: 600 },
  energy_potion: { energy: 20 }, super_energy: { energy: 40 },
  restore_potion: { restoreStats: [10, 0.3] }, super_restore: { restoreStats: [8, 0.25], restore: [8, 0.25] },
  antifire_potion: { antifire: 600 }, agility_potion: { boost: { agility: [3, 0] } },
  ranging_potion: { boost: { ranged: [4, 0.1] } }, magic_potion: { boost: { magic: [4, 0] } },
  super_combat: { boost: { attack: [5, 0.15], strength: [5, 0.15], defence: [5, 0.15] } },
});
// agility rewards
add('mark_of_grace', { name: 'Mark of grace', stack: true, value: 0, icon: { kind: 'mark' }, examine: 'A token of the agile. Trade them with Grace in Highcrest.' });
const graceful = [['graceful_hood', 'Graceful hood', 'head', 'hood', 35], ['graceful_cape', 'Graceful cape', 'cape', 'cape', 40], ['graceful_top', 'Graceful top', 'body', 'robe', 55], ['graceful_legs', 'Graceful legs', 'legs', 'chaps', 60], ['graceful_gloves', 'Graceful gloves', 'hands', 'gloves', 30], ['graceful_boots', 'Graceful boots', 'feet', 'boots', 40]];
export const GRACEFUL = {};
for (const [id, name, slot, kind, marks] of graceful) {
  GRACEFUL[id] = marks;
  const look = slot === 'head' ? { kind: 'hood', color: '#3a8a8a' } : slot === 'body' ? { kind: 'shirt', color: '#3a8a8a' } : slot === 'legs' ? { kind: 'pants', color: '#3a8a8a' } : { color: '#3a8a8a' };
  wear(id, name, slot, { def: 0 }, { kind, color: '#3a8a8a' }, look, 1000, { examine: 'Light and comfortable. Great for running.', graceful: true });
}

// =====================================================================================
// 1.5 Slayer
// =====================================================================================
add('slayer_gem', { name: 'Enchanted gem', value: 1, icon: { kind: 'gem', color: '#8a2a8a' }, examine: 'A magical gem. It tells you your slayer task.' });
wear('slayer_helmet', 'Slayer helmet', 'head', { def: 10, att: 0, req: { defence: 10 } }, { kind: 'fullhelm', color: '#2a2a2a' }, { kind: 'fullhelm', color: '#2a2a2a' }, 20000, { examine: 'Hits harder and truer against your slayer task.' });
wear('mirror_shield', 'Mirror shield', 'shield', { def: 12, req: { defence: 20 } }, { kind: 'sqshield', color: '#c8d0d8' }, { kind: 'sqshield', color: '#c8d0d8' }, 5000, { examine: 'Reflects a stonegaze\'s glare back at it.' });
add('rock_hammer', { name: 'Rock hammer', value: 500, icon: { kind: 'hammer' }, examine: 'For finishing off gargoyles.' });
wear('crawler_gloves', 'Crawler gloves', 'hands', { att: 3, str: 2, def: 3 }, { kind: 'gloves', color: '#b8a890' }, { color: '#b8a890' }, 8000, { rare: true, examine: 'Gloves that grip on their own. Unsettling.' });
wear('ember_ring', 'Ember ring', 'ring', { str: 4, mag: 4 }, { kind: 'ring', color: '#e8701a' }, {}, 60000, { rare: true, examine: 'Warm to the touch.' });
wear('gargoyle_maul', 'Gargoyle maul', 'weapon', { att: 60, str: 100, speed: 6, twoHanded: true, req: { strength: 65 } }, { kind: 'maul', color: '#7a7a74' }, { kind: 'maul', color: '#7a7a74' }, 500000, { rare: true, examine: 'A slab of living stone on a handle.' });
wear('void_lash', 'Void lash', 'weapon', { att: 82, str: 82, speed: 4, req: { attack: 70 } }, { kind: 'lash', color: '#8a3ae8' }, { kind: 'lash', color: '#8a3ae8' }, 1800000, { rare: true, examine: 'It cracks through the gaps between worlds.' });
wear('rift_cape', 'Rift cape', 'cape', { att: 5, str: 5, def: 8, rng: 5, mag: 5, prayer: 2 }, { kind: 'cape', color: '#3a1a5a' }, { color: '#3a1a5a', trim: '#b060ff' }, 800000, { rare: true, examine: 'The fabric shows a different sky.' });
add('shadowbow', { name: 'Shadowbow', value: 2500000, rare: true, icon: { kind: 'longbow', color: '#2a2a34' }, examine: 'It fires two arrows at once, into the dark.',
  equip: { slot: 'weapon', att: 0, str: 0, def: 0, rng: 95, speed: 7, twoHanded: true, req: { ranged: 70 }, ranged: { type: 'bow', range: 9, tier: 6, double: true }, look: { kind: 'longbow', color: '#2a2a34' } } });

// =====================================================================================
// 1.6 quest rewards and quest items
// =====================================================================================
quest('ancient_scroll', 'Ancient scroll', 'scroll', '#d8c090', 'A map of lands east of the desert river.');
quest('dragon_heartstring', 'Dragon heartstring', 'string', '#6a8ae8', 'A shimmering sinew from a blue dragon.');
quest('abbey_bell', 'Abbey bell', 'bell', '#c8a040', 'It still rings, very faintly, on its own.');
quest('ancient_hammer', 'Ancient forge-hammer', 'hammer', '#6a6a70', 'The lost hammer of the Crestfall forge.');
wear('knight_cape', "Knight's cape", 'cape', { att: 3, str: 3, def: 9, prayer: 3 }, { kind: 'cape', color: '#2a4ab0' }, { color: '#2a4ab0', trim: '#e8c13a' }, 50000, { examine: 'Worn by the Knights of Aldermoor.' });
wear('scarab_charm', 'Scarab charm', 'neck', { att: 6, str: 6, def: 6, prayer: 3 }, { kind: 'amulet', color: '#2ab0d8' }, { color: '#2ab0d8' }, 40000, { examine: 'The sun beetle, small and watchful.' });
wear('sylvan_boots', 'Sylvan boots', 'feet', { def: 4, rng: 4, mag: 2 }, { kind: 'boots', color: '#4aa06a' }, { color: '#4aa06a' }, 30000, { examine: 'They make no sound on leaves.' });
wear('blessed_symbol', 'Blessed symbol', 'neck', { prayer: 12, def: 2 }, { kind: 'amulet', color: '#f0e8a0' }, { color: '#f0e8a0' }, 40000, { examine: 'The abbey\'s symbol, blessed anew.' });
wear('dwarven_helm', 'Dwarven helm', 'head', { def: 26, str: 3, req: { defence: 50 } }, { kind: 'fullhelm', color: '#8a7a4a', gilded: true }, { kind: 'fullhelm', color: '#8a7a4a', trim: '#c8a040' }, 60000, { examine: 'The first dwarven helm in a hundred years.' });
add('sylvan_bow', { name: 'Sylvan bow', value: 900000, icon: { kind: 'longbow', color: '#6ae08a' }, examine: 'Arrows grow from its string.',
  equip: { slot: 'weapon', att: 0, str: 0, def: 0, rng: 90, rstr: 55, speed: 5, twoHanded: true, req: { ranged: 70 }, ranged: { type: 'bow', range: 10, tier: 6, infinite: true }, look: { kind: 'longbow', color: '#6ae08a' } } });

// achievement diary rewards: one item per region, better at each tier
for (const [region, dy] of Object.entries(DIARIES)) {
  const [slot, name, color] = dy.reward;
  TIERS.forEach((tier, i) => {
    const t = i + 1, look = slot === 'head' ? { kind: 'hood', color } : slot === 'shield' ? { kind: 'sqshield', color } : slot === 'legs' ? { kind: 'pants', color } : { color };
    const kind = { cape: 'cape', feet: 'boots', neck: 'amulet', hands: 'gloves', ring: 'ring', head: 'coif', shield: 'sqshield', legs: 'chaps' }[slot];
    wear(diaryItem(region, tier), `${name} ${t}`, slot, { att: t, str: t, def: t * 2 + (slot === 'shield' ? 8 : 0), prayer: Math.ceil(t / 2), rng: t, mag: t }, { kind, color }, look, 500 * t * t, { examine: `A reward for the ${dy.name} ${tier} diary.` });
  });
}

// =====================================================================================
// 1.7 Farming & Hunter (crop and prey data in data/farming.js)
// =====================================================================================
add('weeds', { name: 'Weeds', value: 1, icon: { kind: 'grass', color: '#6a7a3a' }, examine: 'A handful of weeds.' });
add('rake', { name: 'Rake', value: 6, icon: { kind: 'rake' }, examine: 'Use this to clear weeds.' });
add('seed_dibber', { name: 'Seed dibber', value: 6, icon: { kind: 'dibber' }, examine: 'Use this to plant seeds with.' });
add('compost', { name: 'Compost', value: 30, icon: { kind: 'bucket', color: '#5a3a1a' }, examine: 'Makes crops grow better. Use it on a patch.' });
for (const [id, name, color, heal, val] of [['onion', 'Onion', '#e8d8a8', 1, 3], ['cabbage', 'Cabbage', '#6ab04a', 2, 3], ['sweetcorn', 'Sweetcorn', '#f0d040', 3, 8], ['strawberry', 'Strawberry', '#e83a4a', 4, 20], ['watermelon', 'Watermelon', '#3a8a3a', 6, 40]])
  add(id, { name, value: val, icon: { kind: 'produce', color }, food: { heal }, examine: `A fresh ${name.toLowerCase()}.` });
for (const [id, name, color] of [['potato', 'Potato', '#b8905a'], ['onion', 'Onion', '#e8d8a8'], ['cabbage', 'Cabbage', '#6ab04a'], ['tomato', 'Tomato', '#d8302a'], ['sweetcorn', 'Sweetcorn', '#f0d040'], ['strawberry', 'Strawberry', '#e83a4a'], ['watermelon', 'Watermelon', '#3a8a3a']])
  add(id + '_seed', { name: `${name} seed`, stack: true, value: 2, icon: { kind: 'seed', color }, examine: 'Plant it in an allotment with a seed dibber.' });
for (const h of HERBS) add(h.id + '_seed', { name: `${h.name} seed`, stack: true, value: 10 + h.lvl * 6, icon: { kind: 'seed', color: h.color }, examine: `Plant it in a herb patch to grow ${h.name.toLowerCase()}.` });
for (const [id, name] of [['oak', 'Acorn'], ['willow', 'Willow seed'], ['maple', 'Maple seed'], ['yew', 'Yew seed'], ['magic', 'Magic seed']])
  add(id + '_seed', { name, stack: true, value: { oak: 80, willow: 400, maple: 1500, yew: 8000, magic: 30000 }[id], icon: { kind: 'seed', color: '#8a5a2b', big: true }, examine: 'Plant it in a tree patch.' });
add('bird_snare', { name: 'Bird snare', value: 6, icon: { kind: 'snare' }, examine: 'Lay it where birds live.' });
add('box_trap', { name: 'Box trap', value: 38, icon: { kind: 'boxtrap' }, examine: 'Lay it where small creatures live.' });
wear('butterfly_net', 'Butterfly net', 'weapon', { att: 0, str: 0, speed: 5 }, { kind: 'bnet' }, { kind: 'staff', color: '#c8b890' }, 24, { examine: 'For catching butterflies.' });
add('raw_bird_meat', { name: 'Raw bird meat', value: 5, icon: { kind: 'drumstick', color: '#e8a0a0', raw: true }, examine: 'I need to cook this first.' });
add('roast_bird_meat', { name: 'Roast bird meat', value: 12, icon: { kind: 'drumstick', color: '#a0602a' }, food: { heal: 6 }, examine: 'Mmm, roast bird.' });
COOKING.raw_bird_meat = { lvl: 11, xp: 62, out: 'roast_bird_meat', burnt: 'burnt_meat', stop: 44 };
for (const [id, name, color, rstr, req] of [['grey_chinchompa', 'Grey chinchompa', '#9a9aa0', 45, 45], ['red_chinchompa', 'Red chinchompa', '#c83a2a', 70, 55], ['black_chinchompa', 'Black chinchompa', '#2a2a30', 90, 65]])
  add(id, { name, stack: true, value: { grey: 500, red: 1200, black: 2500 }[id.split('_')[0]], icon: { kind: 'chin', color }, examine: 'It explodes on impact. Hits everything next to the target, too.',
    equip: { slot: 'weapon', att: 0, str: 0, def: 0, rng: 20 + (req - 45), rstr, speed: 4, req: { ranged: req }, ranged: { type: 'thrown', range: 7, aoe: true }, look: { kind: 'dart', color } } });

export function item(id) {
  const it = ITEMS[id];
  if (!it) throw new Error('Unknown item ' + id);
  return it;
}
export const isStack = (id) => !!ITEMS[id]?.stack;

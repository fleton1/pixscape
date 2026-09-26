// Item registry. `icon` drives the procedural icon painter; `look` drives how it appears when worn.

export const ITEMS = {};
const add = (id, o) => (ITEMS[id] = { id, value: 1, stack: false, examine: '', ...o });

export const SLOTS = ['head', 'cape', 'neck', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];

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
const TIER_DEF = { fullhelm: [4, 6, 9, 13, 19, 30, 34], platebody: [15, 21, 32, 46, 65, 82, 104], platelegs: [8, 11, 17, 24, 33, 51, 68], kiteshield: [6, 9, 13, 19, 27, 44, 50] };

// weapon kinds: speed, att/str multipliers, bars to smith, level offset for smithing
export const SMITHABLES = [
  { kind: 'scimitar', name: 'scimitar', bars: 2, off: 5, slot: 'weapon', speed: 4, a: 1, s: 1 },
  { kind: 'longsword', name: 'longsword', bars: 2, off: 6, slot: 'weapon', speed: 5, a: 1.15, s: 1.25 },
  { kind: 'battleaxe', name: 'battleaxe', bars: 3, off: 10, slot: 'weapon', speed: 6, a: 1.05, s: 1.6 },
  { kind: 'twohand', name: '2h sword', bars: 3, off: 14, slot: 'weapon', speed: 7, a: 1.3, s: 2, twoHanded: true },
  { kind: 'fullhelm', name: 'full helm', bars: 2, off: 7, slot: 'head' },
  { kind: 'platelegs', name: 'platelegs', bars: 3, off: 16, slot: 'legs' },
  { kind: 'kiteshield', name: 'kiteshield', bars: 3, off: 12, slot: 'shield' },
  { kind: 'platebody', name: 'platebody', bars: 5, off: 18, slot: 'body' },
  { kind: 'axe', name: 'axe', bars: 1, off: 1, slot: 'weapon', speed: 5, a: 0.6, s: 0.6, tool: 'axe' },
  { kind: 'pickaxe', name: 'pickaxe', bars: 2, off: 5, slot: 'weapon', speed: 5, a: 0.6, s: 0.55, tool: 'pick' },
];

for (const [m, M] of Object.entries(METALS)) {
  if (m !== 'dragon') add(m + '_bar', { name: M.name + ' bar', value: Math.round(8 * M.val), icon: { kind: 'bar', color: M.color }, examine: `It's a bar of ${m}.` });
  for (const s of SMITHABLES) {
    const id = `${m}_${s.kind}`;
    const o = { name: `${M.name} ${s.name}`, value: Math.round(s.bars * 20 * M.val), icon: { kind: s.kind, color: M.color }, smith: M.smith != null ? { lvl: Math.min(99, M.smith + s.off), bars: s.bars, bar: m + '_bar' } : null, metal: m, examine: `A ${m} ${s.name}.` };
    const eq = { slot: s.slot, att: 0, str: 0, def: 0, look: { kind: s.kind, color: M.color } };
    if (s.speed) {
      eq.att = Math.round(TIER_ATT[M.t] * s.a); eq.str = Math.round((TIER_ATT[M.t] - 1) * s.s); eq.speed = s.speed;
      eq.req = { attack: M.lvl }; if (s.twoHanded) eq.twoHanded = true;
    } else {
      eq.def = TIER_DEF[s.kind][M.t]; eq.req = { defence: M.lvl };
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
const logs = [['logs', 'Logs', '#8a5a2b', 1, 40], ['oak_logs', 'Oak logs', '#a0703a', 15, 60], ['willow_logs', 'Willow logs', '#7d6a3a', 30, 90], ['maple_logs', 'Maple logs', '#b0582a', 45, 135], ['yew_logs', 'Yew logs', '#6a3a1c', 60, 202.5], ['magic_logs', 'Magic logs', '#3a5aa0', 75, 303.8]];
export const FIREMAKING = {};
for (const [id, name, c, lvl, xp] of logs) {
  add(id, { name, value: Math.round(xp * 0.6), icon: { kind: 'log', color: c }, examine: 'Logs cut from a tree.' });
  FIREMAKING[id] = { lvl, xp };
}
ITEMS.magic_logs.value = 800; ITEMS.yew_logs.value = 250;
const ores = [['copper_ore', 'Copper ore', '#c8743a'], ['tin_ore', 'Tin ore', '#b8b3a8'], ['iron_ore', 'Iron ore', '#7a4a33'], ['coal', 'Coal', '#2a2826'], ['gold_ore', 'Gold ore', '#e8c13a'], ['mithril_ore', 'Mithril ore', '#4a5ea8'], ['adamantite_ore', 'Adamantite ore', '#4a8a52'], ['runite_ore', 'Runite ore', '#4ab7c8']];
ores.forEach(([id, name, c], i) => add(id, { name, value: [5, 5, 17, 45, 150, 162, 400, 3200][i], icon: { kind: 'ore', color: c }, examine: 'An ore.' }));
add('gold_bar', { name: 'Gold bar', value: 300, icon: { kind: 'bar', color: '#e8c13a' }, examine: "It's a bar of gold." });

export const SMELTING = [
  { bar: 'bronze_bar', lvl: 1, xp: 6.2, ores: { copper_ore: 1, tin_ore: 1 }, smithXp: 12.5 },
  { bar: 'iron_bar', lvl: 15, xp: 12.5, ores: { iron_ore: 1 }, fail: 0.5, smithXp: 25 },
  { bar: 'steel_bar', lvl: 30, xp: 17.5, ores: { iron_ore: 1, coal: 2 }, smithXp: 37.5 },
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
  ['trout', 'Trout', '#c09a70', 15, 70, 7, 49, 20],
  ['pike', 'Pike', '#8a9a6a', 20, 80, 8, 54, 25],
  ['salmon', 'Salmon', '#e0806a', 25, 90, 9, 58, 40],
  ['tuna', 'Tuna', '#7080a0', 30, 100, 10, 63, 60],
  ['lobster', 'Lobster', '#d04a2a', 40, 120, 12, 74, 150],
  ['swordfish', 'Swordfish', '#6a8ab0', 45, 140, 14, 86, 250],
  ['shark', 'Shark', '#7a8a96', 80, 210, 20, 99, 800],
];
for (const [id, name, c, lvl, xp, heal, stop, val] of fish) {
  add('raw_' + id, { name: 'Raw ' + name.toLowerCase(), value: val, icon: { kind: id === 'lobster' ? 'lobster' : id === 'shrimps' || id === 'anchovies' ? 'shrimp' : 'fish', color: c, raw: true }, examine: 'I should try cooking this.' });
  add(id, { name, value: Math.round(val * 1.3), icon: { kind: id === 'lobster' ? 'lobster' : id === 'shrimps' || id === 'anchovies' ? 'shrimp' : 'fish', color: c }, food: { heal }, examine: 'Some nicely cooked fish.' });
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
export const BONES = { bones: 4.5, big_bones: 15, babydragon_bones: 30, dragon_bones: 72, ashes: 0 };
add('bones', { name: 'Bones', value: 1, icon: { kind: 'bones' }, examine: 'Bones are for burying!' });
add('big_bones', { name: 'Big bones', value: 60, icon: { kind: 'bones', big: true }, examine: 'Ew, it has lumps of flesh on it.' });
add('babydragon_bones', { name: 'Babydragon bones', value: 400, icon: { kind: 'bones', color: '#e8e0b0' }, examine: 'Ew, it has lumps of flesh on it.' });
add('dragon_bones', { name: 'Dragon bones', value: 2000, icon: { kind: 'bones', big: true, color: '#d8d0a0' }, examine: 'These would feed a hungry dog for a week.' });
add('ashes', { name: 'Ashes', value: 1, icon: { kind: 'ashes' }, examine: 'A heap of ashes.' });

// ---------- tools & misc ----------
const misc = [
  ['tinderbox', 'Tinderbox', 'tinderbox', 1, 'Useful for lighting a fire.'],
  ['small_net', 'Small fishing net', 'net', 5, 'Useful for catching small fish.'],
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
const amuletNames = { gold: 'Gold amulet', sapphire: 'Amulet of focus', emerald: 'Amulet of defence', ruby: 'Amulet of strength', diamond: 'Amulet of power', dragonstone: 'Amulet of glory' };
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
wear('leather_body', 'Leather body', 'body', { def: 8 }, { kind: 'leatherbody', color: '#8a5a2b' }, { kind: 'shirt', color: '#8a5a2b' }, 30);
wear('leather_chaps', 'Leather chaps', 'legs', { def: 4 }, { kind: 'chaps', color: '#7a4a22' }, { kind: 'pants', color: '#7a4a22' }, 25);
wear('leather_gloves', 'Leather gloves', 'hands', { def: 1 }, { kind: 'gloves', color: '#7a4a22' }, { color: '#7a4a22' }, 10);
wear('leather_boots', 'Leather boots', 'feet', { def: 1 }, { kind: 'boots', color: '#6a3a1a' }, { color: '#5a3218' }, 10);
wear('coif', 'Coif', 'head', { def: 2 }, { kind: 'coif', color: '#8a5a2b' }, { kind: 'coif', color: '#8a5a2b' }, 20);
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
wear('ranger_boots', 'Ranger boots', 'feet', { att: 4, def: 5 }, { kind: 'boots', color: '#2a6a2a' }, { color: '#2a6a2a' }, 25000, { rare: true, examine: 'Legendary boots. Rarely seen.' });
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
quest('ships_charter', "Ship's chart", 'scroll', '#e0d0a0', 'A chart marking a route to Cinderhold.');

// ---------- skilling drops ----------
add('bird_nest', { name: "Bird's nest", value: 300, icon: { kind: 'nest' }, examine: 'It fell out of the tree.', rare: false });
add('giant_key', { name: 'Mossy key', value: 0, icon: { kind: 'key', color: '#5a8a3a' }, examine: 'A key covered in moss. It opens something big.' });

export function item(id) {
  const it = ITEMS[id];
  if (!it) throw new Error('Unknown item ' + id);
  return it;
}
export const isStack = (id) => !!ITEMS[id]?.stack;

export const SKILLS = ['attack', 'hitpoints', 'mining', 'strength', 'thieving', 'smithing', 'defence', 'crafting', 'fishing', 'ranged', 'fletching', 'cooking', 'prayer', 'firemaking', 'woodcutting', 'magic', 'runecraft'];
export const SKILL_NAMES = {
  attack: 'Attack', hitpoints: 'Hitpoints', mining: 'Mining', strength: 'Strength', thieving: 'Thieving', smithing: 'Smithing', defence: 'Defence',
  crafting: 'Crafting', fishing: 'Fishing', prayer: 'Prayer', firemaking: 'Firemaking', cooking: 'Cooking', woodcutting: 'Woodcutting', ranged: 'Ranged', fletching: 'Fletching', magic: 'Magic', runecraft: 'Runecraft',
};
export const SKILL_COLORS = {
  attack: '#9b2020', hitpoints: '#d83030', mining: '#5a5a5a', strength: '#1f8a3a', thieving: '#6a3a8a', smithing: '#6a6a6a', defence: '#4a6ab0',
  crafting: '#8a6a3a', fishing: '#4a8ac8', prayer: '#e8e8d0', firemaking: '#e0701a', cooking: '#7a2a8a', woodcutting: '#3a7a2a', ranged: '#5a8a2a', fletching: '#2a7a6a', magic: '#3a4ad8', runecraft: '#c8a040',
};

export const PRAYERS = [
  { id: 'thick_skin', name: 'Thick Skin', lvl: 1, drain: 1 / 12, def: 0.05, desc: '+5% Defence' },
  { id: 'burst_str', name: 'Burst of Strength', lvl: 4, drain: 1 / 12, str: 0.05, desc: '+5% Strength' },
  { id: 'clarity', name: 'Clarity of Thought', lvl: 7, drain: 1 / 12, att: 0.05, desc: '+5% Attack' },
  { id: 'sharp_eye', name: 'Sharp Eye', lvl: 8, drain: 1 / 12, rng: 0.05, desc: '+5% Ranged' },
  { id: 'mystic_will', name: 'Mystic Will', lvl: 9, drain: 1 / 12, mag: 0.05, desc: '+5% Magic' },
  { id: 'rock_skin', name: 'Rock Skin', lvl: 10, drain: 1 / 6, def: 0.1, desc: '+10% Defence' },
  { id: 'superhuman', name: 'Superhuman Strength', lvl: 13, drain: 1 / 6, str: 0.1, desc: '+10% Strength' },
  { id: 'reflexes', name: 'Improved Reflexes', lvl: 16, drain: 1 / 6, att: 0.1, desc: '+10% Attack' },
  { id: 'rapid_heal', name: 'Rapid Heal', lvl: 22, drain: 1 / 18, heal: true, desc: '2x Hitpoints regen' },
  { id: 'protect_item', name: 'Protect Item', lvl: 25, drain: 1 / 18, desc: 'Keep 1 extra item on death' },
  { id: 'hawk_eye', name: 'Hawk Eye', lvl: 26, drain: 1 / 6, rng: 0.1, desc: '+10% Ranged' },
  { id: 'mystic_lore', name: 'Mystic Lore', lvl: 27, drain: 1 / 6, mag: 0.1, desc: '+10% Magic' },
  { id: 'steel_skin', name: 'Steel Skin', lvl: 28, drain: 1 / 3, def: 0.15, desc: '+15% Defence' },
  { id: 'ultimate_str', name: 'Ultimate Strength', lvl: 31, drain: 1 / 3, str: 0.15, desc: '+15% Strength' },
  { id: 'incredible', name: 'Incredible Reflexes', lvl: 34, drain: 1 / 3, att: 0.15, desc: '+15% Attack' },
  { id: 'protect_magic', name: 'Protect from Magic', lvl: 37, drain: 1 / 3, protect: 'magic', desc: 'Blocks magic & breath attacks' },
  { id: 'protect_range', name: 'Protect from Missiles', lvl: 40, drain: 1 / 3, protect: 'range', desc: 'Blocks ranged & swarm attacks' },
  { id: 'protect_melee', name: 'Protect from Melee', lvl: 43, drain: 1 / 3, protect: 'melee', desc: 'Blocks melee attacks' },
  { id: 'eagle_eye', name: 'Eagle Eye', lvl: 44, drain: 1 / 3, rng: 0.15, desc: '+15% Ranged' },
  { id: 'mystic_might', name: 'Mystic Might', lvl: 45, drain: 1 / 3, mag: 0.15, desc: '+15% Magic' },
  { id: 'redemption', name: 'Redemption', lvl: 49, drain: 1 / 12, overhead: true, desc: 'Heals you when nearly dead' },
  { id: 'preserve', name: 'Preserve', lvl: 55, drain: 1 / 18, desc: 'Stat boosts last 50% longer' },
  { id: 'chivalry', name: 'Chivalry', lvl: 60, drain: 1 / 1.5, att: 0.15, str: 0.18, def: 0.2, desc: '+15% Att, +18% Str, +20% Def', quest: 'dragons_bane' },
];

export const SHOPS = {
  brindle_general: { name: 'Brindlewood General Store', general: true, items: [['knife', 5], ['pot', 5], ['jug', 5], ['bowl', 5], ['bucket', 5], ['tinderbox', 5], ['shears', 3], ['small_net', 5], ['hammer', 5], ['chisel', 3], ['spade', 3], ['bronze_axe', 5], ['bronze_pickaxe', 5], ['bread', 10], ['cake_tin', 3], ['candle', 10], ['fishing_bait', 500], ['wooden_shield', 3], ['leather_boots', 3], ['leather_gloves', 3], ['red_cape', 3], ['blue_cape', 3]] },
  magic: { name: "Elowen's Arcanum", items: [['air_rune', 2000], ['water_rune', 2000], ['earth_rune', 2000], ['fire_rune', 2000], ['mind_rune', 2000], ['body_rune', 1000], ['chaos_rune', 200], ['nature_rune', 100], ['law_rune', 100], ['cosmic_rune', 100], ['death_rune', 50], ['rune_essence', 0], ['staff', 5], ['staff_of_air', 2], ['staff_of_water', 2], ['staff_of_earth', 2], ['staff_of_fire', 2], ['battlestaff', 3], ['unpowered_orb', 5], ['wizard_hat', 5], ['wizard_robe', 5], ['air_talisman', 3], ['mind_talisman', 3], ['water_talisman', 3], ['earth_talisman', 3], ['fire_talisman', 3], ['body_talisman', 3], ['tiara_mould', 3]] },
  bowyer: { name: "Lenna's Bows", items: [['knife', 10], ['feather', 2000], ['arrow_shaft', 500], ['bow_string', 20], ['bronze_arrow', 1000], ['iron_arrow', 1000], ['steel_arrow', 300], ['shortbow', 5], ['longbow', 5], ['oak_shortbow', 4], ['oak_longbow', 4], ['willow_shortbow', 2], ['willow_longbow', 2], ['bronze_dart', 500], ['iron_dart', 300], ['coif', 5], ['leather_body', 5], ['leather_chaps', 5], ['leather_vambraces', 5]] },
  fletcher: { name: 'Highcrest Fletchers', items: [['knife', 5], ['feather', 1000], ['bow_string', 10], ['iron_arrow', 1000], ['steel_arrow', 500], ['mithril_arrow', 200], ['adamant_arrow', 50], ['maple_shortbow', 2], ['bronze_crossbow', 3], ['iron_crossbow', 3], ['steel_crossbow', 2], ['bronze_bolts', 500], ['iron_bolts', 300], ['steel_bolts', 200], ['steel_dart', 300], ['studded_body', 2], ['studded_chaps', 2]] },
  dwarf: { name: 'Deepdelve Supplies', items: [['bronze_pickaxe', 5], ['iron_pickaxe', 5], ['steel_pickaxe', 3], ['mithril_pickaxe', 2], ['adamant_pickaxe', 1], ['hammer', 5], ['candle', 20], ['lit_candle', 5], ['candle_lantern', 5], ['tinderbox', 5], ['coal', 0], ['silver_bar', 5], ['stew', 10], ['fishing_rod', 3], ['fishing_bait', 300]] },
  crafting: { name: "Mira's Crafting Supplies", items: [['needle', 10], ['thread', 500], ['chisel', 5], ['glassblowing_pipe', 5], ['ring_mould', 5], ['necklace_mould', 5], ['amulet_mould', 5], ['bracelet_mould', 5], ['holy_mould', 3], ['soft_clay', 20], ['pie_dish', 10], ['bowl', 10], ['pot', 10], ['molten_glass', 5], ['ball_of_wool', 20], ['leather', 10], ['wizard_hat', 2], ['wizard_robe', 2]] },
  smithy: { name: "Highcrest Smithy", items: [['hammer', 10], ['bronze_bar', 20], ['iron_bar', 20], ['steel_bar', 10], ['bronze_pickaxe', 5], ['iron_pickaxe', 5], ['steel_pickaxe', 3], ['mithril_pickaxe', 2], ['adamant_pickaxe', 1], ['rune_pickaxe', 1], ['iron_axe', 5], ['steel_axe', 3], ['mithril_axe', 2], ['adamant_axe', 1], ['rune_axe', 1], ['ring_mould', 5], ['amulet_mould', 5]] },
  swords: { name: "Varyn's Blades", items: [['bronze_scimitar', 5], ['iron_scimitar', 5], ['steel_scimitar', 4], ['mithril_scimitar', 3], ['adamant_scimitar', 2], ['rune_scimitar', 1], ['iron_longsword', 3], ['steel_longsword', 3], ['mithril_longsword', 2], ['steel_battleaxe', 2], ['mithril_twohand', 1]] },
  armour: { name: "Highcrest Armoury", items: [['bronze_fullhelm', 5], ['iron_fullhelm', 5], ['steel_fullhelm', 3], ['mithril_fullhelm', 2], ['adamant_fullhelm', 1], ['bronze_platebody', 3], ['iron_platebody', 3], ['steel_platebody', 2], ['mithril_platebody', 1], ['iron_platelegs', 3], ['steel_platelegs', 2], ['mithril_platelegs', 1], ['iron_kiteshield', 3], ['steel_kiteshield', 2], ['mithril_kiteshield', 1], ['leather_body', 5], ['leather_chaps', 5], ['coif', 5]] },
  fishing: { name: "Jory's Fishing Supplies", items: [['small_net', 10], ['big_net', 5], ['fishing_rod', 10], ['fly_rod', 10], ['lobster_pot', 10], ['harpoon', 10], ['fishing_bait', 1000], ['feather', 1000], ['raw_shrimps', 0], ['raw_trout', 0], ['raw_lobster', 0], ['raw_swordfish', 0]] },
  tavern: { name: 'The Salty Gull', items: [['bread', 20], ['stew', 10], ['cake', 5], ['cooked_meat', 10], ['cheese', 10], ['chocolate_bar', 10], ['jug_of_wine', 5]] },
  sandhaven: { name: "Zahir's Bazaar", general: true, items: [['bucket', 5], ['spade', 5], ['chisel', 5], ['ring_mould', 5], ['amulet_mould', 5], ['gold_bar', 5], ['uncut_sapphire', 3], ['uncut_emerald', 2], ['grapes', 30], ['soda_ash', 20], ['bucket_of_sand', 20], ['glassblowing_pipe', 3], ['spice', 0], ['attack_potion', 5], ['strength_potion', 5], ['defence_potion', 5], ['prayer_potion', 3], ['banana', 20]] },
  frost: { name: "Hermit's Hoard", items: [['stew', 10], ['candle', 10], ['candle_lantern', 3], ['fur', 0], ['coif', 3], ['leather_body', 3], ['rune_pickaxe', 1], ['super_attack', 3], ['super_strength', 3], ['super_defence', 3], ['prayer_potion', 5], ['shark', 10]] },
  elven: { name: 'Elven Trader', general: true, items: [['bronze_axe', 5], ['steel_axe', 5], ['mithril_axe', 3], ['adamant_axe', 2], ['rune_axe', 1], ['fly_rod', 5], ['feather', 500], ['redberries', 20], ['green_cape', 5], ['holy_symbol', 2], ['monk_robe', 2]] },
  palmera: { name: "Kalu's Island Goods", general: true, items: [['banana', 50], ['lobster_pot', 10], ['harpoon', 10], ['lobster', 10], ['swordfish', 5], ['yellow_cape', 3], ['orange_cape', 3]] },
};

export const TRAVEL = {
  selby: [['Elderglen', 'elderglen', 30], ['Palmera', 'palmera', 30]],
  elderglen: [['Port Selby', 'selby', 30], ['Palmera', 'palmera', 30]],
  palmera: [['Port Selby', 'selby', 30], ['Elderglen', 'elderglen', 30]],
};

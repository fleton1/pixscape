// Slayer: masters hand out tasks ("kill N of these"), which earn Slayer XP (the monster's hitpoints)
// and points to spend on rewards. Slayer monsters can only be hurt with enough Slayer.

// What each task name counts, and the Slayer level it needs.
export const CATEGORIES = {
  goblins: { name: 'Goblins', npcs: ['goblin', 'goblin_warrior', 'goblin_archer', 'cave_goblin', 'hobgoblin'] },
  rats: { name: 'Rats', npcs: ['rat', 'giant_rat'] },
  bats: { name: 'Bats', npcs: ['bat', 'giant_bat'] },
  spiders: { name: 'Spiders', npcs: ['spider', 'giant_spider', 'jungle_spider', 'ice_spider'] },
  skeletons: { name: 'Skeletons', npcs: ['skeleton', 'skeleton_warrior', 'skeleton_archer'] },
  zombies: { name: 'Zombies', npcs: ['zombie', 'ghoul'] },
  ghosts: { name: 'Ghosts', npcs: ['ghost', 'banshee', 'wraith'] },
  crabs: { name: 'Crabs', npcs: ['rock_crab', 'sand_crab'] },
  scorpions: { name: 'Scorpions', npcs: ['scorpion', 'king_scorpion'] },
  wolves: { name: 'Wolves', npcs: ['wolf', 'desert_wolf', 'ice_wolf'] },
  bandits: { name: 'Bandits', npcs: ['bandit', 'bandit_archer', 'bandit_leader', 'mugger'] },
  giants: { name: 'Giants', npcs: ['hill_giant', 'moss_giant', 'ice_giant', 'fire_giant'] },
  frogs: { name: 'Swamp creatures', npcs: ['giant_frog', 'swamp_leech'] },
  grave_crawlers: { name: 'Grave crawlers', npcs: ['grave_crawler'], slayer: 5 },
  stonegazes: { name: 'Stonegazes', npcs: ['stonegaze'], slayer: 25 },
  pyrefiends: { name: 'Pyrefiends', npcs: ['pyrefiend'], slayer: 30 },
  trolls: { name: 'Trolls', npcs: ['frost_troll', 'ogre'] },
  golems: { name: 'Golems', npcs: ['rock_golem_mob', 'obsidian_golem'] },
  dragons: { name: 'Dragons', npcs: ['baby_blue_dragon', 'baby_red_dragon', 'green_dragon', 'blue_dragon', 'red_dragon', 'black_dragon', 'frost_wyrm'] },
  bloodvelds: { name: 'Bloodvelds', npcs: ['bloodveld'], slayer: 50 },
  demons: { name: 'Demons', npcs: ['lesser_demon', 'greater_demon', 'black_demon'] },
  gargoyles: { name: 'Gargoyles', npcs: ['gargoyle'], slayer: 75 },
  nechryaels: { name: 'Nechryaels', npcs: ['nechryael'], slayer: 80 },
  voidstalkers: { name: 'Voidstalkers', npcs: ['voidstalker'], slayer: 85 },
  shadow_hounds: { name: 'Shadow hounds', npcs: ['shadow_hound'], slayer: 90 },
};

// Monsters that need a Slayer level before they can be damaged at all.
export const SLAYER_REQ = { grave_crawler: 5, stonegaze: 25, pyrefiend: 30, bloodveld: 50, gargoyle: 75, nechryael: 80, voidstalker: 85, shadow_hound: 90 };

// Masters: who they are, who they'll teach, and the tasks they give ([category, weight, min, max]).
export const MASTERS = {
  brannoc: {
    name: 'Brannoc', where: 'Brindlewood', minCombat: 3, points: 2,
    tasks: [['goblins', 8, 15, 30], ['rats', 6, 15, 30], ['bats', 6, 15, 25], ['spiders', 6, 15, 25], ['crabs', 6, 20, 40], ['skeletons', 5, 15, 25], ['zombies', 5, 15, 25], ['wolves', 4, 15, 25], ['frogs', 5, 15, 30], ['grave_crawlers', 6, 15, 30], ['scorpions', 4, 15, 25], ['bandits', 3, 10, 20]],
  },
  vessa: {
    name: 'Vessa', where: 'Highcrest', minCombat: 40, points: 6,
    tasks: [['giants', 8, 40, 80], ['ghosts', 6, 30, 60], ['skeletons', 5, 40, 70], ['stonegazes', 7, 40, 80], ['pyrefiends', 7, 40, 80], ['trolls', 6, 40, 70], ['golems', 5, 30, 60], ['dragons', 4, 20, 40], ['bloodvelds', 7, 40, 80], ['demons', 4, 20, 40], ['bandits', 3, 40, 60], ['wolves', 3, 40, 60]],
  },
  morvain: {
    name: 'Morvain', where: 'Frosthold', minCombat: 85, minSlayer: 50, points: 12,
    tasks: [['dragons', 8, 40, 80], ['demons', 8, 50, 100], ['gargoyles', 8, 60, 120], ['nechryaels', 8, 60, 120], ['voidstalkers', 7, 60, 120], ['shadow_hounds', 5, 40, 80], ['bloodvelds', 6, 80, 140], ['trolls', 5, 60, 120], ['golems', 4, 60, 100], ['giants', 4, 80, 140]],
  },
};

// Points shop.
export const SLAYER_REWARDS = [
  { id: 'skip', name: 'Cancel my current task', cost: 30 },
  { id: 'slayer_helmet', name: 'Slayer helmet', cost: 400, item: 'slayer_helmet' },
  { id: 'mirror_shield', name: 'Mirror shield', cost: 60, item: 'mirror_shield' },
  { id: 'rock_hammer', name: 'Rock hammer', cost: 20, item: 'rock_hammer' },
  { id: 'herb_pouch', name: 'Bag of herbs', cost: 50, bundle: [['grimy_rannet', 5], ['grimy_iris', 5], ['grimy_kwellwort', 3]] },
  { id: 'rune_pack', name: 'Pack of runes', cost: 60, bundle: [['death_rune', 100], ['chaos_rune', 200], ['blood_rune', 50]] },
];

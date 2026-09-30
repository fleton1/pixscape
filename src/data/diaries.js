// Achievement diaries: per region, four tiers of three tasks each. Each task is checked live against
// what the player has done (kill counts, laps, things made, fish caught, ore mined, places visited,
// quests and levels), so progress made before the diaries existed still counts.
const n = (o, k) => (o && o[k]) || 0;
const kill = (id, c = 1, name) => ({ text: `Kill ${c > 1 ? c + ' ' : ''}${name}`, check: (p) => n(p.stats.kills, id) >= c, need: [id, c] });
const lvl = (sk, l, name) => ({ text: `Reach level ${l} ${name}`, check: (p) => p.lvl(sk) >= l });
const quest = (id, name) => ({ text: `Complete ${name}`, check: (p) => p.stage(id) >= 100 });
const lap = (id, c, name) => ({ text: `Complete ${c} lap${c > 1 ? 's' : ''} of the ${name}`, check: (p) => n(p.stats.laps, id) >= c });
const made = (id, c, name) => ({ text: `Make ${c} ${name}`, check: (p) => n(p.stats.made, id) >= c });
const caught = (id, c, name) => ({ text: `Catch ${c} ${name}`, check: (p) => n(p.stats.caught, id) >= c });
const mined = (id, c, name) => ({ text: `Mine ${c} ${name}`, check: (p) => n(p.stats.mined, id) >= c });
const visit = (map, name) => ({ text: `Visit ${name}`, check: (p) => !!(p.flags.visited && p.flags.visited[map]) });
const area = (a) => ({ text: `Visit ${a}`, check: (p) => !!(p.flags.areas && p.flags.areas[a]) });

export const TIERS = ['easy', 'medium', 'hard', 'elite'];
export const TIER_LAMPS = { easy: 1, medium: 2, hard: 3, elite: 5 };

export const DIARIES = {
  aldermoor: {
    name: 'Aldermoor', reward: ['cape', 'Aldermoor cape', '#2a4ab0'],
    easy: [kill('goblin', 5, 'goblins'), made('bread', 1, 'bread'), visit('sewers', 'the Brindlewood Sewers')],
    medium: [quest('squires_oath', "The Squire's Oath"), lap('walls', 1, 'Highcrest Walls'), kill('hobgoblin', 10, 'hobgoblins')],
    hard: [kill('goblin_warlord', 5, 'the Goblin Warlord 5 times'), made('mithril_platebody', 1, 'a mithril platebody'), lvl('magic', 60, 'Magic')],
    elite: [quest('knights_oath', "The Knight's Oath"), made('rune_platebody', 1, 'a rune platebody'), lvl('slayer', 85, 'Slayer')],
  },
  coast: {
    name: 'The Coast', reward: ['feet', "Seafarer's boots", '#2a8a9a'],
    easy: [caught('raw_shrimps', 10, 'shrimps'), area('Palmera'), kill('rock_crab', 5, 'rock crabs')],
    medium: [lap('docks', 5, 'Port Selby Docks'), caught('raw_lobster', 10, 'lobsters'), quest('straight_true', 'Straight and True')],
    hard: [caught('raw_swordfish', 25, 'swordfish'), kill('emberwing', 1, 'Emberwing'), made('shark', 20, 'sharks')],
    elite: [caught('raw_anglerfish', 20, 'anglerfish'), kill('red_dragon', 10, 'red dragons'), lvl('fishing', 90, 'Fishing')],
  },
  desert: {
    name: 'The Sundral Desert', reward: ['neck', 'Sunstone amulet', '#e8a020'],
    easy: [kill('scorpion', 5, 'scorpions'), area('Sandhaven'), lvl('thieving', 20, 'Thieving')],
    medium: [quest('sands', 'Sands of the Scarab'), kill('desert_snake', 10, 'desert snakes'), kill('crocodile', 5, 'crocodiles')],
    hard: [quest('dust_echoes', 'Dust and Echoes'), kill('scarab_king', 5, 'the Scarab King 5 times'), lvl('thieving', 72, 'Thieving')],
    elite: [kill('scarab_king', 25, 'the Scarab King 25 times'), lvl('mining', 85, 'Mining'), lvl('herblore', 85, 'Herblore')],
  },
  elderglen: {
    name: 'Elderglen', reward: ['hands', 'Leafweave gloves', '#4aa06a'],
    easy: [area('Elderglen'), kill('moss_giant', 5, 'moss giants'), made('shortbow', 1, 'a shortbow')],
    medium: [quest('lost_grove', 'The Lost Grove'), quest('roots_hollowroot', 'Roots of Hollowroot'), kill('treant', 10, 'treants')],
    hard: [kill('blue_dragon', 20, 'blue dragons'), lap('canopy', 10, 'Elderglen Canopy'), lvl('fletching', 70, 'Fletching')],
    elite: [quest('sylvan_pact', 'The Sylvan Pact'), lvl('woodcutting', 90, 'Woodcutting'), made('heartwood_shortbow', 1, 'a heartwood shortbow')],
  },
  mortmire: {
    name: 'Mortmire', reward: ['ring', 'Mire ring', '#5a6a3a'],
    easy: [quest('witchs_brew', "A Witch's Brew"), kill('giant_frog', 10, 'giant frogs'), visit('crypt', 'the Mortmire Crypt')],
    medium: [made('antipoison', 5, 'antipoisons'), kill('ghoul', 10, 'ghouls'), kill('banshee', 10, 'banshees')],
    hard: [quest('drowned_abbey', 'The Drowned Abbey'), kill('drowned_abbot', 5, 'the Drowned Abbot 5 times'), lvl('prayer', 70, 'Prayer')],
    elite: [kill('drowned_abbot', 25, 'the Drowned Abbot 25 times'), lvl('herblore', 90, 'Herblore'), made('super_combat', 10, 'super combat potions')],
  },
  frostpeak: {
    name: 'Frostpeak', reward: ['head', 'Frostguard hood', '#a8d0e8'],
    easy: [visit('icecaves', 'the Frostpeak Ice Caves'), kill('ice_wolf', 5, 'ice wolves'), lvl('agility', 20, 'Agility')],
    medium: [kill('frost_troll', 10, 'frost trolls'), mined('mithril_ore', 20, 'mithril ore'), kill('ice_giant', 10, 'ice giants')],
    hard: [kill('hrimfang', 1, 'Hrimfang'), lap('ice', 1, 'Frostpeak Ice Run'), lvl('agility', 80, 'Agility')],
    elite: [kill('hrimfang', 25, 'Hrimfang 25 times'), lap('ice', 25, 'Frostpeak Ice Run'), mined('runite_ore', 20, 'runite ore')],
  },
  wilderness: {
    name: 'The Wilderness', reward: ['shield', 'Wildwalker ward', '#8a1a1a'],
    easy: [kill('dark_wizard', 10, 'dark wizards'), kill('cultist', 5, 'chaos cultists'), area('The Wilderness')],
    medium: [kill('green_dragon', 10, 'green dragons'), lap('wild', 5, 'Wilderness Course'), visit('bloodhollow', 'the Bloodhollow')],
    hard: [kill('bone_tyrant', 5, 'the Bone Tyrant 5 times'), kill('gargoyle', 20, 'gargoyles'), visit('rift', 'the Abyssal Rift')],
    elite: [kill('riftlord', 5, 'the Riftlord 5 times'), kill('voidstalker', 50, 'voidstalkers'), kill('shadow_hound', 20, 'shadow hounds')],
  },
};

// Reward item id for a region and tier, e.g. aldermoor_diary_2.
export const diaryItem = (region, tier) => `${region}_diary_${TIERS.indexOf(tier) + 1}`;

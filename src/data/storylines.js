// Quests written as data, run by game/questengine.js.
//   start:  who gives the quest, what they say, requirements, and items handed over at the start
//   steps:  in order. Each has a `hint` for the journal and one of:
//     { do: 'talk', npc, say }                 talk to someone
//     { do: 'bring', npc, items, say }         hand over items (they're taken)
//     { do: 'kill', npc, n }                   kill n of these (npc may be a list)
//     { do: 'drop', from, item }               kill `from` until it drops the quest item
//     { do: 'visit', map, area? }              go somewhere
//     { do: 'event', event, key, n }           do something: 'lap' (course id), 'runecraft' (rune id)
//   say:    lines as ['npc' | 'player', text]; the last step's lines play before the rewards.
export const STORYLINES = {
  // ------------------------------------------------------------------ the knights of Aldermoor
  squires_oath: {
    name: "The Squire's Oath", qp: 1, diff: 'Novice', chain: 'Knights of Aldermoor',
    start: { npc: 'sir_aldren', where: 'the barracks of Highcrest palace', say: [['npc', 'Looking to serve the crown? Every knight starts as a squire, and every squire starts by arming themselves.']] },
    steps: [
      { do: 'bring', npc: 'sir_aldren', items: { iron_chainbody: 1, iron_medhelm: 1 }, hint: 'Sir Aldren wants me to arm myself with an <b>iron chainbody</b> and an <b>iron med helm</b>. I can smith or buy them.', say: [['npc', 'Good, honest iron. It will turn a goblin blade.']] },
      { do: 'kill', npc: 'hobgoblin', n: 5, hint: 'Prove myself by slaying <b>5 hobgoblins</b> west of the Goblin Camp.' },
      { do: 'talk', npc: 'sir_aldren', hint: 'Report back to <b>Sir Aldren</b> in Highcrest.', say: [['player', 'The hobgoblins won\'t trouble anyone again.'], ['npc', 'Then kneel, squire. You have earned your oath.']] },
    ],
    rewards: { text: ['1 Quest Point', '2,500 Attack XP', '2,500 Defence XP', 'Steel kiteshield', '2,000 Coins'], xp: { attack: 2500, defence: 2500 }, items: [['steel_kiteshield', 1], ['coins', 2000]] },
  },
  knights_oath: {
    name: "The Knight's Oath", qp: 3, diff: 'Master', chain: 'Knights of Aldermoor',
    start: { npc: 'sir_aldren', where: 'Highcrest palace', reqs: { quests: ['squires_oath', 'dragons_bane'], skills: { prayer: 50, defence: 60 } }, say: [['npc', 'You slew Emberwing. There is one enemy left that the order has never beaten: the Bone Tyrant, in the ruins of the north.']] },
    steps: [
      { do: 'kill', npc: 'bone_tyrant', n: 1, hint: 'Defeat the <b>Bone Tyrant</b> in the Ruins of the Tyrant, deep in the <b>Wilderness</b>.' },
      { do: 'talk', npc: 'king', hint: 'Tell <b>King Aldric</b> in Highcrest that the Tyrant has fallen.', say: [['player', 'The Bone Tyrant is dust, your majesty.'], ['npc', 'Then rise, Knight of Aldermoor. The order\'s oldest prayer is yours.']] },
    ],
    rewards: { text: ['3 Quest Points', '20,000 Prayer XP', '20,000 Defence XP', 'Knight\'s cape', 'The Oathkeeper prayer (Prayer 70)'], xp: { prayer: 20000, defence: 20000 }, items: [['knight_cape', 1]] },
  },

  // ------------------------------------------------------------------ the desert
  dust_echoes: {
    name: 'Dust and Echoes', qp: 2, diff: 'Intermediate', chain: 'Secrets of the Sands',
    start: { npc: 'petra', where: 'her camp in Sandhaven', reqs: { quests: ['sands'], skills: { thieving: 30 } }, say: [['npc', 'The tomb had writing on every wall. Echoes of whoever built it. The mummies still guard the scroll that explains them.']] },
    steps: [
      { do: 'visit', map: 'tomb', hint: 'Return to the <b>Tomb of the Scarab</b>.' },
      { do: 'drop', from: 'mummy', item: 'ancient_scroll', hint: 'Defeat <b>mummies</b> in the tomb until one gives up the <b>ancient scroll</b>.' },
      { do: 'bring', npc: 'petra', items: { ancient_scroll: 1 }, hint: 'Bring the <b>ancient scroll</b> to Petra.', say: [['npc', 'It\'s a map! The builders came from the east, across the river. There\'s a whole kingdom we\'ve never seen.']] },
    ],
    rewards: { text: ['2 Quest Points', '8,000 Thieving XP', '8,000 Mining XP', 'Scarab charm'], xp: { thieving: 8000, mining: 8000 }, items: [['scarab_charm', 1]] },
  },

  // ------------------------------------------------------------------ the elves of Elderglen
  roots_hollowroot: {
    name: 'Roots of Hollowroot', qp: 2, diff: 'Intermediate', chain: 'The Sylvan Pact',
    start: { npc: 'sylwen', where: 'Elderglen', reqs: { quests: ['lost_grove'], skills: { woodcutting: 50 } }, say: [['npc', 'The grove sings again, but below us the Hollowroot is sick. The treants have turned on anything that walks there.']] },
    steps: [
      { do: 'visit', map: 'hollowroot', area: 'Heartwood Grove', hint: 'Find the <b>Heartwood Grove</b> in the <b>Hollowroot Caverns</b>.' },
      { do: 'kill', npc: 'treant', n: 6, hint: 'Calm the grove by felling <b>6 treants</b>.' },
      { do: 'bring', npc: 'sylwen', items: { mahogany_logs: 5 }, hint: 'Bring Sylwen <b>5 mahogany logs</b> to replant.', say: [['npc', 'Mahogany takes root anywhere. The Hollowroot will heal.']] },
    ],
    rewards: { text: ['2 Quest Points', '10,000 Woodcutting XP', 'Sylvan boots'], xp: { woodcutting: 10000 }, items: [['sylvan_boots', 1]] },
  },
  sylvan_pact: {
    name: 'The Sylvan Pact', qp: 3, diff: 'Master', chain: 'The Sylvan Pact',
    start: { npc: 'sylwen', where: 'Elderglen', reqs: { quests: ['roots_hollowroot'], skills: { ranged: 60, fletching: 55 } }, say: [['npc', 'The elves once made bows that never needed arrows. The last bowyer who knew how is gone, but I remember the recipe.']] },
    steps: [
      { do: 'bring', npc: 'sylwen', items: { yew_logs: 10, bow_string: 5 }, hint: 'Bring Sylwen <b>10 yew logs</b> and <b>5 bow strings</b>.', say: [['npc', 'Good wood. Now the hard part: a heartstring from a blue dragon.']] },
      { do: 'drop', from: 'blue_dragon', item: 'dragon_heartstring', hint: 'Slay <b>blue dragons</b> in the Hollowroot Caverns for a <b>dragon heartstring</b>.' },
      { do: 'bring', npc: 'sylwen', items: { dragon_heartstring: 1 }, hint: 'Bring the <b>dragon heartstring</b> to Sylwen.', say: [['npc', 'There. A Sylvan bow. Draw it, and the arrow grows from the string.']] },
    ],
    rewards: { text: ['3 Quest Points', '20,000 Ranged XP', '15,000 Fletching XP', 'Sylvan bow (never needs ammo)'], xp: { ranged: 20000, fletching: 15000 }, items: [['sylvan_bow', 1]] },
  },

  // ------------------------------------------------------------------ the witches of Mortmire
  witchs_brew: {
    name: "A Witch's Brew", qp: 1, diff: 'Novice', chain: 'The Mortmire Coven',
    start: { npc: 'witch', where: 'her hut in Mortmire', say: [['npc', 'Fetch for an old woman, and I\'ll teach you something worth knowing: how to turn weeds into medicine.']] },
    steps: [
      { do: 'bring', npc: 'witch', items: { eye_of_newt: 1, bog_fungus: 1 }, hint: 'Old Morwen wants an <b>eye of newt</b> (Wren\'s Apothecary sells them) and <b>bog fungus</b> from a rotting log in the swamp.', say: [['npc', 'Eye and fungus. Now watch: clean the herb, drop it in water, add the rest. That\'s Herblore.']] },
    ],
    rewards: { text: ['1 Quest Point', '1,500 Herblore XP', 'Pestle and mortar, 5 vials of water, herbs and eyes of newt'], xp: { herblore: 1500 }, items: [['pestle_and_mortar', 1], ['vial_of_water', 5], ['grimy_brightleaf', 3], ['eye_of_newt', 3]] },
  },
  drowned_abbey: {
    name: 'The Drowned Abbey', qp: 2, diff: 'Experienced', chain: 'The Mortmire Coven',
    start: { npc: 'witch', where: 'Mortmire', reqs: { quests: ['witchs_brew'], skills: { prayer: 40 } }, say: [['npc', 'The abbey under the manor still rings its bell at night. The abbot won\'t rest until someone takes it from him.']] },
    steps: [
      { do: 'visit', map: 'crypt', hint: 'Descend into the <b>Mortmire Crypt</b> beneath the manor.' },
      { do: 'drop', from: 'drowned_abbot', item: 'abbey_bell', hint: 'Defeat <b>the Drowned Abbot</b> and take his <b>bell</b>.' },
      { do: 'bring', npc: 'priest', items: { abbey_bell: 1 }, hint: 'Bring the <b>abbey bell</b> to Father Aldo in Brindlewood so it can be blessed.', say: [['npc', 'Let it ring in a house of light again. Take this in thanks: the abbey\'s own symbol, blessed anew.']] },
    ],
    rewards: { text: ['2 Quest Points', '15,000 Prayer XP', '5,000 Magic XP', 'Blessed symbol'], xp: { prayer: 15000, magic: 5000 }, items: [['blessed_symbol', 1]] },
  },

  // ------------------------------------------------------------------ the dwarves of Crestfall
  deep_trouble: {
    name: 'Deep Trouble', qp: 1, diff: 'Novice', chain: 'The Crestfall Dwarves',
    start: { npc: 'foreman_brunn', where: 'the Dwarven Hall in Crestfall Deeps', say: [['npc', 'Crawlers in my tunnels, and not enough iron to shore them up. You look like you can swing a pick and a sword.']] },
    steps: [
      { do: 'kill', npc: 'tunnel_crawler', n: 5, hint: 'Clear <b>5 tunnel crawlers</b> from Crestfall Deeps.' },
      { do: 'bring', npc: 'foreman_brunn', items: { iron_bar: 5 }, hint: 'Bring Foreman Brunn <b>5 iron bars</b>.', say: [['npc', 'That\'ll hold the roof up. Take this pick, it was my father\'s.']] },
    ],
    rewards: { text: ['1 Quest Point', '2,500 Mining XP', '2,500 Smithing XP', 'Mithril pickaxe'], xp: { mining: 2500, smithing: 2500 }, items: [['mithril_pickaxe', 1]] },
  },
  forge_deep: {
    name: 'Forge of the Deep', qp: 2, diff: 'Experienced', chain: 'The Crestfall Dwarves',
    start: { npc: 'foreman_brunn', where: 'Crestfall Deeps', reqs: { quests: ['deep_trouble'], skills: { smithing: 50, mining: 50 } }, say: [['npc', 'The old forge-hammer was lost in the Deep Seam when the golems woke. Without it, no dwarven helm has been made in a hundred years.']] },
    steps: [
      { do: 'visit', map: 'deeps', area: 'The Deep Seam', hint: 'Go down into <b>the Deep Seam</b>. It\'s pitch black: bring a light.' },
      { do: 'drop', from: 'rock_golem_mob', item: 'ancient_hammer', hint: 'One of the <b>rock golems</b> swallowed the <b>ancient forge-hammer</b>.' },
      { do: 'bring', npc: 'foreman_brunn', items: { ancient_hammer: 1, mithril_bar: 5 }, hint: 'Bring Brunn the <b>ancient hammer</b> and <b>5 mithril bars</b>.', say: [['npc', 'Listen to that ring! Here, the first dwarven helm in a century. Wear it well.']] },
    ],
    rewards: { text: ['2 Quest Points', '15,000 Smithing XP', 'Dwarven helm'], xp: { smithing: 15000 }, items: [['dwarven_helm', 1]] },
  },

  // ------------------------------------------------------------------ first steps in the newer skills
  straight_true: {
    name: 'Straight and True', qp: 1, diff: 'Novice', chain: 'First steps',
    start: { npc: 'elf_bowyer', where: 'Elderglen', give: [['knife', 1], ['logs', 2]], say: [['npc', 'Want to learn the bow? Then learn the arrow first. Here, a knife and some logs.']] },
    steps: [
      { do: 'bring', npc: 'elf_bowyer', items: { arrow_shaft: 15 }, hint: 'Use the knife on logs to cut <b>15 arrow shafts</b> for Lenna.', say: [['npc', 'Clean cuts. Feathers next: put a feather on each shaft for headless arrows.']] },
      { do: 'bring', npc: 'elf_bowyer', items: { headless_arrow: 15 }, hint: 'Make <b>15 headless arrows</b> (arrow shafts and feathers).', say: [['npc', 'Now go and shoot something. Goblins will do.']] },
      { do: 'kill', npc: 'goblin', n: 3, hint: 'Defeat <b>3 goblins</b>.' },
      { do: 'talk', npc: 'elf_bowyer', hint: 'Return to <b>Lenna</b> in Elderglen.', say: [['npc', 'Good. Keep the bow, and keep practising.']] },
    ],
    rewards: { text: ['1 Quest Point', '1,000 Fletching XP', '1,000 Ranged XP', 'Oak shortbow and 100 iron arrows'], xp: { fletching: 1000, ranged: 1000 }, items: [['oak_shortbow', 1], ['iron_arrow', 100]] },
  },
  essence_things: {
    name: 'The Essence of Things', qp: 1, diff: 'Novice', chain: 'First steps',
    start: { npc: 'archmage', where: 'Highcrest', give: [['air_talisman', 1]], say: [['npc', 'Runes are made, not found. Take this air talisman; it will lead you to its altar. Bring me proof you can bind the air.']] },
    steps: [
      { do: 'visit', map: 'essence', hint: 'Ask the <b>Archmage</b> to teleport me to the <b>rune essence mine</b>.' },
      { do: 'event', event: 'runecraft', key: 'air', n: 10, hint: 'Craft <b>10 air runes</b> at the air altar, south of Brindlewood.' },
      { do: 'talk', npc: 'archmage', hint: 'Return to <b>Archmage Elowen</b>.', say: [['npc', 'The air answers you. Here: a staff that never runs out of it.']] },
    ],
    rewards: { text: ['1 Quest Point', '1,000 Runecraft XP', '1,000 Magic XP', 'Staff of air and 100 mind runes'], xp: { runecraft: 1000, magic: 1000 }, items: [['staff_of_air', 1], ['mind_rune', 100]] },
  },
  leap_faith: {
    name: 'Leap of Faith', qp: 1, diff: 'Novice', chain: 'First steps',
    start: { npc: 'grace', where: 'Highcrest', say: [['npc', 'Most people walk around their problems. Agile people go over them. Try the yard south-west of Brindlewood.']] },
    steps: [
      { do: 'event', event: 'lap', key: 'yard', n: 1, hint: 'Complete a lap of the <b>Brindlewood Agility Yard</b>.' },
      { do: 'talk', npc: 'grace', hint: 'Tell <b>Grace</b> how it went.', say: [['npc', 'Not bad for a first try! Here are some marks to start you off.']] },
    ],
    rewards: { text: ['1 Quest Point', '1,500 Agility XP', '10 Marks of grace', '3 Energy potions'], xp: { agility: 1500 }, items: [['mark_of_grace', 10], ['energy_potion', 3]] },
  },
  slayers_start: {
    name: "A Slayer's Start", qp: 1, diff: 'Novice', chain: 'First steps',
    start: { npc: 'brannoc', where: 'Brindlewood', say: [['npc', 'A slayer hunts what others avoid. Start small: the sewers are crawling with rats.']] },
    steps: [
      { do: 'kill', npc: ['giant_rat', 'rat'], n: 10, hint: 'Kill <b>10 rats</b>; the <b>Brindlewood Sewers</b> are full of them.' },
      { do: 'talk', npc: 'brannoc', hint: 'Report to <b>Brannoc</b>.', say: [['npc', 'Good. Take this gem, and come back for a proper assignment.']] },
    ],
    rewards: { text: ['1 Quest Point', '1,500 Slayer XP', '20 Slayer points', 'Enchanted gem'], xp: { slayer: 1500 }, items: [['slayer_gem', 1]], points: 20 },
  },
};

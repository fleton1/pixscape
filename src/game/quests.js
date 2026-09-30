// Quests, NPC dialogue scripts, clue scrolls and quest-specific world hooks.
import { G, msg, sfx, after } from './state.js';
import { tannerTalk } from './crafting.js';
import { ITEMS, GRACEFUL } from '../data/items.js';
import { SKILL_NAMES } from '../data/skills.js';
import { randInt, pickWeighted, commas, cheb } from '../util.js';

// ================================================================== quest registry
export const QUESTS = {
  feast: {
    name: 'A Feast for the Duke', qp: 1, diff: 'Novice', start: 'Speak to Cook Barnaby in the kitchen of Brindlewood Castle.',
    journal(s, p) {
      if (s === 0) return ['I can start this quest by speaking to <b>Cook Barnaby</b> in the kitchen of <b>Brindlewood Castle</b>.'];
      if (s < 100) return ['The Cook needs ingredients for the Duke\'s birthday feast:', `${p.has('egg') ? '<s>' : ''}An <b>egg</b> - there's a chicken coop at Hilda's farm.${p.has('egg') ? '</s>' : ''}`, `${p.has('bucket_of_milk') ? '<s>' : ''}A <b>bucket of milk</b> - a dairy cow grazes at the farm.${p.has('bucket_of_milk') ? '</s>' : ''}`, `${p.has('pot_of_flour') ? '<s>' : ''}A <b>pot of flour</b> - the windmill west of the farm has a flour bin.${p.has('pot_of_flour') ? '</s>' : ''}`];
      return ['<s>I helped the Cook prepare the Duke\'s feast.</s>', '<b style="color:#ff0000">QUEST COMPLETE!</b>'];
    },
    rewards: ['1 Quest Point', '1,500 Cooking XP', '500 Coins', "Chef's hat"],
  },
  goblin_trouble: {
    name: 'Goblin Trouble', qp: 1, diff: 'Novice', start: "Speak to Farmer Hilda at her farm north-west of Brindlewood.",
    journal(s, p) {
      if (s === 0) return ['I can start this quest by speaking to <b>Farmer Hilda</b> at her farm north-west of <b>Brindlewood</b>.', 'I should be able to defeat a <b>level 42</b> goblin.'];
      if (s === 1) return ["Goblins raided Hilda's farm and their Warlord stole her late husband's <b>locket</b>.", 'The <b>Goblin Camp</b> lies west of <b>Highcrest</b>. I should defeat the <b>Goblin Warlord</b> and recover it.'];
      if (s === 2) return ['<s>I defeated the Goblin Warlord.</s>', 'I should return the locket to <b>Farmer Hilda</b>.'];
      return ['<s>I returned Hilda\'s locket.</s>', '<b style="color:#ff0000">QUEST COMPLETE!</b>'];
    },
    rewards: ['1 Quest Point', '2 Antique lamps (2,000 XP each)', 'Steel scimitar', '1,000 Coins'],
  },
  lost_grove: {
    name: 'The Lost Grove', qp: 1, diff: 'Intermediate', start: 'Speak to Sylwen in Elderglen, across the sea to the west.',
    journal(s, p) {
      if (s === 0) return ['I can start this quest by speaking to <b>Sylwen</b> in <b>Elderglen</b>. Sailors at <b>Port Selby</b> can take me there.'];
      if (s < 100) {
        const f = p.flags.petals || {};
        return ['Sylwen needs three <b>Moonpetals</b> to rekindle the Magic Grove.', `${f[1] ? '<s>' : ''}One grows in the <b>Magic Grove</b> itself, north-west of Elderglen.${f[1] ? '</s>' : ''}`, `${f[2] ? '<s>' : ''}One blooms high on the snowy slopes of <b>Frostpeak</b>.${f[2] ? '</s>' : ''}`, `${f[3] ? '<s>' : ''}One hides in the jungle of <b>Palmera Isle</b>.${f[3] ? '</s>' : ''}`];
      }
      return ['<s>I rekindled the Magic Grove.</s>', '<b style="color:#ff0000">QUEST COMPLETE!</b>'];
    },
    rewards: ['1 Quest Point', '6,000 Woodcutting XP', 'Ability to cut Magic trees', 'Elvenweave cape'],
  },
  sands: {
    name: 'Sands of the Scarab', qp: 2, diff: 'Experienced', start: 'Speak to Archaeologist Petra at her camp in Sandhaven.',
    journal(s, p) {
      if (s === 0) return ['I can start this quest by speaking to <b>Archaeologist Petra</b> in <b>Sandhaven</b>.', 'I will need <b>30 Mining</b> and should be able to defeat a <b>level 140</b> boss.'];
      if (s === 1) {
        const has = (i) => p.has(i) || p.has('scarab_tablet');
        return ['Petra believes the Great Pyramid can be opened with the <b>Scarab tablet</b>, broken into three pieces:', `${has('tablet_1') ? '<s>' : ''}The <b>sun</b> fragment, embedded in cracked sandstone near the pyramid.${has('tablet_1') ? '</s>' : ''}`, `${has('tablet_2') ? '<s>' : ''}The <b>eye</b> fragment, stolen by the <b>Bandit leader</b> east of town.${has('tablet_2') ? '</s>' : ''}`, `${has('tablet_3') ? '<s>' : ''}The <b>beetle</b> fragment, lost in an old manor in <b>Mortmire</b>.${has('tablet_3') ? '</s>' : ''}`, p.has('scarab_tablet') ? 'I have the complete tablet. I should <b>use it on the tomb door</b>.' : 'Once I have all three I can combine them.'];
      }
      if (s === 3) return ['<s>I opened the Tomb of the Scarab.</s>', 'I must defeat the <b>Scarab King</b> within and bring its <b>heart</b> to Petra.'];
      if (s === 4) return ['<s>I defeated the Scarab King.</s>', 'I should bring the <b>Heart of the Scarab</b> to Petra.'];
      return ['<s>I uncovered the secrets of the Great Pyramid.</s>', '<b style="color:#ff0000">QUEST COMPLETE!</b>'];
    },
    rewards: ['2 Quest Points', '3 Antique lamps (5,000 XP each)', '10,000 Coins', 'Access to the Tomb of the Scarab'],
  },
  dragons_bane: {
    name: "Dragon's Bane", qp: 3, diff: 'Master', start: 'Speak to King Aldric in the palace of Highcrest. Requires 3 Quest Points.',
    journal(s, p) {
      if (s === 0) return ['I can start this quest by speaking to <b>King Aldric</b> in <b>Highcrest</b>.', 'I need at least <b>3 Quest Points</b>, and I should be able to defeat a <b>level 190</b> dragon.'];
      if (s < 4) {
        const shield = p.hasAnywhere('anti_dragon_shield');
        return ['The great dragon <b>Emberwing</b> has awoken on <b>Cinderhold</b> and threatens the realm.', `${shield ? '<s>' : ''}The King suggested <b>Duke Alric</b> in Brindlewood can provide an <b>anti-dragon shield</b>.${shield ? '</s>' : ''}`, s >= 3 ? '<s>Captain Rook has agreed to sail me to Cinderhold.</s>' : s === 2 ? 'Captain Rook in <b>Port Selby</b> will sail me there if I bring <b>10 oak logs</b> and <b>5 steel bars</b> for repairs.' : 'I need to find a ship brave enough to sail to Cinderhold. Perhaps someone in <b>Port Selby</b>?', s >= 3 ? 'I should slay <b>Emberwing</b> and bring its <b>head</b> to the King.' : ''];
      }
      if (s === 4) return ['<s>I slew Emberwing!</s>', 'I should bring its head to <b>King Aldric</b>.'];
      return ['<s>I slew the dragon Emberwing and saved Aldermoor.</s>', '<b style="color:#ff0000">QUEST COMPLETE!</b>'];
    },
    rewards: ['3 Quest Points', '12,000 Strength XP', '12,000 Defence XP', 'Ability to wear rune platebodies', 'Chivalry prayer unlocked'],
  },
};

function complete(id, cb) {
  const p = G.player;
  p.setStage(id, 100);
  p.questPoints += QUESTS[id].qp;
  cb && cb();
  sfx('quest');
  G.ui.questComplete(id);
  msg(`Congratulations! Quest complete: ${QUESTS[id].name}`, '#ef1020');
}

// ================================================================== dialogue scripts
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const DIALOGUE = {
  tanner: (d) => tannerTalk(d),
  async grace(d) {
    const p = G.player;
    await d.npc('Marks of grace turn up for those who run the courses well. Bring them to me and I\'ll make you something light to wear.');
    for (;;) {
      const ids = Object.keys(GRACEFUL);
      const c = await d.options([...ids.map((id) => `${ITEMS[id].name} (${GRACEFUL[id]} marks)`), 'Maybe later.']);
      if (c >= ids.length) return;
      const id = ids[c], cost = GRACEFUL[id];
      if (!p.has('mark_of_grace', cost)) { await d.npc(`You'll need ${cost} marks for that. You have ${p.count('mark_of_grace')}.`); continue; }
      if (!p.canAdd(id)) { await d.npc('Your pack is full.'); return; }
      p.remove('mark_of_grace', cost); p.add(id);
      await d.npc('There you go. Light as a feather.');
    }
  },
  async archmage(d, n) {
    await d.npc('Welcome to the Arcanum of Highcrest. Runes, staves, robes - and knowledge, if you have the patience for it.');
    for (;;) {
      const c = await d.options(['How do I make runes?', 'Take me to the essence mine.', 'How does magic work?', 'Goodbye.']);
      if (c === 0) {
        await d.npc('Rune essence is mined in a pocket of the world I can open for you. Carry it to one of the twelve altars hidden in ruins across the land.');
        await d.npc('The ruins will only let you in if you carry that altar\'s talisman, or wear a tiara bound to it. Air, mind, water, earth, fire and body talismans I sell. The rest... monsters have a way of collecting them.');
        await d.npc('The better you get, the more runes each essence gives you. And bind a talisman into a silver tiara and you\'ll never need the talisman again.');
      } else if (c === 1) {
        d.end();
        n.say('Senventior disthine molenko!');
        G.effects.push({ kind: 'sparkle', follow: G.player, t: performance.now() }); sfx('teleport');
        after(2, () => G.game.teleport(...G.worlds.get('essence').points.arrive, 'You are teleported to the rune essence mine.', true, 'essence'));
        return;
      } else if (c === 2) {
        await d.npc('Open your spellbook. Combat spells need a target: choose the spell, then the monster. Wield a staff and you can set a spell to cast every time you attack.');
        await d.npc('Elemental staves give you endless runes of their element. Teleports take you to the great towns. Alchemy turns junk into gold, and enchanted jewellery... well, try it and see.');
      } else return;
    }
  },
  async townsfolk(d) {
    await d.npc(pick([
      'Hello there! Lovely day for it, isn\'t it?',
      'Have you heard? Goblins have been raiding Hilda\'s farm again.',
      'They say a dragon sleeps on an island of fire to the south-west. Brrr.',
      'Stay out of the Wilderness if you value your belongings, friend.',
      'I once saw a man cut down a magic tree. Or maybe I dreamt it.',
      'If you\'re new around here, the Guide by the fountain can help.',
      'My cousin swears there\'s treasure buried all over Aldermoor. Mad, he is.',
      'The desert folk in Sandhaven trade in gems. Pricey, mind.',
    ]));
  },
  async farmer(d) { await d.npc(pick(['Keep your hands off my crops!', 'Good harvest this year. If the goblins don\'t steal it.', 'Hilda runs the farm to the north-west. Tough as old boots, that one.'])); },
  async guard(d) { await d.npc(pick(['Move along, citizen.', 'North of the city lies the Wilderness. Monsters there will attack on sight, and death means losing your belongings.', 'I used to be an adventurer like you...', 'Keep your hands off the market stalls. I\'m watching.'])); },
  async knight(d) { await d.npc(pick(['For the King and for Aldermoor!', 'The King seeks a hero brave enough to face the dragon.', 'Train hard, adventurer. The realm needs strong arms.'])); },
  async elf(d) { await d.npc(pick(['The trees sing to those who listen.', 'Magic trees grow in the grove to the north-west. They are sacred to us.', 'Welcome to Elderglen, traveller.', 'Our sailors can take you back east whenever you wish.'])); },
  async monk(d) {
    await d.npc('Greetings, traveller. Would you like me to heal your wounds?');
    const c = await d.options(['Yes please.', 'No thanks.']);
    if (c === 0) {
      const p = G.player;
      p.hp = Math.max(p.hp, p.maxHp);
      G.ui.dirty('orbs');
      await d.msg('The monk places a hand on your shoulder. You feel much better.');
    }
  },
  async banker(d) {
    await d.npc('Good day. How may I help you?');
    const c = await d.options(['I\'d like to access my bank account, please.', 'What is this place?']);
    if (c === 0) { d.end(); G.ui.openBank(); }
    else await d.npc('This is a branch of the Bank of Aldermoor. We have branches in many towns, and your items are available at all of them.');
  },
  async shop(d, n) {
    await d.npc('Can I help you at all?');
    const c = await d.options(['Yes please. What are you selling?', 'No thanks.']);
    if (c === 0) { d.end(); G.ui.openShop(n.spawn.shop); }
  },
  async hermit(d, n) {
    await d.npc('Brrr! Not many folk come up this way. The runite rocks to the north are guarded by giants, and the wolves are hungry.');
    const c = await d.options(['What do you have for trade?', 'Why do you live up here?']);
    if (c === 0) { d.end(); G.ui.openShop('frost'); }
    else await d.npc('Peace and quiet. And the odd yeti. Just kidding. Mostly.');
  },
  async sailor(d, n) {
    const here = n.spawn.name === 'Elven sailor' ? 'elderglen' : n.spawn.name === 'Island sailor' ? 'palmera' : 'selby';
    await d.npc('Ahoy! Fancy a trip across the water? It\'ll cost you 30 coins.');
    await G.game.travelMenu(d, here);
  },
  async guide(d) {
    const p = G.player;
    await d.npc(`Welcome to Brindlewood, ${p.name}! I'm the town guide. What would you like to know?`);
    for (;;) {
      const c = await d.options(['How do I get started?', 'Where should I go?', 'Tell me about quests.', 'How do the controls work?', 'Goodbye.']);
      if (c === 0) {
        await d.npc('Train your skills! Chop trees with an axe, catch shrimp with a net, mine ore with a pickaxe. Light fires with a tinderbox and cook your catch on them.');
        await d.npc('Fight monsters to train Attack, Strength and Defence. Chickens and cows east and north of here are good for beginners. Bury their bones to train Prayer.');
        await d.npc('If you get hungry for adventure, the Duke\'s cook and Farmer Hilda both need help.');
      } else if (c === 1) {
        await d.npc('North is the great city of Highcrest - smiths, shops and a proper bank. Beyond it lies the Wilderness. Only the brave go there.');
        await d.npc('West is Port Selby, where ships sail to Elderglen and Palmera. South is Mortmire swamp - spooky. East across the river is Crestfall Mine and then the Sundral Desert.');
        await d.npc(G.touch ? 'Tap the MAP button by your minimap to open your world map!' : 'Press M to open your world map!');
      } else if (c === 2) {
        await d.npc('Quests are stories where you help folk out, and they come with rewards. Check your quest list - the blue icon in your side panel. Red means not started, yellow in progress, green complete.');
      } else if (c === 3) {
        if (G.touch) {
          await d.npc('Tap to walk or do the first option. Press and hold anything for more options. Use your inventory items by tapping them, or pick "Use" to use them on something.');
          await d.npc('Pinch to zoom, twist to rotate the view... just kidding, we don\'t rotate here. Tap the chat bar to talk, MAP for the map, and use the side tabs for everything else. Tap the open tab again to tuck the panel away.');
        } else {
          await d.npc('Left-click to walk or do the first option. Right-click anything for more options. Use your inventory items by clicking them, or pick "Use" to use them on something.');
          await d.npc('Scroll to zoom, hold the middle mouse button or arrow keys to rotate the view... just kidding, we don\'t rotate here. Press Enter to chat, M for the map, and use the side tabs for everything else.');
        }
      } else break;
    }
  },
  async priest(d) {
    const p = G.player;
    if (await clueTalk(d, 'priest')) return;
    await d.npc('Blessings upon you, child. Pray at the altar to restore your prayer points. Burying bones pleases the gods - offering them on the altar pleases them even more.');
    if (p.stage('dragons_bane') >= 100) await d.npc('I hear you slew the dragon! The gods have granted you knowledge of the Chivalry prayer.');
  },
  async witch(d) {
    const p = G.player;
    if (await clueTalk(d, 'witch')) return;
    await d.npc('Heh heh heh. What brings a young thing like you to my swamp?');
    if (p.stage('sands') === 1 && !p.has('tablet_3') && !p.has('scarab_tablet')) {
      await d.player('I\'m looking for a stone fragment with a beetle carved on it.');
      await d.npc('The old manor, dearie. Its master collected all sorts of trinkets. Search his mouldy books... if the ghosts let you.');
    } else await d.npc(pick(['Bog water and newt eyes. Best stew in the realm.', 'The dead don\'t rest easy in Mortmire. Mind yourself.', 'I\'ve seen things in my cauldron... dragons of fire, kings of bone...']));
  },

  // ---------------------------------------------------------- A Feast for the Duke
  async cook(d) {
    const p = G.player;
    if (await clueTalk(d, 'cook')) return;
    const s = p.stage('feast');
    if (s === 0) {
      await d.npc('Oh dear, oh dear, oh dear! What am I to do?');
      const c = await d.options(['What\'s wrong?', 'You don\'t look very happy.', 'Nice hat!']);
      if (c === 2) await d.npc('Thanks! Now if only it could cook the feast by itself...');
      await d.npc('It\'s the Duke\'s birthday feast tonight and I\'ve run out of ingredients! I need an egg, a bucket of milk and a pot of flour for his cake.');
      const c2 = await d.options(['I\'ll get them for you!', 'Sounds like a you problem.']);
      if (c2 === 1) { await d.npc('Hmph! Fine, the Duke will just have to go hungry.'); return; }
      p.setStage('feast', 1);
      await d.npc('Oh thank you! There\'s a chicken coop and a dairy cow on Hilda\'s farm to the north-west. The windmill beside it has a flour bin - you\'ll need an empty pot. There might be one on my shelf.');
      await d.npc('And you\'ll need a bucket for the milk. Hilda always has one lying around.');
      sfx('quest');
      return;
    }
    if (s < 100) {
      const need = ['egg', 'bucket_of_milk', 'pot_of_flour'];
      const have = need.filter((i) => p.has(i));
      if (have.length === 3) {
        await d.player('I have everything you need!');
        for (const i of need) p.remove(i, 1);
        await d.item('pot_of_flour', 'You give the Cook an egg, a bucket of milk and a pot of flour.');
        await d.npc('You\'ve saved the feast! The Duke will be delighted. Here, take this for your trouble - and my spare hat.');
        complete('feast', () => { p.addXp('cooking', 1500, true); p.give('coins', 500); p.give('chef_hat'); });
        return;
      }
      await d.npc(`How are you getting on? I still need ${need.filter((i) => !p.has(i)).map((i) => ITEMS[i].name.toLowerCase()).join(', ')}.`);
      return;
    }
    await d.npc('Thanks again for saving the feast! You can use my range whenever you like - it burns less food than an open fire.');
  },

  // ---------------------------------------------------------- Goblin Trouble
  async hilda(d) {
    const p = G.player;
    if (await clueTalk(d, 'hilda')) return;
    const s = p.stage('goblin_trouble');
    if (s === 0) {
      await d.npc('Oh, hello dear. Sorry, I\'m not much company today.');
      const c = await d.options(['What\'s the matter?', 'Never mind.']);
      if (c === 1) return;
      await d.npc('Goblins raided the farm last night. They took grain, eggs... but worst of all they took my Harold\'s locket. It\'s all I had left of him.');
      await d.npc('Their Warlord leads them from a camp west of Highcrest. A great brute of a thing. He\'ll have it, I\'m sure.');
      const c2 = await d.options(['I\'ll get your locket back.', 'Sorry, I can\'t help.']);
      if (c2 === 1) return;
      p.setStage('goblin_trouble', 1); sfx('quest');
      await d.npc('Bless you! Do be careful - that Warlord hits hard. Bring food, and some armour if you have it.');
      return;
    }
    if (s < 100) {
      if (p.has('hildas_locket')) {
        await d.player('I found your locket!');
        p.remove('hildas_locket');
        await d.item('hildas_locket', 'You hand Hilda the golden locket.');
        await d.npc('Oh! Oh, Harold... thank you, thank you. Here, I want you to have these. My Harold would have wanted them to go to someone brave.');
        complete('goblin_trouble', () => { p.give('lamp', 2); p.give('steel_scimitar'); p.give('coins', 1000); });
        return;
      }
      await d.npc('Any luck with the locket? The Warlord\'s camp is west of Highcrest.');
      if (s === 2) await d.npc('You say you defeated him but lost the locket? Perhaps he\'ll have it again if you fight him once more.');
      return;
    }
    await d.npc('Thank you again, dear. Help yourself to eggs and milk whenever you like.');
  },

  // ---------------------------------------------------------- The Lost Grove
  async sylwen(d) {
    const p = G.player;
    const s = p.stage('lost_grove');
    if (s === 0) {
      await d.npc('Greetings, human. You have come far. The trees whispered of your arrival.');
      await d.npc('Our sacred Magic Grove is dying. Its heart-flower withered, and the magic trees grow dim. To rekindle it I need three Moonpetals.');
      const c = await d.options(['I will find them for you.', 'Sounds dangerous.']);
      if (c === 1) { await d.npc('All worthwhile things are.'); return; }
      p.setStage('lost_grove', 1); sfx('quest');
      await d.npc('One blooms in the grove itself, north-west of here. Another on the frozen slopes of Frostpeak, far to the north-east. The last... somewhere in the jungles of Palmera Isle.');
      return;
    }
    if (s < 100) {
      const n = p.count('moonpetal_flower');
      if (n >= 3) {
        p.remove('moonpetal_flower', 3);
        await d.item('moonpetal_flower', 'You give Sylwen three glowing Moonpetals.');
        await d.npc('You found them all! Listen... the grove is singing again. You have the gratitude of Elderglen. You may now harvest the magic trees - take only what you need.');
        complete('lost_grove', () => { p.addXp('woodcutting', 6000, true); p.give('elven_bow_cape'); });
        return;
      }
      await d.npc(`You have ${n} of the three Moonpetals. The grove, Frostpeak, and Palmera Isle.`);
      return;
    }
    await d.npc('The magic trees thrive again, thanks to you.');
  },

  // ---------------------------------------------------------- Sands of the Scarab
  async petra(d) {
    const p = G.player;
    if (await clueTalk(d, 'petra')) return;
    const s = p.stage('sands');
    if (s === 0) {
      await d.npc('Oh! A visitor! Are you here about the pyramid? Everyone\'s here about the pyramid. Well, no one is, but they should be!');
      await d.npc('The Great Pyramid to the south-east has been sealed for a thousand years. I believe it\'s the tomb of the Scarab King himself! The door is sealed by a tablet that was broken into three pieces.');
      const c = await d.options(['I\'ll find the pieces!', 'Tombs are creepy. No thanks.']);
      if (c === 1) return;
      if (p.lvl('mining') < 30) { await d.npc('Hmm. You\'ll need to be a decent miner to dig out the first fragment - come back with at least 30 Mining.'); return; }
      p.setStage('sands', 1); sfx('quest');
      await d.npc('Marvellous! The sun fragment is embedded in cracked sandstone near the pyramid - you\'ll need a pickaxe. The eye fragment was stolen by the bandit leader east of town. And the beetle fragment... records say a collector took it to his manor in Mortmire swamp.');
      return;
    }
    if (s === 1) {
      if (p.has('scarab_tablet')) { await d.npc('You\'ve restored the tablet! Now use it on the pyramid door - quickly!'); return; }
      await d.npc('Any luck? Remember: cracked sandstone by the pyramid, the bandit leader east of town, and the manor in Mortmire. Combine the pieces once you have all three.');
      return;
    }
    if (s === 3) { await d.npc('You opened the tomb?! Be careful in there. If the Scarab King truly lives... bring me proof. Its heart!'); return; }
    if (s === 4 || p.has('heart_of_scarab')) {
      p.remove('heart_of_scarab');
      await d.item('heart_of_scarab', 'You hand Petra the pulsing Heart of the Scarab.');
      await d.npc('Incredible! This will make me famous! Well, us. Mostly me. Here - you\'ve earned all of this and more.');
      complete('sands', () => { p.give('lamp', 3); p.give('coins', 10000); });
      return;
    }
    await d.npc('Thanks to you, the history books will never be the same!');
  },

  // ---------------------------------------------------------- Dragon's Bane
  async king(d) {
    const p = G.player;
    const s = p.stage('dragons_bane');
    if (s === 0) {
      await d.npc('Welcome to my court, adventurer. These are dark days. The great dragon Emberwing has awoken on the isle of Cinderhold. Ships burn. Villages tremble.');
      if (p.questPoints < 3) { await d.npc('I need a hero of proven worth. Return when you have helped more of my people - at least 3 Quest Points.'); return; }
      const c = await d.options(['I will slay the dragon!', 'That sounds terrifying.']);
      if (c === 1) { await d.npc('It is. Return if you find your courage.'); return; }
      p.setStage('dragons_bane', 1); sfx('quest');
      await d.npc('Then you will need two things. First, protection from dragonfire - my cousin, Duke Alric of Brindlewood, keeps anti-dragon shields in his armoury.');
      await d.npc('Second, a ship. No sailor will dare go near Cinderhold... but try the docks at Port Selby. Go, with my blessing.');
      return;
    }
    if (s < 4) { await d.npc('Have you slain the beast? Remember - a shield from my cousin the Duke, and a ship from Port Selby.'); return; }
    if (s === 4 || p.has('emberwing_head')) {
      p.remove('emberwing_head');
      await d.item('emberwing_head', 'You present the head of Emberwing to the King.');
      await d.npc('By the gods... you did it! Aldermoor is saved! From this day on you shall be known as Dragonslayer. The Royal Armoury is yours - you may now wear rune platebodies.');
      complete('dragons_bane', () => { p.addXp('strength', 12000, true); p.addXp('defence', 12000, true); p.flags.dragonslayer = true; });
      return;
    }
    await d.npc('Hail, Dragonslayer! The realm owes you everything.');
  },
  async duke(d) {
    const p = G.player;
    const s = p.stage('dragons_bane');
    if (s >= 1 && s < 100 && !p.hasAnywhere('anti_dragon_shield')) {
      await d.player('The King sent me. I need an anti-dragon shield to fight Emberwing.');
      await d.npc('Then my cousin has finally found his hero! Here - this shield will protect you from most of the dragon\'s breath. Come back if you lose it.');
      p.give('anti_dragon_shield');
      await d.item('anti_dragon_shield', 'The Duke hands you an anti-dragon shield.');
      return;
    }
    if (s === 100 && !p.hasAnywhere('anti_dragon_shield')) {
      await d.npc('Lost your shield, Dragonslayer? Take another.');
      p.give('anti_dragon_shield');
      return;
    }
    await d.npc(pick(['Welcome to Brindlewood Castle! Feel free to use the bank in the hall.', 'My cook has been in a frightful state about the feast lately.', 'My cousin the King rules from Highcrest, to the north.']));
  },
  async captain(d, n) {
    const p = G.player;
    const s = p.stage('dragons_bane');
    if (n.spawn.cinder) {
      await d.npc('Had enough of the heat? I can take you back to Port Selby.');
      const c = await d.options(['Yes, take me back.', 'Not yet.']);
      if (c === 0) { d.end(); G.game.sail('selby'); }
      return;
    }
    if (s === 0) { await d.npc('Ahoy. Captain Rook, at your service. I don\'t sail for just anyone - and certainly not near that cursed fire isle.'); return; }
    if (s === 1) {
      await d.player('I need to get to Cinderhold. The King has asked me to slay Emberwing.');
      await d.npc('Cinderhold? Ha! My ship would burn before we got close... unless I reinforced her. Bring me 10 oak logs and 5 steel bars and I\'ll make her fireproof. Well, fire-resistant.');
      p.setStage('dragons_bane', 2);
      return;
    }
    if (s === 2) {
      if (p.count('oak_logs') >= 10 && p.count('steel_bar') >= 5) {
        p.remove('oak_logs', 10); p.remove('steel_bar', 5);
        await d.msg('You hand over 10 oak logs and 5 steel bars.');
        await d.npc('Aye, she\'ll hold. When you\'re ready, just say the word and we sail for Cinderhold.');
        p.setStage('dragons_bane', 3);
      } else { await d.npc(`I still need ${Math.max(0, 10 - p.count('oak_logs'))} oak logs and ${Math.max(0, 5 - p.count('steel_bar'))} steel bars.`); return; }
    }
    if (p.stage('dragons_bane') >= 3) {
      await d.npc('Ready to sail to Cinderhold? Make sure you bring your anti-dragon shield and plenty of food.');
      const c = await d.options(['Set sail!', 'Not yet.']);
      if (c === 0) { d.end(); G.game.sail('cinderhold'); }
    }
  },
};

// ================================================================== quest world hooks
export function questDrops(n, drop) {
  const p = G.player;
  if (n.defId === 'goblin_warlord' && p.stage('goblin_trouble') >= 1 && p.stage('goblin_trouble') < 100 && !p.hasAnywhere('hildas_locket')) { drop('hildas_locket'); p.setStage('goblin_trouble', 2); }
  if (n.defId === 'bandit_leader' && p.stage('sands') === 1 && !p.hasAnywhere('tablet_2') && !p.hasAnywhere('scarab_tablet')) drop('tablet_2');
  if (n.defId === 'scarab_king' && p.stage('sands') === 3 && !p.hasAnywhere('heart_of_scarab')) { drop('heart_of_scarab'); p.setStage('sands', 4); }
  if (n.defId === 'emberwing' && p.stage('dragons_bane') === 3 && !p.hasAnywhere('emberwing_head')) { drop('emberwing_head'); p.setStage('dragons_bane', 4); }
}

export function questMine(o) {
  const p = G.player;
  if (p.stage('sands') !== 1) { msg('The sandstone is too tough to crack. Something glints inside.'); return; }
  if (p.hasAnywhere('tablet_1') || p.hasAnywhere('scarab_tablet')) { msg('You\'ve already found what was hidden here.'); return; }
  if (p.lvl('mining') < 30) { msg('You need a Mining level of 30 to crack this sandstone.'); return; }
  if (![...p.inv, p.equip.weapon].some((s) => s && ITEMS[s.id].tool?.type === 'pick')) { msg('You need a pickaxe.'); return; }
  p.playAnim('attack', 3);
  msg('You chip carefully at the sandstone...');
  after(3, () => { p.give('tablet_1'); msg('You find a sandstone fragment carved with a sun!', '#ef1020'); sfx('rare'); });
}

export function searchObject(o) {
  const p = G.player;
  if (o.type === 'mortmire_bookcase') {
    if (p.stage('sands') === 1 && !p.hasAnywhere('tablet_3') && !p.hasAnywhere('scarab_tablet')) {
      p.give('tablet_3'); msg('Behind the rotting books you find a sandstone fragment carved with a beetle!', '#ef1020'); sfx('rare');
    } else msg('The books are too damp and mouldy to read.');
    return;
  }
  if (o.type === 'hay') { if (Math.random() < 0.05) { msg('Ouch! You find a needle. You throw it away.'); } else msg('You search the haystack... nothing but hay.'); return; }
  if (o.type === 'crate') { msg('You search the crate... it\'s empty.'); return; }
  if (o.type === 'bookshelf') { msg(pick(['You find a book called "Dragons and How to Avoid Them". It\'s blank after page one.', 'A dusty tome on goblin anatomy. Gross.', 'You find a book about the lost kings of the desert.', 'There\'s nothing interesting here.'])); return; }
  msg('You find nothing of interest.');
}

export function pickObject(o) {
  const p = G.player;
  if (o.type === 'moonpetal') {
    if (p.stage('lost_grove') < 1 || p.stage('lost_grove') >= 100) { msg('The flower glows softly. It feels wrong to pick it without reason.'); return; }
    p.flags.petals = p.flags.petals || {};
    if (p.flags.petals[o.petal]) { msg('You have already picked a Moonpetal here.'); return; }
    if (!p.canAdd('moonpetal_flower')) { msg('Your inventory is full.'); return; }
    p.flags.petals[o.petal] = true;
    p.give('moonpetal_flower');
    msg('You carefully pick a glowing Moonpetal.', '#ef1020');
    sfx('rare'); G.ui.dirty('quests');
    return;
  }
  if (o.type === 'wheat') {
    if (o.depleted > G.tick) return;
    if (!p.canAdd('grain')) { msg('Your inventory is full.'); return; }
    p.add('grain'); msg('You pick some grain.'); o.depleted = G.tick + 30; sfx('pickup'); return;
  }
  if (o.type === 'berry_bush') {
    if (o.depleted > G.tick) { msg('There are no berries left on this bush.'); return; }
    if (!p.canAdd('redberries')) { msg('Your inventory is full.'); return; }
    p.add('redberries'); msg('You pick some redberries.'); if (Math.random() < 0.34) o.depleted = G.tick + 40; sfx('pickup'); return;
  }
}

export function combineTablets() {
  const p = G.player;
  if (p.has('tablet_1') && p.has('tablet_2') && p.has('tablet_3')) {
    p.remove('tablet_1'); p.remove('tablet_2'); p.remove('tablet_3');
    p.add('scarab_tablet');
    msg('The three fragments click together into a complete Scarab tablet!', '#ef1020');
    sfx('rare');
    return true;
  }
  msg('You need all three fragments to complete the tablet.');
  return false;
}

export function tombDoor(o, usingTablet) {
  const p = G.player;
  const s = p.stage('sands');
  if (s >= 3) { G.game.teleport(...G.worlds.get('tomb').points.arrive, 'You descend into the darkness of the tomb...', true, 'tomb'); return; }
  if (usingTablet && p.has('scarab_tablet') && s === 1) {
    p.remove('scarab_tablet');
    p.setStage('sands', 3);
    msg('You press the tablet into the door. The ground rumbles... the tomb is open!', '#ef1020');
    sfx('rumble');
    G.effects.push({ kind: 'shake', t: performance.now() });
    after(3, () => G.game.teleport(...G.worlds.get('tomb').points.arrive, 'You descend into the darkness of the tomb...', true, 'tomb'));
    return;
  }
  msg('The stone door is sealed. There is a tablet-shaped hollow in its centre.');
}

export function openChest(o) {
  const p = G.player;
  if (o.mossy) {
    if (!p.has('giant_key')) { msg('The chest is locked. The keyhole is covered in moss.'); return; }
    p.remove('giant_key');
    msg('You unlock the chest with the mossy key...', '#ef1020');
    const loot = pickWeighted([{ w: 30, i: ['coins', 2000, 8000] }, { w: 15, i: ['rune_bar', 2, 4] }, { w: 15, i: ['uncut_diamond', 1, 3] }, { w: 10, i: ['rune_longsword', 1, 1] }, { w: 10, i: ['adamant_platebody', 1, 1] }, { w: 8, i: ['super_strength', 2, 4] }, { w: 5, i: ['uncut_dragonstone', 1, 1] }, { w: 2, i: ['dragon_fullhelm', 1, 1] }]);
    const [id, a, b] = loot.i;
    p.give(id, randInt(a, b));
    msg(`You find ${ITEMS[id].name}!`, '#ef1020'); sfx('rare');
    if (Math.random() < 0.5) p.give('coins', randInt(500, 2000));
    return;
  }
  if (o.boss === 'scarab') { msg('The chest is empty. The Scarab King keeps his treasures close.'); return; }
  msg('The chest is empty.');
}

// ================================================================== clue scrolls
export const CLUE_STEPS = [
  { type: 'dig', x: 206, y: 170, text: 'Where the Duke\'s fountain splashes, take three steps south and dig.' },
  { type: 'dig', x: 177, y: 138, text: 'Where cows graze and chickens peck, dig just below the old trough.' },
  { type: 'dig', x: 159, y: 140, text: 'Dig in the shadow of the windmill, on its western side.' },
  { type: 'dig', x: 197, y: 102, text: 'Beneath the yews west of Highcrest\'s walls, treasure waits.' },
  { type: 'dig', x: 165, y: 121, text: 'Where goblins warm their greasy hands, dig beside their fire.' },
  { type: 'dig', x: 'selby', text: 'At the very end of Port Selby\'s longest pier, dig. Mind the fish.' },
  { type: 'dig', x: 371, y: 289, text: 'Before the sealed gates of the Great Pyramid, dig.' },
  { type: 'dig', x: 188, y: 235, text: 'Among the graves of Mortmire, where no one rests easy.' },
  { type: 'dig', x: 338, y: 110, text: 'Warm your hands by the Frosthold campfire, then dig just south.' },
  { type: 'dig', x: 62, y: 157, text: 'In Elderglen, dig beside the singing fountain.' },
  { type: 'dig', x: 28, y: 113, text: 'The Magic Grove\'s heart hides more than flowers. Dig just south of it.' },
  { type: 'dig', x: 263, y: 139, text: 'In the heart of Crestfall Mine, dig where the ore runs deep.' },
  { type: 'talk', npc: 'cook', text: 'Talk to the man who feeds the Duke.' },
  { type: 'talk', npc: 'priest', text: 'The one who tends Brindlewood\'s altar holds your next clue.' },
  { type: 'talk', npc: 'hilda', text: 'Find the lady who keeps the farm.' },
  { type: 'talk', npc: 'petra', text: 'Seek the scholar of the sands.' },
  { type: 'talk', npc: 'witch', text: 'The old woman of the swamp has something for you.' },
];

export function newClue() {
  const n = randInt(2, 4);
  const steps = [];
  const pool = [...CLUE_STEPS.keys()];
  for (let i = 0; i < n; i++) steps.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return { steps, idx: 0 };
}
export function clueStep() {
  const p = G.player;
  if (!p.clue) p.clue = newClue();
  return CLUE_STEPS[p.clue.steps[p.clue.idx]];
}
function stepTile(st) {
  if (st.x === 'selby') return G.world.docks.selby;
  return [st.x, st.y];
}
function advanceClue() {
  const p = G.player;
  p.clue.idx++;
  if (p.clue.idx >= p.clue.steps.length) {
    p.remove('clue_scroll');
    p.clue = null;
    p.give('reward_casket');
    msg('Well done, you\'ve completed the Treasure Trail!', '#ef1020');
    p.stats.clues = (p.stats.clues || 0) + 1;
    sfx('quest');
    return true;
  }
  msg('You find another clue!', '#ef1020');
  sfx('rare');
  return false;
}
async function clueTalk(d, npcId) {
  const p = G.player;
  if (!p.has('clue_scroll')) return false;
  const st = clueStep();
  if (st.type !== 'talk' || st.npc !== npcId) return false;
  await d.npc('Ah, a treasure hunter! I was told to expect you. Here...');
  const done = advanceClue();
  await d.msg(done ? 'You receive a reward casket!' : 'The clue scroll changes in your hands.');
  return true;
}
export function dig() {
  const p = G.player;
  p.playAnim('attack', 2);
  sfx('bury');
  after(1, () => {
    if (p.has('clue_scroll')) {
      const st = clueStep();
      if (st.type === 'dig') {
        const [x, y] = stepTile(st);
        if (G.world === G.overworld && cheb(p.x, p.y, x, y) <= 1) { advanceClue(); return; }
      }
    }
    msg('Nothing interesting happens.');
  });
}
export function readClue() {
  const st = clueStep();
  G.ui.showClue(st.text);
}

export function openCasket(slot, reward) {
  const p = G.player;
  p.removeSlot(slot, 1);
  const got = [];
  const give = (id, q = 1) => { p.give(id, q); got.push([id, q]); };
  if (!reward) {
    give('coins', randInt(50, 600));
    if (Math.random() < 0.5) give(pickWeighted([{ w: 5, id: 'uncut_sapphire' }, { w: 3, id: 'uncut_emerald' }, { w: 2, id: 'uncut_ruby' }, { w: 1, id: 'uncut_diamond' }]).id);
    msg('You open the casket.');
  } else {
    give('coins', randInt(1000, 6000));
    const rolls = randInt(3, 5);
    for (let i = 0; i < rolls; i++) {
      if (Math.random() < 0.13) {
        const r = pickWeighted([
          { w: 1, id: 'blue_partyhat' }, { w: 1, id: 'red_partyhat' }, { w: 12, id: 'ranger_boots' }, { w: 12, id: 'holy_sandals' },
          { w: 14, id: 'gilded_scimitar' }, { w: 10, id: 'gilded_platebody' }, { w: 12, id: 'gilded_fullhelm' },
          { w: 25, id: 'red_beret' }, { w: 25, id: 'blue_beret' }, { w: 25, id: 'black_beret' }, { w: 25, id: 'white_beret' }, { w: 15, id: 'crown' },
        ]);
        give(r.id);
      } else {
        const e = pickWeighted([
          { w: 10, i: ['lamp', 1, 1] }, { w: 10, i: ['rune_fullhelm', 1, 1] }, { w: 8, i: ['rune_platelegs', 1, 1] }, { w: 10, i: ['adamant_scimitar', 1, 1] },
          { w: 10, i: ['super_strength', 2, 4] }, { w: 10, i: ['prayer_potion', 2, 4] }, { w: 10, i: ['shark', 5, 12] }, { w: 8, i: ['uncut_diamond', 1, 3] },
          { w: 10, i: ['purple_cape', 1, 1] }, { w: 10, i: ['black_cape', 1, 1] }, { w: 8, i: ['dragonstone_amulet', 1, 1] }, { w: 6, i: ['rune_bar', 2, 4] },
        ]);
        give(e.i[0], randInt(e.i[1], e.i[2]));
      }
    }
    msg('You open the reward casket!', '#ef1020');
  }
  sfx('rare');
  G.ui.showLoot(reward ? 'Treasure Trail Reward' : 'Casket', got);
}

export function rubLamp(slot) {
  const p = G.player;
  G.ui.chooseSkill('Choose the skill you wish to receive 2,000 XP in:', (skill) => {
    if (!p.inv[slot] || p.inv[slot].id !== 'lamp') return;
    p.removeSlot(slot, 1);
    const amt = Math.max(2000, p.lvl(skill) * 100);
    p.addXp(skill, amt, true);
    msg(`The lamp grants you ${commas(amt)} ${SKILL_NAMES[skill]} XP.`, '#ef1020');
  });
}

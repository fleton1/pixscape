# PixScape roadmap

The goal: an OSRS-style game in feel and pacing (1x XP on the real 99 curve, long-term goals, every
skill feeding the others) with PixScape's own world and lore. Everything stays procedural (sprites,
music, world) and everything ships on web and Android.

Decisions (2026-09-30):
- **XP pacing: 1x is the default.** The OSRS curve is kept exactly (99 = 13,034,431 XP). Content is
  tuned for 1x; the Settings XP-rate option stays for players who want it faster.
- **Skills:** build out the existing 13 first, then add Ranged, Fletching, Magic, Runecraft,
  Herblore, Agility, Slayer, later Farming and Hunter. No Construction.
- **World:** both — dungeons and instanced areas become separate maps, and the overworld grows.
- **Lore:** PixScape's own names, places and stories; OSRS is the reference for feel, not content.

Status legend: **[done]**, **[now]** (this release), **[next]**, **[later]**.

---

## Phase 0 — Foundations

| | Item |
|---|---|
| [now] | **Separate maps.** Each dungeon is its own map (own size, lighting, music, spawns). Ladders and trapdoors carry `to: [x, y, map]`. The world map always shows the overworld. |
| [now] | **Versioned saves with migrations.** v1 saves in the old underground strip move into the new dungeon maps. |
| [now] | **Content validator** (`node tools/validate.mjs`): every referenced item/npc/object exists, every item has a source and a use, every dungeon's entrances, exits and spawns are connected. Runs without a browser. |
| [now] | **Use-item recipe system** shared by Cooking prep, Crafting, and later Fletching and Herblore. |
| [now] | **Skill guides:** tap a skill to see every unlock by level, generated from the game data so it can't go stale. |
| [next] | Sprite gallery dev page (every generated sprite on one page, for reviewing new art). |
| [next] | Save export/import (backup the WebView save to a file). |

## Phase 1 — Build out the existing 13 skills [now]

Every skill gets something new every 5–10 levels up to 99, and a reason to visit several regions.

- **Woodcutting:** tree 1, oak 15, willow 30, teak 35, maple 45, mahogany 50, yew 60, magic 75
  (quest), heartwood 90. Bird nests can be searched (gems, rings, coins).
- **Firemaking:** all new logs; add logs to an existing fire for a small bonus.
- **Mining:** clay 1, copper/tin 1, iron 15, silver 20, coal 30, sandstone 35, gold 40, gem rocks 40,
  granite 45, mithril 55, adamantite 70, runite 85.
- **Smithing:** silver smelting; new pieces for every metal — dagger, mace, sword, warhammer, med
  helm, chainbody, square shield, plateskirt.
- **Fishing:** shrimps 1, sardine 5, herring 10, anchovies 15, mackerel 16 (big net), trout 20, cod 23,
  pike 25, salmon 30, tuna 35, cave eel 38 (dungeons), lobster 40, bass 46, swordfish 50,
  monkfish 62, shark 76, anglerfish 82, dark crab 85 (deep Wilderness).
- **Cooking:** a real kitchen chain — water from wells and fountains, dough, bread, pies (redberry,
  meat, fish), stew, pizzas, cakes, cheese from the churn, wine. Farm fields at Hilda's give potatoes,
  onions, cabbages and tomatoes.
- **Crafting:** tanning at the tanner; leather armour 1–18, hard leather 28, studded 41–44, green /
  blue / red / black dragonhide 57–79. Spinning wheel (wool, flax → bow string). Pottery (pots, pie
  dishes, bowls). Glass (molten glass → beer glass, lantern, vial, orb). Silver (holy symbol).
  Necklaces and bracelets for every gem.
- **Thieving:** more pickpockets (warrior, rogue, hero, elf), fur / silver / spice stalls, trapped
  chests at 13, 43 and 72.
- **Prayer:** new bones and demon ashes; Protect Item, Retribution, Redemption, Preserve.
- **Combat skills:** filled level bands (see Phase 3) so 1x training has somewhere to go at every level.

## Phase 2 — New skills [next → later]

In dependency order, one release each:

1. **Ranged + Fletching** — bows, arrows, darts, crossbows; brings in the combat triangle (monsters get
   separate defence against melee, ranged and magic). Dragonhide becomes ranged armour.
2. **Magic + Runecraft** — elemental strike/bolt/blast/wave, a teleport to every town, high alchemy,
   superheat, jewellery enchanting (teleport necklaces, recoil ring), battlestaves from orbs.
3. **Herblore** — herbs from monster drops, vials from glassblowing; shop potions become craftable,
   plus antifire and antipoison (poison added to combat).
4. **Agility** — a course per town, shortcuts around the map, marks of grace → graceful outfit.
5. **Slayer** — three slayer masters, tasks, slayer-only monsters with unique drops.
6. **Farming + Hunter** — patches that grow in real time (works while the game is closed); traps and
   creatures.

## Phase 3 — Monsters and dungeons

Target about 10 monsters per level band (1–20, 20–40, 40–60, 60–80, 80+), each dropping something a
skill uses (hides, bones, ores, gems, seeds, later herbs and runes). No monster drops nothing.

Dungeons (separate maps):

| Status | Dungeon | Entrance | Levels | Highlights |
|---|---|---|---|---|
| [now] | Brindlewood Sewers | manhole, Brindlewood | 1–25 | rats, bats, slimes; the Rat King mini-boss |
| [now] | Highcrest Catacombs | crypt, Highcrest | 20–40 | skeletons, hill giants, spiders; mossy-key chest |
| [now] | Crestfall Deeps | mine shaft, Crestfall | 15–60 | dwarven mining town: silver, gold, gems, mithril; dark lower level needs a light; cave eels |
| [now] | Mortmire Crypt | under the manor | 30–60 | ghouls, wraiths, banshees; the Drowned Abbot |
| [now] | Hollowroot Caverns | Elderglen | 40–100 | moss giants, treants, baby blue and blue dragons |
| [now] | Frostpeak Ice Caves | Frosthold | 50–110 | frost trolls, ice spiders, frost wyrms; Hrimfang boss |
| [now] | Tomb of the Scarab | the Great Pyramid | 45–140 | (existing) mummies, scarabs, the Scarab King |
| [now] | Cinderhold Depths | the volcano | 70–150 | fire giants, cinderhounds, obsidian golems, black dragons |
| [later] | Wilderness dungeons | deep Wilderness | 50–200 | multi-combat, best rewards, highest risk |

New creature sprites: bats, slimes, crabs, snakes, treants, trolls, golems, wyrms; variants of ghosts,
skeletons, giants and dragons. Rock and sand crabs on beaches give low-effort 1x combat training.

## Phase 4 — Overworld growth [later]

The overworld grows east and south (existing coordinates stay valid, so saves keep working):
- **Eastern kingdom** past the desert river: a trade city, a barbarian stronghold, a coast.
- **Southern reaches** below Mortmire: jungle, ruins, a second volcanic chain.
- The old underground strip in the north-west becomes ocean and islands.
- Travel network: spells, jewellery teleports, agility shortcuts, standing-stone rings.

## Phase 5 — Quests and diaries [later]

- From 5 quests to about 20, in story chains: the royal knights of Aldermoor, the desert, the
  elves of Elderglen, the witches of Mortmire, and the dwarves of Crestfall.
- A short novice quest introducing every new skill.
- Quests gate progression with skill and quest requirements; rewards are unlocks (areas, spells,
  prayers, gear) plus XP lamps.
- **Achievement diaries** per region (easy / medium / hard / elite) with region reward items.

## Phase 6 — Systems and quality of life [later]

Bank tabs and placeholders, collection log growth, a skill-milestone log, run-energy tuning,
world events, a Wintertodt-style group activity (Frostpeak braziers), and a single-player trader
economy.

## Release plan

| Version | Contents |
|---|---|
| 1.0 [done] | Android app, touch controls, portrait + landscape |
| 1.1 [now] | Separate maps, 8 dungeons, the 13-skill buildout, skill guides, 1x default, validator |
| 1.2 | Ranged + Fletching, combat triangle |
| 1.3 | Magic + Runecraft |
| 1.4 | Herblore + Agility |
| 1.5 | Slayer, more monsters, Wilderness dungeons |
| 1.6 | Quest wave + achievement diaries |
| 1.7 | Overworld growth, Farming + Hunter |

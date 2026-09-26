# PixScape

A chill, old-school pixel MMO-style adventure in the browser, inspired by Old School RuneScape.
No build step and no dependencies. Every sprite, tile, icon and music track is generated in code.

## Run it

```sh
npm start            # or: python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static file server works. Browsers block ES modules
opened via `file://`, so a server is needed.

## Controls

| Input | Action |
| --- | --- |
| Left-click | Walk / do the default action |
| Right-click | Context menu with all options |
| Scroll wheel | Zoom |
| Enter | Chat (messages appear above your head) |
| M | World map |
| Space / 1-5 | Continue dialogue / pick an option |
| F1-F8 | Side panel tabs |
| R | Toggle run |
| Shift+click item | Drop it |
| Esc | Close windows |

## What's in it

- **Big world.** 420×320 tiles:
  - The kingdom of Aldermoor: Brindlewood, Highcrest, Port Selby, Hilda's farm and the goblin camp.
  - The Wilderness (aggressive monsters, level counter, lose-items-on-death), Frostpeak, and the Sundral Desert with Sandhaven and the Great Pyramid.
  - Mortmire Swamp, the elven continent of Elderglen, Palmera Isle and the volcanic Cinderhold.
  - Two dungeons: the Highcrest Catacombs and the Tomb of the Scarab, with dynamic lighting.
- **13 skills** on the OSRS XP curve (levels 1-99): Attack, Strength, Defence, Hitpoints, Prayer, Woodcutting, Firemaking, Fishing, Cooking, Mining, Smithing, Crafting and Thieving.
- **Combat.** OSRS-style accuracy and max-hit formulas, combat styles, 14 prayers, potions, food, and a 0.6s game tick.
- **Bosses** with mechanics:
  - Goblin Warlord: summons adds.
  - Scarab King: swarm attacks and summons.
  - Emberwing: dragonfire, plus fire rain you have to dodge.
  - Bone Tyrant: telegraphed slams.
- **Loot.** Drop tables, a rare drop table, boss uniques, loot beams, boss pets and skilling pets, and a collection log.
- **5 quests:** A Feast for the Duke, Goblin Trouble, The Lost Grove, Sands of the Scarab and Dragon's Bane.
- **Treasure trails.** Clue scrolls drop from monsters. Dig or talk your way to reward caskets (partyhats exist...).
- **Towns and travel.** Banks, shops, furnaces and anvils, ships between islands, and a home teleport.
- **Procedural soundtrack.** A different theme per region, plus synthesized sound effects.
- **Autosave** to `localStorage`.

Deaths outside the Wilderness only send you home. In the Wilderness you keep your 3 most valuable
items and the rest stay where you fell. The XP rate defaults to 4x ("chill") and can be changed in Settings.

## Code layout

```
src/
  main.js            boot, title screen, input, main loop
  audio.js           procedural music + sfx (WebAudio)
  util.js painter.js RNG/noise/colour helpers, pixel painter
  data/              items, npcs + drop tables, objects, skills/prayers/shops
  world/             map + collision, deterministic world generator, A* pathfinding
  game/              state, player, npcs, combat, skilling, actions, quests, game loop
  sprites/           procedural terrain, characters/monsters, objects, item & UI icons
  render/            world renderer, minimap + world map
  ui/                DOM interface (sidebar tabs, chat, dialogue, bank, shops...)
```

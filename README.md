# PixScape

A chill, old-school pixel MMO-style adventure in the browser, inspired by Old School RuneScape.
No build step and no dependencies. Every sprite, tile, icon and music track is generated in code.
It also ships as an **Android app** that plays in portrait and landscape (see [Android](#android)).

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

On a phone or tablet:

| Touch | Action |
| --- | --- |
| Tap | Walk / do the default action |
| Press and hold | Options menu (same as right-click), with a short buzz |
| Pinch | Zoom (world view and world map) |
| Drag | Pan the world map |
| Tap the chat bar | Type a chat message |
| Tap the open side tab | Hide the side panel to see more of the world |
| Tap the dialogue box | Continue |
| Back button | Close the top-most menu, window, map or panel |

## Checking content

`node tools/validate.mjs` builds every map and checks that every referenced item, NPC and object
exists, every item can be obtained somewhere, every monster drops something, and every ladder,
entrance and spawn in every dungeon can be reached on foot. Run it after changing data or maps.

## Layouts

`main.js` picks one of three layouts from the window size and sets `<html data-layout>`:

- **desk**: the classic client (floating chatbox and side panel).
- **land** (phone landscape, or any window under 900×600): the side panel runs the full height of the
  right edge and the minimap sits beside it.
- **port** (portrait under 820px wide): the tabs are one row along the bottom, with the panel above them
  (inventory is 7×4 here) and the chat above that. Windows such as the bank sit above the dock.

Rotating the device switches layouts live, without reloading.

## Android

`android/` is a small Kotlin app: a full-screen WebView around the game. At build time Gradle copies
`index.html`, `style.css`, `src/` and `fonts/` into the APK's `assets/game/`, so the game at the repo
root is the only copy. Assets are served from `https://appassets.androidplatform.net/` (via
`WebViewAssetLoader`) so ES modules work and the save in `localStorage` stays with one origin.

The app runs immersive (system bars hidden, swipe to reveal), keeps the screen on, stays clear of
camera cutouts and the keyboard, rotates freely, saves and pauses audio when it goes to the background,
and maps the back button to the game (`window.pixBack`). Nothing is recreated on rotation.

```sh
cd android
./gradlew assembleRelease   # app/build/outputs/apk/release/app-release.apk (~300 KB)
adb install -r app/build/outputs/apk/release/app-release.apk
```

Package `dev.pixscape.game`, minSdk 26. Release builds are signed with `~/.android/debug.keystore`,
like the other sideloaded apps. APKs are attached to the [GitHub releases](https://github.com/fleton1/pixscape/releases).

## What's in it

- **Big world.** 420×320 tiles:
  - The kingdom of Aldermoor: Brindlewood, Highcrest, Port Selby, Hilda's farm and the goblin camp.
  - The Wilderness (aggressive monsters, level counter, lose-items-on-death), Frostpeak, and the Sundral Desert with Sandhaven and the Great Pyramid.
  - Mortmire Swamp, the elven continent of Elderglen, Palmera Isle and the volcanic Cinderhold.
- **Eight dungeons**, each its own map with its own lighting and music: Brindlewood Sewers, the
  Highcrest Catacombs, Crestfall Deeps (a dwarven mining town with a pitch-black lower seam; bring a
  light), Mortmire Crypt, Hollowroot Caverns, Frostpeak Ice Caves, the Tomb of the Scarab and the
  Cinderhold Depths.
- **17 skills** on the OSRS XP curve (levels 1-99) at 1x by default: Attack, Strength, Defence,
  Ranged, Magic, Hitpoints, Prayer, Woodcutting, Fletching, Firemaking, Fishing, Cooking, Mining,
  Smithing, Crafting, Runecraft and Thieving. Every skill has unlocks all the way up. Tap a skill for its guide.
  - Ranged: shortbows and longbows (normal to heartwood), crossbows, darts; arrows and bolts from
    bronze to dragon, which you can pick back up; accurate / rapid / longrange styles; line of sight.
  - Fletching: knife on logs for shafts, bows and stocks; string bows and crossbows; arrows, darts
    and bolts in batches.
  - Magic: 35 spells. Strike, bolt, blast and wave spells for each element (tap the spell, then the
    monster, or autocast with a staff), town teleports, low and high alchemy, superheat, jewellery
    enchanting (ring of recoil, ring of life, traveller's necklace, amulet of glory) and orb charging
    for battlestaves. Elemental staves give endless runes.
  - Runecraft: mine essence via the Archmage in Highcrest, then craft all 12 runes at altars hidden
    behind ruins across the world (bring the talisman, or bind it into a tiara).
  - Cooking: water, dough, bread, pies, stew, pizzas, cakes, cheese and wine, from farm ingredients.
  - Crafting: pottery, glassblowing, spinning, leather to black dragonhide, gems and jewellery.
  - Smithing: daggers to platebodies (15 pieces per metal), silver, steel studs.
  - Fishing: 18 fish, including cave eels, monkfish, anglerfish and Wilderness dark crabs.
  - Mining: clay, silver and gem rocks. Woodcutting: teak, mahogany and heartwood.
  - Thieving: 9 pickpocket targets, 6 stalls and trapped chests.
- **73 monsters**, from rats and rock crabs to black dragons, each with a drop that matters to a skill.
- **Combat.** OSRS-style accuracy and max-hit formulas, melee and ranged styles, 20 prayers, potions,
  food, and a 0.6s game tick. Melee, ranged and magic form a combat triangle: dragons, giants and bats are weak to ranged,
  skeletons and golems shrug it off, ghosts resist melee, armoured knights are weak to magic, demons
  resist it, metal armour spoils your aim, and archers and casters shoot back.
- **Bosses** with mechanics:
  - Rat King and the Drowned Abbot (mini-bosses), and Hrimfang the frost wyrm.
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
ROADMAP.md           the expansion plan (what's done, what's next)
tools/validate.mjs   content checker: node tools/validate.mjs
src/
  main.js            boot, title screen, layout choice, input, main loop, Android hooks
  touch.js           press-and-hold = right-click, pinch zoom
  audio.js           procedural music + sfx (WebAudio)
  util.js painter.js RNG/noise/colour helpers, pixel painter
  data/              items, npcs + drop tables, objects, skills/prayers/shops, recipes, skill guides
  world/             maps + collision, overworld generator, dungeons, map linking, A* pathfinding
  game/              state, player, npcs, combat, skilling, crafting (recipes), actions, quests, loop
  sprites/           procedural terrain, characters/monsters, objects, item & UI icons
  render/            world renderer, minimap + world map
  ui/                DOM interface (sidebar tabs, chat, dialogue, bank, shops...)
fonts/               Pixelify Sans (SIL OFL), bundled so the game works offline
android/             the Android app (see above)
```

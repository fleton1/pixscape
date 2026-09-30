import asyncio, json, time, sys, os, shutil
from playwright.async_api import async_playwright
URL = 'http://127.0.0.1:8765/index.html'
OUT = 'raw'
PREP = """(async () => {
  const [I, O, F, E, B, M, U] = await Promise.all(['./src/data/items.js', './src/data/objects.js', './src/game/farming.js', './src/game/events.js', './src/game/braziers.js', './src/game/magic.js', './src/util.js'].map((m) => import(m)));
  Object.assign(window, { I, O, F, E, B, M, U });
  const p = G.player;
  for (const s of Object.values(p.skills)) { s.xp = 13100000; s.lvl = 99; s.cur = 99; }
  p.hp = p.maxHp; G.settings.music = 0; G.settings.zoom = ZOOM;
  E.events.next = G.tick + 1e9;
  p.inv.fill(null);
  window.equip = (ids) => { for (const id of ids) { p.add(id); p.equipFromSlot(p.inv.findIndex((s) => s && s.id === id)); } };
  equip(['rune_fullhelm', 'rune_platebody', 'rune_platelegs', 'rune_kiteshield', 'dragon_scimitar', 'rift_cape', 'amulet_of_glory_4', 'leather_boots', 'leather_gloves']);
  window.near = (pred, w = G.world) => w.objects.find(pred);
  window.npc = (id, w = G.world) => w.npcs.find((n) => n.defId === id && !n.dead);
  window.tp = (x, y, map) => G.game.teleport(x, y, null, false, map || null);
  for (const [id, q] of [['shark', 1], ['shark', 1], ['shark', 1], ['shark', 1], ['shark', 1], ['super_combat', 1], ['prayer_potion', 1], ['law_rune', 40], ['coins', 184250]]) if (I.ITEMS[id]) p.add(id, q);
  p.questPoints = 42;
  const rares = Object.keys(I.ITEMS).filter((id) => I.ITEMS[id].rare);
  rares.forEach((id, i) => { if (i % 3 !== 2) p.collection[id] = 1; });
  for (const pet of ['scarablet', 'emberling', 'beaver', 'wisp']) p.collection['pet_' + pet] = 1;
  document.querySelector('#chat-log').innerHTML = '';
  G.ui.dirty('inv'); G.ui.dirty('equip'); G.ui.dirty('skills'); G.ui.dirty('orbs');
})()"""

async def clip(b, name, setup, action, dur, vw=1280, vh=720, dsf=1, zoom=3, settle=1800, title=False):
    ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=dsf, is_mobile=vw < 1000, has_touch=vw < 1000,
                              record_video_dir=OUT + '/tmp_' + name, record_video_size={'width': vw * dsf, 'height': vh * dsf})
    page = await ctx.new_page(); t0 = time.time(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    await page.goto(URL + '?t=' + str(t0))
    await page.wait_for_function("document.querySelector('#title').style.display === 'flex'", timeout=90000)
    if title:
        await page.wait_for_timeout(600); start = time.time() - t0
        await page.wait_for_timeout(int(dur * 1000))
    else:
        await page.click('#btn-new'); await page.wait_for_timeout(600)
        await page.evaluate(PREP.replace('ZOOM', str(zoom)))
        if setup: await page.evaluate(setup)
        await page.wait_for_timeout(settle)
        start = time.time() - t0
        if callable(action): await action(page)
        elif action: await page.evaluate(action)
        await page.wait_for_timeout(int(dur * 1000))
    await ctx.close()
    d = OUT + '/tmp_' + name; f = [x for x in os.listdir(d) if x.endswith('.webm')][0]
    shutil.move(d + '/' + f, f'{OUT}/{name}.webm'); shutil.rmtree(d)
    print(name, round(start, 2), errs, flush=True)
    return start

async def ui_montage(page):
    ev = page.evaluate
    await ev("G.ui.questComplete('knights_oath')"); await page.wait_for_timeout(2600)
    await ev("G.ui.closeWindow(); G.ui.openCollection(0)"); await page.wait_for_timeout(2400)
    await ev("G.ui.closeWindow(); G.ui.openExchange()"); await page.wait_for_timeout(500)
    await page.type('.exsearch', 'rune', delay=120)

async def farm_act(page):
    await page.wait_for_timeout(1800)
    await page.evaluate("G.game.setTarget('obj', window._o, 'Tend')")

CLIPS = {
  'title': dict(setup=None, action=None, dur=6, title=True),
  'town': dict(setup="tp(188, 158)", action="G.game.walkTo(214, 176)", dur=7),
  'map': dict(setup="tp(206, 171)", action="document.querySelector('#btn-map').click()", dur=4),
  'wc': dict(setup="(() => { G.player.add('rune_axe'); const o = near((o) => o.type === 'yew' && o.x === 196); window._o = o; tp(o.x + 1, o.y + 2); })()", action="G.game.setTarget('obj', window._o, 'Chop down')", dur=4.5, zoom=4),
  'mine': dict(setup="(() => { G.player.add('rune_pickaxe'); const o = near((o) => O.OBJECTS[o.type].mine && o.x > 256 && o.x < 270 && o.y > 132 && o.y < 146); window._o = o; tp(o.x, o.y + 1); })()", action="G.game.setTarget('obj', window._o, 'Mine')", dur=4.5, zoom=4),
  'fish': dict(setup="(() => { G.player.add('small_net'); const o = near((o) => o.type === 'spot_net' && o.x === 116); window._o = o; tp(o.x, o.y - 1); })()", action="G.game.setTarget('obj', window._o, 'Net')", dur=4.5, zoom=4),
  'farm': dict(setup="""(() => { const crops = ['strawberry', 'watermelon', 'sweetcorn', 'cabbage', 'tomato'];
      const f = (G.player.flags.farm ||= {}); let i = 0;
      for (const o of G.world.objects) if (O.OBJECTS[o.type].patch && Math.abs(o.x - 164) < 14 && Math.abs(o.y - 153) < 10) {
        const c = O.OBJECTS[o.type].patch === 'allotment' ? crops[i++ % crops.length] : O.OBJECTS[o.type].patch === 'herb' ? 'torchbloom' : 'yew_tree';
        f[`main:${o.x}:${o.y}`] = { weeds: 0, crop: c, planted: Date.now() - (i % 2 ? 9e9 : 6 * 60000) }; }
      const o = near((o) => o.type === 'allotment_patch' && o.x === 164); window._o = o; f[`main:${o.x}:${o.y}`].planted = Date.now() - 9e9; f[`main:${o.x}:${o.y}`].crop = 'strawberry';
      G.player.add('spade'); tp(o.x + 1, o.y + 3); })()""", action=farm_act, dur=4),
  'boss': dict(setup="(() => { const n = npc('emberwing'); window._n = n; tp(n.x, n.y + 4); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=7),
  'magic': dict(setup="(() => { const p = G.player; equip(['staff_of_fire']); p.add('blood_rune', 500); p.add('air_rune', 2000); G.ui.setAutocast('fire_wave'); const n = npc('ice_giant'); window._n = n; tp(n.x - 5, n.y + 1); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=6),
  'chins': dict(setup="(() => { const p = G.player; p.add('black_chinchompa', 500); p.equipFromSlot(p.inv.findIndex((s) => s && s.id === 'black_chinchompa')); const n = npc('hobgoblin'); window._n = n; tp(n.x + 4, n.y + 2); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=6),
  'wild': dict(setup="(() => { const n = npc('dark_wizard'); window._n = n; tp(n.x - 3, n.y + 5); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=6),
  'dungeon': dict(setup="(() => { const w = G.worlds.get('depths'); const n = w.npcs.find((n) => n.defId === 'red_dragon'); window._n = n; equip(['anti_dragon_shield']); tp(n.x - 4, n.y + 2, 'depths'); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=6, settle=2500),
  'frost': dict(setup="""(() => { const w = G.worlds.get('braziers'); tp(21, 17, 'braziers');
      setTimeout(() => { const bz = G.world.objects.filter((o) => o.type === 'brazier'); bz.forEach((o, i) => { o.lit = i !== 2; o.broken = i === 2; });
        B.brazier.heart = 170; B.brazier.points = 180; G.player.add('tinderbox'); G.player.add('hammer'); G.player.add('frost_root', 20);
        window._o = bz.find((o) => o.x === 23 && o.y === 19); G.ui.dirty('event');
        setInterval(() => bz.forEach((o, i) => { if (i !== 2) { o.lit = true; o.broken = false; } }), 100); }, 400); })()""", action="G.game.setTarget('obj', window._o, 'Feed')", dur=6, settle=2500, zoom=3),
  'star': dict(setup="(() => { const m = G.player.skills.mining; m.lvl = 69; m.cur = 69; m.xp = U.xpForLevel(70) - 80; G.player.add('rune_pickaxe'); tp(206, 171); })()",
               action="(() => { E.events.start('star'); const o = E.events.active.o; tp(o.x, o.y + 2); G.game.setTarget('obj', o, 'Mine'); })()", dur=7),
  'ui': dict(setup="(() => { tp(464, 191); G.player.add('cosmic_rune', 120); G.player.add('rune_scimitar'); })()", action=ui_montage, dur=3),
  'phone_port': dict(setup="(() => { const n = npc('goblin'); window._n = n; tp(n.x + 2, n.y + 2); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=7, vw=430, vh=932, dsf=1, zoom=2),
  'phone_land': dict(setup="tp(440, 200)", action="G.game.walkTo(462, 206)", dur=7, vw=932, vh=430, dsf=1, zoom=2),
}

async def main():
    only = sys.argv[1:]
    starts = json.load(open('starts.json')) if os.path.exists('starts.json') else {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, c in CLIPS.items():
            if only and name not in only: continue
            starts[name] = await clip(b, name, **c)
            json.dump(starts, open('starts.json', 'w'), indent=1)
        await b.close()
asyncio.run(main())

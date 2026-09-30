# Records every trailer shot from the real game (Playwright video), plus the game's own sound
# effects for each shot (captured from its WebAudio output). Serve the repo root on :8765 first.
#   python rec.py            all shots
#   python rec.py boss star  just those
import asyncio, base64, json, os, shutil, sys, time
from playwright.async_api import async_playwright

URL = 'http://127.0.0.1:8765/index.html'
OUT = 'raw'
PREP = """(async () => {
  const [I, O, E, B, M, U, A] = await Promise.all(['./src/data/items.js', './src/data/objects.js', './src/game/events.js', './src/game/braziers.js', './src/game/magic.js', './src/util.js', './src/render/atlas.js'].map((m) => import(m)));
  Object.assign(window, { I, O, E, B, M, U, A });
  const p = G.player;
  for (const s of Object.values(p.skills)) { s.xp = 13100000; s.lvl = 99; s.cur = 99; }
  p.hp = p.maxHp; G.settings.zoom = ZOOM; G.settings.music = 0; G.settings.sfx = 1; G.audio.setVolume();
  E.events.next = G.tick + 1e9;
  p.inv.fill(null);
  window.equip = (ids) => { for (const id of ids) { p.add(id); p.equipFromSlot(p.inv.findIndex((s) => s && s.id === id)); } };
  equip(['rune_fullhelm', 'rune_platebody', 'rune_platelegs', 'rune_kiteshield', 'dragon_scimitar', 'rift_cape', 'amulet_of_glory_4', 'leather_boots', 'leather_gloves']);
  for (const [id, q] of [['shark', 1], ['shark', 1], ['shark', 1], ['shark', 1], ['super_combat', 1], ['prayer_potion', 1], ['law_rune', 40], ['coins', 184250]]) if (I.ITEMS[id]) p.add(id, q);
  p.questPoints = 42;
  window.near = (pred, w = G.world) => w.objects.find(pred);
  window.npc = (id, w = G.world) => w.npcs.find((n) => n.defId === id && !n.dead);
  window.tp = (x, y, map) => G.game.teleport(x, y, null, false, map || null);
  document.querySelector('#chat-log').innerHTML = '';
  const hud = document.createElement('style'); hud.id = 'hud'; document.head.appendChild(hud);
  window.setHud = (mode) => { hud.textContent = mode === 'none' ? '#chatbox, #sidebar, #top-right, #xp-counter, #hover-text, #wild-level { display: none !important; }'
    : mode === 'lite' ? '#chatbox, #sidebar, #hover-text { display: none !important; }' : ''; };
  setHud('HUD');
  G.ui.dirty('inv'); G.ui.dirty('equip'); G.ui.dirty('skills'); G.ui.dirty('orbs');
})()"""
REC_START = """(() => { const a = G.audio; window._dest = a.ctx.createMediaStreamDestination(); a.master.connect(window._dest);
  window._chunks = []; window._rec = new MediaRecorder(window._dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
  window._rec.ondataavailable = (e) => window._chunks.push(e.data); window._rec.start(); })()"""
REC_STOP = """new Promise((res) => { window._rec.onstop = async () => { const u = new Uint8Array(await new Blob(window._chunks).arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); res(btoa(s)); }; window._rec.stop(); })"""


async def clip(b, name, setup, action, dur, vw=1280, vh=720, zoom=3, hud='lite', settle=1800, title=False):
    ctx = await b.new_context(viewport={'width': vw, 'height': vh}, is_mobile=vw < 1000, has_touch=vw < 1000,
                              record_video_dir=f'{OUT}/tmp_{name}', record_video_size={'width': vw, 'height': vh})
    page = await ctx.new_page(); t0 = time.time(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    await page.goto(URL + '?t=' + str(t0))
    await page.wait_for_function("document.querySelector('#title').style.display === 'flex'", timeout=90000)
    await page.click('#btn-new'); await page.wait_for_timeout(600)
    await page.evaluate(PREP.replace('ZOOM', str(zoom)).replace('HUD', hud))
    if setup: await page.evaluate(setup)
    await page.wait_for_timeout(settle)
    await page.evaluate(REC_START)
    start = time.time() - t0
    if callable(action): await action(page)
    elif action: await page.evaluate(action)
    await page.wait_for_timeout(int(dur * 1000))
    audio = await page.evaluate(REC_STOP)
    open(f'{OUT}/{name}.sfx.webm', 'wb').write(base64.b64decode(audio))
    await ctx.close()
    d = f'{OUT}/tmp_{name}'; f = [x for x in os.listdir(d) if x.endswith('.webm')][0]
    shutil.move(f'{d}/{f}', f'{OUT}/{name}.webm'); shutil.rmtree(d)
    print(name, round(start, 2), errs, flush=True)
    return start


async def farm_act(page):
    await page.wait_for_timeout(1500)
    await page.evaluate("G.game.setTarget('obj', window._o, 'Tend')")

async def boss_act(page):
    await page.evaluate("G.game.setTarget('npc', window._n, 'Attack')")
    await page.wait_for_timeout(5200)
    await page.evaluate("window._n.hp = 1")  # the finishing blow lands on camera

async def swoop(page):
    # a slow pull back from Brindlewood to the whole world
    await page.evaluate("""(() => { const m = G.worldmap; let z = 2.4; const step = () => { z *= 0.9937; m.zoom = m.target = Math.max(0.3, z); m.anchor = null; if (z > 0.3) requestAnimationFrame(step); }; requestAnimationFrame(step); })()""")

CLIPS = {
  'hero': dict(setup="(() => { tp(206, 169); G.player.faceDir(0, 1); })()", action=None, dur=6, zoom=5, hud='none'),
  'walk': dict(setup="tp(196, 166)", action="G.game.walkTo(214, 172)", dur=5, zoom=4, hud='none'),
  'map': dict(setup="(() => { G.overworld.atlas = A.bakeAtlas(G.overworld); tp(206, 171); document.querySelector('#wm-close').style.display = 'none'; document.querySelector('.wm-ctrl').style.display = 'none'; document.querySelector('#btn-map').click(); const m = G.worldmap; m.zoom = m.target = 2.4; })()", action=swoop, dur=8, hud='none', settle=1200),
  'wc': dict(setup="(() => { G.player.add('rune_axe'); const o = near((o) => o.type === 'yew' && o.x === 196); window._o = o; tp(o.x + 1, o.y + 2); })()", action="G.game.setTarget('obj', window._o, 'Chop down')", dur=4, zoom=5),
  'mine': dict(setup="(() => { G.player.add('rune_pickaxe'); const o = near((o) => O.OBJECTS[o.type].mine && o.x > 256 && o.x < 270 && o.y > 132 && o.y < 146); window._o = o; tp(o.x, o.y + 1); })()", action="G.game.setTarget('obj', window._o, 'Mine')", dur=4, zoom=5),
  'fish': dict(setup="(() => { G.player.add('small_net'); const o = near((o) => o.type === 'spot_net' && o.x === 116); window._o = o; tp(o.x, o.y - 1); })()", action="G.game.setTarget('obj', window._o, 'Net')", dur=4, zoom=5),
  'farm': dict(setup="""(() => { const crops = ['strawberry', 'watermelon', 'sweetcorn', 'cabbage', 'tomato'];
      const f = (G.player.flags.farm ||= {}); let i = 0;
      for (const o of G.world.objects) if (O.OBJECTS[o.type].patch && Math.abs(o.x - 164) < 14 && Math.abs(o.y - 153) < 10) {
        const c = O.OBJECTS[o.type].patch === 'allotment' ? crops[i++ % crops.length] : O.OBJECTS[o.type].patch === 'herb' ? 'torchbloom' : 'yew_tree';
        f[`main:${o.x}:${o.y}`] = { weeds: 0, crop: c, planted: Date.now() - (i % 2 ? 9e9 : 6 * 60000) }; }
      const o = near((o) => o.type === 'allotment_patch' && o.x === 164); window._o = o; f[`main:${o.x}:${o.y}`].planted = Date.now() - 9e9; f[`main:${o.x}:${o.y}`].crop = 'strawberry';
      G.player.add('spade'); tp(o.x + 1, o.y + 3); })()""", action=farm_act, dur=4, zoom=4),
  'star': dict(setup="(() => { const m = G.player.skills.mining; m.lvl = 69; m.cur = 69; m.xp = U.xpForLevel(70) - 60; G.player.add('rune_pickaxe'); tp(206, 171); })()",
               action="(() => { E.events.start('star'); const o = E.events.active.o; tp(o.x, o.y + 2); G.game.setTarget('obj', o, 'Mine'); })()", dur=6, zoom=4),
  'wild': dict(setup="(() => { const n = npc('dark_wizard'); window._n = n; tp(n.x - 3, n.y + 4); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=5, zoom=4),
  'dungeon': dict(setup="(() => { const w = G.worlds.get('depths'); const n = w.npcs.find((n) => n.defId === 'red_dragon'); window._n = n; equip(['anti_dragon_shield']); tp(n.x - 3, n.y + 2, 'depths'); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=5, zoom=4, settle=2500),
  'magic': dict(setup="(() => { const p = G.player; equip(['staff_of_fire']); p.add('blood_rune', 500); p.add('air_rune', 2000); G.ui.setAutocast('fire_wave'); const n = npc('ice_giant'); n.hp = 14; window._n = n; tp(n.x - 5, n.y + 1); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=5, zoom=4),
  'chins': dict(setup="""(() => { const p = G.player; p.add('black_chinchompa', 500); p.equipFromSlot(p.inv.findIndex((s) => s && s.id === 'black_chinchompa'));
      const n = npc('hobgoblin'); window._n = n; n.hp = 2; n.spawn.wander = 0;
      // line up the rest of the camp next to the target, well within the blast
      const pals = G.world.npcs.filter((m) => m !== n && !m.dead && ['hobgoblin', 'goblin', 'goblin_warrior'].includes(m.defId)).slice(0, 3);
      pals.forEach((m, i) => { const [dx, dy] = [[1, 0], [0, 1], [-1, 1]][i]; m.teleport(n.x + dx, n.y + dy); m.hp = 1; m.spawn.wander = 0; });
      tp(n.x + 5, n.y + 1); })()""", action="G.game.setTarget('npc', window._n, 'Attack')", dur=5, zoom=4),
  'boss': dict(setup="(() => { const n = npc('emberwing'); window._n = n; G.player.hp = 99; tp(n.x, n.y + 4); })()", action=boss_act, dur=9, zoom=4),
  'frost': dict(setup="""(() => { tp(21, 17, 'braziers');
      setTimeout(() => { const bz = G.world.objects.filter((o) => o.type === 'brazier'); bz.forEach((o) => { o.lit = true; o.broken = false; });
        B.brazier.heart = 10; B.brazier.points = 260; G.player.add('tinderbox'); G.player.add('frost_root', 20);
        window._o = bz.find((o) => o.x === 23 && o.y === 19); G.ui.dirty('event');
        setInterval(() => bz.forEach((o) => { if (!B.brazier.pause) { o.lit = true; o.broken = false; } }), 100); }, 400); })()""",
                action="G.game.setTarget('obj', window._o, 'Feed')", dur=6, zoom=4, settle=2500),
  'quest': dict(setup="tp(464, 191)", action="G.ui.questComplete('knights_oath')", dur=3, zoom=3, hud='full'),
  'phone_port': dict(setup="(() => { const n = npc('goblin'); window._n = n; tp(n.x + 2, n.y + 2); })()", action="G.game.setTarget('npc', window._n, 'Attack')", dur=6, vw=430, vh=932, zoom=2, hud='full'),
  'phone_land': dict(setup="(() => { G.player.add('rune_axe'); const o = near((o) => o.type === 'tree' && Math.abs(o.x - 206) < 30 && Math.abs(o.y - 171) < 30); window._o = o; tp(o.x, o.y + 1); })()", action="G.game.setTarget('obj', window._o, 'Chop down')", dur=6, vw=932, vh=430, zoom=2, hud='full'),
}


async def main():
    only = sys.argv[1:]
    os.makedirs(OUT, exist_ok=True)
    starts = json.load(open('starts.json')) if os.path.exists('starts.json') else {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for name, c in CLIPS.items():
            if only and name not in only: continue
            starts[name] = await clip(b, name, **c)
            json.dump(starts, open('starts.json', 'w'), indent=1)
        await b.close()

asyncio.run(main())

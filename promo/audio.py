import asyncio, base64
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        await pg.goto('http://127.0.0.1:8765/index.html'); await pg.wait_for_function("document.querySelector('#title').style.display === 'flex'", timeout=90000)
        await pg.click('#btn-new'); await pg.wait_for_timeout(800)
        print(await pg.evaluate("[!!G.audio.ctx, G.audio.ctx && G.audio.ctx.state]"))
        await pg.evaluate("G.settings.music = 1; G.settings.sfx = 0; G.audio.setVolume(); window._dest = G.audio.ctx.createMediaStreamDestination(); G.audio.master.connect(window._dest);")
        for name in ['kingdom', 'boss', 'frost']:
            await pg.evaluate(f"G.audio.setTrack('{name}')"); await pg.wait_for_timeout(700)
            await pg.evaluate("window._chunks = []; window._rec = new MediaRecorder(window._dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 }); window._rec.ondataavailable = (e) => window._chunks.push(e.data); window._rec.start();")
            await pg.wait_for_timeout(36000)
            data = await pg.evaluate("new Promise((res) => { window._rec.onstop = async () => { const buf = await new Blob(window._chunks).arrayBuffer(); let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); res(btoa(s)); }; window._rec.stop(); })")
            open(f'raw/music_{name}.webm', 'wb').write(base64.b64decode(data)); print(name, len(data))
        await b.close()
asyncio.run(main())

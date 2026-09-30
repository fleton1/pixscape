# Promo trailer and page

Everything here records the real game: a scripted headless Chromium plays each shot and Playwright
records it, `rec.py` also captures each shot's own sound effects from the game's WebAudio output,
the music is the game's procedural soundtrack (`audio.py`), and ffmpeg cuts it all together with
slammed captions in the game's pixel font, flashes, shakes and letterboxing.

Needs Python with `playwright` (plus its Chromium) and Pillow, and `ffmpeg`. Serve the repo root first:

```bash
python3 -m http.server 8765 --bind 127.0.0.1   # from the repo root
cd promo
python rec.py            # records every shot plus its sound into raw/ (or: python rec.py boss frost)
python audio.py          # captures the music themes into raw/
for n in kingdom boss; do ffmpeg -y -i raw/music_$n.webm -ar 48000 -ac 2 raw/music_$n.wav; done
python build.py          # pixscape-trailer.mp4 (1280x720, about a minute)
python loops.py          # web trailer, poster and feature loops for site/pixscape.html
```

Shots live in `rec.py` (the `CLIPS` table); the edit, captions and transitions in `build.py` (the
`SEG` table). The finished trailer is attached to the GitHub release rather than committed.

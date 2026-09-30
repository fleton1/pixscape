# Promo trailer and page

Everything here records the real game: a scripted headless Chromium plays each shot and Playwright
records it, the soundtrack is the game's own procedural music captured from its WebAudio output, and
ffmpeg cuts it together with captions in the game's pixel font.

Needs Python with `playwright` (plus its Chromium) and `ffmpeg`. Serve the repo root first:

```bash
python3 -m http.server 8765 --bind 127.0.0.1   # from the repo root
cd promo
python rec.py            # records every clip into raw/ (or: python rec.py boss frost)
python audio.py          # captures the kingdom, boss and frost themes into raw/
for n in kingdom boss frost; do ffmpeg -y -i raw/music_$n.webm -ar 48000 -ac 2 raw/music_$n.wav; done
python build.py          # pixscape-trailer.mp4 (1280x720, about a minute)
python loops.py          # web trailer, posters and feature loops for site/pixscape.html
```

Shots, captions and timings live in `rec.py` (the `CLIPS` table) and `build.py` (the `SEG` table).
The finished trailer is attached to the GitHub release rather than committed.

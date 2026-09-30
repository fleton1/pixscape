import json, subprocess, os
S = json.load(open('starts.json'))
FONT = '../fonts/PixelifySans.ttf'
T = 0.35   # crossfade
# (clip, offset, duration, caption, subline, fade_caption, zoom)
SEG = [
  ('title', 0.3, 4.0, None, None, True, True),
  ('town', 1.0, 4.2, 'A big world to explore', 'Towns, forests, deserts, swamps and frozen peaks', True, False),
  ('map', 0.8, 3.6, '560 x 440 tiles, 25 maps', 'Dungeons, islands, the Wilderness and more', True, True),
  ('wc', 1.2, 2.6, '22 skills, levels 1 to 99', 'The classic XP curve, at 1x', True, False),
  ('mine', 1.0, 2.3, '22 skills, levels 1 to 99', 'The classic XP curve, at 1x', False, False),
  ('fish', 1.0, 2.3, '22 skills, levels 1 to 99', 'The classic XP curve, at 1x', False, False),
  ('farm', 0.6, 3.6, 'Crops that grow in real time', 'Farming and Hunter, even while the game is closed', True, False),
  ('boss', 1.2, 5.0, 'Bosses with real mechanics', 'Dodge the fire rain, survive the slams', True, False),
  ('magic', 1.2, 3.2, 'Melee, ranged and magic', '35 spells and a true combat triangle', True, False),
  ('chins', 1.0, 3.0, 'Melee, ranged and magic', '35 spells and a true combat triangle', False, False),
  ('wild', 0.8, 3.4, 'The Wilderness', 'Deeper is deadlier. Keep your best three items.', True, False),
  ('dungeon', 1.0, 3.6, 'Dark dungeons', 'Dragons, demons and worse, 104 monsters in all', True, False),
  ('frost', 1.0, 4.2, 'The Frost Heart', 'Keep the braziers burning against the cold', True, False),
  ('star', 0.2, 4.6, 'World events', 'Shooting stars, goblin raids, a travelling merchant', True, False),
  ('ui', 0.3, 2.3, '18 quests, 8 achievement diaries', 'Story chains with real rewards', True, False),
  ('ui', 2.8, 2.0, 'A collection log to fill', 'Boss uniques, rare finds and pets', True, False),
  ('ui', 5.4, 2.6, 'The Vesper Exchange', 'A market that reacts to how you trade', True, False),
  ('PHONE', 1.0, 6.0, 'Browser or Android', 'Portrait or landscape, with touch controls', True, False),
  ('END', 0.5, 6.0, None, None, True, True),
]
W, H, FPS = 1280, 720, 25
def tf(s):
    p = f'txt/{abs(hash(s))}.txt'; open(p, 'w').write(s); return p
def caption(cap, sub, fade, x=4, y=526, w=540, h=190):
    a = "min(1\\,t/0.35)" if fade else "1"
    return (f",drawbox=x={x}:y={y}:w={w}:h={h}:color=0x14110c:t=fill,drawbox=x={x}:y={y}:w={w}:h={h}:color=0x5b4f3c:t=4"
            f",drawbox=x={x+24}:y={y+44}:w=48:h=3:color=0xd8a84a:t=fill"
            f",drawtext=fontfile={FONT}:textfile={tf('PIXSCAPE')}:fontsize=16:fontcolor=0xd8a84a:x={x+24}:y={y+20}:alpha='{a}'"
            f",drawtext=fontfile={FONT}:textfile={tf(cap)}:fontsize=36:fontcolor=0xfff2d0:x={x+24}:y={y+64}:alpha='{a}':shadowcolor=0x000000:shadowx=2:shadowy=2"
            f",drawtext=fontfile={FONT}:textfile={tf(sub)}:fontsize=19:fontcolor=0xc8b890:x={x+24}:y={y+120}:alpha='{a}'")
inputs, filt, labels = [], [], []
k = 0
for i, (clip, off, dur, cap, sub, fade, zoom) in enumerate(SEG):
    if clip == 'PHONE':
        a = len(inputs); inputs += ['-ss', str(S['phone_port'] + off), '-t', str(dur), '-i', 'raw/phone_port.webm']
        b = len(inputs) // 6 * 0; inputs += ['-ss', str(S['phone_land'] + off), '-t', str(dur), '-i', 'raw/phone_land.webm']
        ia, ib = k, k + 1; k += 2
        filt.append(f"color=c=0x1a1510:s={W}x{H}:r={FPS}:d={dur}[bg{i}];"
                    f"[{ia}:v]fps={FPS},scale=-2:640:flags=lanczos,pad=iw+8:ih+8:4:4:color=0x5b4f3c[p{i}];"
                    f"[{ib}:v]fps={FPS},scale=640:-2:flags=lanczos,pad=iw+8:ih+8:4:4:color=0x5b4f3c[l{i}];"
                    f"[bg{i}][p{i}]overlay=150:36[q{i}];[q{i}][l{i}]overlay=520:60,trim=0:{dur},setpts=PTS-STARTPTS"
                    + caption(cap, sub, fade, x=520, y=440, w=648, h=180) + f",format=yuv420p[v{i}]")
    elif clip == 'END':
        inputs += ['-ss', str(S['map'] + 1.5), '-t', str(dur), '-i', 'raw/map.webm']; ia = k; k += 1
        a = "min(1\\,t/0.6)"
        lines = [('PixScape', 96, 0xfff2d0, 170), ('An old school adventure', 30, 0xd8a84a, 290),
                 ('22 skills  -  104 monsters  -  18 quests  -  8 diaries', 24, 0xe8dcc0, 370),
                 ('Bosses, dungeons, the Wilderness, farming, world events', 24, 0xe8dcc0, 408),
                 ('Play in the browser or on Android', 24, 0xe8dcc0, 446),
                 ('git.pixscape.xyz/fleton/pixscape', 22, 0xa89878, 540)]
        dt = ''.join(f",drawtext=fontfile={FONT}:textfile={tf(t)}:fontsize={fs}:fontcolor=0x{c:06x}:x=(w-text_w)/2:y={y}:alpha='{a}':shadowcolor=0x000000:shadowx=3:shadowy=3" for t, fs, c, y in lines)
        filt.append(f"[{ia}:v]fps={FPS},zoompan=z='1.05+0.0012*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},boxblur=6:2,eq=brightness=-0.34:saturation=0.65,trim=0:{dur},setpts=PTS-STARTPTS"
                    f",drawbox=x=(iw-560)/2:y=268:w=560:h=3:color=0xd8a84a@0.8:t=fill{dt},fade=t=out:st={dur-1.2}:d=1.2,format=yuv420p[v{i}]")
    else:
        inputs += ['-ss', str(S[clip] + off), '-t', str(dur + 0.2), '-i', f'raw/{clip}.webm']; ia = k; k += 1
        z = f",zoompan=z='1+0.0016*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}" if zoom else ''
        extra = ''
        if i == 0: extra = ',fade=t=in:st=0:d=1.0'
        c = caption(cap, sub, fade) if cap else ''
        filt.append(f"[{ia}:v]fps={FPS},scale={W}:{H}{z},trim=0:{dur},setpts=PTS-STARTPTS{c}{extra},format=yuv420p[v{i}]")
# xfade chain
durs = [s[2] for s in SEG]
prev = 'v0'; acc = durs[0]
for i in range(1, len(SEG)):
    off = acc - T
    out = f'x{i}' if i < len(SEG) - 1 else 'vout'
    filt.append(f"[{prev}][v{i}]xfade=transition=fade:duration={T}:offset={off:.3f}[{out}]")
    prev = out; acc = acc + durs[i] - T
total = acc
# music: kingdom until boss, boss until frost, frost to end (crossfades of 1.5s)
starts = []; t = 0
for i, s in enumerate(SEG):
    starts.append(t); t += s[2] - T
tb, tf_ = starts[7], starts[12]
D = 1.5
ma = len(inputs) // 1; 
inputs += ['-i', 'raw/music_kingdom.wav', '-i', 'raw/music_boss.wav', '-i', 'raw/music_frost.wav']
m0, m1, m2 = k, k + 1, k + 2
la = tb + D / 2; lb = (tf_ - tb) + D; lc = total - tf_ + D / 2 + 1
filt.append(f"[{m0}:a]atrim=0:{la:.3f},asetpts=PTS-STARTPTS[ma];[{m1}:a]atrim=2:{2+lb:.3f},asetpts=PTS-STARTPTS[mb];[{m2}:a]atrim=1:{1+lc:.3f},asetpts=PTS-STARTPTS[mc];"
            f"[ma][mb]acrossfade=d={D}[mab];[mab][mc]acrossfade=d={D},atrim=0:{total:.3f},afade=t=in:st=0:d=1.2,afade=t=out:st={total-2.5:.3f}:d=2.5,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]")
open('filter.txt', 'w').write(';\n'.join(filt))
cmd = ['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex_script', 'filter.txt', '-map', '[vout]', '-map', '[aout]',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'pixscape-trailer.mp4']
print('total', round(total, 2))
r = subprocess.run(cmd); print('rc', r.returncode)

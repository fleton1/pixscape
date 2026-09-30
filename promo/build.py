# Cuts the trailer: in-game shots from rec.py, the game's music (audio.py) under each shot's own
# sound effects, slammed captions in the game's pixel font, flashes, shakes and letterboxing.
import json, os, subprocess
from PIL import Image, ImageDraw, ImageFont

S = json.load(open('starts.json'))
FONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts', 'PixelifySans.ttf')
W, H, FPS = 1280, 720, 25
PARCH, GOLD, INK = (255, 242, 208), (255, 207, 58), (22, 16, 10)
os.makedirs('cap', exist_ok=True)


def font(size):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_axes([700])
    except Exception: pass
    return f


def card(name, lines, y=None, box=False, cx=W / 2):
    """A transparent 1280x720 caption: lines are (text, size, colour); centred as a block."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    sizes = [(d.textbbox((0, 0), t, font=font(s), stroke_width=max(3, s // 14)), t, s, c) for t, s, c in lines]
    total = sum(b[3] - b[1] for b, *_ in sizes) + 14 * (len(sizes) - 1)
    cy = (H - total) / 2 if y is None else y
    if box:
        wmax = max(b[2] - b[0] for b, *_ in sizes)
        d.rectangle([W / 2 - wmax / 2 - 30, cy - 18, W / 2 + wmax / 2 + 30, cy + total + 18], fill=(14, 11, 8, 170))
    for b, t, s, c in sizes:
        sw = max(3, s // 14)
        x = cx - (b[2] - b[0]) / 2 - b[0]
        d.text((x + s // 18, cy - b[1] + s // 18), t, font=font(s), fill=(0, 0, 0, 150), stroke_width=sw, stroke_fill=(0, 0, 0, 150))
        if isinstance(c, list):  # two-colour word, e.g. the logo
            xx = x
            for part, col in c:
                d.text((xx, cy - b[1]), part, font=font(s), fill=col, stroke_width=sw, stroke_fill=INK)
                xx += d.textlength(part, font=font(s))
        else:
            d.text((x, cy - b[1]), t, font=font(s), fill=c, stroke_width=sw, stroke_fill=INK)
        cy += (b[3] - b[1]) + 14
    p = f'cap/{name}.png'; img.save(p); return p


LOGO = ('PixScape', 170, [('Pix', GOLD), ('Scape', PARCH)])
# (clip, offset, duration, caption lines, caption style, extras)
#   style: slam (punches in with a shake), soft (fades in), None
#   extras: lb = letterbox, blur = darken + blur the shot, punch = zoom punch on the cut, cut = transition INTO this segment
SEG = [
  ('hero', 0.6, 4.2, [("Every legend starts somewhere.", 40, PARCH)], 'soft', dict(lb=1, capy=600, capdelay=0.8, cut=('fadeblack', 0.01))),
  ('walk', 0.4, 2.8, [("...usually with a scimitar and big plans.", 40, PARCH)], 'soft', dict(lb=1, capy=600, capdelay=0.3, cut=('fade', 0.3))),
  ('map', 2.4, 3.8, [LOGO, ('An old school adventure', 44, GOLD)], 'slam', dict(blur=1, map=1, cut=('fadewhite', 0.35))),
  ('wc', 1.2, 1.5, [('CHOP.', 130, PARCH)], 'slam', dict(punch=1, cut=('fadewhite', 0.12))),
  ('mine', 1.0, 1.5, [('MINE.', 130, PARCH)], 'slam', dict(punch=1)),
  ('fish', 1.0, 1.5, [('FISH.', 130, PARCH)], 'slam', dict(punch=1)),
  ('farm', 1.6, 1.5, [('FARM.', 130, PARCH)], 'slam', dict(punch=1)),
  ('star', 1.9, 3.7, [('22 SKILLS. 1 TO 99.', 84, PARCH), ('(level-ups included)', 36, GOLD)], 'slam', dict(capy=90, cut=('fadewhite', 0.12))),
  ('BLACK', 0, 2.0, [("Then things got dangerous.", 46, PARCH)], 'soft', dict(cut=('fadeblack', 0.4))),
  ('wild', 1.0, 2.3, [('THE WILDERNESS', 100, PARCH)], 'slam', dict(punch=1, cut=('fadeblack', 0.2))),
  ('dungeon', 1.2, 2.3, [('DRAGONS', 120, PARCH)], 'slam', dict(punch=1)),
  ('magic', 0.6, 2.6, [('FIRE WAVE', 120, PARCH)], 'slam', dict(punch=1)),
  ('chins', 1.2, 3.0, [('EXPLODING', 110, PARCH), ('chinchompas', 52, GOLD)], 'slam', dict(punch=1, capy=70, hold=2.0)),
  ('boss', 0.8, 7.4, [('BOSSES', 130, PARCH), ('that fight back', 50, GOLD)], 'slam', dict(lb=1, capy=455, hold=2.4, cut=('fadewhite', 0.3), shake_at=5.9)),
  ('frost', 2.0, 4.0, [('THE FROST HEART', 96, PARCH)], 'slam', dict(capy=90, hold=2.2, cut=('fadewhite', 0.15))),
  ('quest', 0.2, 2.3, [('18 QUESTS', 110, PARCH), ('and 8 achievement diaries', 44, GOLD)], 'slam', dict(capy=500, punch=1)),
  ('map', 0.2, 6.0, [('A WORLD THIS BIG.', 96, PARCH)], 'soft', dict(map=1, capdelay=2.2, capy=560, cut=('fadewhite', 0.35))),
  ('PHONE', 1.0, 4.4, [('PLAY ANYWHERE', 90, PARCH), ('browser or Android, portrait or landscape', 36, GOLD)], 'slam', dict(capy=470, capx=800, cut=('fade', 0.3))),
  ('END', 0, 6.2, [LOGO, ('An old school adventure', 44, GOLD), ('22 skills  -  104 monsters  -  18 quests  -  8 diaries', 32, PARCH), ('Version 1.9  -  browser and Android', 32, (200, 184, 144))], 'slam', dict(cut=('fadewhite', 0.4))),
]

inputs, filt = [], []
k = 0


def add_input(args):
    global k
    inputs.extend(args); k += 1; return k - 1


def shake(dur, at=0.0, amp=10, length=0.35):
    # a quick shake that dies away, starting `at` seconds into the segment
    e = f"max(0\\,1-(t-{at})/{length})*gte(t\\,{at})"
    return f",crop={W - 2 * amp}:{H - 2 * amp}:x='{amp}+{amp}*sin(t*83)*{e}':y='{amp}+{amp}*cos(t*71)*{e}',scale={W}:{H}"


for i, (clip, off, dur, lines, style, ex) in enumerate(SEG):
    src = f'[{i}src]'
    if clip == 'BLACK':
        filt.append(f"color=c=black:s={W}x{H}:r={FPS}:d={dur}{src}")
    elif clip == 'PHONE':
        a = add_input(['-ss', str(S['phone_port'] + off), '-t', str(dur + 0.3), '-i', 'raw/phone_port.webm'])
        b = add_input(['-ss', str(S['phone_land'] + off), '-t', str(dur + 0.3), '-i', 'raw/phone_land.webm'])
        filt.append(f"color=c=0x14100b:s={W}x{H}:r={FPS}:d={dur}[pbg{i}];"
                    f"[{a}:v]fps={FPS},scale=-2:600:flags=lanczos,pad=iw+12:ih+12:6:6:color=0x5b4f3c[pp{i}];"
                    f"[{b}:v]fps={FPS},scale=700:-2:flags=lanczos,pad=iw+12:ih+12:6:6:color=0x5b4f3c[pl{i}];"
                    f"[pbg{i}][pp{i}]overlay=110:40[pq{i}];[pq{i}][pl{i}]overlay=440:60,trim=0:{dur},setpts=PTS-STARTPTS{src}")
    elif clip == 'END':
        a = add_input(['-ss', str(S['map'] + 5.5), '-t', str(dur + 0.3), '-i', 'raw/map.webm'])
        filt.append(f"[{a}:v]fps={FPS},crop=1120:630:80:28,scale={W}:{H},boxblur=8:2,eq=brightness=-0.32:saturation=0.7,trim=0:{dur},setpts=PTS-STARTPTS{src}")
    else:
        a = add_input(['-ss', str(S[clip] + off), '-t', str(dur + 0.3), '-i', f'raw/{clip}.webm'])
        v = f"[{a}:v]fps={FPS}"
        if ex.get('map'): v += f",crop=1120:630:80:28,scale={W}:{H}:flags=lanczos"
        if ex.get('blur'): v += ",boxblur=5:2,eq=brightness=-0.25:saturation=0.8"
        if ex.get('punch'): v += f",zoompan=z='1+0.09*max(0\\,1-on/7)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}"
        if ex.get('shake_at'): v += shake(dur, ex['shake_at'], 12, 0.5)
        v += f",trim=0:{dur},setpts=PTS-STARTPTS"
        if ex.get('lb'): v += f",drawbox=x=0:y=0:w={W}:h=76:color=black:t=fill,drawbox=x=0:y={H - 76}:w={W}:h=76:color=black:t=fill"
        filt.append(v + src)
    # caption
    cur = src
    if lines:
        cp = card(f'c{i}', lines, ex.get('capy'), cx=ex.get('capx', W / 2))
        ci = add_input(['-loop', '1', '-t', str(dur), '-i', cp])
        delay = ex.get('capdelay', 0.15 if style == 'slam' else 0.3)
        hold = min(dur - delay, ex.get('hold', 99))  # long shots let the caption go so the action plays clean
        if style == 'slam':
            capf = (f"[{ci}:v]format=rgba,trim=0:{hold},setpts=PTS-STARTPTS,"
                    f"scale=w='{W}*(1+0.45*pow(max(0\\,1-t/0.22)\\,2))':h=-1:eval=frame,"
                    f"fade=t=in:st=0:d=0.08:alpha=1,setpts=PTS+{delay}/TB[cap{i}]")
        else:
            capf = f"[{ci}:v]format=rgba,trim=0:{hold},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.6:alpha=1,setpts=PTS+{delay}/TB[cap{i}]"
        if dur > 2.5: capf = capf.replace(f",setpts=PTS+{delay}/TB[cap{i}]", f",fade=t=out:st={hold - 0.45}:d=0.4:alpha=1,setpts=PTS+{delay}/TB[cap{i}]")
        filt.append(capf)
        post = shake(dur, delay, 8, 0.3) if style == 'slam' and clip != 'BLACK' else ''
        filt.append(f"{cur}[cap{i}]overlay=x='(W-w)/2':y='(H-h)/2':eof_action=pass:format=auto{post},format=yuv420p[v{i}]")
    else:
        filt.append(f"{cur}format=yuv420p[v{i}]")
    if i == 0: filt[-1] = filt[-1].replace(f"format=yuv420p[v{i}]", f"fade=t=in:st=0:d=1.2,format=yuv420p[v{i}]")
    if i == len(SEG) - 1: filt[-1] = filt[-1].replace(f"format=yuv420p[v{i}]", f"fade=t=out:st={dur - 1.3}:d=1.3,format=yuv420p[v{i}]")

# transitions and each segment's start on the timeline
starts, acc, prev = [0.0], SEG[0][2], 'v0'
for i in range(1, len(SEG)):
    kind, T = SEG[i][5].get('cut', ('fade', 0.04))
    off = acc - T
    out = f'x{i}' if i < len(SEG) - 1 else 'vout'
    filt.append(f"[{prev}][v{i}]xfade=transition={kind}:duration={T}:offset={off:.3f}[{out}]")
    starts.append(off); acc = off + SEG[i][2]; prev = out
total = acc

# sound: the music, with each shot's own sound effects laid in where the shot plays
mk = add_input(['-i', 'raw/music_kingdom.wav']); mb = add_input(['-i', 'raw/music_boss.wav'])
t_danger = starts[8]; t_world = starts[16]; D = 1.2
la, lb_, lc = t_danger + D / 2, (t_world - t_danger) + D, total - t_world + D / 2 + 1
filt.append(f"[{mk}:a]asplit[mk1][mk2];[mk1]atrim=0:{la:.3f},asetpts=PTS-STARTPTS[ma];[{mb}:a]atrim=1:{1 + lb_:.3f},asetpts=PTS-STARTPTS[mb];"
            f"[mk2]atrim=12:{12 + lc:.3f},asetpts=PTS-STARTPTS[mc];[ma][mb]acrossfade=d={D}[mab];[mab][mc]acrossfade=d={D},atrim=0:{total:.3f},volume=0.62[music]")
fx = []
for i, (clip, off, dur, *_r) in enumerate(SEG):
    if clip in ('BLACK', 'END', 'PHONE') or not os.path.exists(f'raw/{clip}.sfx.webm'): continue
    a = add_input(['-i', f'raw/{clip}.sfx.webm'])
    ms = int(starts[i] * 1000)
    filt.append(f"[{a}:a]atrim={off}:{off + dur},asetpts=PTS-STARTPTS,afade=t=in:d=0.05,afade=t=out:st={dur - 0.15}:d=0.15,adelay={ms}|{ms},apad[fx{i}]")
    fx.append(f'[fx{i}]')
filt.append(f"{''.join(fx)}amix=inputs={len(fx)}:normalize=0,atrim=0:{total:.3f},volume=1.0[sfx]")
filt.append(f"[music][sfx]amix=inputs=2:normalize=0,afade=t=in:d=1.0,afade=t=out:st={total - 2.2:.3f}:d=2.2,loudnorm=I=-15:TP=-1.5:LRA=9,aresample=48000[aout]")

open('filter2.txt', 'w').write(';\n'.join(filt))
cmd = ['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex_script', 'filter2.txt', '-map', '[vout]', '-map', '[aout]',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k',
       '-movflags', '+faststart', 'pixscape-trailer.mp4']
print('total', round(total, 2), 'danger at', round(t_danger, 2), 'world at', round(t_world, 2))
r = subprocess.run(cmd); print('rc', r.returncode)

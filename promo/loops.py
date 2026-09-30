# Cuts the short muted loops, posters and web trailer used by site/pixscape.html.
import json, subprocess
S = json.load(open('starts.json'))
run = lambda *a: subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
run('-i', 'pixscape-trailer.mp4', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'site/pixscape-trailer.mp4')
run('-ss', '26.2', '-i', 'pixscape-trailer.mp4', '-frames:v', '1', '-q:v', '3', 'site/poster.jpg')
L = [('world', 'town', 1.0), ('map', 'map', 1.0), ('skills', 'mine', 0.8), ('farming', 'farm', 0.4), ('boss', 'boss', 1.3), ('magic', 'magic', 1.4), ('ranged', 'chins', 1.0),
     ('wild', 'wild', 0.8), ('dungeon', 'dungeon', 1.0), ('frost', 'frost', 1.0), ('star', 'star', 0.2), ('exchange', 'ui', 5.6)]
for name, clip, off in L:
    run('-ss', str(S[clip] + off), '-t', '3.6', '-i', f'raw/{clip}.webm', '-an', '-vf', 'fps=25,scale=640:360:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'site/loops/{name}.mp4')
    run('-ss', str(S[clip] + off + 0.1), '-i', f'raw/{clip}.webm', '-frames:v', '1', '-vf', 'scale=640:360', '-q:v', '4', f'site/loops/{name}.jpg')
for name, vf in [('phone_port', 'scale=320:-2'), ('phone_land', 'scale=640:-2')]:
    run('-ss', str(S[name] + 1.0), '-t', '4', '-i', f'raw/{name}.webm', '-an', '-vf', f'fps=25,{vf}:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'site/loops/{name}.mp4')
    run('-ss', str(S[name] + 1.1), '-i', f'raw/{name}.webm', '-frames:v', '1', '-vf', vf, '-q:v', '4', f'site/loops/{name}.jpg')

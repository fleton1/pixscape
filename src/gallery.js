// Sprite gallery (dev page, gallery.html): every monster, NPC, object and item icon on one page.
import { NPCS, PETS } from './data/npcs.js';
import { ITEMS } from './data/items.js';
import { buildSprite } from './sprites/chars.js';
import { buildObjectSprites, OBJ_SPRITES } from './sprites/objects.js';
import { itemIcon } from './sprites/items.js';

const out = document.getElementById('out');
const section = (title) => { const h = document.createElement('h2'); h.textContent = title; out.appendChild(h); const g = document.createElement('div'); g.className = 'grid'; out.appendChild(g); return g; };
const cell = (grid, canvas, label, scale) => {
  const c = document.createElement('div'); c.className = 'cell'; c.dataset.name = label.toLowerCase();
  const big = document.createElement('canvas'); big.width = canvas.width * scale; big.height = canvas.height * scale;
  const ctx = big.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(canvas, 0, 0, big.width, big.height);
  const s = document.createElement('span'); s.textContent = label;
  c.append(big, s); grid.appendChild(c);
};

buildObjectSprites();
const npcs = section(`Monsters and NPCs (${Object.keys(NPCS).length})`);
for (const [id, n] of Object.entries(NPCS)) {
  const set = buildSprite(n.look, 'gal_' + id);
  cell(npcs, set.frames.down.idle[0], `${n.name}${n.lvl ? ' (' + n.lvl + ')' : ''}`, 2);
}
const pets = section('Pets');
for (const [id, pt] of Object.entries(PETS)) cell(pets, buildSprite(pt.look, 'galpet_' + id).frames.down.idle[0], pt.name, 2);
const objs = section(`Objects (${Object.keys(OBJ_SPRITES).length})`);
for (const [id, set] of Object.entries(OBJ_SPRITES)) if (Array.isArray(set) && set[0]) cell(objs, set[0], id, 2);
const items = section(`Items (${Object.keys(ITEMS).length})`);
for (const id of Object.keys(ITEMS)) cell(items, itemIcon(id), ITEMS[id].name, 3);

document.getElementById('filter').oninput = (e) => {
  const q = e.target.value.toLowerCase();
  for (const c of out.querySelectorAll('.cell')) c.style.display = c.dataset.name.includes(q) ? '' : 'none';
};

// Boot, title screen, input and the main loop.
import { G, msg, sfx, TICK_MS } from './game/state.js';
import { buildWorlds } from './world/maps.js';
import { buildObjectSprites } from './sprites/objects.js';
import { buildSprite } from './sprites/chars.js';
import { game } from './game/game.js';
import { Renderer } from './render/renderer.js';
import { Minimap, WorldMap } from './render/minimap.js';
import { UI, escapeHtml } from './ui/ui.js';
import { AudioEngine } from './audio.js';
import { worldMenu } from './game/actions.js';
import { setupTouch } from './touch.js';

const $ = (s) => document.querySelector(s);
const status = (t) => { $('#load-status').textContent = t; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// Three layouts: 'desk' (the classic client), 'land' (phone landscape: full-height side panel)
// and 'port' (phone portrait: panel and chat docked along the bottom). See style.css.
function applyLayout() {
  const w = innerWidth, h = innerHeight;
  const root = document.documentElement;
  root.dataset.layout = h > w && w < 820 ? 'port' : w < 900 || h < 600 ? 'land' : 'desk';
  root.classList.toggle('touch', G.touch);
}
applyLayout();
addEventListener('resize', () => {
  applyLayout();
  if (G.worldmap && $('#worldmap').style.display === 'block') G.worldmap.resize();
});

async function boot() {
  status('Loading fonts...');
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  await nextFrame();
  status('Painting sprites...');
  await nextFrame();
  buildObjectSprites();
  status('Shaping the world...');
  await nextFrame();
  const worlds = buildWorlds();
  status('Waking the townsfolk...');
  await nextFrame();
  G.settings.xpRate = 1; // OSRS pace by default; Settings offers 2x-8x
  if (Math.min(innerWidth, innerHeight) < 600) G.settings.zoom = 2; // phones see more of the world
  game.init(worlds);
  G.audio = new AudioEngine();
  G.renderer = new Renderer($('#view'));
  G.ui = new UI();
  G.minimap = new Minimap($('#minimap'));
  G.minimap.refreshQuestIcons();
  G.worldmap = new WorldMap($('#worldmap canvas'), G.minimap);
  $('#loading').style.display = 'none';
  titleScreen();
}

// ------------------------------------------------------------------ title / character creation
const OPTS = {
  skin: ['#f0c8a0', '#e0b088', '#c89068', '#a06c48', '#7a4e32'],
  hair: ['#3a2410', '#6a4020', '#b08040', '#e0c070', '#1a1410', '#8a8a88', '#b04020', '#e8e8e8'],
  hairStyle: ['short', 'long', 'spiky', 'bald'],
  shirt: ['#5a7a2a', '#8a2a2a', '#2a4a8a', '#6a4a8a', '#8a6a2a', '#2a6a6a', '#4a4a4a', '#c8c0a8'],
  pants: ['#5a4a32', '#2a2a44', '#3a3a3a', '#5a2a2a', '#2a4a2a', '#6a6a6a'],
  female: [false, true],
};
function titleScreen() {
  const t = $('#title');
  t.style.display = 'flex';
  const p = G.player;
  const hasSave = game.hasSave();
  const look = { ...p.look };
  const renderPreview = () => {
    const set = buildSprite({ ...look, weapon: { kind: 'scimitar', color: '#b0703a' }, shield: { kind: 'woodshield', color: '#8a5a2b' } }, 'preview_' + JSON.stringify(look));
    const c = $('#char-preview');
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    const f = set.frames.down.idle[Math.floor(performance.now() / 650) % 2];
    const s = Math.floor(Math.min(c.width / f.width, c.height / f.height));
    ctx.drawImage(f, (c.width - f.width * s) / 2, (c.height - f.height * s) / 2, f.width * s, f.height * s);
  };
  const opts = $('#char-opts');
  opts.innerHTML = '';
  for (const [k, list] of Object.entries(OPTS)) {
    const row = document.createElement('div');
    row.className = 'copt';
    row.innerHTML = `<button class="prev">◀</button><span>${{ skin: 'Skin', hair: 'Hair colour', hairStyle: 'Hair style', shirt: 'Top', pants: 'Legs', female: 'Body type' }[k]}</span><button class="next">▶</button>`;
    const step = (d) => { const i = Math.max(0, list.indexOf(look[k])); look[k] = list[(i + d + list.length) % list.length]; renderPreview(); sfx('click'); };
    row.querySelector('.prev').onclick = () => step(-1);
    row.querySelector('.next').onclick = () => step(1);
    opts.appendChild(row);
  }
  const anim = setInterval(renderPreview, 200);
  renderPreview();
  $('#name-input').value = hasSave ? p.name : '';
  $('#btn-continue').style.display = hasSave ? '' : 'none';
  $('#creator').style.display = hasSave ? 'none' : '';
  $('#btn-new').textContent = hasSave ? 'New character' : 'Begin adventure';
  const start = (fresh) => {
    clearInterval(anim);
    G.audio.init();
    if (fresh) {
      if (hasSave) game.resetPlayer();
      const pl = G.player;
      pl.name = ($('#name-input').value || '').trim().slice(0, 12) || 'Adventurer';
      pl.look = look;
      pl.fresh = true;
    }
    t.style.display = 'none';
    started = true;
    run();
  };
  $('#btn-continue').onclick = () => start(false);
  $('#btn-new').onclick = () => {
    if (hasSave && $('#creator').style.display === 'none') { $('#creator').style.display = ''; $('#btn-continue').style.display = 'none'; $('#btn-new').textContent = 'Begin adventure (overwrites save)'; return; }
    start(true);
  };
  $('#name-input').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.target.blur(); $('#btn-new').click(); } };
  $('#name-input').setAttribute('enterkeyhint', 'go');
}
let started = false;

// ------------------------------------------------------------------ main loop
function run() {
  const p = G.player;
  G.lastTickAt = performance.now();
  $('#chat-name').textContent = p.name + ':';
  msg('Welcome to PixScape.');
  if (p.fresh) {
    msg('Talk to the <span style="color:#0000ff">Brindlewood Guide</span> by the fountain if you need help getting started.');
    msg(G.touch ? 'Tip: press and hold anything for more options. Tap MAP for the world map.' : 'Tip: right-click anything for more options. Press M for the world map.', '#7f0000');
    game.save();
  } else msg(`Welcome back, ${escapeHtml(p.name)}.`);
  G.audio.setTrack('town');
  game.checkArea();
  setupInput();
  requestAnimationFrame(frame);
}

let mouse = { x: 0, y: 0, in: false };
let frameCount = 0;
function frame(now) {
  let n = 0;
  while (now - G.lastTickAt >= TICK_MS && n++ < 3) {
    game.tick();
    if (G.tick % 60 === 0) G.ui.restockShops();
  }
  if (now - G.lastTickAt > TICK_MS * 3) G.lastTickAt = now;
  G.renderer.render(now);
  G.minimap.draw(now);
  G.ui.update(now);
  if (mouse.in && !G.ui.menuOpen && frameCount++ % 3 === 0) {
    const hit = G.renderer.pick(mouse.x, mouse.y);
    G.hoverTile = hit;
    G.ui.hoverText(worldMenu(hit));
  }
  $('#compass').style.display = '';
  requestAnimationFrame(frame);
}

function setupInput() {
  const cv = $('#view');
  let typing = false;
  cv.addEventListener('mousemove', (e) => { mouse = { x: e.clientX, y: e.clientY, in: true }; });
  cv.addEventListener('mouseleave', () => { mouse.in = false; G.ui.hoverText(null); });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('mousedown', (e) => {
    G.audio.init();
    if (G.ui.menuOpen) { G.ui.closeMenu(); return; }
    const hit = G.renderer.pick(e.clientX, e.clientY);
    const entries = worldMenu(hit);
    if (e.button === 2) { G.ui.openMenu(e.clientX, e.clientY, entries); return; }
    if (e.button !== 0) return;
    const first = entries[0];
    first.fn();
    if (!first.walk) G.renderer.clickMark(e.clientX, e.clientY, first.text.startsWith('Cancel') ? 'yellow' : 'red');
  });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    G.settings.zoom = Math.max(2, Math.min(5, G.settings.zoom + (e.deltaY > 0 ? -1 : 1)));
    G.ui.dirty('settings');
  }, { passive: false });
  setupTouch();
  // Tapping the chat bar opens a real text field, so phones get their keyboard.
  const field = $('#chat-field');
  $('#chat-line').addEventListener('click', () => {
    if (typing) return;
    $('#chatbox').classList.add('typing', 'field');
    field.value = '';
    field.focus();
  });
  field.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { G.ui.chatInput = field.value.slice(0, 80); G.ui.typeKey({ key: 'Enter' }); field.blur(); }
    else if (e.key === 'Escape') field.blur();
  });
  field.addEventListener('blur', () => { $('#chatbox').classList.remove('typing', 'field'); });
  $('#wm-close').onclick = () => toggleMap();
  // minimap
  $('#minimap').addEventListener('mousedown', (e) => {
    const r = e.target.getBoundingClientRect();
    const tile = G.minimap.clickToTile(e.clientX - r.left, e.clientY - r.top);
    if (tile) game.walkTo(tile[0], tile[1]);
  });
  $('#btn-map').onclick = () => toggleMap();
  // keys
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (typing) {
      if (e.key === 'Escape') { typing = false; G.ui.chatInput = ''; $('#chat-input').textContent = ''; $('#chatbox').classList.remove('typing'); return; }
      G.ui.typeKey(e);
      if (e.key === 'Enter') { typing = false; $('#chatbox').classList.remove('typing'); }
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') { typing = true; $('#chatbox').classList.add('typing'); e.preventDefault(); return; }
    if (e.key === 'Escape') { if ($('#worldmap').style.display === 'block') toggleMap(); G.ui.closeInterfaces(); G.useItem = null; G.ui.dirty('inv'); return; }
    if (e.key === ' ' && G.ui.dlgNext) { e.preventDefault(); G.ui.dlgNext(); return; }
    if (/^[1-5]$/.test(e.key) && G.ui.dlgChoose) { G.ui.dlgChoose(+e.key - 1); return; }
    if (e.key === 'm' || e.key === 'M') { toggleMap(); return; }
    const fk = /^F([1-8])$/.exec(e.key);
    if (fk) { e.preventDefault(); G.ui.setTab(['combat', 'skills', 'quests', 'inventory', 'equipment', 'prayer', 'magic', 'settings'][+fk[1] - 1]); return; }
    if (e.key === 'r' || e.key === 'R') { const p = G.player; p.running = !p.running && p.runEnergy > 1; G.ui.dirty('orbs'); }
  });
  window.addEventListener('beforeunload', () => game.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
}

// Android back button: close the top-most thing that's open. Returns false when there was nothing.
window.pixBack = () => {
  if (!started) return false;
  const ui = G.ui;
  if (document.activeElement === $('#chat-field')) { $('#chat-field').blur(); return true; }
  if (ui.menuOpen) { ui.closeMenu(); return true; }
  if ($('#worldmap').style.display === 'block') { toggleMap(); return true; }
  if (ui.window || ui.dlg) { ui.closeInterfaces(); return true; }
  if (G.useItem) { G.useItem = null; ui.dirty('inv'); return true; }
  if (document.documentElement.dataset.layout !== 'desk' && !document.documentElement.classList.contains('side-collapsed')) { ui.toggleSide(true); return true; }
  return false;
};
// The Android shell calls this when the app goes to the background and comes back.
window.pixPause = (paused) => {
  if (paused && started) game.save();
  const ctx = G.audio && G.audio.ctx;
  if (ctx) paused ? ctx.suspend() : ctx.resume();
};

function toggleMap() {
  const m = $('#worldmap');
  if (m.style.display === 'block') { m.style.display = 'none'; return; }
  m.style.display = 'block';
  G.worldmap.open();
}

window.G = G; window.game = game;
boot().catch((e) => { console.error(e); status('Something went wrong: ' + e.message); });

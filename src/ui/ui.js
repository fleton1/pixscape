// DOM user interface, styled after the classic OSRS client.
import { G, msg, sfx } from '../game/state.js';
import { ITEMS, SLOTS, SMELTING, JEWELLERY, METALS, SMITHABLES, GEMS } from '../data/items.js';
import { SKILLS, SKILL_NAMES, PRAYERS, SHOPS } from '../data/skills.js';
import { PETS } from '../data/npcs.js';
import { QUESTS } from '../game/quests.js';
import { itemOptions, useOnItem, dropSlot } from '../game/actions.js';
import { iconURL, iconFor } from '../sprites/items.js';
import { skillIcon, tabIcon, prayerIcon, orbIcon } from '../sprites/ui.js';
import { buildSprite } from '../sprites/chars.js';
import { playerMaxHit } from '../game/combat.js';
import { smelt, smith, craftJewellery } from '../game/skilling.js';
import { xpForLevel, commas, fmtNum, clamp } from '../util.js';
import { wildLevel, placeName } from '../game/world_info.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const TABS = ['combat', 'skills', 'quests', 'inventory', 'equipment', 'prayer', 'magic', 'settings'];

export class UI {
  constructor() {
    this.dirtySet = new Set(['inv', 'equip', 'skills', 'orbs', 'quests', 'combat', 'prayer', 'settings', 'magic', 'wild']);
    this.tab = 'inventory';
    this.window = null;
    this.dlg = null;
    this.bankQty = 1;
    this.shopStock = {};
    this.build();
  }

  // ================================================================ layout
  build() {
    const side = $('#sidebar');
    const top = h('div', 'tabs'), bot = h('div', 'tabs');
    TABS.forEach((t, i) => {
      const b = h('button', 'tab');
      b.dataset.tab = t;
      b.title = t[0].toUpperCase() + t.slice(1);
      b.innerHTML = `<img src="${tabIcon(t)}">`;
      b.onclick = () => { this.setTab(t); sfx('click'); };
      (i < 4 ? top : bot).appendChild(b);
    });
    side.prepend(top);
    side.appendChild(bot);
    for (const t of TABS) { const p = h('div', 'panel'); p.id = 'p-' + t; $('#panel').appendChild(p); }
    this.setTab('inventory');
    // orbs
    $('#orb-hp img').src = orbIcon('hp'); $('#orb-pr img').src = orbIcon('prayer'); $('#orb-run img').src = orbIcon('run');
    $('#orb-run').onclick = () => { const p = G.player; p.running = !p.running && p.runEnergy > 1; this.dirty('orbs'); sfx('click'); };
    $('#orb-pr').onclick = () => { if (G.player.prayers.size) { G.player.prayers.clear(); sfx('prayoff'); this.dirty('prayer'); } else this.setTab('prayer'); };
    $('#xp-orb').onclick = () => { G.settings.xpDrops = !G.settings.xpDrops; $('#xp-counter').style.display = G.settings.xpDrops ? '' : 'none'; };
    // chat input
    this.chatInput = '';
    // context menu close
    document.addEventListener('mousedown', (e) => { if (performance.now() - (this.menuOpenedAt || 0) < 80) return; if (!e.target.closest('#ctx-menu')) this.closeMenu(); });
    $('#ctx-menu').addEventListener('mouseleave', () => this.closeMenu());
  }
  setTab(t) {
    this.tab = t;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('show', p.id === 'p-' + t));
    this.dirty(t === 'inventory' ? 'inv' : t === 'equipment' ? 'equip' : t);
  }
  sideWidth() { const s = $('#sidebar'); return s && innerWidth > 700 ? s.offsetWidth : 0; }
  chatHeight() { const c = $('#chatbox'); return c && innerWidth > 700 ? c.offsetHeight : 0; }
  dirty(k) { this.dirtySet.add(k); }

  update(now) {
    const d = this.dirtySet;
    if (!d.size) return;
    if (d.has('inv')) this.renderInv();
    if (d.has('equip')) this.renderEquip();
    if (d.has('skills')) { this.renderSkills(); this.renderCombat(); }
    if (d.has('orbs')) this.renderOrbs();
    if (d.has('quests')) this.renderQuests();
    if (d.has('combat')) this.renderCombat();
    if (d.has('prayer')) this.renderPrayer();
    if (d.has('settings')) this.renderSettings();
    if (d.has('magic')) this.renderMagic();
    if (d.has('wild')) this.renderWild();
    if (d.has('bank') && this.window === 'bank') this.renderBank();
    if (d.has('shop') && this.window === 'shop') this.renderShop();
    d.clear();
  }

  // ================================================================ chat
  chat(text, color) {
    const log = $('#chat-log');
    const line = h('div', 'line', color ? `<span style="color:${color}">${text}</span>` : text);
    log.appendChild(line);
    while (log.children.length > 120) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  typeKey(e) {
    if (e.key === 'Enter') {
      const t = this.chatInput.trim();
      if (t) {
        this.chat(`<span style="color:#000">${escapeHtml(G.player.name)}:</span> <span style="color:#0000ff">${escapeHtml(t)}</span>`);
        G.player.say(t, 6);
        if (t.startsWith('::')) this.command(t.slice(2));
      }
      this.chatInput = '';
    } else if (e.key === 'Backspace') this.chatInput = this.chatInput.slice(0, -1);
    else if (e.key.length === 1 && this.chatInput.length < 80) this.chatInput += e.key;
    $('#chat-input').textContent = this.chatInput;
  }
  command(c) {
    // tiny debug helpers
    const [cmd, ...a] = c.split(' ');
    if (cmd === 'pos') this.chat(`${G.player.x}, ${G.player.y}`);
  }

  // ================================================================ orbs, xp drops, banners
  renderOrbs() {
    const p = G.player;
    const hp = p.hp, mx = p.maxHp;
    const hpEl = $('#orb-hp');
    hpEl.querySelector('.num').textContent = hp;
    hpEl.querySelector('.num').style.color = hp / mx < 0.25 ? '#ff2020' : hp / mx < 0.5 ? '#ff9800' : hp / mx < 0.75 ? '#ffff00' : '#00ff00';
    hpEl.querySelector('.fill').style.height = clamp(hp / mx, 0, 1) * 100 + '%';
    const pr = p.skills.prayer;
    $('#orb-pr .num').textContent = pr.cur;
    $('#orb-pr .fill').style.height = clamp(pr.cur / pr.lvl, 0, 1) * 100 + '%';
    $('#orb-pr').classList.toggle('on', p.prayers.size > 0);
    $('#orb-run .num').textContent = Math.floor(p.runEnergy);
    $('#orb-run .fill').style.height = p.runEnergy + '%';
    $('#orb-run').classList.toggle('on', p.running);
    $('#xp-counter').textContent = commas(p.totalXp());
  }
  xpDrop(skill, amt) {
    if (!G.settings.xpDrops) return;
    const d = h('div', 'xpdrop', `<img src="${skillIcon(skill)}">+${commas(Math.round(amt * 10) / 10)}`);
    $('#xpdrops').appendChild(d);
    setTimeout(() => d.remove(), 1800);
    this.dirty('orbs');
  }
  levelUp(skill, lvl) {
    this.chat(`Congratulations, you just advanced ${/^[aeiou]/i.test(SKILL_NAMES[skill]) ? 'an' : 'a'} ${SKILL_NAMES[skill]} level. Your ${SKILL_NAMES[skill]} level is now ${lvl}.`, '#0000aa');
    const b = h('div', 'levelup', `<img src="${skillIcon(skill)}"><div><b>Congratulations!</b><br>You've just advanced ${/^[aeiou]/i.test(SKILL_NAMES[skill]) ? 'an' : 'a'} ${SKILL_NAMES[skill]} level.<br>You have now reached level <span class="y">${lvl}</span>.</div>`);
    $('#toasts').appendChild(b);
    setTimeout(() => b.classList.add('out'), 3800);
    setTimeout(() => b.remove(), 4500);
    if (skill === 'hitpoints' || skill === 'prayer') this.dirty('orbs');
    this.dirty('combat'); this.dirty('prayer');
  }
  announce(html, kind) {
    const b = h('div', 'announce ' + (kind || ''), html);
    $('#announce').appendChild(b);
    setTimeout(() => b.classList.add('out'), 3000);
    setTimeout(() => b.remove(), 3800);
  }
  areaBanner(name) {
    if (!name) return;
    const el = $('#area-banner');
    el.innerHTML = `<div class="rule"></div><span>${name}</span><div class="rule"></div>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  renderWild() {
    const wl = wildLevel(G.player.x, G.player.y);
    const el = $('#wild-level');
    el.style.display = wl ? '' : 'none';
    el.innerHTML = `<div class="skull"></div>Level: ${wl}`;
  }
  fade(fn) {
    const f = $('#fade');
    f.classList.add('on');
    setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 150); }, 350);
  }
  clickMark(sx, sy, color) { G.renderer.clickMark(sx, sy, color); }

  // ================================================================ context menu
  openMenu(x, y, entries) {
    const m = $('#ctx-menu');
    m.innerHTML = '<div class="hdr">Choose Option</div>';
    for (const e of entries) {
      const r = h('div', 'opt', e.text);
      r.onmousedown = (ev) => { ev.stopPropagation(); ev.preventDefault(); this.closeMenu(); e.fn(); };
      m.appendChild(r);
    }
    m.style.display = 'block';
    this.menuOpenedAt = performance.now();
    const w = m.offsetWidth, hh = m.offsetHeight;
    m.style.left = clamp(x - w / 2, 2, innerWidth - w - 2) + 'px';
    m.style.top = clamp(y - 8, 2, innerHeight - hh - 2) + 'px';
    this.menuOpen = true;
  }
  closeMenu() { $('#ctx-menu').style.display = 'none'; this.menuOpen = false; }
  hoverText(entries) {
    const el = $('#hover-text');
    if (!entries || !entries.length || this.menuOpen) { el.innerHTML = ''; return; }
    const n = entries.length - 1;
    el.innerHTML = entries[0].text + (n > 1 ? ` <span class="more">/ ${n - 1} more option${n - 1 === 1 ? '' : 's'}</span>` : '');
  }

  // ================================================================ inventory
  renderInv() {
    const panel = $('#p-inventory');
    const p = G.player;
    if (!panel.children.length) {
      for (let i = 0; i < 28; i++) {
        const s = h('div', 'slot');
        s.dataset.i = i;
        s.draggable = true;
        s.onmousedown = (e) => this.invClick(e, i);
        s.oncontextmenu = (e) => e.preventDefault();
        s.onmouseenter = () => this.hoverText(this.invEntries(i));
        s.onmouseleave = () => this.hoverText(null);
        s.ondragstart = (e) => { e.dataTransfer.setData('text', String(i)); };
        s.ondragover = (e) => e.preventDefault();
        s.ondrop = (e) => { e.preventDefault(); const from = +e.dataTransfer.getData('text'); const inv = p.inv; [inv[from], inv[i]] = [inv[i], inv[from]]; this.dirty('inv'); };
        panel.appendChild(s);
      }
    }
    const slots = panel.children;
    for (let i = 0; i < 28; i++) {
      const s = p.inv[i], el = slots[i];
      const key = s ? s.id + ':' + s.qty + (G.useItem && G.useItem.slot === i ? ':sel' : '') : '';
      if (el.dataset.key === key) continue;
      el.dataset.key = key;
      el.classList.toggle('selected', !!(G.useItem && G.useItem.slot === i));
      el.innerHTML = s ? `<img src="${iconURL(s.id, s.qty)}">${ITEMS[s.id].stack ? `<span class="qty ${s.qty >= 10000000 ? 'g' : s.qty >= 100000 ? 'w' : ''}">${fmtNum(s.qty)}</span>` : ''}` : '';
    }
    if (this.window === 'bank') this.dirty('bank');
  }
  invEntries(i) {
    const p = G.player;
    if (!p.inv[i]) return null;
    if (this.window === 'bank') return [{ text: `Deposit-${this.bankQty === Infinity ? 'All' : this.bankQty} <span class="m-item">${ITEMS[p.inv[i].id].name}</span>` }, {}];
    if (this.window === 'shop') return [{ text: `Value <span class="m-item">${ITEMS[p.inv[i].id].name}</span>` }, {}];
    return itemOptions(i);
  }
  invClick(e, i) {
    const p = G.player;
    const s = p.inv[i];
    if (e.button === 2) {
      e.preventDefault();
      if (!s) return;
      if (this.window === 'bank') return this.openMenu(e.clientX, e.clientY, this.depositEntries(i));
      if (this.window === 'shop') return this.openMenu(e.clientX, e.clientY, this.sellEntries(i));
      this.openMenu(e.clientX, e.clientY, [...itemOptions(i), { text: 'Cancel', fn: () => {} }]);
      return;
    }
    if (e.button !== 0) return;
    if (!s) { if (G.useItem) { G.useItem = null; this.dirty('inv'); } return; }
    if (this.window === 'bank') { this.deposit(i, this.bankQty); return; }
    if (this.window === 'shop') { this.sellValue(i); return; }
    if (e.shiftKey) { dropSlot(i); return; }
    const opts = itemOptions(i);
    if (opts.length) opts[0].fn();
    sfx('click');
  }

  // ================================================================ equipment
  renderEquip() {
    const p = G.player;
    const panel = $('#p-equipment');
    const pos = { head: [1, 0], cape: [0, 1], neck: [1, 1], weapon: [0, 2], body: [1, 2], shield: [2, 2], legs: [1, 3], hands: [0, 4], feet: [1, 4], ring: [2, 4] };
    let html = '<div class="paperdoll">';
    for (const [slot, [cx, cy]] of Object.entries(pos)) {
      const e = p.equip[slot];
      html += `<div class="eslot" data-slot="${slot}" style="left:${18 + cx * 58}px;top:${6 + cy * 46}px">${e ? `<img src="${iconURL(e.id, e.qty)}">` : `<span class="ghost">${slot}</span>`}</div>`;
    }
    html += '</div>';
    const b = p.bonuses();
    html += `<div class="bonuses"><div>Attack bonus: <b>${b.att >= 0 ? '+' : ''}${b.att}</b></div><div>Strength bonus: <b>+${b.str}</b></div><div>Defence bonus: <b>+${b.def}</b></div><div>Prayer bonus: <b>+${b.prayer}</b></div><div>Max hit: <b>${playerMaxHit(p)}</b></div><div>Attack speed: <b>${(p.attackSpeed() * 0.6).toFixed(1)}s</b></div></div>`;
    panel.innerHTML = html;
    panel.querySelectorAll('.eslot').forEach((el) => {
      const slot = el.dataset.slot;
      el.onmousedown = (e) => {
        const it = p.equip[slot];
        if (!it) return;
        if (e.button === 2) { this.openMenu(e.clientX, e.clientY, [{ text: `Remove <span class="m-item">${ITEMS[it.id].name}</span>`, fn: () => p.unequip(slot) }, { text: `Examine <span class="m-item">${ITEMS[it.id].name}</span>`, fn: () => msg(ITEMS[it.id].examine) }, { text: 'Cancel', fn: () => {} }]); return; }
        p.unequip(slot);
      };
      el.oncontextmenu = (e) => e.preventDefault();
      el.onmouseenter = () => { const it = p.equip[slot]; this.hoverText(it ? [{ text: `Remove <span class="m-item">${ITEMS[it.id].name}</span>` }, {}] : null); };
      el.onmouseleave = () => this.hoverText(null);
    });
  }

  // ================================================================ skills
  renderSkills() {
    const p = G.player;
    const panel = $('#p-skills');
    let html = '<div class="skillgrid">';
    for (const s of SKILLS) {
      const k = p.skills[s];
      const next = k.lvl < 99 ? xpForLevel(k.lvl + 1) : null;
      const prog = next ? (k.xp - xpForLevel(k.lvl)) / (next - xpForLevel(k.lvl)) : 1;
      const tip = `${SKILL_NAMES[s]} XP: ${commas(k.xp)}${next ? `&#10;Next level at: ${commas(next)}&#10;Remaining XP: ${commas(next - k.xp)}` : ''}`;
      html += `<div class="skill" title="${tip}"><img src="${skillIcon(s)}"><div class="lv"><span class="${k.cur > k.lvl ? 'boost' : k.cur < k.lvl ? 'drain' : ''}">${k.cur}</span><span class="sep">/</span><span>${k.lvl}</span></div><div class="bar" style="width:${prog * 100}%"></div></div>`;
    }
    html += `<div class="skill total"><div>Total level:<br><span class="y">${p.totalLevel()}</span></div></div></div>`;
    html += `<div class="skillinfo">Combat Lvl: <span class="y">${p.combatLevel()}</span> &nbsp; Total XP: <span class="y">${commas(p.totalXp())}</span></div>`;
    panel.innerHTML = html;
  }

  // ================================================================ combat
  renderCombat() {
    const p = G.player;
    const w = p.weapon();
    const panel = $('#p-combat');
    const styles = [['accurate', 'Accurate', 'Attack'], ['aggressive', 'Aggressive', 'Strength'], ['defensive', 'Defensive', 'Defence']];
    panel.innerHTML = `<div class="ctitle">${w ? w.name : 'Unarmed'}</div><div class="clevel">Combat Lvl: ${p.combatLevel()}</div>
      <div class="styles">${styles.map(([k, n, s]) => `<button class="style ${p.style === k ? 'on' : ''}" data-s="${k}"><img src="${skillIcon(s.toLowerCase())}"><div>${n}</div><small>${s} XP</small></button>`).join('')}</div>
      <button class="toggle ${G.settings.autoRetaliate ? 'on' : ''}" id="autoret">Auto Retaliate<br><small>(${G.settings.autoRetaliate ? 'On' : 'Off'})</small></button>
      <div class="bonuses small">Max hit: ${playerMaxHit(p)} &nbsp; Speed: ${(p.attackSpeed() * 0.6).toFixed(1)}s</div>`;
    panel.querySelectorAll('.style').forEach((b) => (b.onclick = () => { p.style = b.dataset.s; this.dirty('combat'); sfx('click'); }));
    $('#autoret').onclick = () => { G.settings.autoRetaliate = !G.settings.autoRetaliate; this.dirty('combat'); sfx('click'); };
  }

  // ================================================================ quests
  renderQuests() {
    const p = G.player;
    const panel = $('#p-quests');
    const total = Object.values(QUESTS).reduce((a, q) => a + q.qp, 0);
    let html = `<div class="qphead">Quest Points: <span class="y">${p.questPoints}/${total}</span></div><div class="qlist">`;
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = p.stage(id);
      html += `<div class="quest ${s >= 100 ? 'done' : s > 0 ? 'started' : ''}" data-q="${id}">${q.name}</div>`;
    }
    html += '</div><div class="qbtns"><button id="btn-clog">Collection Log</button><button id="btn-stats">Adventure Stats</button></div>';
    panel.innerHTML = html;
    panel.querySelectorAll('.quest').forEach((el) => (el.onclick = () => this.openJournal(el.dataset.q)));
    $('#btn-clog').onclick = () => this.openCollection();
    $('#btn-stats').onclick = () => this.openStats();
  }
  openJournal(id) {
    const q = QUESTS[id], p = G.player;
    const lines = q.journal(p.stage(id), p).filter(Boolean);
    this.openWindow('journal', `<div class="scroll"><h2>${q.name}</h2><div class="qmeta">Difficulty: ${q.diff} &nbsp;|&nbsp; Quest points: ${q.qp}</div>${lines.map((l) => `<p>${l}</p>`).join('')}${p.stage(id) === 0 ? `<p class="rw"><b>Rewards:</b><br>${q.rewards.join('<br>')}</p>` : ''}</div>`, 'Quest Journal');
  }
  questComplete(id) {
    const q = QUESTS[id], p = G.player;
    this.dirty('quests');
    this.openWindow('qc', `<div class="scroll qc"><h2>Congratulations!</h2><p>You have completed <b>${q.name}</b>!</p><div class="qcbody"><div class="qcart"></div><div><b>You are awarded:</b><br>${q.rewards.join('<br>')}</div></div><p class="qp">Quest Points: <b>${p.questPoints}</b></p></div>`, 'Quest Complete');
    G.effects.push({ kind: 'fireworks', follow: p, t: performance.now() });
  }
  openCollection() {
    const p = G.player;
    const uniques = Object.values(ITEMS).filter((i) => i.rare);
    let html = '<div class="clog"><h3>Items</h3><div class="grid">';
    for (const it of uniques) {
      const n = p.collection[it.id] || 0;
      html += `<div class="cl ${n ? 'got' : ''}" title="${it.name}${n ? ' (x' + n + ')' : ''}"><img src="${iconURL(it.id)}">${n > 1 ? `<span>${n}</span>` : ''}</div>`;
    }
    html += '</div><h3>Pets</h3><div class="grid pets">';
    for (const [id, pet] of Object.entries(PETS)) {
      const got = p.collection['pet_' + id];
      const set = buildSprite(pet.look.kind === 'human' ? { ...pet.look, tiny: true, short: false } : pet.look, 'pet_' + id);
      html += `<div class="cl pet ${got ? 'got' : ''}" data-pet="${id}" title="${pet.name} - ${pet.from}"><img src="${set.frames.down.idle[0].toDataURL()}"></div>`;
    }
    const count = uniques.filter((i) => p.collection[i.id]).length + Object.keys(PETS).filter((id) => p.collection['pet_' + id]).length;
    html += `</div><div class="cltotal">Obtained: <span class="y">${count}/${uniques.length + Object.keys(PETS).length}</span></div><p class="hint">Click an owned pet to have it follow you.</p></div>`;
    this.openWindow('clog', html, 'Collection Log');
    document.querySelectorAll('.cl.pet.got').forEach((el) => (el.onclick = () => { p.pet = p.pet === el.dataset.pet ? null : el.dataset.pet; G.game.spawnPet(); msg(p.pet ? `Your ${PETS[p.pet].name} is now following you.` : 'Your pet goes home.'); }));
  }
  openStats() {
    const p = G.player, s = p.stats;
    const kills = Object.entries(s.kills).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `<div>${k.replace(/_/g, ' ')}: <b>${v}</b></div>`).join('') || '<div>None yet!</div>';
    const mins = Math.floor(s.playTicks * 0.6 / 60);
    this.openWindow('stats', `<div class="scroll"><h2>${escapeHtml(p.name)}</h2><p>Combat level <b>${p.combatLevel()}</b> &middot; Total level <b>${p.totalLevel()}</b> &middot; Quest points <b>${p.questPoints}</b></p><p>Time played: <b>${Math.floor(mins / 60)}h ${mins % 60}m</b> &middot; Deaths: <b>${s.deaths}</b> &middot; Clues solved: <b>${s.clues || 0}</b></p>${p.flags.dragonslayer ? '<p class="y2">Title: Dragonslayer</p>' : ''}<h3>Kill counts</h3><div class="kc">${kills}</div></div>`, 'Adventure Stats');
  }

  // ================================================================ prayer
  renderPrayer() {
    const p = G.player;
    const panel = $('#p-prayer');
    let html = `<div class="prhead">Prayer: <span class="y">${p.skills.prayer.cur}/${p.skills.prayer.lvl}</span></div><div class="prgrid">`;
    for (const pr of PRAYERS) {
      const ok = p.lvl('prayer') >= pr.lvl && (!pr.quest || p.stage(pr.quest) >= 100);
      html += `<div class="pr ${ok ? '' : 'locked'} ${p.prayers.has(pr.id) ? 'on' : ''}" data-id="${pr.id}" title="${pr.name} (Level ${pr.lvl})&#10;${pr.desc}${pr.quest ? '&#10;Requires Dragon\'s Bane' : ''}"><img src="${prayerIcon(pr.id, p.prayers.has(pr.id))}"></div>`;
    }
    html += '</div>';
    panel.innerHTML = html;
    panel.querySelectorAll('.pr').forEach((el) => (el.onclick = () => this.togglePrayer(el.dataset.id)));
  }
  togglePrayer(id) {
    const p = G.player;
    const pr = PRAYERS.find((x) => x.id === id);
    if (p.prayers.has(id)) { p.prayers.delete(id); sfx('prayoff'); this.dirty('prayer'); return; }
    if (p.lvl('prayer') < pr.lvl) { msg(`You need a Prayer level of ${pr.lvl} to use ${pr.name}.`); return; }
    if (pr.quest && p.stage(pr.quest) < 100) { msg('You need to complete Dragon\'s Bane to use this prayer.'); return; }
    if (p.skills.prayer.cur <= 0) { msg('You need to recharge your Prayer at an altar.'); return; }
    // exclusive groups
    for (const other of PRAYERS) {
      if (!p.prayers.has(other.id)) continue;
      const clash = (pr.protect && other.protect) || ['att', 'str', 'def'].some((k) => pr[k] && other[k]);
      if (clash) p.prayers.delete(other.id);
    }
    p.prayers.add(id);
    sfx('prayon');
    this.dirty('prayer'); this.dirty('orbs');
  }

  // ================================================================ magic
  renderMagic() {
    const panel = $('#p-magic');
    panel.innerHTML = `<div class="spell" id="sp-home"><div class="sp-icon"></div><div><b>Home Teleport</b><br><small>Teleports you to Brindlewood. Not usable above level 20 Wilderness.</small></div></div>
      <div class="lore">The standard spellbook is still being written by the wizards of Highcrest...</div>`;
    $('#sp-home').onclick = () => G.game.homeTeleport();
  }

  // ================================================================ settings
  renderSettings() {
    const s = G.settings;
    const panel = $('#p-settings');
    panel.innerHTML = `<div class="set"><label>Music volume</label><input type="range" min="0" max="1" step="0.05" value="${s.music}" id="set-music"></div>
      <div class="set"><label>Sound effects</label><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" id="set-sfx"></div>
      <div class="set"><label>Zoom <span class="y">${s.zoom}x</span></label><input type="range" min="2" max="5" step="1" value="${s.zoom}" id="set-zoom"></div>
      <div class="set"><label>XP rate</label><select id="set-xp">${[1, 2, 4, 8].map((r) => `<option value="${r}" ${s.xpRate == r ? 'selected' : ''}>${r}x ${r === 1 ? '(authentic)' : r === 4 ? '(chill)' : ''}</option>`).join('')}</select></div>
      <div class="set chk"><label><input type="checkbox" id="set-part" ${s.particles ? 'checked' : ''}> Weather &amp; particles</label></div>
      <div class="set chk"><label><input type="checkbox" id="set-xpd" ${s.xpDrops ? 'checked' : ''}> XP drops</label></div>
      <div class="set btns"><button id="set-save">Save game</button><button id="set-reset" class="danger">Reset</button></div>
      <div class="keys"><b>Keys</b><br>Enter: chat &middot; M: world map<br>Space / 1-5: dialogue<br>Shift+click: drop item<br>F1-F8: side tabs &middot; Esc: close</div>`;
    $('#set-music').oninput = (e) => { s.music = +e.target.value; G.audio && G.audio.setVolume(); };
    $('#set-sfx').oninput = (e) => { s.sfx = +e.target.value; G.audio && G.audio.setVolume(); };
    $('#set-zoom').oninput = (e) => { s.zoom = +e.target.value; panel.querySelector('label .y').textContent = s.zoom + 'x'; };
    $('#set-xp').onchange = (e) => { s.xpRate = +e.target.value; msg(`XP rate set to ${s.xpRate}x.`); };
    $('#set-part').onchange = (e) => { s.particles = e.target.checked; };
    $('#set-xpd').onchange = (e) => { s.xpDrops = e.target.checked; $('#xp-counter').style.display = s.xpDrops ? '' : 'none'; };
    $('#set-save').onclick = () => { G.game.save(); msg('Game saved.'); };
    $('#set-reset').onclick = () => { if (confirm('Delete your save and start over?')) G.game.reset(); };
  }

  // ================================================================ windows
  openWindow(kind, html, title) {
    this.window = kind;
    const w = $('#window');
    w.className = 'win ' + kind;
    w.innerHTML = `<div class="wtitle">${title || ''}<button class="x">✕</button></div><div class="wbody">${html}</div>`;
    w.style.display = 'block';
    w.querySelector('.x').onclick = () => this.closeWindow();
  }
  closeWindow() {
    const w = $('#window');
    w.style.display = 'none';
    const was = this.window;
    this.window = null;
    if (was === 'bank' || was === 'shop') this.dirty('inv');
    document.body.classList.remove('banking', 'shopping');
  }
  closeInterfaces() {
    if (this.window) this.closeWindow();
    if (this.dlg) this.endDialogue(this.dlg);
    this.closeMenu();
  }
  showClue(text) { this.openWindow('clue', `<div class="scroll clue"><p>${text}</p></div>`, 'Clue'); }
  showLoot(title, items) {
    this.openWindow('loot', `<div class="loot">${items.map(([id, q]) => `<div class="li"><img src="${iconURL(id, q)}"><span>${q > 1 ? commas(q) + ' x ' : ''}${ITEMS[id].name}</span></div>`).join('')}</div>`, title);
  }
  chooseSkill(title, cb) {
    this.openWindow('lamp', `<p>${title}</p><div class="lampgrid">${SKILLS.map((s) => `<div class="ls" data-s="${s}"><img src="${skillIcon(s)}"><span>${SKILL_NAMES[s]}</span></div>`).join('')}</div>`, 'Antique lamp');
    document.querySelectorAll('.ls').forEach((el) => (el.onclick = () => { this.closeWindow(); cb(el.dataset.s); }));
  }

  // ---------------------------------------------------------------- bank
  openBank() {
    this.openWindow('bank', '', 'The Bank of Aldermoor');
    this.bankFilter = '';
    document.body.classList.add('banking');
    this.setTab('inventory');
    this.renderBank();
  }
  renderBank() {
    const p = G.player;
    const body = $('#window .wbody');
    if (!body) return;
    const f = (this.bankFilter || '').toLowerCase();
    const items = p.bank.map((b, i) => [b, i]).filter(([b]) => !f || ITEMS[b.id].name.toLowerCase().includes(f));
    const val = p.bank.reduce((a, b) => a + ITEMS[b.id].value * b.qty, 0);
    body.innerHTML = `<div class="bankbar"><input id="bank-search" placeholder="Search..." value="${escapeHtml(this.bankFilter || '')}"><span class="bv">Value: <span class="y">${commas(val)}</span></span></div>
      <div class="bankgrid">${items.map(([b, i]) => `<div class="bslot" data-i="${i}"><img src="${iconURL(b.id, b.qty)}"><span class="qty ${b.qty >= 10000000 ? 'g' : b.qty >= 100000 ? 'w' : ''}">${fmtNum(b.qty)}</span></div>`).join('')}</div>
      <div class="bankbtns"><span>Quantity:</span>${[1, 5, 10, Infinity].map((q) => `<button class="bq ${this.bankQty === q ? 'on' : ''}" data-q="${q}">${q === Infinity ? 'All' : q}</button>`).join('')}<button id="dep-inv">Deposit inventory</button><button id="dep-eq">Deposit worn</button></div>`;
    const search = $('#bank-search');
    search.oninput = () => { this.bankFilter = search.value; this.renderBank(); const s = $('#bank-search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); };
    search.onkeydown = (e) => e.stopPropagation();
    body.querySelectorAll('.bslot').forEach((el) => {
      const i = +el.dataset.i;
      el.oncontextmenu = (e) => e.preventDefault();
      el.onmousedown = (e) => {
        const b = p.bank[i];
        if (!b) return;
        const nm = `<span class="m-item">${ITEMS[b.id].name}</span>`;
        if (e.button === 2) this.openMenu(e.clientX, e.clientY, [1, 5, 10, Infinity].map((q) => ({ text: `Withdraw-${q === Infinity ? 'All' : q} ${nm}`, fn: () => this.withdraw(i, q) })).concat([{ text: `Examine ${nm}`, fn: () => msg(ITEMS[b.id].examine) }, { text: 'Cancel', fn: () => {} }]));
        else this.withdraw(i, this.bankQty);
      };
      el.onmouseenter = () => { const b = p.bank[i]; if (b) this.hoverText([{ text: `Withdraw-${this.bankQty === Infinity ? 'All' : this.bankQty} <span class="m-item">${ITEMS[b.id].name}</span>` }, {}]); };
      el.onmouseleave = () => this.hoverText(null);
    });
    body.querySelectorAll('.bq').forEach((b) => (b.onclick = () => { this.bankQty = +b.dataset.q; this.renderBank(); }));
    $('#dep-inv').onclick = () => { for (let i = 0; i < 28; i++) if (p.inv[i]) this.deposit(i, Infinity, true); this.dirty('inv'); this.renderBank(); sfx('bank'); };
    $('#dep-eq').onclick = () => { for (const s of SLOTS) { const e = p.equip[s]; if (e) { this.bankAdd(e.id, e.qty); p.equip[s] = null; } } this.dirty('equip'); this.renderBank(); sfx('bank'); };
  }
  bankAdd(id, qty) {
    const p = G.player;
    const b = p.bank.find((x) => x.id === id);
    if (b) b.qty += qty; else p.bank.push({ id, qty });
  }
  deposit(i, qty, quiet) {
    const p = G.player;
    const s = p.inv[i];
    if (!s) return;
    let n = 0;
    if (ITEMS[s.id].stack) { n = Math.min(qty, s.qty); p.removeSlot(i, n); }
    else { const want = Math.min(qty, p.count(s.id)); p.inv[i] = null; n = 1; if (want > 1) n += p.remove(s.id, want - 1); }
    this.bankAdd(s.id, n);
    this.dirty('inv');
    if (!quiet) { this.renderBank(); sfx('bank'); }
  }
  withdraw(i, qty) {
    const p = G.player;
    const b = p.bank[i];
    if (!b) return;
    const n = Math.min(qty, b.qty);
    let got;
    if (ITEMS[b.id].stack) { if (!p.canAdd(b.id)) { msg("You don't have enough inventory space."); return; } p.add(b.id, n); got = n; }
    else { const space = p.freeSlots(); got = Math.min(n, space); if (!got) { msg("You don't have enough inventory space."); return; } p.add(b.id, got); }
    b.qty -= got;
    if (b.qty <= 0) p.bank.splice(i, 1);
    sfx('bank');
    this.renderBank();
  }
  depositEntries(i) {
    const p = G.player, s = p.inv[i];
    const nm = `<span class="m-item">${ITEMS[s.id].name}</span>`;
    return [1, 5, 10, Infinity].map((q) => ({ text: `Deposit-${q === Infinity ? 'All' : q} ${nm}`, fn: () => this.deposit(i, q) })).concat([{ text: 'Cancel', fn: () => {} }]);
  }

  // ---------------------------------------------------------------- shops
  openShop(id) {
    const shop = SHOPS[id];
    if (!shop) return;
    this.shopId = id;
    if (!this.shopStock[id]) this.shopStock[id] = shop.items.map(([i, q]) => ({ id: i, qty: q, base: q }));
    this.openWindow('shop', '', shop.name);
    document.body.classList.add('shopping');
    this.setTab('inventory');
    this.renderShop();
  }
  restockShops() {
    for (const st of Object.values(this.shopStock)) {
      for (let k = st.length - 1; k >= 0; k--) {
        const s = st[k];
        if (s.qty < s.base) s.qty++;
        else if (s.qty > s.base) { s.qty--; if (s.qty <= 0 && s.base === 0 && s.extra) st.splice(k, 1); }
      }
    }
    if (this.window === 'shop') this.renderShop();
  }
  buyPrice(id) { return Math.max(1, Math.round(ITEMS[id].value * 1.05)); }
  sellPrice(id) { const shop = SHOPS[this.shopId]; const sells = shop.items.some(([i]) => i === id); return Math.floor(ITEMS[id].value * (sells ? 0.55 : 0.4)); }
  renderShop() {
    const body = $('#window .wbody');
    if (!body) return;
    const st = this.shopStock[this.shopId];
    body.innerHTML = `<div class="shopgrid">${st.map((s, i) => `<div class="bslot ${s.qty ? '' : 'empty'}" data-i="${i}"><img src="${iconURL(s.id, 1)}"><span class="qty">${s.qty}</span></div>`).join('')}</div><div class="shophint">Right-click items to buy. Right-click your inventory to sell.</div>`;
    body.querySelectorAll('.bslot').forEach((el) => {
      const i = +el.dataset.i;
      el.oncontextmenu = (e) => e.preventDefault();
      el.onmousedown = (e) => {
        const s = st[i];
        const nm = `<span class="m-item">${ITEMS[s.id].name}</span>`;
        if (e.button === 2) this.openMenu(e.clientX, e.clientY, [{ text: `Value ${nm}`, fn: () => this.valueMsg(s.id) }, ...[1, 5, 10, 50].map((q) => ({ text: `Buy ${q} ${nm}`, fn: () => this.buy(i, q) })), { text: `Examine ${nm}`, fn: () => msg(ITEMS[s.id].examine) }, { text: 'Cancel', fn: () => {} }]);
        else this.valueMsg(s.id);
      };
      el.onmouseenter = () => { const s = st[i]; this.hoverText([{ text: `Value <span class="m-item">${ITEMS[s.id].name}</span>` }, {}, {}]); };
      el.onmouseleave = () => this.hoverText(null);
    });
  }
  valueMsg(id) { msg(`${ITEMS[id].name}: currently costs ${commas(this.buyPrice(id))} coins.`); }
  buy(i, q) {
    const p = G.player;
    const s = this.shopStock[this.shopId][i];
    let bought = 0;
    for (let k = 0; k < q; k++) {
      if (s.qty <= 0) { msg('The shop has run out of stock.'); break; }
      const price = this.buyPrice(s.id);
      if (!p.has('coins', price)) { msg("You don't have enough coins."); break; }
      if (!p.canAdd(s.id)) { msg("You don't have enough inventory space."); break; }
      p.remove('coins', price); p.add(s.id, 1); s.qty--; bought++;
    }
    if (bought) sfx('coins');
    this.renderShop();
  }
  sellValue(i) { const s = G.player.inv[i]; if (s) msg(`${ITEMS[s.id].name}: shop will buy for ${commas(this.sellPrice(s.id))} coins.`); }
  sellEntries(i) {
    const s = G.player.inv[i];
    const nm = `<span class="m-item">${ITEMS[s.id].name}</span>`;
    return [{ text: `Value ${nm}`, fn: () => this.sellValue(i) }, ...[1, 5, 10, 50].map((q) => ({ text: `Sell ${q} ${nm}`, fn: () => this.sell(s.id, q) })), { text: 'Cancel', fn: () => {} }];
  }
  sell(id, q) {
    const p = G.player;
    const shop = SHOPS[this.shopId];
    if (id === 'coins') return;
    if (ITEMS[id].quest) { msg("You can't sell this item."); return; }
    if (!shop.general && !shop.items.some(([x]) => x === id)) { msg("This shop won't buy that item."); return; }
    const st = this.shopStock[this.shopId];
    const n = p.remove(id, Math.min(q, p.count(id)));
    if (!n) return;
    const price = this.sellPrice(id);
    p.add('coins', price * n);
    let e = st.find((x) => x.id === id);
    if (!e) { e = { id, qty: 0, base: 0, extra: true }; st.push(e); }
    e.qty += n;
    sfx('coins');
    this.renderShop();
  }

  // ---------------------------------------------------------------- furnace / anvil
  openFurnace(tab = 'bars') {
    const p = G.player;
    let html = `<div class="ftabs"><button class="${tab === 'bars' ? 'on' : ''}" data-t="bars">Smelt bars</button><button class="${tab === 'jewellery' ? 'on' : ''}" data-t="jewellery">Jewellery</button></div><div class="makegrid">`;
    if (tab === 'bars') {
      for (const r of SMELTING) {
        const ok = p.lvl('smithing') >= r.lvl, has = Object.entries(r.ores).every(([o, n]) => p.count(o) >= n);
        html += `<div class="mk ${ok ? '' : 'lock'} ${has ? 'has' : ''}" data-id="${r.bar}" title="${Object.entries(r.ores).map(([o, n]) => n + ' x ' + ITEMS[o].name).join(', ')}"><img src="${iconURL(r.bar)}"><span>${ITEMS[r.bar].name}</span><small>Lvl ${r.lvl}</small></div>`;
      }
    } else {
      for (const j of JEWELLERY) {
        const ok = p.lvl('crafting') >= j.lvl, has = p.has('gold_bar') && (!j.gem || p.has(j.gem)) && p.has(j.mould);
        html += `<div class="mk ${ok ? '' : 'lock'} ${has ? 'has' : ''}" data-id="${j.out}" title="Gold bar${j.gem ? ' + ' + ITEMS[j.gem].name : ''} (${ITEMS[j.mould].name})"><img src="${iconURL(j.out)}"><span>${ITEMS[j.out].name}</span><small>Lvl ${j.lvl}</small></div>`;
      }
    }
    html += '</div><div class="mkhint">Click to make as many as you can.</div>';
    this.openWindow('make', html, 'What would you like to make?');
    document.querySelectorAll('.ftabs button').forEach((b) => (b.onclick = () => this.openFurnace(b.dataset.t)));
    document.querySelectorAll('.mk').forEach((el) => (el.onclick = () => { this.closeWindow(); tab === 'bars' ? smelt(el.dataset.id) : craftJewellery(el.dataset.id); }));
  }
  openAnvil(metal) {
    const p = G.player;
    if (!p.has('hammer')) { msg('You need a hammer to work the metal with.'); return; }
    const metals = Object.keys(METALS).filter((m) => m !== 'dragon' && p.has(m + '_bar'));
    if (!metals.length) { msg('You should select an item from your inventory and use it on the anvil.'); return; }
    metal = metal && metals.includes(metal) ? metal : metals[0];
    let html = `<div class="ftabs">${metals.map((m) => `<button class="${m === metal ? 'on' : ''}" data-m="${m}">${METALS[m].name}</button>`).join('')}</div><div class="makegrid">`;
    for (const s of SMITHABLES) {
      const id = `${metal}_${s.kind}`, it = ITEMS[id];
      const ok = p.lvl('smithing') >= it.smith.lvl, has = p.count(it.smith.bar) >= s.bars;
      html += `<div class="mk ${ok ? '' : 'lock'} ${has ? 'has' : ''}" data-id="${id}"><img src="${iconURL(id)}"><span>${it.name}</span><small>${s.bars} bar${s.bars > 1 ? 's' : ''} &middot; Lvl ${it.smith.lvl}</small></div>`;
    }
    html += '</div><div class="mkhint">Left-click: make 1 &middot; Right-click: more options</div>';
    this.openWindow('make', html, `What would you like to smith?`);
    document.querySelectorAll('.ftabs button').forEach((b) => (b.onclick = () => this.openAnvil(b.dataset.m)));
    document.querySelectorAll('.mk').forEach((el) => {
      el.oncontextmenu = (e) => e.preventDefault();
      el.onmousedown = (e) => {
        const id = el.dataset.id;
        if (e.button === 2) { this.openMenu(e.clientX, e.clientY, [1, 5, 10, 28].map((q) => ({ text: `Make ${q === 28 ? 'All' : q} <span class="m-item">${ITEMS[id].name}</span>`, fn: () => { this.closeWindow(); smith(id, q); } }))); return; }
        this.closeWindow(); smith(id, 1);
      };
    });
  }

  // ================================================================ dialogue
  dialogueOpen() { return !!this.dlg; }
  dialogue(npc, script, onEnd) {
    if (this.dlg) this.endDialogue(this.dlg);
    const token = { onEnd, done: false };
    this.dlg = token;
    const p = G.player;
    const show = (o) => new Promise((res) => { if (token.done) return; this.renderDlg(o, token, res); });
    const d = {
      npc: (text) => show({ who: npc, name: npc.name, text }),
      player: (text) => show({ who: p, name: p.name, text, right: true }),
      msg: (text) => show({ text }),
      item: (id, text) => show({ item: id, text }),
      options: (list) => new Promise((res) => { if (token.done) return; this.renderOptions(list, token, res); }),
      end: () => this.endDialogue(token),
    };
    (async () => {
      try { await script(d, npc); } catch (e) { console.error(e); }
      if (this.dlg === token) this.endDialogue(token);
    })();
  }
  endDialogue(token) {
    if (token.done) return;
    token.done = true;
    if (this.dlg === token) this.dlg = null;
    $('#dialogue').style.display = 'none';
    $('#chat-log').style.display = '';
    token.onEnd && token.onEnd();
  }
  renderDlg(o, token, res) {
    const el = $('#dialogue');
    $('#chat-log').style.display = 'none';
    el.style.display = 'flex';
    let head = '';
    if (o.who) {
      const set = o.who === G.player ? G.renderer.entitySprite(o.who) : buildSprite(o.who.def.look, 'npc_' + o.who.defId);
      head = `<div class="chathead ${o.right ? 'right' : ''}"><img src="${chatheadURL(set, o.who === G.player ? 'pl' + G.player.appearanceKey() : o.who.defId)}"></div>`;
    } else if (o.item) head = `<div class="chathead item"><img src="${iconURL(o.item)}"></div>`;
    el.className = o.right ? 'right' : '';
    el.innerHTML = `${head}<div class="dtext">${o.name ? `<div class="dname">${o.name}</div>` : ''}<div class="dbody">${o.text}</div><div class="dcont">Click here to continue</div></div>`;
    const next = () => { if (token.done) return; sfx('click'); this.dlgNext = null; res(); };
    el.querySelector('.dcont').onclick = next;
    this.dlgNext = next;
  }
  renderOptions(list, token, res) {
    const el = $('#dialogue');
    $('#chat-log').style.display = 'none';
    el.style.display = 'flex';
    el.className = 'opts';
    el.innerHTML = `<div class="dtext"><div class="dname">Select an Option</div>${list.map((o, i) => `<div class="dopt" data-i="${i}">${o}</div>`).join('')}</div>`;
    const choose = (i) => { if (token.done) return; sfx('click'); this.dlgChoose = null; this.dlgNext = null; res(i); };
    el.querySelectorAll('.dopt').forEach((d) => (d.onclick = () => choose(+d.dataset.i)));
    this.dlgChoose = (i) => { if (i < list.length) choose(i); };
    this.dlgNext = null;
  }
}

const headCache = new Map();
function chatheadURL(set, key) {
  if (headCache.has(key)) return headCache.get(key);
  const src = set.frames.down.idle[0];
  const c = document.createElement('canvas');
  const s = Math.min(src.width, 30);
  c.width = s; c.height = s * 0.75;
  const ctx = c.getContext('2d');
  // crop the top of the sprite (head & shoulders)
  const top = Math.max(0, src.height - (set.h - 2) - 2);
  ctx.drawImage(src, (src.width - s) / 2, findTop(src), s, s * 0.75, 0, 0, s, s * 0.75);
  const url = c.toDataURL();
  headCache.set(key, url);
  return url;
}
function findTop(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3]) return Math.max(0, y - 2);
  return 0;
}
export function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

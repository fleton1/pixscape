// Runs the data-driven quests in data/storylines.js alongside the hand-written ones in quests.js.
import { G, msg, sfx } from './state.js';
import { ITEMS } from '../data/items.js';
import { NPCS } from '../data/npcs.js';
import { SKILL_NAMES } from '../data/skills.js';
import { STORYLINES } from '../data/storylines.js';
import { QUESTS } from './quests.js';
import { commas } from '../util.js';

const strike = (t) => `<s>${t.replace(/<\/?b>/g, '')}</s>`;
const npcName = (id) => NPCS[id]?.name || id;

// Register each storyline in the quest list so the journal and quest tab show it (called at boot:
// quests.js and this module import each other).
export function registerStorylines() {
 for (const [id, q] of Object.entries(STORYLINES)) {
  QUESTS[id] = {
    name: q.name, qp: q.qp, diff: q.diff, chain: q.chain, story: true,
    start: `Speak to ${npcName(q.start.npc)} in ${q.start.where}.`,
    journal(s, p) {
      if (s === 0) {
        const lines = [`I can start this quest by speaking to <b>${npcName(q.start.npc)}</b> in <b>${q.start.where}</b>.`];
        const r = q.start.reqs || {};
        for (const qid of r.quests || []) lines.push(`${p.stage(qid) >= 100 ? '<s>' : ''}Complete <b>${QUESTS[qid].name}</b>.${p.stage(qid) >= 100 ? '</s>' : ''}`);
        for (const [sk, lv] of Object.entries(r.skills || {})) lines.push(`${p.lvl(sk) >= lv ? '<s>' : ''}Level ${lv} ${SKILL_NAMES[sk]}.${p.lvl(sk) >= lv ? '</s>' : ''}`);
        return lines;
      }
      if (s >= 100) return [...q.steps.map((st) => strike(st.hint)), '<b style="color:#ff0000">QUEST COMPLETE!</b>'];
      const lines = q.steps.slice(0, s - 1).map((st) => strike(st.hint));
      const cur = q.steps[s - 1];
      let hint = cur.hint;
      if (cur.do === 'kill' || cur.do === 'event') hint += ` (${Math.min(cur.n, (p.flags.qk || {})[id] || 0)}/${cur.n})`;
      lines.push(hint);
      return lines;
    },
    rewards: q.rewards.text,
  };
 }
}

function reqsMissing(q, p) {
  const r = q.start.reqs || {}, miss = [];
  for (const qid of r.quests || []) if (p.stage(qid) < 100) miss.push(`finish ${QUESTS[qid].name}`);
  for (const [sk, lv] of Object.entries(r.skills || {})) if (p.lvl(sk) < lv) miss.push(`reach level ${lv} ${SKILL_NAMES[sk]}`);
  return miss;
}

function advance(id) {
  const p = G.player, q = STORYLINES[id];
  const s = p.stage(id) + 1;
  if (p.flags.qk) delete p.flags.qk[id];
  if (s > q.steps.length) { finish(id); return; }
  p.setStage(id, s);
  sfx('quest');
  msg(`<span style="color:#0000aa">Quest updated: ${q.name}.</span> ${q.steps[s - 1].hint.replace(/<\/?b>/g, '')}`);
}

function finish(id) {
  const p = G.player, q = STORYLINES[id], r = q.rewards;
  p.setStage(id, 100);
  p.questPoints += q.qp;
  for (const [sk, xp] of Object.entries(r.xp || {})) p.addXp(sk, xp, true);
  for (const [it, n] of r.items || []) p.give(it, n);
  if (r.points) p.slayerPoints = (p.slayerPoints || 0) + r.points;
  sfx('quest');
  G.ui.questComplete(id);
  msg(`Congratulations! Quest complete: ${q.name}`, '#ef1020');
  G.minimap && G.minimap.refreshQuestIcons();
}

async function say(d, lines) { for (const [who, text] of lines || []) await (who === 'player' ? d.player(text) : d.npc(text)); }

// If talking to `n` means something for a quest, return the dialogue script for it.
export function questTalk(n) {
  const p = G.player;
  for (const [id, q] of Object.entries(STORYLINES)) {
    const s = p.stage(id);
    if (s <= 0 || s >= 100) continue;
    const st = q.steps[s - 1];
    if ((st.do === 'talk' || st.do === 'bring') && st.npc === n.defId) return (d) => stepScript(d, id, st);
  }
  for (const [id, q] of Object.entries(STORYLINES)) {
    if (p.stage(id) === 0 && q.start.npc === n.defId && !reqsMissing(q, p).length) return (d) => startScript(d, id);
  }
  return null;
}

async function startScript(d, id) {
  const p = G.player, q = STORYLINES[id];
  await say(d, q.start.say);
  const c = await d.options([`I'll help. (Start ${q.name})`, 'Not right now.']);
  if (c !== 0) return;
  p.setStage(id, 1);
  for (const [it, n] of q.start.give || []) p.give(it, n);
  sfx('quest');
  msg(`<span style="color:#0000aa">Quest started: ${q.name}.</span> ${q.steps[0].hint.replace(/<\/?b>/g, '')}`);
  G.minimap && G.minimap.refreshQuestIcons();
}

async function stepScript(d, id, st) {
  const p = G.player;
  if (st.do === 'bring') {
    const missing = Object.entries(st.items).filter(([it, n]) => p.count(it) < n);
    if (missing.length) { await d.npc(`I still need ${missing.map(([it, n]) => `${n > 1 ? n + ' x ' : ''}${ITEMS[it].name.toLowerCase()}`).join(', ')}.`); return; }
    for (const [it, n] of Object.entries(st.items)) p.remove(it, n);
    const first = Object.keys(st.items)[0];
    await d.item(first, `You hand over ${Object.entries(st.items).map(([it, n]) => `${n > 1 ? commas(n) + ' x ' : ''}${ITEMS[it].name.toLowerCase()}`).join(', ')}.`);
  }
  await say(d, st.say);
  d.end();
  advance(id);
}

// ------------------------------------------------------------------ events from the game
function eachActive(fn) {
  const p = G.player;
  for (const [id, q] of Object.entries(STORYLINES)) {
    const s = p.stage(id);
    if (s > 0 && s < 100) fn(id, q.steps[s - 1]);
  }
}
function count(id, st, amount = 1) {
  const p = G.player;
  p.flags.qk = p.flags.qk || {};
  p.flags.qk[id] = (p.flags.qk[id] || 0) + amount;
  if (p.flags.qk[id] >= st.n) advance(id);
  else msg(`${STORYLINES[id].name}: ${p.flags.qk[id]}/${st.n}.`, '#0000aa');
  G.ui.dirty('quests');
}
export function questKill(n) {
  eachActive((id, st) => { if (st.do === 'kill' && [].concat(st.npc).includes(n.defId)) count(id, st); });
}
export function storyDrops(n, drop) {
  eachActive((id, st) => {
    if (st.do === 'drop' && st.from === n.defId && !G.player.hasAnywhere(st.item) && Math.random() < (st.chance ?? 0.35)) { drop(st.item); advance(id); }
  });
}
export function questVisit(mapId, areaName) {
  eachActive((id, st) => { if (st.do === 'visit' && st.map === mapId && (!st.area || st.area === areaName)) advance(id); });
}
export function questEvent(event, key, amount = 1) {
  eachActive((id, st) => { if (st.do === 'event' && st.event === event && st.key === key) count(id, st, amount); });
}
// Who hands out quests the player hasn't started (for the minimap's quest markers).
export function storyStarters() { return Object.entries(STORYLINES).map(([id, q]) => [q.start.npc, id]); }

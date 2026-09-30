// Agility: crossing obstacles on courses and shortcuts.
import { G, msg, sfx } from './state.js';
import { OBJECTS } from '../data/objects.js';
import { COURSES, OBSTACLE_VERBS } from '../data/agility.js';
import { startAction } from './skilling.js';
import { damagePlayer } from './combat.js';
import { clamp, randInt } from '../util.js';

const COURSE = Object.fromEntries(COURSES.map((c) => [c.id, c]));

// Tiles from (x0, y0) to (x1, y1), one step at a time (excluding the start).
function line(x0, y0, x1, y1) {
  const out = [];
  let x = x0, y = y0;
  while (x !== x1 || y !== y1) {
    x += Math.sign(x1 - x); y += Math.sign(y1 - y);
    out.push([x, y]);
  }
  return out;
}

export function crossObstacle(o) {
  const p = G.player, a = o.agility, d = OBJECTS[o.type];
  if (!a) return;
  if (p.lvl('agility') < a.lvl) { msg(`You need an Agility level of ${a.lvl} to attempt this.`); return; }
  // shortcuts go both ways: head for whichever side is further away
  let dest = a.to;
  if (a.a) {
    const da = Math.abs(p.x - a.a[0]) + Math.abs(p.y - a.a[1]), db = Math.abs(p.x - a.b[0]) + Math.abs(p.y - a.b[1]);
    dest = da > db ? a.a : a.b;
  }
  const slips = OBSTACLE_VERBS[o.type]?.[1];
  const failChance = slips ? clamp(0.25 - (p.lvl('agility') - a.lvl) * 0.02, 0, 0.25) : 0;
  const steps = line(p.x, p.y, dest[0], dest[1]);
  const fail = Math.random() < failChance;
  const failAt = fail ? Math.max(1, Math.floor(steps.length / 2)) : -1;
  p.path = [];
  p.faceTile(o.x, o.y);
  msg(`You ${d.actions[0].toLowerCase().replace('-', ' ')} the ${d.name.toLowerCase()}...`);
  let i = 0;
  startAction(() => {
    if (i === failAt) {
      // slip: fall back to where you started
      const back = steps.length ? [p.x - Math.sign(dest[0] - p.x) * i, p.y - Math.sign(dest[1] - p.y) * i] : [p.x, p.y];
      p.teleport(back[0], back[1]);
      msg('You slip and fall!', '#ef1020');
      sfx('hurt');
      damagePlayer(randInt(1, 2 + Math.floor(a.lvl / 10)), null);
      p.flags.agi = null;
      return false;
    }
    if (i >= steps.length) { finish(o); return false; }
    const [x, y] = steps[i++];
    p.x = x; p.y = y;
    p.moved([[x, y]], performance.now());
    return 1;
  }, 1, false);
}

function finish(o) {
  const p = G.player, a = o.agility;
  p.addXp('agility', a.xp);
  sfx('pickup');
  if (!a.course) { msg('You make it across.'); return; }
  // laps: obstacles must be done in order
  const c = COURSE[a.course];
  const prog = p.flags.agi && p.flags.agi.course === a.course ? p.flags.agi : { course: a.course, next: 0 };
  prog.next = a.index === prog.next ? prog.next + 1 : a.index === 0 ? 1 : -1;
  p.flags.agi = prog;
  if (a.last && prog.next === a.count) {
    p.addXp('agility', c.lap);
    p.stats.laps = p.stats.laps || {};
    p.stats.laps[c.id] = (p.stats.laps[c.id] || 0) + 1;
    msg(`You complete a lap of the ${c.name}! Lap count: ${p.stats.laps[c.id]}.`, '#0000aa');
    p.flags.agi = null;
    if (c.lvl >= 15 && Math.random() < 0.35) {
      G.game.dropGround('mark_of_grace', 1, p.x, p.y, { life: 600, loot: true });
      msg('A Mark of Grace appears at your feet.', '#ef1020');
    }
  }
}

// Run energy recovers faster with Agility, and faster still in a full graceful set.
export function gracefulPieces(p) {
  return Object.values(p.equip).filter((e) => e && e.id.startsWith('graceful_')).length;
}

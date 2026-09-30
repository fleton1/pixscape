// Procedural character & creature sprites.
// Every sprite set is { frames: {facing: {anim: [canvas...]}}, w, h, ax, ay } where (ax, ay) is the
// pixel inside the frame that sits on the centre-bottom of the entity's tile footprint.
import { Painter, OUTLINE } from '../painter.js';
import { shade, mix, hash2 } from '../util.js';

const FACINGS = ['down', 'up', 'right', 'left'];

// ------------------------------------------------------------------ weapons
function weaponPixels(p, kind, color, hx, hy, ang, s, glow) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const px = -dy, py = dx; // perpendicular
  const hi = shade(color, 0.35), sh = shade(color, -0.3);
  const L = (n) => Math.round(n * s);
  const grip = '#5a3a1e', guard = '#8a6a2a';
  const pt = (t, o = 0) => [hx + dx * t + px * o, hy + dy * t + py * o];
  const dot = (t, o, c) => { const [x, y] = pt(t, o); p.set(Math.round(x), Math.round(y), c); };
  // grip behind the hand
  for (let t = -L(2); t <= 0; t++) dot(t, 0, grip);
  const blade = (len, width, curve = 0) => {
    for (let t = 1; t <= len; t++) {
      const cv = curve ? curve * Math.pow(t / len, 2) * len * 0.35 : 0;
      for (let o = 0; o < width; o++) dot(t, o - (width - 1) / 2 + cv, o === 0 ? hi : o === width - 1 && width > 1 ? sh : color);
    }
  };
  switch (kind) {
    case 'scimitar': for (let o = -1; o <= 1; o++) dot(1, o, guard); blade(L(8), s > 1.2 ? 2 : 1, -1); dot(L(8) + 1, -L(8) * 0.35, hi); break;
    case 'longsword': for (let o = -1; o <= 1; o++) dot(1, o, guard); blade(L(9), s > 1.2 ? 3 : 2); dot(L(9) + 1, 0, hi); break;
    case 'twohand': for (let o = -2; o <= 2; o++) dot(1, o, guard); blade(L(12), 2); dot(L(12) + 1, 0, hi); break;
    case 'shortbow': case 'longbow': {
      // held upright in front of the hand: a curved stave with its string
      const h = L(kind === 'longbow' ? 7 : 5);
      for (let o = -h; o <= h; o++) { const bow = 1 + Math.round((1 - (o / h) ** 2) * L(2)); dot(bow, o, Math.abs(o) === h ? sh : color); dot(0, o, '#e8e0c8'); }
      break;
    }
    case 'crossbow':
      for (let t = -L(1); t <= L(5); t++) dot(t, 0, '#6a4a2a');
      for (let o = -L(3); o <= L(3); o++) dot(L(4) - Math.round(Math.abs(o) / 2), o, Math.abs(o) === L(3) ? hi : color);
      break;
    case 'dart': dot(1, 0, color); dot(2, 0, hi); dot(0, 0, '#e8e8e8'); break;
    case 'dagger': dot(1, -1, guard); dot(1, 1, guard); blade(L(4), 1); dot(L(4) + 1, 0, hi); break;
    case 'sword': for (let o = -1; o <= 1; o++) dot(1, o, guard); blade(L(7), 2); dot(L(7) + 1, 0, hi); break;
    case 'lash': for (let t = 1; t <= L(9); t++) dot(t, Math.round(Math.sin(t * 0.8) * 1.5), t % 2 ? color : hi); break;
    case 'frostblade': for (let o = -1; o <= 1; o++) dot(1, o, '#2a4a6a'); blade(L(9), 2, -1); glow && glow.push(pt(L(6), 0)); break;
    case 'fang': for (let o = -1; o <= 1; o++) dot(1, o, '#3a1a10'); blade(L(9), 2, -1.3); glow && glow.push(pt(L(6), 0)); break;
    case 'cleaver': for (let t = 1; t <= L(3); t++) dot(t, 0, grip); for (let t = L(3); t <= L(8); t++) for (let o = 0; o <= L(3); o++) dot(t, o, o === L(3) ? hi : t === L(8) ? sh : color); break;
    case 'battleaxe': case 'axe': case 'pickaxe': case 'staff': case 'club': case 'maul': case 'mace': case 'warhammer': {
      const len = { battleaxe: 9, axe: 7, pickaxe: 7, staff: 12, club: 8, maul: 10, mace: 7, warhammer: 9 }[kind];
      for (let t = 1; t <= L(len); t++) dot(t, 0, kind === 'staff' ? '#6a4a2a' : kind === 'maul' ? '#c8c0a0' : grip);
      const e = L(len);
      if (kind === 'battleaxe') { for (let t = e - L(4); t <= e; t++) for (let o = 1; o <= L(3) + (t === e - L(2) ? 1 : 0); o++) dot(t, o, o === 1 ? sh : color); for (let o = 1; o <= L(2); o++) dot(e - L(2), -o, color); }
      if (kind === 'axe') { for (let t = e - L(2); t <= e; t++) for (let o = 1; o <= L(2); o++) dot(t, o, o === L(2) ? hi : color); }
      if (kind === 'pickaxe') { for (let o = -L(3); o <= L(3); o++) dot(e, o, Math.abs(o) === L(3) ? hi : color); dot(e - 1, -L(3), color); dot(e - 1, L(3), color); }
      if (kind === 'staff') { for (let o = -1; o <= 1; o++) for (let t = e; t <= e + 2; t++) dot(t, o, t === e + 1 && o === 0 ? '#e8e0ff' : '#8a3ad8'); glow && glow.push(pt(e + 1, 0)); }
      if (kind === 'mace') { for (let t = e - L(2); t <= e; t++) for (let o = -1; o <= 1; o++) dot(t, o, o === -1 ? hi : color); dot(e + 1, 0, hi); dot(e - 1, -2, color); dot(e - 1, 2, color); }
      if (kind === 'warhammer') { for (let t = e - L(2); t <= e; t++) for (let o = -L(3); o <= L(2); o++) dot(t, o, o === -L(3) ? hi : t === e ? sh : color); }
      if (kind === 'club') { for (let t = e - L(4); t <= e; t++) for (let o = -1; o <= 1; o++) dot(t, o, o === -1 ? hi : color); }
      if (kind === 'maul') { for (let t = e - L(3); t <= e + L(1); t++) for (let o = -L(3); o <= L(3); o++) dot(t, o, o === -L(3) ? '#f0ead0' : o === L(3) ? '#a09878' : color); }
      break;
    }
    default: blade(L(7), 1);
  }
}

function shieldPixels(p, kind, color, x, y, s, side) {
  const S = (n) => Math.round(n * s);
  const hi = shade(color, 0.3), sh = shade(color, -0.3);
  if (kind === 'woodshield') {
    p.ellipse(x, y, S(3.2), S(3.6), '#8a5a2b');
    p.ellipse(x, y, S(1.2), S(1.2), '#b0b0b0');
    return;
  }
  const w = S(6), h = S(8);
  const x0 = x - w / 2, y0 = y - h / 2;
  if (kind === 'sqshield') p.rect(Math.round(x0), Math.round(y0), w, h - 1, color);
  else p.poly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h * 0.55], [x0 + w / 2, y0 + h], [x0, y0 + h * 0.55]], color);
  // rim + emblem
  for (let i = 0; i < w; i++) p.set(Math.round(x0 + i), Math.round(y0), hi);
  if (kind === 'antidragon') { p.set(x, y - 1, '#3a8a3a'); p.set(x - 1, y, '#3a8a3a'); p.set(x, y, '#3a8a3a'); p.set(x + 1, y - 1, '#e8c13a'); }
  else if (kind === 'dfs') { p.ellipse(x, y, S(1.6), S(2), '#e8702a'); p.set(x, y, '#ffe08a'); }
  else if (side !== 'back') { p.set(x, y - S(1), sh); p.set(x, y, sh); p.set(x - 1, y, sh); p.set(x + 1, y, sh); p.set(x, y + 1, sh); }
}

// ------------------------------------------------------------------ humans
function human(look, facing, anim, frame) {
  const s = look.big ? (look.huge ? 2.1 : 1.55) : look.short ? 0.82 : look.tiny ? 0.62 : 1;
  const W = Math.ceil(30 * s) + 6, Hh = Math.ceil(30 * s) + 4;
  const p = new Painter(W, Hh);
  const cx = Math.floor(W / 2), fy = Hh - 2;
  const glow = [];
  // unit-space rect with shared-edge rounding
  const X = (u) => cx + Math.round(u * s), Y = (u) => fy + Math.round(u * s);
  const R = (ux, uy, uw, uh, c, a) => {
    const x0 = X(ux), x1 = X(ux + uw), y0 = Y(uy), y1 = Y(uy + uh);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) p.set(x, y, c, a);
  };
  const skin = look.skin, skinSh = shade(skin, -0.18);
  const walk = anim === 'walk', atk = anim === 'attack';
  const bob = (walk && (frame === 1 || frame === 3)) ? -1 : anim === 'idle' && frame === 1 ? 0.6 : 0;
  const B = (u) => u + bob;
  const liftL = walk && frame === 0 ? 1 : 0, liftR = walk && frame === 2 ? 1 : 0;
  const body = look.body, legs = look.legs;
  const shirt = body && body.kind !== 'apron' ? body.color : look.shirt;
  const metalBody = body && (body.kind === 'platebody' || body.kind === 'chainbody');
  const pants = legs ? legs.color : look.pants;
  const robe = body && body.kind === 'robe';
  const skel = look.skeleton, mummy = look.mummy;
  const side = facing === 'right' || facing === 'left';
  const back = facing === 'up';

  // ---- wings / tail (behind everything)
  if (look.wings) {
    const flap = (frame % 2) ? 1 : 0;
    const wc = shade(skin, -0.35);
    for (const dir of [-1, 1]) {
      if (side && dir === 1) continue;
      const bx = side ? -2 : dir * 3;
      p.poly([[X(bx), Y(B(-15))], [X(bx + dir * 11), Y(B(-22 - flap))], [X(bx + dir * 12), Y(B(-12 + flap))], [X(bx + dir * 7), Y(B(-11))], [X(bx + dir * 4), Y(B(-9))]], wc);
      p.line(X(bx), Y(B(-15)), X(bx + dir * 11), Y(B(-22 - flap)), shade(wc, -0.3));
    }
  }
  if (look.tail) {
    p.line(X(side ? -2 : 1), Y(-7), X(side ? -8 : 6), Y(-3), shade(skin, -0.2));
    p.set(X(side ? -9 : 7), Y(-4), shade(skin, -0.3));
  }
  // ---- cape behind body
  const cape = look.cape;
  if (cape && !back) {
    if (side) R(-4, B(-15), 2, 11, shade(cape.color, -0.15));
    else R(-5, B(-15), 10, 10, shade(cape.color, -0.2));
  }
  // ---- shield behind (side view back arm / back view)
  const sh = look.shield;
  if (sh && side) shieldPixels(p, sh.kind, sh.color, X(-3), Y(B(-11)), s, 'side');

  // ---- legs
  if (robe) {
    R(-4, B(-9), 8, 7, body.color);
    R(-5, B(-4), 10, 2, body.color);
    R(-4, B(-9), 1, 7, shade(body.color, 0.15));
    R(3, B(-9), 1, 7, shade(body.color, -0.25));
    R(-3, -2, 2, 2, look.shoes); R(1, -2, 2, 2, look.shoes);
  } else if (look.female && !legs) {
    R(-4, B(-9), 8, 4, pants); R(-5, B(-5), 10, 3, pants);
    R(3, B(-9), 1, 4, shade(pants, -0.25));
    R(-3, -2, 2, 2, look.shoes); R(1, -2, 2, 2, look.shoes);
  } else if (side) {
    const st = walk ? [1, 0, -1, 0][frame] : 0;
    const legC = legs && legs.kind === 'platelegs' ? legs.color : pants;
    const legW = skel ? 1 : 3;
    R(-1 - st - (legW === 1 ? -1 : 0), B(-8), legW, 6 + (st ? 0 : 0) - bob, shade(legC, -0.25));
    R(-1 - st - 1, -2, 3, 2, shade(look.shoes, -0.2));
    R(-1 + st - (legW === 1 ? -1 : 0), B(-8), legW, 6 - bob, legC);
    R(-1 + st, -2, 3, 2, look.shoes);
  } else {
    const legC = legs && legs.kind === 'platelegs' ? legs.color : pants;
    if (skel) {
      R(-2, B(-8), 1, 6 - liftL - bob, legC); R(1, B(-8), 1, 6 - liftR - bob, legC);
    } else {
      R(-3, B(-8), 3, 6 - liftL - bob, legC);
      R(0, B(-8), 3, 6 - liftR - bob, legC);
      R(-1, B(-8), 1, 6 - liftL - bob, shade(legC, -0.22));
      R(2, B(-8), 1, 6 - liftR - bob, shade(legC, -0.22));
      if (legs && legs.kind === 'platelegs') { R(-3, B(-5), 3, 1, shade(legC, 0.3)); R(0, B(-5), 3, 1, shade(legC, 0.3)); }
    }
    R(-3, -2 - liftL, 3, 2, look.shoes);
    R(0, -2 - liftR, 3, 2, look.shoes);
    R(-3, -2 - liftL, 1, 1, shade(look.shoes, 0.25));
  }

  // ---- torso
  const tW = side ? 6 : 8, tX = side ? -3 : -4;
  const hunch = look.hunch ? 1 : 0;
  if (skel) {
    R(-1, B(-15), 2, 7, skin);
    for (let r = 0; r < 3; r++) R(tX + 1, B(-14 + r * 2), tW - 2, 1, skin);
  } else {
    R(tX, B(-15 + hunch), tW, 7 - hunch, shirt);
    R(tX, B(-15 + hunch), 1, 7 - hunch, shade(shirt, 0.18));
    R(tX + tW - 1, B(-15 + hunch), 1, 7 - hunch, shade(shirt, -0.25));
    if (metalBody) {
      R(tX + 1, B(-14), tW - 2, 1, shade(shirt, 0.35));
      if (body.kind === 'chainbody') for (let yy = -13; yy < -9; yy++) for (let xx = tX + 1; xx < tX + tW - 1; xx++) if ((xx + yy) % 2 === 0) R(xx, B(yy), 1, 1, shade(shirt, -0.15));
      if (body.kind === 'platebody') { R(tX + 1, B(-12), tW - 2, 1, shade(shirt, -0.2)); if (!side && !back) R(-1, B(-13), 2, 3, shade(shirt, 0.15)); }
      if (body.trim) { R(tX, B(-15), tW, 1, body.trim); R(-1, B(-14), 2, 4, body.trim); }
    }
    if (body && body.kind === 'apron' && !back) R(tX + 1, B(-13), tW - 2, 6, body.color);
    if (!robe) R(tX, B(-9), tW, 1, metalBody ? shade(shirt, -0.35) : '#3a2a18');
    if (look.torn) { R(tX + 1, B(-10), 1, 1, skin); R(tX + tW - 3, B(-12), 1, 1, skin); }
    if (mummy) for (let yy = -15; yy < -8; yy += 2) R(tX, B(yy), tW, 1, shade(shirt, -0.12));
    if (look.moss) { R(tX + 1, B(-15), 3, 2, '#3a6a2a'); R(tX + 4, B(-11), 2, 1, '#3a6a2a'); }
  }
  // neck item
  if (look.neck && !back) R(-1, B(-14), 2, 1, look.neck);
  if (cape && cape.trim && !back && !side) { R(-5, B(-15), 1, 1, cape.trim); R(4, B(-15), 1, 1, cape.trim); }

  // ---- arms
  const armC = metalBody ? shirt : robe ? body.color : (look.sleeveless ? skin : shirt);
  const handC = look.gloves || skin;
  let handFront = null; // [x, y] in pixel space for weapon
  if (side) {
    const swing = walk ? [1, 0, -1, 0][frame] : 0;
    if (atk && frame === 0) {
      R(-1, B(-19), 2, 5, armC); R(-1, B(-21), 2, 2, handC); handFront = [X(0), Y(B(-20))];
    } else if (atk) {
      R(0, B(-14), 5, 2, armC); R(5, B(-14), 2, 2, handC); handFront = [X(6), Y(B(-13))];
    } else {
      R(-1 + swing, B(-15), 2, 5, shade(armC, -0.05)); R(-1 + swing, B(-10), 2, 2, handC); handFront = [X(swing), Y(B(-9))];
    }
  } else {
    const swing = walk ? [1, 0, -1, 0][frame] : 0;
    const armL = skel ? 1 : 2;
    R(-6 + (skel ? 1 : 0), B(-15), armL, 5 - swing, armC); R(-6, B(-10 - swing), 2, 2, handC);
    if (atk && !back) {
      if (frame === 0) { R(4, B(-20), 2, 5, armC); R(4, B(-22), 2, 2, handC); handFront = [X(5), Y(B(-21))]; }
      else { R(4, B(-15), 2, 4, armC); R(5, B(-11), 2, 2, handC); handFront = [X(6), Y(B(-10))]; }
    } else {
      R(4, B(-15), armL, 5 + swing, armC); R(4, B(-10 + swing), 2, 2, handC); handFront = [X(5), Y(B(-9 + swing))];
    }
    if (metalBody) { R(-6, B(-15), 2, 1, shade(shirt, 0.3)); R(4, B(-15), 2, 1, shade(shirt, 0.3)); }
  }

  // ---- head
  const hx = side ? -3 : -3, hy = B(-21 + hunch);
  R(hx, hy, 6, 6, skin);
  R(hx + 5, hy, 1, 6, skinSh);
  R(hx, hy + 5, 6, 1, skinSh);
  // round the corners
  p.clear(X(hx), Y(hy)); p.clear(X(hx + 6) - 1, Y(hy));
  if (!back) {
    const eye = skel || mummy ? '#1a1010' : '#1e1a18';
    if (side) {
      R(hx + 4, hy + 3, 1, 1, eye); R(hx + 6, hy + 3, 1, 1, skin);
      if (mummy || look.glowEyes) R(hx + 4, hy + 3, 1, 1, '#ff4020');
    } else {
      R(hx + 1, hy + 3, 1, 1, eye); R(hx + 4, hy + 3, 1, 1, eye);
      if (skel) { R(hx + 1, hy + 2, 2, 2, '#1a1010'); R(hx + 3, hy + 2, 2, 2, '#1a1010'); R(hx + 2, hy + 5, 2, 1, '#1a1010'); }
      if (look.glowEyes || mummy) { R(hx + 1, hy + 3, 1, 1, '#ff4020'); R(hx + 4, hy + 3, 1, 1, '#ff4020'); }
    }
  }
  if (mummy) { R(hx, hy + 1, 6, 1, shade(skin, -0.12)); R(hx, hy + 4, 6, 1, shade(skin, -0.12)); }
  if (look.ears) {
    const ec = skin;
    if (!side || true) { R(hx - 1, hy + 2, 1, 2, ec); R(hx + 6, hy + 2, 1, 2, ec); R(hx - 2, hy + 1, 1, 1, ec); R(hx + 7, hy + 1, 1, 1, ec); }
  }
  if (look.horns) { const hc = '#e8dcc0'; R(hx, hy - 1, 1, 1, hc); R(hx - 1, hy - 2, 1, 1, hc); R(hx + 5, hy - 1, 1, 1, hc); R(hx + 6, hy - 2, 1, 1, hc); }
  // hair
  const hair = look.hair, hs = look.hairStyle;
  if (hs !== 'bald' && !skel && !mummy) {
    R(hx, hy - 1, 6, 2, hair); R(hx + 1, hy - 1, 4, 1, shade(hair, 0.2));
    if (back) R(hx, hy, 6, 5, hair);
    else if (side) R(hx, hy, 3, 4, hair);
    else { R(hx, hy + 1, 1, 2, hair); R(hx + 5, hy + 1, 1, 2, hair); }
    if (hs === 'long') { if (!side) { R(hx - 1, hy, 1, 7, hair); R(hx + 6, hy, 1, 7, hair); } else R(hx - 1, hy, 2, 7, hair); if (back) R(hx, hy + 5, 6, 2, hair); }
    if (hs === 'spiky') { for (let i = 0; i < 6; i += 2) R(hx + i, hy - 2, 1, 1, hair); }
  }
  if (look.beard && !back) {
    if (side) { R(hx + 3, hy + 4, 3, 2, look.beard); R(hx + 3, hy + 6, 2, 1, look.beard); }
    else { R(hx, hy + 4, 6, 2, look.beard); R(hx + 1, hy + 6, 4, 1, look.beard); R(hx + 2, hy + 4, 2, 1, shade(skin, -0.3)); }
  }

  // ---- headgear
  const hat = look.helm || look.hat;
  if (hat) {
    const c = hat.color || '#888', hi = shade(c, 0.3), dk = shade(c, -0.3);
    switch (hat.kind) {
      case 'fullhelm':
        R(hx - 1, hy - 1, 8, 7, c); R(hx, hy - 1, 5, 1, hi);
        if (!back) { if (side) R(hx + 3, hy + 3, 4, 1, '#1a1a1a'); else R(hx + 1, hy + 3, 4, 1, '#1a1a1a'); }
        R(hx + 6, hy, 1, 6, dk);
        if (hat.trim) { R(hx - 1, hy + 5, 8, 1, hat.trim); R(hx + 2, hy - 1, 2, 1, hat.trim); }
        break;
      case 'medhelm':
        R(hx - 1, hy - 1, 8, 4, c); R(hx, hy - 1, 5, 1, hi); R(hx + 6, hy, 1, 3, dk);
        if (!back && !side) R(hx + 2, hy + 3, 2, 2, c);
        if (hat.color === '#5a6a2a') { R(hx - 2, hy, 1, 2, '#e0d8b0'); R(hx + 7, hy, 1, 2, '#e0d8b0'); }
        break;
      case 'coif': R(hx - 1, hy - 1, 8, 3, c); R(hx - 1, hy + 2, 1, 5, c); R(hx + 6, hy + 2, 1, 5, c); if (back || side) R(hx, hy, 6, 6, c); break;
      case 'chefhat': R(hx, hy - 5, 6, 5, c); R(hx - 1, hy - 5, 8, 2, c); R(hx, hy - 1, 6, 1, '#d8d8d8'); break;
      case 'wizhat': R(hx - 2, hy, 10, 1, c); R(hx, hy - 3, 6, 3, c); R(hx + 1, hy - 5, 4, 2, c); R(hx + 2, hy - 7, 2, 2, c); R(hx + 3, hy - 8, 1, 1, c); R(hx + 1, hy - 3, 1, 3, hi); if (c !== '#2a2230') R(hx + 2, hy - 2, 1, 1, '#e8c13a'); break;
      case 'strawhat': R(hx - 3, hy, 12, 1, c); R(hx, hy - 2, 6, 2, c); R(hx, hy - 1, 6, 1, dk); break;
      case 'tricorn': R(hx - 2, hy - 1, 10, 2, c); R(hx, hy - 3, 6, 2, c); R(hx - 2, hy - 2, 1, 1, c); R(hx + 7, hy - 2, 1, 1, c); break;
      case 'crown': R(hx, hy - 2, 6, 2, c); R(hx, hy - 3, 1, 1, c); R(hx + 2, hy - 3, 2, 1, c); R(hx + 5, hy - 3, 1, 1, c); R(hx + 2, hy - 2, 2, 1, '#d82a2a'); break;
      case 'beret': R(hx - 1, hy - 2, 7, 2, c); R(hx + 4, hy - 3, 3, 1, c); R(hx, hy - 2, 4, 1, hi); break;
      case 'partyhat': R(hx, hy - 1, 6, 1, c); R(hx + 1, hy - 3, 4, 2, c); R(hx + 2, hy - 5, 2, 2, c); R(hx + 1, hy - 1, 1, 1, hi); R(hx + 3, hy - 3, 1, 1, hi); break;
      case 'turban': R(hx - 1, hy - 2, 8, 3, c); R(hx, hy - 3, 6, 1, c); R(hx, hy - 1, 6, 1, dk); break;
      case 'hood': R(hx - 1, hy - 1, 8, 3, c); R(hx - 1, hy + 2, 1, 4, c); R(hx + 6, hy + 2, 1, 4, c); if (back) R(hx, hy, 6, 6, c); break;
    }
  }
  if (cape && back) {
    R(-5, B(-15), 10, 12, cape.color);
    R(-5, B(-15), 1, 12, shade(cape.color, 0.2));
    R(4, B(-15), 1, 12, shade(cape.color, -0.25));
    if (cape.trim) R(-5, B(-4), 10, 1, cape.trim);
  }

  // ---- weapon & shield (front)
  const wpn = look.weapon;
  if (wpn && handFront) {
    let ang = -Math.PI / 2 - 0.25;
    if (side) ang = atk ? (frame === 0 ? -Math.PI * 0.85 : -0.15) : -Math.PI / 2 + 0.35;
    else if (atk) ang = frame === 0 ? -Math.PI * 0.72 : -0.35;
    if (back) ang = -Math.PI / 2 + 0.25;
    const [wx, wy] = back ? [X(-5), Y(B(-9))] : handFront;
    weaponPixels(p, wpn.kind, wpn.color, wx, wy, ang, Math.max(0.8, s), glow);
  }
  if (sh && !side) shieldPixels(p, sh.kind, sh.color, back ? X(5) : X(-6), Y(B(-11)), s, back ? 'back' : 'front');

  p.outline(OUTLINE);
  if (look.ghost) p.remap((h) => null);
  return { p, glow };
}

// ------------------------------------------------------------------ creatures (drawn facing right)
function creature(look, anim, frame) {
  const k = look.kind;
  const walk = anim === 'walk', atk = anim === 'attack';
  const f2 = frame % 2;
  let p;
  const col = look.color || '#888';
  const hi = shade(col, 0.25), sh = shade(col, -0.25), dk = shade(col, -0.45);
  switch (k) {
    case 'chicken': {
      p = new Painter(16, 16);
      const hb = walk && f2 ? 1 : 0, peck = atk && frame === 1 ? 2 : 0;
      p.ball(7, 9, 4.5, 3.8, '#f4f2ec');
      p.poly([[2, 6], [4, 8], [2, 10]], '#dcd8cc');
      p.ball(11 + peck * 0.5, 5 + hb + peck, 2.2, 2.2, '#f8f6f0');
      p.set(11 + peck, 2 + hb + peck, '#d82a2a'); p.set(12 + peck, 3 + hb + peck, '#d82a2a');
      p.set(13 + peck, 5 + hb + peck, '#e8a020'); p.set(14 + peck, 5 + hb + peck, '#e8a020');
      p.set(12 + peck, 5 + hb + peck, '#1a1a1a');
      p.set(12 + peck, 7 + hb + peck, '#d82a2a');
      p.vline(6 + (walk && f2 ? 1 : 0), 13, 14, '#e8a020'); p.vline(8 - (walk && f2 ? 1 : 0), 13, 14, '#e8a020');
      p.set(6, 9, '#c8c4b8'); p.set(7, 10, '#c8c4b8');
      break;
    }
    case 'cow': {
      p = new Painter(30, 22);
      const lg = walk ? [1, -1][f2] : 0;
      const legs = [[7, lg], [10, -lg], [18, -lg], [21, lg]];
      for (const [x, o] of legs) p.rect(x + o, 15, 2, 5, shade(col, -0.15)), p.rect(x + o, 19, 2, 1, '#2a2a2a');
      p.ball(14, 11, 9.5, 5.5, col);
      for (let i = 0; i < 5; i++) { const sx = 7 + ((hash2(i, 3, col.length) * 14) | 0), sy = 8 + ((hash2(i, 9) * 6) | 0); p.ellipse(sx, sy, 2.2, 1.6, look.spot); }
      p.rect(3, 9, 1, 6, sh); p.set(3, 15, '#2a2a2a');
      const hd = atk && frame === 1 ? 1 : 0;
      p.ball(25 + hd, 9 + hd, 3.4, 3.2, col);
      p.ellipse(27 + hd, 11 + hd, 2, 1.5, '#e8a0a0');
      p.set(26 + hd, 8 + hd, '#1a1a1a');
      p.set(23 + hd, 5 + hd, '#e8e0c8'); p.set(26 + hd, 5 + hd, '#e8e0c8');
      p.ellipse(15, 16, 2, 1, '#e8a0a8');
      break;
    }
    case 'rat': {
      const b = look.huge ? 2.2 : look.big ? 1.4 : 1;
      p = new Painter(Math.round(22 * b), Math.round(12 * b));
      const S = (n) => n * b;
      p.line(S(4), S(8), S(0), S(6), '#d89a9a'); p.set(S(0), S(5), '#d89a9a');
      p.ball(S(9), S(7.5), S(5), S(3), col);
      p.poly([[S(13), S(5)], [S(18), S(7.5)], [S(13), S(10)]], col);
      p.set(S(18), S(7.5), '#e89a9a'); p.set(S(15), S(6.5), '#1a1a1a');
      p.set(S(13), S(4), shade(col, 0.2)); p.set(S(14), S(4), '#d89a9a');
      const lg = walk && f2 ? 1 : 0;
      p.set(S(7) + lg, S(10.5), dk); p.set(S(12) - lg, S(10.5), dk);
      break;
    }
    case 'spider': {
      const b = look.big ? 1.5 : 1;
      const w = Math.round(18 * b), h = Math.round(14 * b);
      p = new Painter(w, h);
      const S = (n) => Math.round(n * b);
      for (let i = 0; i < 4; i++) {
        const o = walk ? ((i + frame) % 2) : 0;
        const lx = S(6 + i * 2.2);
        p.line(lx, S(7), lx - S(3) + o, S(3), dk); p.line(lx - S(3) + o, S(3), lx - S(4) + o, S(12), dk);
        p.line(lx, S(8), lx + S(2) - o, S(4), dk); p.line(lx + S(2) - o, S(4), lx + S(3) - o, S(12), dk);
      }
      p.ball(S(6), S(8), S(4.5), S(3.8), col);
      p.ball(S(11.5), S(8), S(2.8), S(2.5), shade(col, 0.1));
      if (look.spots) { p.set(S(5), S(7), look.spots); p.set(S(7), S(9), look.spots); }
      p.set(S(13), S(7), '#e03030'); p.set(S(13), S(9), '#e03030');
      if (atk && frame === 1) p.set(S(15), S(9), '#f0f0f0');
      break;
    }
    case 'wolf': case 'bear': {
      const bear = k === 'bear';
      if (look.big && !look._scaled) {
        // big variants reuse the normal shape at 1.5x
        const small = creature({ ...look, _scaled: true }, anim, frame).p;
        p = new Painter(Math.round(small.w * 1.5), Math.round(small.h * 1.5));
        for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
          const sx = Math.floor(x / 1.5), sy = Math.floor(y / 1.5), i = (sy * small.w + sx) * 4;
          if (small.d[i + 3]) p.set(x, y, '#' + [0, 1, 2].map((c) => small.d[i + c].toString(16).padStart(2, '0')).join(''));
        }
        if (look.color === '#1a1a24') { p.set(Math.round(p.w * 0.83), Math.round(p.h * 0.28), '#b060ff'); }
        break;
      }
      p = new Painter(bear ? 30 : 28, bear ? 22 : 18);
      const lg = walk ? [1, -1][f2] : 0;
      const by = bear ? 11 : 9;
      const legs = bear ? [[6, lg], [10, -lg], [18, -lg], [22, lg]] : [[6, lg], [9, -lg], [17, -lg], [20, lg]];
      for (const [x, o] of legs) p.rect(x + o, by + 4, 2, bear ? 5 : 5, sh);
      if (!bear) { p.poly([[4, by - 1], [0, by - 3 + f2], [1, by + 1], [4, by + 2]], sh); }
      p.ball(bear ? 14 : 13, by + 1, bear ? 10 : 9, bear ? 6 : 4.5, col);
      p.ellipse(bear ? 13 : 12, by + 4, bear ? 7 : 6, 1.5, shade(col, 0.15));
      const ha = atk && frame === 1 ? 1 : 0;
      const hx = bear ? 24 : 22, hy = bear ? by - 3 : by - 3;
      p.ball(hx + ha, hy, bear ? 4.5 : 3.5, bear ? 4 : 3, col);
      if (!bear) { p.poly([[hx + 2 + ha, hy - 1], [hx + 7 + ha, hy + 1], [hx + 2 + ha, hy + 2]], col); p.set(hx + 6 + ha, hy + 1, '#1a1a1a'); p.set(hx - 1, hy - 4, col); p.set(hx + 1, hy - 4, col); p.set(hx, hy - 5, col); }
      else { p.ellipse(hx + 3 + ha, hy + 1, 2, 1.5, shade(col, 0.25)); p.set(hx + 5 + ha, hy + 1, '#1a1a1a'); p.set(hx - 2, hy - 4, col); p.set(hx + 2, hy - 4, col); }
      p.set(hx + 1 + ha, hy - 1, look.color === '#c8d8e8' ? '#3aa0e8' : '#e8c020');
      if (atk && frame === 1) p.set(hx + 5 + ha, hy + 2, '#f0f0f0');
      break;
    }
    case 'monkey': {
      p = new Painter(16, 16);
      p.line(3, 10, 1, 4, sh); p.set(2, 3, sh);
      p.ball(7, 10, 3.5, 3.5, col);
      p.ball(9, 5, 3, 2.8, col);
      p.ellipse(10, 6, 1.6, 1.3, '#e0b890');
      p.set(10, 5, '#1a1a1a'); p.set(6, 4, col);
      const lg = walk && f2 ? 1 : 0;
      p.rect(5 + lg, 13, 1, 2, sh); p.rect(9 - lg, 13, 1, 2, sh);
      break;
    }
    case 'scorpion': {
      const b = look.big ? 1.35 : 1;
      p = new Painter(Math.round(24 * b), Math.round(18 * b));
      const S = (n) => Math.round(n * b);
      const lg = walk && f2 ? 1 : 0;
      for (let i = 0; i < 3; i++) { p.line(S(8 + i * 3), S(12), S(7 + i * 3) - lg, S(15), dk); }
      // tail arching
      const tail = [[5, 11], [3, 8], [3, 5], [5, 3], [8, 2]];
      const ta = atk && frame === 1 ? 2 : 0;
      tail.forEach(([x, y], i) => p.ball(S(x + (i > 2 ? ta : 0)), S(y), S(1.8), S(1.6), i % 2 ? sh : col));
      p.set(S(10 + ta), S(3), '#e8e0c0'); p.set(S(10 + ta), S(4), '#e8e0c0');
      p.ball(S(11), S(11), S(5.5), S(2.8), col);
      p.line(S(15), S(10), S(19 + (atk ? 1 : 0)), S(8), col); p.line(S(15), S(12), S(19 + (atk ? 1 : 0)), S(13), col);
      p.ball(S(20), S(8), S(1.6), S(1.3), sh); p.ball(S(20), S(13), S(1.6), S(1.3), sh);
      p.set(S(15), S(10), '#1a1a1a');
      break;
    }
    case 'ghost': {
      p = new Painter(18, 24);
      const fb = f2;
      const gc = look.color || '#dce8f0';
      p.poly([[4, 8 - fb], [9, 2 - fb], [14, 8 - fb], [15, 20 - fb], [13, 18 - fb], [11, 21 - fb], [9, 18 - fb], [7, 21 - fb], [5, 18 - fb], [3, 20 - fb]], gc, 170);
      p.ellipse(9, 7 - fb, 4.5, 4.5, shade(gc, 0.08), 190);
      if (look.hair) p.poly([[4, 6 - fb], [9, 1 - fb], [14, 6 - fb], [15, 15 - fb], [13, 9 - fb], [5, 9 - fb], [3, 15 - fb]], look.hair, 200);
      const eyeC = look.eyes || '#1a2030';
      p.rect(7, 6 - fb, 1, 2, eyeC); p.rect(10, 6 - fb, 1, 2, eyeC);
      p.rect(8, 10 - fb, 2, 1, '#1a2030', 160);
      return { p, noOutline: true };
    }
    case 'swarm': {
      p = new Painter(20, 14);
      for (let i = 0; i < 9; i++) {
        const x = 3 + ((hash2(i, frame, 7) * 14) | 0), y = 3 + ((hash2(i, frame, 8) * 8) | 0);
        p.ellipse(x, y, 1.5, 1.2, i % 3 ? '#1e3a4a' : '#2a6a7a');
        p.set(x, y - 1, '#6ac8d8');
      }
      return { p, noOutline: true };
    }
    case 'scarab': {
      const pet = look.pet;
      const b = pet ? 0.4 : 1;
      p = new Painter(Math.round(46 * b) + 2, Math.round(36 * b) + 2);
      const S = (n) => Math.round(n * b) + 1;
      const lg = walk ? f2 : 0;
      for (let i = 0; i < 3; i++) {
        const lx = S(14 + i * 7);
        p.line(lx, S(22), lx - S(3) + lg, S(33), '#10242c'); p.line(lx, S(12), lx - S(3) - lg, S(2), '#10242c');
      }
      p.ball(S(22), S(17), S(15), S(11), col);
      p.line(S(10), S(17), S(34), S(17), shade(col, -0.4));
      p.ellipse(S(18), S(12), S(4), S(2), shade(col, 0.4));
      p.ball(S(38), S(17), S(6), S(6), shade(col, -0.15));
      const m = atk && frame === 1 ? 2 : 0;
      p.line(S(42), S(13), S(46) + m, S(11), '#e8c13a'); p.line(S(42), S(21), S(46) + m, S(23), '#e8c13a');
      if (!pet) { p.rect(S(34), S(9), S(8), S(3), '#e8c13a'); p.set(S(35), S(8), '#e8c13a'); p.set(S(38), S(7), '#e8c13a'); p.set(S(41), S(8), '#e8c13a'); p.set(S(38), S(10), '#d82a2a'); }
      p.set(S(41), S(15), '#6af0ff'); p.set(S(41), S(19), '#6af0ff');
      break;
    }
    case 'dragon': {
      const boss = look.boss, baby = look.baby;
      const b = boss ? 1.45 : baby ? (look.pet ? 0.55 : 0.62) : 1;
      p = new Painter(Math.round(44 * b) + 2, Math.round(36 * b) + 2);
      const S = (n) => n * b + 1;
      const belly = mix(col, '#e8c878', 0.45);
      const flap = f2 ? 3 : 0;
      const lg = walk ? [1, -1][f2] : 0;
      // far wing
      p.poly([[S(18), S(14)], [S(12), S(1 + flap)], [S(24), S(6 + flap)], [S(26), S(13)]], shade(col, -0.35));
      // tail
      p.poly([[S(10), S(19)], [S(2), S(15)], [S(0), S(12)], [S(3), S(17)], [S(10), S(23)]], col);
      p.poly([[S(0), S(12)], [S(-1), S(9)], [S(3), S(11)]], shade(col, -0.2));
      // legs
      for (const [x, o] of [[13, lg], [17, -lg], [26, -lg], [30, lg]]) { p.rect(S(x + o), S(24), Math.ceil(3 * b), Math.ceil(6 * b), shade(col, -0.2)); p.rect(S(x + o) - 1, S(29), Math.ceil(4 * b), Math.ceil(1 * b), '#e8e0c8'); }
      p.ball(S(21), S(20), 12 * b, 6.5 * b, col);
      p.ellipse(S(21), S(24), 9 * b, 2.5 * b, belly);
      // neck + head
      const ha = atk && frame === 1 ? 2 : 0;
      p.poly([[S(28), S(15)], [S(33), S(8)], [S(37), S(9)], [S(33), S(20)]], col);
      p.ball(S(36 + ha), S(8), 4.5 * b, 3.5 * b, col);
      p.poly([[S(38 + ha), S(6)], [S(44 + ha), S(8)], [S(44 + ha), S(11)], [S(38 + ha), S(11)]], col);
      if (atk && frame === 1) p.poly([[S(39 + ha), S(10)], [S(44 + ha), S(11)], [S(40 + ha), S(13)]], '#6a1a14');
      p.set(S(37 + ha), S(7), '#ffd84a'); p.set(S(38 + ha), S(7), '#ffd84a');
      p.line(S(34 + ha), S(5), S(31 + ha), S(1), '#e8dcc0'); p.line(S(36 + ha), S(5), S(34 + ha), S(1), '#e8dcc0');
      // spines
      for (let i = 0; i < 5; i++) p.set(S(12 + i * 4), S(13.5 - (i === 2 ? 1 : 0)), shade(col, -0.4));
      // near wing
      if (!baby || look.pet) {
        p.poly([[S(16), S(15)], [S(8), S(2 + flap)], [S(14), S(3 + flap)], [S(20), S(4 + flap)], [S(26), S(9 + flap)], [S(24), S(16)]], shade(col, -0.1));
        p.line(S(16), S(15), S(8), S(2 + flap), shade(col, 0.2));
        p.line(S(16), S(15), S(20), S(4 + flap), shade(col, -0.35));
      } else {
        p.poly([[S(17), S(15)], [S(13), S(8 + flap)], [S(23), S(10 + flap)], [S(24), S(16)]], shade(col, -0.1));
      }
      break;
    }
    case 'imp': {
      return creatureHuman({ ...look, kind: 'human', skin: col, shirt: col, pants: shade(col, -0.3), shoes: shade(col, -0.4), hairStyle: 'bald', tiny: true, horns: true, tail: true, sleeveless: true }, anim, frame);
    }
    case 'beaver': {
      p = new Painter(16, 12);
      p.ellipse(3, 8, 3, 1.5, '#4a3020');
      p.ball(8, 7, 4.5, 3.2, '#8a5a30'); p.ball(12, 5, 2.4, 2.2, '#8a5a30');
      p.set(13, 4, '#1a1a1a'); p.set(14, 6, '#f0f0e0'); p.set(11, 3, '#6a4020');
      p.set(7 + f2, 10, '#4a3020'); p.set(10 - f2, 10, '#4a3020');
      break;
    }
    case 'golem': {
      const b = look.big ? 2 : 1, gc = look.color || '#7a746a', S = (n) => Math.round(n * b);
      p = new Painter(S(14), S(16));
      const sw = atk && frame === 1 ? S(1) : 0;
      p.ball(S(7), S(10), 5 * b, 4.5 * b, gc); p.ball(S(7), S(4), 3.5 * b, 3 * b, shade(gc, 0.1));
      const eye = look.eyes || '#e8c040';
      p.set(S(6), S(4), eye); p.set(S(8), S(4), eye); if (b > 1) { p.set(S(6) + 1, S(4), eye); p.set(S(8) + 1, S(4), eye); }
      p.rect(S(2) - sw, S(9) - f2 * b, S(2), S(3), shade(gc, -0.15)); p.rect(S(10) + sw, S(9) + f2 * b, S(2), S(3), shade(gc, -0.15));
      p.set(S(5), S(11), look.vein || '#4ab7c8'); p.set(S(9), S(8), look.vein2 || '#c8743a');
      if (b > 1) { p.line(S(4), S(12), S(6), S(9), look.vein || '#4ab7c8'); p.line(S(8), S(12), S(10), S(9), look.vein2 || '#c8743a'); }
      break;
    }
    case 'butterfly': {
      p = new Painter(12, 10);
      const up = frame % 2 === 0;
      p.poly(up ? [[6, 5], [1, 1], [2, 6]] : [[6, 5], [1, 4], [2, 8]], col); p.poly(up ? [[6, 5], [11, 1], [10, 6]] : [[6, 5], [11, 4], [10, 8]], col);
      p.vline(6, 3, 7, '#2a2a2a'); p.set(4, 3, shade(col, 0.4)); p.set(8, 3, shade(col, 0.4));
      return { p, noOutline: false };
    }
    case 'hand': {
      p = new Painter(16, 12);
      const w2 = walk ? f2 : 0;
      p.ball(8, 8, 4.5, 3, col);
      for (let i = 0; i < 4; i++) p.line(5 + i * 2, 6, 3 + i * 3 - w2, 2 + (i % 2), col);
      p.line(12, 8, 15, 6 + w2, col);
      p.hline(5, 11, 10, sh); p.set(4, 7, '#8a2a2a');
      break;
    }
    case 'cockatrice': {
      p = new Painter(20, 20);
      const lg = walk ? f2 : 0, peck = atk && frame === 1 ? 2 : 0;
      p.line(3, 12, 0, 16, sh); p.line(2, 11, 0, 13, sh);
      p.ball(8, 12, 5.5, 4, col);
      p.poly([[5, 9], [3, 5], [7, 8]], shade(col, 0.2));
      p.ball(13 + peck * 0.5, 6 + peck, 3, 3, col);
      p.set(14 + peck, 5 + peck, '#ff2020'); p.set(13 + peck, 3 + peck, '#c83a2a'); p.set(12 + peck, 2 + peck, '#c83a2a');
      p.poly([[16 + peck, 6 + peck], [19 + peck, 7 + peck], [16 + peck, 8 + peck]], '#e8a020');
      p.vline(7 + lg, 16, 19, '#c8a020'); p.vline(10 - lg, 16, 19, '#c8a020');
      break;
    }
    case 'bloodveld': {
      p = new Painter(22, 24);
      const b = f2;
      p.ball(11, 14 - b, 7, 8, col);
      p.ball(11, 8 - b, 5, 4, shade(col, 0.15));
      p.rect(8, 21, 2, 3, sh); p.rect(13, 21, 2, 3, sh);
      p.set(8, 7 - b, '#ffd84a'); p.set(13, 7 - b, '#ffd84a');
      const t = atk && frame === 1 ? 8 : 3;
      for (let i = 0; i < t; i++) p.rect(10, 11 - b + i, 3, 1, '#e86a8a');
      p.ellipse(11, 12 - b, 3, 1.5, '#5a0a0a');
      break;
    }
    case 'frog': {
      p = new Painter(20, 14);
      const hop = walk && f2 ? -2 : 0;
      p.ball(10, 9 + hop, 7, 4.5, col);
      p.ball(6, 5 + hop, 2.2, 2.2, shade(col, 0.15)); p.ball(14, 5 + hop, 2.2, 2.2, shade(col, 0.15));
      p.set(6, 5 + hop, '#1a1a1a'); p.set(14, 5 + hop, '#1a1a1a');
      p.hline(7, 13, 10 + hop, sh);
      p.line(3, 11 + hop, 1, 13, sh); p.line(17, 11 + hop, 19, 13, sh);
      if (atk && frame === 1) p.line(10, 10, 10, 13, '#e86a8a');
      break;
    }
    case 'snake': {
      p = new Painter(22, 10);
      const wv = walk ? f2 : 0;
      for (let i = 0; i < 9; i++) p.ball(2 + i * 2, 6 + Math.round(Math.sin(i * 0.9 + wv * 1.5) * 1.5), 1.8, 1.8, i % 2 ? col : shade(col, -0.12));
      const ha = atk && frame === 1 ? 2 : 0;
      p.ball(19 + ha, 5, 2.3, 2, col);
      if (look.leech) { p.ellipse(21 + ha, 5, 1.2, 1.5, '#8a1a1a'); }
      else { p.set(20 + ha, 4, '#ffd84a'); p.set(22 + ha - 1, 6, '#e82a2a'); }
      break;
    }
    case 'crocodile': {
      p = new Painter(36, 14);
      const lg = walk ? f2 : 0, jaw = atk && frame === 1 ? 2 : 0;
      p.poly([[0, 8], [8, 6], [8, 10]], col);
      p.ball(15, 8, 8, 3.5, col);
      for (let i = 0; i < 5; i++) p.set(9 + i * 3, 5, shade(col, 0.25));
      p.poly([[22, 6], [35, 7 - jaw], [35, 8], [22, 9]], col); p.poly([[22, 9], [35, 9 + jaw], [35, 10 + jaw], [22, 10]], shade(col, -0.1));
      p.set(24, 5, '#ffd84a');
      for (const [x, o] of [[10, lg], [19, -lg]]) p.rect(x + o, 11, 2, 3, sh);
      break;
    }
    case 'bat': {
      const b = look.big ? 1.5 : 1, S = (n) => Math.round(n * b);
      p = new Painter(S(22), S(14));
      const up = frame % 2 === 0;
      p.poly(up ? [[S(9), S(7)], [S(1), S(1)], [S(4), S(7)], [S(1), S(10)]] : [[S(9), S(7)], [S(1), S(9)], [S(4), S(8)], [S(2), S(12)]], shade(col, -0.2));
      p.poly(up ? [[S(13), S(7)], [S(21), S(1)], [S(18), S(7)], [S(21), S(10)]] : [[S(13), S(7)], [S(21), S(9)], [S(18), S(8)], [S(20), S(12)]], shade(col, -0.2));
      p.ball(S(11), S(8), 3 * b, 3 * b, col);
      p.set(S(9), S(4), col); p.set(S(13), S(4), col);
      p.set(S(10), S(7), '#e83030'); p.set(S(12), S(7), '#e83030');
      if (atk) p.set(S(11), S(10), '#f0f0f0');
      break;
    }
    case 'slime': {
      const b = look.big ? 1.4 : 1, S = (n) => Math.round(n * b);
      p = new Painter(S(18), S(14));
      const sq = walk ? f2 : atk && frame === 1 ? -1 : 0;
      p.ellipse(S(9), S(9) + sq, S(8) + sq, S(5) - sq, col, 210);
      p.ellipse(S(9), S(8) + sq, S(5), S(2.5), hi, 200);
      p.set(S(6), S(8), '#1a1a1a'); p.set(S(11), S(8), '#1a1a1a');
      p.set(S(5), S(6) + sq, '#ffffff');
      if (look.core) p.ball(S(9), S(10), 1.5 * b, 1.5 * b, look.core);
      break;
    }
    case 'crab': {
      const b = look.big ? 1.5 : 1, S = (n) => Math.round(n * b);
      p = new Painter(S(24), S(16));
      const lg = walk ? f2 : 0;
      for (let i = 0; i < 3; i++) { p.line(S(7 + i * 3), S(11), S(5 + i * 3) - lg, S(15), dk); p.line(S(14 + i * 2), S(11), S(17 + i * 2) + lg, S(15), dk); }
      p.ball(S(12), S(9), 7 * b, 4.5 * b, col);
      p.ellipse(S(12), S(7), 4 * b, 1.5 * b, hi);
      const cl = atk && frame === 1 ? S(1) : 0;
      p.ball(S(3) - cl, S(6), 2.5 * b, 2 * b, sh); p.ball(S(21) + cl, S(6), 2.5 * b, 2 * b, sh);
      p.line(S(5), S(8), S(3) - cl, S(6), sh); p.line(S(19), S(8), S(21) + cl, S(6), sh);
      p.set(S(10), S(5), '#1a1a1a'); p.set(S(14), S(5), '#1a1a1a');
      if (look.rocky) { p.ball(S(12), S(7), 5 * b, 3 * b, '#8a847a'); p.set(S(10), S(6), '#a8a298'); }
      break;
    }
    case 'sheep': {
      p = new Painter(22, 16);
      const lg = walk ? f2 : 0;
      for (const [x, o] of [[6, lg], [9, -lg], [14, -lg], [17, lg]]) p.rect(x + o, 11, 2, 4, '#3a3a3a');
      const wool = look.shorn ? '#d8d0c0' : col;
      p.ball(11, 8, 8, 5, wool);
      for (let i = 0; i < 5; i++) p.ball(5 + i * 3, 5 + (i % 2), 2, 2, shade(wool, 0.08));
      const ha = atk && frame === 1 ? 1 : 0;
      p.ball(19 + ha, 6, 2.6, 2.4, '#3a3a3a'); p.set(20 + ha, 5, '#f0f0f0'); p.set(18 + ha, 4, '#2a2a2a');
      break;
    }
    case 'treant': {
      p = new Painter(34, 42);
      const sw = walk ? f2 : 0, ar = atk && frame === 1 ? 3 : 0;
      const bark = col, leaf = look.leaf || '#3a7a2a';
      p.rect(12 - sw, 34, 4, 7, shade(bark, -0.2)); p.rect(19 + sw, 34, 4, 7, shade(bark, -0.2));
      p.rect(11, 16, 13, 20, bark);
      for (let y = 18; y < 35; y += 3) p.hline(12, 22, y, shade(bark, -0.25));
      p.line(11, 20, 3 - ar, 26 + ar, bark); p.line(12, 21, 4 - ar, 27 + ar, bark);
      p.line(23, 20, 31 + ar, 26 + ar, bark); p.line(22, 21, 30 + ar, 27 + ar, bark);
      p.ball(17, 10, 13, 9, leaf); p.ball(11, 8, 6, 5, shade(leaf, 0.15)); p.ball(24, 11, 6, 5, shade(leaf, -0.1));
      p.set(14, 22, '#ffd84a'); p.set(20, 22, '#ffd84a');
      p.hline(15, 19, 27, '#1a1a0a');
      break;
    }
    case 'heron': {
      p = new Painter(14, 18);
      p.ball(6, 10, 4, 3, '#b8c0c8');
      p.line(8, 8, 9, 3, '#c8d0d8'); p.ball(10, 3, 1.8, 1.6, '#d8e0e8');
      p.line(11, 3, 13, 4, '#e8b020'); p.set(10, 2, '#1a1a1a');
      p.vline(5 + f2, 13, 16, '#c8a020'); p.vline(7, 13, 16, '#c8a020');
      p.line(2, 9, 0, 11, '#8a929a');
      break;
    }
    case 'raccoon': {
      p = new Painter(16, 12);
      p.line(1, 6, 3, 8, '#4a4a4a'); p.set(0, 5, '#2a2a2a');
      p.ball(7, 8, 4, 2.8, '#7a7a78'); p.ball(12, 6, 2.6, 2.4, '#8a8a88');
      p.rect(11, 5, 3, 1, '#1a1a1a'); p.set(12, 5, '#f0f0f0');
      p.set(6 + f2, 11, '#3a3a3a'); p.set(9 - f2, 11, '#3a3a3a');
      break;
    }
    case 'mummy':
      return creatureHuman({ kind: 'human', skin: '#d8cfb0', shirt: '#d8cfb0', pants: '#c8bf9e', shoes: '#b8af8e', hairStyle: 'bald', mummy: true }, anim, frame);
    case 'skeleton':
      return creatureHuman({ kind: 'human', skin: '#e4e0cc', shirt: '#e4e0cc', pants: '#e4e0cc', shoes: '#d0ccb8', hairStyle: 'bald', skeleton: true, tiny: look.pet, weapon: look.pet ? null : { kind: 'scimitar', color: '#7d7a78' }, shield: look.pet ? null : { kind: 'woodshield', color: '#8a5a2b' } }, anim, frame);
    case 'bigskeleton':
      return creatureHuman({ kind: 'human', skin: '#e4e0cc', shirt: '#e4e0cc', pants: '#e4e0cc', shoes: '#d0ccb8', hairStyle: 'bald', skeleton: true, big: true, huge: true, glowEyes: true, hat: { kind: 'crown', color: '#8a7a3a' }, cape: { color: '#4a1a4a', trim: '#8a7a3a' }, weapon: { kind: 'maul', color: '#d8d0b0' } }, anim, frame);
    case 'demon':
      return creatureHuman({ kind: 'human', skin: col, shirt: col, pants: '#2a1a1a', shoes: '#1a1010', hairStyle: 'bald', big: true, horns: true, wings: true, tail: true, sleeveless: true, glowEyes: true }, anim, frame);
    default:
      p = new Painter(12, 12); p.ball(6, 6, 5, 5, col);
  }
  return { p };
}

function creatureHuman(look, anim, frame) {
  return human(look, 'down', anim, frame);
}

// ------------------------------------------------------------------ public
const cache = new Map();

function frameCounts() { return { idle: 2, walk: 4, attack: 2 }; }

export function buildSprite(look, key) {
  if (key && cache.has(key)) return cache.get(key);
  const set = { frames: {}, humanoid: false };
  const counts = frameCounts();
  const isHuman = look.kind === 'human';
  const humanLike = isHuman || ['skeleton', 'bigskeleton', 'mummy', 'demon', 'imp'].includes(look.kind);
  set.humanoid = humanLike;
  for (const facing of FACINGS) {
    set.frames[facing] = {};
    for (const [anim, n] of Object.entries(counts)) {
      set.frames[facing][anim] = [];
      for (let f = 0; f < n; f++) {
        let res;
        if (isHuman) {
          const fc = facing === 'left' ? 'right' : facing;
          res = human(look, fc, anim, f);
          if (facing === 'left') res.p = res.p.flipped();
        } else if (humanLike) {
          const base = look.kind === 'skeleton' || look.kind === 'bigskeleton' || look.kind === 'mummy' || look.kind === 'demon' || look.kind === 'imp';
          const fc = facing === 'left' ? 'right' : facing;
          const hl = creatureLook(look);
          res = base ? human(hl, fc, anim, f) : creature(look, anim, f);
          if (facing === 'left') res.p = res.p.flipped();
        } else {
          res = creature(look, anim, f);
          if (!res.noOutline) res.p.outline(OUTLINE);
          if (facing === 'left' || (facing !== 'right' && f === -1)) res.p = res.p.flipped();
        }
        set.frames[facing][anim].push(res.p.canvas());
        set.w = res.p.w; set.h = res.p.h;
        set.glow = res.glow && res.glow.length ? res.glow : set.glow;
      }
    }
  }
  // creature facings: up/down reuse last horizontal (handled by renderer), keep 'down' = right-facing
  set.ax = Math.floor(set.w / 2);
  set.ay = set.h - 2;
  if (key) cache.set(key, set);
  return set;
}

function creatureLook(look) {
  const col = look.color;
  switch (look.kind) {
    case 'skeleton': return { kind: 'human', skin: '#e4e0cc', shirt: '#e4e0cc', pants: '#e4e0cc', shoes: '#d0ccb8', hairStyle: 'bald', skeleton: true, tiny: look.pet, weapon: look.pet ? null : look.weapon || { kind: 'scimitar', color: '#7d7a78' }, shield: look.pet ? null : look.shield !== undefined ? look.shield : { kind: 'woodshield', color: '#8a5a2b' }, helm: look.helm, body: look.body, glowEyes: look.glowEyes, big: look.big };
    case 'bigskeleton': return { kind: 'human', skin: '#e4e0cc', shirt: '#e4e0cc', pants: '#e4e0cc', shoes: '#d0ccb8', hairStyle: 'bald', skeleton: true, big: true, huge: true, glowEyes: true, hat: { kind: 'crown', color: '#8a7a3a' }, cape: { color: '#4a1a4a', trim: '#8a7a3a' }, weapon: { kind: 'maul', color: '#d8d0b0' } };
    case 'mummy': return { kind: 'human', skin: '#d8cfb0', shirt: '#d8cfb0', pants: '#c8bf9e', shoes: '#b8af8e', hairStyle: 'bald', mummy: true };
    case 'demon': return { kind: 'human', skin: col, shirt: col, pants: '#2a1a1a', shoes: '#1a1010', hairStyle: 'bald', big: true, huge: look.huge, horns: true, wings: true, tail: true, sleeveless: true, glowEyes: true, hat: look.hat, weapon: look.weapon };
    case 'imp': return { kind: 'human', skin: col, shirt: col, pants: shade(col, -0.3), shoes: shade(col, -0.4), hairStyle: 'bald', tiny: true, horns: true, tail: true, sleeveless: true, glowEyes: true };
  }
  return look;
}

// Chathead: a zoomed crop of the down-facing idle head, used in dialogue.
export function chathead(set) {
  const src = set.frames.down.idle[0];
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

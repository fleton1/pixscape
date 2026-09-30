// Procedural music (per-region themes) and synthesized sound effects via WebAudio.
import { G } from './game/state.js';
import { mulberry32 } from './util.js';

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], hijaz: [0, 1, 4, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11],
};
// root: midi note, prog: chord degrees per bar, lead/pad instruments, density of melody
const TRACKS = {
  town: { root: 62, scale: 'major', bpm: 84, prog: [0, 5, 3, 4], lead: 'pluck', pad: 'pad', dens: 0.55, seed: 1 },
  kingdom: { root: 60, scale: 'major', bpm: 80, prog: [0, 3, 5, 4], lead: 'pluck', pad: 'pad', dens: 0.5, seed: 2 },
  farm: { root: 67, scale: 'major', bpm: 96, prog: [0, 4, 3, 4], lead: 'flute', pad: 'pad', dens: 0.5, seed: 3 },
  city: { root: 60, scale: 'major', bpm: 92, prog: [0, 3, 4, 0, 5, 3, 4, 4], lead: 'pluck', pad: 'brass', dens: 0.6, seed: 4 },
  port: { root: 57, scale: 'dorian', bpm: 76, prog: [0, 3, 0, 6], lead: 'pluck', pad: 'pad', dens: 0.45, seed: 5 },
  sea: { root: 57, scale: 'dorian', bpm: 66, prog: [0, 3], lead: 'bell', pad: 'pad', dens: 0.25, seed: 6 },
  goblin: { root: 52, scale: 'minor', bpm: 112, prog: [0, 0, 5, 4], lead: 'pluck', pad: 'drum', dens: 0.7, seed: 7 },
  mine: { root: 55, scale: 'dorian', bpm: 88, prog: [0, 6, 3, 4], lead: 'pluck', pad: 'pad', dens: 0.5, seed: 8 },
  wild: { root: 45, scale: 'phrygian', bpm: 68, prog: [0, 1, 0, 6], lead: 'pluck', pad: 'drone', dens: 0.3, seed: 9 },
  boss: { root: 50, scale: 'harmonic', bpm: 124, prog: [0, 5, 3, 4], lead: 'pluck', pad: 'drum', dens: 0.75, seed: 10 },
  frost: { root: 65, scale: 'lydian', bpm: 64, prog: [0, 1, 0, 4], lead: 'bell', pad: 'pad', dens: 0.3, seed: 11 },
  desert: { root: 52, scale: 'hijaz', bpm: 90, prog: [0, 1, 0, 6], lead: 'pluck', pad: 'drone', dens: 0.55, seed: 12 },
  desert_town: { root: 52, scale: 'hijaz', bpm: 98, prog: [0, 1, 3, 0], lead: 'pluck', pad: 'drum', dens: 0.6, seed: 13 },
  tomb: { root: 45, scale: 'hijaz', bpm: 62, prog: [0, 1], lead: 'bell', pad: 'drone', dens: 0.25, seed: 14 },
  swamp: { root: 48, scale: 'minor', bpm: 60, prog: [0, 5, 1, 0], lead: 'flute', pad: 'drone', dens: 0.3, seed: 15 },
  elven: { root: 62, scale: 'dorian', bpm: 72, prog: [0, 6, 3, 4], lead: 'harp', pad: 'pad', dens: 0.6, seed: 16 },
  grove: { root: 64, scale: 'lydian', bpm: 66, prog: [0, 4, 1, 4], lead: 'harp', pad: 'pad', dens: 0.55, seed: 17 },
  tropic: { root: 67, scale: 'mixolydian', bpm: 104, prog: [0, 6, 3, 0], lead: 'marimba', pad: 'drum', dens: 0.65, seed: 18 },
  volcano: { root: 48, scale: 'phrygian', bpm: 100, prog: [0, 1, 0, 5], lead: 'pluck', pad: 'drone', dens: 0.5, seed: 19 },
  cave: { root: 45, scale: 'minor', bpm: 54, prog: [0, 5], lead: 'bell', pad: 'drone', dens: 0.2, seed: 20 },
  steppe: { root: 57, scale: 'mixolydian', bpm: 86, prog: [0, 6, 3, 4], lead: 'flute', pad: 'drone', dens: 0.45, seed: 21 },
  jungle: { root: 55, scale: 'dorian', bpm: 98, prog: [0, 3, 0, 6], lead: 'marimba', pad: 'drum', dens: 0.6, seed: 22 },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  constructor() { this.ctx = null; this.track = null; this.pending = null; }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.connect(c.destination);
    this.music = c.createGain(); this.music.connect(this.master);
    this.fx = c.createGain(); this.fx.connect(this.master);
    // a touch of reverb
    this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.2); const vg = c.createGain(); vg.gain.value = 0.28; this.verb.connect(vg); vg.connect(this.music);
    this.setVolume();
    this.pluckBuf = this.karplus(220, 2.2);
    this.noiseBuf = this.noise(1.5);
    this.nextNote = 0; this.step = 0;
    setInterval(() => this.schedule(), 60);
    if (this.pending) { this.setTrack(this.pending); }
  }
  setVolume() {
    if (!this.ctx) return;
    this.music.gain.value = G.settings.music * 0.55;
    this.fx.gain.value = G.settings.sfx * 0.7;
  }
  impulse(sec) {
    const c = this.ctx, len = c.sampleRate * sec, b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  karplus(freq, sec) {
    const c = this.ctx, sr = c.sampleRate, len = Math.floor(sr * sec);
    const b = c.createBuffer(1, len, sr), d = b.getChannelData(0);
    const period = Math.floor(sr / freq);
    const buf = new Float32Array(period);
    for (let i = 0; i < period; i++) buf[i] = Math.random() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const nxt = (idx + 1) % period;
      const v = (buf[idx] + buf[nxt]) * 0.5 * 0.996;
      d[i] = buf[idx];
      buf[idx] = v;
      idx = nxt;
    }
    return b;
  }
  noise(sec) {
    const c = this.ctx, len = c.sampleRate * sec, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // ------------------------------------------------------------ music
  setTrack(name) {
    if (!TRACKS[name]) name = 'kingdom';
    if (!this.ctx) { this.pending = name; return; }
    if (this.track && this.track.name === name) return;
    const t = TRACKS[name];
    this.track = { name, ...t, song: this.compose(t) };
    this.step = 0;
    this.nextNote = Math.max(this.nextNote, this.ctx.currentTime + 0.4);
  }
  compose(t) {
    const rnd = mulberry32(t.seed * 7919);
    const scale = SCALES[t.scale];
    const bars = t.prog.length >= 8 ? t.prog : [...t.prog, ...t.prog];
    // melody: 8 eighth-notes per bar; phrase A for first half, B for second, A' repeats with variation
    const makePhrase = (n) => {
      const out = [];
      let deg = 7 + Math.floor(rnd() * 3);
      for (let b = 0; b < n; b++) {
        const bar = [];
        for (let s = 0; s < 8; s++) {
          const on = s === 0 ? rnd() < 0.8 : rnd() < t.dens * (s % 2 ? 0.7 : 1.1);
          if (on) { deg += Math.round((rnd() - 0.5) * 4); deg = Math.max(3, Math.min(13, deg)); bar.push({ deg, len: rnd() < 0.25 ? 2 : 1 }); }
          else bar.push(null);
        }
        out.push(bar);
      }
      return out;
    };
    const half = Math.ceil(bars.length / 2);
    const A = makePhrase(half), B = makePhrase(half);
    const Avar = A.map((bar) => bar.map((n) => (n && rnd() < 0.3 ? { ...n, deg: n.deg + (rnd() < 0.5 ? 1 : -1) } : n)));
    return { bars, melody: [...A, ...B, ...Avar, ...B], scale };
  }
  degToMidi(t, song, deg) {
    const sc = song.scale;
    const oct = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
    return t.root + oct * 12 + sc[i] - 12;
  }
  schedule() {
    if (!this.ctx || !this.track || G.settings.music <= 0.001) { if (this.ctx) this.nextNote = this.ctx.currentTime + 0.1; return; }
    const t = this.track, song = t.song;
    const spb = 60 / t.bpm / 2; // eighth note
    while (this.nextNote < this.ctx.currentTime + 0.25) {
      const total = song.melody.length * 8;
      const s = this.step % total;
      const barI = Math.floor(s / 8), si = s % 8;
      const chordDeg = song.bars[barI % song.bars.length];
      const when = this.nextNote;
      // chord / pad on bar start
      if (si === 0) {
        const tri = [0, 2, 4].map((k) => this.degToMidi(t, song, chordDeg + k + 7));
        if (t.pad === 'pad' || t.pad === 'brass') for (const m of tri) this.padNote(mtof(m), when, spb * 8, t.pad === 'brass' ? 0.035 : 0.04, t.pad === 'brass');
        if (t.pad === 'drone') this.padNote(mtof(this.degToMidi(t, song, chordDeg) - 12), when, spb * 8, 0.07, false);
        this.pluck(mtof(this.degToMidi(t, song, chordDeg)), when, 0.22, 1.6);
      }
      if (si === 4 && t.pad !== 'drone') this.pluck(mtof(this.degToMidi(t, song, chordDeg + 4)), when, 0.12, 1.2);
      if (t.pad === 'drum') { if (si % 4 === 0) this.drum(when, 0.18, 90); if (si % 4 === 2) this.drum(when, 0.06, 900); }
      // harp arpeggio
      if (t.lead === 'harp' && si % 2 === 1) this.pluck(mtof(this.degToMidi(t, song, chordDeg + 7 + [0, 2, 4, 7][(si >> 1) % 4])), when, 0.07, 2);
      const n = song.melody[barI][si];
      if (n) {
        const f = mtof(this.degToMidi(t, song, n.deg + 7));
        if (t.lead === 'pluck' || t.lead === 'harp') this.pluck(f, when, 0.16, 1.4);
        else if (t.lead === 'flute') this.flute(f, when, spb * n.len * 1.4);
        else if (t.lead === 'bell') this.bell(f, when, 0.09);
        else if (t.lead === 'marimba') this.bell(f, when, 0.13, 0.35);
      }
      this.nextNote += spb * (si % 2 === 0 ? 1.04 : 0.96); // gentle swing
      this.step++;
    }
  }
  out(node, verb = true) { node.connect(this.music); if (verb) node.connect(this.verb); }
  pluck(freq, when, vol, dur = 1.2, dest) {
    const c = this.ctx, src = c.createBufferSource();
    src.buffer = this.pluckBuf; src.playbackRate.value = freq / 220;
    const g = c.createGain(); g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    src.connect(lp); lp.connect(g);
    if (dest) g.connect(dest); else this.out(g);
    src.start(when); src.stop(when + dur + 0.05);
  }
  padNote(freq, when, dur, vol, brass) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(vol, when + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, when + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = brass ? 1400 : 900;
    lp.connect(g); this.out(g);
    for (const det of [-6, 6]) {
      const o = c.createOscillator(); o.type = brass ? 'sawtooth' : 'triangle'; o.frequency.value = freq; o.detune.value = det;
      o.connect(lp); o.start(when); o.stop(when + dur + 0.05);
    }
  }
  flute(freq, when, dur) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const vib = c.createOscillator(); vib.frequency.value = 5; const vg = c.createGain(); vg.gain.value = freq * 0.006; vib.connect(vg); vg.connect(o.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(0.09, when + 0.06); g.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.connect(g); this.out(g);
    o.start(when); vib.start(when); o.stop(when + dur + 0.05); vib.stop(when + dur + 0.05);
  }
  bell(freq, when, vol, dur = 1.8) {
    const c = this.ctx;
    for (const [mul, v] of [[1, 1], [2.76, 0.3], [5.4, 0.12]]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq * mul;
      const g = c.createGain(); g.gain.setValueAtTime(vol * v, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dur / mul);
      o.connect(g); this.out(g); o.start(when); o.stop(when + dur);
    }
  }
  drum(when, vol, freq) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = c.createBiquadFilter(); bp.type = freq < 200 ? 'lowpass' : 'highpass'; bp.frequency.value = freq < 200 ? 180 : 4000;
    const g = c.createGain(); g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.001, when + (freq < 200 ? 0.18 : 0.05));
    src.connect(bp); bp.connect(g); g.connect(this.music);
    src.start(when, Math.random()); src.stop(when + 0.25);
    if (freq < 200) { const o = c.createOscillator(); o.frequency.setValueAtTime(110, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.15); const og = c.createGain(); og.gain.setValueAtTime(vol * 1.4, when); og.gain.exponentialRampToValueAtTime(0.001, when + 0.2); o.connect(og); og.connect(this.music); o.start(when); o.stop(when + 0.22); }
  }

  // ------------------------------------------------------------ sfx
  sfx(name) {
    if (!this.ctx || G.settings.sfx <= 0.001) return;
    const c = this.ctx, t = c.currentTime + 0.005;
    const noise = (dur, type, f, vol, q = 1, sweep) => {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
      if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(fl); fl.connect(g); g.connect(this.fx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    };
    const tone = (type, f0, f1, dur, vol, delay = 0) => {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + delay);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + delay); g.gain.linearRampToValueAtTime(vol, t + delay + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(g); g.connect(this.fx); o.start(t + delay); o.stop(t + delay + dur + 0.02);
    };
    const arp = (notes, step, vol, kind = 'pluck') => notes.forEach((m, i) => (kind === 'pluck' ? this.pluck(mtof(m), t + i * step, vol, 1.2, this.fx) : tone('triangle', mtof(m), null, 0.4, vol, i * step)));
    switch (name) {
      case 'click': tone('square', 1200, 800, 0.03, 0.04); break;
      case 'chop': noise(0.08, 'bandpass', 900, 0.5, 2); tone('sine', 180, 90, 0.08, 0.3); break;
      case 'treefall': noise(0.6, 'lowpass', 1200, 0.5, 1, 100); tone('sine', 90, 40, 0.5, 0.3); break;
      case 'mine': tone('square', 2400, 1800, 0.06, 0.08); noise(0.06, 'highpass', 3000, 0.25); break;
      case 'hit': tone('sine', 220, 70, 0.12, 0.4); noise(0.08, 'lowpass', 1500, 0.3); break;
      case 'miss': noise(0.12, 'bandpass', 1500, 0.2, 1, 500); break;
      case 'hurt': tone('sine', 160, 60, 0.15, 0.4); noise(0.1, 'lowpass', 900, 0.35); break;
      case 'death': tone('sawtooth', 300, 60, 0.4, 0.12); break;
      case 'dead': tone('triangle', 330, 110, 1.2, 0.2); tone('triangle', 262, 87, 1.4, 0.15, 0.2); break;
      case 'levelup': arp([67, 71, 74, 79, 83], 0.09, 0.25); arp([55, 62, 67], 0.0, 0.12); break;
      case 'quest': arp([60, 64, 67, 72, 67, 72, 76, 79], 0.12, 0.22); break;
      case 'rare': arp([84, 88, 91, 96], 0.07, 0.15, 'tri'); break;
      case 'eat': tone('sine', 300, 200, 0.07, 0.2); tone('sine', 280, 180, 0.07, 0.2, 0.12); break;
      case 'drink': for (let i = 0; i < 3; i++) tone('sine', 500 - i * 60, 300, 0.06, 0.15, i * 0.1); break;
      case 'bury': case 'tinder': noise(0.15, 'bandpass', 600, 0.3, 1.5); break;
      case 'equip': tone('square', 1800, 1200, 0.05, 0.05); noise(0.05, 'highpass', 5000, 0.12); break;
      case 'pickup': tone('sine', 600, 900, 0.06, 0.15); break;
      case 'drop': tone('sine', 500, 300, 0.07, 0.15); break;
      case 'coins': for (let i = 0; i < 4; i++) tone('square', 2200 + Math.random() * 800, null, 0.04, 0.035, i * 0.04); break;
      case 'fire': noise(0.4, 'bandpass', 700, 0.25, 0.8, 200); break;
      case 'cook': noise(0.3, 'highpass', 3000, 0.18); break;
      case 'splash': noise(0.25, 'lowpass', 2500, 0.3, 1, 300); break;
      case 'smelt': noise(0.3, 'lowpass', 600, 0.3); tone('sine', 120, 90, 0.3, 0.15); break;
      case 'anvil': tone('square', 1760, 1700, 0.15, 0.08); tone('sine', 3520, null, 0.3, 0.05); noise(0.04, 'highpass', 4000, 0.3); break;
      case 'chisel': tone('square', 3000, null, 0.03, 0.05); break;
      case 'door': tone('sawtooth', 180, 260, 0.25, 0.05); break;
      case 'ladder': for (let i = 0; i < 3; i++) noise(0.05, 'bandpass', 500, 0.25, 2); break;
      case 'teleport': tone('sine', 300, 1500, 0.8, 0.12); tone('triangle', 600, 2400, 0.8, 0.06); break;
      case 'prayon': tone('sine', 660, 990, 0.2, 0.12); break;
      case 'prayoff': tone('sine', 880, 440, 0.2, 0.1); break;
      case 'sail': noise(1.2, 'lowpass', 600, 0.3, 1, 200); break;
      case 'warning': tone('sawtooth', 110, 100, 0.8, 0.08); break;
      case 'rumble': case 'slam': noise(0.7, 'lowpass', 200, 0.6); tone('sine', 60, 30, 0.6, 0.4); break;
      case 'bank': tone('square', 400, 300, 0.05, 0.05); break;
      case 'error': tone('square', 150, null, 0.12, 0.06); break;
      case 'swing': noise(0.1, 'bandpass', 1200, 0.15, 1, 400); break;
      case 'holy': arp([72, 76, 79], 0.08, 0.12, 'tri'); break;
    }
  }
}

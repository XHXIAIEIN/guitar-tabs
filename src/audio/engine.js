// Web Audio output: metronome clicks and a Karplus–Strong plucked-string guitar.
import { TUNING } from '../music/theory.js';

let ctx = null;
let metroBus;
let guitarBus;
const volumes = { metronome: 0.8, guitar: 0.8 };
const plucks = new Map();
const clickBuffers = [];
/** Latest scheduled voice per string (index = string number), so a new note can damp the old one. */
const voices = new Array(7).fill(null);

export function audioContext() {
  if (ctx) return ctx;
  // iOS silences Web Audio while the ring/silent switch is on unless the session is declared as playback.
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
  ctx = new AudioContext({ latencyHint: 'interactive' });
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);
  metroBus = ctx.createGain();
  metroBus.connect(comp);
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 180;
  body.Q.value = 1.1;
  body.gain.value = 3;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 5200;
  guitarBus = ctx.createGain();
  guitarBus.connect(body).connect(tone).connect(comp);
  applyVolumes();
  return ctx;
}

/** Must run inside a user gesture the first time: browsers keep audio suspended until then. */
export async function resumeAudio() {
  const c = audioContext();
  if (c.state !== 'running') await c.resume();
  return c;
}

/** Seconds between scheduling a sound and hearing it. */
export const outputLatency = () => (ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0);

function applyVolumes() {
  // squared so the slider feels even to the ear
  if (metroBus) metroBus.gain.value = volumes.metronome ** 2;
  if (guitarBus) guitarBus.gain.value = volumes.guitar ** 2 * 1.4;
}

export function setVolume(kind, value) {
  volumes[kind] = value;
  applyVolumes();
}

function clickBuffer(freq) {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * 0.06);
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    d[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 85) * Math.min(1, i / 30);
  }
  return buf;
}

/** Metronome click. level 2 = bar start, 1 = beat, 0 = subdivision. */
export function click(time, level = 1) {
  const c = audioContext();
  if (!clickBuffers.length) clickBuffers.push(clickBuffer(1050), clickBuffer(1500), clickBuffer(2100));
  const src = c.createBufferSource();
  src.buffer = clickBuffers[level];
  const g = c.createGain();
  g.gain.value = [0.35, 0.65, 1][level];
  src.connect(g).connect(metroBus);
  src.start(time);
}

function pluckBuffer(midi, muted) {
  const key = muted ? -midi : midi;
  const cached = plucks.get(key);
  if (cached) return cached;
  const sr = ctx.sampleRate;
  const freq = 440 * 2 ** ((midi - 69) / 12);
  // The two-point average in the loop adds half a sample of delay; playbackRate corrects the remaining error.
  const N = Math.max(2, Math.floor(sr / freq - 0.5));
  const rate = freq / (sr / (N + 0.5));
  const t60 = muted ? 0.09 : 4 * (82 / freq) ** 0.45;
  const loss = 10 ** (-3 / (t60 * freq));
  const len = Math.floor(sr * (muted ? 0.2 : Math.min(3, t60 * 0.9)));
  const buffer = ctx.createBuffer(1, len, sr);
  const out = buffer.getChannelData(0);
  const loop = new Float32Array(N);
  const bright = muted ? 0.18 : 0.5;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += bright * (Math.random() * 2 - 1 - lp);
    loop[i] = lp;
  }
  // comb notch at the picking point, about 1/8 of the string length from the bridge
  const pick = Math.max(1, Math.round(N / 8));
  for (let i = N - 1; i >= pick; i--) loop[i] -= 0.9 * loop[i - pick];
  const mean = loop.reduce((a, b) => a + b, 0) / N;
  for (let i = 0; i < N; i++) loop[i] -= mean;
  let idx = 0;
  let peak = 0;
  for (let n = 0; n < len; n++) {
    const next = idx + 1 === N ? 0 : idx + 1;
    out[n] = loop[idx];
    loop[idx] = loss * 0.5 * (loop[idx] + loop[next]);
    idx = next;
    peak = Math.max(peak, Math.abs(out[n]));
  }
  const fade = Math.floor(sr * 0.05);
  for (let n = 0; n < len; n++) out[n] *= (0.5 / peak) * Math.min(1, (len - n) / fade);
  const entry = { buffer, rate };
  plucks.set(key, entry);
  return entry;
}

/** Renders the buffers ahead of playback so the first notes do not stall the scheduler. */
export function prepare(midis) {
  audioContext();
  for (const m of midis) pluckBuffer(m, false);
}

export function damp(string, time) {
  const v = voices[string];
  if (!v) return;
  v.gain.gain.setTargetAtTime(0, Math.max(time, v.start), 0.012);
  v.src.stop(Math.max(time, v.start) + 0.1);
  voices[string] = null;
}

export function dampAll(time = ctx?.currentTime ?? 0) {
  for (let s = 1; s <= 6; s++) damp(s, time);
}

export function pluck(time, string, midi, gain = 0.8, muted = false) {
  const c = audioContext();
  const { buffer, rate } = pluckBuffer(midi, muted);
  damp(string, time);
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(guitarBus);
  src.start(time);
  const voice = { src, gain: g, start: time };
  voices[string] = voice;
  src.onended = () => {
    if (voices[string] === voice) voices[string] = null;
    g.disconnect();
  };
}

/**
 * Strums a chord shape (frets listed from string 6 to 1, −1 = muted).
 * D = down from string 6, U = up over the top four strings, X = muted chop.
 */
export function strum(time, frets, capo, dir, accent = false) {
  const order = dir === 'U' ? [1, 2, 3, 4] : [6, 5, 4, 3, 2, 1];
  const step = dir === 'U' ? 0.008 : dir === 'X' ? 0.005 : 0.011;
  const base = (dir === 'U' ? 0.42 : 0.6) * (accent ? 1.15 : 1);
  let k = 0;
  for (const s of order) {
    const fret = frets[6 - s];
    if (fret < 0) {
      if (dir !== 'U') damp(s, time);
      continue;
    }
    pluck(time + k * step, s, TUNING[s] + capo + fret, base, dir === 'X');
    k++;
  }
}

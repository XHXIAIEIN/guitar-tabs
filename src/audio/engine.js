// Web Audio output: metronome clicks and a guitar played from recorded classical guitar samples.
import { TUNING } from '../music/theory.js';

let ctx = null;
let metroBus;
let guitarBus;
const volumes = { metronome: 0.8, guitar: 0.8 };
const clickBuffers = [];
/** Latest scheduled voice per string (index = string number), so a new note can damp the old one. */
const voices = new Array(7).fill(null);

/**
 * Recordings in audio/guitar/ (FreePats Spanish classical guitar, CC0): [MIDI pitch, tuning error in cents].
 * The files are WAV named .sample, because download managers intercept requests for .wav and open a dialog per file.
 * The errors were measured with the tuner's detectPitch; playback subtracts them.
 */
const RECORDINGS = [[40, 1], [43, 10], [47, 7], [50, 5], [53, 4], [56, 7], [59, 13], [62, 8], [65, 3], [69, 5], [72, 12], [75, 4], [78, 4], [81, 10], [84, 9]];
/** Loaded samples: { midi, cents, buffer, start, level }, see measure() */
let samples = null;
let loading = null;

export class AudioLoadError extends Error {}

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
  guitarBus = ctx.createGain();
  guitarBus.connect(comp);
  applyVolumes();
  return ctx;
}

/** Must run inside a user gesture the first time: browsers keep audio suspended until then. */
export async function resumeAudio() {
  const c = audioContext();
  if (c.state !== 'running') await c.resume();
  return c;
}

/** resumeAudio plus the guitar samples. Call it in the gesture that starts guitar sound. */
export async function resumeGuitar() {
  const [c] = await Promise.all([resumeAudio(), loadSamples()]);
  return c;
}

/** Fetches and decodes the guitar samples. Needs no user gesture, so the app starts it at launch. */
export function loadSamples() {
  loading ??= (async () => {
    // Decoded at the files' own rate; an AudioBuffer plays in any context.
    const decoder = new OfflineAudioContext(1, 1, 22050);
    try {
      samples = await Promise.all(RECORDINGS.map(async ([midi, cents]) => {
        const res = await fetch(new URL(`../../audio/guitar/${midi}.sample`, import.meta.url));
        if (!res.ok) throw new Error(`${midi}.sample: HTTP ${res.status}`);
        const buffer = await decoder.decodeAudioData(await res.arrayBuffer());
        return { midi, cents, buffer, ...measure(buffer) };
      }));
    } catch (e) {
      loading = null; // the next play tries again
      throw new AudioLoadError('吉他音色载入失败，请检查网络后再点一次播放。', { cause: e });
    }
  })();
  return loading;
}

/**
 * start: seconds of silence before the attack, skipped so that notes sound on the beat.
 * level: gain that evens out the recordings' loudness over their first 0.3 s.
 */
function measure(buffer) {
  const d = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const peak = d.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const from = Math.max(0, d.findIndex((v) => Math.abs(v) > peak * 0.1) - Math.round(sr * 0.002));
  const n = Math.min(d.length - from, Math.round(sr * 0.3));
  let sum = 0;
  for (let i = from; i < from + n; i++) sum += d[i] * d[i];
  return { start: from / sr, level: 0.1 / Math.sqrt(sum / n) };
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

/** Plays `midi` on `string` from the nearest recording; muted keeps only a dark, short attack. */
export function pluck(time, string, midi, gain = 0.8, muted = false) {
  const c = audioContext();
  if (!samples) throw new Error('guitar samples are not loaded: start guitar sound with resumeGuitar()');
  const s = samples.reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));
  const rate = 2 ** ((midi - s.midi) / 12 - s.cents / 1200);
  damp(string, time);
  const src = c.createBufferSource();
  src.buffer = s.buffer;
  src.playbackRate.value = rate;
  const g = c.createGain();
  g.gain.setValueAtTime(gain * s.level, time);
  if (muted) {
    const dark = c.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 1400;
    g.gain.setTargetAtTime(0, time + 0.01, 0.012);
    src.connect(dark).connect(g);
  } else src.connect(g);
  g.connect(guitarBus);
  src.start(time, s.start);
  if (muted) src.stop(time + 0.15);
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

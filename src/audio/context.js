// The shared Web Audio context, its output buses and their volumes.
import { config } from '../core/config.js';

let ctx = null;
const buses = {};
const volumes = {};

export function audioContext() {
  if (ctx) return ctx;
  // iOS silences Web Audio while the ring/silent switch is on unless the session is declared as playback.
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
  ctx = new AudioContext({ latencyHint: 'interactive' });
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = config.audio.compressor.threshold;
  comp.ratio.value = config.audio.compressor.ratio;
  comp.connect(ctx.destination);
  for (const kind of ['metronome', 'guitar']) {
    buses[kind] = ctx.createGain();
    buses[kind].connect(comp);
  }
  applyVolumes();
  return ctx;
}

/** The gain node that sounds of `kind` connect to. Creates the context on first use. */
export function bus(kind) {
  audioContext();
  return buses[kind];
}

/** Must run inside a user gesture the first time: browsers keep audio suspended until then. */
export async function resumeAudio() {
  const c = audioContext();
  if (c.state !== 'running') await c.resume();
  return c;
}

/** Seconds between scheduling a sound and hearing it. */
export const outputLatency = () => (ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0);

/** The context's clock, or 0 before the context exists. */
export const audioNow = () => ctx?.currentTime ?? 0;

function applyVolumes() {
  // squared so the slider feels even to the ear
  for (const [kind, gain] of Object.entries(buses)) gain.gain.value = (volumes[kind] ?? 0) ** 2 * config.audio.busGain[kind];
}

export function setVolume(kind, value) {
  volumes[kind] = value;
  applyVolumes();
}

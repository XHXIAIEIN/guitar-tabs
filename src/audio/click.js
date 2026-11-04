// The metronome click: a short synthesized tone per accent level.
import { audioContext, bus } from './context.js';

const buffers = [];

function clickBuffer(c, freq) {
  const sr = c.sampleRate;
  const n = Math.floor(sr * 0.06);
  const buf = c.createBuffer(1, n, sr);
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
  if (!buffers.length) buffers.push(clickBuffer(c, 1050), clickBuffer(c, 1500), clickBuffer(c, 2100));
  const src = c.createBufferSource();
  src.buffer = buffers[level];
  const g = c.createGain();
  g.gain.value = [0.35, 0.65, 1][level];
  src.connect(g).connect(bus('metronome'));
  src.start(time);
}

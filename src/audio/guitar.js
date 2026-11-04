// The guitar voice: plucks, strums and damping, one sounding voice per string.
import { TUNING } from '../music/pitch.js';
import { audioContext, audioNow, bus, resumeAudio } from './context.js';
import { loadSamples, nearestSample } from './samples.js';

/** Latest scheduled voice per string (index = string number), so a new note can damp the old one. */
const voices = new Array(7).fill(null);

/** resumeAudio plus the guitar samples. Call it in the gesture that starts guitar sound. */
export async function resumeGuitar() {
  const [c] = await Promise.all([resumeAudio(), loadSamples()]);
  return c;
}

function damp(string, time) {
  const v = voices[string];
  if (!v) return;
  v.gain.gain.setTargetAtTime(0, Math.max(time, v.start), 0.012);
  v.src.stop(Math.max(time, v.start) + 0.1);
  voices[string] = null;
}

export function dampAll(time = audioNow()) {
  for (let s = 1; s <= 6; s++) damp(s, time);
}

/** Plays `midi` on `string` from the nearest recording; muted keeps only a dark, short attack. */
export function pluck(time, string, midi, gain = 0.8, muted = false) {
  const c = audioContext();
  const s = nearestSample(midi);
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
  g.connect(bus('guitar'));
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

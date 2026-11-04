// The recorded classical guitar samples (FreePats, CC0) listed in config.audio.samples.
// Each recording has a MIDI pitch and a tuning error in cents, measured with detectPitch; playback subtracts the error.
import { config } from '../core/config.js';
import { t } from '../core/i18n.js';

/** Loaded samples: { midi, cents, buffer, start, level }, see measure() */
let samples = null;
let loading = null;

export class AudioLoadError extends Error {}

/** Fetches and decodes the guitar samples. Needs no user gesture, so the app starts it at launch. */
export function loadSamples() {
  loading ??= (async () => {
    // Decoded at the files' own rate; an AudioBuffer plays in any context.
    const decoder = new OfflineAudioContext(1, 1, 22050);
    const { path, recordings } = config.audio.samples;
    try {
      samples = await Promise.all(recordings.map(async ([midi, cents]) => {
        const res = await fetch(new URL(`../../${path}/${midi}.sample`, import.meta.url));
        if (!res.ok) throw new Error(`${midi}.sample: HTTP ${res.status}`);
        const buffer = await decoder.decodeAudioData(await res.arrayBuffer());
        return { midi, cents, buffer, ...measure(buffer) };
      }));
    } catch (e) {
      loading = null; // the next play tries again
      throw new AudioLoadError(t('errors.audioLoad'), { cause: e });
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

/** The loaded recording closest to `midi`. */
export function nearestSample(midi) {
  if (!samples) throw new Error('guitar samples are not loaded: start guitar sound with resumeGuitar()');
  return samples.reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));
}

// Tap tempo: turns a series of button presses into a BPM.
import { config } from '../../core/config.js';

/** Returns the function to call on each tap; it reports a BPM once enough taps came in close succession. */
export function tapTempo(onBpm) {
  const taps = [];
  return () => {
    const { resetMs, minTaps, window } = config.tapTempo;
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > resetMs) taps.length = 0;
    taps.push(now);
    if (taps.length >= minTaps) {
      const recent = taps.slice(-window);
      onBpm((60000 * (recent.length - 1)) / (recent[recent.length - 1] - recent[0]));
    }
  };
}

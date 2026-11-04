// Pitch detection for the tuner and for measuring the recordings' tuning errors.

/** YIN pitch estimate in Hz, or null for silence or noise. Works on a 2× decimated copy to save CPU. */
export function detectPitch(input, sampleRate) {
  const n = input.length >> 1;
  const buf = new Float32Array(n);
  let rms = 0;
  for (let i = 0; i < n; i++) {
    buf[i] = (input[2 * i] + input[2 * i + 1]) / 2;
    rms += buf[i] * buf[i];
  }
  if (Math.sqrt(rms / n) < 0.008) return null;
  const sr = sampleRate / 2;
  const minLag = Math.floor(sr / 1000);
  const maxLag = Math.min(Math.floor(sr / 60), n >> 1);
  const W = n - maxLag;
  const d = new Float32Array(maxLag + 2);
  for (let tau = 1; tau <= maxLag + 1; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  let running = 0;
  const cm = new Float32Array(maxLag + 2);
  cm[0] = 1;
  for (let tau = 1; tau <= maxLag + 1; tau++) {
    running += d[tau];
    cm[tau] = running ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = minLag; t <= maxLag; t++) {
    if (cm[t] < 0.15) {
      while (t + 1 <= maxLag && cm[t + 1] < cm[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  const a = cm[tau - 1];
  const b = cm[tau];
  const c = cm[tau + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0;
  return sr / (tau + shift);
}

export interface Voice { cancel(): void }

export function scheduleReference(
  context: AudioContext, midi: number, start: number, duration: number,
  muted: boolean, onEnd: (voice: Voice) => void,
): Voice {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), start);
  const level = muted ? 0 : 0.055;
  const attack = Math.min(0.008, duration / 4);
  const release = Math.min(0.025, duration / 4);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(level, start + attack);
  gain.gain.linearRampToValueAtTime(level * 0.45, start + duration - release);
  gain.gain.linearRampToValueAtTime(0, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    oscillator.disconnect();
    gain.disconnect();
    onEnd(voice);
  };
  const voice: Voice = {
    cancel() {
      if (finished) return;
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* The source may have ended between timer ticks. */ }
      finish();
    },
  };
  oscillator.onended = finish;
  oscillator.start(start);
  oscillator.stop(start + duration);
  return voice;
}

interface AudioSession { type: string }
export function playbackSession(): (() => void) | undefined {
  const session = typeof navigator === 'undefined' ? undefined :
    (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
  if (!session) return;
  try {
    const previous = session.type;
    session.type = 'playback';
    return () => { try { if (session.type === 'playback') session.type = previous; } catch {} };
  } catch { return; }
}

export function createPlaybackContext(): AudioContext {
  const host = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const Constructor = host.AudioContext ?? host.webkitAudioContext;
  if (!Constructor) throw new Error('playback.audioUnavailable');
  return new Constructor();
}

export function resumeAudio(context: AudioContext, timeoutMs = 5000): Promise<void> {
  if (context.state === 'running') return Promise.resolve();
  if (context.state === 'closed') return Promise.reject(new Error('playback.audioUnavailable'));
  // Safari needs resume() and source.start() inside the play button's click.
  const resumed = context.resume();
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, 22050);
  source.connect(context.destination);
  source.onended = () => source.disconnect();
  source.start();
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('playback.audioUnavailable')), timeoutMs);
    resumed.then(() => {
      clearTimeout(timeout);
      if (context.state !== 'running') reject(new Error('playback.audioUnavailable'));
      else resolve();
    }, () => { clearTimeout(timeout); reject(new Error('playback.audioUnavailable')); });
  });
}

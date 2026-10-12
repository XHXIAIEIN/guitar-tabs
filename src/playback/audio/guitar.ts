export interface Voice { cancel(): void }
export interface Instrument {
  prepare(context: BaseAudioContext): Promise<void>;
  schedule(context: BaseAudioContext, midi: number, start: number, duration: number,
    muted: boolean, onEnd: (voice: Voice) => void, elapsed?: number): Voice | undefined;
}

export const GUITAR_SAMPLES = [
  { midi: 40, url: new URL('../../assets/audio/guitar/40.wav', import.meta.url).href },
  { midi: 43, url: new URL('../../assets/audio/guitar/43.wav', import.meta.url).href },
  { midi: 47, url: new URL('../../assets/audio/guitar/47.wav', import.meta.url).href },
  { midi: 50, url: new URL('../../assets/audio/guitar/50.wav', import.meta.url).href },
  { midi: 53, url: new URL('../../assets/audio/guitar/53.wav', import.meta.url).href },
  { midi: 56, url: new URL('../../assets/audio/guitar/56.wav', import.meta.url).href },
  { midi: 59, url: new URL('../../assets/audio/guitar/59.wav', import.meta.url).href },
  { midi: 62, url: new URL('../../assets/audio/guitar/62.wav', import.meta.url).href },
  { midi: 65, url: new URL('../../assets/audio/guitar/65.wav', import.meta.url).href },
  { midi: 69, url: new URL('../../assets/audio/guitar/69.wav', import.meta.url).href },
  { midi: 72, url: new URL('../../assets/audio/guitar/72.wav', import.meta.url).href },
  { midi: 75, url: new URL('../../assets/audio/guitar/75.wav', import.meta.url).href },
  { midi: 78, url: new URL('../../assets/audio/guitar/78.wav', import.meta.url).href },
  { midi: 81, url: new URL('../../assets/audio/guitar/81.wav', import.meta.url).href },
  { midi: 84, url: new URL('../../assets/audio/guitar/84.wav', import.meta.url).href },
] as const;

type SampleLoader = (context: BaseAudioContext, url: string) => Promise<AudioBuffer>;
async function loadSample(context: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => { controller.abort(); reject(new Error('playback.sampleUnavailable')); }, 15000);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('playback.sampleUnavailable');
      return context.decodeAudioData(await response.arrayBuffer());
    })()]);
  } finally { clearTimeout(timeout!); }
}

export class GuitarSampler implements Instrument {
  private buffers = new Map<number, AudioBuffer>();
  private loading?: Promise<void>;
  constructor(private loader: SampleLoader = loadSample) {}

  async prepare(context: BaseAudioContext): Promise<void> {
    if (this.buffers.size === GUITAR_SAMPLES.length) return;
    this.loading ??= Promise.all(GUITAR_SAMPLES.map(async sample =>
      [sample.midi, await this.loader(context, sample.url)] as const))
      .then(entries => { this.buffers = new Map(entries); })
      .catch(() => { throw new Error('playback.sampleUnavailable'); })
      .finally(() => { this.loading = undefined; });
    await this.loading;
  }

  schedule(context: BaseAudioContext, midi: number, start: number, duration: number,
    muted: boolean, onEnd: (voice: Voice) => void, elapsed = 0): Voice | undefined {
    const root = GUITAR_SAMPLES.reduce((nearest, sample) =>
      Math.abs(sample.midi - midi) < Math.abs(nearest.midi - midi) ? sample : nearest);
    const buffer = this.buffers.get(root.midi);
    if (!buffer) throw new Error('playback.sampleUnavailable');
    const rate = 2 ** ((midi - root.midi) / 12);
    const offset = elapsed * rate;
    if (offset >= buffer.duration) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(rate, start);
    const end = start + Math.min(duration, (buffer.duration - offset) / rate);
    const level = muted ? 0 : 0.15;
    const attack = Math.min(0.003, (end - start) / 4);
    const release = Math.min(0.025, (end - start) / 4);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.setValueAtTime(level, end - release);
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain);
    gain.connect(context.destination);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      source.disconnect(); gain.disconnect(); onEnd(voice);
    };
    const voice: Voice = {
      cancel() {
        if (finished) return;
        source.onended = null;
        try { source.stop(); } catch { /* The sample may have ended between timer ticks. */ }
        finish();
      },
    };
    source.onended = finish;
    source.start(start, offset);
    source.stop(end);
    return voice;
  }
}

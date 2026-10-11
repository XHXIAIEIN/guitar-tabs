import { scheduleReference, type Voice } from '../audio/reference';
import type { Timeline } from '../timeline';

export interface PlaybackState {
  position: number;
  playing: boolean;
  beatId?: string;
  barId?: string;
  queuedVoices: number;
}
export interface TransportOptions {
  context?: AudioContext;
  onUpdate?: (state: PlaybackState) => void;
  muted?: boolean;
}
export class PlaybackTransport {
  private context?: AudioContext;
  private ownsContext: boolean;
  private timeline?: Timeline;
  private playing = false;
  private loop = false;
  private offset = 0;
  private anchor = 0;
  private eventIndex = 0;
  private cycle = 0;
  private generation = 0;
  private scheduledVoices = 0;
  private voices = new Set<Voice>();
  private timer?: ReturnType<typeof setInterval>;
  private disposed = false;

  constructor(private options: TransportOptions = {}) {
    this.context = options.context;
    this.ownsContext = !options.context;
  }
  get position(): number {
    const duration = this.timeline?.duration ?? 0;
    const elapsed = this.playing ? this.offset + Math.max(0, this.context!.currentTime - this.anchor) : this.offset;
    return this.loop && duration > 0 && this.playing ? elapsed % duration : Math.min(elapsed, duration);
  }
  get state(): PlaybackState {
    const position = this.position;
    const beats = this.timeline?.beats ?? [];
    let low = 0;
    let high = beats.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (beats[middle].time <= position) low = middle + 1;
      else high = middle;
    }
    const beat = beats[low - 1];
    const current = beat && position < beat.time + beat.duration ? beat : undefined;
    return { position, playing: this.playing, barId: current?.barId, beatId: current?.beatId, queuedVoices: this.voices.size };
  }
  get diagnostics(): { generation: number; queuedVoices: number; scheduledVoices: number } {
    return { generation: this.generation, queuedVoices: this.voices.size, scheduledVoices: this.scheduledVoices };
  }
  async play(timeline: Timeline, fromSeconds = 0, loop = false): Promise<void> {
    if (this.disposed) throw new Error('playback.disposed');
    this.validateTimeline(timeline);
    if (!Number.isFinite(fromSeconds)) throw new Error('playback.invalidPosition');
    this.cancelAudio();
    this.timeline = timeline;
    this.loop = loop;
    this.offset = Math.max(0, Math.min(fromSeconds, timeline.duration));
    if (loop && this.offset === timeline.duration) this.offset = 0;
    const generation = this.generation;
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== 'running') await this.context.resume();
    }
    catch { throw new Error('playback.audioUnavailable'); }
    if (generation !== this.generation || this.disposed) return;
    this.anchor = this.context.currentTime + 0.025;
    this.playing = true;
    this.eventIndex = 0;
    this.cycle = 0;
    this.scheduledVoices = 0;
    while (this.eventIndex < timeline.events.length && timeline.events[this.eventIndex].time + timeline.events[this.eventIndex].duration <= this.offset) this.eventIndex++;
    this.tick();
    if (this.playing) this.timer = setInterval(() => this.tick(), 25);
  }
  pause(): void {
    this.offset = this.position;
    this.cancelAudio();
    this.emit();
  }
  stop(): void {
    this.cancelAudio();
    this.offset = 0;
    this.emit();
  }
  async seek(seconds: number): Promise<void> {
    if (!Number.isFinite(seconds)) throw new Error('playback.invalidPosition');
    const playing = this.playing;
    const timeline = this.timeline;
    this.cancelAudio();
    this.offset = Math.max(0, Math.min(seconds, timeline?.duration ?? 0));
    if (playing && timeline) await this.play(timeline, this.offset, this.loop);
    else this.emit();
  }
  async replaceTimeline(timeline: Timeline): Promise<void> {
    if (this.disposed) throw new Error('playback.disposed');
    this.validateTimeline(timeline);
    const position = this.position * timeline.duration / (this.timeline?.duration ?? timeline.duration);
    if (this.playing) await this.play(timeline, position, this.loop);
    else {
      this.cancelAudio();
      this.timeline = timeline;
      this.offset = position;
      this.emit();
    }
  }
  async dispose(): Promise<void> {
    this.stop();
    this.disposed = true;
    if (this.ownsContext && this.context && this.context.state !== 'closed') await this.context.close();
  }
  private tick(): void {
    if (!this.playing || !this.context || !this.timeline) return;
    const elapsed = this.offset + Math.max(0, this.context.currentTime - this.anchor);
    if (!this.loop && elapsed >= this.timeline.duration) {
      this.offset = this.timeline.duration;
      this.cancelAudio();
      this.emit();
      return;
    }
    const horizon = this.offset + this.context.currentTime - this.anchor + 0.12;
    const events = this.timeline.events;
    const currentCycle = Math.floor(elapsed / this.timeline.duration);
    if (this.loop && currentCycle > this.cycle) {
      this.cycle = currentCycle;
      this.eventIndex = 0;
    }
    if (events.length) {
      while (true) {
        if (this.eventIndex >= events.length) {
          if (!this.loop) break;
          this.eventIndex = 0;
          this.cycle++;
        }
        const event = events[this.eventIndex];
        const time = event.time + this.cycle * this.timeline.duration;
        if (time > horizon) break;
        const end = this.anchor + time + event.duration - this.offset;
        const start = Math.max(this.anchor + time - this.offset, this.context.currentTime + 0.003);
        if (end > start) {
          const voice = scheduleReference(this.context, event.midi, start, end - start, this.options.muted ?? false, voice => this.voices.delete(voice));
          this.voices.add(voice);
          this.scheduledVoices++;
        }
        this.eventIndex++;
      }
    }
    this.emit();
  }
  private cancelAudio(): void {
    this.generation++;
    this.playing = false;
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
    for (const voice of this.voices) voice.cancel();
    this.voices.clear();
  }
  private validateTimeline(timeline: Timeline): void {
    if (!Number.isFinite(timeline.duration) || timeline.duration <= 0 ||
      timeline.events.some(event => !Number.isFinite(event.time) || !Number.isFinite(event.duration) || !Number.isFinite(event.midi) || event.time < 0 || event.duration <= 0 || event.time + event.duration > timeline.duration + 1e-8)) {
      throw new Error('playback.invalidTimeline');
    }
  }
  private emit(): void { this.options.onUpdate?.(this.state); }
}

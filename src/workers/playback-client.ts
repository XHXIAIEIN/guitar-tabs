import type { TabScore } from '../score/model';
import type { BarRange, Timeline } from '../playback/timeline';
import type { PlaybackReply, PlaybackRequest } from '../playback/timeline/protocol';

interface Pending {
  version: number;
  timer: ReturnType<typeof setTimeout>;
  resolve: (timeline: Timeline) => void;
  reject: (error: Error) => void;
}
export class PlaybackWorkerClient {
  private worker: Worker;
  private nextId = 0;
  private version = 0;
  private pending = new Map<number, Pending>();
  private disposed = false;
  private failed = false;
  public lastReply?: { worker: true; version: number; elapsedMs: number };

  constructor(private factory = () => new Worker(new URL('./playback.worker.ts', import.meta.url), { type: 'module', name: 'playback' })) {
    this.worker = this.createWorker();
  }
  private createWorker(): Worker {
    const worker = this.factory();
    worker.onmessage = ({ data }: MessageEvent<PlaybackReply>) => this.receive(data);
    worker.onerror = event => { event.preventDefault(); this.failed = true; this.fail('playback.workerFailed'); };
    worker.onmessageerror = () => { this.failed = true; this.fail('playback.invalidReply'); };
    return worker;
  }
  build(score: TabScore, version: number, speed = 1, range?: BarRange): Promise<Timeline> {
    if (this.disposed) return Promise.reject(new Error('playback.disposed'));
    if (this.failed) return Promise.reject(new Error('playback.workerFailed'));
    this.cancel();
    this.version = version;
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('playback.timeout')); }, 15000);
      this.pending.set(id, { version, timer, resolve, reject });
      try { this.worker.postMessage({ id, version, score, speed, range } satisfies PlaybackRequest); }
      catch { this.fail('playback.workerFailed'); }
    });
  }
  cancel(): void {
    if (!this.pending.size) return;
    this.fail('playback.cancelled');
    this.worker.terminate();
    if (!this.disposed) this.worker = this.createWorker();
  }
  retry(): void {
    if (this.disposed) throw new Error('playback.disposed');
    this.fail('playback.cancelled');
    this.worker.terminate();
    this.failed = false;
    this.worker = this.createWorker();
  }
  dispose(): void {
    this.disposed = true;
    this.fail('playback.disposed');
    this.worker.terminate();
  }
  private receive(reply: PlaybackReply): void {
    const pending = this.pending.get(reply.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(reply.id);
    if (reply.version !== this.version || reply.version !== pending.version) pending.reject(new Error('playback.cancelled'));
    else if (reply.error) pending.reject(new Error(reply.error));
    else if (!reply.worker || !reply.timeline) pending.reject(new Error('playback.invalidReply'));
    else {
      this.lastReply = { worker: true, version: reply.version, elapsedMs: reply.elapsedMs };
      pending.resolve(reply.timeline);
    }
  }
  private fail(code: string): void {
    for (const { timer, reject } of this.pending.values()) { clearTimeout(timer); reject(new Error(code)); }
    this.pending.clear();
  }
}

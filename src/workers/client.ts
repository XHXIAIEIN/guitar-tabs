import type { ReplyEnvelope, RequestEnvelope, ScoreTask } from './protocol';
export class StaleTaskError extends Error { constructor() { super('曲谱已变化，旧结果已取消。'); this.name = 'StaleTaskError'; } }
interface Pending { version: number; timer: ReturnType<typeof setTimeout>; resolve: (reply: ReplyEnvelope) => void; reject: (error: Error) => void }
export class ScoreWorkerClient {
  private worker: Worker;
  private nextId = 0;
  private version = 0;
  private pending = new Map<number, Pending>();
  constructor() { this.worker = this.createWorker(); }
  private createWorker(): Worker {
    const worker = new Worker(new URL('./score.worker.ts', import.meta.url), { type: 'module', name: 'score' });
    worker.onmessage = ({ data }: MessageEvent<ReplyEnvelope>) => this.receive(data);
    worker.onerror = event => { console.error('Score worker:', event.message); event.preventDefault(); this.fail(new Error('曲谱计算失败，请重试。')); };
    worker.onmessageerror = () => this.fail(new Error('曲谱结果无法读取，请重试。'));
    return worker;
  }
  setVersion(version: number): void {
    if (this.version === version) return;
    this.version = version;
    this.fail(new StaleTaskError());
  }
  request(task: ScoreTask): Promise<ReplyEnvelope> {
    const id = ++this.nextId;
    const version = this.version;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('曲谱计算超时，请重试。'));
      }, 15000);
      this.pending.set(id, { version, timer, resolve, reject });
      try { this.worker.postMessage({ id, version, task } satisfies RequestEnvelope); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  private receive(reply: ReplyEnvelope): void {
    const pending = this.pending.get(reply.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(reply.id);
    if (reply.version !== this.version || reply.version !== pending.version) pending.reject(new StaleTaskError());
    else if (reply.error) pending.reject(new Error(reply.error));
    else pending.resolve(reply);
  }
  private fail(error: Error): void {
    for (const { timer, reject } of this.pending.values()) { clearTimeout(timer); reject(error); }
    this.pending.clear();
  }
  retry(): void { this.fail(new Error('计算已重新开始。')); this.worker.terminate(); this.worker = this.createWorker(); }
  dispose(): void { this.fail(new Error('曲谱已关闭。')); this.worker.terminate(); }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeline, PlaybackTransport } from '../src/playback/index.ts';
import { PlaybackWorkerClient } from '../src/workers/playback-client.ts';
import type { TabScore, ScoreBar } from '../src/score/model.ts';
import type { PlaybackReply, PlaybackRequest } from '../src/playback/timeline/protocol.ts';

function score(): TabScore {
  const bars: ScoreBar[] = [
    { id: 'a', tempo: 60, meter: [4, 4], key: 0, minor: false, beats: [
      { id: 'a1', startTick: 0, duration: 4, dots: 0, notes: [{ string: 1, fret: 0, tie: false }, { string: 2, fret: 3, tie: false }] },
      { id: 'a2', startTick: 960, duration: 4, dots: 0, notes: [] },
      { id: 'a3', startTick: 1920, duration: 2, dots: 0, notes: [{ string: 1, fret: 2, tie: false }] },
    ] },
    { id: 'b', tempo: 120, meter: [3, 4], key: 0, minor: false, beats: [
      { id: 'b1', startTick: 0, duration: 4, dots: 1, notes: [{ string: 1, fret: 2, tie: true }] },
      { id: 'b2', startTick: 1440, duration: 8, dots: 0, notes: [{ string: 1, fret: 2, tie: true }] },
    ] },
  ];
  return { schemaVersion: 1, title: '测试曲谱', tempo: 60, tuning: [64, 59, 55, 50, 45, 40], bars };
}
test('时间轴保留变速、和弦、休止、附点与跨小节延音', () => {
  const timeline = createTimeline(score());
  assert.equal(timeline.duration, 5.5);
  assert.equal(timeline.events.length, 3);
  assert.deepEqual(timeline.events.map(event => [event.time, event.duration, event.midi]), [[0, 1, 64], [0, 1, 62], [2, 3, 66]]);
  assert.deepEqual(timeline.beats.map(beat => [beat.time, beat.duration]), [[0, 1], [1, 1], [2, 2], [4, 0.75], [4.75, 0.25]]);
});
test('调速成比例改变时刻和时长，所选范围从零开始', () => {
  const original = createTimeline(score());
  const fast = createTimeline(score(), 2);
  assert.equal(fast.duration, original.duration / 2);
  assert.deepEqual(fast.events.map(event => event.duration), original.events.map(event => event.duration / 2));
  const range = createTimeline(score(), 1, { startBar: 1, endBar: 1 });
  assert.equal(range.duration, 1.5);
  assert.deepEqual(range.events.map(event => [event.time, event.duration, event.midi]), [[0, 1, 66]]);
  assert.equal(range.beats[0].barId, 'b');
  assert.throws(() => createTimeline(score(), 0), /playback.invalidSpeed/);
  assert.throws(() => createTimeline(score(), 1, { startBar: 1, endBar: 2 }), /playback.invalidRange/);
});

class FakeWorker {
  onmessage: ((event: MessageEvent<PlaybackReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  requests: PlaybackRequest[] = [];
  terminated = false;
  postMessage(request: PlaybackRequest) { this.requests.push(request); }
  terminate() { this.terminated = true; }
  reply(reply: PlaybackReply) { this.onmessage?.({ data: reply } as MessageEvent<PlaybackReply>); }
}
test('Worker 取消旧请求，拒绝错误版本，并允许失败后重试', async () => {
  const workers: FakeWorker[] = [];
  const client = new PlaybackWorkerClient(() => { const worker = new FakeWorker(); workers.push(worker); return worker as unknown as Worker; });
  const old = client.build(score(), 1);
  const cancelled = assert.rejects(old, /playback.cancelled/);
  const latest = client.build(score(), 2);
  await cancelled;
  assert.equal(workers[0].terminated, true);
  const request = workers[1].requests[0];
  workers[0].reply({ id: 1, version: 1, worker: true, elapsedMs: 1, timeline: createTimeline(score()) });
  const rejected = assert.rejects(latest, /playback.cancelled/);
  workers[1].reply({ id: request.id, version: 1, worker: true, elapsedMs: 1, timeline: createTimeline(score()) });
  await rejected;
  const failure = client.build(score(), 3);
  const failed = assert.rejects(failure, /playback.workerFailed/);
  workers[1].onerror?.({ preventDefault() {} } as ErrorEvent);
  await failed;
  client.retry();
  const good = client.build(score(), 4);
  const goodRequest = workers[2].requests[0];
  workers[2].reply({ id: goodRequest.id, version: 4, worker: true, elapsedMs: 0.5, timeline: createTimeline(score()) });
  assert.equal((await good).duration, 5.5);
  assert.deepEqual(client.lastReply, { worker: true, version: 4, elapsedMs: 0.5 });
  client.dispose();
  await assert.rejects(client.build(score(), 5), /playback.disposed/);
});

class FakeContext {
  currentTime = 10;
  state = 'running';
  destination = {};
  nodes: { start: number; end: number; stopped: boolean; disconnected: boolean; onended?: (() => void) | null }[] = [];
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  createOscillator() {
    const node = { start: 0, end: 0, stopped: false, disconnected: false };
    this.nodes.push(node);
    return { onended: null, type: '', frequency: { setValueAtTime() {} }, connect() {},
      disconnect() { node.disconnected = true; },
      start(time: number) { node.start = time; },
      stop(time?: number) { if (time === undefined) node.stopped = true; else node.end = time; },
    };
  }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
}
const tick = () => new Promise(resolve => setTimeout(resolve, 35));

test('live retiming preserves the current beat while playing, paused, and stopped', async () => {
  const context = new FakeContext();
  const transport = new PlaybackTransport({ context: context as unknown as AudioContext, muted: true });
  const original = createTimeline(score());
  const fast = createTimeline(score(), 2);
  await transport.play(original, 2.5);
  context.currentTime += 0.525;
  const beat = transport.state.beatId;
  const previousVoices = [...context.nodes];
  await transport.replaceTimeline(fast);
  assert.equal(transport.state.playing, true);
  assert.equal(transport.state.beatId, beat);
  assert.ok(Math.abs(transport.position - 1.5) < 1e-8);
  assert.ok(previousVoices.every(node => node.stopped && node.disconnected));
  assert.equal(transport.state.queuedVoices, 1);
  transport.pause();
  await transport.replaceTimeline(original);
  assert.equal(transport.state.playing, false);
  assert.equal(transport.state.beatId, beat);
  assert.ok(Math.abs(transport.position - 3) < 1e-8);
  assert.equal(transport.state.queuedVoices, 0);
  await assert.rejects(transport.replaceTimeline({ ...fast, duration: 0 }), /playback.invalidTimeline/);
  assert.ok(Math.abs(transport.position - 3) < 1e-8);
  await transport.play(original, transport.position);
  assert.equal(transport.state.beatId, beat);
  transport.stop();
  await transport.replaceTimeline(fast);
  assert.equal(transport.position, 0);
  assert.equal(transport.state.playing, false);
  await transport.dispose();
});

test('live retiming keeps the selected loop range and wraps at the new duration', async () => {
  const context = new FakeContext();
  const transport = new PlaybackTransport({ context: context as unknown as AudioContext, muted: true });
  const range = { startBar: 1, endBar: 1 };
  await transport.play(createTimeline(score(), 1, range), 0.6, true);
  await transport.replaceTimeline(createTimeline(score(), 2, range));
  assert.equal(transport.state.barId, 'b');
  assert.ok(Math.abs(transport.position - 0.3) < 1e-8);
  context.currentTime += 0.825;
  await tick();
  assert.equal(transport.state.playing, true);
  assert.ok(Math.abs(transport.position - 0.35) < 1e-8);
  assert.equal(transport.state.barId, 'b');
  await transport.dispose();
});

test('暂停、定位、停止和切换曲谱取消全部已排队节点', async () => {
  const context = new FakeContext();
  const transport = new PlaybackTransport({ context: context as unknown as AudioContext, muted: true });
  const timeline = createTimeline(score());
  await transport.play(timeline);
  assert.equal(transport.state.queuedVoices, 2);
  context.currentTime = 10.5;
  assert.ok(Math.abs(transport.position - 0.475) < 1e-8);
  transport.pause();
  assert.equal(transport.state.playing, false);
  assert.equal(transport.state.queuedVoices, 0);
  assert.ok(context.nodes.slice(0, 2).every(node => node.stopped && node.disconnected));
  await transport.play(timeline, transport.position);
  assert.equal(transport.state.queuedVoices, 2);
  const beforeSeek = context.nodes.length;
  await transport.seek(2.5);
  assert.equal(transport.state.beatId, 'a3');
  assert.equal(transport.state.queuedVoices, 1);
  assert.ok(context.nodes.slice(0, beforeSeek).every(node => node.stopped));
  await transport.play(createTimeline(score(), 2));
  assert.equal(transport.position, 0);
  transport.stop();
  assert.equal(transport.position, 0);
  assert.equal(transport.state.queuedVoices, 0);
  assert.ok(context.nodes.every(node => node.stopped && node.disconnected));
  await transport.dispose();
  assert.equal(context.state, 'running');
});
test('高亮跟随音频时钟，循环在选定小节边界返回并连续调度', async () => {
  const context = new FakeContext();
  const updates: string[] = [];
  const transport = new PlaybackTransport({ context: context as unknown as AudioContext, muted: true,
    onUpdate(state) { updates.push(state.beatId ?? ''); } });
  const timeline = createTimeline(score(), 1, { startBar: 1, endBar: 1 });
  await transport.play(timeline, 1.4, true);
  context.currentTime = 10.075;
  await tick();
  assert.equal(transport.diagnostics.scheduledVoices, 1);
  assert.ok(Math.abs(context.nodes[0].start - 10.125) < 1e-8);
  context.currentTime = 10.2;
  await tick();
  assert.ok(Math.abs(transport.position - 0.075) < 1e-8);
  assert.equal(transport.state.beatId, 'b1');
  assert.equal(updates.at(-1), 'b1');
  const beforeJump = transport.diagnostics.scheduledVoices;
  context.currentTime += 3600;
  await tick();
  assert.equal(transport.diagnostics.scheduledVoices, beforeJump + 1);
  assert.equal(transport.state.beatId, 'b1');
  transport.stop();
  assert.equal(transport.state.queuedVoices, 0);
  await transport.play(timeline);
  context.currentTime += timeline.duration + 0.03;
  await tick();
  assert.equal(transport.state.playing, false);
  assert.equal(transport.position, timeline.duration);
  assert.equal(transport.state.queuedVoices, 0);
  await transport.dispose();
});
test('在异步音频恢复期间停止，不会重新排队发声', async () => {
  const context = new FakeContext();
  context.state = 'suspended';
  let resume!: () => void;
  context.resume = () => new Promise<void>(resolve => { resume = resolve; });
  const transport = new PlaybackTransport({ context: context as unknown as AudioContext, muted: true });
  const playing = transport.play(createTimeline(score()));
  transport.stop();
  resume();
  await playing;
  assert.equal(transport.state.playing, false);
  assert.equal(context.nodes.length, 0);
  await transport.dispose();
});

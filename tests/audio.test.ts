import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GuitarSampler, GUITAR_SAMPLES } from '../src/playback/audio/guitar.ts';

class AudioGraph {
  destination = {};
  nodes: any[] = [];
  gains: number[] = [];
  createBufferSource() {
    const node = { buffer: undefined as any, rate: 1, offset: 0, startTime: 0, stopTime: 0,
      disconnected: false, stopped: false, onended: null as (() => void) | null,
      playbackRate: { setValueAtTime: (rate: number) => { node.rate = rate; } },
      connect() {}, disconnect() { node.disconnected = true; },
      start(time: number, offset: number) { node.startTime = time; node.offset = offset; },
      stop(time?: number) { if (time === undefined) node.stopped = true; else node.stopTime = time; },
    };
    this.nodes.push(node); return node;
  }
  createGain() {
    return { connect() {}, disconnect() {}, gain: {
      setValueAtTime: (value: number) => { this.gains.push(value); },
      linearRampToValueAtTime: (value: number) => { this.gains.push(value); },
    } };
  }
}

test('guitar transposition preserves sample decay and seek offset, with cancellable voices', async () => {
  const graph = new AudioGraph();
  const context = graph as unknown as BaseAudioContext;
  const sampler = new GuitarSampler(async (_audio, url) => ({ duration: 5, url }) as unknown as AudioBuffer);
  await sampler.prepare(context);
  let ended = 0;
  const voice = sampler.schedule(context, 66, 10, 1, false, () => { ended++; }, .5)!;
  assert.ok(graph.nodes[0].buffer.url.endsWith('/65.wav'));
  assert.equal(graph.nodes[0].rate, 2 ** (1 / 12));
  assert.equal(graph.nodes[0].offset, .5 * 2 ** (1 / 12));
  assert.equal(graph.nodes[0].startTime, 10);
  assert.equal(graph.nodes[0].stopTime, 11);
  assert.equal(Math.max(...graph.gains), .15);
  voice.cancel(); voice.cancel();
  assert.equal(ended, 1);
  assert.equal(graph.nodes[0].stopped, true);
  assert.equal(graph.nodes[0].disconnected, true);
  assert.equal(sampler.schedule(context, 65, 10, 1, false, () => {}, 6), undefined);
  assert.equal(graph.nodes.length, 1);
});

test('concurrent loads share the decoded instrument and a failure allows a complete retry', async () => {
  let requests = 0, failed = true;
  const sampler = new GuitarSampler(async () => {
    requests++;
    if (failed) throw new Error('decode');
    return { duration: 5 } as AudioBuffer;
  });
  const context = new AudioGraph() as unknown as BaseAudioContext;
  await assert.rejects(sampler.prepare(context), /playback.sampleUnavailable/);
  assert.equal(requests, GUITAR_SAMPLES.length);
  failed = false;
  await Promise.all([sampler.prepare(context), sampler.prepare(context)]);
  assert.equal(requests, GUITAR_SAMPLES.length * 2);
  await sampler.prepare(context);
  assert.equal(requests, GUITAR_SAMPLES.length * 2);
});

test('bundled samples use mono PCM WAV and contain a non-silent recorded signal', async () => {
  for (const sample of GUITAR_SAMPLES) {
    const file = await readFile(new URL(sample.url));
    assert.equal(file.toString('ascii', 0, 4), 'RIFF');
    assert.equal(file.toString('ascii', 8, 12), 'WAVE');
    assert.equal(file.readUInt16LE(20), 1);
    assert.equal(file.readUInt16LE(22), 1);
    assert.equal(file.readUInt32LE(24), 22050);
    assert.equal(file.readUInt16LE(34), 16);
    let at = 12;
    while (file.toString('ascii', at, at + 4) !== 'data') at += 8 + file.readUInt32LE(at + 4) + file.readUInt32LE(at + 4) % 2;
    let peak = 0;
    for (let i = at + 8; i < file.length; i += 2) peak = Math.max(peak, Math.abs(file.readInt16LE(i)));
    assert.ok(peak > 1000, `Sample ${sample.midi} needs an audible signal.`);
  }
});

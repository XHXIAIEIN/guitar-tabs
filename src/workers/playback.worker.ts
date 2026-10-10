import { createTimeline } from '../playback/timeline';
import type { PlaybackReply, PlaybackRequest } from '../playback/timeline/protocol';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PlaybackRequest>) => void) | null;
  postMessage: (reply: PlaybackReply) => void;
};
scope.onmessage = ({ data }) => {
  const start = performance.now();
  const reply: PlaybackReply = { id: data.id, version: data.version, worker: true, elapsedMs: 0 };
  try { reply.timeline = createTimeline(data.score, data.speed, data.range); }
  catch (error) {
    const code = error instanceof Error ? error.message : '';
    reply.error = code.startsWith('playback.') ? code : 'playback.invalidScore';
  }
  reply.elapsedMs = performance.now() - start;
  scope.postMessage(reply);
};

import { exportAlphaTex, parseAlphaTex } from '../formats/alphatex';
import { layoutBar } from '../notation/layout';
import { validateScore } from '../score/validate';
import type { RequestEnvelope, ReplyEnvelope } from './protocol';

const scope = self as unknown as { onmessage: ((event: MessageEvent<RequestEnvelope>) => void) | null; postMessage: (reply: ReplyEnvelope) => void };
scope.onmessage = ({ data: { id, version, task } }) => {
  const start = performance.now();
  const reply: ReplyEnvelope = { id, version, worker: true, elapsedMs: 0 };
  try {
    switch (task.kind) {
      case 'parse': reply.result = parseAlphaTex(task.text); break;
      case 'export': reply.result = exportAlphaTex(task.score); break;
      case 'layout':
        validateScore(task.score);
        reply.result = task.score.bars.filter(bar => !task.bars || task.bars.includes(bar.id)).map(bar => layoutBar(bar, task.width, task.settings));
        break;
    }
  } catch (error) { reply.error = error instanceof Error ? error.message : String(error); }
  reply.elapsedMs = performance.now() - start;
  scope.postMessage(reply);
};

import type { TabScore } from '../../score/model';
import type { BarRange, Timeline } from './index';

export interface PlaybackRequest {
  id: number;
  version: number;
  score: TabScore;
  speed: number;
  range?: BarRange;
}
export interface PlaybackReply {
  id: number;
  version: number;
  worker: true;
  elapsedMs: number;
  timeline?: Timeline;
  error?: string;
}

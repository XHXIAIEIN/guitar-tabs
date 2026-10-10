import type { TabScore } from '../score/model';
import type { DisplaySettings } from '../settings/display';
import type { BarLayout } from '../notation/layout';
export type ScoreTask =
  | { kind: 'parse'; text: string }
  | { kind: 'export'; score: TabScore }
  | { kind: 'layout'; score: TabScore; width: number; settings: DisplaySettings; bars?: string[] };
export interface RequestEnvelope { id: number; version: number; task: ScoreTask }
export interface ReplyEnvelope {
  id: number; version: number; worker: true; elapsedMs: number;
  result?: TabScore | string | BarLayout[];
  error?: string;
}

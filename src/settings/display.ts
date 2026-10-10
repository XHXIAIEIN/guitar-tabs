export interface DisplaySettings {
  left: { tab: boolean; string: boolean; pitch: boolean };
  right: { string: boolean; pitch: boolean };
  lineWeight: 'uniform' | 'graded';
  scale: number;
  stringGap: number;
  noteSize: number;
  showRhythm: boolean;
}
export const CANDIDATES: Record<'a' | 'b', DisplaySettings> = {
  a: { left: { tab: false, string: true, pitch: false }, right: { string: false, pitch: true }, lineWeight: 'uniform', scale: 1, stringGap: 18, noteSize: 23, showRhythm: true },
  b: { left: { tab: false, string: true, pitch: false }, right: { string: false, pitch: false }, lineWeight: 'graded', scale: 1, stringGap: 23, noteSize: 27, showRhythm: true }
};
export const DEFAULT_DISPLAY: DisplaySettings = {
  left: { tab: false, string: true, pitch: false },
  right: { string: false, pitch: false },
  lineWeight: 'uniform', scale: 1, stringGap: 18, noteSize: 22, showRhythm: false
};

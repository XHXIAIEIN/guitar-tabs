// Upgrades a saved state to the current schema. Each step changes only the fields that its schema changed.

export const SCHEMA = 2;

const STEPS = [
  // Schema 0 kept a showRevision setting. Every save wrote all of `show`, so an older revision holds 简谱 on as an
  // old default, not as a choice: before revision 1 the digits were on by default, before revision 2 the rhythm notes.
  // A save from when each side took several string labels holds a list: its first kind stays.
  (data) => {
    const settings = data.settings;
    if (!settings) return;
    const revision = settings.showRevision ?? 0;
    delete settings.showRevision;
    if (settings.show && revision < 1) settings.show.jianpu = false;
    if (settings.show && revision < 2) settings.show.rhythm = false;
    for (const side of ['left', 'right']) {
      const labels = settings.stringLabels;
      if (Array.isArray(labels?.[side])) labels[side] = labels[side][0] ?? 'none';
    }
  },
  // Every save wrote all the tool settings, so a schema 1 drill on C–G holds the old default, not a choice.
  (data) => {
    const drill = data.tools?.drill;
    if (drill?.chords?.join() === 'C,G') delete drill.chords;
  },
];

export function migrate(saved) {
  const data = structuredClone(saved);
  for (let schema = data.schema ?? 0; schema < SCHEMA; schema++) STEPS[schema](data);
  data.schema = SCHEMA;
  return data;
}

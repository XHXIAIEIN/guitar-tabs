// Reads a score file someone downloaded, or text someone pasted. Guitar Pro, MusicXML and Capella files go through
// alphaTab, which is loaded on the first import only; text tabs go through the text tab reader; alphaTex and ChordPro
// are already song text.
import { t } from '../../core/i18n.js';
import { isTextTab, textTabToAlphaTex } from './text-tab.js';

const ALPHATAB = new URL('../../../assets/vendor/alphatab/alphatab.min.js', import.meta.url).href;
const TEXT = ['atex', 'alphatex', 'cho', 'chordpro', 'chopro', 'crd', 'txt'];
const BINARY = ['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'gp7', 'xml', 'musicxml', 'mxl', 'capx'];

/** Extensions for the file picker. */
export const ACCEPT = [...TEXT, ...BINARY].map((ext) => '.' + ext).join(',');

let alphaTab = null;

/** The alphaTab module, fetched once. A failed fetch is not cached, so the next import tries again. */
export function loadAlphaTab() {
  alphaTab ??= import(ALPHATAB).catch((e) => {
    alphaTab = null;
    throw e;
  });
  return alphaTab;
}

/**
 * Song text and remarks for `text`: a text tab is converted, alphaTex or ChordPro is kept as it is. `source` is the
 * file name, or null for pasted text.
 */
export function readText(text, source) {
  if (isTextTab(text)) return textTabToAlphaTex(text, source);
  // song text starts with an alphaTex tag, a ChordPro directive or a comment
  if (!/^\s*[\\{/#]/.test(text)) throw new Error(t('import.noTab'));
  return { text, remarks: [] };
}

/**
 * Reads `file` ({ name, text(), arrayBuffer() }). Returns { text, remarks } for text, or { score, tracks } for a score
 * that still needs converting, where `tracks` lists the six-string tracks a song can be made from.
 */
export async function readScoreFile(file) {
  const ext = /\.([^.]+)$/.exec(file.name)?.[1].toLowerCase() ?? '';
  if (TEXT.includes(ext)) return readText(await file.text(), file.name);
  if (!BINARY.includes(ext)) throw new Error(t('import.unknownType', { name: file.name }));
  const [at, bytes] = await Promise.all([loadAlphaTab(), file.arrayBuffer()]);
  let score;
  try {
    score = at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes), new at.Settings());
  } catch (e) {
    throw new Error(t('import.unreadable', { name: file.name, reason: e.message }));
  }
  const tracks = score.tracks
    .map((track, index) => ({ index, name: track.name, staff: track.staves[0] }))
    .filter(({ staff }) => !staff.isPercussion && staff.tuning.length === 6)
    .map(({ index, name }) => ({ index, name }));
  if (!tracks.length) throw new Error(t('import.noGuitar', { name: file.name }));
  return { score, tracks };
}

// The block above the score: chips, note, chord strip, strum pattern, symbol legend and problems.
import { t } from '../../core/i18n.js';
import { h, fill } from '../../ui/dom.js';
import { chordDiagramEl } from '../../ui/chord-diagram-el.js';
import { openChordPanel } from '../../ui/chord-panel.js';
import { segmented } from '../../ui/controls.js';
import { renderScore } from '../../render/score/score.js';
import { restGlyph, shownRest, strumArrow } from '../../render/score/glyphs.js';
import { line } from '../../render/svg.js';
import { describeStrum, patternSong } from '../../music/format/pattern.js';
import { noteParts } from '../../music/format/syntax.js';
import { pretty } from '../../music/pitch.js';

const PROBLEMS_SHOWN = 4;
const FINGERS = ['T', '1', '2', '3', '4'];
const STRUM_DIRS = ['D', 'U', 'X'];
const BEAT_FRACTIONS = { 0.25: '¼', 0.33: '⅓', 0.38: '⅜', 0.5: '½', 0.67: '⅔', 0.75: '¾' };
// Whole and half rests differ only by the side of the line they touch, so their icons draw that line.
const REST_LINE = { w: -5.5, h: 2 };

const fingerMark = (finger, props) => h('span', { class: `finger finger-${finger}`, ...props }, finger);

function noteBlock(text) {
  const parts = noteParts(text);
  const note = h('p', { class: 'song-note' }, parts.map((part) => (typeof part === 'string' ? part : fingerMark(part.finger, { role: 'img', 'aria-label': t(`chords.finger.${part.finger}`) }))));
  const used = FINGERS.filter((finger) => parts.some((part) => part.finger === finger));
  if (!used.length) return note;
  return h('div', { class: 'song-note-block' },
    h('p', { class: 'finger-legend' }, used.map((finger) => h('span', null, fingerMark(finger, { 'aria-hidden': 'true' }), ` ${t(`chords.finger.${finger}`)}`))),
    note);
}

function symbolIcon(markup) {
  const el = h('span', { class: 'symbol-icon', 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="-8 -11 16 22">${markup}</svg>`;
  return el;
}

function restIcon(e) {
  const y = REST_LINE[e.base];
  return symbolIcon(restGlyph(e, 0, 0, 1) + (y === undefined ? '' : line(-7, y, 7, y, 'staff')));
}

/** One legend item for each distinct rest in the song, longest first. */
function restItems(song) {
  const rests = new Map(song.bars.flatMap((b) => b.events.filter((e) => e.kind === 'rest').map((e) => [e.dur, shownRest(e, b, b.meter)])));
  return [...rests.values()].sort((a, b) => b.dur - a.dur).map((e) => {
    const beats = Math.round((e.dur / song.meter.beatTicks) * 100) / 100;
    return [restIcon(e), t('legend.rest', { beats: BEAT_FRACTIONS[beats] ?? beats })];
  });
}

/** Explains the symbols that this song draws with the current display toggles and string labels. */
function symbolLegend(song, show, stringLabels) {
  const events = song.bars.flatMap((b) => b.events);
  if (!events.length) return null;
  const has = (test) => events.some(test);
  const hasNotes = has((e) => e.kind === 'note');
  const items = [
    show.tab && hasNotes && !Object.values(stringLabels).includes('number') && t('legend.strings'),
    show.tab && hasNotes && t('legend.frets'),
    show.tab && has((e) => e.notes.some((n) => n.f < 0)) && t('legend.muted'),
    ...(show.tab || show.rhythm ? restItems(song) : []),
    ...(show.tab
      ? STRUM_DIRS.filter((dir) => has((e) => e.kind === 'strum' && e.dir === dir)).map((dir) => [symbolIcon(strumArrow(dir, 0, -6.5, 1)), t(`legend.strum.${dir}`)])
      : []),
    show.rhythm && t('legend.notes'),
    (show.rhythm || show.numbers) && has((e) => e.tuplet) && t('legend.tuplet'),
    show.numbers && t('legend.numbers'),
  ].filter(Boolean);
  if (!items.length) return null;
  return h('p', { class: 'symbol-legend', role: 'note', 'aria-label': t('legend.title') }, items.map((item) => h('span', null, item)));
}

function strumBox(song, tonic) {
  const box = h('div', { class: 'strum-box' }, h('div', { class: 'strum-head' }, h('strong', null, t('song.strumPattern')), h('span', null, describeStrum(song.strum, song.meter))));
  const sc = h('div', { class: 'score mini' });
  box.append(sc);
  requestAnimationFrame(() => {
    if (!sc.isConnected) return;
    renderScore(sc, patternSong(song.strum, song.meta.time), {
      width: Math.min(sc.clientWidth, 340), scale: 1, show: { tab: true, numbers: false, rhythm: true, lyrics: false, chords: false }, chordLabel: pretty, tonic, barNumbers: false, notation: 'slash',
    });
  });
  return box;
}

/** @param o id, entry, song, prefs, perform, show, stringLabels, tonic, keyText, chordName(name), chooseVersion(version), openCapo, openTempo */
export function renderSongInfo(el, o) {
  const { song, prefs, perform } = o;
  const { meta } = song;
  const chip = (text, onclick) => (onclick ? h('button', { class: 'chip', type: 'button', onclick }, text) : h('span', { class: 'chip' }, text));
  const errors = song.errors.concat(song.warnings);
  fill(el,
    h('div', { class: 'chips' },
      o.entry.version ? segmented(o.entry.versions.map((v) => [v.id, t(`version.${v.id}`)]), o.entry.version.id, o.chooseVersion) : null,
      chip(o.keyText, o.openCapo),
      chip(meta.time.join('/')),
      chip(prefs.bpm !== meta.bpm ? t('song.tempoChipChanged', { bpm: prefs.bpm, original: meta.bpm }) : t('song.tempoChip', { bpm: prefs.bpm }), o.openTempo),
      o.entry.level ? chip(o.entry.level) : null,
    ),
    meta.instructions && !perform ? noteBlock(meta.instructions) : null,
    song.chordsUsed.length && o.show.chords
      ? h('div', { class: 'chord-strip', role: 'list', 'aria-label': t('song.chordStrip') },
          song.chordsUsed.map((c) => {
            const name = o.chordName(c);
            return h('button', { class: 'chord-card', type: 'button', role: 'listitem', title: t('song.chordTitle', { name: pretty(name) }), onclick: () => openChordPanel(name) }, chordDiagramEl(name));
          }))
      : null,
    song.strum && !perform ? strumBox(song, o.tonic) : null,
    perform ? null : symbolLegend(song, o.show, o.stringLabels),
    errors.length && !perform
      ? h('div', { class: 'alert' },
          h('strong', null, t('song.problems', { count: errors.length })),
          h('ul', null, errors.slice(0, PROBLEMS_SHOWN).map((e) => h('li', null, t('song.problemLine', { line: t('common.line', { line: e.line }), message: e.message })))),
          h('a', { href: `#/edit/${o.id}` }, t('song.goEdit')))
      : null,
  );
}

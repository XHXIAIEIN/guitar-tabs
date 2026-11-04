// The block above the score: chips, note, chord strip, strum pattern and problems.
import { t } from '../../core/i18n.js';
import { h, fill } from '../../ui/dom.js';
import { chordDiagramEl } from '../../ui/chord-diagram-el.js';
import { openChordPanel } from '../../ui/chord-panel.js';
import { renderScore } from '../../render/score/score.js';
import { describeStrum, patternSong } from '../../music/format/pattern.js';
import { noteParts } from '../../music/format/syntax.js';
import { pretty } from '../../music/pitch.js';

const PROBLEMS_SHOWN = 4;
const FINGERS = ['T', '1', '2', '3', '4'];

const fingerMark = (finger, props) => h('span', { class: `finger finger-${finger}`, ...props }, finger);

function noteBlock(text) {
  const parts = noteParts(text);
  const note = h('p', { class: 'song-note' }, parts.map((part) => (typeof part === 'string' ? part : fingerMark(part.finger, { role: 'img', 'aria-label': t(`chords.finger.${part.finger}`) }))));
  if (parts.every((part) => typeof part === 'string')) return note;
  return h('div', { class: 'song-note-block' },
    h('p', { class: 'finger-legend' }, FINGERS.map((finger) => h('span', null, fingerMark(finger, { 'aria-hidden': 'true' }), ` ${t(`chords.finger.${finger}`)}`))),
    note);
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

/** @param o id, entry, song, prefs, perform, show, tonic, keyText, chordName(name), openPractice, openCapo, openTempo */
export function renderSongInfo(el, o) {
  const { song, prefs, perform } = o;
  const { meta } = song;
  const chip = (text, onclick) => (onclick ? h('button', { class: 'chip', type: 'button', onclick }, text) : h('span', { class: 'chip' }, text));
  const errors = song.errors.concat(song.warnings);
  fill(el,
    h('div', { class: 'chips' },
      o.entry.version ? chip(t(`version.${o.entry.version.id}`), o.openPractice) : null,
      chip(o.keyText, o.openCapo),
      chip(meta.time.join('/')),
      chip(prefs.bpm !== meta.bpm ? t('song.tempoChipChanged', { bpm: prefs.bpm, original: meta.bpm }) : t('song.tempoChip', { bpm: prefs.bpm }), o.openTempo),
      meta.level ? chip(meta.level) : null,
    ),
    meta.note && !perform ? noteBlock(meta.note) : null,
    song.chordsUsed.length && o.show.chords
      ? h('div', { class: 'chord-strip', role: 'list', 'aria-label': t('song.chordStrip') },
          song.chordsUsed.map((c) => {
            const name = o.chordName(c);
            return h('button', { class: 'chord-card', type: 'button', role: 'listitem', title: t('song.chordTitle', { name: pretty(name) }), onclick: () => openChordPanel(name) }, chordDiagramEl(name));
          }))
      : null,
    song.strum && !perform ? strumBox(song, o.tonic) : null,
    errors.length && !perform
      ? h('div', { class: 'alert' },
          h('strong', null, t('song.problems', { count: errors.length })),
          h('ul', null, errors.slice(0, PROBLEMS_SHOWN).map((e) => h('li', null, t('song.problemLine', { line: t('common.line', { line: e.line }), message: e.message })))),
          h('a', { href: `#/edit/${o.id}` }, t('song.goEdit')))
      : null,
  );
}

// Writes one track of an alphaTab score as alphaTex in the subset the app reads. What the subset cannot hold is
// dropped or simplified, and each kind of change is listed in comments at the top of the text.
import { t } from '../../core/i18n.js';
import { chordName, lyricChunks } from '../format/syntax.js';
import { TICKS, writeAlphaTex } from './write-alphatex.js';

const STANDARD_TUNING = [64, 59, 55, 50, 45, 40];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// key names by number of sharps (negative for flats), from 7 flats to 7 sharps
const MAJOR = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const MINOR = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

/**
 * Returns { text, remarks } for track `trackIndex` of `score` (an alphaTab Score). `source` is the file name shown in
 * the first comment line.
 */
export function scoreToAlphaTex(score, trackIndex, source) {
  const track = score.tracks[trackIndex];
  const staff = track.staves[0];
  const counts = new Map();
  const count = (key, n = 1) => counts.set(key, (counts.get(key) ?? 0) + n);
  const remarks = [];
  // fret shift per string (index = string − 1) that keeps each note's pitch in standard tuning
  const shift = staff.tuning.map((p, i) => p - STANDARD_TUNING[i]);
  if (shift.some(Boolean)) remarks.push(t('import.tuning', { tuning: [...staff.tuning].reverse().map((p) => NOTE_NAMES[p % 12]).join(' ') }));

  const first = score.masterBars[0];
  const time = [first.timeSignatureNumerator, first.timeSignatureDenominator];
  const changedTime = score.masterBars.filter((mb) => mb.timeSignatureNumerator !== time[0] || mb.timeSignatureDenominator !== time[1]);
  if (changedTime.length) remarks.push(t('import.timeChange', { count: changedTime.length, bar: changedTime[0].index + 1, time: time.join('/') }));
  if (score.masterBars.some((mb) => mb.tempoAutomations.some((a) => a.value !== score.tempo))) remarks.push(t('import.tempoChange', { bpm: score.tempo }));
  if (score.masterBars.some((mb) => mb.isRepeatStart || mb.repeatCount > 0 || mb.alternateEndings)) remarks.push(t('import.repeats'));
  if (staff.bars.some((bar) => bar.voices.slice(1).some((v) => v.beats.some((b) => !b.isEmpty)))) remarks.push(t('import.voices'));

  const lyrics = [];
  const badChords = new Set();
  const bars = staff.bars.map((bar) => {
    const mb = bar.masterBar;
    const beats = [];
    for (const beat of bar.voices[0].beats) {
      if (beat.isEmpty) continue;
      if (beat.graceType) {
        count('grace');
        continue;
      }
      let dur = beat.duration;
      if (!TICKS[dur]) {
        count(dur > 16 ? 'short' : 'long');
        dur = dur > 16 ? 16 : 1;
      }
      if (beat.dots > 1) count('doubleDot');
      const triplet = beat.hasTuplet && beat.tupletNumerator === 3 && beat.tupletDenominator === 2;
      if (beat.hasTuplet && !triplet) count('tuplet');
      const notes = [];
      for (const n of beat.isRest ? [] : beat.notes) {
        if (n.isTieDestination) {
          count('tie');
          continue;
        }
        if (n.hasBend || n.slideInType || n.slideOutType || n.isHammerPullOrigin || n.harmonicType || n.vibrato || n.isTrill) count('technique');
        const s = 7 - n.string;
        const f = n.fret + shift[s - 1];
        if (n.isDead) notes.push(`x.${s}`);
        else if (f < 0) count('low');
        else notes.push(`${f}.${s}`);
      }
      const name = beat.chord?.name;
      const chord = name && chordName(name);
      if (name && !chord) badChords.add(name);
      if (notes.length) lyrics.push((beat.lyrics?.[0] ?? '').replace(/ /g, '+'));
      beats.push({ notes, dur, dotted: beat.dots > 0, triplet, chord });
    }
    return { section: mb.section?.text, pickup: mb.index === 0 && mb.isAnacrusis, beats };
  });

  for (const [key, n] of counts) remarks.push(t(`import.${key}`, { count: n }));
  if (badChords.size) remarks.push(t('import.chords', { names: [...badChords].join(' ') }));

  while (lyrics.length && !lyrics[lyrics.length - 1]) lyrics.pop();
  let lyricText = lyrics.join(' ');
  if (lyrics.length && JSON.stringify(lyricChunks(lyricText)) !== JSON.stringify(lyrics)) {
    remarks.push(t('import.lyrics'));
    lyricText = '';
  }

  const minor = first.keySignatureType === 1;
  const text = writeAlphaTex({
    comments: [t(track.name ? 'import.fromNamed' : 'import.from', { name: source, track: trackIndex + 1, trackName: track.name }), ...remarks],
    title: score.title || source.replace(/\.[^.]+$/, ''),
    artist: score.artist,
    tempo: score.tempo,
    time,
    key: (minor ? MINOR : MAJOR)[first.keySignature + 7] + (minor ? 'minor' : ''),
    capo: staff.capo,
    lyrics: lyricText,
    bars,
  });
  return { text, remarks };
}

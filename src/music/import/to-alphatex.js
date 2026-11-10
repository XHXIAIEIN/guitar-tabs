// Writes one track of an alphaTab score as alphaTex in the subset the app reads. What the subset cannot hold is
// dropped or simplified, and each kind of change is listed in comments at the top of the text.
import { t } from '../../core/i18n.js';
import { chordName, lyricChunks } from '../format/syntax.js';

const STANDARD_TUNING = [64, 59, 55, 50, 45, 40];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// key names by number of sharps (negative for flats), from 7 flats to 7 sharps
const MAJOR = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const MINOR = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
const TICKS = { 1: 192, 2: 96, 4: 48, 8: 24, 16: 12 };
const BARS_PER_LINE = 4;

// alphaTab's MusicXML reader turns the spaces in texts into no-break spaces
const quote = (s) => '"' + s.replace(/ /g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

/** Rest tokens that fill `ticks`, longest first. */
function restsFor(ticks) {
  const out = [];
  for (const d of [1, 2, 4, 8, 16]) {
    for (const [len, dotted] of [[TICKS[d] * 1.5, true], [TICKS[d], false]]) {
      while (ticks >= len) {
        out.push({ dur: d, dotted });
        ticks -= len;
      }
    }
  }
  return out;
}

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

  let dur = 4;
  const lyrics = [];
  const badChords = new Set();
  const token = (body, d, props) => {
    const ds = d !== dur ? '.' + d : '';
    dur = d;
    return body + ds + (props.length ? `{${props.join(' ')}}` : '');
  };

  const bars = staff.bars.map((bar) => {
    const mb = bar.masterBar;
    const beats = [];
    for (const beat of bar.voices[0].beats) {
      if (beat.isEmpty) continue;
      if (beat.graceType) {
        count('grace');
        continue;
      }
      let d = beat.duration;
      if (!TICKS[d]) {
        count(d > 16 ? 'short' : 'long');
        d = d > 16 ? 16 : 1;
      }
      const props = [];
      if (beat.dots) props.push('d');
      if (beat.dots > 1) count('doubleDot');
      if (beat.hasTuplet) {
        if (beat.tupletNumerator === 3 && beat.tupletDenominator === 2) props.push('tu 3');
        else count('tuplet');
      }
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
      if (name && chordName(name)) props.push(`ch ${quote(chordName(name))}`);
      else if (name) badChords.add(name);
      if (notes.length) lyrics.push((beat.lyrics?.[0] ?? '').replace(/ /g, '+'));
      const body = !notes.length ? 'r' : notes.length === 1 ? notes[0] : `(${notes.join(' ')})`;
      beats.push(token(body, d, props));
    }
    if (!beats.length) {
      const barTicks = (mb.timeSignatureNumerator * 192) / mb.timeSignatureDenominator;
      for (const r of restsFor(barTicks)) beats.push(token('r', r.dur, r.dotted ? ['d'] : []));
    }
    const head = [mb.section && `\\section ${quote(mb.section.text)}`, mb.index === 0 && mb.isAnacrusis && '\\ac'].filter(Boolean);
    return { text: [...head, ...beats].join(' '), section: !!mb.section };
  });

  for (const [key, n] of counts) remarks.push(t(`import.${key}`, { count: n }));
  if (badChords.size) remarks.push(t('import.chords', { names: [...badChords].join(' ') }));

  while (lyrics.length && !lyrics[lyrics.length - 1]) lyrics.pop();
  let lyricText = lyrics.join(' ');
  if (lyrics.length && JSON.stringify(lyricChunks(lyricText)) !== JSON.stringify(lyrics)) {
    remarks.push(t('import.lyrics'));
    lyricText = '';
  }

  const ks = (first.keySignatureType === 1 ? MINOR : MAJOR)[first.keySignature + 7] + (first.keySignatureType === 1 ? 'minor' : '');
  const out = [`// ${t(track.name ? 'import.fromNamed' : 'import.from', { name: source, track: trackIndex + 1, trackName: track.name })}`, ...remarks.map((r) => `// ${r}`)];
  out.push(`\\title ${quote(score.title || source.replace(/\.[^.]+$/, ''))}`);
  if (score.artist) out.push(`\\artist ${quote(score.artist)}`);
  out.push(`\\tempo ${score.tempo}`, `\\ts ${time[0]} ${time[1]}`, `\\ks ${ks}`);
  if (staff.capo) out.push(`\\capo ${staff.capo}`);

  // one text line per page line: BARS_PER_LINE bars, and a new line at each section
  const lines = [];
  bars.forEach((bar) => {
    const line = lines[lines.length - 1];
    if (!line || bar.section || line.length === BARS_PER_LINE) lines.push([bar.text]);
    else line.push(bar.text);
  });
  out.push(`\\systemsLayout (${lines.map((l) => l.length).join(' ')})`);
  if (lyricText) out.push(`\\lyrics ${quote(lyricText)}`);
  out.push('', ...lines.map((l) => l.join(' | ') + ' |'));
  // the last bar line closes the song
  out[out.length - 1] = out[out.length - 1].replace(/ \|$/, '');
  return { text: out.join('\n') + '\n', remarks };
}

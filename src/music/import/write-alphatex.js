// Writes imported music as alphaTex in the subset the app reads, laid out one text line per page line.

const BARS_PER_LINE = 4;
// ticks of a quarter note = 48, as in the parser
export const TICKS = { 1: 192, 2: 96, 4: 48, 8: 24, 16: 12 };

// alphaTab's MusicXML reader turns the spaces in texts into no-break spaces
const quote = (s) => '"' + s.replace(/ /g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

/** Rest beats that fill `ticks`, longest first. */
export function restsFor(ticks) {
  const out = [];
  for (const d of [1, 2, 4, 8, 16]) {
    for (const [len, dotted] of [[TICKS[d] * 1.5, true], [TICKS[d], false]]) {
      while (ticks >= len) {
        out.push({ notes: [], dur: d, dotted });
        ticks -= len;
      }
    }
  }
  return out;
}

/**
 * Song text for `song`: { comments, title, artist, tempo, time: [beats, unit], key (a \ks value), capo, lyrics, bars }.
 * A bar is { section, pickup, beats }; a beat is { notes: ['3.5', 'x.2'], dur: 1 | 2 | 4 | 8 | 16, dotted, triplet,
 * chord }, a rest when `notes` is empty. A bar without beats is filled with rests.
 */
export function writeAlphaTex(song) {
  let dur = 4;
  const beatText = (b) => {
    const body = !b.notes.length ? 'r' : b.notes.length === 1 ? b.notes[0] : `(${b.notes.join(' ')})`;
    const props = [b.dotted && 'd', b.triplet && 'tu 3', b.chord && `ch ${quote(b.chord)}`].filter(Boolean);
    const ds = b.dur !== dur ? '.' + b.dur : '';
    dur = b.dur;
    return body + ds + (props.length ? `{${props.join(' ')}}` : '');
  };
  const barTicks = (song.time[0] * TICKS[1]) / song.time[1];
  const bars = song.bars.map((bar) => {
    const beats = bar.beats.length ? bar.beats : restsFor(barTicks);
    const head = [bar.section && `\\section ${quote(bar.section)}`, bar.pickup && '\\ac'].filter(Boolean);
    return { text: [...head, ...beats.map(beatText)].join(' '), section: !!bar.section };
  });

  const out = song.comments.map((c) => `// ${c}`);
  out.push(`\\title ${quote(song.title)}`);
  if (song.artist) out.push(`\\artist ${quote(song.artist)}`);
  out.push(`\\tempo ${song.tempo}`, `\\ts ${song.time[0]} ${song.time[1]}`, `\\ks ${song.key}`);
  if (song.capo) out.push(`\\capo ${song.capo}`);
  // one text line per page line: BARS_PER_LINE bars, and a new line at each section
  const lines = [];
  bars.forEach((bar) => {
    const line = lines[lines.length - 1];
    if (!line || bar.section || line.length === BARS_PER_LINE) lines.push([bar.text]);
    else line.push(bar.text);
  });
  out.push(`\\systemsLayout (${lines.map((l) => l.length).join(' ')})`);
  if (song.lyrics) out.push(`\\lyrics ${quote(song.lyrics)}`);
  out.push('', ...lines.map((l) => l.join(' | ') + ' |'));
  // the last bar line closes the song
  out[out.length - 1] = out[out.length - 1].replace(/ \|$/, '');
  return out.join('\n') + '\n';
}

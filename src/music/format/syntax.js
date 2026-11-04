// The vocabulary of the plain-text tab format: field, row and token names with their Chinese aliases, and cell splitting.
// The aliases are part of the file format, not UI text, so they do not change with the UI language.

export const META = new Map(Object.entries({
  title: 'title', 标题: 'title', 歌名: 'title',
  artist: 'artist', 作者: 'artist', 演唱: 'artist', 词曲: 'artist',
  key: 'key', 调: 'key',
  capo: 'capo', 变调夹: 'capo',
  bpm: 'bpm', tempo: 'bpm', 速度: 'bpm',
  time: 'time', 拍号: 'time',
  strum: 'strum', 节奏型: 'strum',
  pickup: 'pickup', 弱起: 'pickup',
  jianpu: 'jianpu', 简谱八度: 'jianpu',
  level: 'level', 难度: 'level',
  note: 'note', 说明: 'note',
}));
export const ROWS = new Map(Object.entries({ chord: 'chord', 和弦: 'chord', tab: 'tab', 谱: 'tab', 六线谱: 'tab', lyric: 'lyric', 歌词: 'lyric' }));
export const STRUMS = new Map(Object.entries({ D: 'D', 下: 'D', U: 'U', 上: 'U', X: 'X', 切: 'X' }));
const CJK = /[㐀-鿿豈-﫿]/;

/** Name and value of a `name: value` line; a Chinese colon also separates them. */
export const splitField = (line) => /^([^:：|]+)[:：](.*)$/.exec(line);

export const isRest = (tok) => tok === 'r' || tok === '休';
export const stripKeySuffix = (value) => value.replace(/调$/, '');
export const stripNumberSuffix = (value) => value.replace(/品|拍$/g, '');

/** Shortens a quoted piece of the user's text for a message. */
export const clip = (s) => (s.length > 24 ? s.slice(0, 24) + '…' : s);

/** Splits "| a | b |" into ['a', 'b']; inner empty cells stay. */
export function splitBars(text) {
  const cells = text.split('|').map((c) => c.trim());
  if (cells.length > 1 && cells[0] === '') cells.shift();
  if (cells.length > 1 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/** Splits lyrics into one syllable per note: each Han character, each word, "_" for a held note. */
export function syllables(text) {
  const out = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word === '_') out.push('');
    else if (CJK.test(word)) {
      for (const ch of word) {
        if (ch === '_') out.push('');
        else if (CJK.test(ch) || !out.length) out.push(ch);
        else out[out.length - 1] += ch; // punctuation stays with the syllable before it
      }
    } else out.push(...word.split(/(?<=-)/));
  }
  return out;
}

export function parseTime(v) {
  const m = /^(\d{1,2})\/(2|4|8)$/.exec(v);
  return m && +m[1] > 0 ? [+m[1], +m[2]] : null;
}

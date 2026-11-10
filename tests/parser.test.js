import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/setup.js';
import { parseSong } from '../src/music/format/parse-song.js';
import { chordAt } from '../src/music/format/pattern.js';
import { noteParts, syllables } from '../src/music/format/syntax.js';
import { breakLines } from '../src/render/score/layout.js';

test('note text splits into strings and finger marks', () => {
  assert.deepEqual(noteParts('{T} 弹 {1}。'), [{ finger: 'T' }, ' 弹 ', { finger: '1' }, '。']);
  assert.deepEqual(noteParts('只有文字 {5} {t}'), ['只有文字 {5} {t}']);
});

test('syllables', () => {
  assert.deepEqual(syllables('长亭_外'), ['长', '亭', '', '外']);
  assert.deepEqual(syllables('晚风，拂柳'), ['晚', '风，', '拂', '柳']);
  assert.deepEqual(syllables('A- maz-ing grace'), ['A-', 'maz-', 'ing', 'grace']);
});

test('parser reports wrong bar lengths with the line number', () => {
  const s = parseSong('time: 4/4\ntab: | q 1/0 1/0 1/0 1/0 | q 1/0 1/0 1/0 |');
  assert.equal(s.errors.length, 1);
  assert.equal(s.errors[0].line, 2);
  assert.match(s.errors[0].message, /第 2 小节.*3 拍/);
});

test('parser handles pickups, sticky durations, chord slots and chord carry-over', () => {
  const s = parseSong(`time: 3/4
chord: | | C | . . G |
tab: | e 1/0 1/0 | q 1/0 2/1 1/3 | h 1/0 q 1/1 |`);
  assert.deepEqual(s.errors, []);
  assert.equal(s.bars[0].pickup, true);
  assert.equal(s.bars[0].ticks, 48);
  assert.equal(chordAt(s.bars[2], 0), 'C');
  assert.equal(chordAt(s.bars[2], 96), 'G');
  assert.deepEqual(s.bars[1].events.map((e) => e.dur), [48, 48, 48]);
});

test('each row block is one line, and a block too wide for the page splits in halves', () => {
  const s = parseSong(`time: 4/4
# A
chord: | C | G |
chord: | C | G | Am | F | C |

# B
chord: | F | G |`);
  const lines = (avail) => breakLines(s, s.bars.map(() => ({ natural: 10 })), avail).map((l) => [l.start, l.count, l.sectionStart]);
  assert.deepEqual(lines(100), [[0, 2, true], [2, 5, false], [7, 2, true]]);
  assert.deepEqual(lines(30), [[0, 2, true], [2, 3, false], [5, 2, false], [7, 2, true]]);
});

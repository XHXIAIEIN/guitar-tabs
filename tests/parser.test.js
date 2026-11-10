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

test('a cell holds a phrase of any length, and phase counts from the first downbeat after the pickup', () => {
  const s = parseSong(`time: 3/4
pickup: 1
chord: | . C . . G7 . | C |
tab: | e 1/0 1/0 q 1/0 2/1 1/3 h 1/0 | q 1/0 e 2/1 |`);
  assert.deepEqual(s.errors, []);
  assert.deepEqual(s.bars.map((b) => [b.ticks, b.phase]), [[288, 96], [72, 96]]);
  assert.equal(chordAt(s.bars[0], 48), 'C');
  assert.equal(chordAt(s.bars[0], 192), 'G7');
  assert.deepEqual(s.bars[1].events.map((e) => e.dur), [48, 24]);
});

test('chord-only cells last one metric bar, the first one the pickup', () => {
  const s = parseSong(`time: 4/4
pickup: 1
chord: | G | C | D |`);
  assert.deepEqual(s.bars.map((b) => [b.ticks, b.phase]), [[48, 144], [192, 0], [192, 0]]);
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

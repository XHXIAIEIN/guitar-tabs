import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseAlphaTex, exportAlphaTex } from '../src/formats/alphatex.ts';
import { musicalContent } from '../src/score/model.ts';

const fixture = String.raw`\title "往返测试" \tempo 76 \tuning (D4 A3 F3 C3 G2 D2) \ts (4 4)
(0.1 12.2).4{d} (0.1{t} 12.2{t}).8 r.4 7.6.4 |
\ts (3 4) \tempo 112 \ks g 2.3.8{dd} 3.3.32 4.3.2 |`;
test('往返保留元数据、弦号、两位品、拍号、变速、休止、和弦、附点和延音', () => {
  const score = parseAlphaTex(fixture);
  assert.equal(score.tuning[0], 62);
  assert.equal(score.bars[0].beats[0].notes[0].string, 1);
  assert.equal(score.bars[0].beats[1].notes[0].tie, true);
  assert.equal(score.bars[1].beats[0].dots, 2);
  assert.equal(score.bars[1].tempo, 112);
  assert.deepEqual(musicalContent(parseAlphaTex(exportAlphaTex(score))), musicalContent(score));
});
test('修改内部模型后写回重读使用最新品位', () => {
  const score = parseAlphaTex(String.raw`\title "编辑测试" \tempo 90 \ts (4 4) 0.1.1`);
  score.bars[0].beats[0].notes[0].fret = 14;
  assert.equal(parseAlphaTex(exportAlphaTex(score)).bars[0].beats[0].notes[0].fret, 14);
});
test('拒绝技法、多轨、缺少弦品和超出小节的节奏', () => {
  for (const text of [String.raw`\title "技法" 0.1{b (0 4)}.1`, String.raw`\title "多轨" \track "a" 0.1.1 \track "b" 0.1.1`, String.raw`\title "音名" \tuning piano C4.1`, String.raw`\title "节奏" \ts (3 4) 0.1.1`]) assert.throws(() => parseAlphaTex(text));
});
test('断开的延音报错，中文曲名与特殊字符保留', () => {
  assert.throws(() => parseAlphaTex(String.raw`\title "延音" 0.1{t}.1`));
  const score = parseAlphaTex(String.raw`\title "示例" 0.1.1`);
  score.title = '甲"乙\\丙';
  assert.equal(parseAlphaTex(exportAlphaTex(score)).title, score.title);
});
test('小星星完整旋律保留核对谱中的弦号和音高', async () => {
  const path = (await readdir('scores', { recursive: true })).find(path => path.endsWith('twinkle-star.atex'));
  assert.ok(path, '缺少默认曲谱');
  const score = parseAlphaTex(await readFile(join('scores', path), 'utf8'));
  const pitches = score.bars.flatMap(bar => bar.beats.flatMap(beat => beat.notes.map(note => score.tuning[note.string - 1] + note.fret)));
  const A = [55,55,62,62,64,64,62,60,60,59,59,57,57,55];
  const B = [62,62,60,60,59,59,57];
  assert.deepEqual(pitches, [...A, ...B, ...B, ...A]);
  assert.equal(score.bars.length, 12);
});

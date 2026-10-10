import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAlphaTex } from '../src/formats/alphatex.ts';
import { layoutBar, locate } from '../src/notation/layout.ts';
import { CANDIDATES } from '../src/settings/display.ts';
import { renderBar } from '../src/notation/svg.ts';
test('细分时间等比定位，两位品保留间距，同拍和弦共用坐标', () => {
  const score = parseAlphaTex(String.raw`\title "定位" \ts (4 4) (12.1 10.2).8 3.3.8 0.4.4 0.5.2`);
  const bar = score.bars[0];
  const layout = layoutBar(bar, 354, CANDIDATES.b);
  const [a, b, c] = layout.columns;
  assert.ok(Math.abs((b.x - a.x) - (c.x - b.x)) < 0.000001);
  assert.ok(b.x - a.x >= CANDIDATES.b.noteSize * 1.65 - 0.001);
  assert.deepEqual(locate(layout, b.x + 1, layout.top + 2 * layout.gap), { barId: bar.id, tick: 480, string: 3 });
  const svg = renderBar(bar, layout, score.tuning, CANDIDATES.b, 0);
  assert.equal(svg.match(new RegExp(`x="${a.x}"`, 'g'))!.length >= 2, true);
});
test('调弦标签、左右组合与按弦线宽使用同一设置', () => {
  const score = parseAlphaTex(String.raw`\title "标签" \tuning (D4 A3 F3 C3 G2 D2) 0.1.1`);
  const settings = { ...CANDIDATES.b, left: { tab: true, string: true, pitch: true }, right: { string: true, pitch: true } };
  const layout = layoutBar(score.bars[0], 354, settings);
  const svg = renderBar(score.bars[0], layout, score.tuning, settings, 0);
  assert.ok(svg.includes('>D</text>'));
  assert.ok(svg.includes('stroke-width="0.65"'));
  assert.ok(svg.includes('stroke-width="1.4"'));
  assert.ok(svg.includes('>T</text>'));
  assert.equal(locate(layout, 1, -100).string, 1);
  assert.equal(locate(layout, 9999, 9999).string, 6);
});

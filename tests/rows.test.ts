import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAlphaTex } from '../src/formats/alphatex.ts';
import { DEFAULT_DISPLAY } from '../src/settings/display.ts';
import { groupBars, layoutRows } from '../src/notation/rows.ts';
import { locate } from '../src/notation/layout.ts';

test('eight beats group complete measures and follow the meter numerator', () => {
  const score = parseAlphaTex('0.3.4 0.3.4 3.2.2 | 0.1.4 0.1.4 3.2.2 | 1.2.1');
  assert.deepEqual(groupBars(score.bars, 8).map(row => row.length), [2, 1]);
  assert.deepEqual(groupBars(score.bars, 4).map(row => row.length), [1, 1, 1]);
  const mixed = parseAlphaTex(String.raw`\ts (6 8) 0.1.2{d} | \ts (2 4) 0.1.2 | \ts (4 4) 0.1.1`);
  assert.deepEqual(groupBars(mixed.bars, 8).map(row => row.map(bar => bar.meter[0])), [[6, 2], [4]]);
});

test('narrow rows wrap complete measures while preserving fret size and accurate selection', () => {
  const score = parseAlphaTex('12.3.4 12.3.4 12.3.4 12.3.4 | 12.3.4 12.3.4 12.3.4 12.3.4');
  for (const width of [272, 342]) for (const editing of [false, true]) {
    const rows = layoutRows(score.bars, width, DEFAULT_DISPLAY, editing);
    assert.deepEqual(rows.flatMap(row => row.barIds), score.bars.map(bar => bar.id));
    for (const row of rows) {
      assert.ok(row.layouts.reduce((sum, layout) => sum + layout.width, 0) <= width + .001);
      for (const layout of row.layouts) {
        assert.equal(layout.settings!.noteSize, DEFAULT_DISPLAY.noteSize);
        const size = layout.settings!.noteSize * layout.settings!.scale;
        assert.ok(layout.columns[1].x - layout.columns[0].x >= size * 1.59);
        assert.deepEqual(locate(layout, layout.columns[2].x, layout.top + 2 * layout.gap, editing ? 960 : undefined), {
          barId: layout.barId, tick: 1920, string: 3
        });
      }
      assert.equal(row.layouts[0].settings!.left.string, true);
      assert.equal(row.layouts[0].gap, DEFAULT_DISPLAY.stringGap);
    }
  }
});

test('editing a measure recomputes the shared spacing across the score', () => {
  const score = parseAlphaTex('0.1.1 | 0.1.1 | 0.1.1 | 0.1.1');
  const rows = layoutRows(score.bars, 342, DEFAULT_DISPLAY, true, [score.bars[2].id]);
  assert.equal(rows[0].layouts.length, 2);
  assert.deepEqual(rows[1].layouts.map(layout => layout.barId), rows[1].barIds);
});

test('dense and sparse measures share one font size and one beat spacing', () => {
  const score = parseAlphaTex('0.1.4 0.1.4 1.1.4 3.1.4 | 3.2.4 0.1.8 1.1.8 0.1.4 1.2.4 | 0.1.1');
  for (const width of [272, 342, 800]) {
    const rows = layoutRows(score.bars, width, DEFAULT_DISPLAY);
    const layouts = rows.flatMap(row => row.layouts);
    assert.equal(layouts.length, 3);
    assert.ok(layouts.every(layout => layout.settings!.noteSize === 22));
    const units = layouts.map(layout => layout.musicWidth / 4);
    assert.ok(units.every(unit => Math.abs(unit - units[0]) < .001));
    assert.ok(rows.every(row => row.layouts.reduce((sum, layout) => sum + layout.width, 0) <= width + .001));
    if (width === 800) assert.equal(rows[0].barIds.length, 2);
  }
});

test('large two-digit frets stay inside measure edges with both sets of labels', () => {
  const score = parseAlphaTex('12.1.1 | 12.2.1 | 12.1.1');
  const settings = { ...DEFAULT_DISPLAY, scale: 1.6,
    left: { tab: true, string: true, pitch: true }, right: { string: true, pitch: true } };
  for (const width of [272, 342, 800]) {
    const rows = layoutRows(score.bars, width, settings);
    for (const layout of rows.flatMap(row => row.layouts)) {
      const halfMask = (2 * .62 + .35) * settings.noteSize * settings.scale / 2;
      assert.ok(layout.columns[0].x - halfMask >= layout.lineStart);
      assert.ok(layout.columns[0].x + halfMask <= layout.lineEnd);
    }
  }
});

test('beat columns align across measures and rows while staff lines join at barlines', () => {
  const score = parseAlphaTex('0.3.4 0.3.4 3.2.4 3.2.4 | 0.1.4 0.1.4 3.2.2 | 1.2.4 1.2.4 0.2.2');
  const [first, final] = layoutRows(score.bars, 342, DEFAULT_DISPLAY);
  const [a,b] = first.layouts;
  const step = a.columns[1].x - a.columns[0].x;
  assert.ok(Math.abs(step - (b.columns[1].x - b.columns[0].x)) < .001);
  const joinGap = a.width + b.columns[0].x - a.columns[3].x;
  assert.ok(joinGap > step);
  assert.ok(joinGap <= step * 1.5);
  const beforeLine = a.lineEnd - a.columns[3].x;
  const afterLine = b.columns[0].x - b.lineStart;
  assert.ok(Math.abs(beforeLine - afterLine) < step * .15);
  assert.equal(a.lineEnd, a.width + b.lineStart);
  assert.equal(a.top, b.top);
  assert.equal(a.gap, b.gap);
  assert.equal(first.width, final.width);
  assert.equal(a.columns[0].x, final.layouts[0].columns[0].x);
  assert.equal(a.lineEnd, final.layouts[0].lineEnd);
  assert.ok(Math.abs(final.layouts[0].columns[1].x - final.layouts[0].columns[0].x - step) < .001);
  const editing = layoutRows(score.bars, 342, DEFAULT_DISPLAY, true)[0].layouts;
  assert.deepEqual(editing.map(layout=>layout.columns), first.layouts.map(layout=>layout.columns));
  const fine = layoutRows(score.bars, 342, DEFAULT_DISPLAY, true, undefined, 240)[0].layouts[0];
  const lastTick = 3600;
  const x = fine.musicStart + lastTick / fine.tickSpan * fine.musicWidth;
  assert.ok(x < fine.lineEnd);
  assert.equal(locate(fine, x, fine.top, 240).tick, lastTick);
});

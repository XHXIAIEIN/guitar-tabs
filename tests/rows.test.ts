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

test('two measures fit narrow rows with two-digit fret spacing and accurate selection', () => {
  const score = parseAlphaTex('12.3.4 12.3.4 12.3.4 12.3.4 | 12.3.4 12.3.4 12.3.4 12.3.4');
  for (const width of [272, 342]) for (const editing of [false, true]) {
    const row = layoutRows(score.bars, width, DEFAULT_DISPLAY, editing)[0];
    assert.ok(row.layouts.reduce((sum, layout) => sum + layout.width, 0) <= width + .001);
    for (const layout of row.layouts) {
      const size = layout.settings!.noteSize * layout.settings!.scale;
      assert.ok(layout.columns[1].x - layout.columns[0].x >= size * 1.59);
      assert.deepEqual(locate(layout, layout.columns[2].x, layout.top + 2 * layout.gap, editing ? 960 : undefined), {
        barId: layout.barId, tick: 1920, string: 3
      });
    }
    assert.equal(row.layouts[0].settings!.left.string, true);
    assert.equal(row.layouts[1].settings!.left.string, false);
    assert.equal(row.layouts[0].gap, DEFAULT_DISPLAY.stringGap);
  }
});

test('editing one measure recomputes its row while preserving other row layouts', () => {
  const score = parseAlphaTex('0.1.1 | 0.1.1 | 0.1.1 | 0.1.1');
  const rows = layoutRows(score.bars, 342, DEFAULT_DISPLAY, true, [score.bars[2].id]);
  assert.equal(rows[0].layouts.length, 0);
  assert.deepEqual(rows[1].layouts.map(layout => layout.barId), rows[1].barIds);
});

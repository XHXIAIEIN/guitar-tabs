import { readdir, readFile } from 'node:fs/promises';
import { parseAlphaTex, exportAlphaTex } from '../src/formats/alphatex.ts';
import { barTicks, beatTicks, musicalContent } from '../src/score/model.ts';
import assert from 'node:assert/strict';
for (const file of (await readdir('scores')).filter(file => file.endsWith('.atex'))) {
  const score = parseAlphaTex(await readFile(`scores/${file}`, 'utf8'));
  const reloaded = parseAlphaTex(exportAlphaTex(score));
  assert.deepEqual(musicalContent(reloaded), musicalContent(score));
  for (const bar of score.bars) assert.equal(bar.beats.reduce((sum, beat) => sum + beatTicks(beat), 0), barTicks(bar), `${file}: 小节时值不完整`);
  console.log(`${file}: ${score.bars.length} 小节，节奏与往返通过`);
}

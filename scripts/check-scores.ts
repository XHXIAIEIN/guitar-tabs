import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseAlphaTex, exportAlphaTex } from '../src/formats/alphatex.ts';
import { barTicks, beatTicks, musicalContent } from '../src/score/model.ts';
import assert from 'node:assert/strict';
async function checkFolder(folder: string): Promise<void> {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) { await checkFolder(path); continue; }
    if (!entry.name.endsWith('.atex')) continue;
    const score = parseAlphaTex(await readFile(path, 'utf8'));
    const reloaded = parseAlphaTex(exportAlphaTex(score));
    assert.deepEqual(musicalContent(reloaded), musicalContent(score));
    for (const bar of score.bars) assert.equal(bar.beats.reduce((sum, beat) => sum + beatTicks(beat), 0), barTicks(bar), `${path}: 小节时值不完整`);
    console.log(`${path}: ${score.bars.length} 小节，节奏与往返通过`);
  }
}
await checkFolder('scores');

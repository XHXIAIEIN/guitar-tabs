import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from '../src/library/catalog.ts';
const file = (path: string, title?: string) => ({ path, text: title ? `\\title ${JSON.stringify(title)}\n0.1.1` : '0.1.1' });
test('folders group songs and song bundles use their parent group', () => {
  const catalog = buildCatalog([file('root.atex'), file('Basics/one.atex'), file('Basics/Two/score.atex','Two')], ['Basics/Two/preview.svg']);
  assert.equal(catalog.find(e=>e.path==='Basics/one.atex')?.group, 'Basics');
  assert.equal(catalog.find(e=>e.path==='Basics/Two/score.atex')?.group, 'Basics');
  assert.equal(catalog.find(e=>e.path==='Basics/Two/score.atex')?.previewPath, 'Basics/Two/preview.svg');
});
test('same-name previews take priority; multiple files require a matching name', () => {
  const catalog = buildCatalog([file('Set/a.atex'),file('Set/b.atex')],['Set/a.svg','Set/other.svg']);
  assert.equal(catalog[0].previewPath,'Set/a.svg');
  assert.equal(catalog[1].previewPath,undefined);
  const ambiguous=buildCatalog([file('Solo/score.atex')],['Solo/a.svg','Solo/b.svg']);
  assert.equal(ambiguous[0].previewPath,undefined);
});
test('identical filenames in different folders keep distinct persistent ids', () => {
  const entries=buildCatalog([file('A/song.atex'),file('B/song.atex')],[]);
  assert.equal(new Set(entries.map(e=>e.id)).size,2);
  assert.equal(buildCatalog([file('A/B/score.atex')],['A/B/preview.svg'])[0].title,'B');
});

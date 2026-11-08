import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { ROOT, readJsonFile } from './helpers/setup.js';
import { BUILTIN } from '../src/state/songs.js';

const sw = readFileSync(new URL('sw.js', ROOT), 'utf8');
const shell = sw.slice(sw.indexOf('const SHELL = ['), sw.indexOf('];', sw.indexOf('const SHELL = [')));
const listed = [...shell.matchAll(/^\s*'([^']+)',$/gm)].map((m) => m[1]);

function filesUnder(dir) {
  return readdirSync(new URL(dir, ROOT), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(`${dir}${e.name}/`) : [`${dir}${e.name}`]));
}

test('the offline list names every source file and only files that exist', () => {
  assert.deepEqual(listed.filter((f) => f.startsWith('src/')).sort(), filesUnder('src/').sort());
  for (const file of listed) assert.ok(file === './' || existsSync(new URL(file, ROOT)), `${file} does not exist`);
});

test('the offline list and the score catalog each name every score file', () => {
  const files = filesUnder('scores/').sort();
  assert.deepEqual(listed.filter((f) => f.startsWith('scores/')).sort(), files);
  const named = BUILTIN.flatMap((e) => (e.versions?.map((v) => v.id) ?? [e.id]).map((file) => `scores/${e.group}/${e.id}/${file}.txt`));
  assert.deepEqual(['scores/index.json', ...named].sort(), files);
});

test('the offline list holds the configuration and every language file', () => {
  assert.ok(listed.includes('src/config.json'));
  const { locales } = readJsonFile('src/config.json').i18n;
  for (const { file } of Object.values(locales)) assert.ok(listed.includes(`src/lang/${file}.json`), file);
});

test('the offline list and the configuration name the same recordings, and each has a file', () => {
  const pitches = readJsonFile('src/config.json').audio.samples.recordings.map(([midi]) => midi);
  assert.deepEqual(JSON.parse(/\.\.\.(\[[\d, ]+\])\.map/.exec(shell)[1]), pitches);
  for (const midi of pitches) assert.ok(existsSync(new URL(`assets/audio/guitar/${midi}.sample`, ROOT)), `${midi}`);
});

test('the page and the manifest point at files that exist', () => {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  const manifest = readJsonFile('manifest.webmanifest');
  const paths = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).concat(manifest.icons.map((i) => i.src));
  for (const path of paths) assert.ok(existsSync(new URL(path, ROOT)), path);
});

test('the stylesheet entry imports every style file, and each file closes its blocks', () => {
  const entry = readFileSync(new URL('src/styles/app.css', ROOT), 'utf8');
  const imported = [...entry.matchAll(/@import "([^"]+)";/g)].map((m) => `src/styles/${m[1]}`);
  assert.deepEqual([...imported, 'src/styles/app.css'].sort(), filesUnder('src/styles/').sort());
  for (const file of imported) {
    const css = readFileSync(new URL(file, ROOT), 'utf8');
    assert.equal(css.split('{').length, css.split('}').length, file);
  }
});

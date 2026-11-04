import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { ROOT, readJsonFile } from './helpers/setup.js';

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

test('the offline list holds the configuration and every language file', () => {
  assert.ok(listed.includes('config/app.json'));
  const { locales } = readJsonFile('config/app.json').i18n;
  for (const { file } of Object.values(locales)) assert.ok(listed.includes(`lang/${file}.json`), file);
});

test('the offline list and the configuration name the same recordings, and each has a file', () => {
  const pitches = readJsonFile('config/app.json').audio.samples.recordings.map(([midi]) => midi);
  assert.deepEqual(JSON.parse(/\.\.\.(\[[\d, ]+\])\.map/.exec(shell)[1]), pitches);
  for (const midi of pitches) assert.ok(existsSync(new URL(`assets/audio/guitar/${midi}.sample`, ROOT)), `${midi}`);
});

test('the page and the manifest point at files that exist', () => {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  const manifest = readJsonFile('manifest.webmanifest');
  const paths = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).concat(manifest.icons.map((i) => i.src));
  for (const path of paths) assert.ok(existsSync(new URL(path, ROOT)), path);
});

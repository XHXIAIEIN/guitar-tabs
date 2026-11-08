import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ROOT, readJsonFile } from './helpers/setup.js';
import { config } from '../src/core/config.js';
import { setMessages, t } from '../src/core/i18n.js';

const lang = readJsonFile('src/lang/zh_CN.json');

function sourceFiles(dir = 'src/') {
  return readdirSync(new URL(dir, ROOT), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sourceFiles(`${dir}${e.name}/`) : e.name.endsWith('.js') ? [`${dir}${e.name}`] : []));
}

const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
const sources = sourceFiles().map((path) => ({ path, code: stripComments(readFileSync(new URL(path, ROOT), 'utf8')) }));

function catalogKeys(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) => (typeof value === 'object' && !Array.isArray(value) ? catalogKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`]));
}

test('t fills parameters, leaves unknown ones and joins line arrays', () => {
  setMessages({ a: { b: '{x} and {y}' }, lines: ['one', 'two'] });
  assert.equal(t('a.b', { x: 0 }), '0 and {y}');
  assert.equal(t('lines'), 'one\ntwo');
  setMessages(lang);
});

test('a later catalog overrides, and the first fills what it lacks', () => {
  setMessages({ a: 'first', b: 'first' }, { b: 'second' });
  assert.equal(t('a'), 'first');
  assert.equal(t('b'), 'second');
  setMessages(lang);
});

test('a missing key fails with its name', () => {
  assert.throws(() => t('no.such.key'), /no\.such\.key/);
});

test('every key the code names exists, and the catalog has no unused key', () => {
  const sections = Object.keys(lang).join('|');
  const literal = new RegExp(`'((?:${sections})\\.[\\w.]+)'`, 'g');
  const named = new Set(sources.flatMap(({ code }) => [...code.matchAll(literal)].map((m) => m[1])));
  const prefixes = sources.flatMap(({ code }) => [...code.matchAll(/\bt\(.*?`([\w.]+\.)\$\{/g)].map((m) => m[1]));
  assert.ok(prefixes.includes('version.') && prefixes.includes('strum.'));
  const keys = new Set(catalogKeys(lang));
  for (const key of named) assert.ok(keys.has(key), `missing ${key}`);
  for (const key of keys) assert.ok(named.has(key) || prefixes.some((p) => key.startsWith(p)), `unused ${key}`);
});

test('ids from the configuration have their text', () => {
  for (const g of config.chords.groups) assert.ok(t(`chords.group.${g.id}`));
  for (const p of config.rhythm.presets) {
    assert.ok(t(`rhythm.preset.${p.id}`));
    assert.ok(t(`rhythm.presetGroup.${p.group}`));
  }
  for (const n of config.tools.metronome.subdivisions) assert.ok(t(`tools.subdivision.${n}`));
});

test('built-in versions have a name', () => {
  assert.ok(t('version.simple') && t('version.full'));
});

test('UI text lives in the language files: code outside the format vocabulary has no CJK', () => {
  for (const { path, code } of sources) {
    if (path !== 'src/music/format/syntax.js') assert.doesNotMatch(code, /[　-鿿＀-￯]/, path);
  }
});

test('the configured default language has a file', () => {
  const { defaultLocale, locales } = config.i18n;
  assert.equal(defaultLocale, 'zh-CN');
  for (const { file } of Object.values(locales)) assert.ok(readJsonFile(`src/lang/${file}.json`));
  assert.ok(locales[defaultLocale]);
});

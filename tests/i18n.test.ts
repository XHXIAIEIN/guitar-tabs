import test from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../src/i18n/en.ts';
import { zh } from '../src/i18n/zh.ts';
import { t, setLocale } from '../src/i18n/index.ts';
test('Chinese and English catalogs have the same keys and interpolation names', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) assert.deepEqual(en[key].match(/\{\w+\}/g), zh[key].match(/\{\w+\}/g), key);
});
test('locale changes use translated product and domain messages', () => {
  setLocale('en'); assert.equal(t('app'), 'Guitar songbook');
  assert.equal(t('position', { bar: 2, beat: 1.5, string: 3 }), 'Bar 2 · Beat 1.5 · String 3');
  setLocale('zh'); assert.equal(t('editor.invalidFret'), '品位应在 0–36 之间。');
  setLocale('en');
});

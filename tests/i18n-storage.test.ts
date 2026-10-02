import test from 'node:test';
import assert from 'node:assert/strict';
import { persistLanguage, readSavedLanguage } from '../src/i18n/languageStorage.ts';

test('language storage defaults to English when the storage accessor or read throws', () => {
  assert.equal(readSavedLanguage(() => { throw new DOMException('blocked', 'SecurityError'); }), 'en');
  assert.equal(readSavedLanguage(() => ({ getItem: () => { throw new DOMException('blocked', 'SecurityError'); }, setItem: () => {} })), 'en');
});

test('language storage accepts only the supported saved language', () => {
  assert.equal(readSavedLanguage(() => ({ getItem: () => 'vi', setItem: () => {} })), 'vi');
  assert.equal(readSavedLanguage(() => ({ getItem: () => 'fr', setItem: () => {} })), 'en');
});

test('language persistence tolerates throwing storage and normalizes its value', () => {
  assert.doesNotThrow(() => persistLanguage('vi', () => { throw new DOMException('blocked', 'SecurityError'); }));
  assert.doesNotThrow(() => persistLanguage('en', () => ({ getItem: () => null, setItem: () => { throw new DOMException('blocked', 'SecurityError'); } })));

  let saved = '';
  persistLanguage('fr', () => ({ getItem: () => null, setItem: (_key, value) => { saved = value; } }));
  assert.equal(saved, 'en');
});

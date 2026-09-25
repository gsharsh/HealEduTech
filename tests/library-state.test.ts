import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidBookId, libraryReturnPath, readLibraryRouteState, writeLibraryRouteState } from '../src/features/library/libraryState.ts';

test('catalogue URL state reads valid filters and falls back from malformed values', () => {
  assert.deepEqual(readLibraryRouteState(new URLSearchParams('page=3&q=Peter+Rabbit&topic=nature')), {
    page: 2,
    query: 'Peter Rabbit',
    topic: 'nature',
  });
  assert.deepEqual(readLibraryRouteState(new URLSearchParams('page=-2&q=x&topic=unknown')), {
    page: 0,
    query: 'x',
    topic: 'all',
  });
});

test('catalogue URL state serializes only active filters', () => {
  assert.equal(writeLibraryRouteState({ page: 0, query: '', topic: 'all' }).toString(), '');
  assert.equal(writeLibraryRouteState({ page: 1, query: 'tho', topic: 'stories' }).toString(), 'page=2&q=tho&topic=stories');
  assert.equal(readLibraryRouteState(new URLSearchParams(`q=${'x'.repeat(120)}`)).query.length, 100);
});

test('book return paths retain only validated library filters', () => {
  assert.equal(libraryReturnPath('/library?page=2&q=tho&topic=stories'), '/library?page=2&q=tho&topic=stories');
  assert.equal(libraryReturnPath('https://evil.example/library'), '/library');
  assert.equal(libraryReturnPath('/staff/catalogue'), '/library');
});

test('only UUID book identifiers are queried', () => {
  assert.ok(isValidBookId('a1456d90-a434-4b7a-a4a4-17b5096533b1'));
  assert.equal(isValidBookId('not-a-book-id'), false);
  assert.equal(isValidBookId(''), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readExploreTopic, recommendBooks, startingTopic, type ExplorationCandidate, type RecentExploreReading } from '../src/features/explore/exploration.ts';
import { learningResources } from '../src/features/explore/learningResources.ts';

const candidate = (id: string, overrides: Partial<ExplorationCandidate> = {}): ExplorationCandidate => ({ id, topic: 'nature', language: 'bilingual', title_en: `Book ${id}`, available_copies: 1, ...overrides });
const record = (id: string, topic: 'nature' | 'science' = 'nature'): RecentExploreReading => ({ book_id: id, status: 'finished', updated_at: '2026-11-07T00:00:00Z', books: { title_en: 'A recent book', title_vi: 'Sách gần đây', topic } });

test('exploration excludes current/recently finished books and duplicate candidates without changing inputs', () => {
  const books = [candidate('old'), candidate('new'), candidate('new'), candidate('other', { topic: 'science' })];
  const original = structuredClone(books);
  const result = recommendBooks(books, 'nature', [], [record('old')], 'en');
  assert.deepEqual(result.map(item => item.book.id), ['new']);
  assert.equal(result[0].reason, 'reading');
  assert.equal(result[0].recentBook?.title_en, 'A recent book');
  assert.deepEqual(books, original);
});

test('language access precedes availability and unknown stock is not invented', () => {
  const result = recommendBooks([
    candidate('english', { language: 'en', available_copies: 3 }),
    candidate('vietnamese', { language: 'vi', available_copies: undefined }),
    candidate('bilingual', { available_copies: 1 }),
  ], 'nature', [], [], 'vi');
  assert.deepEqual(result.map(item => item.book.id), ['bilingual', 'vietnamese', 'english']);
  assert.equal(result[1].book.available_copies, undefined);
});

test('suggestions have truthful reasons for interest, recent reading, both, and a chosen topic', () => {
  const books = [candidate('new')];
  assert.equal(recommendBooks(books, 'nature', ['nature'], [], 'en')[0].reason, 'interest');
  assert.equal(recommendBooks(books, 'nature', [], [record('old')], 'en')[0].reason, 'reading');
  assert.equal(recommendBooks(books, 'nature', ['nature'], [record('old')], 'en')[0].reason, 'interest-and-reading');
  const guest = recommendBooks(books, 'nature', [], [], 'en')[0];
  assert.equal(guest.reason, 'topic');
  assert.equal(guest.recentBook, null, 'No previous identity state is retained by the ranker');
});

test('small shelves are deterministic and limited without padding missing books', () => {
  const books = ['d', 'b', 'a', 'c'].map(id => candidate(id));
  assert.deepEqual(recommendBooks(books, 'nature', [], [], 'en').map(item => item.book.id), ['a', 'b', 'c']);
  assert.deepEqual(recommendBooks([...books].reverse(), 'nature', [], [], 'en').map(item => item.book.id), ['a', 'b', 'c']);
  assert.deepEqual(recommendBooks([], 'science', [], [], 'en'), []);
});

test('saved curiosity starts a path, reading helps newcomers, invalid URLs use a safe default', () => {
  assert.equal(startingTopic(['stories'], [record('old', 'science')]), 'stories');
  assert.equal(startingTopic([], [record('old', 'science')]), 'science');
  assert.equal(startingTopic([], []), 'nature');
  assert.equal(readExploreTopic('science'), 'science');
  assert.equal(readExploreTopic('unknown'), null);
  assert.equal(readExploreTopic('https://example.invalid'), null);
});

test('curated resources use fixed educator URLs with no learner identifiers or tracking query', () => {
  const publishers = new Set(['spaceplace.nasa.gov', 'nationalzoo.si.edu', 'storylineonline.net', 'learnenglishkids.britishcouncil.org', 'phet.colorado.edu']);
  assert.equal(new Set(learningResources.map(resource => resource.id)).size, learningResources.length);
  for (const resource of learningResources) {
    for (const value of [resource.url, resource.vietnameseUrl].filter((value): value is string => Boolean(value))) {
      const url = new URL(value);
      assert.equal(url.protocol, 'https:');
      assert.ok(publishers.has(url.hostname));
      assert.equal(url.search, '');
      assert.equal(url.username, '');
    }
  }
  assert.equal(learningResources.filter(resource => resource.topic === 'nature').length, 2);
  assert.equal(learningResources.filter(resource => resource.topic === 'science').length, 2);
  assert.equal(learningResources.filter(resource => resource.topic === 'stories').length, 2);
});

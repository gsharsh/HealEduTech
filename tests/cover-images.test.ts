import test from 'node:test';
import assert from 'node:assert/strict';
import { getCoverImageSources } from '../src/features/library/coverImages.ts';

const jennyWren = 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Jenny_Wren.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original';

test('Wikimedia originals become responsive thumbnail URLs at card and detail sizes', () => {
  const card = getCoverImageSources(jennyWren, 'card');
  const detail = getCoverImageSources(jennyWren, 'detail');

  assert.equal(card?.src, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Jenny_Wren.jpg/500px-Jenny_Wren.jpg');
  assert.match(card?.srcSet ?? '', /960px-Jenny_Wren\.jpg 960w/);
  assert.match(detail?.srcSet ?? '', /960px-Jenny_Wren\.jpg 960w, .*1280px-Jenny_Wren\.jpg 1280w/);
  assert.equal(card?.src.includes('utm_'), false);
});

test('existing thumbnail URLs and arbitrary staff URLs remain unchanged', () => {
  const thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Jenny_Wren.jpg/640px-Jenny_Wren.jpg';
  const custom = 'https://images.example.org/covers/book.jpg?token=staff-signed';
  const signedCommonsUrl = 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Jenny_Wren.jpg?token=staff-signed';
  assert.deepEqual(getCoverImageSources(thumbnail), { src: thumbnail, srcSet: undefined });
  assert.deepEqual(getCoverImageSources(custom), { src: custom, srcSet: undefined });
  assert.deepEqual(getCoverImageSources(signedCommonsUrl), { src: signedCommonsUrl, srcSet: undefined });
});

test('invalid and non-HTTP URLs are rejected for the fallback cover', () => {
  assert.equal(getCoverImageSources('javascript:alert(1)'), null);
  assert.equal(getCoverImageSources('not a URL'), null);
});

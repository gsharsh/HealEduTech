import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicRoute, publicPath } from '../src/content/publicPages.ts';
import { pageMetadata } from '../src/app/pageMetadata.ts';

test('public language URLs have reciprocal stable canonical paths', () => {
  for (const path of ['/', '/start', '/help', '/privacy']) {
    const vietnamese = publicPath(path, 'vi');
    assert.equal(getPublicRoute(vietnamese)?.language, 'vi');
    assert.equal(publicPath(vietnamese, 'en'), path);
    const metadata = pageMetadata(vietnamese, 'en');
    assert.equal(metadata.language, 'vi');
    assert.equal(metadata.index, true);
    assert.deepEqual(metadata.alternates, { en: path, vi: vietnamese });
  }
});

test('private and unknown routes do not get indexable metadata or language alternates', () => {
  for (const path of ['/learning', '/account', '/sign-in', '/reset-password', '/staff/students/private-id', '/admin/settings', '/not-a-page']) {
    const metadata = pageMetadata(path, 'en');
    assert.equal(metadata.index, false);
    assert.equal(metadata.alternates, undefined);
  }
  assert.equal(getPublicRoute('/vi/staff'), null);
  assert.equal(publicPath('/staff', 'vi'), '/staff');
});

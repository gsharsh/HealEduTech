import test from 'node:test';
import assert from 'node:assert/strict';
import { validEmail, validPassword, authCallbackErrorFromUrl, authErrorKey, safeNextPath } from '../src/features/auth/validation.ts';
import { buildBookSearchFilter } from '../src/features/library/search.ts';
test('email validation permits normal aliases and rejects malformed input', () => {
  assert.ok(validEmail('learner+evg@example.com'));
  assert.ok(validEmail(' student@example.com '));
  for (const value of ['', 'a@', 'a b@example.com', 'a@@example.com', 'a@example', 'a'.repeat(255) + '@example.com']) assert.equal(validEmail(value), false);
});
test('password length supports memorable passphrases with bounded input', () => {
  assert.equal(validPassword('too short'), false);
  assert.ok(validPassword('a memorable phrase'));
  assert.ok(validPassword('a'.repeat(128)));
  assert.equal(validPassword('a'.repeat(129)), false);
});
test('link errors provide safe actionable messages without revealing backend details', () => {
  assert.equal(authErrorKey({status:429}), 'auth.rateLimit');
  assert.equal(authErrorKey({code:'email_not_confirmed'}), 'auth.unconfirmed');
  assert.equal(authErrorKey({code:'invalid_credentials'}), 'auth.invalidCredentials');
  assert.equal(authErrorKey({code:'otp_expired'}), 'auth.linkExpired');
  assert.equal(authErrorKey({code:'access_denied'}), 'auth.linkExpired');
  assert.equal(authErrorKey({code:'unexpected_internal_error'}), 'auth.failed');
});
test('catalogue search quotes punctuation before building a PostgREST OR filter', () => {
  const filter = buildBookSearchFilter('Seed (the "green")\\book');
  assert.equal(filter, 'title_en.ilike."%Seed (the \\"green\\")\\\\book%",title_vi.ilike."%Seed (the \\"green\\")\\\\book%",author.ilike."%Seed (the \\"green\\")\\\\book%"');
  assert.equal(buildBookSearchFilter('Beatrix Potter'), 'title_en.ilike."%Beatrix Potter%",title_vi.ilike."%Beatrix Potter%",author.ilike."%Beatrix Potter%"');
  assert.equal(buildBookSearchFilter('%,_'), null);
});
test('auth callback errors are read from link query or hash without exposing provider text', () => {
  assert.equal(authCallbackErrorFromUrl('https://heal-edu-tech.vercel.app/sign-in?error_code=otp_expired'), 'auth.linkExpired');
  assert.equal(authCallbackErrorFromUrl('https://heal-edu-tech.vercel.app/sign-in#error=access_denied'), 'auth.linkExpired');
  assert.equal(authCallbackErrorFromUrl('https://heal-edu-tech.vercel.app/sign-in'), null);
});
test('next redirect only allows known local pages with safe characters', () => {
  assert.equal(safeNextPath('/library'), '/library');
  assert.equal(safeNextPath('/library?page=2#books'), '/library?page=2#books');
  assert.equal(safeNextPath('/library/the-tale-of-peter-rabbit'), '/library/the-tale-of-peter-rabbit');
  for (const value of [null, '', 'https://evil.example', '//evil.example', '/unknown', '/library\\evil', '/library%5cevil', '/library%0aevil', '/admin/%2f..']) {
    assert.equal(safeNextPath(value), '/learning');
  }
});

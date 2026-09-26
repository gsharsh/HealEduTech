import test from 'node:test';
import assert from 'node:assert/strict';
import { validEmail, validPassword, authCallbackErrorFromUrl, authErrorKey, recoveryTokenMatches, safeBrowseTarget, safeNextPath, buildAuthRedirectUrl } from '../src/features/auth/validation.ts';
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
test('password recovery requires the exact recovery access token', () => {
  assert.equal(recoveryTokenMatches('recovery-token', 'recovery-token', null), true);
  assert.equal(recoveryTokenMatches('recovery-token', null, 'recovery-token'), true);
  assert.equal(recoveryTokenMatches('new-token', 'recovery-token', 'recovery-token'), false);
  assert.equal(recoveryTokenMatches(null, 'recovery-token', 'recovery-token'), false);
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
  assert.equal(safeNextPath('/admin/circulation'), '/admin/circulation');
  assert.equal(safeNextPath('/staff/catalogue'), '/staff/catalogue');
  assert.equal(safeNextPath('/staff/circulation'), '/staff/circulation');
  assert.equal(safeNextPath('/admin/settings'), '/admin/settings');
  for (const value of [null, '', 'https://evil.example', '//evil.example', '/unknown', '/library\\evil', '/library%5cevil', '/library%0aevil', '/admin/%2f..']) {
    assert.equal(safeNextPath(value), '/learning');
  }
});
test('browse link keeps valid filtered library routes and falls back for non-browse routes', () => {
  assert.equal(safeBrowseTarget('/library?page=2&q=Peter+Rabbit&topic=nature'), '/library?page=2&q=Peter+Rabbit&topic=nature');
  assert.equal(safeBrowseTarget('/library/a1456d90-a434-4b7a-a4a4-17b5096533b1?returnTo=%2Flibrary%3Fpage%3D2'), '/library/a1456d90-a434-4b7a-a4a4-17b5096533b1?returnTo=%2Flibrary%3Fpage%3D2');
  assert.equal(safeBrowseTarget('/admin/settings'), '/library');
  assert.equal(safeBrowseTarget('https://evil.example'), '/library');
});
test('auth callback URLs preserve only sanitized local next paths', () => {
  assert.equal(buildAuthRedirectUrl('https://evg.example', '/library/a1456d90-a434-4b7a-a4a4-17b5096533b1?returnTo=%2Flibrary%3Fpage%3D2'), 'https://evg.example/sign-in?next=%2Flibrary%2Fa1456d90-a434-4b7a-a4a4-17b5096533b1%3FreturnTo%3D%252Flibrary%253Fpage%253D2');
  assert.equal(buildAuthRedirectUrl('https://evg.example', 'https://evil.example'), 'https://evg.example/sign-in?next=%2Flearning');
  assert.equal(buildAuthRedirectUrl('https://evg.example'), 'https://evg.example/sign-in');
  assert.equal(buildAuthRedirectUrl('https://evg.example', '/library', 'recovery'), 'https://evg.example/sign-in?mode=recovery&next=%2Flibrary');
});

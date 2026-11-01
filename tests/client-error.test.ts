import test from 'node:test';
import assert from 'node:assert/strict';
import { errorArea, parseClientErrorEvent } from '../src/lib/clientErrorEvent.ts';
import handler from '../api/client-error.ts';

test('client error events cannot contain record IDs, credentials, exception text or arbitrary labels', () => {
  assert.deepEqual(parseClientErrorEvent({ kind: 'render_error', area: 'staff' }), { kind: 'render_error', area: 'staff' });
  for (const value of [null, [], { kind: 'render_error', area: 'staff', message: 'private' }, { kind: 'private error text', area: 'home' }, { kind: 'render_error', area: '/account/secret' }]) assert.equal(parseClientErrorEvent(value), null);
  assert.equal(errorArea('/library/record-id'), 'library');
  assert.equal(errorArea('/staff/students/private-id'), 'staff');
  assert.equal(errorArea('/sign-in'), 'auth');
  assert.equal(errorArea('/private-token'), 'other');
});

function invoke(overrides: Record<string, unknown> = {}) {
  const headers = { origin: 'https://evg.example', host: 'evg.example', 'content-type': 'application/json' };
  const request = { method: 'POST', headers, body: { kind: 'render_error', area: 'library' }, ...overrides };
  let statusCode = 200;
  const response = { get statusCode() { return statusCode; }, set statusCode(value: number) { statusCode = value; }, setHeader() {}, end() {} };
  handler(request as Parameters<typeof handler>[0], response);
  return statusCode;
}

test('error receiver rejects cross-origin requests and unbounded payloads', () => {
  assert.equal(invoke({ method: 'GET' }), 405);
  assert.equal(invoke({ headers: { origin: 'https://other.example', host: 'evg.example', 'content-type': 'application/json' } }), 403);
  assert.equal(invoke({ headers: { host: 'evg.example', 'content-type': 'application/json' } }), 403);
  assert.equal(invoke({ headers: { origin: 'https://evg.example', host: 'evg.example', 'content-type': 'text/plain' } }), 415);
  assert.equal(invoke({ headers: { origin: 'https://evg.example', host: 'evg.example', 'content-type': 'application/json', 'content-length': '1000' } }), 413);
  assert.equal(invoke({ body: { kind: 'render_error', area: 'library', token: 'private' } }), 400);
  const response = { statusCode: 200, setHeader() {}, end() {} };
  const request = { method: 'POST', headers: { origin: 'https://evg.example', host: 'evg.example', 'content-type': 'application/json' }, get body() { throw new Error('Malformed JSON'); } };
  handler(request, response);
  assert.equal(response.statusCode, 400);
});

test('error receiver logs only bounded categories and applies a per-instance cap', () => {
  const messages: unknown[][] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => { messages.push(args); };
  try {
    assert.equal(invoke(), 204);
    assert.deepEqual(messages, [['evg-client-error', '{"kind":"render_error","area":"library"}']]);
    for (let index = 1; index < 30; index += 1) assert.equal(invoke(), 204);
    assert.equal(invoke(), 429);
  } finally { console.info = original; }
});

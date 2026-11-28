import assert from 'node:assert/strict';
import test from 'node:test';
import { createBackendFetch } from '../src/lib/backendRequestPolicy.ts';
import { isRequestRateLimited, requestFailureMessage } from '../src/lib/requestFeedback.ts';

const waitingFetch: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
  const signal = init!.signal!;
  if (signal.aborted) { reject(signal.reason); return; }
  signal.addEventListener('abort', () => reject(signal.reason), { once: true });
});

test('backend requests respect caller cancellation and a finite timeout', async () => {
  const fetcher = createBackendFetch(waitingFetch, 25);
  const controller = new AbortController();
  const pending = fetcher('https://backend.example/rest/v1/books', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  // AbortSignal.timeout uses an unref timer in Node; retain this test until it fires.
  const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(fetcher('https://backend.example/auth/v1/token'), { name: 'TimeoutError' }); }
  finally { clearTimeout(keepAlive); }
});

test('a Request object signal is preserved without changing its body or headers', async () => {
  const controller = new AbortController();
  const input = new Request('https://backend.example/rest/v1/rpc/action', { method: 'POST', body: '{"example":true}', headers: { 'Content-Type': 'application/json' }, signal: controller.signal });
  const fetcher = createBackendFetch(async (request, init) => {
    assert.equal(request, input);
    assert.equal(input.method, 'POST');
    assert.equal(input.headers.get('Content-Type'), 'application/json');
    controller.abort();
    assert.equal(init!.signal!.aborted, true);
    return new Response('{}');
  });
  await fetcher(input);
});

test('429 responses are returned once and are never automatically replayed by the transport', async () => {
  let calls = 0;
  const response = new Response('{"code":"EVG_RATE_LIMITED"}', { status: 429, headers: { 'Retry-After': '60' } });
  const fetcher = createBackendFetch(async () => { calls += 1; return response; });
  assert.equal(await fetcher('https://backend.example/rest/v1/reading_records'), response);
  assert.equal(calls, 1);
  assert.equal(response.headers.get('Retry-After'), '60');
});

test('rate-limit and timeout feedback is actionable and never reveals service text', () => {
  for (const error of [{ status: 429 }, { code: 'PT429' }, { code: 'EVG_RATE_LIMITED' }, { message: 'EVG_RATE_LIMITED' }]) {
    assert.ok(isRequestRateLimited(error));
    assert.match(requestFailureMessage(error, 'en', 'Fallback'), /Wait a minute/);
    assert.match(requestFailureMessage(error, 'vi', 'Fallback'), /một phút/);
  }
  assert.match(requestFailureMessage({ name: 'TimeoutError' }, 'en', 'Fallback'), /check its status/);
  assert.equal(requestFailureMessage({ message: 'private database details' }, 'en', 'Safe fallback'), 'Safe fallback');
  assert.equal(isRequestRateLimited(null), false);
});

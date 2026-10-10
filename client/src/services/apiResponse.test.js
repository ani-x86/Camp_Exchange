import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readApiResponse } from './apiResponse.js';

test('returns JSON from a successful response', async () => {
  const response = new Response('{"accessToken":"token"}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  assert.deepEqual(await readApiResponse(response, 'Sign-in failed.'), {
    accessToken: 'token',
  });
});

test('surfaces a server JSON error', async () => {
  const response = new Response('{"error":"Invalid credentials."}', { status: 401 });

  await assert.rejects(
    readApiResponse(response, 'Sign-in failed.'),
    /Invalid credentials/
  );
});

test('reports empty server responses without leaking a JSON parse error', async () => {
  const response = new Response('', { status: 502 });

  await assert.rejects(
    readApiResponse(response, 'Sign-in failed.'),
    /empty response \(HTTP 502\)/
  );
});

test('reports non-JSON proxy responses using the HTTP status', async () => {
  const response = new Response('<html>Bad Gateway</html>', { status: 502 });

  await assert.rejects(
    readApiResponse(response, 'Sign-in failed.'),
    /invalid response \(HTTP 502\)/
  );
});

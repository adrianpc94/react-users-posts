import { expect, it } from 'vitest';
import { createPost, getJson, USERS_URL } from './api';
import { installFetchMock } from './test/mockFetch';

it('createPost sends JSON with a JSON content type', async () => {
  const api = installFetchMock();
  const done = createPost({ userId: 1, title: 't', body: 'b' }, new AbortController().signal);
  await api.respond('POST /posts', { id: 101 });
  await done;
  const [init] = api.calls('POST /posts');
  expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  expect(JSON.parse(String(init.body))).toEqual({ userId: 1, title: 't', body: 'b' });
});

it('E1 getJson rejects on a non-OK response', async () => {
  const api = installFetchMock();
  const result = getJson(USERS_URL, new AbortController().signal);
  const assertion = expect(result).rejects.toThrow();
  await api.fail('GET /users', 500);
  await assertion;
});

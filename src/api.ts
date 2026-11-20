export const API_URL = 'https://jsonplaceholder.typicode.com';
export const USERS_URL = `${API_URL}/users`;

export function userPostsUrl(userId: number): string {
  return `${API_URL}/users/${userId}/posts`;
}

export type User = { id: number; name: string };
export type Post = { id: number; userId: number; title: string; body: string };
export type NewPost = { userId: number; title: string; body: string };
/** A post created in this session. The API always answers `id: 101`, so it gets its own id. */
export type CreatedPost = NewPost & { localId: string };

export async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`);
  }
  // The API's shape is trusted, not validated at runtime (no schema library).
  return (await response.json()) as T;
}

export async function createPost(post: NewPost, signal: AbortSignal): Promise<void> {
  const response = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
    signal,
  });
  if (!response.ok) {
    throw new Error(`POST /posts failed with ${response.status}`);
  }
}

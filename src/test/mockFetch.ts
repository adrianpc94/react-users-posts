import { act } from '@testing-library/react';
import { vi } from 'vitest';

type Pending = {
  resolve: (response: Response) => void;
  reject: (reason: unknown) => void;
};

export type FetchMock = {
  /** Answers the oldest pending request on `route` with a 200 JSON response. */
  respond(route: string, data: unknown): Promise<void>;
  /** Answers the oldest pending request on `route` with an error status. */
  fail(route: string, status?: number): Promise<void>;
  /** Fails the oldest pending request on `route` with no response at all (offline, DNS, CORS). */
  networkError(route: string): Promise<void>;
  /** Every request made on `route`, in order; [] if none. */
  calls(route: string): RequestInit[];
};

/**
 * Replaces global `fetch` with a controllable fake. Routes are
 * `${METHOD} ${pathname}`, e.g. 'GET /users' or 'POST /posts'.
 * Requests stay pending until the test settles them, and reject with an
 * AbortError when their signal aborts, like real `fetch`.
 */
export function installFetchMock(): FetchMock {
  const pending = new Map<string, Pending[]>();
  const calls = new Map<string, RequestInit[]>();

  const fetchMock = (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    const route = `${init.method ?? 'GET'} ${new URL(url).pathname}`;
    calls.set(route, [...(calls.get(route) ?? []), init]);

    return new Promise<Response>((resolve, reject) => {
      if (init.signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      const entry: Pending = { resolve, reject };
      pending.set(route, [...(pending.get(route) ?? []), entry]);
      init.signal?.addEventListener('abort', () => {
        pending.set(route, (pending.get(route) ?? []).filter((p) => p !== entry));
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  };
  vi.stubGlobal('fetch', fetchMock);

  async function settle(route: string, finish: (entry: Pending) => void): Promise<void> {
    let entry: Pending | undefined;
    await vi.waitFor(() => {
      entry = pending.get(route)?.[0];
      if (!entry) {
        const open = [...pending].filter(([, list]) => list.length).map(([r]) => r);
        throw new Error(`No pending request on "${route}". Pending: ${open.join(', ') || 'none'}`);
      }
    });
    const found = entry as Pending; // set by the waitFor callback above, which throws until it is
    pending.set(route, (pending.get(route) ?? []).slice(1));
    await act(async () => {
      finish(found);
    });
  }

  return {
    respond: (route, data) =>
      settle(route, (e) => e.resolve(new Response(JSON.stringify(data), { status: 200 }))),
    fail: (route, status = 500) => settle(route, (e) => e.resolve(new Response(null, { status }))),
    networkError: (route) => settle(route, (e) => e.reject(new TypeError('Failed to fetch'))),
    calls: (route) => calls.get(route) ?? [],
  };
}

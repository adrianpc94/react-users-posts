import { act } from '@testing-library/react';
import { vi } from 'vitest';

type Pending = {
  resolve: (response: Response) => void;
};

export type FetchMock = {
  /** Answers the oldest pending request on `route` with a 200 JSON response. */
  respond(route: string, data: unknown): Promise<void>;
  /** Answers the oldest pending request on `route` with an error status. */
  fail(route: string, status?: number): Promise<void>;
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
      const entry: Pending = { resolve };
      pending.set(route, [...(pending.get(route) ?? []), entry]);
      init.signal?.addEventListener('abort', () => {
        pending.set(route, (pending.get(route) ?? []).filter((p) => p !== entry));
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  };
  vi.stubGlobal('fetch', fetchMock);

  async function settle(route: string, response: Response): Promise<void> {
    await vi.waitFor(() => {
      if (!pending.get(route)?.length) {
        const open = [...pending].filter(([, list]) => list.length).map(([r]) => r);
        throw new Error(`No pending request on "${route}". Pending: ${open.join(', ') || 'none'}`);
      }
    });
    const [first, ...rest] = pending.get(route) ?? [];
    pending.set(route, rest);
    await act(async () => {
      first.resolve(response);
    });
  }

  return {
    respond: (route, data) => settle(route, new Response(JSON.stringify(data), { status: 200 })),
    fail: (route, status = 500) => settle(route, new Response(null, { status })),
    calls: (route) => calls.get(route) ?? [],
  };
}

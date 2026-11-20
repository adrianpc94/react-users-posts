import { useCallback, useEffect, useState } from 'react';
import { getJson } from './api';
import type { RequestState } from './requestState';

/**
 * Fetches `url` on mount and on `retry()`. The URL is expected to stay the same
 * for the component's lifetime: callers that switch URLs remount with a `key`.
 */
export function useRequest<T>(url: string): { state: RequestState<T>; retry: () => void } {
  const [state, setState] = useState<RequestState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    getJson<T>(url, signal).then(
      (data) => {
        if (!signal.aborted) setState({ status: 'success', data });
      },
      () => {
        // An aborted request is not an error: the component moved on.
        if (!signal.aborted) setState({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, [url, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

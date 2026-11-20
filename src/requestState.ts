export type RequestState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error' };

/** Ends an exhaustive switch: a new state that isn't handled becomes a type error. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled state: ${JSON.stringify(value)}`);
}

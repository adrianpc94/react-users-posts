let counter = 0;

/**
 * Ids for posts created in this session. The API answers `id: 101` for every
 * POST, so its id can't be used as a React key.
 */
export function nextLocalId(): string {
  counter += 1;
  return `local-${counter}`;
}

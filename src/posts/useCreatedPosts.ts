import { useCallback, useState } from 'react';
import type { CreatedPost } from '../api';

const NONE: readonly CreatedPost[] = [];

/** Posts created this session, per user, newest first. Lost on reload: the API stores nothing. */
export function useCreatedPosts() {
  const [byUser, setByUser] = useState<Record<number, CreatedPost[]>>({});

  const add = useCallback((post: CreatedPost) => {
    setByUser((prev) => ({ ...prev, [post.userId]: [post, ...(prev[post.userId] ?? [])] }));
  }, []);

  const createdFor = (userId: number): readonly CreatedPost[] => byUser[userId] ?? NONE;

  return { createdFor, add };
}

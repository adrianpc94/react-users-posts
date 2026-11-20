import { userPostsUrl, type Post } from '../api';
import { useRequest } from '../useRequest';

export function useUserPosts(userId: number) {
  return useRequest<Post[]>(userPostsUrl(userId));
}

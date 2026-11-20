import type { CreatedPost, Post } from '../api';
import { PostItem } from './PostItem';
import './posts.css';

type PostListProps = {
  /** Posts created this session, newest first; always listed first. */
  created: readonly CreatedPost[];
  fetched: readonly Post[];
};

export function PostList({ created, fetched }: PostListProps) {
  return (
    <ul className="post-list" aria-label="Posts">
      {created.map((post) => (
        <PostItem key={post.localId} title={post.title} body={post.body} isNew />
      ))}
      {fetched.map((post) => (
        <PostItem key={post.id} title={post.title} body={post.body} />
      ))}
    </ul>
  );
}

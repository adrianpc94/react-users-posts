import type { CreatedPost, User } from '../api';
import { useUserPosts } from '../hooks';
import { assertNever } from '../requestState';

type PostsPanelProps = {
  user: User;
  /** Posts created this session for this user, newest first. */
  createdPosts: readonly CreatedPost[];
  onCreated: (post: CreatedPost) => void;
};

export function PostsPanel({ user, createdPosts }: PostsPanelProps) {
  const { state, retry } = useUserPosts(user.id);
  const fetched = state.status === 'success' ? state.data : [];

  return (
    <section className="posts" aria-labelledby="posts-heading">
      <header className="posts-header">
        <h2 id="posts-heading">{user.name}'s posts</h2>
        <button type="button">+ New post</button>
      </header>
      <ul className="post-list" aria-label="Posts">
        {createdPosts.map((post) => (
          <li key={post.localId}>
            <h3>
              {post.title} <span className="tag">just added</span>
            </h3>
            <p>{post.body}</p>
          </li>
        ))}
        {fetched.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>
      {renderStatus()}
    </section>
  );

  function renderStatus() {
    switch (state.status) {
      case 'loading':
        return <p role="status">Loading posts…</p>;
      case 'error':
        return (
          <div className="error">
            <p role="alert">Couldn't load posts.</p>
            <button type="button" onClick={retry}>
              Retry
            </button>
          </div>
        );
      case 'success':
        return state.data.length === 0 && createdPosts.length === 0 ? <p>No posts yet.</p> : null;
      default:
        return assertNever(state);
    }
  }
}

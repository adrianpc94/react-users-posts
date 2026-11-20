import { useId, useRef, useState } from 'react';
import type { CreatedPost, User } from '../api';
import { useUserPosts } from '../hooks';
import { assertNever } from '../requestState';
import { ErrorWithRetry } from '../ui/ErrorWithRetry';
import { NewPostForm } from './NewPostForm';
import { PostList } from './PostList';
import './posts.css';

type PostsPanelProps = {
  user: User;
  /** Posts created this session for this user, newest first. */
  createdPosts: readonly CreatedPost[];
  onCreated: (post: CreatedPost) => void;
};

/**
 * One user's posts and the new-post form. Render it with `key={user.id}` so
 * switching users starts a fresh panel: new request, form closed.
 */
export function PostsPanel({ user, createdPosts, onCreated }: PostsPanelProps) {
  const { state, retry } = useUserPosts(user.id);
  const [formOpen, setFormOpen] = useState(false);
  const newPostButtonRef = useRef<HTMLButtonElement>(null);
  const formId = useId();

  function closeForm() {
    setFormOpen(false);
    newPostButtonRef.current?.focus();
  }

  return (
    <section className="posts" aria-labelledby="posts-heading">
      <header className="posts-header">
        <h2 id="posts-heading">{user.name}'s posts</h2>
        <button
          ref={newPostButtonRef}
          type="button"
          className="button"
          aria-expanded={formOpen}
          aria-controls={formOpen ? formId : undefined}
          onClick={() => (formOpen ? closeForm() : setFormOpen(true))}
        >
          + New post
        </button>
      </header>
      {formOpen ? (
        <NewPostForm id={formId} userId={user.id} onCreated={onCreated} onClose={closeForm} />
      ) : null}
      <PostList created={createdPosts} fetched={state.status === 'success' ? state.data : []} />
      {renderStatus()}
    </section>
  );

  function renderStatus() {
    switch (state.status) {
      case 'loading':
        return <p role="status">Loading posts…</p>;
      case 'error':
        return <ErrorWithRetry message="Couldn't load posts." onRetry={retry} />;
      case 'success':
        return state.data.length === 0 && createdPosts.length === 0 ? (
          <p className="muted">No posts yet.</p>
        ) : null;
      default:
        return assertNever(state);
    }
  }
}

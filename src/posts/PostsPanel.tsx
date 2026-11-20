import { useId, useRef, useState } from 'react';
import type { CreatedPost, User } from '../api';
import { assertNever, type RequestState } from '../requestState';
import { ErrorWithRetry } from '../ui/ErrorWithRetry';
import { NewPostForm } from './NewPostForm';
import { PostList } from './PostList';
import './posts.css';
import { useUserPosts } from './useUserPosts';

type PostsPanelProps = {
  user: User;
  /** Posts created this session for this user, newest first. */
  createdPosts: readonly CreatedPost[];
  onCreated: (post: CreatedPost) => void;
};

/** What the always-present status region says; empty when there is nothing to announce. */
function statusText(state: RequestState<unknown[]>, hasCreated: boolean): string {
  switch (state.status) {
    case 'loading':
      return 'Loading posts…';
    case 'error':
      return '';
    case 'success':
      return state.data.length === 0 && !hasCreated ? 'No posts yet.' : '';
    default:
      return assertNever(state);
  }
}

/**
 * One user's posts and the new-post form. Render it with `key={user.id}` so
 * switching users starts a fresh panel: new request, form closed.
 */
export function PostsPanel({ user, createdPosts, onCreated }: PostsPanelProps) {
  const { state, retry } = useUserPosts(user.id);
  const [formOpen, setFormOpen] = useState(false);
  const newPostButtonRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const formId = useId();

  function closeForm() {
    setFormOpen(false);
    newPostButtonRef.current?.focus();
  }

  return (
    <section className="posts" aria-labelledby={headingId}>
      <header className="posts-header">
        <h2 id={headingId}>{user.name}'s posts</h2>
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
      {/* Always rendered, so screen readers announce its text when it changes. */}
      <p role="status" className="status">
        {statusText(state, createdPosts.length > 0)}
      </p>
      {state.status === 'error' ? (
        <ErrorWithRetry message="Couldn't load posts." onRetry={retry} />
      ) : null}
    </section>
  );
}

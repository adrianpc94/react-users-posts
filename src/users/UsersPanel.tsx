import { useId, useState } from 'react';
import type { User } from '../api';
import { assertNever, type RequestState } from '../requestState';
import { ErrorWithRetry } from '../ui/ErrorWithRetry';
import { UserList } from './UserList';
import './users.css';

type UsersPanelProps = {
  state: RequestState<User[]>;
  onRetry: () => void;
  selectedUserId: number | null;
  onSelect: (userId: number) => void;
};

function matchesQuery(user: User, query: string): boolean {
  return user.name.toLowerCase().includes(query.trim().toLowerCase());
}

/** What the always-present status region says; empty when there is nothing to announce. */
function statusText(state: RequestState<User[]>, matches: readonly User[], query: string): string {
  switch (state.status) {
    case 'loading':
      return 'Loading users…';
    case 'error':
      return '';
    case 'success':
      if (state.data.length === 0) return 'No users found.';
      return matches.length === 0 ? `No users match “${query.trim()}”` : '';
    default:
      return assertNever(state);
  }
}

/** The users column: search box, then the loading, error, no-match or list state. */
export function UsersPanel({ state, onRetry, selectedUserId, onSelect }: UsersPanelProps) {
  const [query, setQuery] = useState('');
  const headingId = useId();
  // Derived during render: no extra state to keep in sync.
  const matches = state.status === 'success' ? state.data.filter((u) => matchesQuery(u, query)) : [];

  return (
    <section className="users" aria-labelledby={headingId}>
      <h2 id={headingId}>Users</h2>
      <label className="search">
        <span className="search-label">Search users by name</span>
        <input
          type="search"
          name="search"
          autoComplete="off"
          spellCheck={false}
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {/* Always rendered, so screen readers announce its text when it changes. */}
      <p role="status" className="status">
        {statusText(state, matches, query)}
      </p>
      {state.status === 'error' ? (
        <ErrorWithRetry message="Couldn’t load users. Check your connection and try again." onRetry={onRetry} />
      ) : null}
      {matches.length > 0 ? (
        <UserList users={matches} selectedUserId={selectedUserId} onSelect={onSelect} />
      ) : null}
    </section>
  );
}

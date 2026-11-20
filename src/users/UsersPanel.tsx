import { useState } from 'react';
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

/** The users column: search box, then the loading, error, no-match or list state. */
export function UsersPanel({ state, onRetry, selectedUserId, onSelect }: UsersPanelProps) {
  const [query, setQuery] = useState('');

  return (
    <section className="users" aria-labelledby="users-heading">
      <h2 id="users-heading">Users</h2>
      <label className="search">
        <span className="search-label">Search users by name</span>
        <input
          type="search"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {renderBody()}
    </section>
  );

  function renderBody() {
    switch (state.status) {
      case 'loading':
        return <p role="status">Loading users…</p>;
      case 'error':
        return <ErrorWithRetry message="Couldn't load users." onRetry={onRetry} />;
      case 'success': {
        const needle = query.trim().toLowerCase();
        const matches = state.data.filter((user) => user.name.toLowerCase().includes(needle));
        return matches.length === 0 ? (
          <p role="status">No users match "{query.trim()}"</p>
        ) : (
          <UserList users={matches} selectedUserId={selectedUserId} onSelect={onSelect} />
        );
      }
      default:
        return assertNever(state);
    }
  }
}

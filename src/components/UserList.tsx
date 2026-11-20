import { useState } from 'react';
import type { User } from '../api';
import { assertNever, type RequestState } from '../requestState';

type UserListProps = {
  state: RequestState<User[]>;
  onRetry: () => void;
  selectedUserId: number | null;
  onSelect: (userId: number) => void;
};

export function UserList({ state, onRetry, selectedUserId, onSelect }: UserListProps) {
  const [query, setQuery] = useState('');

  return (
    <section className="users" aria-labelledby="users-heading">
      <h2 id="users-heading">Users</h2>
      <label className="search">
        <span>Search users by name</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {renderBody()}
    </section>
  );

  function renderBody() {
    switch (state.status) {
      case 'loading':
        return <p role="status">Loading users…</p>;
      case 'error':
        return (
          <div className="error">
            <p role="alert">Couldn't load users.</p>
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        );
      case 'success': {
        const needle = query.trim().toLowerCase();
        const matches = state.data.filter((user) => user.name.toLowerCase().includes(needle));
        if (matches.length === 0) {
          return <p role="status">No users match "{query.trim()}"</p>;
        }
        return (
          <ul className="user-list">
            {matches.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  aria-pressed={user.id === selectedUserId}
                  onClick={() => onSelect(user.id)}
                >
                  {user.name}
                </button>
              </li>
            ))}
          </ul>
        );
      }
      default:
        return assertNever(state);
    }
  }
}

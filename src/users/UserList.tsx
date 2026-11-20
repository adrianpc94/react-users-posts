import type { User } from '../api';
import './users.css';

type UserListProps = {
  users: readonly User[];
  selectedUserId: number | null;
  onSelect: (userId: number) => void;
};

export function UserList({ users, selectedUserId, onSelect }: UserListProps) {
  return (
    <ul className="user-list">
      {users.map((user) => (
        <li key={user.id} className="user-list-item">
          <button
            type="button"
            className="user-button"
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

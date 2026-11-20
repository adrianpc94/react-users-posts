import { useState } from 'react';
import './App.css';
import { UserList } from './components/UserList';
import { useUsers } from './hooks';

export default function App() {
  const users = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  return (
    <main className="app">
      <h1>Users &amp; Posts</h1>
      <div className="columns">
        <UserList
          state={users.state}
          onRetry={users.retry}
          selectedUserId={selectedUserId}
          onSelect={setSelectedUserId}
        />
        <section className="posts">
          <p className="placeholder">Select a user to see their posts.</p>
        </section>
      </div>
    </main>
  );
}

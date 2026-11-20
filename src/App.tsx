import { useCallback, useState } from 'react';
import type { CreatedPost } from './api';
import './App.css';
import { PostsPanel } from './components/PostsPanel';
import { UserList } from './components/UserList';
import { useUsers } from './hooks';

export default function App() {
  const users = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [createdByUser, setCreatedByUser] = useState<Record<number, CreatedPost[]>>({});

  // Looked up in the full list, so a search that hides the selected user keeps its posts open.
  const selectedUser =
    users.state.status === 'success'
      ? users.state.data.find((user) => user.id === selectedUserId)
      : undefined;

  const handleCreated = useCallback((post: CreatedPost) => {
    setCreatedByUser((prev) => ({ ...prev, [post.userId]: [post, ...(prev[post.userId] ?? [])] }));
  }, []);

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
        {selectedUser ? (
          <PostsPanel
            key={selectedUser.id}
            user={selectedUser}
            createdPosts={createdByUser[selectedUser.id] ?? []}
            onCreated={handleCreated}
          />
        ) : (
          <section className="posts">
            <p className="placeholder">Select a user to see their posts.</p>
          </section>
        )}
      </div>
    </main>
  );
}

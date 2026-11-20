import { useState } from 'react';
import './App.css';
import { useUsers } from './users/useUsers';
import { PostsPanel } from './posts/PostsPanel';
import { useCreatedPosts } from './posts/useCreatedPosts';
import { UsersPanel } from './users/UsersPanel';

export default function App() {
  const users = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const createdPosts = useCreatedPosts();

  // Looked up in the full list, so a search that hides the selected user keeps its posts open.
  const selectedUser =
    users.state.status === 'success'
      ? users.state.data.find((user) => user.id === selectedUserId)
      : undefined;

  return (
    <main className="app">
      <h1>Users &amp; Posts</h1>
      <div className="columns">
        <UsersPanel
          state={users.state}
          onRetry={users.retry}
          selectedUserId={selectedUserId}
          onSelect={setSelectedUserId}
        />
        {selectedUser ? (
          <PostsPanel
            key={selectedUser.id}
            user={selectedUser}
            createdPosts={createdPosts.createdFor(selectedUser.id)}
            onCreated={createdPosts.add}
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

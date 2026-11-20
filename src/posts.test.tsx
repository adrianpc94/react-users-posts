import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import App from './App';
import { postsFor, users } from './test/fixtures';
import { installFetchMock, type FetchMock } from './test/mockFetch';

let api: FetchMock;
beforeEach(() => {
  api = installFetchMock();
});

async function renderWithUsers() {
  const user = userEvent.setup();
  render(<App />);
  await api.respond('GET /users', users);
  await screen.findByRole('button', { name: 'Leanne Graham' });
  return user;
}

it('T4 selecting a user shows loading, then their posts', async () => {
  const user = await renderWithUsers();
  expect(screen.getByText('Select a user to see their posts.')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Leanne Graham' }));
  expect(screen.getByRole('button', { name: 'Leanne Graham' })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('heading', { name: "Leanne Graham's posts" })).toBeInTheDocument();
  const postsRegion = screen.getByRole('region', { name: "Leanne Graham's posts" });
  expect(within(postsRegion).getByRole('status')).toHaveTextContent('Loading posts…');
  expect(screen.queryByRole('list', { name: 'Posts' })).not.toBeInTheDocument();

  await api.respond('GET /users/1/posts', postsFor(1));
  expect(await screen.findByRole('heading', { name: 'User 1 post A' })).toBeInTheDocument();
});

// T8 asserts the abort and the absence of an error. A "late A response" cannot
// be expressed with the mock (aborted entries are rejected), and it is moot
// under the keyed remount.
it('T8 switching users quickly shows only the latest user', async () => {
  const user = await renderWithUsers();
  await user.click(screen.getByRole('button', { name: 'Leanne Graham' }));
  await user.click(screen.getByRole('button', { name: 'Ervin Howell' }));

  await api.respond('GET /users/2/posts', postsFor(2));
  expect(await screen.findByRole('heading', { name: 'User 2 post A' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: "Ervin Howell's posts" })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'User 1 post A' })).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(api.calls('GET /users/1/posts')[0]?.signal?.aborted).toBe(true);
});

it('RF5 a failed posts load shows an error, still offers + New post, and Retry recovers', async () => {
  const user = await renderWithUsers();
  await user.click(screen.getByRole('button', { name: 'Ervin Howell' }));
  await api.fail('GET /users/2/posts');
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load posts.");
  expect(screen.getByRole('button', { name: '+ New post' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await api.respond('GET /users/2/posts', postsFor(2));
  expect(await screen.findByRole('heading', { name: 'User 2 post A' })).toBeInTheDocument();
});

it('E5 a user with no posts shows "No posts yet."', async () => {
  const user = await renderWithUsers();
  await user.click(screen.getByRole('button', { name: 'Clementine Bauch' }));
  await api.respond('GET /users/3/posts', []);
  expect(await screen.findByText('No posts yet.')).toBeInTheDocument();
});

it('E6 only the selected user is marked as current', async () => {
  const user = await renderWithUsers();
  await user.click(screen.getByRole('button', { name: 'Ervin Howell' }));
  expect(screen.getByRole('button', { name: 'Ervin Howell' })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('button', { name: 'Leanne Graham' })).not.toHaveAttribute('aria-current');
});

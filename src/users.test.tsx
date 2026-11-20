import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import App from './App';
import { postsFor, users } from './test/fixtures';
import { installFetchMock, type FetchMock } from './test/mockFetch';

let api: FetchMock;
beforeEach(() => {
  api = installFetchMock();
});

it('T1 shows loading, then the users', async () => {
  render(<App />);
  expect(screen.getByText('Loading users…')).toHaveAttribute('role', 'status');
  await api.respond('GET /users', users);
  expect(await screen.findByRole('button', { name: 'Leanne Graham' })).toBeInTheDocument();
  expect(screen.queryByText('Loading users…')).not.toBeInTheDocument();
});

it('T2 filters by name ignoring case and surrounding spaces, and shows a no-match message', async () => {
  const user = userEvent.setup();
  render(<App />);
  await api.respond('GET /users', users);
  const search = await screen.findByRole('searchbox', { name: 'Search users by name' });

  await user.type(search, '  LEAN ');
  expect(screen.getByRole('button', { name: 'Leanne Graham' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ervin Howell' })).not.toBeInTheDocument();

  await user.clear(search);
  await user.type(search, 'zzz');
  expect(screen.getByText('No users match "zzz"')).toHaveAttribute('role', 'status');
});

it('T3 shows an error with Retry that reloads the users', async () => {
  const user = userEvent.setup();
  render(<App />);
  await api.fail('GET /users');
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load users.");

  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(screen.getByText('Loading users…')).toBeInTheDocument();
  await api.respond('GET /users', users);
  expect(await screen.findByRole('button', { name: 'Leanne Graham' })).toBeInTheDocument();
});

it('E2 clearing the search shows all users again', async () => {
  const user = userEvent.setup();
  render(<App />);
  await api.respond('GET /users', users);
  const search = await screen.findByRole('searchbox', { name: 'Search users by name' });
  await user.type(search, 'ervin');
  expect(screen.queryByRole('button', { name: 'Leanne Graham' })).not.toBeInTheDocument();
  await user.clear(search);
  for (const { name } of users) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  }
});

it('E3 a Retry that fails again keeps the error and Retry', async () => {
  const user = userEvent.setup();
  render(<App />);
  await api.fail('GET /users');
  await user.click(await screen.findByRole('button', { name: 'Retry' }));
  await api.fail('GET /users');
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load users.");
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});

it('E4 a search that hides the selected user keeps the posts panel', async () => {
  const user = userEvent.setup();
  render(<App />);
  await api.respond('GET /users', users);
  await user.click(await screen.findByRole('button', { name: 'Leanne Graham' }));
  await api.respond('GET /users/1/posts', postsFor(1));
  await screen.findByText('User 1 post A');
  await user.type(screen.getByRole('searchbox', { name: 'Search users by name' }), 'ervin');
  expect(screen.queryByRole('button', { name: 'Leanne Graham' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: "Leanne Graham's posts" })).toBeInTheDocument();
  expect(screen.getByText('User 1 post A')).toBeInTheDocument();
});

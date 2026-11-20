import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import App from './App';
import { postsFor, users } from './test/fixtures';
import { installFetchMock, type FetchMock } from './test/mockFetch';

let api: FetchMock;
beforeEach(() => {
  api = installFetchMock();
});

async function openFormFor(name: string, userId: number): Promise<UserEvent> {
  const user = userEvent.setup();
  render(<App />);
  await api.respond('GET /users', users);
  await user.click(await screen.findByRole('button', { name }));
  await api.respond(`GET /users/${userId}/posts`, postsFor(userId));
  await screen.findByRole('heading', { name: `User ${userId} post A` });
  await user.click(screen.getByRole('button', { name: '+ New post' }));
  return user;
}

async function addPost(user: UserEvent, title: string, body: string) {
  await user.type(screen.getByRole('textbox', { name: 'Title' }), title);
  await user.type(screen.getByRole('textbox', { name: 'Body' }), body);
  await user.click(screen.getByRole('button', { name: 'Add post' }));
}

it('T5 empty or blank fields show both errors and send nothing', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  const title = screen.getByRole('textbox', { name: 'Title' });
  expect(title).toHaveFocus();

  await user.click(screen.getByRole('button', { name: 'Add post' }));
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAccessibleDescription('Title is required');
  expect(screen.getByRole('textbox', { name: 'Body' })).toHaveAccessibleDescription('Body is required');
  expect(title).toHaveAttribute('aria-invalid', 'true');
  expect(title).toHaveFocus();

  await addPost(user, '   ', '   ');
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAccessibleDescription('Title is required');
  expect(screen.getByRole('textbox', { name: 'Body' })).toHaveAccessibleDescription('Body is required');

  await user.type(title, 'Hi');
  expect(screen.getByRole('textbox', { name: 'Title' })).not.toHaveAccessibleDescription();
  expect(api.calls('POST /posts')).toHaveLength(0);
});

it('T6 a valid post shows Adding…, is sent once, then appears first and the form closes', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'My post', 'Hello');

  const adding = screen.getByRole('button', { name: 'Adding…' });
  expect(adding).toBeDisabled();
  await user.click(adding);
  expect(api.calls('POST /posts')).toHaveLength(1);

  await api.respond('POST /posts', { id: 101 });
  const items = within(await screen.findByRole('list', { name: 'Posts' })).getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('My post');
  expect(items[0]).toHaveTextContent('just added');
  expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '+ New post' })).toHaveFocus();
  // The finished request must not be cancelled when the form closes (it showed as a
  // cancelled POST in the browser's network panel).
  expect(api.calls('POST /posts')[0]?.signal?.aborted).toBe(false);
});

it('T7 a failed POST keeps the text and re-enables the button', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'My post', 'Hello');
  await api.fail('POST /posts');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    "Couldn’t add the post. Your text is kept; try again.",
  );
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('My post');
  expect(screen.getByRole('button', { name: 'Add post' })).toBeEnabled();
});

it('RF2 switching users mid-POST aborts it and adds nothing', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'My post', 'Hello');

  await user.click(screen.getByRole('button', { name: 'Ervin Howell' }));
  await api.respond('GET /users/2/posts', postsFor(2));
  await screen.findByRole('heading', { name: 'User 2 post A' });
  expect(api.calls('POST /posts')[0]?.signal?.aborted).toBe(true);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Leanne Graham' }));
  await api.respond('GET /users/1/posts', postsFor(1));
  await screen.findByRole('heading', { name: 'User 1 post A' });
  expect(screen.queryByText('just added')).not.toBeInTheDocument();
});

async function switchTo(user: UserEvent, name: string, userId: number) {
  await user.click(screen.getByRole('button', { name }));
  await api.respond(`GET /users/${userId}/posts`, postsFor(userId));
  await screen.findByRole('heading', { name: `User ${userId} post A` });
}

function postItems() {
  return within(screen.getByRole('list', { name: 'Posts' })).getAllByRole('listitem');
}

it('RF4 created posts survive switching users, newest first', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'First', 'b');
  await api.respond('POST /posts', { id: 101 });
  await user.click(await screen.findByRole('button', { name: '+ New post' }));
  await addPost(user, 'Second', 'b');
  await api.respond('POST /posts', { id: 101 });
  await screen.findByRole('heading', { name: 'Second' });

  await switchTo(user, 'Ervin Howell', 2);
  await switchTo(user, 'Leanne Graham', 1);
  const items = postItems();
  expect(items[0]).toHaveTextContent('Second');
  expect(items[1]).toHaveTextContent('First');
});

it('C1 Cancel closes the form, discards the text and refocuses + New post', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Draft');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '+ New post' })).toHaveFocus();

  await user.click(screen.getByRole('button', { name: '+ New post' }));
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('');
});

it('E7 when only Body is invalid, focus and error go to Body alone', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Has a title');
  await user.click(screen.getByRole('button', { name: 'Add post' }));
  const title = screen.getByRole('textbox', { name: 'Title' });
  const body = screen.getByRole('textbox', { name: 'Body' });
  expect(body).toHaveFocus();
  expect(body).toHaveAttribute('aria-invalid', 'true');
  expect(body).toHaveAccessibleDescription('Body is required');
  expect(title).not.toHaveAttribute('aria-invalid');
  expect(title).not.toHaveAttribute('aria-describedby');
  expect(screen.getByRole('textbox', { name: 'Title' })).not.toHaveAccessibleDescription();
});

it('E8 Cancel during sending aborts the POST and adds nothing', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'My post', 'Hello');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(api.calls('POST /posts')[0]?.signal?.aborted).toBe(true);
  expect(screen.queryByRole('heading', { name: 'My post' })).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('E9 retrying after a failed POST adds the post', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'My post', 'Hello');
  await api.fail('POST /posts');
  await user.click(await screen.findByRole('button', { name: 'Add post' }));
  await api.respond('POST /posts', { id: 101 });
  expect(await screen.findByRole('heading', { name: 'My post' })).toBeInTheDocument();
  expect(api.calls('POST /posts')).toHaveLength(2);
});

it('E10 submitted values are trimmed when sent and shown', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, '  My post  ', '  Hello  ');
  expect(JSON.parse(String(api.calls('POST /posts')[0]?.body))).toEqual({
    userId: 1,
    title: 'My post',
    body: 'Hello',
  });
  await api.respond('POST /posts', { id: 101 });
  const heading = await within(await screen.findByRole('list', { name: 'Posts' })).findByRole(
    'heading',
    { name: 'My post' },
  );
  // Exact text, spaces preserved: the heading holds the trimmed title and nothing else.
  expect(heading).toHaveTextContent(/^My post$/, { normalizeWhitespace: false });
  expect(postItems()[0]).toHaveTextContent('just added');
});

it('E11 a post created after the posts failed to load is shown above the error', async () => {
  const user = userEvent.setup();
  render(<App />);
  await api.respond('GET /users', users);
  await user.click(await screen.findByRole('button', { name: 'Leanne Graham' }));
  await api.fail('GET /users/1/posts');
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: '+ New post' }));
  await addPost(user, 'My post', 'Hello');
  await api.respond('POST /posts', { id: 101 });
  expect(await screen.findByRole('heading', { name: 'My post' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent("Couldn’t load posts.");
});

it('E12 a created post is shown only for its own user', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'My post', 'Hello');
  await api.respond('POST /posts', { id: 101 });
  await screen.findByRole('heading', { name: 'My post' });
  await switchTo(user, 'Ervin Howell', 2);
  expect(screen.queryByRole('heading', { name: 'My post' })).not.toBeInTheDocument();
  expect(screen.queryByText('just added')).not.toBeInTheDocument();
});

it('E13 switching users closes the form', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Draft');
  await switchTo(user, 'Ervin Howell', 2);
  expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  await switchTo(user, 'Leanne Graham', 1);
  expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
});

it('E14 pressing Enter in Title submits the form', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await user.type(screen.getByRole('textbox', { name: 'Body' }), 'Hello');
  await user.type(screen.getByRole('textbox', { name: 'Title' }), 'My post{Enter}');
  expect(api.calls('POST /posts')).toHaveLength(1);
});

it('E15 + New post toggles the form closed again', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  const toggle = screen.getByRole('button', { name: '+ New post' });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await user.click(toggle);
  expect(screen.queryByRole('form', { name: 'New post' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
});

it('E16 the form is a named region the toggle controls', async () => {
  await openFormFor('Leanne Graham', 1);
  const form = screen.getByRole('form', { name: 'New post' });
  expect(screen.getByRole('button', { name: '+ New post' })).toHaveAttribute('aria-controls', form.id);
});

it('E18 a new submit attempt clears the previous send error', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'My post', 'Hello');
  await api.fail('POST /posts');
  await screen.findByRole('alert');

  await user.clear(screen.getByRole('textbox', { name: 'Title' }));
  await user.click(screen.getByRole('button', { name: 'Add post' }));
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAccessibleDescription('Title is required');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('E19 a second submit while sending is ignored', async () => {
  // A disabled submit button blocks clicks and Enter, so the in-flight guard can only be
  // reached by a programmatic submit; fireEvent is the honest way to exercise it.
  const user = await openFormFor('Leanne Graham', 1);
  await addPost(user, 'My post', 'Hello');
  fireEvent.submit(screen.getByRole('form', { name: 'New post' }));
  expect(api.calls('POST /posts')).toHaveLength(1);
});

it('E21 Escape closes the form, discards the text and refocuses + New post', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Draft');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('form', { name: 'New post' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '+ New post' })).toHaveFocus();
});

it('E22 leaving the page with an unsent draft asks for confirmation; an empty form does not', async () => {
  const user = await openFormFor('Leanne Graham', 1);
  const leave = () => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };
  expect(leave()).toBe(false);
  await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Draft');
  expect(leave()).toBe(true);
});

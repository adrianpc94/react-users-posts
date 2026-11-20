# Users & Posts

A small React + TypeScript app on top of [JSONPlaceholder](https://jsonplaceholder.typicode.com):
search users by name, open a user to read their posts, and add a new post
through a validated form. Every request has a visible loading and error state.

## How to run

Requires **Node 24** (developed on 24.14) and npm 11.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 30 tests (Vitest + React Testing Library)
npm run build      # type-check (strict) + production build
npm run lint       # Oxlint
```

The tests never call the real API: `fetch` is replaced by a small mock
(`src/test/mockFetch.ts`). Each test settles every request itself, so the
"Loading…" and "Adding…" states, failures and request cancellation are all
tested in a fixed, repeatable order.

## What it does

- **Users:** loaded from `GET /users`. The search filters as you type,
  ignores upper/lower case and surrounding spaces, and shows
  `No users match "…"` when nothing matches. A failed load shows an error
  with **Retry**.
- **Posts:** clicking a user loads `GET /users/:id/posts`, with its own
  loading state, error and Retry. A user with no posts shows `No posts yet.`
- **New post:** **+ New post** opens a form. Title and body are required;
  text that is only spaces counts as empty. Errors appear under each field,
  are linked to it for screen readers, and move focus to the first invalid
  field. While sending, the button reads "Adding…" and is disabled. If
  sending fails, your text is kept and you can retry. If it succeeds, the
  post appears at the top of the list, tagged "just added".

## Project structure

```
src/
  App.tsx                 page layout: selected user, wires the two columns
  api.ts                  endpoints, types, fetch helpers
  hooks.ts                useRequest (abortable fetch + retry), useUsers, useUserPosts
  requestState.ts         RequestState<T> (loading | success | error) + assertNever
  ui/                     shared pieces: ErrorWithRetry, Field (label + control + error)
  users/                  UsersPanel (search + states), UserList (the buttons)
  posts/                  PostsPanel, PostList, PostItem, NewPostForm,
                          useNewPostForm (form logic), useCreatedPosts (session posts)
  *.test.ts(x), test/     tests by feature; fetch mock and fixtures
```

Each feature folder has its own CSS file; shared tokens and controls live in
`index.css`.

## Decisions

Every decision is recorded with its alternatives, the reason, and who made
it (me, or the AI with my approval, or the AI as a builder's call). The
full records are in the
[design spec](docs/superpowers/specs/2026-11-20-users-posts-design.md#decisions)
(D1–D34) and the
[implementation plan](docs/superpowers/plans/2026-11-20-users-posts.md#decisions)
(D35–D62). The main ones:

- **Plain `fetch` + one small hook, no data library.** One generic
  `useRequest<T>(url)` hook, plus two thin wrappers (`useUsers`,
  `useUserPosts`). It returns a typed request state, which is either
  `loading`, `success` with data, or `error`. TanStack Query was considered
  and rejected: it would hide exactly the async handling this exercise is
  about.
- **Switching users can't show the wrong posts.** The posts panel is
  keyed by user id, so it starts fresh for each user. The previous request
  is cancelled with `AbortController`, and a cancelled request is never
  shown as an error.
- **New posts live in app state, per user.** The API stores nothing, and
  `POST /posts` returns `id: 101` every time, so created posts get their
  own ids (`local-1`, …). They stay while the page is open, newest first,
  even when you switch users and come back.
- **A post being sent belongs to the user it was written for.** Pressing
  Cancel or switching users while it is sending cancels the request and
  adds nothing.
- **The new post shows what you typed** (trimmed). The API only echoes
  the fields back when the request has a JSON content type, so its reply is
  used only to confirm success.
- **Validation runs on submit**, then each error clears as soon as you fix
  that field.
- **The form opens from a "+ New post" button** (my choice over an
  always-visible form that the AI recommended).
- **Accessibility:** users are toggle buttons (`aria-pressed`); the selected
  user is shown by weight and a marker, not by colour alone. Loading text is
  announced as status and errors as alerts. Focus moves into the form when
  it opens and back to the button when it closes.
- **Stack:** Vite's `react-ts` template (React 19, TypeScript with `strict`
  written out explicitly, Oxlint), Vitest + React Testing Library + jsdom,
  one plain CSS file.
- **Time:** the brief allows 3 hours, and I counted design time against it.
  With about 1 h 15 left after design, I first cut three tests and the
  styling pass. I then chose to restore every test, add edge-case tests
  (30 in total) and do the styling pass, knowingly going over the limit.

## What I'd do with more time

- An accessibility audit in real browsers and screen readers. jsdom ignores
  CSS, and the browser check already caught one issue the tests couldn't: a
  CSS text marker that changed a button's accessible name.
- TanStack Query (or SWR) for caching, so going back to a user is instant.
- Keep the selected user in the URL, so it survives a reload and can be shared.
- Show a new post immediately, before the server confirms it (optimistic update).
- One end-to-end test in a real browser (Playwright) against the live API.
- The two minor code-review points left open: a clearer message if the API
  ever returned no users, and clearing the "couldn't add the post" error as
  soon as you edit the form.

## How I used AI

I built this with Claude Code. Every step is logged in
[`docs/ai-usage-log.md`](docs/ai-usage-log.md): what I asked for, what I
accepted, and what was corrected. In short:

- **What I asked for:**
  - a design conversation (with browser mockups of two layouts)
  - a written spec and an implementation plan
  - two adversarial reviews of them by a separate AI agent
  - the code, built tests-first, task by task
  - a final code review
- **What I accepted:**
  - the overall approach (plain `fetch` + hooks)
  - most screen behaviour
  - the request-cancellation design
  - the test mock
  - fixes the reviews found in the AI's own spec and plan. The race test as
    first planned would have proven nothing, and "show the API's reply"
    would have rendered a blank post.
- **What I corrected or decided against the AI:**
  - I rejected putting decision numbers in code comments and commit
    messages as noise.
  - I chose the "+ New post" button over the AI's recommended
    always-visible form.
  - I counted design time against the 3 hours.
  - I refused to drop tests to save time, and asked for edge-case tests
    instead.
  - The AI's plan assumed outdated tooling (ESLint and a Node version that
    the current Vite template and jsdom no longer match). The plan review
    caught this, and I chose the fixes.

Decisions are tracked in tables. Each row says whether it was mine, an AI
proposal I accepted, or the AI's own call while building, so it's clear
where the AI made choices for me.

# Users & Posts

A small React + TypeScript app on top of [JSONPlaceholder](https://jsonplaceholder.typicode.com):
search users by name, open a user to read their posts, and add a new post
through a validated form. Every request has a visible loading and error state.

## How to run

Tested on **Node 24.14** with npm 11.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 37 tests (Vitest + React Testing Library)
npm run build      # type-check (strict) + production build
npm run lint       # Oxlint
```

The tests never call the real API: `fetch` is replaced by a small mock
(`src/test/mockFetch.ts`). Each test settles every request itself (success,
HTTP error or network failure), so the "Loading…" and "Adding…" states,
failures and request cancellation are all tested in a fixed, repeatable order.

## What it does

- **Users:** loaded from `GET /users`. The search filters as you type,
  ignores upper/lower case and surrounding spaces, and says
  `No users match “…”` when nothing matches. A failed load explains what to
  do and offers **Retry**.
- **Posts:** clicking a user loads `GET /users/:id/posts`, with its own
  loading state, error and Retry. A user with no posts shows `No posts yet.`
- **New post:** **+ New post** opens the form (pressing it again, Cancel or
  Escape closes it). Title and body are required; text that is only spaces
  counts as empty. Errors appear under each field, are linked to it for
  screen readers, and focus moves to the first invalid field. While sending,
  the button reads "Adding…" and is disabled. If sending fails, your text is
  kept and you can retry. If it succeeds, the post appears at the top of the
  list, tagged "just added". Leaving the page with an unsent draft asks for
  confirmation.
- **Accessibility:** a skip link; the selected user is marked with
  `aria-current` and shown by weight and a marker, not by colour alone;
  loading and "no match" messages sit in status regions that are always
  present, so screen readers announce changes; errors are announced as alerts.

## Project structure

```
src/
  App.tsx                 page layout: selected user, wires the two columns
  api.ts                  endpoints, types, fetch helpers
  useRequest.ts           abortable fetch with retry, returns a RequestState
  requestState.ts         RequestState<T> (loading | success | error) + assertNever
  ui/                     shared pieces: ErrorWithRetry, Field (label + control + error)
  users/                  UsersPanel (search + states), UserList, useUsers
  posts/                  PostsPanel, PostList, PostItem, NewPostForm, useUserPosts,
                          useNewPostForm (form logic), useCreatedPosts, localId
  *.test.ts(x), test/     tests by feature; fetch mock and fixtures
```

Each feature folder has its own CSS file; shared tokens and controls live in
`index.css`.

### Repo map (beyond the app)

- `docs/assignment.md`: the brief and its requirement checklist.
- `docs/superpowers/specs/…-design.md`: the design spec (decisions D1–D34,
  test strategy, manual checklist).
- `docs/superpowers/plans/…-users-posts.md`: the implementation plan and the
  build record (decisions D35–D81, reviews, every test run, manual and
  exploratory results).
- `docs/ai-usage-log.md`: what I asked the AI, what I accepted, what was
  corrected, step by step.
- `CLAUDE.md`, `.claude/skills/`, `skills-lock.json`: the AI assistant's
  project instructions and the skills it used (third-party skills are pinned
  by commit; some of their rules, e.g. Next.js server rules, don't apply here).

## Decisions

Every decision is recorded with its alternatives, the reason, and who made
it (me, the AI with my approval, or the AI as a builder's call). The full
records are in the
[design spec](docs/superpowers/specs/2026-11-20-users-posts-design.md#decisions)
(D1–D34) and the
[implementation plan](docs/superpowers/plans/2026-11-20-users-posts.md#decisions)
(D35–D81). The main ones:

- **Plain `fetch` + one small hook, no data library.** A generic
  `useRequest<T>(url)` returns a typed request state (`loading`, `success`
  with data, or `error`), with thin `useUsers` / `useUserPosts` wrappers.
  TanStack Query was considered and rejected: it would hide exactly the
  async handling this exercise is about.
- **Switching users can't show the wrong posts.** The posts panel is keyed
  by user id, so it starts fresh for each user. The previous request is
  cancelled with `AbortController`, and a cancelled request is never shown
  as an error.
- **New posts live in app state, per user.** The API stores nothing, and
  `POST /posts` returns `id: 101` every time, so created posts get their own
  ids (`local-1`, …). They stay while the page is open, newest first, even
  when you switch users and come back.
- **A post being sent belongs to the user it was written for.** Cancel,
  Escape or switching users while it is sending cancels the request and adds
  nothing. A request that already succeeded is never cancelled.
- **The new post shows what you typed** (trimmed). The API only echoes the
  fields back when the request has a JSON content type, so its reply is used
  only to confirm success.
- **Validation runs on submit**, then each error clears as soon as you fix
  that field.
- **The form opens from a "+ New post" button** (my choice over an
  always-visible form that the AI recommended).
- **Modular by feature:** `users/`, `posts/` and shared `ui/`, with logic in
  hooks (`useNewPostForm`, `useCreatedPosts`) and components kept to markup.
- **Stack:** Vite's `react-ts` template (React 19, TypeScript with `strict`
  and `noUncheckedIndexedAccess`, Oxlint), Vitest + React Testing Library +
  jsdom, plain CSS with one file per feature.

## Time

The brief says no more than 3 hours. From git timestamps: initial commit
13:22, spec 13:43, plan 14:12, scaffold 14:41, the feature code 14:48–14:51,
then styling, the modular refactor, three review rounds with fixes, and this
README, finishing at 15:50. **About 2 h 30 min in total**, inside the limit.

During planning the AI misread my machine's time zone ("CST" here is Cuba
Standard Time, UTC−5, not US Central) and told me I had about 1 h 15 left
when I actually had about 2 h 15. I cut some tests and the styling pass
based on that, then restored everything once I decided not to cut anything
for time. The timeline correction is recorded as decision D68.

Commits during the build were made in batches, because each needed my
approval; the plan's Automated testing table records every red and green
test run in order.

## What I'd do with more time

- Turn the manual and exploratory checks, which the AI ran with Playwright
  scripts against the live API at my request, into a committed end-to-end
  suite.
- CI: run tests, build and lint on every push (GitHub Actions).
- Catch deprecated APIs automatically with Oxlint's type-aware
  `no-deprecated` rule (I caught a deprecated `FormEvent` by hand).
- An accessibility audit with real screen readers. jsdom ignores CSS, and
  browser checks already caught one issue the tests couldn't: a CSS text
  marker that changed a button's accessible name.
- TanStack Query (or SWR) for caching, so going back to a user is instant.
- Keep the selected user and the search in the URL, so they survive a reload
  and can be shared.
- Component-level tests now that the UI is split into small components
  (today every test renders the whole app, which tests what users see but
  makes failures less precise).
- Consider an optimistic update for new posts. I chose to wait for the
  server so the feedback is honest and nothing needs rolling back; with a
  real backend, instant feedback might be worth that extra logic.

## How I used AI

I built this with Claude Code. Every step is logged in
[`docs/ai-usage-log.md`](docs/ai-usage-log.md): what I asked for, what I
accepted, and what was corrected.

- **What I asked for:**
  - a design conversation, with browser mockups of two layouts
  - a written spec and an implementation plan
  - adversarial reviews by separate AI agents: of the spec, of the plan, and
    of the finished product
  - the code, built tests-first, task by task, then a code review
  - a styling pass, after I found the first version unaligned and ugly
  - a "very modular" component structure, proposed by an AI agent
  - the manual checks and exploratory testing, which the AI ran in a real
    browser with Playwright (I reviewed the results; I did not click through
    them myself)
  - a check for deprecated APIs and a web interface guidelines review
- **What I accepted:**
  - the overall approach (plain `fetch` + hooks), most screen behaviour, the
    request-cancellation design and the test mock
  - fixes the reviews found in the AI's own spec and plan: the race test as
    first planned would have proven nothing, and "show the API's reply" would
    have rendered a blank post
  - the refactor into feature folders and hooks, and the review fixes
- **What I corrected, or what checks caught in the AI's work:**
  - I rejected putting decision numbers in code comments and commit messages
    as noise.
  - I chose the "+ New post" button over the AI's recommended always-visible
    form.
  - I refused to drop tests or anything else to save time, and asked for
    edge-case tests instead (37 tests now).
  - I caught that the AI had used `FormEvent`, which is deprecated in React
    19's types.
  - The AI misread the time zone and overstated the elapsed time by an hour
    (caught by the final review).
  - The AI's plan assumed outdated tooling (ESLint, and a Node version jsdom
    no longer matched); the plan review caught it and I chose the fixes.
  - A browser check caught that the AI's CSS "▸" marker became part of a
    button's accessible name; jsdom-based tests couldn't see it.
  - Exploratory testing caught that every successful post showed as a
    cancelled request in DevTools, and that long titles overflowed the page.
  - The AI's first version of one test (E10) queried the wrong thing; it was
    fixed and then proved by breaking the code on purpose.

Decisions are tracked in tables. Each row says whether it was mine, an AI
proposal I accepted, or the AI's own call while building, so it's clear
where the AI made choices for me.

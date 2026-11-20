# Users & Posts: design

Date: 2026-11-20 · Status: draft, awaiting Adrian's approval
Brief and requirement checklist: [`docs/assignment.md`](../../assignment.md)

## Intent

A technical test for a Frontend React position. A small React + TypeScript
app on top of https://jsonplaceholder.typicode.com: list users, search them by
name, see a user's posts and add a new post through a validated form, with
visible loading and error states, tests, and a README.

Who reads it: a hiring reviewer. Beyond meeting every requirement, the thing
Adrian most wants the reviewer to notice is that **every decision is
tracked**: what was chosen, what else was considered, why, and who made it
(Adrian or AI). The Decisions tables (here, in the plan, summarized in the
README) are the vehicle for that; the AI usage log is the companion record of
what AI was asked, what was accepted and what was corrected.

## Goals

- Meet R1–R5 in `docs/assignment.md`, every one visibly.
- Handle the async edge cases a reviewer looks for: loading, errors with
  retry, out-of-order responses when switching users, and a post being sent
  while the user switches.
- Code that is small, typed (strict TS) and easy to read in one sitting.
- A decision trail that is complete and honest.

## Non-goals

- Routing or URL state, pagination, editing/deleting posts, comments,
  persistence across reloads, response caching, auth, i18n, dark mode.
- Pixel-perfect visuals (one light `frontend-design` pass only).

## Anti-goals (would be a failure even if it works)

- Going over the 3-hour budget through gold-plating.
- Decisions made but not recorded, or AI contributions not disclosed.
- Tests that hit the real API or query by test ids/implementation details.

## Constraints

- **3 hours total**, including docs and README.
- The API is read-only. `POST /posts` returns `id: 101` every time and stores
  nothing; it only echoes `title`/`body` back when the request is sent with
  `Content-Type: application/json`.

## Stack

| Concern | Choice |
|---|---|
| UI | React 19 + TypeScript `strict` (Vite `react-ts` template) |
| Build / dev server | Vite |
| Tests | Vitest, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` environment |
| Data | Browser `fetch` wrapped in custom hooks; no data library |
| State | React state in `App`; no store, no router |
| Validation | Hand-written (two required fields); no Zod |
| Styling | One plain CSS file; no UI library or Tailwind |
| Lint | ESLint config that ships with the Vite template; no Prettier |
| Runtime | Node 24 / npm 11 |

## Approaches considered

| Approach | Trade-offs | Outcome |
|---|---|---|
| **1. Plain `fetch` + two small custom hooks** (`useUsers`, `useUserPosts`) returning a discriminated-union request state; `App` holds selection and created posts | No dependencies; all loading/error/abort handling is visible and ours; ~60 lines of request code to write and test; no caching (revisiting a user refetches) | **Chosen**: AI's recommendation, picked by Adrian |
| 2. TanStack Query | Library handles caching, retries, stale responses; new posts go into the cache; but adds a dependency, test providers, and hides the async handling the brief is testing | Rejected; listed under "with more time" in the README |
| 3. Global store (Redux / Zustand / context + reducer) | Oversized for two lists and one form | Ruled out early, not compared in detail |

## Design

### Screen

Two columns: **users** on the left, the **selected user's posts** on the
right; the columns stack on narrow screens. (Mockup from the visual
companion: option B.)

```
┌───────────────────────┬──────────────────────────────────────┐
│ Users                 │ Leanne Graham's posts   [+ New post] │
│ [Search by name…    ] │ • My new post            (just added) │
│ ▸ Leanne Graham  ◀sel │ • sunt aut facere repellat…           │
│   Ervin Howell        │ • qui est esse                        │
│   …                   │                                       │
└───────────────────────┴──────────────────────────────────────┘
```

### Users (R1, R3)

- Fetched once on load from `GET /users`. The effect cleanup aborts the
  request (handles React StrictMode's double effect in development).
- Loading: "Loading users…" (`role="status"`). Error: a friendly message
  (`role="alert"`) + **Retry** button that refetches.
- Search box (labelled "Search users by name") filters as you type:
  case-insensitive, matches any part of `name`, ignores surrounding spaces.
  Derived during render (no extra state or effect). No match:
  `No users match "<query>"` (`role="status"`).
- Each user is a `<button>` with `aria-pressed`; the selected one is
  highlighted by more than colour alone (e.g. weight + marker).
- If the search hides the selected user, the selection and posts panel stay.

### Posts (R2, R3)

- Nothing selected: "Select a user to see their posts."
- On selection: `GET /users/:id/posts`. Loading: "Loading posts…"
  (`role="status"`). Error: friendly message (`role="alert"`) + **Retry**.
- **Fresh panel per user:** the posts panel is keyed by user id
  (`key={userId}`), so switching users never renders user A's posts under
  user B's name, even for one frame.
- **Out-of-order responses:** switching users aborts the previous request
  (`AbortController`), and the hook checks `signal.aborted` before every
  state update, so a late response is dropped even if `fetch` resolved. An
  aborted request is never shown as an error.
- Each post shows title and body.
- **Created posts** for this user are always rendered **above** the
  loading / error / fetched-list region, **newest first**, tagged
  "just added". So they are visible even while posts load or after posts
  failed.

### New post (R2, R3)

- A **"+ New post"** button in the posts header opens the form (title, body,
  "Add post", "Cancel"). It is available whenever a user is selected, even
  if their posts failed to load. Focus moves to the Title field on open and
  back to "+ New post" when the form closes.
- Validation runs on submit: both fields required, **whitespace-only counts
  as empty**. Errors appear under each field ("Title is required", "Body is
  required"), linked with `aria-invalid` + `aria-describedby`, and clear as
  the field is fixed. Focus goes to the first invalid field. An invalid
  submit sends nothing.
- Submitting: `POST /posts` with JSON `{ title, body, userId }` and
  `Content-Type: application/json`. The `userId` is **captured at submit**.
  While in flight the button reads "Adding…" and is disabled.
- Failure: a friendly error (`role="alert"`) appears, the typed text is kept,
  the button is enabled again.
- Success: the post is added (for the captured user) using the **submitted**
  title/body and a **client-generated id**; the API reply is only the success
  signal. The form clears and closes.
- Cancel, or switching users, closes the form and discards unsent text. If a
  POST is in flight at that moment it is **aborted** and nothing is added.

### Created posts

- Kept in `App` state **per user** (`createdPostsByUser`) for the session:
  switching away and back still shows them on top. Lost on reload.
- Client-generated ids (the API always returns `id: 101`), used as React
  keys. Mechanism (counter or `crypto.randomUUID`) is the builder's choice.

### Errors

Fetch helpers throw on `!response.ok`. The UI shows fixed friendly messages
("Couldn't load users.", "Couldn't load posts.", "Couldn't add the post.
Your text is kept; try again.") rather than raw messages like
"Failed to fetch".

### Structure (proposal, builder may adjust)

```
src/
  api.ts               types (User, Post, NewPost) + fetchUsers, fetchUserPosts, createPost
  types.ts             RequestState<T> discriminated union (or inside api.ts)
  hooks/useUsers.ts
  hooks/useUserPosts.ts
  components/UserList.tsx      search + list
  components/PostList.tsx      posts panel, states, "+ New post"
  components/NewPostForm.tsx   form, validation, submit state
  App.tsx              selection + createdPostsByUser
  App.css
```

`RequestState<T> = idle | loading | success(data) | error(message)`.

### README outline (R5)

1. How to run (Node 24, `npm install`, `npm run dev`, `npm test`, `npm run build`).
2. Decisions: summary of the Decisions tables (spec + plan).
3. What I'd do with more time (e.g. TanStack Query for caching, URL state for
   the selected user, optimistic updates, E2E tests).
4. How I used AI: written from `docs/ai-usage-log.md`.

### If time runs short (cut in this order)

1. The `frontend-design` styling pass (keep plain, readable CSS).
2. T8 (keep the abort logic; drop only its test).
3. The "just added" tag.
4. Retry on posts (kept last: it makes the error state useful and testable).

### Left to the builder

Exact copy of messages beyond those above, file split, id generation, and
anything else not decided here. Record each non-trivial call in the plan's
Decisions table.

## Test strategy

All tests render the real components, query by role/label/text, drive them
with `user-event`, and **mock `fetch`** with a small helper that routes by
URL + method. Responses are **deferred promises** the test resolves or rejects
explicitly, so in-flight states ("Loading…", "Adding…") can be asserted
before resolving. The mock rejects with an `AbortError` when the request's
`signal` aborts, like real `fetch`. No real network. Tests render `<App />`
without `StrictMode`.

| # | Test | Covers |
|---|---|---|
| T1 | Users load: "Loading users…" shown, then the list | R1, R3 loading |
| T2 | Search filters by name, case-insensitive; no-match message | R1 search |
| T3 | Users request fails → alert + Retry; Retry succeeds → list | R3 error |
| T4 | Selecting a user shows "Loading posts…" then that user's posts | R2, R3 |
| T5 | Empty / whitespace-only submit shows both errors (fields marked invalid) and sends no POST | R2 validation |
| T6 | Valid submit shows disabled "Adding…", then the post appears at the top and the form closes | R2 create |
| T7 | POST fails → alert shown, typed text kept, button enabled again | R3 error (create) |
| T8 | Select A, then B; resolve B, then resolve A late → only B's posts shown | race handling |

T2, T5/T6 and T3 are the required minimum (search, create + validation,
error state).

---

## Decisions

| # | Decision | Alternatives considered | Why | Made by |
|---|---|---|---|---|
| D1 | Stack base: React + TS strict, Vite, Vitest + RTL + user-event; no Zod | Jest; CRA/Next; Zod for validation | Set in `CLAUDE.md` before design. Fast setup, brief allows Vitest; validation is two required fields | Adrian |
| D2 | The thing to showcase: every decision tracked in Decisions tables (spec, plan, README) | Emphasise UI polish or test depth | Adrian's stated priority for the reviewer | Adrian |
| D3 | No decision references (D-numbers) in code comments or commit messages | Link code/commits to D-rows (AI's proposal) | Adrian rejected the AI proposal as noise; the tables are enough | Adrian |
| D4 | Initial commit of docs/config before scaffolding; scaffold in its own commit | Single first commit with scaffold | Timestamp marks the start; generated code separable from authored code | AI proposal accepted by Adrian |
| D5 | `.gitattributes` `* text=auto eol=lf` | Rely on each machine's `core.autocrlf` | Consistent line endings for reviewers on any OS | AI proposal accepted by Adrian |
| D6 | Two-column layout: users left, posts right; stacks on narrow screens | Separate pages/routes | Master-detail fits the task; no router needed | AI proposal accepted by Adrian |
| D7 | New-post form behind a "+ New post" button (option B) | A: form always visible above posts | AI recommended A; Adrian preferred giving the posts the space | Adrian |
| D8 | Client-side search: case-insensitive substring on `name`, trimmed | Server query `?name=` (exact match only); search username/email too | Only 10 users; instant; brief says "by name" | AI proposal accepted by Adrian |
| D9 | Users and posts each show loading text and an error with a Retry button | Error without retry | Retry makes the error state useful and testable | AI proposal accepted by Adrian |
| D10 | Validation on submit; whitespace-only is empty; errors clear as fixed | Validate on blur/as you type; HTML `required` only | Simple, no premature errors, accessible messages | AI proposal accepted by Adrian |
| D11 | During POST: button "Adding…" + disabled; on failure keep text + show error; on success add on top, clear and close the form | Optimistic insert | Honest feedback; no rollback logic needed | AI proposal accepted by Adrian |
| D12 | Created posts kept per user in `App` state for the session; lost on reload | Single list; `localStorage` | API doesn't persist; brief says appearing in the list is enough | AI proposal accepted by Adrian |
| D13 | Client-generated ids for created posts | Use the API's id | API always returns `id: 101` → duplicate keys | AI proposal accepted by Adrian |
| D14 | Abort the previous posts request on user switch, and check `signal.aborted` before every state update | Ignore the race; request counter; abort only | Prevents the wrong user's posts appearing; the guard also covers mocks/responses that resolve despite the abort (from adversarial review) | AI proposal accepted by Adrian |
| D15 | Approach 1: plain `fetch` + custom hooks + `RequestState<T>` discriminated union | TanStack Query; global store | No deps, async handling visible to the reviewer, fits 3 h | AI proposal accepted by Adrian |
| D16 | Form has Cancel; Cancel and user switch close it and discard unsent text | Keep open; keep a draft per user | Least surprising; avoids posting to the wrong user | AI (builder's call) |
| D17 | Selection persists when the search hides the selected user | Clear selection on filter | Search is for finding, not for closing what you're reading | AI (builder's call) |
| D18 | `.superpowers/` (mockup files) git-ignored | Commit mockups | Tool scratch output, not part of the deliverable | AI (builder's call) |
| D19 | React 19 via the Vite `react-ts` template | React 18 | Current template default; no reason to pin older | AI proposal accepted by Adrian |
| D20 | Tests run in `jsdom` with `@testing-library/jest-dom`; `<App />` rendered without `StrictMode` | happy-dom; plain `expect` checks | jsdom is the common, well-supported choice; jest-dom gives readable assertions | AI proposal accepted by Adrian |
| D21 | Styling: one plain CSS file | CSS Modules; Tailwind; component library | Fastest for two columns and a form; nothing to configure | AI proposal accepted by Adrian |
| D22 | Keep the Vite template's ESLint; no Prettier | Add Prettier / stricter lint rules | Free with the template; more is gold-plating | AI proposal accepted by Adrian |
| D23 | Node 24 / npm 11 (stated in README) | Older LTS | What is installed; README tells the reviewer | AI proposal accepted by Adrian |
| D24 | Posts endpoint `GET /users/:id/posts` | `GET /posts?userId=:id` | Both work; the nested route reads as "this user's posts" | AI (builder's call) |
| D25 | "+ New post" available even when the user's posts failed to load | Hide it until posts load | Creating a post doesn't depend on the list | AI (builder's call) |
| D26 | New post shown with the submitted title/body; API reply used only as the success signal; request sent with `Content-Type: application/json` | Render the API's echoed fields | Without the JSON header the API returns only `{id: 101}`, so a blank post would render (adversarial review) | AI (builder's call) |
| D27 | Posts panel keyed by user id so its state resets on switch | Store `userId` inside the success state | Simplest way to never show A's posts under B's name (adversarial review) | AI (builder's call) |
| D28 | Created post belongs to the user captured at submit; Cancel or user switch during sending aborts the POST and adds nothing | Let it finish in the background | Consistent with D16 (unsent work discarded); no silent failures after the form is gone (adversarial review) | AI (builder's call) |
| D29 | Created posts render above the loading/error/list region, newest first | Merge into the fetched list | Visible in every state, including after a failed load (adversarial review) | AI (builder's call) |
| D30 | Accessibility: users as buttons with `aria-pressed`; loading/no-match `role="status"`, errors `role="alert"`; field errors via `aria-invalid` + `aria-describedby`; focus to Title on open, first invalid field on submit, back to "+ New post" on close; selection not by colour alone | `aria-current`; no focus management | Fixes the roles the tests query by; flagged by adversarial review | AI (builder's call) |
| D31 | Friendly fixed error messages in the UI, not raw `err.message` | Show the raw error | "Failed to fetch" means nothing to a user (adversarial review) | AI (builder's call) |
| D32 | Test `fetch` mock routes by URL + method, uses deferred promises, and rejects with `AbortError` on abort | `mockResolvedValueOnce` sequences; MSW | Makes in-flight states and the race test deterministic without a new dependency (adversarial review) | AI (builder's call) |
| D33 | T8 (race test) is planned, not optional | Optional "if budget allows" | Cheap once D32 exists; the goals promise race handling (adversarial review) | AI (builder's call) |
| D34 | If time runs short, cut in order: styling pass → T8 → "just added" tag → Retry on posts | Review's order (Retry cut before the tag) | Retry makes the error state testable; the tag is cosmetic | AI proposal accepted by Adrian |

## Skills used

| Skill | Phase / task | What it was used for |
|---|---|---|
| `superpowers:brainstorming` | Design | Clarifying intent, screen behaviour, approaches; writing this spec |
| `superpowers:brainstorming` (visual companion) | Design | Browser mockup of the layout and states; Adrian picked option B |
| `ai-log` | Design | Logged the design step and Adrian's corrections in `docs/ai-usage-log.md` |

## Reviews

| Date | What was reviewed | Reviewer (Adrian / skill / subagent) | Findings | Outcome |
|---|---|---|---|---|
| 2026-11-20 | Layout mockup (A vs B + states) | Adrian | Prefers "+ New post" button over always-visible form | D7 |
| 2026-11-20 | This spec, read as a builder who can't ask questions | AI self-check (`brainstorming` builder check, done inline) | Two gaps: is "+ New post" available when posts failed to load? Which title/body to show after POST? | Settled as builder's calls (now D25, D26) |
| 2026-11-20 | This spec (draft 1), adversarial review requested by Adrian | Subagent (general-purpose, adversarial reviewer) | 15 findings. Key ones: abort alone doesn't make T8 meaningful with a mocked `fetch`; A's posts render under B's name for one frame; POST without JSON header returns no title/body; in-flight POST on user switch could land on the wrong user; created posts had no place when the list was loading/errored; missing decisions (stack, endpoint, a11y); "Made by" values outside the allowed three; test timing traps; manual "offline" test also blocks localhost. Verified correct: `id: 101`, both posts endpoints, `?name=` exact match, AbortError semantics, search derived in render | All applied (D14, D20–D34; D1/D3/D7 "Made by" normalised and D11/D16 de-overlapped before approval; README outline and cut order added; manual tests revised). Not adopted: the suggestion that tracking decisions in three places is too costly (that is Adrian's D2 priority); per-phase time budget deferred to the plan |

## Automated testing

Command: `npm test` (Vitest). Planned tests: T1–T8 above.

| Date | Command | Result (passed/failed/total) | Notes |
|---|---|---|---|
| | | | Not run yet (design phase) |

## Manual testing

| Scenario | Steps | Expected | Result | Checked by | Date |
|---|---|---|---|---|---|
| Users load | Open app | "Loading users…" then 10 users | | | |
| Search | Type "lean", then "zzz" | Only Leanne Graham; then no-match message | | | |
| Select user | Click a user | Highlighted; "Loading posts…" then posts | | | |
| Validation | + New post → Add post with empty / spaces | Both errors, focus on Title, no request sent | | | |
| Create post | Fill both → Add post | "Adding…", post on top tagged "just added", form closes | | | |
| Created post persists | Switch user and back | Created post still on top | | | |
| Two creates | Add two posts | Both shown, newest first, no key warnings in console | | | |
| Load errors | DevTools → block requests to `jsonplaceholder.typicode.com` → reload; select a user | Friendly errors; Retry works after unblocking | | | |
| POST error | Block requests, then Add post | Error shown, text kept, button enabled | | | |
| Switch on slow network | DevTools throttling "Slow 3G"; click user A then B quickly | Only B's posts appear; never A's under B's name | | | |
| Narrow screen | Resize to mobile width | Columns stack, usable | | | |
| Keyboard | Tab through search, users, form; open/close form | All reachable, visible focus; focus returns to "+ New post" | | | |

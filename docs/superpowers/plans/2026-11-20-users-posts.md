# Users & Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans, **inline, no subagents** (per `CLAUDE.md`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A React + TypeScript SPA on jsonplaceholder: users with name search, a selected user's posts, and a validated "new post" form, with loading/error states, tests and a README.

**Architecture:** Plain `fetch` behind one generic `useRequest<T>(url)` hook (abort on cleanup + `signal.aborted` guard) with thin `useUsers` / `useUserPosts` wrappers. `App` owns the selected user and the session's created posts; the posts panel is keyed by user id so it resets on every switch, and the form aborts its POST on unmount.

**Tech Stack:** React 19, TypeScript 7 strict, Vite 8 (create-vite 9.3.4 `react-ts`), Oxlint, Vitest 5 + React Testing Library + user-event + jest-dom (jsdom 29), plain CSS, Node 24.14 / npm 11 (see D70; the original "jsdom 31, Node ≥ 24.15" was superseded).

**Spec:** [`docs/superpowers/specs/2026-11-20-users-posts-design.md`](../specs/2026-11-20-users-posts-design.md) (approved). Read it alongside this plan; decision numbers D1–D34 refer to it.

## Global Constraints

- TypeScript `strict`: implied by TS 7, but written explicitly as `"strict": true` in `tsconfig.app.json` so a reviewer can see it. The template also sets `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no `enum`) and `noUnusedLocals`.
- Lint: the template's **Oxlint** (`npm run lint`); no ESLint, no Prettier.
- No decision numbers (D-numbers) in source code or commit messages (spec D3). They appear in this plan's prose only.
- No `any` without a comment explaining why. No Zod (D1). No new runtime dependencies.
- API base: `https://jsonplaceholder.typicode.com`. Endpoints: `GET /users`, `GET /users/:id/posts` (D24), `POST /posts` with `Content-Type: application/json` (D26).
- Exact UI copy (verbatim; note the single `…` character):
  - Headings: `Users`, `<name>'s posts`
  - Status: `Loading users…`, `Loading posts…`, `No users match "<query>"`, `Select a user to see their posts.`
  - Errors: `Couldn't load users.`, `Couldn't load posts.`, `Couldn't add the post. Your text is kept; try again.`, `Title is required`, `Body is required`
  - Controls: search label `Search users by name`, buttons `Retry`, `+ New post`, `Add post` / `Adding…`, `Cancel`; field labels `Title`, `Body`; tag `just added`
- Accessibility (D30): loading and no-match text in an element with `role="status"`; errors with `role="alert"`; users are `<button aria-pressed>`; invalid fields get `aria-invalid="true"` + `aria-describedby` → error id.
- Tests: query by role/label/text only; `fetch` mocked through `src/test/mockFetch.ts` (D32); no real network. Render `<App />` without `StrictMode` (D20).
- **TypeScript skill rules applied:** discriminated unions for every multi-state value (`RequestState<T>`, the form's submit state); exhaustive `switch` ending in `default: return assertNever(state)` (a helper, because a `const _x: never` local trips `noUnusedLocals`); no branded ids (only one id kind flows through each prop; D38).
- **React skill rules applied** (client-side only, per `CLAUDE.md`): `rerender-derived-state-no-effect` (search filter, selected user), `rerender-move-effect-to-event` (submit, retry and cancel live in handlers, not effects), `rerender-functional-setstate` (created posts, retry counter), `rerender-dependencies` (effects depend on primitives: `url`, `attempt`), `rendering-conditional-render` (ternaries, never `count && …`), `rerender-no-inline-components`, `bundle-barrel-imports` (no `index.ts` re-exports).
- **Commits:** every task ends with a commit step, but per Adrian's standing rule **no commit is made until Adrian approves it**.
- **Time budget** (D46; its elapsed-time figures are wrong, see D68 — only 46 min had passed at this point): the 3 hours run from the initial commit (13:22 ET). Design used 1 h 46, which leaves **about 1 h 15** for the build, starting 15:10 ET:
  - Task 1: 10 min
  - Task 2: 15 min
  - Task 3: 15 min
  - Task 4: 15 min
  - Task 5: 20 min
  - Task 7: 15 min

  Hard stop for code at **16:05 ET**, then README. Already cut (D46): the getJson test, the Cancel and RF4 tests (manual checks only), the Task 6 styling pass, and the `web-design-guidelines` review. If still behind, cut T8, then the `just added` tag, then posts Retry (spec D34).

## Review Focus

Cases the spec implies but T1–T8 don't exercise, most likely to bite first. Each has a test (RF1–RF5) in its owning task.

1. **RF1. Double submit:** clicking "Add post" again while it shows "Adding…" sends only one POST (Task 5).
2. **RF2. Switching users mid-POST:** the POST is aborted, no error is shown, and no post is added to either user (Task 5).
3. **RF3. Search with mixed case and surrounding spaces:** `"  LEAN "` still finds Leanne Graham (Task 3).
4. **RF4. Created posts across switches:** two created posts survive switching away and back, newest first. Its test was cut for time (D46); it is checked manually ("Created post persists", "Two creates").
5. **RF5. Posts load failure:** shows `Couldn't load posts.`, "+ New post" is still offered, and Retry recovers (Task 4).

### Edge-case tests (D54)

Added at Adrian's request. RF4, getJson and Cancel are restored.

| # | File | Edge case | Expected |
|---|---|---|---|
| E1 | api | `getJson` gets a non-OK response | Rejects (assertion attached before `fail`) |
| E2 | users | Clearing the search | All users shown again |
| E3 | users | Retry fails again | Error and Retry still shown |
| E4 | users | Search hides the selected user | Posts panel stays (D17) |
| E5 | posts | User with no posts | `No posts yet.` (D55) |
| E6 | posts | Unselected users | `aria-pressed="false"` |
| E7 | newPost | Only Body invalid | Focus goes to Body, Title has no error, `aria-describedby` only on Body |
| E8 | newPost | Cancel during POST | POST aborted, nothing added, no error |
| E9 | newPost | Retry after a failed POST | Second attempt adds the post |
| E10 | newPost | Submitted values trimmed | `"  My post  "` shown as `My post` and sent trimmed (D41) |
| E11 | newPost | Post created after the posts load failed | Shown above the error (D25, D29) |
| E12 | newPost | Created post belongs to its user only | Not shown for another user |
| E13 | newPost | Switching users closes the form | Form not open on return (D16) |
| E14 | newPost | Enter in Title submits | Validation runs or POST is sent |

---

### Task 1: Scaffold (generated code only)

**Files:** Create the Vite `react-ts` template files at the repo root. Modify `.gitignore` (merge in template entries).

**Interfaces:** Produces the template's `npm run dev` / `build` / `lint` (Oxlint) scripts and `src/main.tsx` (keeps `<StrictMode>`).

- [ ] **Step 0: Node:** `nvm use 24.22.3`, then `node --version`. Expected: `v24.22.3` (jsdom 31 needs ≥ 24.15).
- [ ] **Step 1: Generate into a temp folder** (the repo root isn't empty): `npm create vite@latest scaffold -- --template react-ts --no-interactive --no-immediate`.
- [ ] **Step 2: Move everything from `scaffold/` to the root, dotfiles included** (`.oxlintrc.json`): `cp -r scaffold/. . ` but keep the root `.gitignore`. Append any template `.gitignore` entries the root lacks, then delete `scaffold/`. In `package.json`, rename the package from `scaffold` to `users-posts`.
- [ ] **Step 3: Install and verify:** `npm install`, then `npm run build`, then `npm run lint`. Expected: all exit 0; `dist/` is created (ignored).
- [ ] **Step 4: Commit (after Adrian approves):** `git add -A && git commit -m "chore: scaffold Vite react-ts app"` (spec D4: generated code in its own commit).

### Task 2: Test tooling, `fetch` mock, API layer

**Files:**
- Modify: `vite.config.ts`, `package.json` (scripts), `tsconfig.app.json` (`"strict": true`), `index.html` (title `Users & Posts`; keep the `/favicon.svg` link)
- Create: `src/test/setup.ts`, `src/test/mockFetch.ts`, `src/test/fixtures.ts`, `src/requestState.ts`, `src/api.ts`
- Test: `src/api.test.ts`
- Remove the template demo:
  - Delete `src/assets/` (`hero.png`, `react.svg`, `vite.svg`) and `public/icons.svg`. Keep `public/favicon.svg`.
  - Empty `src/index.css` (`main.tsx` imports it) and `src/App.css`.
  - Reduce `src/App.tsx` to `<main><h1>Users & Posts</h1></main>` until Task 3.

**Interfaces (produces):**
```ts
// src/requestState.ts
export type RequestState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error' };
export function assertNever(value: never): never; // throws; used as the default of every state switch

// src/api.ts
export const API_URL = 'https://jsonplaceholder.typicode.com';
export const USERS_URL: string;                       // `${API_URL}/users`
export function userPostsUrl(userId: number): string; // `${API_URL}/users/${userId}/posts`
export type User = { id: number; name: string };
export type Post = { id: number; userId: number; title: string; body: string };
export type NewPost = { userId: number; title: string; body: string };
export type CreatedPost = NewPost & { localId: string };
export function getJson<T>(url: string, signal: AbortSignal): Promise<T>; // throws on !ok
export function createPost(post: NewPost, signal: AbortSignal): Promise<void>; // throws on !ok
export function nextLocalId(): string; // module counter: 'local-1', 'local-2', … (used in Task 5)

// src/test/mockFetch.ts
export type FetchMock = {
  respond(route: string, data: unknown): Promise<void>; // oldest pending request on route → 200 JSON
  fail(route: string, status?: number): Promise<void>;  // oldest pending request on route → status (default 500)
  calls(route: string): RequestInit[];                  // every request made on route, in order; [] if none
};
export function installFetchMock(): FetchMock;
// route = `${METHOD} ${pathname}`, e.g. 'GET /users', 'GET /users/1/posts', 'POST /posts'

// src/test/fixtures.ts
export const users: User[]; // [{id:1,name:'Leanne Graham'},{id:2,name:'Ervin Howell'},{id:3,name:'Clementine Bauch'}]
export function postsFor(userId: number): Post[]; // 2 posts, titles `User ${userId} post A` / `… post B`
```

- [ ] **Step 1: Install test deps:** `npm i -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom`.
- [ ] **Step 2: Configure.** In `vite.config.ts`, import `defineConfig` from `vitest/config` and add `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }`. Add the scripts `"test": "vitest run"` and `"test:watch": "vitest"`. `setup.ts` should import `@testing-library/jest-dom/vitest` and register `afterEach(() => { cleanup(); vi.unstubAllGlobals(); })`.
- [ ] **Step 3: Write `mockFetch.ts`** to this behaviour:
  - `installFetchMock` calls `vi.stubGlobal('fetch', fn)`.
  - `fn(input, init)` takes the URL from `input instanceof Request ? input.url : String(input)` and builds the route from `method` and `new URL(url).pathname`. It records `init` under that route and returns a promise kept in a pending list for the route.
  - If `init.signal` aborts, the pending entry is removed and its promise rejects with `new DOMException('The operation was aborted.', 'AbortError')`, like real `fetch`.
  - `respond` / `fail` first `vi.waitFor` a pending entry on the route. If none arrives, the callback throws an error naming the route and the routes that are pending. They then settle the entry inside `await act(async () => …)` (from `@testing-library/react`) with `new Response(JSON.stringify(data), { status })`.
  - In UI tests, the first assertion after each `respond` / `fail` uses `findBy*`, as insurance against the response body resolving late.
- [ ] **Step 4: Write the failing test** in `src/api.test.ts`. The getJson test is cut (D46); `getJson`'s non-OK path is covered by T3.
```ts
it('createPost sends JSON with a JSON content type', async () => {
  const api = installFetchMock();
  const done = createPost({ userId: 1, title: 't', body: 'b' }, new AbortController().signal);
  await api.respond('POST /posts', { id: 101 });
  await done;
  const [init] = api.calls('POST /posts');
  expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  expect(JSON.parse(String(init.body))).toEqual({ userId: 1, title: 't', body: 'b' });
});
```
- [ ] **Step 5: Run `npx vitest run src/api.test.ts`.** Expected: FAIL, because `createPost` doesn't exist yet.
- [ ] **Step 6: Implement `src/api.ts` and `src/requestState.ts`** to the interfaces above. `getJson` casts `await res.json()` to `T` with a one-line comment: the API shape is trusted and not validated at runtime (no Zod, D1).
- [ ] **Step 7: Run `npm test`, then `npm run build`, then `npm run lint`.** Expected: 1 passed; the build and lint exit 0.
- [ ] **Step 8: Commit (after Adrian approves):** `chore: add test tooling, fetch mock and API layer`.

### Task 3: Users column with search (T1, T2, T3, RF3)

**Files:**
- Create: `src/hooks.ts`, `src/components/UserList.tsx`
- Modify: `src/App.tsx`
- Test: `src/users.test.tsx`

**Interfaces:**
- Consumes: `getJson`, `USERS_URL`, `userPostsUrl`, `User`, `Post`, `RequestState` (Task 2).
- Produces:
```ts
// src/hooks.ts
export function useRequest<T>(url: string): { state: RequestState<T>; retry: () => void };
export function useUsers(): { state: RequestState<User[]>; retry: () => void };
export function useUserPosts(userId: number): { state: RequestState<Post[]>; retry: () => void };
// src/components/UserList.tsx
type UserListProps = {
  state: RequestState<User[]>;
  onRetry: () => void;
  selectedUserId: number | null;
  onSelect: (userId: number) => void;
};
// src/App.tsx — default export App; state: selectedUserId: number | null
```

- [ ] **Step 1: Write the failing tests** in `src/users.test.tsx`. Use `beforeEach(() => { api = installFetchMock(); })` and `render(<App />)`.
```tsx
it('T1 shows loading, then the users', async () => {
  render(<App />);
  expect(screen.getByText('Loading users…')).toHaveAttribute('role', 'status');
  await api.respond('GET /users', users);
  expect(screen.getByRole('button', { name: 'Leanne Graham' })).toBeInTheDocument();
  expect(screen.queryByText('Loading users…')).not.toBeInTheDocument();
});
it('T2/RF3 filters by name ignoring case and spaces; shows no-match', async () => {
  // type '  LEAN ' into getByRole('searchbox', { name: 'Search users by name' })
  // → Leanne Graham button present; Ervin Howell button absent
  // clear, type 'zzz' → getByText('No users match "zzz"') has role status
});
it('T3 shows an error with Retry that reloads the users', async () => {
  // api.fail('GET /users') → getByRole('alert') has text "Couldn't load users."
  // click Retry → 'Loading users…' visible → api.respond('GET /users', users) → Leanne Graham button
});
```
- [ ] **Step 2: Run `npx vitest run src/users.test.tsx`.** Expected: FAIL, because there are no users UI elements.
- [ ] **Step 3: Implement `useRequest`:**
  - State starts as `{ status: 'loading' }`, plus an `attempt` counter.
  - The effect on `[url, attempt]` creates an `AbortController` and calls `getJson`. It sets success or error **only if `!signal.aborted`** (D14), and the cleanup aborts.
  - `retry` (a `useCallback`) sets `loading` and then bumps `attempt` with a functional update, in the handler and not in the effect.
  - It assumes `url` is fixed for the lifetime of the component; callers that switch urls remount instead (D27).
  - The wrappers are one-liners: `useUsers` passes `USERS_URL` and `useUserPosts` passes `userPostsUrl(userId)`.
- [ ] **Step 4: Implement `UserList` and wire it into `App`.**
  - **Structure:** `<section>` with `<h2>Users</h2>`, then `<input type="search">` labelled `Search users by name`. The input is always rendered (D39).
  - **States:** use a `switch` on `state.status` ending in `default: return assertNever(state)`:
    - loading: `<p role="status">Loading users…</p>`
    - error: `<p role="alert">Couldn't load users.</p>` plus a `Retry` button
    - success: the filtered `<ul>` of `<button aria-pressed={user.id === selectedUserId}>`
  - **Filter:** derived in render as `name.toLowerCase().includes(query.trim().toLowerCase())`. When nothing matches, show `<p role="status">No users match "{query.trim()}"</p>`.
  - **App:** `useUsers()` and `useState<number | null>(null)`. Render the users column and, on the right, `<p>Select a user to see their posts.</p>`.
  - **Essential CSS in `src/App.css`** (D52), so that cutting styling never removes required behaviour:
    - a two-column grid that stacks below 700px
    - `[aria-pressed="true"]` in bold, with a `▸` added through `::before`
    - a visible `:focus-visible` outline

    The marker must **not** be text inside the button, or the button's name would become "▸ Leanne Graham" and break the `{ name: 'Leanne Graham' }` queries.
- [ ] **Step 5: Run `npm test`.** Expected: all tests pass (1 API + 3 users = 4).
- [ ] **Step 6: Commit (after Adrian approves):** `feat: users list with name search, loading and error states`.

### Task 4: Posts panel (T4, T8, RF5)

**Files:**
- Create: `src/components/PostsPanel.tsx`
- Modify: `src/App.tsx`
- Test: `src/posts.test.tsx`

**Interfaces:**
- Consumes: `useUserPosts`, `User`, `Post`, `CreatedPost`.
- Produces:
```ts
type PostsPanelProps = {
  user: User;
  createdPosts: readonly CreatedPost[];   // newest first; [] until Task 5
  onCreated: (post: CreatedPost) => void; // used from Task 5
};
// App renders <PostsPanel key={selectedUser.id} … />
// selectedUser is derived in render from the full (unfiltered) list:
// users.state.data.find(u => u.id === selectedUserId), so a search that hides
// the selected user leaves the posts panel in place
```

- [ ] **Step 1: Write the failing tests** in `src/posts.test.tsx`. Use a helper `renderWithUsers()` that renders `<App />`, calls `api.respond('GET /users', users)` and returns `userEvent.setup()`.
```tsx
it('T4 selecting a user shows loading, then their posts', async () => {
  // 'Select a user to see their posts.' visible first
  // click 'Leanne Graham' → its button has aria-pressed="true"
  // getByRole('heading', { name: "Leanne Graham's posts" }); 'Loading posts…' has role status
  // api.respond('GET /users/1/posts', postsFor(1)) → getByText('User 1 post A')
});
// T8 asserts the abort and the absence of an error. A "late A response" cannot
// be expressed with the mock (aborted entries are rejected), and it is moot
// under the keyed remount.
it('T8 switching users quickly shows only the latest user', async () => {
  // click Leanne Graham, then Ervin Howell (before responding)
  // api.respond('GET /users/2/posts', postsFor(2)) → 'User 2 post A' visible
  // heading "Ervin Howell's posts"; queryByText('User 1 post A') null; queryByRole('alert') null
  // expect(api.calls('GET /users/1/posts')[0].signal?.aborted).toBe(true)
});
it('RF5 a failed posts load shows an error and Retry recovers', async () => {
  // click Ervin Howell → api.fail('GET /users/2/posts') → alert "Couldn't load posts."
  // '+ New post' button is still present
  // click Retry → api.respond('GET /users/2/posts', postsFor(2)) → 'User 2 post A'
});
```
- [ ] **Step 2: Run `npx vitest run src/posts.test.tsx`.** Expected: FAIL.
- [ ] **Step 3: Implement `PostsPanel`:**
  - `<section>` with `<h2>{user.name}'s posts</h2>`, then `<ul aria-label="Posts">`. Created posts come first in the list, then the fetched posts, but only when `success` (D29).
  - Below the list, by status: `<p role="status">Loading posts…</p>`, or `<p role="alert">Couldn't load posts.</p>` + `Retry`.
  - Each post is an `<li>` with the title in `<h3>` and the body in `<p>`. Keys: `localId` for created posts, `id` for fetched ones.
  - The status switch ends in `default: return assertNever(state)`.
  - Render a `+ New post` button in the header now (it does nothing until Task 5), in every posts state, so RF5 can check it.
- [ ] **Step 4: Wire it into `App`.**
  - Add `createdByUser` state: `useState<Record<number, CreatedPost[]>>({})`.
  - `handleCreated` is a `useCallback`. It prepends with a functional update: `prev => ({ ...prev, [p.userId]: [p, ...(prev[p.userId] ?? [])] })`.
  - Render `<PostsPanel key={selectedUser.id} user={selectedUser} createdPosts={createdByUser[selectedUser.id] ?? []} onCreated={handleCreated} />`.
  - When nothing is selected, keep the placeholder.
- [ ] **Step 5: Run `npm test`.** Expected: all tests pass (7).
- [ ] **Step 6: Commit (after Adrian approves):** `feat: show the selected user's posts with loading, error and race handling`.

### Task 5: New post form (T5, T6, T7, RF1, RF2)

**Files:**
- Create: `src/components/NewPostForm.tsx`
- Modify: `src/components/PostsPanel.tsx`
- Test: `src/newPost.test.tsx`

**Interfaces:**
- Consumes: `createPost`, `NewPost`, `CreatedPost`; `PostsPanel`'s `onCreated`.
- Produces:
```ts
type NewPostFormProps = {
  userId: number;                          // captured for the POST
  onCreated: (post: CreatedPost) => void;
  onClose: () => void;                     // parent hides the form and refocuses "+ New post"
};
type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'error' };
type FieldErrors = { title?: string; body?: string };
```

- [ ] **Step 1: Write the failing tests** in `src/newPost.test.tsx`. Use a helper `openFormFor(name, userId)`: `renderWithUsers()` → click the user → `api.respond('GET /users/${userId}/posts', postsFor(userId))` → click `+ New post`. Another helper `addPost(title, body)` types into `Title`/`Body` and clicks `Add post`.
```tsx
it('T5 empty or blank fields show both errors and send nothing', async () => {
  // Title field has focus on open
  // click Add post → 'Title is required', 'Body is required'; Title has aria-invalid="true" and focus
  // type '   ' in both, click Add post → errors still shown
  // type 'Hi' in Title → 'Title is required' gone
  // expect(api.calls('POST /posts')).toHaveLength(0)
});
it('T6/RF1 a valid post shows Adding…, then appears first and the form closes', async () => {
  // addPost('My post', 'Hello') → button 'Adding…' is disabled; click it again
  // expect(api.calls('POST /posts')).toHaveLength(1)
  // api.respond('POST /posts', { id: 101 })
  // within(getByRole('list', { name: 'Posts' })).getAllByRole('listitem')[0] contains 'My post' and 'just added'
  // queryByRole('textbox', { name: 'Title' }) null; '+ New post' has focus
});
it('T7 a failed POST keeps the text and re-enables the button', async () => {
  // addPost('My post', 'Hello') → api.fail('POST /posts')
  // alert "Couldn't add the post. Your text is kept; try again."
  // Title has value 'My post'; button 'Add post' enabled
});
it('RF2 switching users mid-POST aborts it and adds nothing', async () => {
  // addPost on Leanne → click Ervin Howell → respond GET /users/2/posts
  // api.calls('POST /posts')[0].signal?.aborted true; queryByRole('alert') null
  // click Leanne Graham → respond GET /users/1/posts → queryByText('just added') null
});
// (Plan note, not test code: the RF4 and Cancel tests were cut for time; manual checks cover them.)
```
- [ ] **Step 2: Run `npx vitest run src/newPost.test.tsx`.** Expected: FAIL.
- [ ] **Step 3: Implement `NewPostForm`:**
  - **Fields:** `<form noValidate>` with a labelled `<input>` Title (`autoFocus`), a `<textarea>` Body, `Add post` and `Cancel`.
  - **Submit handler** (`preventDefault`, all in the handler):
    1. Validate both fields on `value.trim()`. If there are errors, set them, focus the first invalid field via a ref, and return.
    2. Create an `AbortController` and store it in a ref, then set `submitting`.
    3. `await createPost({ userId, title: title.trim(), body: body.trim() }, signal)`. On success, call `onCreated({ …, localId: nextLocalId() })` and then `onClose()`.
    4. On rejection, set `error` only if `!signal.aborted`.
  - **Abort:** a cleanup-only `useEffect(() => () => controllerRef.current?.abort(), [])` aborts on unmount, which covers a user switch. Cancel aborts and then calls `onClose`.
  - **Errors in the UI:** each error is `<p id="title-error">` / `<p id="body-error">`. Set `aria-invalid` and `aria-describedby` **only when that field has an error** (`errors.title ? 'title-error' : undefined`), so they never point at a missing id. In `onChange`, clear a field's error once its trimmed value is non-empty. When submit fails, show `<p role="alert">Couldn't add the post. Your text is kept; try again.</p>`.
  - **Button:** reads `Adding…` and is `disabled` while submitting.
  - **Local ids:** `nextLocalId()` is a module-level counter returning `local-${n}`. Put it in `src/api.ts`, not the component file, so `NewPostForm.tsx` exports only a component (Fast Refresh friendly).
- [ ] **Step 4: Wire it into `PostsPanel`:**
  - Add `formOpen` state and a ref on the existing `+ New post` button. The button gets `aria-expanded={formOpen}` and stays visible in every posts state.
  - `onClose` sets `formOpen` to false and focuses the button.
  - Render each created post with `<span>just added</span>` next to its title.
- [ ] **Step 5: Run `npm test`, then `npm run build`, then `npm run lint`.** Expected: all tests pass (11); the build and lint exit 0.
- [ ] **Step 6: Commit (after Adrian approves):** `feat: new post form with validation, submit states and abort on switch`.

### Task 6: Layout and styling (CUT, D46; essential CSS moved into Task 3, D52; kept below for the README's "with more time")

**Files:** Modify `src/App.css` and `src/index.css` (or merge them into one, keeping D21's single plain-CSS approach), and `src/App.tsx` (class names only).

- [ ] **Step 1: Apply a light `frontend-design` pass:**
  - **Layout:** two-column grid (users ~1/3, posts ~2/3) that stacks below 700px.
  - **Polish:** readable type scale, visible `:focus-visible` outlines, and AA contrast.
  - **Selected user:** not marked by colour alone (bold plus a `▸` marker, D30).
  - **Messages:** errors in a tinted box, and `just added` as a small pill.
- [ ] **Step 2: Run `npm test` and `npm run build`.** Expected: still all passing.
- [ ] **Step 3: Check it in a browser with the `run` skill.** Check the layout, the narrow-screen stacking and keyboard focus.
- [ ] **Step 4: Commit (after Adrian approves):** `style: two-column layout and accessible focus/selection styles`.

### Task 7: Reviews, manual testing, README

**Files:** Create `README.md`. Modify this plan's tracking sections, `docs/ai-usage-log.md`, and any source files that review findings touch.

- [ ] **Step 1: `web-design-guidelines` review: CUT (D46).**
- [ ] **Step 2: Run `code-review` (medium) on `d33672f..HEAD`** (the work is on `main`, so there is no branch diff). Apply or reject each finding with a reason, and log it in Reviews.
- [ ] **Step 3: Adrian runs the spec's manual checklist in the browser** (`npm run dev`, DevTools request blocking and throttling). Record the results in Manual testing below.
- [ ] **Step 4: Write `README.md`** following the spec's outline:
  - how to run it (Node ≥ 24.15, `npm install`, `npm run dev`, `npm test`, `npm run build`)
  - Decisions, summarised from the spec's D1–D34 and this plan's D35+
  - what I'd do with more time
  - how I used AI, written from `docs/ai-usage-log.md`
- [ ] **Step 5: Final verification:** `npm test && npm run build && npm run lint`. Expected: every test passes, and the build and lint exit 0. Record the result in Automated testing.
- [ ] **Step 6: Update `ai-log`, then commit (after Adrian approves):** `docs: README, reviews and test results`.

---

## Build rulings

Copied from the execution ledger (`.superpowers/sdd/…/progress.md`, which is git-ignored) so they can be read here. Every "deferred" item below was fixed later (D63–D66, D74, D80).

- Setup: Ruling: work on main, no worktree — the plan Adrian approved says the work is on main (code-review range d33672f..HEAD) — cost if wrong: history mixes with docs commits, easy to rebase later.
- Setup: Ruling: per-task commits wait for Adrian's approval (standing rule overrides skill's continuous commits); ask once after Task 1 for approval covering the build — cost if wrong: one pause.
- Setup: Ruling: final review = Task 7 `code-review` (medium) run inline; no reviewer subagent, because CLAUDE.md says inline/no subagents — cost if wrong: weaker review than a fresh reviewer; Adrian is told.
- Task 1: Ruling: template README.md not copied (Task 7 writes the real one) — cost if wrong: none.
- Task 1: Ruling: Node stays 24.14 for now — nvm download of 24.22.3 failed (Surfshark VPN resets downloads); jsdom engine check revisited in Task 2 — cost if wrong: EBADENGINE warning or jsdom runtime issue.
- Task 1: Adrian approved committing at the end of each task without asking again.
- Task 2: Ruling: Node stays 24.14 and jsdom is 29.1.1 (npm resolved it; supports 24.14) instead of upgrading Node — nvm download blocked by VPN — cost if wrong: none observed; README states Node 24.
- Task 2: Ruling: added `react/exhaustive-deps: warn` to .oxlintrc.json — hooks dependency mistakes are the likeliest React bug here; one line — cost if wrong: an extra warning.
- Task 2: Ruling: Adrian (D54) restored the cut tests and asked for all edge cases; tests E1–E14 added to the plan and test files (27 total).
- Task 3: Ruling: E4 (search hides selected user) committed red; it needs the posts panel and turns green in Task 4 — cost if wrong: one red test between commits.
- Task 4: Ruling: E6 (aria-pressed false) passed before Task 4 code — the behaviour was built in Task 3; test kept as a regression guard — cost if wrong: none.
- Task 5: Ruling: E10's heading query fixed (the "just added" tag is inside the h3, so its accessible name is "My post just added"); now asserts exact text with whitespace preserved; mutation check (trimming removed) made E10 fail — cost if wrong: none.
- Task 5: Ruling: "No posts yet." shown only when the fetched list and the created posts are both empty (D55) — cost if wrong: message hidden while a created post exists, which is correct.
- Final review: code-review (medium) on d33672f..HEAD, run inline as the plan's Task 7 Step 2 — 0 critical/important, 6 nits.
- Final: minor (deferred): UserList shows 'No users match ""' if /users returns [] (API never does).
- Final: minor (deferred): "+ New post" has aria-expanded but doesn't toggle closed; no aria-controls.
- Final: minor (deferred): "just added" tag inside the h3 makes the heading's accessible name include it.
- Final: minor (deferred): mockFetch doesn't reject an already-aborted signal immediately.
- Final: minor (deferred): some tests use getByText (errors, loading text) where CLAUDE.md asks for role/label queries.
- Final: minor (deferred): POST error alert stays visible while the user edits, until the next submit.
- Task 6: Ruling: D52's ::before text marker changed the accessible name in real browsers; replaced with a border triangle (D56) — verified in a Playwright snapshot — cost if wrong: none.
- Final: fixed "+ New post" toggle + aria-controls — E15, E16 RED→GREEN, suite 30/30
- Final: fixed "just added" inside the heading — E10 (now exact heading name) RED→GREEN, suite 30/30
- Final: fixed mock ignoring already-aborted signals — E17 RED (5 s timeout)→GREEN, suite 30/30
- Final: fixed text queries → role/label (errors via accessible description, status role, post headings) — test-only refactor, suite 30/30
- Final: Ruling: four text queries kept ("Select a user…", "No posts yet.", "just added" ×2) — plain text with no role or label; Testing Library allows text for non-interactive content — cost if wrong: none.
- Final: minor (deferred, Adrian's call): 'No users match ""' on an empty /users response; POST error stays visible while editing.

## Decisions

Continues the spec's numbering (D1–D34).

| # | Decision | Alternatives considered | Why | Made by |
|---|---|---|---|---|
| D35 | One generic `useRequest<T>(url)` in `src/hooks.ts` with thin `useUsers` / `useUserPosts` wrappers | Two hand-written hooks (spec's proposed structure) | One place for the abort + `signal.aborted` guard; effect deps are a primitive `url` (`rerender-dependencies`) | AI (builder's call) |
| D36 | `RequestState<T>` has no `idle` and no error message | Spec's `idle \| loading \| success \| error(message)` | The keyed posts panel always has a user, so it is never idle; the UI shows fixed friendly messages (D31) | AI (builder's call) |
| D37 | Created posts typed `CreatedPost` (`NewPost & { localId: string }`) with ids from a module counter (`local-1`, …) | Negative numeric ids in `Post`; `crypto.randomUUID` | Keeps fetched and local posts distinct in the types; deterministic in tests; no jsdom `crypto` concerns | AI (builder's call) |
| D38 | `User` declares only `id` and `name`; no branded id types | Full API shape; branded `UserId`/`PostId` (TS skill) | YAGNI; only one id kind flows through each prop, so branding would add ceremony without catching anything | AI (builder's call) |
| D39 | Search input rendered in every users state (loading/error/success) | Only once users have loaded | Stable layout; nothing to filter yet is harmless | AI (builder's call) |
| D40 | "+ New post" stays visible while the form is open, with `aria-expanded`; focus returns to it via a ref | Hide the button while open | Gives focus a stable place to return to (D30) | AI (builder's call) |
| D41 | Created posts store trimmed title/body | Store as typed | Whitespace-only is already invalid; trimming keeps display consistent | AI (builder's call) |
| D42 | Scaffold via `create vite` into a temp folder, then move to the root | Scaffold in place | The repo root already has files; create-vite won't scaffold cleanly into a non-empty folder | AI (builder's call) |
| D43 | Execute inline with `superpowers:executing-plans`, no subagents | Subagent-driven development | Set in `CLAUDE.md` | Adrian |
| D44 | Time budget per task (about 2 h 40 total) with the spec's cut order | No budget | Deferred from the adversarial review; keeps the 3-hour limit visible during the build | AI (builder's call) |
| D45 | Tests split by feature (`api`, `users`, `posts`, `newPost`); UI tests render the whole `<App />` | Unit tests per component | Tests read like what the user does; matches the "query what the user sees" rule | AI (builder's call) |
| D46 | The 3 hours include design time. Clock from the initial commit (13:22 ET), with about 1 h 15 left for the build (D44's 2 h 40 budget is superseded). Cut up front: getJson, Cancel and RF4 tests; Task 6 styling pass; `web-design-guidelines` review; Adrian runs the manual checks | Count only build time and keep the 2 h 40 plan | Plan review showed 1 h 46 already spent on design; the brief says "no more than 3 hours" | Adrian |
| D47 | Lint with the template's Oxlint (supersedes spec D22's "ESLint") | `--eslint` (ESLint 10 + react-hooks 7) | create-vite 9.3.4 now ships Oxlint by default; D22's intent was "whatever ships, nothing extra" | AI proposal accepted by Adrian |
| D48 | Node ≥ 24.15 (24.22.3 installed via nvm), stated in the README (refines spec D23) | Pin an older jsdom that supports 24.14 | jsdom 31 requires `^24.15.0`; upgrading takes minutes and keeps current packages | AI proposal accepted by Adrian |
| D49 | T8 asserts the abort and the absence of an error, not "A resolves late" (narrows the spec's T8) | Make the mock able to resolve aborted requests | The mock rejects aborted requests like real `fetch`, and the keyed remount makes a late A response moot; the `signal.aborted` guard stays as defence | AI (builder's call) |
| D50 | `"strict": true` written explicitly in `tsconfig.app.json` | Rely on TS 7's implicit default | A reviewer checking the strict-mode requirement can see it | AI (builder's call) |
| D51 | Exhaustive switches end in `assertNever(state)` | `const _x: never = state` | The local trips the template's `noUnusedLocals` and fails the build | AI (builder's call) |
| D52 | Essential CSS (grid, visible selection via `::before`, focus outline) lives in Task 3, not in the cuttable styling task | Keep all CSS in Task 6 | Cutting Task 6 must not remove D6 (layout) or D30 (selection not by colour alone); a text marker in the button would break the accessible name | AI (builder's call) |
| D53 | `nextLocalId()` lives in `src/api.ts` | Module counter inside `NewPostForm.tsx` | Component files export only components (Fast Refresh) | AI (builder's call) |
| D54 | No tests dropped. Restore getJson, Cancel and RF4, and add a test for every edge case found (list E1–E14 below). Partly reverses D46; the build will overrun the 3-hour budget | Keep D46's cuts (11 tests) | Adrian wants thorough test coverage over the time limit | Adrian |
| D55 | A user with no posts shows `No posts yet.` | Show an empty list | The spec is silent; an empty panel looks broken. Found while listing edge cases | AI (builder's call) |
| D56 | Selected-user marker drawn as a CSS border triangle, not `::before` text (corrects D52) | `content: '▸ '`; CSS alt-text syntax | Found in the browser check: Chrome includes `::before` text in the accessible name ("▸ Leanne Graham"). jsdom ignores CSS, so the tests could not catch it | AI (builder's call) |
| D57 | The Task 6 styling pass is done after all (reverses that part of D46). Palette: slate paper, navy ink, bottle-green actions, highlighter-yellow selection. Type: a book serif for headings and the system sans for the UI. Layout: centred, max 72rem | Keep only the minimal CSS | Adrian: "the UI is unaligned right and ugly" | Adrian |
| D58 | Feature folders: `ui/` (shared `ErrorWithRetry`, `Field`), `users/` (`UsersPanel`, `UserList`), `posts/` (`PostsPanel`, `PostList`, `PostItem`, `NewPostForm`, hooks). Replaces the flat `components/` folder | Keep a flat `components/` | Adrian asked for a very modular app; the split brings the count to 9 component files, where folders pay off | AI proposal accepted by Adrian |
| D59 | Form logic in `useNewPostForm` (values, validation, submit, cancel, abort on unmount), called inside `NewPostForm`; created posts in `useCreatedPosts`, used by `App` | Keep the logic in the components | Components become markup; the two near-duplicate "clear error" handlers merge into `setField`. The hook stays inside the form so unmounting still aborts the POST | AI proposal accepted by Adrian |
| D60 | One `ErrorWithRetry`, one `PostItem` / `PostList`, and `UserList` split from `UsersPanel` | Separate `Loading`, `PostsHeader`, `UserSearch` or generic async wrappers | Real reuse or a single job per file; the reviewer advised against the other splits as indirection without reuse | AI proposal accepted by Adrian |
| D61 | `Field` renders the label, the control (render prop) and the error, with `useId` ids; the error stays outside the `<label>` | Hard-coded `title-error` / `body-error` ids | Unique ids, and the field's accessible name stays "Title" / "Body" | AI proposal accepted by Adrian |
| D62 | Explicit class names (`.button`, `.button-secondary`, `.input`, `.post-item`, …) and one CSS file per feature (`ui.css`, `users.css`, `posts.css`, plus `index.css` and `App.css`). Revises D21's "one plain CSS file" | Keep position-based selectors in one file; CSS Modules (rejected in D21) | Selectors no longer break when markup moves between components; each feature owns its styles | AI proposal accepted by Adrian |
| D63 | "+ New post" toggles the form open and closed, and points at it with `aria-controls`; the form is named "New post" | Drop `aria-expanded`; keep open-only | The button announced itself as a toggle but did nothing when pressed again (code review) | AI proposal accepted by Adrian |
| D64 | "just added" tag sits beside the post heading, not inside it | Keep it inside the `<h3>` | The heading name should be the title alone (code review) | AI proposal accepted by Adrian |
| D65 | Tests query by role or label: field errors through the accessible description, messages through `role="status"`, posts through their heading. Four text queries remain for plain text with no role | Keep `getByText` | `CLAUDE.md` rule; the description checks also prove that each error is linked to its field (code review) | AI proposal accepted by Adrian |
| D66 | Two review nits left open: a message for an empty `/users` response, and clearing the POST error on edit | Fix them too | The API never returns an empty list; the error clears on the next submit. Listed in the README under "more time" | AI proposal accepted by Adrian |
| D67 | Form submit handler typed with `SubmitEvent<HTMLFormElement>`, not `FormEvent` | Keep `FormEvent` | `@types/react` 19.3 marks `FormEvent` deprecated ("doesn't actually exist"). A scan of every API used against the `@deprecated` markers in React, react-dom, Testing Library, user-event, jest-dom and Vitest found no other deprecated use | Adrian |
| D68 | **Timeline correction:** at the plan review (14:08) only 46 min had passed, not 1 h 46. The 3 hours ran to 16:22; the whole job took about 2 h 30 (13:22–15:50). D46's premise and D44/D46's budget figures were wrong | (no alternative: a factual correction) | The AI misread the machine's time zone label "CST" (Cuba Standard Time, UTC−5) as US Central and added an hour. Found by the final adversarial review; verified against `git log` and Windows' time zone setting | AI (builder's call) |
| D69 | Nothing is cut for time; every finding gets fixed or a recorded decision | Cut the optional items | Adrian: "don't skip something for the time" | Adrian |
| D70 | Node 24.14 and jsdom 29.1.1 (supersedes D48's "Node ≥ 24.15, jsdom 31") | Upgrade Node to 24.22.3 | The nvm download was blocked by the VPN; npm resolved jsdom 29, which supports Node 24.14, so no upgrade was needed. The README says "tested on Node 24.14" | AI (builder's call) |
| D71 | User buttons marked with `aria-current="true"` (replaces `aria-pressed` from D30) | Keep `aria-pressed` and make a second press deselect | `aria-pressed` announced a toggle that never toggled; the same defect D63 fixed for "+ New post" | AI proposal accepted by Adrian |
| D72 | A request that already succeeded is not cancelled when the form closes | Read the response body before closing | Every successful POST showed as `ERR_ABORTED` in DevTools (Playwright exploration) | AI proposal accepted by Adrian |
| D73 | Long unbroken words wrap (`overflow-wrap: anywhere`) in post titles, bodies, the posts heading and user names | Truncate with an ellipsis | A long title overflowed the page sideways (Playwright exploration); wrapping keeps the whole text readable | AI proposal accepted by Adrian |
| D74 | A new submit or any edit clears a previous send error; Escape closes the form like Cancel; closing with "+ New post" also discards the draft (consistent with D16) | Keep the error until the next success; keep a draft when the toggle closes the form | The old error looked current next to new field errors (adversarial review). One rule for every way of closing the form: unsent text is discarded, and leaving the page warns first (D78) | AI proposal accepted by Adrian |
| D75 | Status messages live in always-present `role="status"` regions; no empty "Posts" list while loading | Insert the status element only when there's a message | Screen readers reliably announce changes only in a live region that already exists | AI proposal accepted by Adrian |
| D76 | Tests: E18–E24 added; the mock gains `networkError()` (a request with no HTTP response); `noUncheckedIndexedAccess` turned on; two unprefixed tests named A1 and C1 | Leave as is | The final review showed the in-flight guard was untested and offline failures weren't exercised; the stricter index typing found nothing in app code | AI proposal accepted by Adrian |
| D77 | Structure tidy: `useRequest.ts` at the root, `useUsers` in `users/`, `useUserPosts` and `localId` in `posts/` (supersedes D53); internal types no longer exported; generated heading ids; a custom favicon | Keep the earlier layout | Each hook lives with its feature; nothing exported that nobody imports | AI proposal accepted by Adrian |
| D78 | Web interface guidelines fixes: skip link; curly quotes and a next step in error copy (revises the spec's exact copy); input `name` and `autocomplete="off"`; warn before leaving with an unsent draft; hover states; `touch-action: manipulation`; `text-wrap: balance`; `color-scheme` and `theme-color`; preconnect to the API; person names `translate="no"` | Skip the review (cut in D46) | `CLAUDE.md` requires one guidelines review before submitting | AI proposal accepted by Adrian |
| D79 | Guideline items not applied: Title Case (the copy is sentence case, as the spec and the `frontend-design` style use); a spinner while sending ("Adding…" on a disabled button says more); `autoFocus` kept (it runs only right after the user opens the form). URL state is listed under "more time" and left for Adrian to decide | Apply every rule literally | Each conflicts with a recorded choice or adds a feature the brief doesn't ask for | AI (builder's call) |
| D80 | An empty users response says `No users found.` | `No users match ""` | The last open code-review nit | AI proposal accepted by Adrian |

## Skills used

| Skill | Phase / task | What it was used for |
|---|---|---|
| `superpowers:writing-plans` | Planning | Structure of this plan, Review Focus, self-review |
| `typescript-best-practices` | Planning (applies to Tasks 2–5) | Discriminated unions (`RequestState`, `SubmitState`), exhaustive `never` switch; branded types considered and rejected (D38); Zod section ignored per D1 |
| `vercel-react-best-practices` | Planning (applies to Tasks 3–5) | Client-side rules listed in Global Constraints (derived state, handlers not effects, functional setState, primitive deps, conditional rendering, no barrels) |
| `ai-log` | Planning, build | Logged the planning step, the plan review and the build in `docs/ai-usage-log.md` |
| `superpowers:executing-plans` | Tasks 1–7 | Inline execution with a ledger (`.superpowers/sdd/…/progress.md`), one commit per task |
| `superpowers:test-driven-development` | Tasks 2–5 | Every test written first and watched failing; mutation check on E10 |
| `typescript-best-practices` | Tasks 2–5 | Discriminated unions (`RequestState`, `SubmitState`), `assertNever` |
| `vercel-react-best-practices` | Tasks 3–5 | Search derived in render; submit/retry/cancel in handlers; functional updates; keyed remount |
| `code-review` (medium) | Task 7 | Final review of `d33672f..HEAD` |
| `frontend-design` | Task 6 (styling pass, D57) | Palette, type and layout plan; checked against generic defaults before building |
| `web-design-guidelines` | Before submit | One guidelines review of the UI files (D78, D79) |
| `superpowers:verification-before-completion` | Throughout | Tests, build, lint and a browser check before every completion claim |

## Reviews

| Date | What was reviewed | Reviewer (Adrian / skill / subagent) | Findings | Outcome |
|---|---|---|---|---|
| 2026-11-20 | This plan vs the spec (coverage, step clarity, type consistency, Review Focus, proportion) | AI self-review (`writing-plans` checklist) | Two spec items had no explicit step: "+ New post" available in every posts state (D25), and the selection persisting through search (D17). The test-count line was ambiguous. Types and names were consistent across tasks; every Review Focus item has an owning test | Fixed inline (Task 5 Step 4, Task 4 Interfaces, Automated testing) |
| 2026-11-20 | This plan, adversarial review requested by Adrian | Subagent (general-purpose, adversarial reviewer) | Blockers: (1) the budget didn't fit, because design time already used about 1 h 46 of the 3 h; (2) create-vite 9.3.4 ships Oxlint, not ESLint, and its rolldown prompt no longer exists. Should-fix: scaffold move skipped dotfiles and used stale template file names; jsdom 31 needs Node ≥ 24.15 (24.14 installed); the getJson test would trigger an unhandled rejection; T8 weaker than the spec says; cutting Task 6 would remove visible selection, and a `▸` text marker would break the button's accessible name; `const _x: never` fails `noUnusedLocals`; `strict` not visible in tsconfig. Nits: aria attributes only when an error exists; mock robustness; D-numbers in code snippets; "branch diff" on `main`; D25 untested; `ai-log` missing from Skills used. Versions checked against npm by the AI (create-vite 9.3.4, jsdom 31.0.1 engines, vitest 5.1.1, vite 8.3.8, typescript 7.0.2) | All applied. Adrian decided: design time counts (D46), keep Oxlint (D47), upgrade Node (D48). Fixes recorded as D49–D53 |
| 2026-11-20 | Code `d33672f..HEAD` (all build commits) | `code-review` skill (medium) | No critical or important issues; the abort, retry, keyed-remount and POST-abort paths were traced with no race found. 6 nits:<br>1. `No users match ""` if `/users` returns `[]`<br>2. "+ New post" has `aria-expanded` but doesn't toggle closed<br>3. the "just added" tag is inside the post heading<br>4. the mock doesn't reject a signal that is already aborted<br>5. some tests query by text where `CLAUDE.md` asks for role/label<br>6. the POST error stays visible while editing | Recorded as deferred minors in the ledger; Adrian to decide whether to fix |
| 2026-11-20 | Component structure (modularity), requested by Adrian | Subagent (general-purpose, read-only) | Proposed a feature-folder tree. Six "do" refactors: `useNewPostForm`, `ErrorWithRetry`, `PostItem` / `PostList`, split `UserList`, `Field`, `useCreatedPosts`. Optional: feature folders and explicit per-feature CSS. A "don't split" list. Risks: keyed remount, abort on unmount, focus refs, the error outside `<label>`, the E10 exact heading text, CSS failing silently in jsdom | Adrian: "do it". Applied 1–8 (D58–D62); 27/27 tests, build, lint and a browser check all green |
| 2026-11-20 | Follow-up on the `code-review` nits above | Adrian | Asked to fix 2–5 | Fixed (D63–D65); 6 left open in D66, then fixed too (E24, D74); 1 fixed in D80 |
| 2026-11-20 | Finished product, adversarial review requested by Adrian | Subagent (general-purpose, read-only) | Credibility: the timeline didn't match git (the AI's time zone error); the README said Adrian ran the manual checks; stale decision ranges and CSS wording; D48 never closed; "How I used AI" softer than the log; `web-design-guidelines` never run; the ledger cited but git-ignored. Code: user buttons announced as toggles that don't toggle; the in-flight guard untested; offline failures untested; a stale send error; an empty list rendered while loading; status regions inserted pre-filled. Tidiness items. Held up: R1–R5 met, request handling sound, types clean, tests mostly sensitive | Adrian: fix everything, nothing cut for time (D69). Applied as D68–D80; the ledger's rulings are copied into "Build rulings" below |
| 2026-11-20 | Exploratory testing in a real browser, requested by Adrian | AI via Playwright (private browser context) | Every successful POST showed as cancelled; long titles overflowed the page; Escape didn't close the form. Held up: StrictMode double effect, re-clicking a user, a real double-click (1 POST), HTML in a title shown as text, short screens, 320px width | Fixed (D72–D74), re-verified in the browser |
| 2026-11-20 | UI files against the Web Interface Guidelines | `web-design-guidelines` skill | Missing skip link, theme-color, preconnect, `color-scheme`; straight quotes; errors without a next step; inputs without `name` / `autocomplete`; no unsaved-draft warning; no hover on buttons; no `touch-action`; headings without `text-wrap: balance`; names without `translate="no"` | Fixed (D78); three rules deliberately not applied (D79); verified in the browser |

## Automated testing

Command: `npm test` (`vitest run`). Final count: 37 tests. `api.test.ts` 3 (A1, E1, E17); `users.test.tsx` 8 (T1–T3, E2–E4, E20, E23); `posts.test.tsx` 5 (T4, T8, RF5, E5, E6); `newPost.test.tsx` 21 (T5–T7, RF2, RF4, C1, E7–E16, E18, E19, E21, E22, E24). The 11 planned after the D46 cuts grew to 37 with D54, the code-review fixes and the final review.

| Date | Command | Result (passed/failed/total) | Notes |
|---|---|---|---|
| 2026-11-20 | `npx vitest run src/api.test.ts` | 0/0 (suite failed to load) | Task 2 RED: `./api` didn't exist |
| 2026-11-20 | `npx vitest run src/api.test.ts` | 2/0/2 | Task 2 GREEN (createPost + E1) |
| 2026-11-20 | `npx vitest run src/users.test.tsx` | 0/6/6 | Task 3 RED |
| 2026-11-20 | `npx vitest run src/users.test.tsx src/api.test.ts` | 7/1/8 | Task 3 GREEN except E4, which needs the posts panel (see Build rulings) |
| 2026-11-20 | `npx vitest run src/posts.test.tsx` | 1/4/5 | Task 4 RED (E6 already passed: `aria-pressed` was built in Task 3) |
| 2026-11-20 | `npx vitest run` (posts, users, api) | 13/0/13 | Task 4 GREEN, E4 included |
| 2026-11-20 | `npx vitest run src/newPost.test.tsx` | 0/14/14 | Task 5 RED |
| 2026-11-20 | `npx vitest run` | 26/1/27 | E10 failed on the test's query (heading name includes "just added"); test fixed |
| 2026-11-20 | `npx vitest run -t E10` with trimming removed | 0/1 | Mutation check: E10 catches untrimmed posts |
| 2026-11-20 | `npx vitest run` + `npm run build` + `npm run lint` | 27/0/27 | All green; build and lint clean |
| 2026-11-20 | `npx vitest run` after the modular refactor | 27/0/27 | No test changes needed |
| 2026-11-20 | `npx vitest run` with new tests E15, E16, E17 and tightened E10 | 26/4/30 | RED: no toggle, no `aria-controls`, mock hangs on an already-aborted signal, heading included "just added" |
| 2026-11-20 | `npx vitest run` + `npm run build` + `npm run lint` | 30/0/30 | GREEN after the fixes and the role/label query switch; browser check clean |
| 2026-11-20 | `npx vitest run` + build + lint after `FormEvent` → `SubmitEvent` | 30/0/30 | Clean |
| 2026-11-20 | `npx vitest run --reporter=verbose`, then 3 more full runs | 30/0/30 ×4 | No flaky tests; no warnings in the output |
| 2026-11-20 | `npx vitest run` with E18–E21 and tightened T4, T6, E6 | 28/6/34 | RED: no `aria-current`, empty list while loading, mock lacked `networkError`, finished POST cancelled, stale alert, Escape ignored. E19 passed at once (the guard existed) |
| 2026-11-20 | `npx vitest run` | 34/0/34 | GREEN after the fixes |
| 2026-11-20 | `npx vitest run -t E19` with the in-flight guard removed | 0/1 | Mutation check: E19 catches a second submit |
| 2026-11-20 | `npx vitest run` after the persistent status regions | 32/2/34 | T1 and T4 assumed the status element disappears; updated to the new intended behaviour, then 34/34 |
| 2026-11-20 | `npx tsc -b` with `noUncheckedIndexedAccess` | 6 errors, all in tests | Fixed with `?.`; app code had none |
| 2026-11-20 | `npx vitest run` with the guidelines copy and E22 | 24/11/35 | RED: curly quotes, error next steps, beforeunload |
| 2026-11-20 | `npx vitest run` + build + lint | 35/0/35 | GREEN; browser check clean |
| 2026-11-20 | `npx vitest run` with E23, E24 | 35/2/37 | RED: empty users said "No users match", editing kept the send error |
| 2026-11-20 | `npx vitest run` + `npm run build` + `npm run lint` | 37/0/37 | Final: all green |

## Manual testing

Scenarios, steps and expected results are in the spec's Manual testing table; results are recorded here.

| Scenario | Steps | Expected | Result | Checked by | Date |
|---|---|---|---|---|---|
| Users load | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Search | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Select user | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Validation | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Create post | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Created post persists | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Two creates | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Load errors | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| POST error | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Switch on slow network | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Narrow screen | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Keyboard | see spec | see spec | Pass | AI via Playwright (real Chrome, live API) | 2026-11-20 |
| Dev double effect on load | Load the app in dev (StrictMode) | Duplicate request cancelled, no error flash | Pass | AI via Playwright (private context) | 2026-11-20 |
| Re-click the selected user | Click the selected user again | No new request | Pass | AI via Playwright (private context) | 2026-11-20 |
| Real double-click on Add post | Fill the form, double-click Add post | 1 POST, post shown once | Pass | AI via Playwright (private context) | 2026-11-20 |
| HTML in a title | Title `<img src=x onerror=alert(1)>` | Shown as text, nothing runs | Pass | AI via Playwright (private context) | 2026-11-20 |
| Long unbroken title | 200-character word as title | Wraps, no sideways scroll | Fail, then Pass after D73 | AI via Playwright (private context) | 2026-11-20 |
| Network panel after a post | Add a post, check failed requests | No cancelled POST | Fail, then Pass after D72 | AI via Playwright (private context) | 2026-11-20 |
| Short and very narrow screens | 1280×520 and 320×640 | Every user reachable, no sideways scroll | Pass | AI via Playwright (private context) | 2026-11-20 |
| Escape on the form | Open the form, press Escape | Form closes, focus on "+ New post" | Fail, then Pass after D74 | AI via Playwright (private context) | 2026-11-20 |
| Skip link and leave-page warning | Tab once, follow the link; reload with a draft | Link visible on focus, focus moves into main; browser asks to confirm | Pass | AI via Playwright (private context) | 2026-11-20 |

How the checks were run: Playwright drove Chrome against the dev server and the live API. For check 8 and check 9, request blocking used `page.route(…, abort)` instead of DevTools. For check 10, one user's posts were delayed by 3 s with `page.route` (instead of "Slow 3G") while the AI clicked through two other users; only the last user's posts showed and no alert appeared. Check 7: no warnings or errors in the console.

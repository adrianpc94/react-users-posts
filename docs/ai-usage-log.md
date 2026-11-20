# AI usage log

Running log for the README's "How I used AI" section. Format and rules:
`.claude/skills/ai-log/SKILL.md`.

### 2026-11-20 Design (brainstorming → spec)
- **Asked:** Run a brainstorming session for the app's design and write the spec (`docs/superpowers/specs/2026-11-20-users-posts-design.md`).
- **Accepted:** Findings that shaped the design (POST always returns `id: 101` → client ids; abort stale posts requests on user switch; client-side search for 10 users); the screen behaviour (loading/error + Retry, submit-time validation with whitespace = empty, per-user created posts); approach 1 (plain `fetch` + custom hooks + discriminated-union request state) over TanStack Query.
- **Corrected:** Adrian rejected the AI's proposal to reference decision numbers in code comments and commit messages ("it's noise"): decisions are tracked only in the Decisions tables. Adrian chose the "+ New post" button layout (B) over the AI's recommended always-visible form (A), after asking to see both as browser mockups.

### 2026-11-20 Adversarial review of the spec
- **Asked:** Launch a subagent to do an adversarial review of the design spec.
- **Accepted:** Nearly all 15 findings, applied to the spec. The ones that changed the design: a `signal.aborted` guard before state updates (abort alone wouldn't make the race test meaningful with a mocked `fetch`), resetting the posts panel per user (A's posts showed under B's name for one frame), rendering the submitted title/body (the API returns no title/body without a JSON header), aborting an in-flight POST on user switch, plus missing decisions (stack, endpoint, accessibility) and a deterministic `fetch` mock with deferred promises.
- **Corrected:** The review caught mistakes in the AI's own first spec: the race test as planned would have proven nothing, and "use the API's title/body" would have rendered a blank post. Adrian kept the three-place decision tracking that the reviewer called costly, and agreed to the AI's modified cut order (Retry kept until last, against the reviewer's order).

### 2026-11-20 Implementation plan
- **Asked:** Write the implementation plan from the approved spec, explicitly using the TypeScript and React best-practice skills.
- **Accepted:** Pending Adrian's review of `docs/superpowers/plans/2026-11-20-users-posts.md` (7 tasks, 14 planned tests, plan decisions D35–D45).
- **Corrected:** The AI's self-review found two spec items with no explicit step ("+ New post" in every posts state, and the selection persisting through search) and fixed them before handing the plan over.

### 2026-11-20 Adversarial review of the plan
- **Asked:** Launch a subagent to do an adversarial review of the implementation plan.
- **Accepted:** All findings. The AI checked the version claims against npm before accepting them. Main changes: scaffold flags and the dotfile-safe move for create-vite 9.3.4; the `assertNever` helper (a `never` local fails `noUnusedLocals`); essential CSS moved into Task 3, with the `▸` marker done in CSS so buttons keep their accessible names; aria attributes set only when an error exists; T8's scope recorded honestly.
- **Corrected:** The AI's plan assumed tooling that had changed: create-vite now ships Oxlint, not ESLint, and jsdom 31 needs Node ≥ 24.15. The AI's 2 h 40 budget ignored the 1 h 46 already spent on design. Adrian decided that design time counts toward the 3 hours, which cut three tests, the styling pass and one review. He also chose to keep Oxlint and to upgrade Node.

### 2026-11-20 Build (Tasks 1–5) and final review
- **Asked:** Execute the plan inline, tests first, committing each task. Adrian then asked to keep every test and to add tests for all edge cases found.
- **Accepted:** The scaffold, test tooling, `fetch` mock, API layer, hooks and the three components as the AI wrote them; 27 tests (14 edge-case tests added at Adrian's request); the `code-review` result (no critical or important issues, 6 nits).
- **Corrected:**
  - Adrian reversed the AI's time-saving test cuts ("I don't want to drop any test") and asked for edge-case tests, accepting the overrun.
  - The VPN (Surfshark) reset the AI's downloads. Adrian ran `npm install` himself, and npm picked jsdom 29, which works on Node 24.14, so the planned Node upgrade wasn't needed.
  - The AI's first E10 test queried the post heading by a name that didn't include "just added". It was fixed, then checked by breaking the trimming on purpose.

### 2026-11-20 Styling pass
- **Asked:** Adrian: "the UI is unaligned right and ugly, apply and fix the UI styles".
- **Accepted:** A `frontend-design` pass: a centred layout, a user index with a highlighter-yellow selection, a reading column for posts, a book serif for headings and a sans-serif for the UI, and a bottle-green accent. Checked in a real browser at desktop and phone widths.
- **Corrected:** The AI's own earlier decision (D52) was wrong. The browser check showed that the `::before` "▸" text was announced as part of the button's name ("▸ Leanne Graham"). The tests couldn't catch this because jsdom ignores CSS. The AI replaced it with a border-drawn triangle.

### 2026-11-20 Manual checks and modular refactor
- **Asked:** Adrian asked the AI to run the 12 manual checks with Playwright, and to make the app "very modular in components" using a subagent to find improvements.
- **Accepted:** All 12 manual checks passed in real Chrome against the live API. They are recorded as "AI via Playwright", not as checked by Adrian. From the subagent review, refactors 1–8 were applied (D58–D62): feature folders; `useNewPostForm` and `useCreatedPosts` hooks; shared `ErrorWithRetry` and `Field`; `PostItem` / `PostList`; `UsersPanel` split from `UserList`; explicit classes and per-feature CSS. The 27 tests stayed green with no changes.
- **Corrected:** The reviewer's "don't split" list was followed: no generic loading, header, search or async wrappers. The CSS moves were checked in the browser, because jsdom can't catch CSS problems.

### 2026-11-20 Code-review fixes
- **Asked:** Adrian approved fixing four of the six minor code-review findings.
- **Accepted:** Each fix was test-first. "+ New post" now toggles the form and points at it with `aria-controls` (new tests E15, E16). "just added" moved out of the post heading (E10 tightened to an exact heading name). The `fetch` mock rejects a request that is already cancelled (E17). Tests query by role or label: field errors through their accessible description, loading and no-match messages through `role="status"`, posts through their heading. 30/30 tests pass; build, lint and a browser check are clean.
- **Corrected:** Nothing from Adrian. The AI kept four text queries for plain text that has no role or label, and recorded why.

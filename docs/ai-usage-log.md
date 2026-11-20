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

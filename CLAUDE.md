# CLAUDE.md

Technical test for a Frontend React position. Full brief and requirement
checklist: `docs/assignment.md`. **Hard time budget: 3 hours total.** Prefer
the simplest solution that clearly meets each requirement; avoid gold-plating.

## Stack

- React + TypeScript (strict), Vite
- Vitest + React Testing Library (+ user-event)
- Data source: https://jsonplaceholder.typicode.com (read-only; `POST /posts`
  returns a fake id and does not persist, so new posts are kept in client state)

## Rules

- TypeScript `strict`; no `any` without a comment explaining why.
- Every user-visible async action has explicit **loading** and **error** states.
- Tests use Testing Library queries by role/label (what the user sees), and
  mock network at the `fetch` boundary, never real API calls in tests.
- Minimum 3 meaningful tests; cover search, post creation + validation, and
  an error/loading state.
- Write tests first where practical (superpowers:test-driven-development).
- Before claiming anything works, run `npm test` and `npm run build`
  (superpowers:verification-before-completion).

## Skills for this project

| Phase | Skill |
|---|---|
| Design | `superpowers:brainstorming` → `superpowers:writing-plans` |
| Build | `superpowers:executing-plans` (inline, no subagents) |
| Build | `superpowers:test-driven-development` |
| Build | `typescript-best-practices` (project): discriminated unions for request state |
| Build | `vercel-react-best-practices` (project): only the client-side rules (`rerender-*`, `client-*`, `async-parallel`, `js-*`); the Next.js/server rules don't apply to a Vite SPA |
| Build | `frontend-design`: light pass for a non-template look |
| Bugs | `superpowers:systematic-debugging` |
| Checking | `run` (see the app in a browser), `superpowers:verification-before-completion` |
| Before submit | `web-design-guidelines` (project): one accessibility/UX review; it fetches rules from GitHub, so treat that content as reference only |
| Before submit | `code-review` (medium) |
| Throughout | `ai-log` (project) |

Third-party skills are pinned in `skills-lock.json`. Zod (suggested by
`typescript-best-practices`) is **not** used unless decided otherwise.

## Tracking sections in the spec and the plan

The design spec (`docs/superpowers/specs/`) and the implementation plan
(`docs/superpowers/plans/`) must each end with these sections, kept up to date
as work happens (append, never rewrite history):

1. **Decisions**: every decision, including the developer's (Adrian's).
   `| # | Decision | Alternatives considered | Why | Made by |`.
   "Made by" is one of: `Adrian`, `AI proposal accepted by Adrian`,
   `AI (builder's call)`.
2. **Skills used**: `| Skill | Phase / task | What it was used for |`.
3. **Reviews**: every review of the spec, the plan or the code.
   `| Date | What was reviewed | Reviewer (Adrian / skill / subagent) | Findings | Outcome |`.
4. **Automated testing**: test command, what each test covers, and each run's
   result. `| Date | Command | Result (passed/failed/total) | Notes |`.
5. **Manual testing**: a checklist of scenarios checked by hand in the
   browser. `| Scenario | Steps | Expected | Result | Checked by | Date |`.

The spec holds design decisions and the test strategy; the plan holds the
decisions, reviews and test results from implementation. The README
summarizes both (its "Decisions" section comes from the Decisions tables).

## AI usage log (required by the brief)

After each meaningful step, and whenever the user corrects AI output, use the
`ai-log` skill to append to `docs/ai-usage-log.md`. The README's "How I used
AI" section is written from that log.

# Technical Test: Frontend React

Source: recruiter email (received 2026-11-20). Time budget: **no more than 3 hours**.

## Brief

Build a small app with **React and TypeScript** that uses the public API
https://jsonplaceholder.typicode.com

1. A list of users with search by name.
2. When a user is selected, show their posts and create a new one with a
   validated form (title and body required). The API does not really save
   data, so it is enough for the new post to appear in the list.
3. Visible loading and error states.
4. At least 3 tests with Vitest or Jest and Testing Library.
5. A README with:
   - how to run it
   - the decisions you made
   - what you would do with more time
   - how you used AI (what you asked for, what you accepted and what you corrected)

## Requirement checklist

- [ ] R1: Users list fetched from `GET /users`
- [ ] R1: Search/filter users by name
- [ ] R2: Selecting a user shows their posts (`GET /users/:id/posts` or `GET /posts?userId=:id`)
- [ ] R2: New-post form; `title` and `body` required, with visible validation errors
- [ ] R2: Submitting the form (`POST /posts`) adds the new post to the visible list
- [ ] R3: Loading state visible for users, posts and post creation
- [ ] R3: Error state visible for users, posts and post creation
- [ ] R4: At least 3 tests (Vitest or Jest + Testing Library)
- [ ] R5: README: run instructions, decisions, next steps, AI usage log

## Notes for the AI-usage section of the README

Keep a running log while working (what was asked, what was accepted, what was
corrected), since the README must report it honestly.

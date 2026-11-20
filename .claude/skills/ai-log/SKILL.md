---
name: ai-log
description: Append an entry to docs/ai-usage-log.md recording what was asked of the AI, what was accepted, and what was corrected. Use after every meaningful AI-assisted step in this project (setup, scaffolding, a feature, a test, a fix, a review), and whenever the user rejects or changes AI output.
---

# AI usage log

The assignment README must honestly report how AI was used: **what was asked,
what was accepted, what was corrected**. This skill keeps a running log so that
section is written from real notes, not memory.

## When to log

Only log work on the app itself (design, code, tests, README). Do **not** log
environment/tooling setup (git, GitHub, Claude Code config, skills): it is not
relevant to the reviewer.

- After finishing a meaningful step (scaffold, feature, test, refactor, README).
- Immediately when the user corrects, rejects or overrides AI output: these
  are the most valuable entries.
- When the AI's first attempt was wrong and had to be fixed (failing test,
  bug, wrong assumption).

## How to log

Append (never rewrite earlier entries) to `docs/ai-usage-log.md`:

```markdown
### <YYYY-MM-DD HH:MM> <short step name>
- **Asked:** <what the user asked the AI to do, in their terms>
- **Accepted:** <what AI output was kept as-is>
- **Corrected:** <what the user or a check changed, and why; "nothing" if none>
```

Rules:
- Be factual and specific. "Changed validation to trim whitespace because
  '   ' passed as a valid title" beats "fixed validation".
- Attribute corrections honestly: say whether the user caught it, a test
  caught it, or the AI caught its own mistake.
- Keep each entry to a few lines.
- Do not log secrets or personal data.

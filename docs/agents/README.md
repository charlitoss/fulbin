# The agent team — how to use it

Fulbin is developed with a small team of Claude Code agents. You write issues, they turn
them into PRs, **you merge**. Nothing reaches `main` or production without you.

## The flow

```
idea ──/triage──▶ needs-charly ──(you answer + agent-ready)──▶ /run-task ──▶ PR ──▶ you merge
bug / polish ───────────────────(agent-ready)────────────────▶ /run-task ──▶ PR ──▶ you merge
```

Inside `/run-task`, for one issue:

```
designer FRAME → planner → designer BRIEF → builder
   → designer REVIEW · convex-guard · e2e-tester   (in parallel)
   → first-timer (screenshots only)
   → builder fixes (max 2 rounds) → PR
```

Anything that needs a product decision stops the run, posts the questions on the issue and
labels it `needs-charly`.

## The team

| Agent | Role |
|---|---|
| `designer` | Is this the right problem? Simplest version? Brand, usability and voice. |
| `planner` | Acceptance criteria, files to touch (the claim), backend plan. |
| `builder` | Writes the code. Only one that touches `src/` and `convex/`. |
| `convex-guard` | Read-only review of permissions, schema and XSS. |
| `e2e-tester` | Playwright specs, desktop + iPhone. |
| `first-timer` | Sees only screenshots and a goal. If it gets stuck, the design isn't intuitive. |
| `docs-keeper` | README, SETUP and the specs index after merges. |

Definitions: `.claude/agents/`. Orchestration: `.claude/skills/run-task/` and
`.claude/skills/triage/`. Shared rules: `CLAUDE.md`. Shared context per task:
`docs/specs/<issue>-<slug>.md`.

## Labels

| Label | Meaning | Who sets it |
|---|---|---|
| `idea` | Raw idea, not framed yet | you (template) |
| `bug` | Something broken | you (template) |
| `polish` | Visual / copy / detail tweak | you (template) |
| `agent-ready` | **Go.** Agents may pick it up | you |
| `priority` | Pick before older issues | you |
| `in-progress` | An agent run owns it; its files are claimed | orchestrator |
| `needs-charly` | Waiting for your answer | orchestrator / triage |

## Feeding the backlog

**Write the problem, not the solution.** The designer is better at finding a simple
solution when it knows the situation. A good issue answers:

1. **What happens today** — the concrete moment. "Se baja alguien el jueves y tengo que
   rearmar los equipos a mano" beats "Agregar rebalanceo automático".
2. **Who** — organizer, jugador, suplente, hinchada.
3. **How often** — every match vs once in a while decides priority.
4. **Evidence** — a WhatsApp screenshot, something a friend said, what you saw on Saturday.
5. **Limits** — what must not change.

The `Idea`, `Bug` and `Polish` templates ask exactly this. Rough is fine: a two-line idea
with a screenshot is enough — triage will ask what's missing.

**Size:** one issue = one thing a user would notice. If you'd describe it with "and", it's
probably two issues. The planner will propose a split if it's too big.

**Rhythm that works:**
- Dump ideas whenever they come up (phone, GitHub app — 30 seconds each).
- Run `/triage` once or twice a week; read the framings; answer, adjust or close.
- Label 3–5 issues `agent-ready` at a time. A short, clear queue beats a long vague one.
- Bugs from real matches go straight to `agent-ready` with `priority`.

## Running it

**Once, on your machine:**
- `gh auth login` (agents use the GitHub CLI for issues and PRs).
- `.env.test` set up per `e2e/README.md`.
- Open Claude Code in the repo; the agents and skills load automatically.

**Then:**

| You say | What happens |
|---|---|
| `/triage` | Frames up to 5 `idea` issues and posts the verdicts |
| `/run-task` | Takes the next `agent-ready` issue to a PR |
| `/run-task 52` | Works on issue #52 |

**Running several tasks at once:** open separate Claude Code sessions, each in its own git
worktree. The orchestrator refuses to start a task whose files overlap with another
`in-progress` one. `src/styles/global.css` is shared by most UI work, so UI tasks will
mostly run one at a time until that file is split.

## Going more autonomous (later)

1. **Supervised** (start here): run `/run-task` and watch. Every time an agent does
   something wrong, fix the rule in `CLAUDE.md`, `BRAND.md`, `VOICE.md` or the agent file —
   not just the code. That's how the team gets better.
2. **Triggered:** install the Claude GitHub app (`/install-github-app` in Claude Code) and add
   a workflow that runs `/run-task` when an issue gets `agent-ready`.
3. **Scheduled:** a daily scheduled task that runs `/triage` and one `/run-task`, so you
   start the day with framings to answer and a PR to review.

## CI

`.github/workflows/ci.yml` runs on every PR:
- **build** — always.
- **e2e** (chromium-desktop + webkit-mobile-iphone) — once the repository secrets
  `TEST_CONVEX_URL` and `E2E_SECRET` are set (same values as your `.env.test`). Until then
  it's skipped with a notice.

The `co-ownership` project needs Convex CLI admin credentials and stays local. CI tests the
PR's frontend against the functions currently on the dev deployment, so PRs that change
`convex/` must be pushed there first (`npx convex dev --once` — the builder does this).

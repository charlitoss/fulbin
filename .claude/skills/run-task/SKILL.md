---
name: run-task
description: Orchestrate fulbin's agent team on one GitHub issue, from framing to an open PR. Use when Charly says "run-task", "take the next issue", "work on issue N", or a scheduled run asks for progress on the backlog.
---

# Run one task with the agent team

You are the orchestrator. You hand out work, move information between agents through the
spec, and decide when to stop. You don't design, plan, build or review yourself — the
specialists in `.claude/agents/` do. Subagents can't start other subagents, so this must
run in the main session.

**One issue → one spec → one branch → one PR.** Never run two tasks in one session.

If an issue number was given, use it. Otherwise pick the next one (step 1).

## 0. Preconditions

- `git status` is clean and `git fetch origin main` works. If not, stop and say why.
- `gh auth status` works. If not, stop: Charly needs to run `gh auth login`.
- Read `CLAUDE.md` and `docs/agents/README.md` once.

## 1. Pick the issue

```bash
gh issue list --state open --label agent-ready --json number,title,labels,createdAt
```

Skip any that also have `in-progress`. (`agent-ready` is Charly's go signal — it wins over a
leftover `needs-charly`.) Take one labeled `priority` first, otherwise the oldest. If none, report "Backlog vacío: no hay issues agent-ready" and stop.

Read the issue and all its comments: `gh issue view <N> --comments`. Classify it:

| Label | Branch type | FRAME | BRIEF |
|---|---|---|---|
| `bug` | `fix` | skip | only if the fix changes UI |
| `polish` | `polish` | skip | yes |
| anything else | `feat` | yes | yes, if user-facing |

## 2. Claim and set up

```bash
gh issue edit <N> --add-label in-progress --remove-label agent-ready --remove-label needs-charly
git switch -c <type>/<N>-<slug> origin/main      # slug: 2–4 words, kebab-case
```

If Charly runs several sessions in parallel, use a worktree instead:
`git worktree add ../fulbin-<N> -b <type>/<N>-<slug> origin/main`, then `npm ci` there.

Create `docs/specs/<N>-<slug>.md` from `docs/specs/_template.md`. Fill the header and
"## Request" (issue body + Charly's answers from comments, verbatim).

## 3. FRAME — designer

Invoke `designer`: "FRAME mode for docs/specs/<N>-<slug>.md."

If the verdict isn't BUILD, or "Open questions for Charly" has items → go to **Stop for
Charly**.

## 4. PLAN — planner

Invoke `planner`: "Plan docs/specs/<N>-<slug>.md."

If it proposed a split or left open questions → **Stop for Charly**.

**Overlap check.** List the other claimed tasks and their files:

```bash
gh issue list --state open --label in-progress --json number
gh issue view <M> --comments     # look for the comment starting with "<!-- claim -->"
```

If any file in this spec's "Files to touch" is claimed by another in-progress issue, comment
on this issue "Bloqueado por #M (comparten <files>)", relabel it `agent-ready` (remove
`in-progress`), delete the branch, and stop. Otherwise post this task's claim:

```bash
gh issue comment <N> --body "<!-- claim -->
Archivos reservados por la rama \`<branch>\`:
- path/one
- path/two"
```

## 5. BRIEF — designer

If the task is user-facing, invoke `designer`: "BRIEF mode for docs/specs/<N>-<slug>.md."
Open questions → **Stop for Charly**.

Commit the spec: `docs(specs): spec for #<N>`.

## 6. BUILD — builder

Invoke `builder`: "Implement docs/specs/<N>-<slug>.md."

## 7. REVIEW — in parallel

Launch together, in one message:

- `designer`: "REVIEW mode for docs/specs/<N>-<slug>.md." (if user-facing)
- `convex-guard`: "Review the branch for docs/specs/<N>-<slug>.md." (if `convex/` changed or
  user content is rendered somewhere new)
- `e2e-tester`: "Write and run the tests for docs/specs/<N>-<slug>.md."

Then, if the designer saved screenshots, invoke `first-timer` with the goal from the
Problem section ("What they're trying to do"), phrased as a user would say it, and the
screenshot paths in order. Give it nothing else.

Paste the convex-guard and first-timer reports into their spec sections. If first-timer
didn't reach the goal or hesitated on the main path, treat that as a BLOCKER for the
designer: ask `designer` "Read the first-timer review in the spec and add fixes to
Review: design."

## 8. FIX — at most two rounds

If there are BLOCKERs, SHOULD-FIXes, or failing tests caused by app bugs:

1. Invoke `builder`: "Fix the findings in the review sections and Tests of
   docs/specs/<N>-<slug>.md."
2. Re-run only the reviewers whose areas changed.

After two rounds with BLOCKERs still open → open the PR as a **draft**, add the remaining
BLOCKERs to "Open questions for Charly", and label the issue `needs-charly`.

## 9. Ship

1. `npm run build` passes.
2. Compare `git diff --name-only origin/main...HEAD` with "Files to touch". List any extra
   file in the PR body under "Fuera del alcance previsto".
3. Set the spec's Status to `pr-open`, commit, then:

```bash
git push -u origin <branch>
gh pr create --title "<type>(<scope>): <título>" --body "<body>"   # add --draft if anything is unresolved
```

PR body (Spanish, short):

```
Closes #<N>

**Qué cambia:** 2–3 líneas, desde el punto de vista del usuario.
**Spec:** docs/specs/<N>-<slug>.md
**Revisiones:** diseño ✅/⚠️ · primer uso ✅/⚠️ · convex ✅/⚠️/n.a. · e2e ✅/⚠️ (n tests)
**Para revisar:** lo que Charly debería mirar con atención.
**Fuera del alcance previsto:** archivos extra, o "nada".
```

Leave the issue labeled `in-progress` — its files stay claimed until the PR merges and
the issue closes.

## Stop for Charly

1. Commit the spec on the branch and push it, so the work isn't lost.
2. Comment on the issue with the open questions (and the Problem section + verdict if the
   stop came from FRAME). Phrase each question so Charly can answer in one line.
3. `gh issue edit <N> --add-label needs-charly --remove-label in-progress`.
4. Report the questions and stop.

When Charly answers and relabels `agent-ready`, a later run picks it up: reuse the pushed
branch and spec, add the answers to "## Request", clear the answered questions, and resume
from the step that stopped.

## Final report

Five lines max: issue, outcome (PR link / stopped for Charly / blocked), what changed,
anything Charly must look at.

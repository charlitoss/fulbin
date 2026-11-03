# <issue> – <Título corto>

Issue: #<issue> · Branch: `<type>/<issue>-<slug>` · Status: framing
<!-- Status: framing → planned → briefed → building → reviewing → pr-open → merged / dropped -->

Every agent reads this whole file before starting and writes **only its own sections**.
Leave other sections untouched, even if you disagree — write it under "Open questions".

---

## Request
<!-- owner: orchestrator. The issue text, copied verbatim, plus any answers Charly gave in comments. -->

## Problem
<!-- owner: designer (FRAME) -->

- **Who:** organizer / jugador / suplente / hinchada / visitor of a public page
- **Moment:** where they are and what just happened (e.g. "opened the match link from WhatsApp, not logged in")
- **What they're trying to do:**
- **What they do today:** (in fulbin, or outside it — WhatsApp, a spreadsheet, memory)
- **Smallest change that solves it:**
- **What we could remove or simplify instead of adding:**

**Verdict:** BUILD / RESHAPE / DON'T BUILD — <one line why>

## Acceptance criteria
<!-- owner: planner -->

- [ ] …

## Files to touch
<!-- owner: planner. This is the claim: the builder stays inside it, the orchestrator uses it to avoid overlapping tasks. -->

- `src/…`

## Backend & permissions
<!-- owner: planner. "None" if the task doesn't touch convex/. -->

- Schema changes:
- New / changed queries & mutations, and which rule in `convex/permissions.ts` applies:
- Migration needed:

## Design
<!-- owner: designer (BRIEF) -->

- **Flow:** step by step, with tap count from the entry point.
- **Reuse:** components from `src/components/ui/`, existing CSS sections, tokens, icons.
- **States:** empty · loading · error · success · no permission · not logged in.
- **Layout:** iPhone 13 first, then ≥ 721px.
- **Copy:** every new or changed string, final wording, per `docs/design/VOICE.md`.
- **New concepts / helper text:** none — or the reason one is unavoidable.

## Build log
<!-- owner: builder. What was done, commit by commit, and any deviation from the spec and why. -->

## Review: design
<!-- owner: designer (REVIEW). BLOCKER / SHOULD-FIX / OK, with file:line. -->

## Review: first-timer
<!-- written by the orchestrator from first-timer's report -->

## Review: convex
<!-- written by the orchestrator from convex-guard's report. "Not applicable" if convex/ untouched. -->

## Tests
<!-- owner: e2e-tester. Specs added/changed, projects run, results. -->

## Open questions for Charly
<!-- anyone may add. While this has unanswered items, the orchestrator stops and labels the issue needs-charly. -->

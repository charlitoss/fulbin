---
name: triage
description: Turn raw fulbin ideas into framed proposals Charly can approve in one read. Runs the designer in FRAME mode on issues labeled "idea" and posts the verdict as an issue comment. Use when Charly says "triage", "frame the ideas", or a scheduled run grooms the backlog.
---

# Triage the idea backlog

Goal: every idea gets a short, honest framing — is this the right problem, what's the
simplest version, should we build it — so Charly only has to say yes, adjust, or no.
Nothing is built here and nothing is committed.

## 1. Find untriaged ideas

```bash
gh issue list --state open --label idea --json number,title
```

Skip issues that already have a comment starting with `<!-- triage -->` and no newer
comment from Charly. Take at most 5 per run, oldest first. If an issue number was given,
triage just that one.

## 2. Frame each one

For each issue, read it with `gh issue view <N> --comments`, then invoke `designer`:

> FRAME mode, triage only — don't write any file. Issue #<N>: <title>
> <issue body and comments, verbatim>
> Return only the Problem section (Who, Moment, Trying to do, Today, Smallest change,
> What we could remove), the Verdict line, and up to 3 questions for Charly, each
> answerable in one line. If it's really several ideas, say how you'd split it.

You can run up to 3 designers in parallel for different issues.

## 3. Post and label

```bash
gh issue comment <N> --body "<!-- triage -->
<designer's framing>

---
Para avanzar: respondé las preguntas (si hay) y poné la etiqueta \`agent-ready\`. Si no va, cerralo."
gh issue edit <N> --add-label needs-charly
```

Keep the `idea` label — `run-task` treats any `agent-ready` issue without `bug`/`polish` as a
feature and will frame it again with Charly's answers included.

## 4. Report

One line per issue: `#N título — VERDICT — n preguntas`.

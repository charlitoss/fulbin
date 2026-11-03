# CLAUDE.md

Guardrails for anyone working on Fulbin — Charly, Claude, or one of the agents in
`.claude/agents/`. Read this whole file before changing anything.

Fulbin organizes pickup football ("fulbito") with friends: create a match, share the link
on WhatsApp, people sign up as jugador / suplente / hinchada, build balanced teams, score
the game, and keep group standings across tournaments.

> **README.md is partly outdated.** Its "Tecnologías" and "Estructura" sections predate
> Convex and WorkOS (it still says LocalStorage). Trust the code and this file over it.

## Stack

- **Frontend:** React 18 + Vite 4, plain JSX (no TypeScript in `src/`), hash-based routing in
  `src/App.jsx`, icons from `public/icons/` and `lucide-react`.
- **Styles:** one stylesheet, `src/styles/global.css`, with design tokens in `:root`.
- **Backend:** Convex (`convex/*.ts`). Schema in `convex/schema.ts`, authorization helpers in
  `convex/permissions.ts`, backfills in `convex/migrations.ts`.
- **Auth:** WorkOS AuthKit (`src/main.jsx`, `src/auth/`). Playing never requires an account;
  organizing groups does.
- **Tests:** Playwright e2e in `e2e/` — read `e2e/README.md` before writing tests.
- **Hosting:** Vercel (SPA rewrite in `vercel.json`). Production is fulbin.com.ar.

## Commands

```bash
npm run dev                 # dev server on http://localhost:3000
npm run build               # production build — must pass before any PR
npm run test:e2e            # chromium-desktop + webkit-mobile-iphone + co-ownership
npm run test:e2e:mobile     # iPhone 13 only
npx playwright test e2e/<file>.spec.ts --project=chromium-desktop
npx convex dev --once       # push convex/ changes to the DEV deployment + regen types
```

E2E needs a local `.env.test` (see `.env.test.example`). It runs against the shared **dev**
Convex deployment and only touches rows named `e2e-*`.

## Hard rules

1. **Never deploy.** No `npx convex deploy`, no Vercel deploys, no touching production data.
   `npx convex dev --once` (dev deployment) is fine.
2. **Never push to `main` and never force-push.** All work lands through a PR that Charly merges.
3. **No secrets in the repo.** `.env.test` and `.env.local` stay local.
4. **Security — never render untrusted text as HTML** (see the section below). This is not
   negotiable.
5. **Schema changes are additive.** New fields are `v.optional(...)` or backfilled in
   `convex/migrations.ts`. Never remove or rename a field that production data uses without a
   migration plan in the spec.
6. **Every authorization decision goes through `convex/permissions.ts`.** Read the comment at
   its top; it is the source of truth for who may do what.

## Design, usability and voice

Fulbin has a strong, specific look and a specific way of talking. Both are documented:

- **`docs/design/BRAND.md`** — look and feel: tokens, type, components, icons, layout.
- **`docs/design/VOICE.md`** — how we write: voseo, tone, length, glossary.

Short version: dark surfaces, the GeistPixel-Grid pixel font, square corners everywhere
(every radius token is 0), neon mint `--color-primary` as the one accent, hard pixel drop
shadows, dotted textures. Copy is short rioplatense Spanish with voseo.

**If a feature needs explaining, it isn't intuitive yet.** Redesign before you add helper
text, tooltips or tutorials.

## Conventions

- **Branches:** `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `polish/<issue>-<slug>`,
  `refactor/<issue>-<slug>`.
- **Commits:** `type(scope): message`, lowercase, imperative-ish. Types in use: `feat`, `fix`,
  `polish`, `refactor`, `design`, `test`, `assets`, `docs`, `chore`. Scope is the area: `groups`, `match`,
  `share`, `standings`, `agents`…
- **CSS:** use tokens from `:root`, never raw hex values or non-zero radii in new rules. Add new
  rules next to the section they belong to in `global.css`, under a `/* Section */` comment.
- **Components:** reuse what's in `src/components/ui/` before making a new one.
- **User-facing strings are Spanish.** Code, comments and identifiers can be English or
  Spanish — follow the file you're in (Convex fields are Spanish: `nombre`, `creadoPor`…).

## Definition of done

A change is done when all of these hold:

- [ ] `npm run build` passes.
- [ ] The e2e spec covering the feature exists and passes on `chromium-desktop` **and**
      `webkit-mobile-iphone` (plus `co-ownership` if groups or permissions changed).
- [ ] It looks right at iPhone 13 width — that's how most people open a match link.
- [ ] Copy follows `VOICE.md`; visuals follow `BRAND.md`.
- [ ] No new helper text or tooltip without a written reason in the spec.
- [ ] Refactors only: before/after screenshots show no visible change (or only the intended one).
- [ ] The spec in `docs/specs/` is up to date, including the build log.

## The agent team

Work is organized as **one GitHub issue → one spec → one branch → one PR**. The orchestrator
(the main session, via `/run-task`) hands out work; specialists never pick their own.
How it works for humans: `docs/agents/README.md`.

| Agent | Does | May write to |
|---|---|---|
| `designer` | frames the problem, writes the design + copy brief, reviews usability, brand and voice, compares before/after on refactors | `docs/design/`, its sections of the spec, `docs/specs/<issue>/compare/`, `e2e/_scratch/` |
| `planner` | turns a framed issue into acceptance criteria, files to touch, backend plan | its sections of the spec |
| `builder` | implements the spec | `src/`, `convex/`, `public/`, `index.html`, Build log |
| `convex-guard` | reviews backend changes for permission and schema safety | nothing (read-only) |
| `e2e-tester` | writes and runs Playwright specs | `e2e/` (except `_scratch/`) |
| `first-timer` | looks at screenshots cold and tries to complete a goal | nothing (read-only) |
| `docs-keeper` | keeps README / SETUP / specs index current after merge | `README.md`, `SETUP.md`, `docs/specs/README.md` |

**Ownership is strict.** If you find a problem in an area you don't own, write it as a finding
in the spec — the owner fixes it. The shared context for a task is its spec,
`docs/specs/<issue>-<slug>.md`; read all of it before you start, write only your sections.

## Security

**Never render untrusted text as HTML.** Any user-controlled value — player names, match
names, locations, anything a user types or that comes back from the database — must be
rendered through normal JSX (`{value}`), which React escapes automatically. Do **not**:

- use `dangerouslySetInnerHTML` with user/DB content,
- assign to `innerHTML` or call `document.write`,
- put user-controlled values into an `href`/`src` as a `javascript:` URL,
- add a dependency that injects raw HTML into the page.

If you ever genuinely need to render HTML you didn't author, sanitize it first (e.g. with
[DOMPurify](https://github.com/cure53/DOMPurify)) before it reaches the DOM.

**Why this is load-bearing:** the WorkOS refresh token is stored in `localStorage`
(`devMode={true}` in [src/main.jsx](src/main.jsx)) rather than an HttpOnly cookie — a
deliberate tradeoff to avoid WorkOS's paid custom-domain add-on. `localStorage` is readable
by JavaScript, so an XSS bug would let an attacker steal the session token. No XSS means the
token is safe, so keeping the app XSS-free is the mitigation this choice depends on. The full
rationale lives in the comment above `devMode` in `src/main.jsx`.

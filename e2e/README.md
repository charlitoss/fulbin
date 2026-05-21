# E2E Tests (Playwright)

End-to-end tests for fulbin. They drive the real app against a real Convex
backend, so they exercise the full stack: React UI → Convex queries/mutations →
schema.

## Quick start

```bash
# One-time: point the suite at a Convex deployment
cp .env.test.example .env.test
# then edit .env.test — see "Configuration" below

# Run everything (both browser projects, ~35s)
npm run test:e2e
```

## Commands

```bash
npm run test:e2e          # full suite, chromium-desktop + webkit-mobile
npm run test:e2e:mobile   # webkit-mobile-iphone only
npm run test:e2e:ui       # Playwright UI mode — best for writing/debugging
npm run test:e2e:debug    # PWDEBUG=1, step-through inspector

npx playwright test smoke.spec.ts             # one file
npx playwright test -g "short code"           # by test-name substring
npx playwright test --project=chromium-desktop
npx playwright show-report                    # open the last HTML report
```

> If you change anything under `convex/`, run `npx convex dev --once` first so
> the new schema/functions are deployed and types regenerated. Changes under
> `src/` need no such step — Playwright's web server picks them up live.

## Configuration

`.env.test` (gitignored — each developer makes their own from
`.env.test.example`):

```
TEST_CONVEX_URL=https://<deployment>.convex.cloud
ALLOW_TEST_MUTATIONS=1
E2E_SECRET=<must match the deployment's E2E_SECRET env var>
```

- `TEST_CONVEX_URL` — the Convex deployment the tests hit. Playwright forces the
  Vite dev server to use this URL regardless of your `.env.local`.
- `ALLOW_TEST_MUTATIONS=1` — explicit opt-in required when the URL does **not**
  contain "test". We currently run against the shared dev deployment because the
  Vercel-managed Convex team can't create a dedicated test project via CLI. If
  you ever provision a real `*-test` deployment, swap the URL and drop this line.
- `E2E_SECRET` — shared secret guarding the test-only Convex mutations. Must
  match the value set on the deployment with
  `npx convex env set E2E_SECRET <value>`. Generate one with
  `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.

## How it works

1. **`playwright.config.ts`** loads `.env.test`, then spawns
   `npm run dev` with `VITE_CONVEX_URL` set from `TEST_CONVEX_URL`. Two browser
   projects: `chromium-desktop` (1280×800) and `webkit-mobile-iphone` (iPhone 13).
2. **`e2e/global-setup.ts`** runs once before all tests. It refuses to run
   unless the URL contains "test" or `ALLOW_TEST_MUTATIONS=1` is set, then wipes
   any leftover `e2e-*` rows from aborted prior runs.
3. **`e2e/helpers/test.ts`** is the base `test` fixture. Specs import from here
   (not `@playwright/test`) to get two automatic behaviors:
   - CRT overlay disabled before page load (prevents flake from animated noise).
   - Per-test cleanup of any match created via `setupMatch` (runs in `afterEach`,
     pass or fail).
4. **`e2e/helpers/match.ts`** — `setupMatch()` and `setupMatchInGame()` create a
   match + seed players/registrations via direct Convex calls so a spec can jump
   straight to the state under test instead of clicking through every prior step.
5. **`e2e/helpers/convex.ts`** — thin `ConvexHttpClient` wrapper for setup/teardown.
6. **`e2e/helpers/selectors.ts`** — shared locators, label/role-based where
   possible so they survive markup changes.

### Safety model (why running against the dev DB is OK)

Convex mutations are public by default — callable by anyone who knows the
deployment URL (which ships in the client bundle). So defense in depth:

1. **Secret gate** — every function in `convex/testing.ts` requires a `secret`
   arg checked against the deployment's `E2E_SECRET` env var. Calls without it
   are rejected. This is the primary control, since `wipeMatchCascade` can
   delete any match by ID.
2. **Prefix scoping** — the bulk sweep (`wipeAllTestData`) only touches rows
   whose `nombre` starts with `e2e-`, and the suite only ever names test data
   that way.
3. **Opt-in** — `global-setup` won't run without `ALLOW_TEST_MUTATIONS=1` (or a
   URL containing "test").
4. **Per-test teardown** deletes only the specific match each test created.

Worst case: a crashed run leaves an `e2e-*` row behind; the next run's
`global-setup` sweeps it.

The test-only Convex functions live in **`convex/testing.ts`**
(`wipeAllTestData`, `wipeMatchCascade`, `seedPlayers`, `seedRegistrations`,
`backdateMatchKickoff`) — all secret-gated.

## Specs

| File | Covers |
|---|---|
| `smoke.spec.ts` | splash loads, `/nuevo` renders, create-flow lands on inscription |
| `create-match.spec.ts` | form validation, mutually-exclusive player-count buttons, back link |
| `short-code.spec.ts` | 6-char code, `/p/CODE` redirect, lowercase normalization, 404 |
| `full-lifecycle.spec.ts` | create → register → build teams → start → score → finish; refresh preserves state |
| `inscription.spec.ts` | quota gating; suplentes/hinchada don't count toward the jugador quota |
| `team-builder.spec.ts` | balance indicator renders; LIFO smoke |
| `mobile.spec.ts` | iOS date-input alignment (`dfa3a88`); in-game 820px cap (`38c47de`) |

## Maintaining tests when the app changes

- **New screen/feature** → add `e2e/<feature>.spec.ts`. Import
  `{ test, expect } from "./helpers/test"`, reuse `setupMatch()` to reach state
  fast, and add new locators to `helpers/selectors.ts`.
- **Changed an existing screen** → the relevant spec goes red. If the change was
  intended, update assertions; if not, you caught a regression. `test:e2e:ui`
  shows exactly where it broke.
- **Changed Convex schema/mutations** → check `convex/testing.ts` still matches
  (field names, `pasoActual` values), then `npx convex dev --once`.
- **Renamed CSS classes / restructured markup** → update `helpers/selectors.ts`
  in one place. Prefer role/label locators over class selectors for new code.

Run `npm run test:e2e` before each commit (or wire it into CI). Keeping the
suite green per-change is cheap; letting it drift is not.

## Notes

- One test (`mobile.spec.ts` "in-game cap at 820px") self-skips on
  webkit-mobile because that viewport is already <820px — the rule is only
  meaningful at desktop widths. Expect "1 skipped" on the mobile project.
- No Vitest yet. `src/utils/teamBalancer.js` (snake-draft balancing) is the
  prime candidate for unit tests as a follow-up.

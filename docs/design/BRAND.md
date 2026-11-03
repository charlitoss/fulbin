# Fulbin — Brand & look and feel

> **Status: DRAFT for Charly to confirm.** Written by reading the current code
> (`src/styles/global.css`, `public/`, components). Rules marked **(proposed)** are not yet
> enforced anywhere — confirm, change or delete them. Once confirmed, the `designer` agent
> treats this file as law and only proposes changes, never makes them.

## The idea in one line

A retro, pixel-screen scoreboard for the fulbito with friends: dark, square, neon, playful —
like an old stadium LED board seen through a CRT.

## Principles

1. **Square, always.** Every radius token is `0`, including `--radius-pill` and
   `--radius-circle`. No rounded corners anywhere — not on buttons, cards, avatars or modals.
2. **One accent.** Neon mint `--color-primary` (`#1EFFB4`) is *the* color. It marks the
   primary action, the active state and the "alive" things (countdown, leader row). If
   everything is mint, nothing is.
3. **Dark and textured, not flat.** Surfaces are near-black with a 3px dot grid. Depth comes
   from hard pixel shadows and insets, not blur.
4. **Pixel type everywhere.** GeistPixel-Grid for display and body.
5. **Football first.** Pitch, jerseys, chori, hinchada — the visual vocabulary comes from a
   Saturday game with friends, not from SaaS dashboards.

## Color

Use tokens only. Never write a hex value in a new rule.

| Role | Token | Value |
|---|---|---|
| Accent / primary action | `--color-primary` | `#1EFFB4` |
| Accent hover / pressed | `--color-primary-dark`, `--acid-yellow-dim` | `#10E8A0`, mint at 15% |
| Page background | `--surface-0` | `#0D0D0D` |
| Card | `--surface-1` | `#161616` |
| Elevated card | `--surface-2` | `#1E1E1E` |
| Hover / active | `--surface-3` | `#252525` |
| Input / well | `--surface-4` | `#2E2E2E` |
| Dividers | `--surface-5` | `#383838` |
| Text | `--text-primary` / `--text-secondary` / `--text-muted` | white / 60% / 35% |
| Text on mint | `--text-inverse` | `#0D0D0D` |
| Success · warning · error · info | `--semantic-*` | `#00C853` · `#FFB300` · `#FF3D57` · `#40C4FF` |
| Physical state (estado físico) | `--state-excellent` / `--state-normal` / `--state-tired` | green / amber / red |
| Teams | `--team-white` / `--team-dark` | `#f1f5f9` / `#1e293b` |

**Known debt** (cleanup candidates, see "Open questions"):
- `--acid-yellow*` tokens are actually mint (legacy name). Prefer `--color-primary*`.
- `--text-muted` and `--text-tertiary` are identical.
- `.card` and `.btn` use a raw `#060606` base and `#000` inset — should become a token.
- ~150 hex values live outside `:root` in `global.css`.

## Typography

- **Family:** `--font-display` and `--font-body` are both GeistPixel-Grid (self-hosted,
  `public/fonts/geist-pixel/`). `Press Start 2P` is used only for scoreboard-style numbers
  (`.field-player-name`, `.balance-team-value`) — don't spread it further **(proposed)**.
- **Scale:** `--type-3xs` (8px) → `--type-hero` (64px). Body is `--type-base` (15px).
  Don't use sizes outside the scale.
- **Leading / tracking:** `--leading-*`, `--tracking-*` tokens.
- **Case:** sentence case for labels and headings ("Tabla de posiciones", not
  "Tabla De Posiciones") **(proposed)** — see VOICE.md.

## Space, size, layers, motion

- **Spacing:** use `--space-1` … `--space-20` (4px grid). `--spacing-*` is an older
  duplicate scale — don't use it in new code **(proposed)**.
- **Icons:** `--icon-xs` (14) … `--icon-xl` (28).
- **Z-index:** `--z-base` → `--z-toast`. Never a raw z-index.
- **Motion:** `--duration-fast` (120ms) / `--duration-normal` (220ms) / `--duration-slow`
  (350ms) with `--ease-out-expo`, `--ease-out-back`, `--ease-in-out`. Celebrate moments that
  deserve it (¡Gol!, champion) — everything else is quick and quiet. Respect
  `prefers-reduced-motion`.

## Surfaces and components

- **Card (`.card`):** near-black with a 3px dot grid, 4px black inset, no border, no radius.
  Hover lifts to `--surface-1`.
- **Buttons (`.btn` + size + variant):** dark fill, colored 1px border, **hard pixel drop
  shadow** (`0 5px 0 0 <color>`), bottom padding larger than top to balance the shadow.
  - `.btn-primary` — mint border, text and shadow; hover shows a mint dot grid. One per
    screen.
  - `.btn-secondary` — grey border, white text.
  - `.btn-ghost` — no border or shadow; for low-emphasis actions.
  - Sizes: `.btn-sm` 34px · `.btn` 42px · `.btn-lg` 52px · `.btn-xl` 60px. Touch targets on
    mobile ≥ 42px **(proposed)**.
  - Focus: 2px mint outline, 2px offset.
- **Headings (`.form-heading`, page headings):** solid black chip behind the text.
- **Count chips (`.count-chip`):** numbered steps and counters.
- **Tags (`.tag`, `.tag--green`…):** status labels ("Activo", "Finalizado").
- **Empty state (`.empty-state`):** dashed outline, centered. Keep the copy to one line plus
  one action.
- **Reusable components** in `src/components/ui/`: `Modal`, `Menu`, `Tag`, `ProgressBar`,
  `Countdown`, `TimePicker`, `ShareButton`, `StandingsTable`, `StandingsShareMenu`,
  `AuthControls`, `Footer`, `CrtEffect`. Reuse before creating.

## Icons and imagery

- **Custom pixel icons first** — `public/icons/`: calendario, horario, timer, compartir,
  chori, hinchada, teamflag (light/dark), moveplayer, promoteplayer, removeplayer, plus,
  minus, arrow-right, selected-check, and the physical-state set
  (`State=Good|Fire|Down`). **(proposed)** New icons follow the same pixel style; use
  `lucide-react` only for generic UI glyphs with no custom equivalent.
- **Logo:** `public/LOGO.svg` (full), `public/Symbol LOGO.svg` (compact, mobile breakpoints).
- **Pitch:** the field in the team builder and `background-soccer.webp` are the main
  illustrations.
- **CRT overlay:** a global scanline/flicker effect (`CrtEffect`, toggle in the UI). New
  screens must look right with it on and off.

## Layout

- **Mobile first.** Design for iPhone 13 (390×844). Most people arrive from a WhatsApp link.
- **Breakpoints in use:** 480px (main one), 560px, 640px, 721px+, 900px.
- **Content width:** team builder and in-game views cap at 744px, centered.
- One primary action per screen, reachable with the thumb.

## Do / don't

| Do | Don't |
|---|---|
| `var(--color-primary)` | `#1EFFB4` in a new rule |
| `border-radius: 0` (or nothing) | any rounded corner |
| hard pixel `box-shadow` | blurred drop shadows on buttons |
| GeistPixel-Grid | a new font |
| custom pixel icon | a random emoji as an icon in UI chrome |
| a class in `global.css` | `style={{ … }}` for static styling |

## Reference screenshots

`docs/design/reference/` — key screens at iPhone 13 and 1280×800, the baseline the designer
compares against. **To do:** the designer captures these on its first run (splash, create
match, inscription, team builder, in-game, finalized recap, standings, groups, public group
page, join group).

## Open questions for Charly

1. Confirm the **(proposed)** rules above.
2. Clean up the legacy tokens (`--acid-yellow*`, `--spacing-*`, `--text-tertiary`) and
   tokenize `#060606` / `#000` — as one refactor task?
3. Split `global.css` (7k+ lines) into one file per feature, so parallel tasks don't collide?

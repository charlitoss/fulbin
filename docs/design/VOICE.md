# Fulbin — Voice & copy

> **Status: confirmed by Charly, 2026-11-03.** Built from the copy already in the app. The
> `designer` owns every user-facing string — buttons, labels, empty states, errors, the
> splash and the WhatsApp share messages — and checks them against this file.

## Who we're talking to

Friends who play fulbito. They open fulbin from a WhatsApp link, on their phone, often
standing somewhere, wanting to sign up or check who's playing in a few seconds. The
organizer uses it a bit more, but is still doing it on the side of their life.

## How we sound

**Like the friend who organizes the partido, writing in the group chat.** Rioplatense,
warm, quick, a bit of humor where the moment allows (GOL!, campeón, tercer tiempo).
Never corporate, never cute for its own sake, never explaining what's obvious.

## Rules

1. **Voseo, always.** Organizá, anotate, armá, invitá, probá, jugás, podés. Never tú
   (organiza, anota, puedes) and never usted.
2. **Accents always, opening marks never.** Tildes are not optional: Jugás, podés, querés,
   campeón, está — never "Jugas", "podes". But no `¿` and no `¡`: Jugás? and Gol! — not
   "¿Jugás?", not "¡Gol!". Nobody opens a mark in the group chat; in our register it reads
   formal. *Note (designer):* a long question can stay ambiguous until its `?` — the fix is a
   shorter question, not the mark.
3. **Buttons are verbs.** "Crear partido", "Anotarme", "Compartir", "Empezar partido".
   Not "OK", "Aceptar", "Continuar" when a specific verb exists.
4. **Short.** Buttons 1–3 words. Labels ≤ 4 words. Empty states: one line + one action.
   Errors: one line.
5. **If it needs explaining, it isn't intuitive.** Don't describe how the UI works ("apretá
   el botón X para…"). If a sentence explains the interface, the interface needs fixing.
   Explain *consequences* only when they aren't visible: "El link anterior deja de andar."
6. **Empty states invite, don't instruct.** "Todavía no tenés partidos." + `[Crear partido]`
   — not "Creá tu primer partido apretando el botón crear partido."
7. **Errors say what to do next.** "No se pudo guardar. Probá de nuevo." Never codes, never
   blame ("Ingresaste mal…"), never English.
8. **Sentence case.** "Balance de equipos", "Tabla de posiciones". Capitals only for proper
   names. ALL CAPS only for celebration moments (GOL).
9. **Spanish only in the UI.** Including `aria-label` and `title`. Brand names keep their
   spelling: WhatsApp, GitHub.
10. **Emojis:** fine in WhatsApp share messages (⚽ 📅 🏆) and celebration moments; not as
    decoration in UI chrome. Custom icons do that job.

## The value proposition

One line, concrete, no adjectives: **"Organizá el fulbito con amigos."**

When we explain what fulbin does, we list what you *do*, in order, with verbs — like the
splash does: creá el partido → invitá a tus amigos → armá los equipos → anotá los goles.
No "la mejor app para…", no "fácil y rápido" — show it, don't claim it.

## Where fulbin introduces itself

These strings matter most; they're the first contact for most players:

- **Splash** (`src/components/landing/SplashPage.jsx`) — headline, steps, CTA.
- **WhatsApp share messages** (`src/utils/share.js`, `src/utils/standingsShare.js`) — what
  someone sees in the group chat before they ever open fulbin. Lead with the useful info
  (when, where, how many spots left), link last.
- **Invite page** (`JoinGroupPage.jsx`) and **public group page** (`PublicGroupPage.jsx`).
- **Social card** (`public/social-share.jpg` + `<meta>` tags in `index.html`).

## Glossary

Use these words, always the same way:

| Use | Meaning | Avoid |
|---|---|---|
| partido | one game | evento, juego |
| fulbito | the casual game, in tone-setting copy | fútbol 5 (except as format) |
| jugador | signed up to play | participante, usuario |
| suplente | waiting list, moves up if someone drops | reserva, en espera |
| hinchada | comes to watch | espectador, público |
| anotarse | sign up to a match | inscribirse, inscripción, registrarse |
| armar los equipos | split players into teams | generar, asignar equipos |
| Blanco / Oscuro | the two teams | Equipo A / B, local / visitante |
| arquero, defensor, mediocampista, delantero | roles | GK, DEF… |
| estado físico: Excelente · Normal · Cansado | how they feel today | — |
| tercer tiempo | the after-game hangout | after |
| grupo | the people who play together regularly | equipo, comunidad |
| torneo | a season of matches with a standings table | liga, temporada (in UI) |
| tabla (de posiciones) | standings | ranking, leaderboard |
| organizador / co-organizador | who manages the match / group | admin, owner (in UI) |

## Known inconsistencies to fix

Found in the current code — good first `polish` tasks:

| Where | Now | Should be |
|---|---|---|
| `MyMatchesPage.jsx:74` | Crea tu primer partido apretando el botón crear partido. | Todavía no tenés partidos. + button |
| `StandingsPage.jsx:129` | Cuando termine un partido, los jugadores ganadores sumarán 3 puntos. | Shorter, or show it in the table header |
| `CrtControlPanel.jsx:18, 24–25` | CRT Shader · Reset to defaults | Spanish — the panel is user-facing |
| `JoinMatchModal.jsx:496` | The Cansado · Normal · Excelente selector has no label at all | `Estado físico` (the glossary word). Without it nobody knows what they're choosing — a first-timer read it as a public rating |
| `JoinMatchModal.jsx:572` | Agregar “Juan, Pedro” — singular quote around two names | Plural when there's more than one name: `Agregar 2 jugadores` (or quote each name) |
| `ProgressBar.jsx:7` | Somos 9 /10 — space on the wrong side of the slash | `Somos 9/10` |

Fixed in #44 (voseo, accents, sentence case): SplashPage, InscriptionStep, JoinMatchModal ×2,
AssignPlayerModal, SoccerField, BalanceIndicator, Footer. The opening marks #44 had added were
taken out again in the same PR, together with the ones already in `src/` (see Decisions).

`InGameHeader.jsx:131` (`GOL!!!`) used to be listed here as missing its `¡`. It isn't a defect
any more: ALL CAPS and stacked `!` are exactly the celebration register of rule 8.

## Decisions

- **2026-11-03** — Voseo everywhere, including the splash.
- **2026-11-03** — The UI says "anotarse", never "inscribirse".
- **2026-11-03** — The CRT control panel is user-facing: its copy follows these rules.
- **2026-11-03** — **No opening marks (`¿`, `¡`) anywhere in the UI.** Charly's call, overruling
  the first version of rule 2: they feel too formal for how fulbin talks — a friend in the group
  chat writes "Jugás?" and "Gol!". Applied to the whole app, not just the two strings #44 had
  added. Accents and voseo are unaffected and still required. Designer's note on the record: a
  long question reads ambiguously until its `?`, so questions stay short.

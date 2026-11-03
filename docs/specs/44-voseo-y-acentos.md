# 44 – Unificar voseo, acentos y textos en inglés

Issue: #44 · Branch: `polish/44-voseo-y-acentos` · Status: briefed
<!-- Status: framing → planned → briefed → building → reviewing → pr-open → merged / dropped -->

Every agent reads this whole file before starting and writes **only its own sections**.
Leave other sections untouched, even if you disagree — write it under "Open questions".

---

## Request
<!-- owner: orchestrator. The issue text, copied verbatim, plus any answers Charly gave in comments. -->

### ¿Dónde?

Splash, modal de anotarse, asignar jugador, cancha, balance, footer

### Cómo está ahora

Textos en tú, sin acentos o en inglés. Ver la tabla "Known inconsistencies" en `docs/design/VOICE.md`:

- `src/components/landing/SplashPage.jsx` — Crea tu partido · Invita a tus amigos · Arma los equipos · Organiza el fulbito
- `src/components/match/InscriptionStep.jsx` — Jugas?
- `src/components/player/JoinMatchModal.jsx` — Anota a un amigo (opcional) · Podes agregar varios separados por coma
- `src/components/match/AssignPlayerModal.jsx` — Selecciona equipo: · Selecciona rol:
- `src/components/match/SoccerField.jsx` — Asigna jugadores a los equipos
- `src/components/match/BalanceIndicator.jsx` — Balance de Equipos
- `src/components/ui/Footer.jsx` — Github

### Cómo debería estar

Como dice la columna "Should be" de esa tabla: voseo en todo (incluida la splash), acentos y signos de apertura, sentence case, "GitHub".

Fuera de este issue: los empty states de Mis partidos y Tabla (necesitan diseño) y el panel CRT (va en otro issue).

_Sin comentarios de Charly en el issue._

## Problem
<!-- owner: designer (FRAME) -->

_FRAME omitido: issue etiquetado `polish` (nota del orquestador). El problema ya está acotado en Request: la tabla "Known inconsistencies" de `docs/design/VOICE.md` lista cada string y su forma correcta._

**Verdict:** BUILD — polish de copy, alcance cerrado por la tabla de VOICE.md.

- **Who:** organizer / jugador / suplente / hinchada / visitor of a public page
- **Moment:** where they are and what just happened (e.g. "opened the match link from WhatsApp, not logged in")
- **What they're trying to do:**
- **What they do today:** (in fulbin, or outside it — WhatsApp, a spreadsheet, memory)
- **Smallest change that solves it:**
- **What we could remove or simplify instead of adding:**

**Verdict:** BUILD / RESHAPE / DON'T BUILD — <one line why>

## Acceptance criteria
<!-- owner: planner -->

Todas las líneas verificadas contra el HEAD de `polish/44-voseo-y-acentos` (= origin/main,
a9de967): cada string de la lista del issue existe hoy en el archivo y línea indicados.

- [ ] **Splash** (`SplashPage.jsx:2–4, 31`): los pasos dicen `Creá tu partido` · `Invitá a tus
      amigos` · `Armá los equipos` · `Anotá los goles` (el 4º ya está bien) y el headline dice
      `Organizá el fulbito` / `con amigos` — igual que la propuesta de valor de `VOICE.md`.
- [ ] **Anotación** (`InscriptionStep.jsx:150`): el título del paso dice `¿Jugás?`, con signo de
      apertura y acento.
- [ ] **Modal de anotarse** (`JoinMatchModal.jsx:530, 578`): el label dice `Anotá a un amigo
      (opcional)` y el hint dice `Podés agregar varios separados por coma`.
- [ ] **Asignar jugador** (`AssignPlayerModal.jsx:129, 155`): los dos labels son `Equipo` y `Rol`
      — sin verbo y sin dos puntos (son labels, no botones).
- [ ] **Cancha vacía** (`SoccerField.jsx:219–220`): el empty state es una sola línea en voseo,
      `Asigná jugadores a los equipos`. Se borra la segunda línea `desde el panel lateral`: con
      el layout actual (`.team-builder-layout-new` es una columna y los paneles de equipo van
      abajo, `global.css:2773`) no hay panel lateral ni en desktop, así que el texto miente y
      además explica la interfaz (regla 5 de `VOICE.md`).
- [ ] **Balance** (`BalanceIndicator.jsx:41`): dice `Balance de equipos` en sentence case; la
      variante corta de mobile sigue siendo `Balance` (línea 42, sin cambios).
- [ ] **Footer** (`Footer.jsx:7`): el link dice `GitHub`; el `href` no cambia.
- [ ] **Cupo completo** (`ProgressBar.jsx:24`): dice `¡Cupo completo! Podés continuar al armado de
      equipos`. No está en la tabla de `VOICE.md`, pero es el mismo defecto (tuteo: "Puedes") y se
      ve pegado a `¿Jugás?` en el mismo paso. Ver "Open questions" si Charly prefiere dejarlo.
- [ ] **No queda tuteo ni acento faltante en `src/`**: `grep -rnE
      "\b(Crea|Invita|Arma|Organiza|Anota|Selecciona|Asigna|Puedes|Podes|Tenes|Queres|Jugas)\b"
      src/ --include=*.jsx` solo devuelve identificadores de código (`CreateMatchPage`,
      `Crear partido`, `Agregar…`), ningún string visible mal escrito. Ya se barrió todo `src/`
      buscando otras ocurrencias: aparte de lo listado acá, solo quedan las filas fuera de
      alcance.
- [ ] **Fuera de alcance, no se tocan**: el empty state de Mis partidos
      (`MyMatchesPage.jsx:74`), el texto de la Tabla (`StandingsPage.jsx:129`) y el panel CRT
      (`CrtControlPanel.jsx:18, 24–25`). Las tres filas siguen en la tabla de `VOICE.md`.
- [ ] **Nada de esto cambia el layout**: en iPhone 13 el header del balance sigue en una línea
      (`Balance` corto), los labels más cortos de AssignPlayerModal no desplazan nada, y el empty
      state de la cancha queda centrado con una línea sola. **Sin reglas nuevas en
      `src/styles/global.css`** — si hiciera falta una, es señal de que el cambio se fue de
      alcance y va a "Open questions".
- [ ] **Sin texto de ayuda nuevo**: este task solo reescribe o borra strings existentes; no agrega
      tooltips, hints ni helper text (y borra uno: `desde el panel lateral`).
- [ ] **Los specs e2e actuales siguen verdes sin tocarlos**: verificado que ninguno assertea los
      strings que cambian (`smoke.spec.ts` usa `.splash-headline` y `splash.cta` = /Crear
      partido/, que no cambia; `inscription.spec.ts:30` usa `.progress-message.complete`, clase no
      texto; `team-builder.spec.ts` usa `.balance-indicator`). Ver "Files to touch" para la
      cobertura nueva, que es del `e2e-tester`.
- [ ] `npm run build` pasa.

## Files to touch
<!-- owner: planner. This is the claim: the builder stays inside it, the orchestrator uses it to avoid overlapping tasks. -->

**Builder (`src/` únicamente, todo son cambios de string de 1–2 líneas):**

- `src/components/landing/SplashPage.jsx` — array `STEPS` (líneas 2–4) y headline (línea 31) a voseo.
- `src/components/match/InscriptionStep.jsx` — línea 150: `Jugas?` → `¿Jugás?`.
- `src/components/player/JoinMatchModal.jsx` — línea 530 (`Anotá a un amigo (opcional)`) y línea 578 (hint `Podés…`).
- `src/components/match/AssignPlayerModal.jsx` — líneas 129 y 155: labels `Equipo` y `Rol`.
- `src/components/match/SoccerField.jsx` — líneas 219–220: empty state a voseo y borrar la línea del "panel lateral".
- `src/components/match/BalanceIndicator.jsx` — línea 41: sentence case.
- `src/components/ui/Footer.jsx` — línea 7: `Github` → `GitHub`.
- `src/components/ui/ProgressBar.jsx` — línea 24: `Puedes` → `Podés` (string extra, no estaba en el issue).

**No builder, pero reservado por este task para que no lo agarre otro:**

- `docs/design/VOICE.md` — sacar de la tabla "Known inconsistencies" las filas arregladas
  (SplashPage, InscriptionStep, JoinMatchModal ×2, AssignPlayerModal, SoccerField,
  BalanceIndicator, Footer) y dejar las tres que quedan pendientes (MyMatchesPage, StandingsPage,
  CrtControlPanel). **Edición del `designer`** — `docs/design/` es suyo según CLAUDE.md, el builder
  no escribe ahí. Si el `designer` no entra en este task, lo hace el orquestador al cerrar el PR.

**Dependencia, no trabajo del builder (`e2e/` es del `e2e-tester`):**

- Ningún spec actual referencia los strings que cambian, así que **nada se rompe** y no hay fix
  obligatorio. Para cumplir el DoD ("existe el spec que cubre la feature"), el `e2e-tester` puede
  agregar aserciones de copy sobre el texto nuevo: `¿Jugás?` en `e2e/inscription.spec.ts`, los 4
  pasos + headline de la splash en `e2e/smoke.spec.ts`, y `Balance de equipos` en
  `e2e/team-builder.spec.ts` (o un `e2e/copy.spec.ts` nuevo). Correr `chromium-desktop` +
  `webkit-mobile-iphone`; `co-ownership` no hace falta (no cambian permisos).

## Backend & permissions
<!-- owner: planner. "None" if the task doesn't touch convex/. -->

**None.** `convex/` no se toca: no hay cambios de schema, ni queries, ni mutations, ni reglas de
`convex/permissions.ts`. Son strings presentacionales. **No hace falta ningún
`npx convex dev --once` ni deploy de Convex** (ni dev ni prod) para este PR.

## Design
<!-- owner: designer (BRIEF) -->

Task de copy: se reescriben o se borran strings existentes. **No hay UI nueva, ni componentes
nuevos, ni concepto nuevo, ni texto de ayuda nuevo** (se borra uno). Nada de esto cambia
lógica, props ni clases CSS: el builder toca solo el texto entre las etiquetas.

### Decisiones pedidas en "Open questions" (son calls de copy, las resuelvo acá)

1. **`ProgressBar.jsx:24` → `¡Cupo completo!`** (se recorta, no solo se vosea). El botón
   `Armar equipos` está a dos dedos de distancia en la misma pantalla: la segunda mitad de la
   frase explica la interfaz (regla 5) y rompe el largo de una línea (regla 4).
   Nota para el builder: hoy ese mensaje **no se ve nunca** — el único caller es
   `InscriptionStep.jsx:151` con `showMessage={false}`, y la pantalla muestra en su lugar
   `InscriptionStep.jsx:208`. Igual se arregla el string (el componente es de `ui/` y se puede
   reusar), pero **no se toca el prop `showMessage` ni se borra el bloque**: sacar código muerto
   no es de este task.
2. **`JoinMatchModal.jsx:578` → se borra el hint.** El placeholder `Juan, Pedro, Mati` ya
   muestra la convención de la coma, y al tipear aparece `Agregar “…”` en el typeahead: el hint
   describe lo que la UI ya demuestra (regla 5). Dato extra: la clase `.hint` no tiene ninguna
   regla en `global.css` (solo existen `.hint-match` y `.hint-different`), así que ese texto hoy
   se renderiza sin estilo y es el único uso de la clase — borrarlo no deja CSS muerto.
3. **`SoccerField.jsx:219–220` → una línea de estado, no una instrucción:
   `Todavía no hay nadie en la cancha`.** Dos razones: (a) regla 6, los empty states invitan y
   no mandan; (b) ese overlay lo ve también quien **no** puede asignar — `SoccerField` no recibe
   `canManage` y el empty state se renderiza igual para hinchada/visitante, así que un imperativo
   le pide algo que no puede hacer. La acción real vive abajo, en los slots vacíos de los dos
   `TeamPanel`. Esto se aparta del criterio del planner (`Asigná jugadores a los equipos`): la
   tabla de `VOICE.md` ofrecía explícitamente "or an empty state that doesn't instruct" y esa es
   la opción elegida.

### Flow

No hay flujo nuevo; estos son los puntos donde aparece cada string, para poder verificarlos:

1. **Splash** (`/#/`, 0 taps): headline + 4 pasos.
2. **Anotarse** (link de WhatsApp → `/#/partido/:id`, 0 taps): título `¿Jugás?`, y abajo del
   botón `Armar equipos` el estado del cupo (falta gente / se juega).
3. **Modal de anotarse** (1 tap en `Anotarme`): label del amigo, placeholder, error del campo.
4. **Cancha** (organizador: 1 tap en `Armar equipos`; jugador: ya en la etapa 2): empty state.
5. **Asignar jugador** (1 tap en un slot vacío / en un jugador, solo organizador): labels
   `Equipo` y `Rol`.
6. **Balance** (visible al pie de la cancha, 0 taps): título.
7. **Footer** (al pie de cualquier pantalla): `GitHub`.

### Reuse

- Componentes: los mismos, sin cambios de API — `src/components/ui/ProgressBar.jsx`,
  `src/components/ui/Footer.jsx`, y los de `match/` y `player/` listados en "Files to touch".
- CSS: **ninguna regla nueva en `src/styles/global.css`**, confirmado uno por uno:
  - `.splash-headline` (`global.css:5377`) — las cuatro palabras que cambian tienen **la misma
    cantidad de caracteres** con tilde (`Organiza`→`Organizá`, `Crea`→`Creá`, `Invita`→`Invitá`,
    `Arma`→`Armá`): el ancho no se mueve.
  - `.field-empty` (`global.css:3694`) — es un flex column centrado con `gap`; con un solo `<p>`
    sigue centrado y sin el gap sobrante.
  - `.assign-section label` (`global.css`) — labels más cortos, mismo estilo.
  - `.balance-title-full` / `.balance-title-short` (`global.css:3857–3868`) — el switch de
    ancho no se toca.
  - `.hint` — no existe como regla; se borra el único nodo que la usaba, no hay CSS a limpiar.
- Iconos y tokens: ninguno nuevo.

### States

- **Empty:** solo cambia la cancha vacía → `Todavía no hay nadie en la cancha` (una línea).
  Los otros empty states (Mis partidos, Tabla) quedan como están, fuera de alcance.
- **Loading:** sin cambios (`Cargando...` en `InscriptionStep.jsx:140` y
  `TeamBuilderStep.jsx:404`; el `...` queda para otro task).
- **Error:** solo cambia el del campo de amigos (`JoinMatchModal.jsx:150`) a voseo. El resto de
  los errores no se toca.
- **Success:** el cupo lleno en la anotación (`InscriptionStep.jsx:208`) suma el signo de
  apertura: `¡Somos N! Se juega`.
- **Sin permiso (no `canManage`):** no ve `Armar equipos` ni el hint del cupo, y el
  `AssignPlayerModal` no abre; sí ve la cancha vacía — por eso el empty state es estado y no
  orden (decisión 3).
- **Sin sesión:** idéntico a con sesión. Ninguno de estos strings depende de auth.

### Layout

- **iPhone 13 (390px):** el balance muestra la variante corta `Balance` (`@media (max-width:
  640px)`, `global.css:3861`), así que el cambio a sentence case **no se ve en mobile**: hay que
  revisarlo en desktop. La splash no cambia de ancho (misma cantidad de caracteres). La cancha
  vacía pasa de dos líneas a una, centrada. Los labels `Equipo` / `Rol` son más cortos: nada se
  desplaza.
- **≥ 721px:** igual, más el título completo `Balance de equipos` (>640px).

### Copy — cada string, archivo por archivo

| Archivo:línea | Ahora | Queda |
|---|---|---|
| `SplashPage.jsx:2` | `Crea tu partido` | `Creá tu partido` |
| `SplashPage.jsx:3` | `Invita a tus amigos` | `Invitá a tus amigos` |
| `SplashPage.jsx:4` | `Arma los equipos` | `Armá los equipos` |
| `SplashPage.jsx:5` | `Anotá los goles` | *(sin cambios)* |
| `SplashPage.jsx:31` | `Organiza el fulbito` | `Organizá el fulbito` |
| `SplashPage.jsx:32` | `con amigos` | *(sin cambios)* |
| `InscriptionStep.jsx:150` | `Jugas?` | `¿Jugás?` |
| `InscriptionStep.jsx:203` | `Necesitas N jugador(es) más para continuar` | `Falta 1 jugador` / `Faltan N jugadores` |
| `InscriptionStep.jsx:208` | `Somos N! Se juega` | `¡Somos N! Se juega` |
| `JoinMatchModal.jsx:150` | `Ingresa el nombre del amigo` | `Escribí el nombre del amigo` |
| `JoinMatchModal.jsx:530` | `Anota a un amigo (opcional)` | `Anotá a un amigo (opcional)` |
| `JoinMatchModal.jsx:578` | `Podes agregar varios separados por coma` | **se borra la línea entera** (el `<span className="hint">`) |
| `AssignPlayerModal.jsx:129` | `Selecciona equipo:` | `Equipo` |
| `AssignPlayerModal.jsx:155` | `Selecciona rol:` | `Rol` |
| `SoccerField.jsx:219` | `Asigna jugadores a los equipos` | `Todavía no hay nadie en la cancha` |
| `SoccerField.jsx:220` | `desde el panel lateral` | **se borra el `<p>` entero** |
| `BalanceIndicator.jsx:41` | `Balance de Equipos` | `Balance de equipos` |
| `BalanceIndicator.jsx:42` | `Balance` | *(sin cambios)* |
| `Footer.jsx:7` | `Github` | `GitHub` (el `href` no cambia) |
| `ProgressBar.jsx:24` | `¡Cupo completo! Puedes continuar al armado de equipos` | `¡Cupo completo!` |

**Tres strings que agrego a lo que listó el planner**, los tres en archivos que ya reclamó, los
tres el mismo defecto del issue (tuteo / signo de apertura faltante). Si no entran acá, el
criterio "no queda tuteo en `src/`" no se cumple:

- `InscriptionStep.jsx:203` — `Necesitas` es tuteo. Además `más para continuar` explica por qué
  el botón de al lado está deshabilitado (regla 5): la versión final es solo el faltante, y se
  conserva la lógica de plural que ya está en la línea → `Falta 1 jugador` / `Faltan 3 jugadores`
  (hay que pluralizar también el verbo, no solo `jugador`).
- `InscriptionStep.jsx:208` — le falta el `¡` de apertura (regla 2). Es el mensaje de éxito más
  visible de la app.
- `JoinMatchModal.jsx:150` — `Ingresa` es tuteo; `Escribí` es el verbo concreto de lo que hay que
  hacer en ese campo (reglas 1 y 7). Sin punto final, como el resto de los errores de ese modal.

**Fuera de alcance, no se toca en este PR:** `InGameHeader.jsx:131` dice `GOL!!!` y le falta el
signo de apertura (regla 2), pero el texto está dentro de la animación del gol y su archivo no
está reclamado por este task. Lo agrego como fila nueva a la tabla de `VOICE.md` en REVIEW, para
el próximo `polish`.

### New concepts / helper text

Ninguno. Este task **borra** dos líneas de texto explicativo (`desde el panel lateral`, el hint
de la coma) y recorta una tercera (`Puedes continuar al armado de equipos`). No agrega tooltips,
hints, placeholders explicativos ni onboarding.

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

**Ninguna.** Las dos preguntas del planner eran calls de copy y las resolví en "Design":

1. `ProgressBar.jsx:24` queda en `¡Cupo completo!` (recortado) — el botón `Armar equipos` está al
   lado, el resto de la frase explicaba la interfaz. Nota: ese mensaje hoy no se renderiza nunca
   (`showMessage={false}` en el único caller), así que el cambio no se ve en pantalla.
2. Las dos filas con "o rediseñar": el hint de `JoinMatchModal.jsx:578` se **borra** (el
   placeholder `Juan, Pedro, Mati` ya muestra la coma) y el empty state de `SoccerField.jsx:219`
   pasa a una línea de estado, `Todavía no hay nadie en la cancha`, en lugar de un imperativo que
   también ve la hinchada, que no puede asignar a nadie.

Para que quede explícito, por si no te gusta alguna: sumé tres strings del mismo defecto en
archivos que el plan ya reclama (`InscriptionStep.jsx:203` → `Faltan N jugadores`,
`InscriptionStep.jsx:208` → `¡Somos N! Se juega`, `JoinMatchModal.jsx:150` →
`Escribí el nombre del amigo`) y dejé `GOL!!!` (`InGameHeader.jsx:131`) para el próximo polish.
Están todas en "Design", no bloquean el build.

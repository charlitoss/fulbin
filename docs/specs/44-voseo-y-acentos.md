# 44 – Unificar voseo, acentos y textos en inglés

Issue: #44 · Branch: `polish/44-voseo-y-acentos` · Status: reviewing
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

Cuatro commits: tres de strings y uno de limpieza de CSS muerto (review de Design). `convex/` no
se tocó (Backend: None), así que **no hace falta ningún `npx convex dev --once` ni deploy de
Convex**. Ninguna regla nueva en `src/styles/global.css` (solo se borró una, ver el 4º commit) y
sin tocar `e2e/` ni `docs/design/VOICE.md`. `npm run build` pasa.

Se siguió la tabla "Copy" de la sección Design como autoridad de wording en los casos donde
difería del planner.

**`02957a3 polish(landing): voseo en la splash y GitHub en el footer`**

- `src/components/landing/SplashPage.jsx` — array `STEPS`: `Creá tu partido`, `Invitá a tus
  amigos`, `Armá los equipos` (el 4º, `Anotá los goles`, ya estaba bien). Headline:
  `Organizá el fulbito` (la segunda línea, `con amigos`, sin cambios).
- `src/components/ui/Footer.jsx` — `Github` → `GitHub`. El `href` no cambió.

**`08c0a7d polish(match): voseo y signos de apertura en la anotación`**

- `src/components/match/InscriptionStep.jsx` — título del paso `Jugas?` → `¿Jugás?`; mensaje de
  cupo lleno `Somos N! Se juega` → `¡Somos N! Se juega`; y el `continue-hint` pasó de
  `Necesitas N jugador(es) más para continuar` a `Falta 1 jugador` / `Faltan N jugadores`. Para
  pluralizar el verbo además del sustantivo, el ternario que había inline sobre el sufijo `es` se
  reemplazó por un ternario sobre la frase completa
  (`requiredCount - confirmedCount === 1 ? 'Falta 1 jugador' : \`Faltan ${…} jugadores\``). Es el
  mismo patrón, misma expresión de faltante, sin cambios de clase ni de condición de render.
- `src/components/player/JoinMatchModal.jsx` — error del campo `Ingresa el nombre del amigo` →
  `Escribí el nombre del amigo` (sin punto final, como el resto de los errores del modal); label
  `Anota a un amigo (opcional)` → `Anotá a un amigo (opcional)`; se borró el
  `<span className="hint">Podes agregar varios separados por coma</span>` entero (decisión 2 de
  Design). Era el único uso de `className="hint"` en todo `src/`. **Corrección:** acá dije que
  `.hint` no tenía regla en `global.css` — era falso. El span vivía dentro de
  `<div className="friends-section form-group">`, así que sí estaba estilado por
  `.form-group .hint`, y borrarlo dejó esa regla muerta. Se limpió en el 4º commit.
- `src/components/ui/ProgressBar.jsx` — el mensaje quedó en `¡Cupo completo!`. **Solo el string**:
  el prop `showMessage` y la rama `{showMessage && isComplete && (…)}` quedaron exactamente como
  estaban, aunque hoy ese texto no se renderice nunca (`showMessage={false}` en el único caller,
  `InscriptionStep.jsx:151`) — sacar código muerto no es de este task.

**`f783f39 polish(match): labels, cancha vacía y balance en sentence case`**

- `src/components/match/AssignPlayerModal.jsx` — labels `Selecciona equipo:` → `Equipo` y
  `Selecciona rol:` → `Rol`.
- `src/components/match/SoccerField.jsx` — empty state: un solo `<p>Todavía no hay nadie en la
  cancha</p>`; se borró el `<p>desde el panel lateral</p>`. Se siguió la decisión 3 de Design
  (línea de estado) y **no** el criterio del planner (`Asigná jugadores a los equipos`), porque la
  sección Design es la autoridad de wording: ese overlay también lo ve quien no puede asignar.
- `src/components/match/BalanceIndicator.jsx` — `Balance de Equipos` → `Balance de equipos`. La
  variante corta de mobile (`Balance`) no se tocó.

**4º commit — `polish(match): borrar la regla muerta .form-group .hint`** (SHOULD-FIX de la
review de Design)

- `src/styles/global.css` — se borró la regla `.form-group .hint` (`font-size`, `color`,
  `margin-top`), 5 líneas más la línea en blanco que la separaba de `.form-row`. Era la única
  regla que estilaba el span borrado en el commit anterior y ya nadie renderiza esa clase:
  `grep -rn 'className="hint"' src/` no devuelve nada. Sin efecto visual.
- **Desvío de "Files to touch":** `src/styles/global.css` no estaba en la lista. Se agregó solo
  para esta eliminación, por pedido explícito del orchestrator a partir del SHOULD-FIX; no se
  agregó ninguna regla. `.hint-match` y `.hint-different` (clases distintas, en uso) quedaron
  intactas.
- No se actuó sobre las "Observations for a future polish" de la review (modal inalcanzable,
  `ProgressBar` sin render, `GOL!!!`): son tasks aparte.

**Fuera de alcance, sin tocar:** `MyMatchesPage.jsx:74`, `StandingsPage.jsx:129`,
`CrtControlPanel.jsx` y `InGameHeader.jsx:131` (`GOL!!!`).

**Desvío del criterio del grep:** el barrido
`grep -rnE "\b(Crea|Invita|Arma|Organiza|Anota|Selecciona|Asigna|Puedes|Podes|Tenes|Queres|Jugas)\b" src/ --include=*.jsx`
devuelve un único resultado: `MyMatchesPage.jsx:74` (`Crea tu primer partido…`), que el propio
spec deja fuera de alcance. Todos los demás desaparecieron. No hay ningún otro string visible mal
escrito entre los que sí entraban en el claim.

**Sin preguntas abiertas nuevas.**

## Review: design
<!-- owner: designer (REVIEW). BLOCKER / SHOULD-FIX / OK, with file:line. -->

Revisado contra la tabla "Copy" de Design, string por string, con capturas en iPhone 13 (390px)
y 1280×800. Capturas en `docs/specs/44/` (ver lista al final).

### Copy

- **OK** — `SplashPage.jsx:2-4` (`Creá tu partido` · `Invitá a tus amigos` · `Armá los equipos`),
  `SplashPage.jsx:31` (`Organizá el fulbito`): los cuatro pasos y el headline llegaron textuales,
  con tilde, y el ancho no se movió (captura `01-splash-mobile.png`: el headline sigue en dos
  líneas, los pasos en una cada uno).
- **OK** — `InscriptionStep.jsx:150` (`¿Jugás?`): signo de apertura y tilde, en una línea al lado
  de la barra de progreso en 390px.
- **OK** — `InscriptionStep.jsx:208` (`¡Somos 10! Se juega`): el `¡` está, en mint, centrado bajo
  `Armar equipos`.
- **OK** — `InscriptionStep.jsx:203`: `Falta 1 jugador` / `Faltan 5 jugadores`. El ternario sobre
  la frase completa pluraliza bien verbo y sustantivo; el `== 1` usa la misma expresión de
  faltante que el render, no hay riesgo de desfasaje. Verificado en pantalla en los dos casos.
- **OK** — `JoinMatchModal.jsx:150` (`Escribí el nombre del amigo`), `:530` (`Anotá a un amigo
  (opcional)`).
- **OK** — `SoccerField.jsx:219` (`Todavía no hay nadie en la cancha`), una sola línea, centrada
  sobre la cancha, sin corte ni wrap en 390px.
- **OK** — `BalanceIndicator.jsx:41`: en 1280px dice `Balance de equipos` (sentence case) y en
  390px sigue la variante corta `Balance`. Las dos verificadas.
- **OK** — `Footer.jsx:7`: `GitHub`, `href` intacto.
- **OK** — `ProgressBar.jsx:24`: `¡Cupo completo!`.
- **OK** — No queda tuteo ni `!`/`?` sin signo de apertura en strings visibles de `src/`: el
  barrido de verbos devuelve solo `MyMatchesPage.jsx:74` (fuera de alcance) y el de puntuación
  solo `InGameHeader.jsx:131` (`GOL!!!`, fuera de alcance, ya agregado a la tabla de `VOICE.md`).

### Forma del código y restos

- **SHOULD-FIX** — `src/styles/global.css:1124`: la regla `.form-group .hint` quedó muerta. El
  `<span className="hint">` borrado estaba dentro de `<div className="friends-section
  form-group">`, así que **sí** tenía estilo por `.form-group .hint` (mi brief, decisión 2, y el
  Build log dicen que `.hint` no tenía regla — era falso; el error es mío, no del builder). Es el
  único uso de `.hint` en todo `src/` (`.hint-match` y `.hint-different` son otras clases).
  Fix: borrar las 4 líneas de `global.css:1124-1128`. Sin efecto visual: nadie renderiza la clase.
  Corregir también esa frase del Build log (es del builder).
- **OK** — `JoinMatchModal.jsx:527-580`: la sección de amigos quedó limpia después de borrar el
  span — label, input y lista de amigos consecutivos, sin nodo vacío ni hueco extra
  (`05-modal-amigos-mobile.png`). Y el trabajo del hint borrado lo hace la UI: con `Mati` tipeado
  aparece `+ Agregar “Mati”` (`09`), y con `Juan, Pedro` el botón primario pasa a `Confirmar (2)`
  (`10`) — la coma se demuestra sola, como decía la decisión 2.
- **OK** — `AssignPlayerModal.jsx:129,155`: labels `Equipo` y `Rol`, sin `:`. **No verificable en
  pantalla**: el modal hoy es inalcanzable — `TeamBuilderStep.jsx:275 handleOpenAssign` es el
  único lugar que hace `setShowAssignModal(true)` y no está cableado a ningún handler (`grep`
  sobre todo `src/`). Los strings están bien; el modal no se abre. Que no se arregle acá, pero va
  como hallazgo: o se cablea o se borra, en un task propio.
- **OK** — `ProgressBar.jsx:24` sigue sin renderizarse nunca (único caller
  `InscriptionStep.jsx:151` con `showMessage={false}`), tal como anticipó la decisión 1. El string
  quedó bien para cuando se reuse; el código muerto es para otro task.
- **OK** — Alcance: `git diff main...HEAD --stat` toca 8 archivos de `src/components/`, todos
  reclamados. **Cero cambios en `src/styles/global.css`**, y `MyMatchesPage.jsx`,
  `StandingsPage.jsx`, `CrtControlPanel.jsx` e `InGameHeader.jsx` intactos.

### Layout y brand

- **OK** — iPhone 13: nada se desplazó. `¿Jugás?` + barra en una línea; `Falta 1 jugador` y
  `¡Somos 10! Se juega` centrados bajo el botón; cancha vacía en una línea; modal de anotarse sin
  cambios de alto perceptibles.
- **OK** — 1280×800: igual, más `Balance de equipos` completo (`07-balance-desktop.png`).
- **OK** — Brand: el diff es 100% texto entre etiquetas. Sin hex crudos, sin `border-radius`, sin
  `font-family`, sin `style={{…}}`, sin iconos ni tokens nuevos.
- **OK** — Sin texto de ayuda nuevo: el task borra dos líneas explicativas y recorta una tercera.

### Observaciones para el próximo polish (no de este PR)

- `JoinMatchModal.jsx:423` — el `.form-error` se renderiza arriba de todo el modal, mientras el
  campo de amigos está al final: en iPhone 13, apretar Enter con el campo vacío muestra
  `Escribí el nombre del amigo` fuera de pantalla (`08-modal-error-amigo-mobile.png`). El string
  está bien; el lugar no. Es previo a este task.
- `ProgressBar.jsx:7` — `Somos ${current} /${total}` imprime `Somos 9 /10`, con el espacio del
  lado equivocado.
- `global.css:3694-3706` (`.field-empty`) — texto blanco al 80% sobre la cancha mint: se lee, pero
  justo (`06-cancha-vacia-mobile.png`). Candidato a un fondo/contraste propio.
- `JoinMatchModal.jsx:570` — `Agregar “Juan, Pedro”` habla en singular cuando va a agregar dos.
- En el working tree hay dos archivos sin trackear que no son de este task: `e2e/copy.spec.ts`
  (del `e2e-tester`) y `playwright.tmp.config.ts` en la raíz — ese último no debería entrar al PR.

### Capturas (iPhone 13 salvo donde dice desktop)

`docs/specs/44/01-splash-mobile.png` · `01-splash-desktop.png` ·
`02-inscripcion-falta-1-mobile.png` · `03-inscripcion-faltan-5-mobile.png` ·
`04-inscripcion-completo-mobile.png` · `05-modal-amigos-mobile.png` ·
`06-cancha-vacia-mobile.png` · `06-cancha-vacia-desktop.png` · `07-balance-mobile.png` ·
`07-balance-desktop.png` · `08-modal-error-amigo-mobile.png` · `09-modal-typeahead-mobile.png` ·
`10-modal-coma-mobile.png`

No se pudieron capturar: el `AssignPlayerModal` (labels `Equipo` / `Rol`) porque el modal es
inalcanzable desde la UI, y `¡Cupo completo!` de `ProgressBar` porque su único caller lo
desactiva. Ninguna de las dos se falseó.

## Review: first-timer
<!-- written by the orchestrator from first-timer's report -->

## Review: convex
<!-- written by the orchestrator from convex-guard's report. "Not applicable" if convex/ untouched. -->

## Tests
<!-- owner: e2e-tester. Specs added/changed, projects run, results. -->

**Added** `e2e/copy.spec.ts` (+ row in `e2e/README.md`). No existing spec changed or broke.

- Splash: headline `Organizá el fulbito` / `con amigos`, los 4 pasos en orden, link `GitHub` con el `href` intacto.
- Inscripción: `¿Jugás?`; `Falta 1 jugador`; `Faltan 5 jugadores`; `¡Somos 10! Se juega` (el mensaje visible, el de `InscriptionStep`; no se espera el de `ProgressBar`, que no se renderiza).
- Balance: `Balance de equipos` solo en desktop (skip en mobile); `Balance` corto solo en mobile.
- No cubierto e2e: label/hint de `JoinMatchModal`, labels de `AssignPlayerModal` y empty state de la cancha (la cancha autogenera equipos, no queda vacía por la UI normal).

**Run** (`chromium-desktop` + `webkit-mobile-iphone`, `co-ownership` no hace falta): suite completa 59 passed, 3 skipped, 0 failed. `copy.spec.ts`: 4 passed + 1 skipped por proyecto (los dos tests de Balance se excluyen mutuamente por ancho).

**Notas**
- Test bug corregido: `.step-title` matchea 3 elementos en la inscripción (Suplentes, Hinchada); se usa `.first()`.
- Entorno: el puerto 3000 lo tiene otro proyecto (`seller-center-proto`, vite) y `reuseExistingServer` lo reutiliza, así que `npx playwright test` normal falla con la app equivocada. Corrí con una copia temporal del config en el puerto 3123 (ya borrada). Para correr normal hay que liberar el 3000.
- `e2e/_scratch/shots44.spec.ts` (del designer) falló una vez ("modal anotarse", timeout de click) en una corrida; pasó en la siguiente. No es mío.
- Ningún bug de la app encontrado.

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

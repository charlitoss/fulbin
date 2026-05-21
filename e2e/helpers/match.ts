import type { Page } from "@playwright/test";
import { test } from "@playwright/test";
import { api } from "../../convex/_generated/api";
import {
  backdateKickoff,
  createTestMatch,
  getConvexClient,
  seedPlayers,
  seedRegistrations,
  uniqueRunId,
  wipeMatch,
  type MatchId,
  type PlayerId,
} from "./convex";

// Disable the CRT overlay before the app loads so animated noise can never
// flake screenshot/locator assertions.
export async function disableCrt(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("fulbin:crt-enabled", "false");
    } catch {
      /* ignore */
    }
  });
}

export interface TestMatchSetup {
  matchId: MatchId;
  codigoCorto: string;
  nombre: string;
  playerIds: PlayerId[];
}

// Create a match + seed N players via direct Convex calls, then register the
// per-test cleanup. Use this in any spec that doesn't need to drive the
// /nuevo form itself.
export async function setupMatch(opts?: {
  cantidadJugadores?: number;
  registerPlayers?: boolean;
  fecha?: string;
  horario?: string;
}): Promise<TestMatchSetup> {
  const runId = uniqueRunId();
  const testTitle = test.info().title.replace(/[^a-z0-9-]+/gi, "-").slice(0, 30);
  const nombre = `e2e-${testTitle}-${runId}`;
  const cantidad = opts?.cantidadJugadores ?? 10;

  const { matchId, codigoCorto } = await createTestMatch({
    nombre,
    cantidadJugadores: cantidad,
    fecha: opts?.fecha,
    horario: opts?.horario,
  });

  const playerIds = await seedPlayers({
    namePrefix: `e2e-${testTitle}-${runId}`,
    count: cantidad,
  });

  if (opts?.registerPlayers) {
    await seedRegistrations({ matchId, playerIds });
  }

  // Register teardown so the match + its dependents are wiped after the test,
  // regardless of pass/fail.
  test.info().annotations.push({ type: "e2e-match", description: matchId });
  await registerCleanup(matchId);

  return { matchId, codigoCorto, nombre, playerIds };
}

// Cleanup registry: each setupMatch call adds a teardown step that Playwright
// runs after the test finishes via the `test.afterEach` machinery wired up in
// the per-spec fixtures. Because helper modules can't call afterEach directly,
// each spec that uses setupMatch should also use the `matchTest` fixture below.
const cleanupKey = Symbol.for("fulbin.e2e.cleanupQueue");
type CleanupQueue = MatchId[];

function getCleanupQueue(): CleanupQueue {
  const info = test.info();
  // @ts-expect-error stash on TestInfo to survive across helper boundaries
  if (!info[cleanupKey]) {
    // @ts-expect-error
    info[cleanupKey] = [] as CleanupQueue;
  }
  // @ts-expect-error
  return info[cleanupKey] as CleanupQueue;
}

async function registerCleanup(matchId: MatchId): Promise<void> {
  getCleanupQueue().push(matchId);
}

// Spec files import this and add it as `test.afterEach(flushMatchCleanup)`.
export async function flushMatchCleanup(): Promise<void> {
  const queue = getCleanupQueue();
  for (const matchId of queue.splice(0)) {
    try {
      await wipeMatch(matchId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[e2e] cleanup failed for ${matchId}:`, err);
    }
  }
}

// Convenience wrapper for specs that want to assert in-game UI without
// fighting the kickoff countdown.
export async function setupMatchInGame(
  cantidadJugadores = 10,
): Promise<TestMatchSetup> {
  const setup = await setupMatch({
    cantidadJugadores,
    registerPlayers: true,
  });

  await backdateKickoff(setup.matchId);

  // Seed a default team configuration so InGameStep has something to render.
  // Half the players go to "blanco", half to "oscuro".
  const convex = getConvexClient();
  const half = Math.floor(setup.playerIds.length / 2);
  const asignaciones = setup.playerIds.map((jugadorId, i) => ({
    jugadorId,
    equipo: i < half ? "blanco" : "oscuro",
    rol: "delantero",
    goles: 0,
  }));
  await convex.mutation(api.teamConfigurations.save, {
    partidoId: setup.matchId,
    asignaciones,
  });

  // Advance to armado_equipos then to jugando (startMatch only flips from
  // armado_equipos, see convex/matches.ts:141).
  await convex.mutation(api.matches.update, {
    matchId: setup.matchId,
    pasoActual: "armado_equipos",
  });
  await convex.mutation(api.matches.startMatch, { matchId: setup.matchId });

  return setup;
}

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Single shared client — Convex's HTTP client is stateless, so reuse is fine.
let client: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (client) return client;
  const url = process.env.TEST_CONVEX_URL;
  if (!url) {
    throw new Error("TEST_CONVEX_URL not set; cannot construct Convex client.");
  }
  client = new ConvexHttpClient(url);
  return client;
}

export type MatchId = Id<"matches">;
export type PlayerId = Id<"players">;

// Generate a unique e2e- prefix per test invocation so parallel workers don't
// collide on player names or match names.
export function uniqueRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createTestMatch(opts: {
  nombre: string;
  cantidadJugadores?: number;
  fecha?: string;
  horario?: string;
  ubicacion?: string;
}): Promise<{ matchId: MatchId; codigoCorto: string }> {
  const convex = getConvexClient();
  const cantidad = opts.cantidadJugadores ?? 10;
  const fecha = opts.fecha ?? new Date().toISOString().slice(0, 10);
  const horario = opts.horario ?? "15:00";
  const ubicacion = opts.ubicacion ?? "Cancha E2E";

  const matchId = (await convex.mutation(api.matches.create, {
    nombre: opts.nombre,
    fecha,
    horario,
    ubicacion,
    cantidadJugadores: cantidad,
    jugadoresPorEquipo: cantidad / 2,
    organizadorId: "e2e",
    organizadorNombre: "E2E",
  })) as MatchId;

  // Fetch the codigoCorto the mutation generated.
  const match = await convex.query(api.matches.getById, { matchId });
  if (!match) throw new Error(`createTestMatch: created match ${matchId} not found.`);
  return { matchId, codigoCorto: match.codigoCorto };
}

export async function seedPlayers(opts: {
  namePrefix: string; // must start with "e2e-"
  count: number;
}): Promise<PlayerId[]> {
  const convex = getConvexClient();
  return (await convex.mutation(api.testing.seedPlayers, opts)) as PlayerId[];
}

export async function seedRegistrations(opts: {
  matchId: MatchId;
  playerIds: PlayerId[];
  estadoFisico?: string;
  tipoInscripcion?: string;
}): Promise<void> {
  const convex = getConvexClient();
  await convex.mutation(api.testing.seedRegistrations, opts);
}

export async function wipeMatch(matchId: MatchId): Promise<void> {
  const convex = getConvexClient();
  await convex.mutation(api.testing.wipeMatchCascade, { matchId });
}

export async function backdateKickoff(matchId: MatchId): Promise<void> {
  const convex = getConvexClient();
  await convex.mutation(api.testing.backdateMatchKickoff, { matchId });
}

export async function getMatch(matchId: MatchId) {
  const convex = getConvexClient();
  return convex.query(api.matches.getById, { matchId });
}

export async function advanceToStep(
  matchId: MatchId,
  paso: "inscripcion" | "armado_equipos" | "jugando" | "finalizado",
): Promise<void> {
  const convex = getConvexClient();
  if (paso === "jugando") {
    await convex.mutation(api.matches.startMatch, { matchId });
    return;
  }
  if (paso === "finalizado") {
    await convex.mutation(api.matches.finishMatch, { matchId });
    return;
  }
  await convex.mutation(api.matches.update, { matchId, pasoActual: paso });
}

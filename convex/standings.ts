import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const PUNTOS = { win: 3, draw: 1, loss: 0 };

export type StandingsRow = {
  playerId: Id<"players">;
  nombre: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  goles: number;
  puntos: number;
};

// Per-player standings across a group's finished matches. Teams change every
// match, so the tournament follows individuals — win 3, draw 1, loss 0. With a
// tournamentId, only that season's matches count; without it, all do.
// Shared by the live stats query, the public group page, and the finalize
// mutation (which freezes it).
export async function computeStandings(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  tournamentId?: Id<"tournaments">
): Promise<{ partidos: number; tabla: StandingsRow[] }> {
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .collect();
  const finished = matches.filter(
    (m) =>
      m.pasoActual === "finalizado" &&
      (!tournamentId || m.tournamentId === tournamentId)
  );

  const rows = new Map<Id<"players">, StandingsRow>();

  for (const match of finished) {
    const config = await ctx.db
      .query("teamConfigurations")
      .withIndex("by_partidoId", (q) => q.eq("partidoId", match._id))
      .first();
    if (!config || config.asignaciones.length === 0) continue;

    // Prefer the snapshot; fall back to summing the config for matches
    // finalized before resultado existed.
    let { golesBlanco, golesOscuro } = match.resultado ?? { golesBlanco: 0, golesOscuro: 0 };
    if (!match.resultado) {
      for (const a of config.asignaciones) {
        if (a.equipo === "blanco") golesBlanco += a.goles ?? 0;
        else if (a.equipo === "oscuro") golesOscuro += a.goles ?? 0;
      }
    }

    for (const a of config.asignaciones) {
      const own = a.equipo === "blanco" ? golesBlanco : golesOscuro;
      const rival = a.equipo === "blanco" ? golesOscuro : golesBlanco;

      let row = rows.get(a.jugadorId);
      if (!row) {
        row = { playerId: a.jugadorId, nombre: "", pj: 0, pg: 0, pe: 0, pp: 0, goles: 0, puntos: 0 };
        rows.set(a.jugadorId, row);
      }
      row.pj += 1;
      row.goles += a.goles ?? 0;
      if (own > rival) {
        row.pg += 1;
        row.puntos += PUNTOS.win;
      } else if (own === rival) {
        row.pe += 1;
        row.puntos += PUNTOS.draw;
      } else {
        row.pp += 1;
        row.puntos += PUNTOS.loss;
      }
    }
  }

  const tabla: StandingsRow[] = [];
  for (const row of rows.values()) {
    const player = await ctx.db.get(row.playerId);
    tabla.push({ ...row, nombre: player?.nombre ?? "(jugador eliminado)" });
  }

  tabla.sort(
    (a, b) =>
      b.puntos - a.puntos ||
      b.pg - a.pg ||
      b.goles - a.goles ||
      a.nombre.localeCompare(b.nombre, "es")
  );

  return { partidos: finished.length, tabla };
}

import { query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserDoc } from "./users";
import type { Id } from "./_generated/dataModel";

const PUNTOS = { win: 3, draw: 1, loss: 0 };

// Per-player standings across the signed-in admin's finished matches.
// Players (not teams) accumulate points: teams change every match, so the
// tournament follows individuals — win 3, draw 1, loss 0.
// With tournamentId, only that season's matches count; without it, all do.
export const myStats = query({
  args: { tournamentId: v.optional(v.id("tournaments")) },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) return null;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    const finished = matches.filter(
      (m) =>
        m.pasoActual === "finalizado" &&
        (!args.tournamentId || m.tournamentId === args.tournamentId)
    );

    type Row = {
      playerId: Id<"players">;
      nombre: string;
      pj: number;
      pg: number;
      pe: number;
      pp: number;
      goles: number;
      puntos: number;
    };
    const rows = new Map<Id<"players">, Row>();

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

    const result = [];
    for (const row of rows.values()) {
      const player = await ctx.db.get(row.playerId);
      result.push({ ...row, nombre: player?.nombre ?? "(jugador eliminado)" });
    }

    result.sort(
      (a, b) =>
        b.puntos - a.puntos ||
        b.pg - a.pg ||
        b.goles - a.goles ||
        a.nombre.localeCompare(b.nombre, "es")
    );

    return { partidos: finished.length, tabla: result };
  },
});

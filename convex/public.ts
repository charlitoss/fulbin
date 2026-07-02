import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { computeStandings } from "./standings";

// Read-only queries for the public group page (#/g/:publicToken). No auth:
// the unguessable token IS the credential. Every query re-checks that the
// group opted in (publico === true) and never accepts a raw groupId, so
// internal ids can't be used to enumerate groups. Responses carry no emails,
// workosIds or user ids — only player/tournament/match data the group chose
// to publish.

async function publicGroup(
  ctx: QueryCtx,
  publicToken: string
): Promise<Doc<"groups"> | null> {
  const token = publicToken.trim();
  if (!token) return null;
  const group = await ctx.db
    .query("groups")
    .withIndex("by_publicToken", (q) => q.eq("publicToken", token))
    .first();
  if (!group || group.publico !== true) return null;
  return group;
}

// Group name + its seasons, for the public page header and season picker.
export const groupOverview = query({
  args: { publicToken: v.string() },
  handler: async (ctx, args) => {
    const group = await publicGroup(ctx, args.publicToken);
    if (!group) return null;

    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
      .collect();
    tournaments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      nombre: group.nombre,
      torneos: tournaments.map((t) => ({
        _id: t._id,
        nombre: t.nombre,
        activo: t.activo,
        finalizado: !!t.finalizadoEn,
        campeon: t.campeon
          ? { nombre: t.campeon.nombre, puntos: t.campeon.puntos }
          : null,
      })),
    };
  },
});

// Standings table. Mirrors stats.myStats: frozen snapshot for finalized
// seasons, live computation otherwise (all matches when no tournamentId).
export const standings = query({
  args: {
    publicToken: v.string(),
    tournamentId: v.optional(v.id("tournaments")),
  },
  handler: async (ctx, args) => {
    const group = await publicGroup(ctx, args.publicToken);
    if (!group) return null;

    if (args.tournamentId) {
      const tournament = await ctx.db.get(args.tournamentId);
      // Only this group's seasons resolve through its token.
      if (!tournament || tournament.groupId !== group._id) return null;
      if (tournament.finalizadoEn && tournament.tablaFinal) {
        return {
          partidos: tournament.partidosFinal ?? tournament.tablaFinal.length,
          tabla: tournament.tablaFinal,
        };
      }
    }

    return await computeStandings(ctx, group._id, args.tournamentId);
  },
});

// Finished matches (newest first) with their final score, for the results
// list. Links out via codigoCorto to the already-public match page.
export const results = query({
  args: {
    publicToken: v.string(),
    tournamentId: v.optional(v.id("tournaments")),
  },
  handler: async (ctx, args) => {
    const group = await publicGroup(ctx, args.publicToken);
    if (!group) return null;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
      .collect();

    return matches
      .filter(
        (m) =>
          m.pasoActual === "finalizado" &&
          (!args.tournamentId || m.tournamentId === args.tournamentId)
      )
      .sort((a, b) => (b.finalizadoEn ?? 0) - (a.finalizadoEn ?? 0))
      .map((m) => ({
        _id: m._id,
        nombre: m.nombre,
        fecha: m.fecha,
        codigoCorto: m.codigoCorto,
        resultado: m.resultado ?? null,
      }));
  },
});

// One player's aggregated stats across the group's finished matches, plus
// their per-match history rows. For the public player page.
export const playerStats = query({
  args: {
    publicToken: v.string(),
    // A string (not v.id) because it arrives from the URL: malformed values
    // must resolve to "not found", not an ArgumentValidationError.
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const group = await publicGroup(ctx, args.publicToken);
    if (!group) return null;

    const playerId = ctx.db.normalizeId("players", args.playerId);
    if (!playerId) return null;
    const player = await ctx.db.get(playerId);
    // Only players of THIS group resolve through its token.
    if (!player || player.groupId !== group._id) return null;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
      .collect();
    const finished = matches
      .filter((m) => m.pasoActual === "finalizado")
      .sort((a, b) => (b.finalizadoEn ?? 0) - (a.finalizadoEn ?? 0));

    const historial = [];
    let pj = 0, pg = 0, pe = 0, pp = 0, goles = 0, puntos = 0;

    for (const match of finished) {
      const config = await ctx.db
        .query("teamConfigurations")
        .withIndex("by_partidoId", (q) => q.eq("partidoId", match._id))
        .first();
      const asignacion = config?.asignaciones.find(
        (a) => a.jugadorId === playerId
      );
      if (!config || !asignacion) continue;

      // Same score resolution as computeStandings: prefer the snapshot.
      let { golesBlanco, golesOscuro } = match.resultado ?? {
        golesBlanco: 0,
        golesOscuro: 0,
      };
      if (!match.resultado) {
        for (const a of config.asignaciones) {
          if (a.equipo === "blanco") golesBlanco += a.goles ?? 0;
          else if (a.equipo === "oscuro") golesOscuro += a.goles ?? 0;
        }
      }

      const own = asignacion.equipo === "blanco" ? golesBlanco : golesOscuro;
      const rival = asignacion.equipo === "blanco" ? golesOscuro : golesBlanco;
      const resultadoJugador = own > rival ? "G" : own === rival ? "E" : "P";

      pj += 1;
      goles += asignacion.goles ?? 0;
      if (resultadoJugador === "G") {
        pg += 1;
        puntos += 3;
      } else if (resultadoJugador === "E") {
        pe += 1;
        puntos += 1;
      } else {
        pp += 1;
      }

      historial.push({
        matchId: match._id,
        nombre: match.nombre,
        fecha: match.fecha,
        codigoCorto: match.codigoCorto,
        equipo: asignacion.equipo,
        goles: asignacion.goles ?? 0,
        resultado: resultadoJugador,
        marcador: `${golesBlanco}-${golesOscuro}`,
      });
    }

    return {
      nombre: player.nombre,
      posicion: player.perfilPermanente?.posicionPreferida ?? null,
      grupo: group.nombre,
      pj,
      pg,
      pe,
      pp,
      goles,
      puntos,
      historial,
    };
  },
});

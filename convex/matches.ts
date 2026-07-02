import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  currentUserDoc,
  upsertCurrentUser,
  ensureActiveGroupId,
  resolveActiveGroupId,
} from "./users";
import { activeTournament } from "./tournaments";
import { assertCanManageMatch } from "./permissions";
import { generateShortCode } from "./codes";

// List all matches, ordered by creation time (newest first)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db.query("matches").order("desc").collect();
    return matches;
  },
});

// Get a single match by ID
export const getById = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

// Get a match by its short code (case-insensitive)
export const getByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    const normalizedCode = args.shortCode.toUpperCase();
    const match = await ctx.db
      .query("matches")
      .withIndex("by_codigoCorto", (q) => q.eq("codigoCorto", normalizedCode))
      .first();
    return match;
  },
});

// Create a new match
export const create = mutation({
  args: {
    nombre: v.string(),
    fecha: v.string(),
    horario: v.string(),
    ubicacion: v.string(),
    detallesUbicacion: v.optional(v.string()),
    cantidadJugadores: v.number(),
    jugadoresPorEquipo: v.number(),
    organizadorId: v.optional(v.string()),
    organizadorNombre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate a unique short code
    let codigoCorto = generateShortCode();
    let attempts = 0;
    
    // Check for collisions and regenerate if needed
    while (attempts < 100) {
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_codigoCorto", (q) => q.eq("codigoCorto", codigoCorto))
        .first();
      
      if (!existing) break;
      codigoCorto = generateShortCode();
      attempts++;
    }

    const now = new Date().toISOString();

    // Link the match to its creator's active group when they're signed in;
    // anonymous creation keeps working with no owner and no group.
    const ownerId = await upsertCurrentUser(ctx, {});
    let groupId;
    if (ownerId) {
      const owner = await ctx.db.get(ownerId);
      if (owner?.deshabilitado) throw new Error("CUENTA_DESHABILITADA");
      if (owner) groupId = await ensureActiveGroupId(ctx, owner);
    }

    // Count the match toward the group's active tournament, if any.
    const tournament = groupId ? await activeTournament(ctx, groupId) : null;

    const matchId = await ctx.db.insert("matches", {
      ...args,
      codigoCorto,
      ownerId: ownerId ?? undefined,
      groupId,
      tournamentId: tournament?._id,
      pasoActual: "inscripcion",
      linkCompartible: "",
      createdAt: now,
      updatedAt: now,
    });

    return matchId;
  },
});

// Matches owned by the signed-in user, newest first. Each match carries a
// `marcador` (score) when relevant: the live tally for in-progress matches
// (summed from the team config) and the snapshot for finished ones.
export const myMatches = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUserDoc(ctx);
    if (!user) return [];
    const groupId = await resolveActiveGroupId(ctx, user);
    if (!groupId) return [];
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .order("desc")
      .collect();

    const withScore = [];
    for (const m of matches) {
      let marcador: { golesBlanco: number; golesOscuro: number } | undefined;
      if (m.pasoActual === "finalizado" && m.resultado) {
        marcador = { golesBlanco: m.resultado.golesBlanco, golesOscuro: m.resultado.golesOscuro };
      } else if (m.pasoActual === "jugando") {
        const config = await ctx.db
          .query("teamConfigurations")
          .withIndex("by_partidoId", (q) => q.eq("partidoId", m._id))
          .first();
        if (config) {
          let golesBlanco = 0;
          let golesOscuro = 0;
          for (const a of config.asignaciones) {
            if (a.equipo === "blanco") golesBlanco += a.goles ?? 0;
            else if (a.equipo === "oscuro") golesOscuro += a.goles ?? 0;
          }
          marcador = { golesBlanco, golesOscuro };
        }
      }
      withScore.push({ ...m, marcador });
    }
    return withScore;
  },
});

// Take ownership of a match created before the user system existed (or by
// an anonymous organizer). Only unowned matches can be claimed.
export const claim = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await upsertCurrentUser(ctx, {});
    if (!userId) throw new Error("Necesitás iniciar sesión para reclamar un partido");
    const claimer = await ctx.db.get(userId);
    if (!claimer) throw new Error("Necesitás iniciar sesión para reclamar un partido");
    if (claimer.deshabilitado) throw new Error("CUENTA_DESHABILITADA");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Partido no encontrado");
    if (match.ownerId && match.ownerId !== userId) {
      throw new Error("Este partido ya tiene organizador");
    }

    if (!match.ownerId) {
      const groupId = await ensureActiveGroupId(ctx, claimer);
      await ctx.db.patch(args.matchId, {
        ownerId: userId,
        groupId,
        updatedAt: new Date().toISOString(),
      });

      // Absorb the match's ownerless players into the group's roster so
      // their history carries over. Skip names already on the roster to
      // avoid duplicates — those players stay in the legacy pool.
      const roster = await ctx.db
        .query("players")
        .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
        .collect();
      const rosterNames = new Set(roster.map((p) => p.nombre.toLowerCase()));

      const regs = await ctx.db
        .query("registrations")
        .withIndex("by_partidoId", (q) => q.eq("partidoId", args.matchId))
        .collect();
      for (const reg of regs) {
        const player = await ctx.db.get(reg.jugadorId);
        if (player && !player.ownerId && !player.groupId && !rosterNames.has(player.nombre.toLowerCase())) {
          await ctx.db.patch(player._id, { ownerId: userId, groupId });
          rosterNames.add(player.nombre.toLowerCase());
        }
      }
    }

    return args.matchId;
  },
});

// Update an existing match
export const update = mutation({
  args: {
    matchId: v.id("matches"),
    nombre: v.optional(v.string()),
    fecha: v.optional(v.string()),
    horario: v.optional(v.string()),
    ubicacion: v.optional(v.string()),
    detallesUbicacion: v.optional(v.string()),
    cantidadJugadores: v.optional(v.number()),
    jugadoresPorEquipo: v.optional(v.number()),
    pasoActual: v.optional(v.string()),
    linkCompartible: v.optional(v.string()),
    organizadorId: v.optional(v.string()),
    organizadorNombre: v.optional(v.string()),
    iniciadoEn: v.optional(v.number()),
    finalizadoEn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { matchId, ...updates } = args;

    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Partido no encontrado");
    await assertCanManageMatch(ctx, match);

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    
    await ctx.db.patch(matchId, {
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
    });
    
    return matchId;
  },
});

// Delete a match
export const remove = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;
    await assertCanManageMatch(ctx, match);
    await ctx.db.delete(args.matchId);
  },
});

// Start a match: transitions pasoActual to 'jugando' and records the kickoff timestamp.
export const startMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    await assertCanManageMatch(ctx, match);
    if (match.pasoActual !== "armado_equipos") return args.matchId;

    await ctx.db.patch(args.matchId, {
      pasoActual: "jugando",
      iniciadoEn: Date.now(),
      updatedAt: new Date().toISOString(),
    });

    return args.matchId;
  },
});

// Sum the per-player goals in a team configuration into a team-level score.
async function computeResultado(ctx: QueryCtx, matchId: Id<"matches">) {
  const config = await ctx.db
    .query("teamConfigurations")
    .withIndex("by_partidoId", (q) => q.eq("partidoId", matchId))
    .first();
  if (!config) return undefined;

  let golesBlanco = 0;
  let golesOscuro = 0;
  for (const a of config.asignaciones) {
    if (a.equipo === "blanco") golesBlanco += a.goles ?? 0;
    else if (a.equipo === "oscuro") golesOscuro += a.goles ?? 0;
  }
  return {
    golesBlanco,
    golesOscuro,
    nombreBlanco: config.nombreEquipoBlanco,
    nombreOscuro: config.nombreEquipoOscuro,
  };
}

// Finish a match: transitions pasoActual to 'finalizado', records the final
// whistle and snapshots the score.
export const finishMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    await assertCanManageMatch(ctx, match);
    if (match.pasoActual !== "jugando") return args.matchId;

    const resultado = await computeResultado(ctx, args.matchId);

    await ctx.db.patch(args.matchId, {
      pasoActual: "finalizado",
      finalizadoEn: Date.now(),
      resultado,
      updatedAt: new Date().toISOString(),
    });

    return args.matchId;
  },
});

// Migration: snapshot resultado for finalized matches, and add team names to
// snapshots taken before nombreBlanco/nombreOscuro existed.
export const backfillResultados = mutation({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db.query("matches").collect();
    let updated = 0;
    for (const match of matches) {
      if (match.pasoActual !== "finalizado") continue;
      if (match.resultado?.nombreBlanco) continue; // already has names
      const resultado = await computeResultado(ctx, match._id);
      if (resultado) {
        await ctx.db.patch(match._id, { resultado });
        updated++;
      }
    }
    return { updated, total: matches.length };
  },
});

import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { currentUserDoc } from "./users";
import { computeStandings } from "./standings";

// The owner's currently active tournament (where new matches accrue), or null.
export async function activeTournament(
  ctx: MutationCtx,
  ownerId: Id<"users">
): Promise<Doc<"tournaments"> | null> {
  const list = await ctx.db
    .query("tournaments")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
    .collect();
  return list.find((t) => t.activo) ?? null;
}

// End a season: freeze the final table, crown the points leader as champion
// (none if no finished matches), and mark it inactive. Shared by `finalize`
// and `create` (which finalizes the current season before starting a new one).
async function finalizeTournament(
  ctx: MutationCtx,
  tournament: Doc<"tournaments">
): Promise<void> {
  const { partidos, tabla } = await computeStandings(ctx, tournament.ownerId, tournament._id);
  const top = tabla[0];
  await ctx.db.patch(tournament._id, {
    activo: false,
    finalizadoEn: new Date().toISOString(),
    partidosFinal: partidos,
    tablaFinal: tabla,
    campeon: top
      ? { playerId: top.playerId, nombre: top.nombre, puntos: top.puntos }
      : undefined,
  });
}

// The signed-in admin's tournaments, newest first (active flagged).
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUserDoc(ctx);
    if (!user) return [];
    const list = await ctx.db
      .query("tournaments")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

// Create a tournament and make it the active one (others become past).
export const create = mutation({
  args: { nombre: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");

    const nombre = args.nombre.trim();
    if (nombre.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");

    // Starting a new season finalizes the current one (crowning its champion),
    // so a tournament is always either active or finalized — never a limbo.
    const existing = await ctx.db
      .query("tournaments")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    for (const t of existing) {
      if (t.activo) await finalizeTournament(ctx, t);
    }

    return await ctx.db.insert("tournaments", {
      ownerId: user._id,
      nombre,
      activo: true,
      createdAt: new Date().toISOString(),
    });
  },
});

// End a season: crown the points leader as champion and freeze the table.
export const finalize = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");
    const t = await ctx.db.get(args.tournamentId);
    if (!t || t.ownerId !== user._id) throw new Error("Ese torneo no es tuyo");
    if (t.finalizadoEn) return args.tournamentId; // already finalized
    await finalizeTournament(ctx, t);
    return args.tournamentId;
  },
});

// Rename a tournament.
export const rename = mutation({
  args: { tournamentId: v.id("tournaments"), nombre: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");
    const t = await ctx.db.get(args.tournamentId);
    if (!t || t.ownerId !== user._id) throw new Error("Ese torneo no es tuyo");
    const nombre = args.nombre.trim();
    if (nombre.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");
    await ctx.db.patch(args.tournamentId, { nombre });
    return args.tournamentId;
  },
});

// Delete a tournament; its matches fall back to "Todos" (tournamentId cleared).
export const remove = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");
    const t = await ctx.db.get(args.tournamentId);
    if (!t || t.ownerId !== user._id) throw new Error("Ese torneo no es tuyo");

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    for (const m of matches) {
      if (m.tournamentId === args.tournamentId) {
        await ctx.db.patch(m._id, { tournamentId: undefined });
      }
    }
    await ctx.db.delete(args.tournamentId);
  },
});

// Reopen a finalized season: clear the frozen champion/table, make it active
// again, and finalize whatever was active (safety valve for an accidental end).
export const reopen = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");

    const target = await ctx.db.get(args.tournamentId);
    if (!target || target.ownerId !== user._id) {
      throw new Error("Ese torneo no es tuyo");
    }

    const list = await ctx.db
      .query("tournaments")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    for (const t of list) {
      if (t._id !== args.tournamentId && t.activo) await finalizeTournament(ctx, t);
    }

    await ctx.db.patch(args.tournamentId, {
      activo: true,
      finalizadoEn: undefined,
      partidosFinal: undefined,
      tablaFinal: undefined,
      campeon: undefined,
    });
    return args.tournamentId;
  },
});

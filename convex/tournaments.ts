import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { currentUserDoc, ensureActiveGroupId, resolveActiveGroupId } from "./users";
import { isGroupMember } from "./permissions";
import { computeStandings } from "./standings";

// The group's currently active tournament (where new matches accrue), or null.
export async function activeTournament(
  ctx: QueryCtx,
  groupId: Id<"groups">
): Promise<Doc<"tournaments"> | null> {
  const list = await ctx.db
    .query("tournaments")
    .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
    .collect();
  return list.find((t) => t.activo) ?? null;
}

// Any group member may manage the group's tournaments. Legacy ungrouped
// tournaments stay owner-only (pre-backfill window — never widen access).
async function canManageTournament(
  ctx: QueryCtx,
  tournament: Doc<"tournaments">
): Promise<boolean> {
  if (tournament.groupId) return await isGroupMember(ctx, tournament.groupId);
  const user = await currentUserDoc(ctx);
  return !!user && !user.deshabilitado && user._id === tournament.ownerId;
}

async function assertCanManageTournament(
  ctx: QueryCtx,
  tournament: Doc<"tournaments">
): Promise<void> {
  if (!(await canManageTournament(ctx, tournament))) {
    throw new Error("Ese torneo no es de tu grupo");
  }
}

// End a season: freeze the final table, crown the points leader as champion
// (none if no finished matches), and mark it inactive. Shared by `finalize`
// and `create` (which finalizes the current season before starting a new one).
async function finalizeTournament(
  ctx: MutationCtx,
  tournament: Doc<"tournaments">
): Promise<void> {
  // Every tournament is stamped with its group by the backfill (and created
  // with one since); this guard only trips on data that predates both.
  if (!tournament.groupId) throw new Error("TORNEO_SIN_GRUPO");
  const { partidos, tabla } = await computeStandings(ctx, tournament.groupId, tournament._id);
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

// The active group's tournaments, newest first (active flagged).
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUserDoc(ctx);
    if (!user) return [];
    const groupId = await resolveActiveGroupId(ctx, user);
    if (!groupId) return [];
    const list = await ctx.db
      .query("tournaments")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

// Create a tournament in the active group and make it the active one
// (others become past).
export const create = mutation({
  args: { nombre: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");
    if (user.deshabilitado) throw new Error("CUENTA_DESHABILITADA");

    const nombre = args.nombre.trim();
    if (nombre.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");

    const groupId = await ensureActiveGroupId(ctx, user);

    // Starting a new season finalizes the current one (crowning its champion),
    // so a tournament is always either active or finalized — never a limbo.
    const existing = await ctx.db
      .query("tournaments")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
    for (const t of existing) {
      if (t.activo) await finalizeTournament(ctx, t);
    }

    return await ctx.db.insert("tournaments", {
      ownerId: user._id,
      groupId,
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
    const t = await ctx.db.get(args.tournamentId);
    if (!t) throw new Error("Torneo no encontrado");
    await assertCanManageTournament(ctx, t);
    if (t.finalizadoEn) return args.tournamentId; // already finalized
    await finalizeTournament(ctx, t);
    return args.tournamentId;
  },
});

// Rename a tournament.
export const rename = mutation({
  args: { tournamentId: v.id("tournaments"), nombre: v.string() },
  handler: async (ctx, args) => {
    const t = await ctx.db.get(args.tournamentId);
    if (!t) throw new Error("Torneo no encontrado");
    await assertCanManageTournament(ctx, t);
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
    const t = await ctx.db.get(args.tournamentId);
    if (!t) throw new Error("Torneo no encontrado");
    await assertCanManageTournament(ctx, t);

    const matches = t.groupId
      ? await ctx.db
          .query("matches")
          .withIndex("by_groupId", (q) => q.eq("groupId", t.groupId))
          .collect()
      : await ctx.db
          .query("matches")
          .withIndex("by_ownerId", (q) => q.eq("ownerId", t.ownerId))
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
    const target = await ctx.db.get(args.tournamentId);
    if (!target) throw new Error("Torneo no encontrado");
    await assertCanManageTournament(ctx, target);
    if (!target.groupId) throw new Error("TORNEO_SIN_GRUPO");

    const list = await ctx.db
      .query("tournaments")
      .withIndex("by_groupId", (q) => q.eq("groupId", target.groupId))
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

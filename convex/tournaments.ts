import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { currentUserDoc } from "./users";

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

    const existing = await ctx.db
      .query("tournaments")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    for (const t of existing) {
      if (t.activo) await ctx.db.patch(t._id, { activo: false });
    }

    return await ctx.db.insert("tournaments", {
      ownerId: user._id,
      nombre,
      activo: true,
      createdAt: new Date().toISOString(),
    });
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

// Make a tournament the active one again (e.g. reopen a season).
export const activate = mutation({
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
      const shouldBeActive = t._id === args.tournamentId;
      if (t.activo !== shouldBeActive) {
        await ctx.db.patch(t._id, { activo: shouldBeActive });
      }
    }
    return args.tournamentId;
  },
});

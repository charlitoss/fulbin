import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// Look up the users row for the signed-in identity, or null when anonymous.
export async function currentUserDoc(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
    .unique();
}

// Upsert the signed-in user and return their id, or null when anonymous.
// Profile fields arrive from the client because WorkOS access tokens don't
// always carry email/name; the workosId comes from the verified JWT.
export async function upsertCurrentUser(
  ctx: MutationCtx,
  profile: { nombre?: string; email?: string; avatar?: string }
): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const existing = await ctx.db
    .query("users")
    .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
    .unique();

  const now = new Date().toISOString();
  const nombre = profile.nombre ?? identity.name ?? identity.email ?? "Organizador";
  const email = profile.email ?? identity.email ?? "";
  const avatar = profile.avatar ?? identity.pictureUrl;

  if (existing) {
    const patch: Partial<Doc<"users">> = {};
    if (nombre && nombre !== existing.nombre) patch.nombre = nombre;
    if (email && email !== existing.email) patch.email = email;
    if (avatar && avatar !== existing.avatar) patch.avatar = avatar;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, { ...patch, updatedAt: now });
    }
    return existing._id;
  }

  return await ctx.db.insert("users", {
    workosId: identity.subject,
    nombre,
    email,
    avatar,
    createdAt: now,
    updatedAt: now,
  });
}

// The signed-in user's profile, or null when anonymous.
export const current = query({
  args: {},
  handler: async (ctx) => {
    return await currentUserDoc(ctx);
  },
});

// Called by the client right after login to mirror the WorkOS user here.
export const ensureUser = mutation({
  args: {
    nombre: v.optional(v.string()),
    email: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await upsertCurrentUser(ctx, args);
  },
});

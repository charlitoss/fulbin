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

  const userId = await ctx.db.insert("users", {
    workosId: identity.subject,
    nombre,
    email,
    avatar,
    createdAt: now,
    updatedAt: now,
  });

  // Every account gets a personal group from day one — the space their
  // roster/matches/tournaments live in, and where co-admins can be invited.
  const groupId = await ctx.db.insert("groups", {
    nombre: `Grupo de ${nombre}`,
    ownerId: userId,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("memberships", {
    groupId,
    userId,
    rol: "owner",
    createdAt: now,
  });
  await ctx.db.patch(userId, { activeGroupId: groupId });

  return userId;
}

// The group the user currently operates in: their activeGroupId when it still
// points at a group they belong to, else the group they own, else their oldest
// membership. Null only for users with no memberships at all.
export async function resolveActiveGroupId(
  ctx: QueryCtx,
  user: Doc<"users">
): Promise<Id<"groups"> | null> {
  if (user.activeGroupId) {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_groupId_userId", (q) =>
        q.eq("groupId", user.activeGroupId!).eq("userId", user._id)
      )
      .unique();
    if (membership) return user.activeGroupId;
  }

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .collect();
  if (memberships.length === 0) return null;
  const owned = memberships.find((m) => m.rol === "owner");
  const pick =
    owned ??
    memberships.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  return pick.groupId;
}

// Mutation-side variant: resolves the active group, creating the personal
// group if the user somehow has none (safety net for pre-backfill accounts),
// and self-heals a stale users.activeGroupId pointer.
export async function ensureActiveGroupId(
  ctx: MutationCtx,
  user: Doc<"users">
): Promise<Id<"groups">> {
  const resolved = await resolveActiveGroupId(ctx, user);
  const now = new Date().toISOString();

  if (resolved) {
    if (user.activeGroupId !== resolved) {
      await ctx.db.patch(user._id, { activeGroupId: resolved, updatedAt: now });
    }
    return resolved;
  }

  const groupId = await ctx.db.insert("groups", {
    nombre: `Grupo de ${user.nombre}`,
    ownerId: user._id,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("memberships", {
    groupId,
    userId: user._id,
    rol: "owner",
    createdAt: now,
  });
  await ctx.db.patch(user._id, { activeGroupId: groupId, updatedAt: now });
  return groupId;
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

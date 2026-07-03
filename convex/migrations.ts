import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { generatePublicToken, generateShortCode } from "./codes";

// One-off, idempotent backfill for the co-managed-groups feature.
//
// Moves the app from 1:1 ownership (matches/players/tournaments.ownerId) to
// group ownership: every existing user gets a personal group (they own it),
// and all their resources are stamped with that group's id. Ownerless /
// anonymous resources (ownerId === undefined) are left untouched — they stay
// open exactly as before.
//
// Purely additive: ownerId is preserved, nothing is deleted or re-owned, so
// standings are unchanged (each user's finished matches all land in one group).
//
// Run with: npx convex run migrations:backfillGroups
// Safe to re-run — it only creates what's missing and only stamps groupId
// where it is currently unset.

// Ensure the user has a personal group + owner membership; return its id.
async function ensurePersonalGroup(
  ctx: MutationCtx,
  user: Doc<"users">
): Promise<Id<"groups">> {
  const now = new Date().toISOString();

  // Reuse an existing owned group if one already exists (idempotency).
  const owned = await ctx.db
    .query("groups")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
    .first();

  const groupId =
    owned?._id ??
    (await ctx.db.insert("groups", {
      nombre: `Grupo de ${user.nombre}`,
      ownerId: user._id,
      createdAt: now,
      updatedAt: now,
    }));

  // Ensure the owner membership exists.
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_groupId_userId", (q) =>
      q.eq("groupId", groupId).eq("userId", user._id)
    )
    .unique();
  if (!membership) {
    await ctx.db.insert("memberships", {
      groupId,
      userId: user._id,
      rol: "owner",
      createdAt: now,
    });
  }

  // Point the user's active group at it when unset.
  if (!user.activeGroupId) {
    await ctx.db.patch(user._id, { activeGroupId: groupId, updatedAt: now });
  }

  return groupId;
}

export const backfillGroups = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    let groupsCreated = 0;
    let matchesStamped = 0;
    let playersStamped = 0;
    let tournamentsStamped = 0;

    for (const user of users) {
      const beforeOwned = await ctx.db
        .query("groups")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
        .first();
      const groupId = await ensurePersonalGroup(ctx, user);
      if (!beforeOwned) groupsCreated++;

      // Stamp every resource this user owns that isn't already grouped.
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
        .collect();
      for (const m of matches) {
        if (!m.groupId) {
          await ctx.db.patch(m._id, { groupId });
          matchesStamped++;
        }
      }

      const players = await ctx.db
        .query("players")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
        .collect();
      for (const p of players) {
        if (!p.groupId) {
          await ctx.db.patch(p._id, { groupId });
          playersStamped++;
        }
      }

      const tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
        .collect();
      for (const t of tournaments) {
        if (!t.groupId) {
          await ctx.db.patch(t._id, { groupId });
          tournamentsStamped++;
        }
      }
    }

    return {
      users: users.length,
      groupsCreated,
      matchesStamped,
      playersStamped,
      tournamentsStamped,
    };
  },
});

// Ops/dev utility (internal = CLI-only, never callable from clients): mint an
// invite code for a group by name (same as the owner's "Crear link de
// invitación"). Run: npx convex run migrations:setGroupInvite '{"nombre": "..."}'
export const setGroupInvite = internalMutation({
  args: { nombre: v.string() },
  handler: async (ctx, args) => {
    const groups = await ctx.db.query("groups").collect();
    const group = groups.find((g) => g.nombre === args.nombre);
    if (!group) throw new Error(`Grupo "${args.nombre}" no encontrado`);
    let code = generateShortCode();
    while (groups.some((g) => g.inviteCode === code)) code = generateShortCode();
    await ctx.db.patch(group._id, {
      inviteCode: code,
      updatedAt: new Date().toISOString(),
    });
    return { path: `#/unirse/${code}` };
  },
});

// Ops/dev utility (internal = CLI-only, never callable from clients): flip a
// group's public page by name, minting the token if needed. Returns the
// public path. Run: npx convex run migrations:setGroupPublic '{"nombre": "...", "publico": true}'
export const setGroupPublic = internalMutation({
  args: { nombre: v.string(), publico: v.boolean() },
  handler: async (ctx, args) => {
    const groups = await ctx.db.query("groups").collect();
    const group = groups.find((g) => g.nombre === args.nombre);
    if (!group) throw new Error(`Grupo "${args.nombre}" no encontrado`);
    const publicToken = group.publicToken ?? generatePublicToken();
    await ctx.db.patch(group._id, {
      publico: args.publico,
      publicToken,
      updatedAt: new Date().toISOString(),
    });
    return { publico: args.publico, path: `#/g/${publicToken}` };
  },
});

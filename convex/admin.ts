import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { type Auth } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Super-admins are an env allowlist of WorkOS user ids (the verified JWT
// `subject`). We key off the JWT, NOT users.email — email is set from
// client-supplied data at sign-in, so an email gate could be self-granted.
// Set with: npx convex env set ADMIN_WORKOS_IDS "user_xxx,user_yyy"
function adminIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_WORKOS_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function isAdminSubject(subject?: string | null): boolean {
  return !!subject && adminIds().has(subject);
}

// Works in query/mutation/action contexts (all expose `auth`).
export async function isSuperAdmin(auth: Auth): Promise<boolean> {
  const identity = await auth.getUserIdentity();
  return isAdminSubject(identity?.subject);
}

async function assertSuperAdmin(auth: Auth): Promise<void> {
  if (!(await isSuperAdmin(auth))) throw new Error("NO_AUTORIZADO");
}

// Frontend gate: is the signed-in user a super-admin?
export const amISuperAdmin = query({
  args: {},
  handler: async (ctx) => isSuperAdmin(ctx.auth),
});

// All registered users with basic activity, most-recently-active first.
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await assertSuperAdmin(ctx.auth);
    const admins = adminIds();
    const users = await ctx.db.query("users").collect();

    const rows = [];
    for (const u of users) {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", u._id))
        .collect();
      const players = await ctx.db
        .query("players")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", u._id))
        .collect();
      const tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", u._id))
        .collect();

      const lastActivity = [u.updatedAt, ...matches.map((m) => m.updatedAt)]
        .filter(Boolean)
        .sort()
        .pop();

      rows.push({
        _id: u._id,
        workosId: u.workosId,
        nombre: u.nombre,
        email: u.email,
        avatar: u.avatar,
        createdAt: u.createdAt,
        lastActivity,
        deshabilitado: u.deshabilitado ?? false,
        isAdmin: admins.has(u.workosId),
        partidos: matches.length,
        partidosFinalizados: matches.filter((m) => m.pasoActual === "finalizado").length,
        jugadores: players.length,
        torneos: tournaments.length,
      });
    }

    rows.sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
    return rows;
  },
});

// Enable/disable an account. Disabled users can't create or manage matches.
export const setUserDisabled = mutation({
  args: { userId: v.id("users"), deshabilitado: v.boolean() },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx.auth);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Usuario no encontrado");
    if (isAdminSubject(target.workosId)) {
      throw new Error("No se puede deshabilitar a un administrador");
    }
    await ctx.db.patch(args.userId, {
      deshabilitado: args.deshabilitado,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Remove a user row and reconcile the groups they belonged to.
//
// - Groups they OWN with other members: ownership transfers to the oldest
//   remaining member, so the shared roster/matches/stats survive for the rest.
// - Groups they own with nobody else: dissolved — matches/players become
//   ownerless & ungrouped (history preserved), tournaments deleted (no
//   anonymous season grouping).
// - Resources they merely created in a surviving group stay in the group;
//   their ownerId provenance is reassigned to that group's owner.
async function orphanAndRemoveUser(ctx: MutationCtx, userId: Id<"users">): Promise<void> {
  const now = new Date().toISOString();

  // 1. Groups this user owns: transfer to the oldest other member, else dissolve.
  const ownedGroups = await ctx.db
    .query("groups")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
    .collect();
  for (const g of ownedGroups) {
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_groupId", (q) => q.eq("groupId", g._id))
      .collect();
    const others = members
      .filter((m) => m.userId !== userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (others.length > 0) {
      const heir = others[0];
      await ctx.db.patch(g._id, { ownerId: heir.userId, updatedAt: now });
      await ctx.db.patch(heir._id, { rol: "owner" });
    } else {
      const gMatches = await ctx.db
        .query("matches")
        .withIndex("by_groupId", (q) => q.eq("groupId", g._id))
        .collect();
      for (const m of gMatches) {
        await ctx.db.patch(m._id, {
          ownerId: undefined,
          groupId: undefined,
          tournamentId: undefined,
          updatedAt: now,
        });
      }
      const gPlayers = await ctx.db
        .query("players")
        .withIndex("by_groupId", (q) => q.eq("groupId", g._id))
        .collect();
      for (const p of gPlayers) {
        await ctx.db.patch(p._id, { ownerId: undefined, groupId: undefined });
      }
      const gTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_groupId", (q) => q.eq("groupId", g._id))
        .collect();
      for (const t of gTournaments) {
        await ctx.db.delete(t._id);
      }
      await ctx.db.delete(g._id);
    }
  }

  // 2. Drop this user's memberships everywhere.
  const myMemberships = await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const mem of myMemberships) {
    await ctx.db.delete(mem._id);
  }

  // 3. Anything still bearing this user's ownerId lives in a surviving group
  //    (transferred, or another member's). Keep it there; hand provenance to
  //    that group's owner (or clear it when there's no group). Rows dissolved
  //    in step 1 already had ownerId cleared, so they won't match here.
  const myMatches = await ctx.db
    .query("matches")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
    .collect();
  for (const m of myMatches) {
    const g = m.groupId ? await ctx.db.get(m.groupId) : null;
    await ctx.db.patch(m._id, { ownerId: g ? g.ownerId : undefined, updatedAt: now });
  }

  const myPlayers = await ctx.db
    .query("players")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
    .collect();
  for (const p of myPlayers) {
    const g = p.groupId ? await ctx.db.get(p.groupId) : null;
    await ctx.db.patch(p._id, { ownerId: g ? g.ownerId : undefined });
  }

  // tournaments.ownerId is required, so surviving seasons are reassigned to the
  // group owner; a season with no group (legacy) is deleted as before.
  const myTournaments = await ctx.db
    .query("tournaments")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
    .collect();
  for (const t of myTournaments) {
    const g = t.groupId ? await ctx.db.get(t.groupId) : null;
    if (g) {
      await ctx.db.patch(t._id, { ownerId: g.ownerId });
    } else {
      await ctx.db.delete(t._id);
    }
  }

  await ctx.db.delete(userId);
}

// Soft delete: remove the app account + orphan data. The WorkOS login still
// exists, so signing in again creates a fresh empty account.
export const softDeleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx.auth);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Usuario no encontrado");
    if (isAdminSubject(target.workosId)) {
      throw new Error("No se puede eliminar a un administrador");
    }
    await orphanAndRemoveUser(ctx, args.userId);
  },
});

// Internal helpers for the permanent-delete action (actions have no db access).
export const targetForDelete = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const t = await ctx.db.get(args.userId);
    if (!t) throw new Error("Usuario no encontrado");
    if (isAdminSubject(t.workosId)) {
      throw new Error("No se puede eliminar a un administrador");
    }
    return { workosId: t.workosId };
  },
});

export const purgeUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await orphanAndRemoveUser(ctx, args.userId);
  },
});

// Permanent delete: also remove the WorkOS login so they can't sign back in.
export const deleteUserPermanently = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    if (!(await isSuperAdmin(ctx.auth))) throw new Error("NO_AUTORIZADO");

    const target = await ctx.runQuery(internal.admin.targetForDelete, { userId: args.userId });

    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) throw new Error("WORKOS_API_KEY no configurada");
    const res = await fetch(
      `https://api.workos.com/user_management/users/${target.workosId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } }
    );
    // 404 = already gone in WorkOS; treat as success and still purge app data.
    if (!res.ok && res.status !== 404) {
      throw new Error(`WORKOS_DELETE_FAILED_${res.status}`);
    }

    await ctx.runMutation(internal.admin.purgeUser, { userId: args.userId });
    return { ok: true };
  },
});

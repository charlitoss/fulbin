import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { currentUserDoc, upsertCurrentUser } from "./users";
import { assertGroupMember, assertGroupOwner } from "./permissions";
import { generateShortCode, generatePublicToken } from "./codes";

// Group lifecycle + membership. Two roles (see permissions.ts):
// - any member ("admin") manages the group's matches/roster/tournaments;
// - the single owner additionally manages membership, the invite code, the
//   public toggle, renames and deletion.
// Joining is by invite link: the owner shares #/unirse/<code>; any signed-in
// account that opens it becomes a co-admin.

// Generate an invite code that's unique across groups.
async function uniqueInviteCode(ctx: MutationCtx): Promise<string> {
  let code = generateShortCode();
  let attempts = 0;
  while (attempts < 100) {
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (!existing) return code;
    code = generateShortCode();
    attempts++;
  }
  throw new Error("No se pudo generar un código de invitación");
}

// The signed-in user's groups, with role and member count, active first.
export const myGroups = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUserDoc(ctx);
    if (!user) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const rows = [];
    for (const m of memberships) {
      const group = await ctx.db.get(m.groupId);
      if (!group) continue;
      const members = await ctx.db
        .query("memberships")
        .withIndex("by_groupId", (q) => q.eq("groupId", m.groupId))
        .collect();
      rows.push({
        _id: group._id,
        nombre: group.nombre,
        rol: m.rol,
        esActivo: user.activeGroupId === group._id,
        miembros: members.length,
        // The invite code grants co-admin membership: owner-only. The public
        // token is read-only and meant to be shared: any member may see it
        // once the public page is on.
        inviteCode: group.ownerId === user._id ? group.inviteCode : undefined,
        publicToken:
          group.ownerId === user._id || group.publico
            ? group.publicToken
            : undefined,
        publico: group.publico ?? false,
        createdAt: group.createdAt,
      });
    }
    rows.sort((a, b) =>
      a.esActivo === b.esActivo
        ? a.createdAt.localeCompare(b.createdAt)
        : a.esActivo
          ? -1
          : 1
    );
    return rows;
  },
});

// The members of a group, for its settings screen. Members only.
export const members = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    await assertGroupMember(ctx, args.groupId);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    const rows = [];
    for (const m of memberships) {
      const member = await ctx.db.get(m.userId);
      if (!member) continue;
      rows.push({
        membershipId: m._id,
        userId: m.userId,
        nombre: member.nombre,
        avatar: member.avatar,
        rol: m.rol,
        desde: m.createdAt,
      });
    }
    rows.sort((a, b) =>
      a.rol === b.rol ? a.desde.localeCompare(b.desde) : a.rol === "owner" ? -1 : 1
    );
    return rows;
  },
});

// Safe preview of an invite before joining: name + member count only.
// No auth required (the invitee may not have signed in yet), and no secrets.
export const byInviteCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!code) return null;
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (!group) return null;
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
      .collect();
    const owner = await ctx.db.get(group.ownerId);
    return {
      nombre: group.nombre,
      miembros: memberships.length,
      organizador: owner?.nombre ?? "",
    };
  },
});

// Create an additional group owned by the caller and switch to it.
export const create = mutation({
  args: { nombre: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");
    if (user.deshabilitado) throw new Error("CUENTA_DESHABILITADA");

    const nombre = args.nombre.trim();
    if (nombre.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");

    const now = new Date().toISOString();
    const groupId = await ctx.db.insert("groups", {
      nombre,
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
  },
});

// Rename a group (owner only).
export const rename = mutation({
  args: { groupId: v.id("groups"), nombre: v.string() },
  handler: async (ctx, args) => {
    await assertGroupOwner(ctx, args.groupId);
    const nombre = args.nombre.trim();
    if (nombre.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");
    await ctx.db.patch(args.groupId, { nombre, updatedAt: new Date().toISOString() });
    return args.groupId;
  },
});

// Create (or rotate) the invite code. Rotating invalidates the old link —
// use it if an invite leaked. Owner only.
export const rotateInvite = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    await assertGroupOwner(ctx, args.groupId);
    const inviteCode = await uniqueInviteCode(ctx);
    await ctx.db.patch(args.groupId, { inviteCode, updatedAt: new Date().toISOString() });
    return inviteCode;
  },
});

// Disable the invite link entirely. Owner only.
export const revokeInvite = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    await assertGroupOwner(ctx, args.groupId);
    await ctx.db.patch(args.groupId, {
      inviteCode: undefined,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Join a group as co-admin via its invite code, and switch to it.
// Upserts the caller's users row: right after a first-ever login the row may
// not exist yet (SyncUser's ensureUser runs async) — joining must not depend
// on that timing.
export const joinByInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await upsertCurrentUser(ctx, {});
    if (!userId) throw new Error("Necesitás iniciar sesión para unirte a un grupo");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Necesitás iniciar sesión para unirte a un grupo");
    if (user.deshabilitado) throw new Error("CUENTA_DESHABILITADA");

    const code = args.code.trim().toUpperCase();
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (!group) throw new Error("INVITACION_INVALIDA");

    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_groupId_userId", (q) =>
        q.eq("groupId", group._id).eq("userId", user._id)
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("memberships", {
        groupId: group._id,
        userId: user._id,
        rol: "admin",
        createdAt: now,
      });
    }
    await ctx.db.patch(user._id, { activeGroupId: group._id, updatedAt: now });
    return group._id;
  },
});

// Remove a member (owner only; the owner can't remove themselves — transfer
// by deleting the group or ask them to leave).
export const removeMember = mutation({
  args: { groupId: v.id("groups"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await assertGroupOwner(ctx, args.groupId);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Grupo no encontrado");
    if (group.ownerId === args.userId) {
      throw new Error("El dueño no puede quitarse a sí mismo");
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_groupId_userId", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId)
      )
      .unique();
    if (membership) await ctx.db.delete(membership._id);

    // Don't leave the removed user pointing at a group they're no longer in;
    // their next mutation self-heals to a group they still belong to.
    const removed = await ctx.db.get(args.userId);
    if (removed?.activeGroupId === args.groupId) {
      await ctx.db.patch(args.userId, {
        activeGroupId: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  },
});

// Leave a group (any member except the owner).
export const leave = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Grupo no encontrado");
    if (group.ownerId === user._id) {
      throw new Error("El dueño no puede abandonar su grupo");
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_groupId_userId", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id)
      )
      .unique();
    if (membership) await ctx.db.delete(membership._id);

    if (user.activeGroupId === args.groupId) {
      await ctx.db.patch(user._id, {
        activeGroupId: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  },
});

// Switch the group the UI operates in.
export const setActive = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");
    await assertGroupMember(ctx, args.groupId);
    await ctx.db.patch(user._id, {
      activeGroupId: args.groupId,
      updatedAt: new Date().toISOString(),
    });
    return args.groupId;
  },
});

// Toggle the public standings page. Turning it on mints the public token on
// first use; turning it off keeps the token but the page stops resolving.
// Owner only.
export const setPublic = mutation({
  args: { groupId: v.id("groups"), publico: v.boolean() },
  handler: async (ctx, args) => {
    await assertGroupOwner(ctx, args.groupId);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Grupo no encontrado");
    await ctx.db.patch(args.groupId, {
      publico: args.publico,
      publicToken: group.publicToken ?? generatePublicToken(),
      updatedAt: new Date().toISOString(),
    });
  },
});

// Rotate the public token (invalidates previously shared public links).
// Owner only.
export const rotatePublicToken = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    await assertGroupOwner(ctx, args.groupId);
    const publicToken = generatePublicToken();
    await ctx.db.patch(args.groupId, {
      publicToken,
      updatedAt: new Date().toISOString(),
    });
    return publicToken;
  },
});

// Delete a group and everything in it (owner only). Matches/players lose the
// group and become ownerless/open (history preserved); tournaments and
// memberships are removed, mirroring admin.orphanAndRemoveUser's dissolve.
export const remove = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    await assertGroupOwner(ctx, args.groupId);
    const now = new Date().toISOString();

    const gMatches = await ctx.db
      .query("matches")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
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
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();
    for (const p of gPlayers) {
      await ctx.db.patch(p._id, { ownerId: undefined, groupId: undefined });
    }

    const gTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();
    for (const t of gTournaments) {
      await ctx.db.delete(t._id);
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();
    for (const m of memberships) {
      const member = await ctx.db.get(m.userId);
      if (member?.activeGroupId === args.groupId) {
        await ctx.db.patch(m.userId, { activeGroupId: undefined, updatedAt: now });
      }
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.groupId);
  },
});

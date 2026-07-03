import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { currentUserDoc } from "./users";

// Authorization for group-owned resources. No accounts required for players:
//
// - Grouped matches (match.groupId set): any member of the group may manage
//   them (edit details, build teams, start/finish, score, delete, remove
//   anyone). The group owner additionally manages membership (see groups.ts).
// - Owned but ungrouped matches (legacy window before the backfill ran):
//   only the signed-in owner may manage them, as before.
// - Ownerless matches (anonymous, no account): stay fully open, as before.
//
// A registration can additionally be removed by the anonymous device that
// created it (its `creadoPor` token) — "remove yourself, not others".

// Group ids the signed-in user belongs to (empty when anonymous).
export async function userGroupIds(ctx: QueryCtx): Promise<Id<"groups">[]> {
  const user = await currentUserDoc(ctx);
  if (!user) return [];
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .collect();
  return memberships.map((m) => m.groupId);
}

// True if the caller is a (non-disabled) member of the group — any role.
export async function isGroupMember(
  ctx: QueryCtx,
  groupId: Id<"groups">
): Promise<boolean> {
  const user = await currentUserDoc(ctx);
  if (!user || user.deshabilitado) return false;
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_groupId_userId", (q) =>
      q.eq("groupId", groupId).eq("userId", user._id)
    )
    .unique();
  return !!membership;
}

// True if the caller is the group's (non-disabled) owner — the only role that
// manages membership, the invite code, the public toggle, and group deletion.
export async function isGroupOwner(
  ctx: QueryCtx,
  groupId: Id<"groups">
): Promise<boolean> {
  const user = await currentUserDoc(ctx);
  if (!user || user.deshabilitado) return false;
  const group = await ctx.db.get(groupId);
  return !!group && group.ownerId === user._id;
}

// Throws unless the caller is a member of the group.
export async function assertGroupMember(
  ctx: QueryCtx,
  groupId: Id<"groups">
): Promise<void> {
  if (!(await isGroupMember(ctx, groupId))) {
    throw new Error("NO_AUTORIZADO");
  }
}

// Throws unless the caller owns the group.
export async function assertGroupOwner(
  ctx: QueryCtx,
  groupId: Id<"groups">
): Promise<void> {
  if (!(await isGroupOwner(ctx, groupId))) {
    throw new Error("NO_AUTORIZADO");
  }
}

// True if the caller may manage (edit/start/finish/delete/teams/score) the match.
export async function canManageMatch(
  ctx: QueryCtx,
  match: Doc<"matches">
): Promise<boolean> {
  if (match.groupId) return await isGroupMember(ctx, match.groupId);
  if (!match.ownerId) return true; // ownerless / legacy: open
  // Owned but not yet grouped: fall back to the original owner-only check so
  // the transitional window never widens access.
  const user = await currentUserDoc(ctx);
  return !!user && !user.deshabilitado && user._id === match.ownerId;
}

// Throws unless the caller may manage the match.
export async function assertCanManageMatch(
  ctx: QueryCtx,
  match: Doc<"matches">
): Promise<void> {
  if (!(await canManageMatch(ctx, match))) {
    throw new Error("NO_AUTORIZADO");
  }
}

// True if the caller may remove/modify a specific registration: anyone who can
// manage the match, or the device that created the registration.
export async function canManageRegistration(
  ctx: QueryCtx,
  match: Doc<"matches">,
  registration: Doc<"registrations">,
  anonId?: string
): Promise<boolean> {
  if (await canManageMatch(ctx, match)) return true;
  return !!anonId && registration.creadoPor === anonId;
}

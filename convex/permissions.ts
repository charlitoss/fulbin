import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { currentUserDoc } from "./users";

// Authorization for match actions. Two roles, no accounts required for players:
//
// - Owned matches (match.ownerId set): only the signed-in owner may manage them
//   (edit details, build teams, start/finish, score, delete, remove anyone).
// - Ownerless matches (anonymous, no account): stay fully open, as before.
//
// A registration can additionally be removed by the anonymous device that
// created it (its `creadoPor` token) — "remove yourself, not others".

// True if the caller may manage (edit/start/finish/delete/teams/score) the match.
export async function canManageMatch(
  ctx: MutationCtx,
  match: Doc<"matches">
): Promise<boolean> {
  if (!match.ownerId) return true; // ownerless / legacy: open
  const user = await currentUserDoc(ctx);
  // A disabled account loses management of its own matches.
  return !!user && !user.deshabilitado && user._id === match.ownerId;
}

// Throws unless the caller may manage the match.
export async function assertCanManageMatch(
  ctx: MutationCtx,
  match: Doc<"matches">
): Promise<void> {
  if (!(await canManageMatch(ctx, match))) {
    throw new Error("NO_AUTORIZADO");
  }
}

// True if the caller may remove/modify a specific registration: the match owner
// (or any caller on an ownerless match), or the device that created it.
export async function canManageRegistration(
  ctx: MutationCtx,
  match: Doc<"matches">,
  registration: Doc<"registrations">,
  anonId?: string
): Promise<boolean> {
  if (await canManageMatch(ctx, match)) return true;
  return !!anonId && registration.creadoPor === anonId;
}

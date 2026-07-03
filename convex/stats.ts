import { query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserDoc, resolveActiveGroupId } from "./users";
import { isGroupMember } from "./permissions";
import { computeStandings } from "./standings";

// Per-player standings across the active group's finished matches.
// With tournamentId, only that season's matches count; without it, all do.
// A finalized tournament returns its frozen snapshot so history can't shift.
export const myStats = query({
  args: { tournamentId: v.optional(v.id("tournaments")) },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) return null;
    const groupId = await resolveActiveGroupId(ctx, user);
    if (!groupId) return null;

    if (args.tournamentId) {
      const tournament = await ctx.db.get(args.tournamentId);
      // Only this group's seasons (or, legacy ungrouped, the caller's own).
      const isOurs = tournament?.groupId
        ? tournament.groupId === groupId && (await isGroupMember(ctx, groupId))
        : tournament?.ownerId === user._id;
      if (!tournament || !isOurs) return null;
      // Frozen final table for a finalized season — immune to later edits.
      if (tournament.finalizadoEn && tournament.tablaFinal) {
        return {
          partidos: tournament.partidosFinal ?? tournament.tablaFinal.length,
          tabla: tournament.tablaFinal,
        };
      }
    }

    return await computeStandings(ctx, groupId, args.tournamentId);
  },
});

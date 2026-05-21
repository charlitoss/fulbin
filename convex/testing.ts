// Test-only mutations used by Playwright E2E specs.
//
// Safety model: every destructive function in this file only touches rows whose
// `nombre` begins with "e2e-". The e2e suite always creates matches and players
// under that prefix (see e2e/helpers/match.ts), so even if these mutations are
// invoked against a non-test deployment they cannot delete real data. The
// Playwright-side global-setup also refuses to run unless TEST_CONVEX_URL is
// explicitly opted in.
//
// `seedRegistrations` and `backdateMatchKickoff` accept an explicit matchId, so
// callers with deploy-key access could in theory aim them at real matches —
// the threat model here is "trusted developer with cloud credentials", not
// "untrusted client", and Convex's auth already gates that.

import { mutation } from "./_generated/server";
import { v } from "convex/values";

const TEST_NAME_PREFIX = "e2e-";

// Cascade-delete a single match plus its registrations and team config.
// Called from afterEach to clean up the test that just ran.
export const wipeMatchCascade = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId", (q) => q.eq("partidoId", args.matchId))
      .collect();
    for (const reg of registrations) {
      await ctx.db.delete(reg._id);
    }

    const teamConfigs = await ctx.db
      .query("teamConfigurations")
      .withIndex("by_partidoId", (q) => q.eq("partidoId", args.matchId))
      .collect();
    for (const config of teamConfigs) {
      await ctx.db.delete(config._id);
    }

    const match = await ctx.db.get(args.matchId);
    if (match) {
      await ctx.db.delete(args.matchId);
    }
  },
});

// Nuclear cleanup: wipe every match whose nombre starts with "e2e-" plus its
// dependent rows. Called by globalSetup at the start of each run to clear
// orphans from aborted prior runs.
export const wipeAllTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const allMatches = await ctx.db.query("matches").collect();
    const testMatches = allMatches.filter((m) =>
      m.nombre.startsWith(TEST_NAME_PREFIX),
    );

    let removed = 0;
    for (const match of testMatches) {
      const registrations = await ctx.db
        .query("registrations")
        .withIndex("by_partidoId", (q) => q.eq("partidoId", match._id))
        .collect();
      for (const reg of registrations) {
        await ctx.db.delete(reg._id);
      }

      const teamConfigs = await ctx.db
        .query("teamConfigurations")
        .withIndex("by_partidoId", (q) => q.eq("partidoId", match._id))
        .collect();
      for (const config of teamConfigs) {
        await ctx.db.delete(config._id);
      }

      await ctx.db.delete(match._id);
      removed++;
    }

    // Also wipe e2e-* players (created by seedPlayers below).
    const allPlayers = await ctx.db.query("players").collect();
    const testPlayers = allPlayers.filter((p) =>
      p.nombre.startsWith(TEST_NAME_PREFIX),
    );
    for (const player of testPlayers) {
      await ctx.db.delete(player._id);
    }

    return { matchesRemoved: removed, playersRemoved: testPlayers.length };
  },
});

// Seed N players with predictable names so a test can register them in bulk
// without typing each name through the UI.
export const seedPlayers = mutation({
  args: {
    namePrefix: v.string(), // must start with "e2e-" for cleanup
    count: v.number(),
  },
  handler: async (ctx, args) => {
    if (!args.namePrefix.startsWith(TEST_NAME_PREFIX)) {
      throw new Error(
        `seedPlayers namePrefix must start with '${TEST_NAME_PREFIX}'`,
      );
    }

    const ids: string[] = [];
    for (let i = 0; i < args.count; i++) {
      const id = await ctx.db.insert("players", {
        nombre: `${args.namePrefix}-${i + 1}`,
      });
      ids.push(id);
    }
    return ids;
  },
});

// Register every supplied player against the supplied match in one round trip.
// Lets full-lifecycle specs jump straight to team-builder without driving the
// inscription UI 10+ times.
export const seedRegistrations = mutation({
  args: {
    matchId: v.id("matches"),
    playerIds: v.array(v.id("players")),
    estadoFisico: v.optional(v.string()),
    tipoInscripcion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const estado = args.estadoFisico ?? "normal";
    const tipo = args.tipoInscripcion ?? "jugador";
    const now = new Date().toISOString();

    const ids: string[] = [];
    for (const playerId of args.playerIds) {
      const id = await ctx.db.insert("registrations", {
        partidoId: args.matchId,
        jugadorId: playerId,
        estadoFisico: estado,
        tipoInscripcion: tipo,
        confirmado: true,
        asistira: true,
        timestamp: now,
      });
      ids.push(id);
    }
    return ids;
  },
});

// Backdate a match's fecha/horario to the past so the in-game "Empezar partido"
// CTA appears immediately. Avoids real-time waiting in tests.
//
// The client (MatchPage.jsx:28-35) parses fecha+horario as LOCAL time. To stay
// consistent we send a date far enough in the past that any timezone offset
// still resolves to "before now" — using yesterday at noon.
export const backdateMatchKickoff = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yyyy = yesterday.getUTCFullYear();
    const mm = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(yesterday.getUTCDate()).padStart(2, "0");

    await ctx.db.patch(args.matchId, {
      fecha: `${yyyy}-${mm}-${dd}`,
      horario: "12:00",
      updatedAt: new Date().toISOString(),
    });
  },
});

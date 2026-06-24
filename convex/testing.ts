// Test-only mutations used by Playwright E2E specs.
//
// Convex mutations are PUBLIC by default — callable by anyone who knows the
// deployment URL (which ships in the client bundle as VITE_CONVEX_URL). Since
// some of these are destructive (wipeMatchCascade deletes any match by ID),
// every function here requires a `secret` arg checked against the E2E_SECRET
// deployment env var. Set it with: `npx convex env set E2E_SECRET <value>`.
// The Playwright suite reads the same value from .env.test (gitignored) and
// passes it on every call. Callers without the secret are rejected.
//
// Defense in depth: destructive sweeps additionally only touch rows whose
// `nombre` begins with "e2e-", and global-setup refuses to run without an
// explicit opt-in.

import { mutation } from "./_generated/server";
import { v } from "convex/values";

const TEST_NAME_PREFIX = "e2e-";

function assertSecret(secret: string): void {
  const expected = process.env.E2E_SECRET;
  if (!expected) {
    throw new Error(
      "E2E_SECRET is not configured on this deployment. " +
        "Run: npx convex env set E2E_SECRET <value>",
    );
  }
  if (secret !== expected) {
    throw new Error("Forbidden: invalid E2E secret.");
  }
}

// Cascade-delete a single match plus its registrations and team config.
// Called from afterEach to clean up the test that just ran.
export const wipeMatchCascade = mutation({
  args: { secret: v.string(), matchId: v.id("matches") },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
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
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
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

// Seed a throwaway user + an owned match/player/tournament, for exercising the
// admin user-management flows (disable / delete / orphan). All e2e-prefixed.
export const seedUserWithData = mutation({
  args: { secret: v.string(), workosId: v.string(), nombre: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    const now = new Date().toISOString();
    const userId = await ctx.db.insert("users", {
      workosId: args.workosId,
      nombre: args.nombre,
      email: args.email,
      createdAt: now,
      updatedAt: now,
    });
    const tournamentId = await ctx.db.insert("tournaments", {
      ownerId: userId,
      nombre: "e2e-admin-trn",
      activo: true,
      createdAt: now,
    });
    const matchId = await ctx.db.insert("matches", {
      codigoCorto: `E2E${Math.floor(Math.random() * 900 + 100)}`,
      nombre: "e2e-admin-match",
      fecha: "2030-01-01",
      horario: "12:00",
      ubicacion: "Cancha",
      cantidadJugadores: 2,
      jugadoresPorEquipo: 1,
      pasoActual: "inscripcion",
      ownerId: userId,
      tournamentId,
      createdAt: now,
      updatedAt: now,
    });
    const playerId = await ctx.db.insert("players", {
      nombre: "e2e-admin-player",
      ownerId: userId,
    });
    return { userId, matchId, playerId, tournamentId };
  },
});

// Directly flip a user's disabled flag (to test enforcement without the admin API).
export const rawSetDisabled = mutation({
  args: { secret: v.string(), userId: v.id("users"), deshabilitado: v.boolean() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    await ctx.db.patch(args.userId, { deshabilitado: args.deshabilitado });
  },
});

// Hard-delete seeded matches (cascade) + players by id, for admin-test cleanup.
export const wipeSeeded = mutation({
  args: {
    secret: v.string(),
    matchIds: v.array(v.id("matches")),
    playerIds: v.array(v.id("players")),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    for (const matchId of args.matchIds) {
      const regs = await ctx.db
        .query("registrations")
        .withIndex("by_partidoId", (q) => q.eq("partidoId", matchId))
        .collect();
      for (const r of regs) await ctx.db.delete(r._id);
      const configs = await ctx.db
        .query("teamConfigurations")
        .withIndex("by_partidoId", (q) => q.eq("partidoId", matchId))
        .collect();
      for (const c of configs) await ctx.db.delete(c._id);
      if (await ctx.db.get(matchId)) await ctx.db.delete(matchId);
    }
    for (const playerId of args.playerIds) {
      if (await ctx.db.get(playerId)) await ctx.db.delete(playerId);
    }
  },
});

// Seed N players with predictable names so a test can register them in bulk
// without typing each name through the UI.
export const seedPlayers = mutation({
  args: {
    secret: v.string(),
    namePrefix: v.string(), // must start with "e2e-" for cleanup
    count: v.number(),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
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
    secret: v.string(),
    matchId: v.id("matches"),
    playerIds: v.array(v.id("players")),
    estadoFisico: v.optional(v.string()),
    tipoInscripcion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
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
  args: { secret: v.string(), matchId: v.id("matches") },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
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

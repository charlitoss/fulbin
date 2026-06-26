import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_PROFILE } from "./players";
import { assertCanManageMatch, canManageRegistration } from "./permissions";

// List all registrations for a match
export const listByMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId", (q) => q.eq("partidoId", args.matchId))
      .collect();
    return registrations;
  },
});

// Get a specific registration by match and player
export const getByMatchAndPlayer = query({
  args: { 
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId_jugadorId", (q) => 
        q.eq("partidoId", args.matchId).eq("jugadorId", args.playerId)
      )
      .first();
    return registration;
  },
});

// Register a person: either a roster player picked by id, or a free-form
// name (find-or-create). Name lookup is scoped to the match owner's roster so
// different groups never share profiles; unowned matches keep using the
// legacy ownerless pool.
export const join = mutation({
  args: {
    matchId: v.id("matches"),
    // Either a roster player picked from the list...
    playerId: v.optional(v.id("players")),
    // ...or a free-form name resolved against the match's player pool.
    nombre: v.optional(v.string()),
    estadoFisico: v.string(),
    tipoInscripcion: v.optional(v.string()),
    // "Tercer tiempo": staying after the match (birra / parri).
    seQueda: v.optional(v.boolean()),
    // Device token of whoever is inscribing, so they can later remove their
    // own inscriptions without an account.
    anonId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Partido no encontrado");

    let existing;
    if (args.playerId) {
      const picked = await ctx.db.get(args.playerId);
      if (!picked || picked.ownerId !== match.ownerId) {
        throw new Error("Ese jugador no pertenece al plantel de este partido");
      }
      existing = picked;
    } else {
      const nombre = (args.nombre ?? "").trim();
      if (nombre.length < 2) {
        throw new Error("El nombre debe tener al menos 2 caracteres");
      }

      const pool = await ctx.db
        .query("players")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", match.ownerId))
        .collect();
      existing = pool.find(
        (p) => p.nombre.toLowerCase() === nombre.toLowerCase()
      );

      if (!existing) {
        const playerId = await ctx.db.insert("players", {
          nombre,
          ownerId: match.ownerId,
          perfilPermanente: DEFAULT_PROFILE,
        });
        const registrationId = await ctx.db.insert("registrations", {
          partidoId: args.matchId,
          jugadorId: playerId,
          estadoFisico: args.estadoFisico,
          tipoInscripcion: args.tipoInscripcion || "jugador",
          seQueda: args.seQueda,
          creadoPor: args.anonId,
          confirmado: true,
          asistira: true,
          timestamp: new Date().toISOString(),
        });
        return { playerId, registrationId, reused: false };
      }
    }

    const playerId = existing._id;
    const existingReg = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId_jugadorId", (q) =>
        q.eq("partidoId", args.matchId).eq("jugadorId", playerId)
      )
      .first();
    if (existingReg) {
      if (existingReg.asistira) throw new Error("YA_INSCRITO");
      await ctx.db.patch(existingReg._id, {
        estadoFisico: args.estadoFisico,
        tipoInscripcion: args.tipoInscripcion || "jugador",
        seQueda: args.seQueda,
        // Re-stamp the creator on re-join so the re-inscriber owns it.
        creadoPor: args.anonId ?? existingReg.creadoPor,
        confirmado: true,
        asistira: true,
        timestamp: new Date().toISOString(),
      });
      return { playerId, registrationId: existingReg._id, reused: true };
    }

    const registrationId = await ctx.db.insert("registrations", {
      partidoId: args.matchId,
      jugadorId: playerId,
      estadoFisico: args.estadoFisico,
      tipoInscripcion: args.tipoInscripcion || "jugador",
      seQueda: args.seQueda,
      creadoPor: args.anonId,
      confirmado: true,
      asistira: true,
      timestamp: new Date().toISOString(),
    });

    return { playerId, registrationId, reused: Boolean(existing) };
  },
});

// Create a registration directly (admin flows like promoting a suplente).
// Owner-only on owned matches; open on ownerless ones.
export const create = mutation({
  args: {
    partidoId: v.id("matches"),
    jugadorId: v.id("players"),
    estadoFisico: v.string(),
    tipoInscripcion: v.optional(v.string()),
    confirmado: v.boolean(),
    asistira: v.boolean(),
    anonId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { anonId, ...fields } = args;

    const match = await ctx.db.get(args.partidoId);
    if (!match) throw new Error("Partido no encontrado");
    await assertCanManageMatch(ctx, match);

    // Check if registration already exists
    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId_jugadorId", (q) =>
        q.eq("partidoId", args.partidoId).eq("jugadorId", args.jugadorId)
      )
      .first();

    if (existing) {
      // Update existing registration
      await ctx.db.patch(existing._id, {
        estadoFisico: args.estadoFisico,
        tipoInscripcion: args.tipoInscripcion || 'jugador',
        confirmado: args.confirmado,
        asistira: args.asistira,
        timestamp: new Date().toISOString(),
      });
      return existing._id;
    }

    // Create new registration
    const registrationId = await ctx.db.insert("registrations", {
      ...fields,
      tipoInscripcion: args.tipoInscripcion || 'jugador',
      creadoPor: anonId,
      timestamp: new Date().toISOString(),
    });

    return registrationId;
  },
});

// Update an existing registration. Match owner (or anyone on an ownerless
// match), or the device that created the registration.
export const update = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
    estadoFisico: v.optional(v.string()),
    tipoInscripcion: v.optional(v.string()),
    confirmado: v.optional(v.boolean()),
    asistira: v.optional(v.boolean()),
    seQueda: v.optional(v.boolean()),
    anonId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { matchId, playerId, anonId, ...updates } = args;

    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Partido no encontrado");

    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId_jugadorId", (q) =>
        q.eq("partidoId", matchId).eq("jugadorId", playerId)
      )
      .first();

    if (!existing) {
      throw new Error("Registration not found");
    }

    if (!(await canManageRegistration(ctx, match, existing, anonId))) {
      throw new Error("NO_AUTORIZADO");
    }

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    
    await ctx.db.patch(existing._id, {
      ...filteredUpdates,
      timestamp: new Date().toISOString(),
    });
    
    return existing._id;
  },
});

// Remove a registration. Match owner (or anyone on an ownerless match), or the
// device that created it — so a player can leave themselves, but not others.
export const remove = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
    anonId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId_jugadorId", (q) =>
        q.eq("partidoId", args.matchId).eq("jugadorId", args.playerId)
      )
      .first();

    if (!existing) return;

    if (!(await canManageRegistration(ctx, match, existing, args.anonId))) {
      throw new Error("NO_AUTORIZADO");
    }

    await ctx.db.delete(existing._id);
  },
});

// Migration: Add tipoInscripcion to existing registrations
export const migrateAddTipoInscripcion = mutation({
  args: {},
  handler: async (ctx) => {
    const registrations = await ctx.db.query("registrations").collect();
    let updated = 0;
    
    for (const reg of registrations) {
      if (!reg.tipoInscripcion) {
        await ctx.db.patch(reg._id, {
          tipoInscripcion: 'jugador'
        });
        updated++;
      }
    }
    
    return { updated, total: registrations.length };
  },
});

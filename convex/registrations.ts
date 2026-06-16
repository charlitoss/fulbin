import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

// Create a new registration
export const create = mutation({
  args: {
    partidoId: v.id("matches"),
    jugadorId: v.id("players"),
    estadoFisico: v.string(),
    tipoInscripcion: v.optional(v.string()),
    confirmado: v.boolean(),
    asistira: v.boolean(),
  },
  handler: async (ctx, args) => {
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
      ...args,
      tipoInscripcion: args.tipoInscripcion || 'jugador',
      timestamp: new Date().toISOString(),
    });
    
    return registrationId;
  },
});

// Update an existing registration
export const update = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
    estadoFisico: v.optional(v.string()),
    tipoInscripcion: v.optional(v.string()),
    confirmado: v.optional(v.boolean()),
    asistira: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { matchId, playerId, ...updates } = args;
    
    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId_jugadorId", (q) => 
        q.eq("partidoId", matchId).eq("jugadorId", playerId)
      )
      .first();
    
    if (!existing) {
      throw new Error("Registration not found");
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

// Remove a registration
export const remove = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId_jugadorId", (q) => 
        q.eq("partidoId", args.matchId).eq("jugadorId", args.playerId)
      )
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
    }
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

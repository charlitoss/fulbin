import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Generate a short 6-character alphanumeric code for sharing
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// List all matches, ordered by creation time (newest first)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db.query("matches").order("desc").collect();
    return matches;
  },
});

// Get a single match by ID
export const getById = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

// Get a match by its short code (case-insensitive)
export const getByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    const normalizedCode = args.shortCode.toUpperCase();
    const match = await ctx.db
      .query("matches")
      .withIndex("by_codigoCorto", (q) => q.eq("codigoCorto", normalizedCode))
      .first();
    return match;
  },
});

// Create a new match
export const create = mutation({
  args: {
    nombre: v.string(),
    fecha: v.string(),
    horario: v.string(),
    ubicacion: v.string(),
    detallesUbicacion: v.optional(v.string()),
    cantidadJugadores: v.number(),
    jugadoresPorEquipo: v.number(),
    organizadorId: v.optional(v.string()),
    organizadorNombre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate a unique short code
    let codigoCorto = generateShortCode();
    let attempts = 0;
    
    // Check for collisions and regenerate if needed
    while (attempts < 100) {
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_codigoCorto", (q) => q.eq("codigoCorto", codigoCorto))
        .first();
      
      if (!existing) break;
      codigoCorto = generateShortCode();
      attempts++;
    }

    const now = new Date().toISOString();
    
    const matchId = await ctx.db.insert("matches", {
      ...args,
      codigoCorto,
      pasoActual: "inscripcion",
      linkCompartible: "",
      createdAt: now,
      updatedAt: now,
    });

    return matchId;
  },
});

// Update an existing match
export const update = mutation({
  args: {
    matchId: v.id("matches"),
    nombre: v.optional(v.string()),
    fecha: v.optional(v.string()),
    horario: v.optional(v.string()),
    ubicacion: v.optional(v.string()),
    detallesUbicacion: v.optional(v.string()),
    cantidadJugadores: v.optional(v.number()),
    jugadoresPorEquipo: v.optional(v.number()),
    pasoActual: v.optional(v.string()),
    linkCompartible: v.optional(v.string()),
    organizadorId: v.optional(v.string()),
    organizadorNombre: v.optional(v.string()),
    iniciadoEn: v.optional(v.number()),
    finalizadoEn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { matchId, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    
    await ctx.db.patch(matchId, {
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
    });
    
    return matchId;
  },
});

// Delete a match
export const remove = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.matchId);
  },
});

// Start a match: transitions pasoActual to 'jugando' and records the kickoff timestamp.
export const startMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.pasoActual !== "armado_equipos") return args.matchId;

    await ctx.db.patch(args.matchId, {
      pasoActual: "jugando",
      iniciadoEn: Date.now(),
      updatedAt: new Date().toISOString(),
    });

    return args.matchId;
  },
});

// Finish a match: transitions pasoActual to 'finalizado' and records the final whistle.
export const finishMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.pasoActual !== "jugando") return args.matchId;

    await ctx.db.patch(args.matchId, {
      pasoActual: "finalizado",
      finalizadoEn: Date.now(),
      updatedAt: new Date().toISOString(),
    });

    return args.matchId;
  },
});

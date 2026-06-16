import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all players
export const list = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    return players;
  },
});

// Get a single player by ID
export const getById = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.playerId);
  },
});

// Create a new player
export const create = mutation({
  args: {
    nombre: v.string(),
    avatar: v.optional(v.string()),
    perfilPermanente: v.optional(v.object({
      posicionPreferida: v.string(),
      posicionesSecundarias: v.array(v.string()),
      atributos: v.object({
        velocidad: v.number(),
        tecnica: v.number(),
        resistencia: v.number(),
        defensa: v.number(),
        ataque: v.number(),
        pase: v.number(),
      }),
      nivelGeneral: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const playerId = await ctx.db.insert("players", args);
    return playerId;
  },
});

// Update an existing player
export const update = mutation({
  args: {
    playerId: v.id("players"),
    nombre: v.optional(v.string()),
    avatar: v.optional(v.string()),
    perfilPermanente: v.optional(v.object({
      posicionPreferida: v.string(),
      posicionesSecundarias: v.array(v.string()),
      atributos: v.object({
        velocidad: v.number(),
        tecnica: v.number(),
        resistencia: v.number(),
        defensa: v.number(),
        ataque: v.number(),
        pase: v.number(),
      }),
      nivelGeneral: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { playerId, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    
    await ctx.db.patch(playerId, filteredUpdates);
    return playerId;
  },
});

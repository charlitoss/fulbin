import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { currentUserDoc } from "./users";

const perfilValidator = v.optional(v.object({
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
}));

export const DEFAULT_PROFILE = {
  posicionPreferida: "Mediocampista",
  posicionesSecundarias: [],
  atributos: {
    velocidad: 5,
    tecnica: 5,
    resistencia: 5,
    defensa: 5,
    ataque: 5,
    pase: 5,
  },
  nivelGeneral: 5,
};

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

// The signed-in admin's roster, alphabetical.
export const myRoster = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUserDoc(ctx);
    if (!user) return [];
    const players = await ctx.db
      .query("players")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    return players.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  },
});

// Create a player in the signed-in admin's roster.
export const createInRoster = mutation({
  args: {
    nombre: v.string(),
    avatar: v.optional(v.string()),
    perfilPermanente: perfilValidator,
  },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");

    const nombre = args.nombre.trim();
    if (nombre.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");

    const roster = await ctx.db
      .query("players")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
    if (roster.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw new Error(`Ya tenés un jugador llamado "${nombre}"`);
    }

    return await ctx.db.insert("players", {
      ...args,
      nombre,
      ownerId: user._id,
      perfilPermanente: args.perfilPermanente ?? DEFAULT_PROFILE,
    });
  },
});

// Remove a player from the roster. Players that already appear in matches
// keep their history and can't be deleted.
export const removeFromRoster = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");

    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Jugador no encontrado");
    if (player.ownerId !== user._id) throw new Error("Este jugador no es de tu plantel");

    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_jugadorId", (q) => q.eq("jugadorId", args.playerId))
      .first();
    if (registration) {
      throw new Error("CON_HISTORIAL");
    }

    await ctx.db.delete(args.playerId);
  },
});

// Create a new player (anonymous flow)
export const create = mutation({
  args: {
    nombre: v.string(),
    avatar: v.optional(v.string()),
    perfilPermanente: perfilValidator,
  },
  handler: async (ctx, args) => {
    const playerId = await ctx.db.insert("players", args);
    return playerId;
  },
});

// Update an existing player. Roster players can only be edited by their owner;
// ownerless (anonymous) players stay editable by anyone, as before.
export const update = mutation({
  args: {
    playerId: v.id("players"),
    nombre: v.optional(v.string()),
    avatar: v.optional(v.string()),
    perfilPermanente: perfilValidator,
  },
  handler: async (ctx, args) => {
    const { playerId, ...updates } = args;

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Jugador no encontrado");
    if (player.ownerId) {
      const user = await currentUserDoc(ctx);
      if (!user || user._id !== player.ownerId) {
        throw new Error("Este jugador no es de tu plantel");
      }
    }

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

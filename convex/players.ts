import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  currentUserDoc,
  ensureActiveGroupId,
  resolveActiveGroupId,
} from "./users";
import { isGroupMember } from "./permissions";

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

// True if the caller may manage this roster player: any member of its group,
// or (legacy ungrouped) its owner. Ownerless pool players have no roster to
// manage — archive/delete stays closed for them (update handles its own
// anyone-can-edit-ownerless rule).
async function canManagePlayer(
  ctx: QueryCtx,
  player: Doc<"players">
): Promise<boolean> {
  if (player.groupId) return await isGroupMember(ctx, player.groupId);
  if (!player.ownerId) return false;
  const user = await currentUserDoc(ctx);
  return !!user && !user.deshabilitado && user._id === player.ownerId;
}

// The active group's roster, alphabetical.
export const myRoster = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUserDoc(ctx);
    if (!user) return [];
    const groupId = await resolveActiveGroupId(ctx, user);
    if (!groupId) return [];
    const players = await ctx.db
      .query("players")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
    return players.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  },
});

// The signed-in user's own player profile (linked via users.playerId),
// creating one in their roster on first access. Returns the player id.
export const ensureMyProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");

    if (user.playerId) {
      const existing = await ctx.db.get(user.playerId);
      if (existing) return existing._id;
    }

    const groupId = await ensureActiveGroupId(ctx, user);
    const playerId = await ctx.db.insert("players", {
      nombre: user.nombre,
      ownerId: user._id,
      groupId,
      perfilPermanente: DEFAULT_PROFILE,
    });
    await ctx.db.patch(user._id, { playerId });
    return playerId;
  },
});

// The signed-in user's self player id (or null), for the profile page.
export const myProfileId = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUserDoc(ctx);
    return user?.playerId ?? null;
  },
});

// Roster players of the match's group who aren't registered yet — the
// quick-select list in the join modal. Anyone with the match link can see
// it (the link is the group's trust boundary). Empty for unowned matches.
export const availableForMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || (!match.groupId && !match.ownerId)) return [];

    const roster = match.groupId
      ? await ctx.db
          .query("players")
          .withIndex("by_groupId", (q) => q.eq("groupId", match.groupId))
          .collect()
      : await ctx.db
          .query("players")
          .withIndex("by_ownerId", (q) => q.eq("ownerId", match.ownerId))
          .collect();
    const regs = await ctx.db
      .query("registrations")
      .withIndex("by_partidoId", (q) => q.eq("partidoId", args.matchId))
      .collect();
    const registered = new Set(regs.filter((r) => r.asistira).map((r) => r.jugadorId));

    return roster
      .filter((p) => p.activo !== false && !registered.has(p._id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map((p) => ({
        _id: p._id,
        nombre: p.nombre,
        posicion: p.perfilPermanente?.posicionPreferida,
        nivel: p.perfilPermanente?.nivelGeneral,
      }));
  },
});

// Create a player in the active group's roster.
export const createInRoster = mutation({
  args: {
    nombre: v.string(),
    avatar: v.optional(v.string()),
    perfilPermanente: perfilValidator,
  },
  handler: async (ctx, args) => {
    const user = await currentUserDoc(ctx);
    if (!user) throw new Error("Necesitás iniciar sesión");
    if (user.deshabilitado) throw new Error("CUENTA_DESHABILITADA");

    const nombre = args.nombre.trim();
    if (nombre.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres");

    const groupId = await ensureActiveGroupId(ctx, user);
    const roster = await ctx.db
      .query("players")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
    if (roster.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw new Error(`Ya tenés un jugador llamado "${nombre}"`);
    }

    return await ctx.db.insert("players", {
      ...args,
      nombre,
      ownerId: user._id,
      groupId,
      perfilPermanente: args.perfilPermanente ?? DEFAULT_PROFILE,
    });
  },
});

// Archive or reactivate a roster player. Archived players (activo === false)
// drop out of the default roster and the match quick-select but keep their
// history and standings points. Use this when delete is blocked by CON_HISTORIAL.
export const setPlayerActive = mutation({
  args: { playerId: v.id("players"), activo: v.boolean() },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Jugador no encontrado");
    if (!(await canManagePlayer(ctx, player))) {
      throw new Error("Este jugador no es de tu plantel");
    }

    await ctx.db.patch(args.playerId, { activo: args.activo });
    return args.playerId;
  },
});

// Remove a player from the roster. Players that already appear in matches
// keep their history and can't be deleted.
export const removeFromRoster = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Jugador no encontrado");
    if (!(await canManagePlayer(ctx, player))) {
      throw new Error("Este jugador no es de tu plantel");
    }

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

// Update an existing player. Roster players can be edited by any member of
// their group (or, legacy ungrouped, their owner); the player who inscribed
// via this device can also edit their own profile (pass anonId + matchId —
// checked against the registration's creator). Ownerless (anonymous) players
// stay editable by anyone, as before.
export const update = mutation({
  args: {
    playerId: v.id("players"),
    nombre: v.optional(v.string()),
    avatar: v.optional(v.string()),
    perfilPermanente: perfilValidator,
    anonId: v.optional(v.string()),
    matchId: v.optional(v.id("matches")),
  },
  handler: async (ctx, args) => {
    const { playerId, anonId, matchId, ...updates } = args;

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Jugador no encontrado");
    if (player.groupId || player.ownerId) {
      const isManager = await canManagePlayer(ctx, player);
      let isSelf = false;
      if (!isManager && anonId && matchId) {
        const reg = await ctx.db
          .query("registrations")
          .withIndex("by_partidoId_jugadorId", (q) =>
            q.eq("partidoId", matchId).eq("jugadorId", playerId)
          )
          .first();
        isSelf = !!reg && reg.creadoPor === anonId;
      }
      if (!isManager && !isSelf) {
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

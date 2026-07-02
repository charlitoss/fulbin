import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    workosId: v.string(),
    nombre: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
    // The user's own player profile (so the balancer can include them).
    playerId: v.optional(v.id("players")),
    // The group the UI/server currently operates in (which group new matches,
    // tournaments and roster edits belong to). Falls back to the owner group.
    activeGroupId: v.optional(v.id("groups")),
    // Set by a super-admin to block this account from creating/managing matches.
    deshabilitado: v.optional(v.boolean()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_workosId", ["workosId"]),

  // A co-managed space: one shared roster, its tournaments and its matches.
  // Several accounts can manage a group; membership is the authorization key
  // (see memberships). Every existing user gets a personal group on migration.
  groups: defineTable({
    nombre: v.string(),
    // The account that created the group: can manage members and delete it.
    ownerId: v.id("users"),
    // Shareable code to invite co-admins (same alphabet as match codes).
    // Absent once revoked; rotate to invalidate an old link.
    inviteCode: v.optional(v.string()),
    // Unguessable read key for the public standings/results page. Longer than
    // the invite code because it grants unauthenticated read access.
    publicToken: v.optional(v.string()),
    // Opt-in: the public page only resolves when this is true.
    publico: v.optional(v.boolean()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_inviteCode", ["inviteCode"])
    .index("by_publicToken", ["publicToken"]),

  // Maps a user to a group with a role. Exactly one 'owner' row per group;
  // any membership = may manage the group's matches/roster/tournaments;
  // 'owner' additionally manages membership and can delete the group.
  memberships: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    rol: v.string(), // 'owner' | 'admin'
    createdAt: v.string(),
  })
    .index("by_groupId", ["groupId"])
    .index("by_userId", ["userId"])
    .index("by_groupId_userId", ["groupId", "userId"]),

  tournaments: defineTable({
    ownerId: v.id("users"),
    // The group this season belongs to. Optional for a clean deploy; the
    // backfill stamps it on every existing tournament, after which reads
    // switch from by_ownerId to by_groupId.
    groupId: v.optional(v.id("groups")),
    nombre: v.string(),
    activo: v.boolean(),
    createdAt: v.string(),
    // Set when the admin ends the season; presence = finalized (no longer active).
    finalizadoEn: v.optional(v.string()),
    // Frozen winner — top of the table at the moment it was finalized.
    campeon: v.optional(v.object({
      playerId: v.id("players"),
      nombre: v.string(),
      puntos: v.number(),
    })),
    // Count of finished matches at finalize time (frozen alongside the table).
    partidosFinal: v.optional(v.number()),
    // Frozen final standings snapshot so later match edits can't shift history.
    tablaFinal: v.optional(v.array(v.object({
      playerId: v.id("players"),
      nombre: v.string(),
      pj: v.number(),
      pg: v.number(),
      pe: v.number(),
      pp: v.number(),
      goles: v.number(),
      puntos: v.number(),
    }))),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_groupId", ["groupId"]),

  matches: defineTable({
    // Using a string id field for backwards compatibility with existing routes
    codigoCorto: v.string(),
    nombre: v.string(),
    fecha: v.string(),
    horario: v.string(),
    ubicacion: v.string(),
    detallesUbicacion: v.optional(v.string()),
    cantidadJugadores: v.number(),
    jugadoresPorEquipo: v.number(),
    pasoActual: v.string(), // 'inscripcion' | 'armado_equipos' | 'jugando' | 'finalizado'
    linkCompartible: v.optional(v.string()),
    // Owner with an account. Legacy organizadorId/organizadorNombre stay as
    // free-form strings for matches created anonymously.
    ownerId: v.optional(v.id("users")),
    // The group this match belongs to (and whose stats it counts toward).
    // Absent = anonymous/open match, exactly as before; set = group-managed.
    groupId: v.optional(v.id("groups")),
    // Season this match counts toward (the owner's active tournament at
    // creation time). Null matches show under "Todos".
    tournamentId: v.optional(v.id("tournaments")),
    organizadorId: v.optional(v.string()),
    organizadorNombre: v.optional(v.string()),
    iniciadoEn: v.optional(v.number()),
    finalizadoEn: v.optional(v.number()),
    // Final score snapshot, taken from the team configuration at the final
    // whistle so later edits to teams can't rewrite history.
    resultado: v.optional(v.object({
      golesBlanco: v.number(),
      golesOscuro: v.number(),
      nombreBlanco: v.optional(v.string()),
      nombreOscuro: v.optional(v.string()),
    })),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_codigoCorto", ["codigoCorto"])
    .index("by_ownerId", ["ownerId"])
    .index("by_groupId", ["groupId"]),

  players: defineTable({
    nombre: v.string(),
    avatar: v.optional(v.string()),
    // Roster owner. Players created in an owned match belong to that admin's
    // roster; ownerless players are the legacy/anonymous global pool.
    ownerId: v.optional(v.id("users")),
    // The group this player's roster entry belongs to. A player belongs to one
    // group (per-group rosters). Absent = legacy/anonymous global pool.
    groupId: v.optional(v.id("groups")),
    // Archived players drop out of the default roster and the match quick-select
    // but keep their history. Absent/true = active; false = archived.
    activo: v.optional(v.boolean()),
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
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_groupId", ["groupId"]),

  registrations: defineTable({
    partidoId: v.id("matches"),
    jugadorId: v.id("players"),
    estadoFisico: v.string(), // 'excelente' | 'normal' | 'cansado'
    tipoInscripcion: v.optional(v.string()), // 'jugador' | 'suplente' | 'hinchada'
    // "Tercer tiempo": the player is staying after the match (birra / parri).
    // Absent = not staying. (Feature lives on the post-game-hangout branch;
    // declared here too so both branches validate against the shared dev data.)
    seQueda: v.optional(v.boolean()),
    // Anonymous device token of whoever created this registration, so a player
    // who inscribed can remove themselves (but not others) without an account.
    // Absent on legacy rows — those can only be removed by the match owner.
    creadoPor: v.optional(v.string()),
    timestamp: v.string(),
    confirmado: v.boolean(),
    asistira: v.boolean(),
  })
    .index("by_partidoId", ["partidoId"])
    .index("by_partidoId_jugadorId", ["partidoId", "jugadorId"])
    .index("by_jugadorId", ["jugadorId"]),

  teamConfigurations: defineTable({
    partidoId: v.id("matches"),
    nombreEquipoBlanco: v.string(),
    nombreEquipoOscuro: v.string(),
    asignaciones: v.array(v.object({
      jugadorId: v.id("players"),
      equipo: v.string(), // 'blanco' | 'oscuro'
      rol: v.string(), // 'arquero' | 'defensor' | 'medio' | 'delantero'
      posicion: v.optional(v.string()),
      coordenadaX: v.optional(v.number()),
      coordenadaY: v.optional(v.number()),
      goles: v.optional(v.number()),
    })),
    formacionEquipoBlanco: v.string(),
    formacionEquipoOscuro: v.string(),
    version: v.number(),
    createdBy: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_partidoId", ["partidoId"]),
});

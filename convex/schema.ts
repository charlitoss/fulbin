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
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_workosId", ["workosId"]),

  tournaments: defineTable({
    ownerId: v.id("users"),
    nombre: v.string(),
    activo: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_ownerId", ["ownerId"]),

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
    .index("by_ownerId", ["ownerId"]),

  players: defineTable({
    nombre: v.string(),
    avatar: v.optional(v.string()),
    // Roster owner. Players created in an owned match belong to that admin's
    // roster; ownerless players are the legacy/anonymous global pool.
    ownerId: v.optional(v.id("users")),
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
    .index("by_ownerId", ["ownerId"]),

  registrations: defineTable({
    partidoId: v.id("matches"),
    jugadorId: v.id("players"),
    estadoFisico: v.string(), // 'excelente' | 'normal' | 'cansado'
    tipoInscripcion: v.optional(v.string()), // 'jugador' | 'suplente' | 'hinchada'
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

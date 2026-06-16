import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    organizadorId: v.optional(v.string()),
    organizadorNombre: v.optional(v.string()),
    iniciadoEn: v.optional(v.number()),
    finalizadoEn: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_codigoCorto", ["codigoCorto"]),

  players: defineTable({
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
  }),

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
    .index("by_partidoId_jugadorId", ["partidoId", "jugadorId"]),

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

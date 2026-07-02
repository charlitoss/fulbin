import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateShortCode } from "./codes";

// Helper to get next Saturday's date
function getNextSaturday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  return nextSaturday.toISOString().split('T')[0];
}

// Helper to get next Sunday's date
function getNextSunday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  return nextSunday.toISOString().split('T')[0];
}

// Seed the database with sample data
export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingMatches = await ctx.db.query("matches").first();
    if (existingMatches) {
      return { success: false, message: "Database already has data" };
    }

    const now = new Date().toISOString();

    // Sample players with varied profiles (10 players for 5v5)
    const samplePlayers = [
      {
        nombre: 'Juan Pérez',
        perfilPermanente: {
          posicionPreferida: 'Mediocampista',
          posicionesSecundarias: ['Delantero'],
          atributos: { velocidad: 8, tecnica: 7, resistencia: 6, defensa: 5, ataque: 7, pase: 8 },
          nivelGeneral: 6.8
        }
      },
      {
        nombre: 'María García',
        perfilPermanente: {
          posicionPreferida: 'Delantero',
          posicionesSecundarias: ['Mediocampista'],
          atributos: { velocidad: 9, tecnica: 8, resistencia: 7, defensa: 4, ataque: 9, pase: 6 },
          nivelGeneral: 7.2
        }
      },
      {
        nombre: 'Carlos Rodríguez',
        perfilPermanente: {
          posicionPreferida: 'Defensor',
          posicionesSecundarias: ['Mediocampista'],
          atributos: { velocidad: 6, tecnica: 5, resistencia: 8, defensa: 9, ataque: 4, pase: 6 },
          nivelGeneral: 6.3
        }
      },
      {
        nombre: 'Ana Martínez',
        perfilPermanente: {
          posicionPreferida: 'Arquero',
          posicionesSecundarias: [],
          atributos: { velocidad: 5, tecnica: 6, resistencia: 7, defensa: 8, ataque: 3, pase: 7 },
          nivelGeneral: 6.0
        }
      },
      {
        nombre: 'Luis Sánchez',
        perfilPermanente: {
          posicionPreferida: 'Mediocampista',
          posicionesSecundarias: ['Defensor'],
          atributos: { velocidad: 7, tecnica: 8, resistencia: 8, defensa: 6, ataque: 6, pase: 9 },
          nivelGeneral: 7.3
        }
      },
      {
        nombre: 'Laura Torres',
        perfilPermanente: {
          posicionPreferida: 'Delantero',
          posicionesSecundarias: [],
          atributos: { velocidad: 9, tecnica: 7, resistencia: 6, defensa: 3, ataque: 8, pase: 5 },
          nivelGeneral: 6.3
        }
      },
      {
        nombre: 'Diego Ramírez',
        perfilPermanente: {
          posicionPreferida: 'Arquero',
          posicionesSecundarias: ['Defensor'],
          atributos: { velocidad: 4, tecnica: 5, resistencia: 7, defensa: 9, ataque: 2, pase: 6 },
          nivelGeneral: 5.5
        }
      },
      {
        nombre: 'Sofia Morales',
        perfilPermanente: {
          posicionPreferida: 'Mediocampista',
          posicionesSecundarias: ['Delantero'],
          atributos: { velocidad: 7, tecnica: 8, resistencia: 7, defensa: 5, ataque: 7, pase: 8 },
          nivelGeneral: 7.0
        }
      },
      {
        nombre: 'Pedro López',
        perfilPermanente: {
          posicionPreferida: 'Defensor',
          posicionesSecundarias: ['Mediocampista'],
          atributos: { velocidad: 5, tecnica: 6, resistencia: 9, defensa: 8, ataque: 4, pase: 7 },
          nivelGeneral: 6.5
        }
      },
      {
        nombre: 'Valentina Castro',
        perfilPermanente: {
          posicionPreferida: 'Delantero',
          posicionesSecundarias: ['Mediocampista'],
          atributos: { velocidad: 8, tecnica: 7, resistencia: 6, defensa: 4, ataque: 8, pase: 6 },
          nivelGeneral: 6.5
        }
      }
    ];

    // Insert players and store their IDs
    const playerIds: string[] = [];
    for (const player of samplePlayers) {
      const id = await ctx.db.insert("players", player);
      playerIds.push(id);
    }

    // Create sample match in inscription phase
    const codigoCorto1 = generateShortCode();
    const match1Id = await ctx.db.insert("matches", {
      codigoCorto: codigoCorto1,
      nombre: 'Partido del Sábado',
      fecha: getNextSaturday(),
      horario: '15:00',
      ubicacion: 'Cancha Los Pinos, Av. Libertador 1234',
      detallesUbicacion: 'Entrar por la puerta trasera',
      cantidadJugadores: 10,
      jugadoresPorEquipo: 5,
      pasoActual: 'inscripcion',
      linkCompartible: '',
      organizadorId: playerIds[0],
      organizadorNombre: 'Juan Pérez',
      createdAt: now,
      updatedAt: now
    });

    // Create sample match ready for team building
    const codigoCorto2 = generateShortCode();
    const match2Id = await ctx.db.insert("matches", {
      codigoCorto: codigoCorto2,
      nombre: 'Clásico Mensual',
      fecha: getNextSunday(),
      horario: '10:00',
      ubicacion: 'Club Deportivo Central, Calle 50 #123',
      detallesUbicacion: 'Cancha 2, traer pechera',
      cantidadJugadores: 10,
      jugadoresPorEquipo: 5,
      pasoActual: 'armado_equipos',
      linkCompartible: '',
      organizadorId: playerIds[0],
      organizadorNombre: 'Juan Pérez',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: now
    });

    // Create registrations for inscription match (4 players)
    const inscriptionRegistrations = [
      { jugadorId: playerIds[0], estadoFisico: 'normal' },
      { jugadorId: playerIds[1], estadoFisico: 'excelente' },
      { jugadorId: playerIds[2], estadoFisico: 'cansado' },
      { jugadorId: playerIds[3], estadoFisico: 'normal' }
    ];

    for (const reg of inscriptionRegistrations) {
      await ctx.db.insert("registrations", {
        partidoId: match1Id,
        jugadorId: reg.jugadorId as any,
        estadoFisico: reg.estadoFisico,
        tipoInscripcion: 'jugador',
        timestamp: now,
        confirmado: true,
        asistira: true
      });
    }

    // Create registrations for team builder match (all 10 players)
    const teamBuilderRegistrations = [
      { jugadorId: playerIds[0], estadoFisico: 'excelente' },
      { jugadorId: playerIds[1], estadoFisico: 'excelente' },
      { jugadorId: playerIds[2], estadoFisico: 'normal' },
      { jugadorId: playerIds[3], estadoFisico: 'normal' },
      { jugadorId: playerIds[4], estadoFisico: 'excelente' },
      { jugadorId: playerIds[5], estadoFisico: 'cansado' },
      { jugadorId: playerIds[6], estadoFisico: 'normal' },
      { jugadorId: playerIds[7], estadoFisico: 'excelente' },
      { jugadorId: playerIds[8], estadoFisico: 'normal' },
      { jugadorId: playerIds[9], estadoFisico: 'cansado' }
    ];

    for (const reg of teamBuilderRegistrations) {
      await ctx.db.insert("registrations", {
        partidoId: match2Id,
        jugadorId: reg.jugadorId as any,
        estadoFisico: reg.estadoFisico,
        tipoInscripcion: 'jugador',
        timestamp: now,
        confirmado: true,
        asistira: true
      });
    }

    return { 
      success: true, 
      message: "Sample data created successfully",
      matches: [match1Id, match2Id],
      players: playerIds.length
    };
  },
});

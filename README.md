# Fulbin ⚽

Una aplicación web para organizar partidos de fútbol con amigos de manera fácil y rápida.

## Características

### Gestión de Partidos
- **Crear partidos** con fecha, hora, ubicación y formato (5v5, 6v6, 7v7, etc.)
- **Edición en línea** de todos los detalles del partido
- **Compartir link** para que los amigos se inscriban
- **Contador regresivo** hasta el inicio del partido

### Inscripción de Jugadores
- Inscribirse como **Jugador**, **Suplente** o **Hinchada**
- Indicar **estado físico** (Excelente 💪, Normal 😐, Cansado 😫)
- Agregar amigos en la misma inscripción
- Barra de progreso mostrando cupos disponibles

### Armado de Equipos
- **Visualización en cancha** con posiciones de jugadores
- **Drag & drop** para mover jugadores en el campo
- **Balance automático** de equipos según nivel y estado físico
- **Asignación de roles**: Arquero, Defensor, Mediocampista, Delantero
- **Paneles laterales** mostrando cada equipo con sus jugadores
- **Indicador de balance** comparando fuerza de equipos

### Gestión de Suplentes
- Lista de suplentes ordenada por orden de inscripción
- **Promoción automática** cuando un jugador se retira
- Promoción manual de suplentes al equipo

## Tecnologías

- **React 18** - UI library
- **Vite** - Build tool y dev server
- **Lucide React** - Iconos
- **LocalStorage** - Persistencia de datos
- **CSS Variables** - Sistema de diseño consistente

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/charlitoss/hoy-juego.git
cd hoy-juego

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera build de producción |
| `npm run preview` | Preview del build de producción |

## Estructura del Proyecto

```
src/
├── App.jsx                 # Router principal (hash-based)
├── main.jsx               # Entry point
├── components/
│   ├── match/
│   │   ├── MatchList.jsx          # Lista de partidos
│   │   ├── MatchCard.jsx          # Card de partido
│   │   ├── MatchPage.jsx          # Página de detalle
│   │   ├── CreateMatchForm.jsx    # Formulario de creación
│   │   ├── EditableMatchHeader.jsx # Header editable
│   │   ├── InscriptionStep.jsx    # Paso de inscripción
│   │   ├── TeamBuilderStep.jsx    # Paso de armado de equipos
│   │   ├── TeamPanel.jsx          # Panel lateral de equipo
│   │   ├── SoccerField.jsx        # Cancha con jugadores
│   │   ├── BalanceIndicator.jsx   # Indicador de balance
│   │   ├── SuplentesPanel.jsx     # Panel de suplentes
│   │   ├── HinchadaPanel.jsx      # Panel de hinchada
│   │   ├── AssignPlayerModal.jsx  # Modal de asignación
│   │   └── PlayerListPanel.jsx    # Lista de jugadores
│   ├── player/
│   │   ├── JoinMatchModal.jsx     # Modal de inscripción
│   │   ├── PlayerCard.jsx         # Card de jugador
│   │   └── PlayerInfoModal.jsx    # Modal de info de jugador
│   └── ui/
│       ├── Modal.jsx              # Componente modal base
│       ├── ShareButton.jsx        # Botón compartir
│       ├── Countdown.jsx          # Contador regresivo
│       └── ProgressBar.jsx        # Barra de progreso
├── utils/
│   ├── storage.js         # Utilidades de LocalStorage
│   ├── teamBalancer.js    # Algoritmo de balance de equipos
│   ├── dateUtils.js       # Formateo de fechas
│   ├── constants.js       # Constantes (estados, roles, etc.)
│   └── initSampleData.js  # Datos de ejemplo
└── styles/
    └── global.css         # Estilos globales
```

## Modelo de Datos

### Partido (Match)
```javascript
{
  id: string,
  nombre: string,
  fecha: string,           // ISO date
  horario: string,         // "HH:mm"
  ubicacion: string,
  detallesUbicacion: string,
  cantidadJugadores: number,
  jugadoresPorEquipo: number,
  pasoActual: 'inscripcion' | 'armado_equipos' | 'finalizado',
  linkCompartible: string,
  organizadorId: string,
  organizadorNombre: string
}
```

### Jugador (Player)
```javascript
{
  id: string,
  nombre: string,
  avatar: string | null,
  perfilPermanente: {
    posicionPreferida: string,
    posicionesSecundarias: string[],
    atributos: {
      velocidad: number,    // 1-10
      tecnica: number,
      resistencia: number,
      defensa: number,
      ataque: number,
      pase: number
    },
    nivelGeneral: number
  }
}
```

### Inscripción (Registration)
```javascript
{
  jugadorId: string,
  partidoId: string,
  estadoFisico: 'excelente' | 'normal' | 'cansado',
  tipoInscripcion: 'jugador' | 'suplente' | 'hinchada',
  timestamp: string,       // ISO datetime - usado para ordenar
  confirmado: boolean,
  asistira: boolean
}
```

### Configuración de Equipos (TeamConfig)
```javascript
{
  partidoId: string,
  nombreEquipoBlanco: string,
  nombreEquipoOscuro: string,
  asignaciones: [{
    jugadorId: string,
    equipo: 'blanco' | 'oscuro',
    rol: 'arquero' | 'defensor' | 'medio' | 'delantero',
    coordenadaX: number,   // 0-100 (posición en cancha)
    coordenadaY: number
  }]
}
```

## Flujo de la Aplicación

```
┌─────────────────┐
│   Lista de      │
│   Partidos      │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Crear  │
    │ Partido │
    └────┬────┘
         │
┌────────▼────────┐
│   Inscripción   │◄──── Jugadores se inscriben
│   de Jugadores  │      via link compartido
└────────┬────────┘
         │
         │ (cuando hay suficientes jugadores)
         │
┌────────▼────────┐
│   Armado de     │
│   Equipos       │
└────────┬────────┘
         │
┌────────▼────────┐
│   Partido       │
│   Finalizado    │
└─────────────────┘
```

## Algoritmo de Balance

El sistema balancea automáticamente los equipos considerando:

1. **Nivel general** del jugador (promedio de atributos)
2. **Estado físico** del día:
   - Excelente: factor 1.3x
   - Normal: factor 1.0x
   - Cansado: factor 0.6x
3. **Distribución de roles** (arqueros, defensores, etc.)

## Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

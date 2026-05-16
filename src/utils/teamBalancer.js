/**
 * Team balancing algorithm
 * Uses snake draft to create balanced teams based on player skill levels
 * and position-weighted attributes
 */

import { PHYSICAL_STATES } from './constants'

/**
 * Position-specific attribute weights
 * Each position values different attributes differently
 */
const POSITION_WEIGHTS = {
  arquero: {
    defensa: 0.35,
    resistencia: 0.25,
    tecnica: 0.20,
    velocidad: 0.10,
    pase: 0.10
  },
  defensor: {
    defensa: 0.35,
    resistencia: 0.25,
    velocidad: 0.15,
    pase: 0.15,
    tecnica: 0.10
  },
  medio: {
    pase: 0.25,
    tecnica: 0.25,
    resistencia: 0.20,
    defensa: 0.15,
    ataque: 0.15
  },
  delantero: {
    ataque: 0.35,
    velocidad: 0.25,
    tecnica: 0.20,
    pase: 0.10,
    resistencia: 0.10
  }
}

/**
 * Calculate position-weighted level based on player attributes and role
 * @param {Object} player - Player object with perfilPermanente.atributos
 * @param {string} role - The role/position being evaluated
 * @returns {number} Weighted level for that position (1-10 scale)
 */
function calculatePositionWeightedLevel(player, role) {
  const attrs = player?.perfilPermanente?.atributos || {}
  const weights = POSITION_WEIGHTS[role] || POSITION_WEIGHTS.medio
  
  let weightedLevel = 0
  for (const [attr, weight] of Object.entries(weights)) {
    // Default attribute value is 5 if not set
    weightedLevel += (attrs[attr] || 5) * weight
  }
  
  return weightedLevel
}

/**
 * Calculate effective level based on player profile, role, and physical state
 * Uses position-weighted attributes for more accurate balancing
 */
export function calculateEffectiveLevel(player, registration, role = null) {
  // If role is provided, use position-weighted calculation
  if (role) {
    const positionLevel = calculatePositionWeightedLevel(player, role)
    const physicalState = PHYSICAL_STATES[registration?.estadoFisico] || PHYSICAL_STATES.normal
    return positionLevel * physicalState.factor
  }
  
  // Fallback to general level if no role specified
  const baseLevel = player?.perfilPermanente?.nivelGeneral || 5
  const physicalState = PHYSICAL_STATES[registration?.estadoFisico] || PHYSICAL_STATES.normal
  return baseLevel * physicalState.factor
}

/**
 * Field is rendered landscape: blanco = left half (x: 0-50), oscuro = right
 * half (x: 50-100). Each role sits at a fixed depth (X) and players in the
 * same role are spread evenly along the short axis (Y).
 *
 * Combined with the role distribution from getIdealDistribution, this yields
 * traditional formations: 1-1-2-1 (5), 1-2-2-1 (6), 1-2-3-1 (7), 1-3-3-1 (8),
 * 1-3-3-2 (9), 1-4-4-2 (11).
 */
const FORMATION_DEPTH = {
  arquero: 5,
  defensor: 18,
  medio: 33,
  delantero: 45,
}

function spreadAlongY(index, total) {
  if (total <= 1) return 50
  const pad = 18
  const step = (100 - pad * 2) / (total - 1)
  return pad + step * index
}

export function getDefaultPosition(role, team, index, totalInRole = 1) {
  const depth = FORMATION_DEPTH[role] ?? FORMATION_DEPTH.medio
  const isBlanco = team === 'blanco'
  const x = isBlanco ? depth : 100 - depth
  const y = spreadAlongY(index, totalInRole)
  return { x, y }
}

/**
 * Map player's preferred position to a role
 */
function getPreferredRole(player) {
  const position = player?.perfilPermanente?.posicionPreferida?.toLowerCase() || ''
  
  if (position.includes('arquero')) return 'arquero'
  if (position.includes('defens')) return 'defensor'
  if (position.includes('medio') || position.includes('mediocampista')) return 'medio'
  if (position.includes('delant')) return 'delantero'
  
  return 'medio' // Default
}

/**
 * Generate balanced teams using snake draft algorithm
 * @param {Array} players - Array of player objects
 * @param {Array} registrations - Array of registration objects
 * @param {number} playersPerTeam - Number of players per team
 * @returns {Array} Array of player assignments
 */
export function generateBalancedTeams(players, registrations, playersPerTeam) {
  // Create player data with effective levels based on their preferred position
  const playerData = players.map(player => {
    // Support both _id (Convex) and id (legacy) formats
    const playerId = player._id || player.id
    const registration = registrations.find(r => r.jugadorId === playerId)
    const preferredRole = getPreferredRole(player)
    return {
      player,
      playerId,
      registration,
      // Calculate level based on their preferred position's attributes
      effectiveLevel: calculateEffectiveLevel(player, registration, preferredRole),
      preferredRole
    }
  })
  
  // Separate goalkeepers from field players
  const goalkeepers = playerData.filter(p => p.preferredRole === 'arquero')
  const fieldPlayers = playerData.filter(p => p.preferredRole !== 'arquero')
  
  // Sort by effective level (highest first)
  goalkeepers.sort((a, b) => b.effectiveLevel - a.effectiveLevel)
  fieldPlayers.sort((a, b) => b.effectiveLevel - a.effectiveLevel)
  
  const assignments = []
  const teamBlanco = { players: [], totalLevel: 0 }
  const teamOscuro = { players: [], totalLevel: 0 }
  
  // Assign goalkeepers first (one per team)
  if (goalkeepers.length >= 2) {
    // Give better goalkeeper to team that will be weaker
    teamBlanco.players.push({ ...goalkeepers[0], role: 'arquero', team: 'blanco' })
    teamBlanco.totalLevel += goalkeepers[0].effectiveLevel
    
    teamOscuro.players.push({ ...goalkeepers[1], role: 'arquero', team: 'oscuro' })
    teamOscuro.totalLevel += goalkeepers[1].effectiveLevel
  } else if (goalkeepers.length === 1) {
    // Only one goalkeeper - assign to blanco
    teamBlanco.players.push({ ...goalkeepers[0], role: 'arquero', team: 'blanco' })
    teamBlanco.totalLevel += goalkeepers[0].effectiveLevel
  }
  
  // Snake draft for field players
  let direction = teamBlanco.totalLevel <= teamOscuro.totalLevel ? 'blanco' : 'oscuro'
  
  fieldPlayers.forEach((playerData, index) => {
    const blancoFull = teamBlanco.players.length >= playersPerTeam
    const oscuroFull = teamOscuro.players.length >= playersPerTeam
    
    let targetTeam
    if (blancoFull && !oscuroFull) {
      targetTeam = teamOscuro
      direction = 'oscuro'
    } else if (oscuroFull && !blancoFull) {
      targetTeam = teamBlanco
      direction = 'blanco'
    } else if (direction === 'blanco') {
      targetTeam = teamBlanco
      direction = 'oscuro'
    } else {
      targetTeam = teamOscuro
      direction = 'blanco'
    }
    
    // Determine role based on team needs and player preference
    const role = determineRole(targetTeam, playerData.preferredRole, playersPerTeam)
    
    targetTeam.players.push({
      ...playerData,
      role,
      team: targetTeam === teamBlanco ? 'blanco' : 'oscuro'
    })
    targetTeam.totalLevel += playerData.effectiveLevel
  })
  
  // Convert to assignment format with positions
  const roleCounts = { blanco: {}, oscuro: {} }
  const roleTotals = {
    blanco: countByRole(teamBlanco.players),
    oscuro: countByRole(teamOscuro.players),
  }

  ;[...teamBlanco.players, ...teamOscuro.players].forEach(p => {
    const team = p.team
    roleCounts[team][p.role] = (roleCounts[team][p.role] || 0)

    const position = getDefaultPosition(
      p.role,
      team,
      roleCounts[team][p.role],
      roleTotals[team][p.role]
    )
    roleCounts[team][p.role]++

    assignments.push({
      jugadorId: p.playerId,
      equipo: team,
      rol: p.role,
      coordenadaX: position.x,
      coordenadaY: position.y
    })
  })
  
  return assignments
}

/**
 * Determine the best role for a player based on team needs
 */
function determineRole(team, preferredRole, playersPerTeam) {
  const currentRoles = team.players.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1
    return acc
  }, {})
  
  // Ideal distribution for different team sizes
  const idealDistribution = getIdealDistribution(playersPerTeam)
  
  // Check if preferred role is available
  if ((currentRoles[preferredRole] || 0) < idealDistribution[preferredRole]) {
    return preferredRole
  }
  
  // Find a role that needs players
  const roleOrder = ['medio', 'defensor', 'delantero', 'arquero']
  for (const role of roleOrder) {
    if ((currentRoles[role] || 0) < idealDistribution[role]) {
      return role
    }
  }
  
  return preferredRole
}

/**
 * Get ideal role distribution based on team size
 */
function countByRole(players) {
  return players.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1
    return acc
  }, {})
}

export function getIdealDistribution(playersPerTeam) {
  const distributions = {
    5: { arquero: 1, defensor: 1, medio: 2, delantero: 1 },
    6: { arquero: 1, defensor: 2, medio: 2, delantero: 1 },
    7: { arquero: 1, defensor: 2, medio: 3, delantero: 1 },
    8: { arquero: 1, defensor: 3, medio: 3, delantero: 1 },
    9: { arquero: 1, defensor: 3, medio: 3, delantero: 2 },
    11: { arquero: 1, defensor: 4, medio: 4, delantero: 2 }
  }
  
  return distributions[playersPerTeam] || distributions[7]
}

/**
 * Calculate team statistics
 * Uses position-weighted levels for accurate team strength comparison
 */
export function calculateTeamStats(assignments, players, registrations) {
  const stats = {
    blanco: { players: [], totalLevel: 0, avgLevel: 0, roles: {} },
    oscuro: { players: [], totalLevel: 0, avgLevel: 0, roles: {} }
  }
  
  assignments.forEach(assignment => {
    const player = players[assignment.jugadorId]
    const registration = registrations.find(r => r.jugadorId === assignment.jugadorId)
    // Use position-weighted level based on assigned role
    const effectiveLevel = calculateEffectiveLevel(player, registration, assignment.rol)
    
    const team = stats[assignment.equipo]
    team.players.push({ ...assignment, player, effectiveLevel })
    team.totalLevel += effectiveLevel
    team.roles[assignment.rol] = (team.roles[assignment.rol] || 0) + 1
  })
  
  // Calculate averages
  if (stats.blanco.players.length > 0) {
    stats.blanco.avgLevel = stats.blanco.totalLevel / stats.blanco.players.length
  }
  if (stats.oscuro.players.length > 0) {
    stats.oscuro.avgLevel = stats.oscuro.totalLevel / stats.oscuro.players.length
  }
  
  return stats
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import EditableMatchHeader from './EditableMatchHeader'
import InscriptionStep from './InscriptionStep'
import TeamBuilderStep from './TeamBuilderStep'
import JoinMatchModal from '../player/JoinMatchModal'

function MatchPage({ matchId, onNavigate }) {
  const [showJoinModal, setShowJoinModal] = useState(false)
  const teamBuilderAddPlayerRef = useRef(null)
  const inscriptionAddPlayerRef = useRef(null)
  
  // Convex queries
  const match = useQuery(api.matches.getById, { matchId })
  const registrations = useQuery(api.registrations.listByMatch, { matchId })
  const teamConfig = useQuery(api.teamConfigurations.getByMatch, { matchId })
  
  // Convex mutations
  const saveTeamConfig = useMutation(api.teamConfigurations.save)
  const removeRegistration = useMutation(api.registrations.remove)
  const startMatch = useMutation(api.matches.startMatch)

  const [isPastKickoff, setIsPastKickoff] = useState(false)

  useEffect(() => {
    if (!match?.fecha || !match?.horario) return
    const [year, month, day] = match.fecha.split('-').map(Number)
    const [hours, minutes] = match.horario.split(':').map(Number)
    if ([year, month, day, hours, minutes].some(Number.isNaN)) return
    const target = new Date(year, month - 1, day, hours, minutes, 0)
    setIsPastKickoff(target.getTime() <= Date.now())
  }, [match?.fecha, match?.horario])

  const handleCountdownComplete = useCallback(() => {
    setIsPastKickoff(true)
  }, [])

  const handleStartMatch = useCallback(() => {
    if (!match) return
    startMatch({ matchId: match._id })
  }, [match, startMatch])
  
  useEffect(() => {
    setShowJoinModal(false)  // Reset modal state on navigation
    teamBuilderAddPlayerRef.current = null  // Reset handler on navigation
    inscriptionAddPlayerRef.current = null  // Reset inscription handler
  }, [matchId])
  
  const handleBack = () => {
    onNavigate('#/')
  }
  
  const handleAddPlayer = useCallback(() => {
    if (match?.pasoActual === 'armado_equipos') {
      // In team builder, only open modal if handler is registered
      if (teamBuilderAddPlayerRef.current) {
        teamBuilderAddPlayerRef.current()
      }
    } else if (match?.pasoActual === 'inscripcion') {
      // In inscription, use the inscription handler
      if (inscriptionAddPlayerRef.current) {
        inscriptionAddPlayerRef.current()
      }
    } else {
      setShowJoinModal(true)
    }
  }, [match?.pasoActual])
  
  // Callback to register the team builder's add player handler
  const registerTeamBuilderAddPlayer = useCallback((handler) => {
    teamBuilderAddPlayerRef.current = handler
  }, [])
  
  // Callback to register the inscription's add player handler
  const registerInscriptionAddPlayer = useCallback((handler) => {
    inscriptionAddPlayerRef.current = handler
  }, [])
  
  const handlePlayerJoined = () => {
    // Data will auto-refresh via Convex
  }
  
  // Handle when players per team is reduced - remove excess players using LIFO
  const handlePlayersPerTeamChange = async (newPlayersPerTeam, oldPlayersPerTeam) => {
    if (newPlayersPerTeam >= oldPlayersPerTeam) return
    if (!teamConfig || !teamConfig.asignaciones || !registrations) return
    
    // Track players to remove from the match entirely
    const playersToRemove = []
    
    // Process each team
    const teams = ['blanco', 'oscuro']
    let updatedAssignments = [...teamConfig.asignaciones]
    
    teams.forEach(team => {
      const teamAssignments = updatedAssignments.filter(a => a.equipo === team)
      
      if (teamAssignments.length > newPlayersPerTeam) {
        // Sort by registration timestamp DESCENDING (newest first = to be removed)
        const sortedAssignments = teamAssignments.sort((a, b) => {
          const regA = registrations.find(r => r.jugadorId === a.jugadorId)
          const regB = registrations.find(r => r.jugadorId === b.jugadorId)
          const timeA = regA?.timestamp ? new Date(regA.timestamp) : new Date(0)
          const timeB = regB?.timestamp ? new Date(regB.timestamp) : new Date(0)
          return timeB - timeA // Descending: newest first
        })
        
        // Keep only the oldest registered players
        const playersToKeep = sortedAssignments.slice(sortedAssignments.length - newPlayersPerTeam)
        const playerIdsToKeep = new Set(playersToKeep.map(a => a.jugadorId))
        
        // Track players being removed
        sortedAssignments.forEach(a => {
          if (!playerIdsToKeep.has(a.jugadorId)) {
            playersToRemove.push(a.jugadorId)
          }
        })
        
        // Filter out removed players from this team
        updatedAssignments = updatedAssignments.filter(a => 
          a.equipo !== team || playerIdsToKeep.has(a.jugadorId)
        )
      }
    })
    
    // Remove registrations for players being removed from the match
    for (const playerId of playersToRemove) {
      await removeRegistration({ matchId, playerId })
    }
    
    // Save updated config
    await saveTeamConfig({
      partidoId: matchId,
      asignaciones: updatedAssignments
    })
  }
  
  if (match === undefined) {
    return (
      <div className="match-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }
  
  if (match === null) {
    return (
      <div className="match-page">
        <div className="error-state">
          <h3>Error</h3>
          <p>Partido no encontrado</p>
          <button className="btn btn-primary" onClick={handleBack}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`match-page match-page--${match.pasoActual}`}>
      {/* Editable Header */}
      <EditableMatchHeader
        match={match}
        onAddPlayer={handleAddPlayer}
        onPlayersPerTeamChange={handlePlayersPerTeamChange}
        isPastKickoff={isPastKickoff}
        onCountdownComplete={handleCountdownComplete}
        onStartMatch={handleStartMatch}
      />
      
      {/* Content based on current step */}
      {match.pasoActual === 'inscripcion' && (
        <InscriptionStep
          match={match}
          onRegisterAddPlayerHandler={registerInscriptionAddPlayer}
        />
      )}
      
      {match.pasoActual === 'armado_equipos' && (
        <TeamBuilderStep 
          match={match}
          onRegisterAddPlayerHandler={registerTeamBuilderAddPlayer}
        />
      )}
      
      {match.pasoActual === 'finalizado' && (
        <div className="team-builder-placeholder">
          <h2>Partido Finalizado</h2>
          <p>Este partido ya ha sido completado</p>
        </div>
      )}
      
      {/* Join Match Modal - only render when NOT in inscription step (InscriptionStep has its own modal) */}
      {match.pasoActual !== 'inscripcion' && (
        <JoinMatchModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          matchId={match._id}
          match={match}
          onJoined={handlePlayerJoined}
        />
      )}
    </div>
  )
}

export default MatchPage

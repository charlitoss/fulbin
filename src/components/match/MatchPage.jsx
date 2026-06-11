import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import EditableMatchHeader from './EditableMatchHeader'
import InscriptionStep from './InscriptionStep'
import TeamBuilderStep from './TeamBuilderStep'
import InGameStep from './InGameStep'
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
  const updateRegistration = useMutation(api.registrations.update)
  const startMatch = useMutation(api.matches.startMatch)
  const finishMatch = useMutation(api.matches.finishMatch)

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

  const handleFinishMatch = useCallback(() => {
    if (!match) return
    finishMatch({ matchId: match._id })
  }, [match, finishMatch])
  
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
  
  // Handle when players per team is reduced. Instead of dropping the excess
  // players, demote the newest-registered ones to suplentes so they stay in the
  // match. Works both in inscription (no teams yet) and team builder.
  const handlePlayersPerTeamChange = async (newPlayersPerTeam, oldPlayersPerTeam) => {
    if (newPlayersPerTeam >= oldPlayersPerTeam) return
    if (!registrations) return

    const regTime = (jugadorId) => {
      const reg = registrations.find(r => r.jugadorId === jugadorId)
      return reg?.timestamp ? new Date(reg.timestamp).getTime() : 0
    }

    const toDemote = []
    const hasTeams = teamConfig?.asignaciones?.length > 0

    if (hasTeams) {
      // Team builder: trim each team to the new size, demoting the
      // newest-registered players first so the teams stay balanced.
      let updatedAssignments = [...teamConfig.asignaciones]
      for (const team of ['blanco', 'oscuro']) {
        const teamAssignments = updatedAssignments.filter(a => a.equipo === team)
        if (teamAssignments.length > newPlayersPerTeam) {
          const sorted = [...teamAssignments].sort((a, b) => regTime(b.jugadorId) - regTime(a.jugadorId))
          const keep = new Set(sorted.slice(sorted.length - newPlayersPerTeam).map(a => a.jugadorId))
          sorted.forEach(a => { if (!keep.has(a.jugadorId)) toDemote.push(a.jugadorId) })
          updatedAssignments = updatedAssignments.filter(a => a.equipo !== team || keep.has(a.jugadorId))
        }
      }
      if (toDemote.length) {
        await saveTeamConfig({ partidoId: matchId, asignaciones: updatedAssignments })
      }
    } else {
      // Inscription: demote the newest-registered jugadores beyond the new total.
      const newCupoTotal = newPlayersPerTeam * 2
      const jugadores = registrations
        .filter(r => r.asistira && r.tipoInscripcion !== 'suplente' && r.tipoInscripcion !== 'hinchada')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      jugadores.slice(newCupoTotal).forEach(r => toDemote.push(r.jugadorId))
    }

    // Demote the excess players to suplentes (they stay in the match).
    for (const playerId of toDemote) {
      await updateRegistration({ matchId, playerId, tipoInscripcion: 'suplente' })
    }
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
  
  const isInGame = match.pasoActual === 'jugando'
  const isFinalized = match.pasoActual === 'finalizado'

  return (
    <div className={`match-page match-page--${match.pasoActual}`}>
      {/* Editable Header — hidden during the in-game/finalized views (they have their own header) */}
      {!isInGame && !isFinalized && (
        <EditableMatchHeader
          match={match}
          onAddPlayer={handleAddPlayer}
          onPlayersPerTeamChange={handlePlayersPerTeamChange}
          isPastKickoff={isPastKickoff}
          onCountdownComplete={handleCountdownComplete}
          onStartMatch={handleStartMatch}
        />
      )}

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

      {isInGame && (
        <InGameStep match={match} onFinish={handleFinishMatch} />
      )}

      {isFinalized && (
        <InGameStep match={match} finalized />
      )}

      {/* Join Match Modal - only render when NOT in inscription step (InscriptionStep has its own modal) */}
      {match.pasoActual !== 'inscripcion' && !isInGame && !isFinalized && (
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

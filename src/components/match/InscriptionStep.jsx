import { useState, useEffect, useMemo } from 'react'
import { ArrowRight, Plus, Clock, Eye } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ProgressBar from '../ui/ProgressBar'
import PlayerCard from '../player/PlayerCard'
import EmptySlot from '../player/EmptySlot'
import { MAX_SUPLENTES } from '../../utils/constants'
import JoinMatchModal from '../player/JoinMatchModal'
import PlayerInfoModal from '../player/PlayerInfoModal'

function InscriptionStep({ match, onRegisterAddPlayerHandler }) {
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinModalType, setJoinModalType] = useState(null)
  const [showPlayerInfo, setShowPlayerInfo] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedRegistration, setSelectedRegistration] = useState(null)

  const openJoinModal = (type = null) => {
    setJoinModalType(type)
    setShowJoinModal(true)
  }
  
  // Convex queries
  const registrationsData = useQuery(api.registrations.listByMatch, { matchId: match._id })
  const playersData = useQuery(api.players.list)
  
  // Convex mutations
  const updateMatch = useMutation(api.matches.update)
  const removeRegistration = useMutation(api.registrations.remove)

  const handleRemovePlayer = async (player) => {
    try {
      await removeRegistration({ matchId: match._id, playerId: player._id })
    } catch (err) {
      console.error('Error removing registration:', err)
    }
  }
  
  // Convert players array to object for easy lookup
  const players = useMemo(() => {
    if (!playersData) return {}
    return playersData.reduce((acc, player) => {
      acc[player._id] = player
      return acc
    }, {})
  }, [playersData])
  
  // Filter registrations - only players (not suplentes or hinchada) that will attend
  const registrations = useMemo(() => {
    if (!registrationsData) return []
    return registrationsData.filter(r => 
      r.asistira && 
      r.tipoInscripcion !== 'suplente' && 
      r.tipoInscripcion !== 'hinchada'
    )
  }, [registrationsData])
  
  // Get suplentes and hinchada
  const suplentes = useMemo(() => {
    if (!registrationsData) return []
    return registrationsData.filter(r => r.asistira && r.tipoInscripcion === 'suplente')
  }, [registrationsData])
  
  const hinchada = useMemo(() => {
    if (!registrationsData) return []
    return registrationsData.filter(r => r.asistira && r.tipoInscripcion === 'hinchada')
  }, [registrationsData])
  
  // Reset modal state when match changes
  useEffect(() => {
    setShowJoinModal(false)
  }, [match._id])
  
  // Register add player handler for header button
  useEffect(() => {
    if (onRegisterAddPlayerHandler) {
      onRegisterAddPlayerHandler(() => openJoinModal())
    }
  }, [onRegisterAddPlayerHandler])
  
  // Sort registrations by timestamp (oldest first = order of inscription)
  const sortedRegistrations = useMemo(() => {
    return [...registrations].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp)
    })
  }, [registrations])
  
  const confirmedCount = registrations.length
  const requiredCount = match.cantidadJugadores
  const isQuotaComplete = confirmedCount >= requiredCount
  
  const handleJoined = () => {
    // Data will auto-refresh via Convex
  }
  
  const handleViewPlayerInfo = (player) => {
    const reg = registrations.find(r => r.jugadorId === player._id)
    setSelectedPlayer(player)
    setSelectedRegistration(reg)
    setShowPlayerInfo(true)
  }
  
  const handleContinue = async () => {
    if (isQuotaComplete) {
      await updateMatch({
        matchId: match._id,
        pasoActual: 'armado_equipos',
      })
    }
  }
  
  if (registrationsData === undefined || playersData === undefined) {
    return <div className="loading">Cargando...</div>
  }
  
  const sortedSuplentes = [...suplentes].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const sortedHinchada = [...hinchada].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  return (
    <>
      <div className="inscription-step">
        <div className="inscription-step-header">
          <p className="step-title">Jugas?</p>
          <ProgressBar
            current={confirmedCount}
            total={requiredCount}
            showMessage={false}
          />
        </div>

        <div className="player-list-section">
          <div className="player-list compact-list">
            {/* Jugadores confirmados */}
            {sortedRegistrations.map((registration, index) => {
              const player = players[registration.jugadorId]
              if (!player) return null

              return (
                <PlayerCard
                  key={registration.jugadorId}
                  player={player}
                  registration={registration}
                  onRemove={handleRemovePlayer}
                  index={index}
                  compact={true}
                />
              )
            })}

            {/* Lugares vacíos */}
            {Array.from({ length: Math.max(0, requiredCount - confirmedCount) }).map((_, index) => (
              <EmptySlot
                key={`empty-${index}`}
                index={confirmedCount + index}
                onClick={() => openJoinModal('jugador')}
              />
            ))}
          </div>
        </div>

        <div className="inscription-actions">
          <button
            className={`btn-continue ${isQuotaComplete ? 'ready' : ''}`}
            onClick={handleContinue}
            disabled={!isQuotaComplete}
          >
            <span>Armar equipos</span>
            <span className="icon-arrow-right" aria-hidden="true" />
          </button>

          {!isQuotaComplete && (
            <p className="continue-hint">
              Necesitas {requiredCount - confirmedCount} jugador{requiredCount - confirmedCount !== 1 ? 'es' : ''} más para continuar
            </p>
          )}
          {isQuotaComplete && (
            <p className="progress-message complete">
              Somos {confirmedCount}! Se juega
            </p>
          )}
        </div>
      </div>

      <div className="inscription-step">
        <div className="inscription-step-header">
          <p className="step-title">
            <img src="/icons/moveplayer.svg" alt="" className="step-title-icon" width="24" height="24" />
            Suplentes
          </p>
        </div>
        <div className="player-list compact-list">
          {sortedSuplentes.map((registration, index) => {
            const player = players[registration.jugadorId]
            if (!player) return null
            return (
              <PlayerCard
                key={registration.jugadorId}
                player={player}
                registration={registration}
                onRemove={handleRemovePlayer}
                index={index}
                compact={true}
              />
            )
          })}
          {sortedSuplentes.length < MAX_SUPLENTES && (
            <EmptySlot index={sortedSuplentes.length} onClick={() => openJoinModal('suplente')} />
          )}
        </div>
      </div>

      <div className="inscription-step">
        <div className="inscription-step-header">
          <p className="step-title">
            <img src="/icons/hinchada.svg" alt="" className="step-title-icon" width="24" height="24" />
            Hinchada
          </p>
        </div>
        <div className="player-list compact-list">
          {sortedHinchada.map((registration, index) => {
            const player = players[registration.jugadorId]
            if (!player) return null
            return (
              <PlayerCard
                key={registration.jugadorId}
                player={player}
                registration={registration}
                onRemove={handleRemovePlayer}
                index={index}
                compact={true}
                showState={false}
              />
            )
          })}
          <EmptySlot
            index={sortedHinchada.length}
            onClick={() => openJoinModal('hinchada')}
          />
        </div>
      </div>

      <JoinMatchModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        matchId={match._id}
        match={match}
        onJoined={handleJoined}
        playerOnly={false}
        defaultType={joinModalType}
      />

      <PlayerInfoModal
        isOpen={showPlayerInfo}
        onClose={() => setShowPlayerInfo(false)}
        player={selectedPlayer}
        registration={selectedRegistration}
      />
    </>
  )
}

export default InscriptionStep

import { useState, useEffect, useMemo } from 'react'
import { ArrowRight, Plus, Clock, Eye } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ProgressBar from '../ui/ProgressBar'
import PlayerCard from '../player/PlayerCard'
import JoinMatchModal from '../player/JoinMatchModal'
import PlayerInfoModal from '../player/PlayerInfoModal'

// Empty slot component for available spots
function EmptySlot({ index, onClick }) {
  return (
    <div className="empty-slot" onClick={onClick}>
      <span className="empty-slot-index">{index + 1}.</span>
      <span className="empty-slot-text">Lugar disponible</span>
      <Plus size={14} className="empty-slot-icon" />
    </div>
  )
}

function InscriptionStep({ match, onRegisterAddPlayerHandler }) {
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showPlayerInfo, setShowPlayerInfo] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  
  // Convex queries
  const registrationsData = useQuery(api.registrations.listByMatch, { matchId: match._id })
  const playersData = useQuery(api.players.list)
  
  // Convex mutations
  const updateMatch = useMutation(api.matches.update)
  
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
      onRegisterAddPlayerHandler(() => setShowJoinModal(true))
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
  
  return (
    <div className="inscription-step">
      <p className="step-title">Paso 1: Inscripción de Jugadores</p>
      
      <ProgressBar 
        current={confirmedCount} 
        total={requiredCount} 
      />
      
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
                onViewInfo={handleViewPlayerInfo}
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
              onClick={() => setShowJoinModal(true)}
            />
          ))}
        </div>
      </div>
      
      {/* Suplentes and Hinchada sections */}
      {(suplentes.length > 0 || hinchada.length > 0) && (
        <div className="inscription-extras">
          {suplentes.length > 0 && (
            <div className="inscription-extra-section">
              <div className="inscription-extra-header">
                <Clock size={14} />
                <span>Suplentes ({suplentes.length})</span>
              </div>
              <div className="inscription-extra-list">
                {suplentes.map((reg, index) => {
                  const player = players[reg.jugadorId]
                  if (!player) return null
                  return (
                    <div key={reg.jugadorId} className="inscription-extra-item suplente">
                      <span className="inscription-extra-priority">{index + 1}</span>
                      <span className="inscription-extra-name">{player.nombre}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {hinchada.length > 0 && (
            <div className="inscription-extra-section">
              <div className="inscription-extra-header">
                <Eye size={14} />
                <span>Hinchada ({hinchada.length})</span>
              </div>
              <div className="inscription-extra-list">
                {hinchada.map((reg) => {
                  const player = players[reg.jugadorId]
                  if (!player) return null
                  return (
                    <div key={reg.jugadorId} className="inscription-extra-item hinchada">
                      <Eye size={14} className="inscription-extra-icon" />
                      <span className="inscription-extra-name">{player.nombre}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="inscription-actions">
        <button 
          className={`btn-continue ${isQuotaComplete ? 'ready' : ''}`}
          onClick={handleContinue}
          disabled={!isQuotaComplete}
        >
          <span>Continuar al Armado de Equipos</span>
          <ArrowRight size={20} />
        </button>
        
        {!isQuotaComplete && (
          <p className="continue-hint">
            Necesitas {requiredCount - confirmedCount} jugador{requiredCount - confirmedCount !== 1 ? 'es' : ''} más para continuar
          </p>
        )}
      </div>
      
      <JoinMatchModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        matchId={match._id}
        match={match}
        onJoined={handleJoined}
        playerOnly={false}
      />
      
      <PlayerInfoModal
        isOpen={showPlayerInfo}
        onClose={() => setShowPlayerInfo(false)}
        player={selectedPlayer}
        registration={selectedRegistration}
      />
    </div>
  )
}

export default InscriptionStep

import { Info } from 'lucide-react'
import { PHYSICAL_STATES } from '../../utils/constants'

function PlayerCard({ player, registration, onViewInfo, onRemove, onMove, index, compact = false, showState = true }) {
  const physicalState = PHYSICAL_STATES[registration?.estadoFisico] || PHYSICAL_STATES.normal

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Compact version - single line, minimal
  if (compact) {
    return (
      <div className="player-card compact">
        <div className="player-card-left">
          {typeof index === 'number' && (
            <span className="player-index">{index + 1}.</span>
          )}
          <span className="player-name-compact">{player?.nombre || 'Jugador'}</span>
          {showState && (
            <img
              src={physicalState.icon}
              alt={physicalState.label}
              title={physicalState.label}
              className="physical-state-icon"
              width="24"
              height="24"
            />
          )}
        </div>
        <div className="player-card-actions">
          {onMove && (
            <button
              className="btn-icon-card btn-move-player"
              onClick={() => onMove(player, registration)}
              title="Cambiar de equipo"
            >
              <img src="/icons/moveplayer.svg" alt="" width="24" height="24" />
            </button>
          )}
          {onRemove && (
            <button
              className="btn-icon-card"
              onClick={() => onRemove(player, registration)}
              title="Quitar"
            >
              <img src="/icons/removeplayer.svg" alt="" width="24" height="24" />
            </button>
          )}
        </div>
      </div>
    )
  }
  
  // Full version (original)
  return (
    <div className="player-card">
      <div className="player-card-left">
        <div className="player-avatar">
          {getInitials(player?.nombre)}
        </div>
        <div className="player-info">
          <h4>{player?.nombre || 'Jugador'}</h4>
          {player?.perfilPermanente?.posicionPreferida && (
            <span className="player-position">{player.perfilPermanente.posicionPreferida}</span>
          )}
        </div>
      </div>
      <div className="player-card-right">
        <span className="physical-state" title={physicalState.label}>
          {physicalState.emoji}
        </span>
        {onViewInfo && (
          <button className="btn-info" onClick={() => onViewInfo(player)}>
            Ver info
          </button>
        )}
      </div>
    </div>
  )
}

export default PlayerCard

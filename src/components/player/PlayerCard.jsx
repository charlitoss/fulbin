import { Info, Minus, Plus } from 'lucide-react'
import { PHYSICAL_STATES } from '../../utils/constants'

function PlayerCard({
  player,
  registration,
  onViewInfo,
  onRemove,
  onMove,
  onPromote,
  index,
  compact = false,
  showState = true,
  goalControls = null,
}) {
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
          {goalControls ? (
            goalControls.readOnly ? (
              <div className="goal-controls goal-controls--readonly">
                <span className="goal-count">{goalControls.goles ?? 0}</span>
              </div>
            ) : (
              <div className="goal-controls">
                <button
                  type="button"
                  className="goal-btn goal-btn--minus"
                  onClick={() => goalControls.onDelta?.(-1)}
                  disabled={(goalControls.goles ?? 0) === 0}
                  aria-label="Quitar gol"
                >
                  <Minus size={14} />
                </button>
                <span className="goal-count">{goalControls.goles ?? 0}</span>
                <button
                  type="button"
                  className="goal-btn goal-btn--plus"
                  onClick={() => goalControls.onDelta?.(1)}
                  aria-label="Agregar gol"
                >
                  <Plus size={14} />
                </button>
              </div>
            )
          ) : (
            <>
              {onMove && (
                <button
                  className="btn-icon-card btn-move-player"
                  onClick={() => onMove(player, registration)}
                  title="Cambiar de equipo"
                >
                  <img src="/icons/moveplayer.svg" alt="" width="24" height="24" />
                </button>
              )}
              {onPromote && (
                <button
                  className="btn-icon-card btn-promote-card"
                  onClick={() => onPromote(player, registration)}
                  title="Promover a jugador"
                >
                  <img src="/icons/promoteplayer.svg" alt="" width="24" height="24" />
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
            </>
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

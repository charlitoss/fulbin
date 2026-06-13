import { ArrowLeftRight } from 'lucide-react'
import Modal from '../ui/Modal'
import { PHYSICAL_STATES } from '../../utils/constants'

function PlayerInfoModal({ isOpen, onClose, player, registration, assignment, onSwapTeam, onLeave }) {
  if (!player) return null
  
  const physicalState = PHYSICAL_STATES[registration?.estadoFisico] || PHYSICAL_STATES.normal
  const profile = player.perfilPermanente || {}
  const attributes = profile.atributos || {}
  
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
  
  // Calculate effective level based on physical state
  const effectiveLevel = profile.nivelGeneral 
    ? (profile.nivelGeneral * physicalState.factor).toFixed(1)
    : null
  
  const attributeLabels = {
    velocidad: 'Velocidad',
    tecnica: 'Técnica',
    resistencia: 'Resistencia',
    defensa: 'Defensa',
    ataque: 'Ataque',
    pase: 'Pase'
  }
  
  const handleSwapTeam = () => {
    if (onSwapTeam && player) {
      const playerId = player._id || player.id
      onSwapTeam(playerId)
      onClose()
    }
  }

  const handleLeave = () => {
    if (onLeave && player) {
      onLeave(player._id || player.id)
      onClose()
    }
  }

  const otherTeamLabel = assignment?.equipo === 'blanco' ? 'Oscuro' : 'Blanco'
  const canLeave = onLeave && registration

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Información del Jugador"
      footer={
        <div className="player-modal-footer-main">
          {assignment && onSwapTeam && (
            <button
              className="btn btn-secondary player-modal-footer-btn"
              onClick={handleSwapTeam}
            >
              <ArrowLeftRight size={16} />
              Mover a {otherTeamLabel}
            </button>
          )}
          {canLeave && (
            <button
              className="btn btn-secondary btn-danger-text player-modal-footer-btn"
              onClick={handleLeave}
            >
              Bajarme del partido
            </button>
          )}
        </div>
      }
    >
      <div className="player-profile">
        <div className="player-profile-avatar">
          {getInitials(player.nombre)}
        </div>
        <h3>{player.nombre}</h3>
        <div className="player-profile-state">
          <img
            src={physicalState.icon}
            alt=""
            className="physical-state-icon"
            width="24"
            height="24"
          />
          <span>{physicalState.label}</span>
        </div>
      </div>
      
      <div className="player-details">
        <div className="detail-row">
          <span className="detail-label">Posición preferida</span>
          <span className="detail-value">{profile.posicionPreferida || 'No definida'}</span>
        </div>
        {profile.posicionesSecundarias?.length > 0 && (
          <div className="detail-row">
            <span className="detail-label">Posiciones secundarias</span>
            <span className="detail-value">
              {profile.posicionesSecundarias.join(', ')}
            </span>
          </div>
        )}
      </div>
      
      <div className="attributes-section">
        <h4>Atributos</h4>
        {Object.entries(attributeLabels).map(([key, label]) => {
          const value = attributes[key] || 5
          return (
            <div key={key} className="attribute-row">
              <span className="attribute-label">{label}</span>
              <div className="attribute-bar">
                <div 
                  className="attribute-bar-fill" 
                  style={{ width: `${value * 10}%` }}
                />
              </div>
              <span className="attribute-value">{value}/10</span>
            </div>
          )
        })}
        
        <div className="overall-level">
          <span className="overall-label">Nivel general</span>
          <span className="overall-value">
            {profile.nivelGeneral?.toFixed(1) || '5.0'}/10
          </span>
        </div>
        
        {effectiveLevel && effectiveLevel !== profile.nivelGeneral?.toFixed(1) && (
          <div className="overall-level overall-level--efectivo">
            <span className="overall-label">Nivel efectivo (hoy)</span>
            <span className="overall-value">
              {effectiveLevel}/10
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default PlayerInfoModal

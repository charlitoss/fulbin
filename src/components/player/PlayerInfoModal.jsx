import { useState, useEffect } from 'react'
import { ArrowLeftRight, ArrowDownToLine } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../ui/Modal'
import { PHYSICAL_STATES, POSITIONS } from '../../utils/constants'

const DEFAULT_ATTRS = { velocidad: 5, tecnica: 5, resistencia: 5, defensa: 5, ataque: 5, pase: 5 }

const attributeLabels = {
  velocidad: 'Velocidad',
  tecnica: 'Técnica',
  resistencia: 'Resistencia',
  defensa: 'Defensa',
  ataque: 'Ataque',
  pase: 'Pase',
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function PlayerInfoModal({
  isOpen, onClose, player, registration, assignment,
  matchId, canManage = false, deviceId,
  onSwapTeam, onMoveToSuplentes, onLeave,
}) {
  const updateRegistration = useMutation(api.registrations.update)
  const updatePlayer = useMutation(api.players.update)

  const [estado, setEstado] = useState('normal')
  const [posicion, setPosicion] = useState(POSITIONS.MEDIOCAMPISTA)

  useEffect(() => {
    if (isOpen && player) {
      setEstado(registration?.estadoFisico ?? 'normal')
      setPosicion(player.perfilPermanente?.posicionPreferida ?? POSITIONS.MEDIOCAMPISTA)
    }
  }, [isOpen, registration, player])

  if (!player) return null

  const playerId = player._id || player.id
  // Owner edits any player; the device that inscribed this registration can edit
  // their own (estado for this match + preferred position).
  const canEdit = canManage || (!!registration?.creadoPor && registration.creadoPor === deviceId)

  const physicalState = PHYSICAL_STATES[estado] || PHYSICAL_STATES.normal
  const profile = player.perfilPermanente || {}
  const attributes = profile.atributos || {}
  const effectiveLevel = profile.nivelGeneral
    ? (profile.nivelGeneral * physicalState.factor).toFixed(1)
    : null

  const handleSwapTeam = () => { if (onSwapTeam) { onSwapTeam(playerId); onClose() } }
  const handleMoveToSuplentes = () => { if (onMoveToSuplentes) { onMoveToSuplentes(playerId); onClose() } }
  const handleLeave = () => { if (onLeave) { onLeave(playerId); onClose() } }

  const changeEstado = async (key) => {
    setEstado(key)
    try {
      await updateRegistration({ matchId, playerId, estadoFisico: key, anonId: deviceId })
    } catch (err) {
      console.error('Error updating estado físico:', err)
    }
  }

  const changePosicion = async (pos) => {
    setPosicion(pos)
    const base = player.perfilPermanente
    try {
      await updatePlayer({
        playerId,
        perfilPermanente: {
          posicionPreferida: pos,
          posicionesSecundarias: base?.posicionesSecundarias ?? [],
          atributos: base?.atributos ?? DEFAULT_ATTRS,
          nivelGeneral: base?.nivelGeneral ?? 5,
        },
        anonId: deviceId,
        matchId,
      })
    } catch (err) {
      console.error('Error updating posición:', err)
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
            <button className="btn btn-secondary player-modal-footer-btn" onClick={handleSwapTeam}>
              <ArrowLeftRight size={16} />
              Mover a {otherTeamLabel}
            </button>
          )}
          {assignment && onMoveToSuplentes && (
            <button className="btn btn-secondary player-modal-footer-btn" onClick={handleMoveToSuplentes}>
              <ArrowDownToLine size={16} />
              Mover a suplentes
            </button>
          )}
          {canLeave && (
            <button className="btn btn-secondary btn-danger-text player-modal-footer-btn" onClick={handleLeave}>
              Bajarme del partido
            </button>
          )}
        </div>
      }
    >
      <div className="player-profile">
        <div className="player-profile-avatar">{getInitials(player.nombre)}</div>
        <h3>{player.nombre}</h3>
        {!canEdit && (
          <div className="player-profile-state">
            <img src={physicalState.icon} alt="" className="physical-state-icon" width="24" height="24" />
            <span>{physicalState.label}</span>
          </div>
        )}
      </div>

      {canEdit ? (
        <div className="player-edit-fields">
          <div className="form-group">
            <label>Estado físico</label>
            <div className="physical-state-selector">
              {Object.entries(PHYSICAL_STATES).map(([key, state]) => (
                <div
                  key={key}
                  className={`state-option ${estado === key ? 'selected' : ''}`}
                  onClick={() => changeEstado(key)}
                >
                  <img src={state.icon} alt="" className="state-icon" />
                  <span className="state-label">{state.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="pim-posicion">Posición preferida</label>
            <select
              id="pim-posicion"
              className="roster-select"
              value={posicion}
              onChange={(e) => changePosicion(e.target.value)}
            >
              {Object.values(POSITIONS).map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="player-details">
          <div className="detail-row">
            <span className="detail-label">Posición preferida</span>
            <span className="detail-value">{profile.posicionPreferida || 'No definida'}</span>
          </div>
          {profile.posicionesSecundarias?.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">Posiciones secundarias</span>
              <span className="detail-value">{profile.posicionesSecundarias.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      <div className="attributes-section">
        <h4>Atributos</h4>
        {Object.entries(attributeLabels).map(([key, label]) => {
          const value = attributes[key] || 5
          return (
            <div key={key} className="attribute-row">
              <span className="attribute-label">{label}</span>
              <div className="attribute-bar">
                <div className="attribute-bar-fill" style={{ width: `${value * 10}%` }} />
              </div>
              <span className="attribute-value">{value}/10</span>
            </div>
          )
        })}

        <div className="overall-levels">
          <div className="overall-level">
            <span className="overall-label">Nivel general</span>
            <span className="overall-value">{profile.nivelGeneral?.toFixed(1) || '5.0'}/10</span>
          </div>

          {effectiveLevel && effectiveLevel !== profile.nivelGeneral?.toFixed(1) && (
            <div className="overall-level overall-level--efectivo">
              <span className="overall-label">Nivel efectivo (hoy)</span>
              <span className="overall-value">{effectiveLevel}/10</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default PlayerInfoModal

import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../ui/Modal'
import { POSITIONS } from '../../utils/constants'

const ATTRIBUTE_LABELS = {
  velocidad: 'Velocidad',
  tecnica: 'Técnica',
  resistencia: 'Resistencia',
  defensa: 'Defensa',
  ataque: 'Ataque',
  pase: 'Pase',
}

const DEFAULT_ATTRS = {
  velocidad: 5,
  tecnica: 5,
  resistencia: 5,
  defensa: 5,
  ataque: 5,
  pase: 5,
}

// Create/edit a roster player: name, preferred position and attributes.
// nivelGeneral is derived from the attributes.
function PlayerProfileModal({ isOpen, onClose, player, hideDelete = false }) {
  const [nombre, setNombre] = useState('')
  const [posicion, setPosicion] = useState(POSITIONS.MEDIOCAMPISTA)
  const [atributos, setAtributos] = useState(DEFAULT_ATTRS)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const createInRoster = useMutation(api.players.createInRoster)
  const updatePlayer = useMutation(api.players.update)
  const removeFromRoster = useMutation(api.players.removeFromRoster)

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setNombre(player?.nombre ?? '')
    setPosicion(player?.perfilPermanente?.posicionPreferida ?? POSITIONS.MEDIOCAMPISTA)
    setAtributos({ ...DEFAULT_ATTRS, ...(player?.perfilPermanente?.atributos ?? {}) })
  }, [isOpen, player])

  const nivelGeneral = Math.round(
    (Object.values(atributos).reduce((sum, value) => sum + value, 0) /
      Object.values(atributos).length) * 10
  ) / 10

  const handleSave = async () => {
    setError('')
    const trimmed = nombre.trim()
    if (trimmed.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return
    }

    const perfilPermanente = {
      posicionPreferida: posicion,
      posicionesSecundarias: player?.perfilPermanente?.posicionesSecundarias ?? [],
      atributos,
      nivelGeneral,
    }

    setSaving(true)
    try {
      if (player) {
        await updatePlayer({ playerId: player._id, nombre: trimmed, perfilPermanente })
      } else {
        await createInRoster({ nombre: trimmed, perfilPermanente })
      }
      onClose()
    } catch (err) {
      const message = String(err.message)
      if (message.includes('Ya tenés un jugador')) {
        setError(`Ya tenés un jugador llamado "${trimmed}"`)
      } else {
        setError('No se pudo guardar. Intentá de nuevo.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setError('')
    setSaving(true)
    try {
      await removeFromRoster({ playerId: player._id })
      onClose()
    } catch (err) {
      if (String(err.message).includes('CON_HISTORIAL')) {
        setError('No se puede eliminar: ya jugó partidos. Su historial se conserva.')
      } else {
        setError('No se pudo eliminar. Intentá de nuevo.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSave}
      title={player ? 'Editar jugador' : 'Agregar jugador'}
      footer={
        <>
          {player && !hideDelete && (
            <button
              type="button"
              className="btn btn-secondary btn-danger-text"
              onClick={handleDelete}
              disabled={saving}
            >
              Eliminar
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="player-profile-form">
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="roster-nombre">
            Nombre <span className="required">*</span>
          </label>
          <input
            type="text"
            id="roster-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label htmlFor="roster-posicion">Posición preferida</label>
          <select
            id="roster-posicion"
            className="roster-select"
            value={posicion}
            onChange={(e) => setPosicion(e.target.value)}
          >
            {Object.values(POSITIONS).map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Atributos</label>
          {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => (
            <div key={key} className="attribute-slider-row">
              <span className="attribute-slider-label">{label}</span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={atributos[key]}
                onChange={(e) =>
                  setAtributos((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                }
                aria-label={label}
              />
              <span className="attribute-slider-value">{atributos[key]}</span>
            </div>
          ))}
          <div className="overall-level">
            <span className="overall-label">Nivel general</span>
            <span className="overall-value">{nivelGeneral.toFixed(1)}/10</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PlayerProfileModal

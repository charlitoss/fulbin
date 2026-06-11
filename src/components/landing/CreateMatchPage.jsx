import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { PLAYER_COUNTS } from '../../utils/constants'
import { getTodayString, getDefaultHorario } from '../../utils/dateUtils'
import TimePicker from '../ui/TimePicker'

export default function CreateMatchPage({ onNavigate }) {
  const [formData, setFormData] = useState({
    nombre: '',
    fecha: getTodayString(),
    horario: getDefaultHorario(),
    ubicacion: '',
    cantidadJugadores: 12
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const createMatch = useMutation(api.matches.create)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validate
    if (!formData.nombre.trim()) {
      setError('Por favor ingresa un nombre para el partido')
      return
    }
    
    if (!formData.ubicacion.trim()) {
      setError('Por favor ingresa una ubicación')
      return
    }
    
    if (!formData.fecha) {
      setError('Por favor selecciona una fecha')
      return
    }
    
    if (!formData.horario) {
      setError('Por favor selecciona un horario')
      return
    }

    setIsSubmitting(true)

    try {
      const matchId = await createMatch({
        nombre: formData.nombre.trim(),
        fecha: formData.fecha,
        horario: formData.horario,
        ubicacion: formData.ubicacion.trim(),
        cantidadJugadores: formData.cantidadJugadores,
        jugadoresPorEquipo: formData.cantidadJugadores / 2,
        organizadorId: 'current_user',
        organizadorNombre: 'Organizador',
      })
      
      // Navigate to the new match
      onNavigate(`#/partido/${matchId}`)
    } catch (err) {
      setError('Error al crear el partido. Por favor intenta de nuevo.')
      setIsSubmitting(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="hero-form-container">
          <button
            type="button"
            className="btn btn-secondary btn-sm hero-back"
            onClick={() => onNavigate('#/')}
          >
            ← Volver
          </button>
          <form onSubmit={handleSubmit} className="match-form hero-form">
            <h2 className="form-heading">Nuevo partido</h2>

            {error && (
              <div className="form-error">{error}</div>
            )}

            <div className="form-group">
              <div className="player-count-grid">
                {PLAYER_COUNTS.map(option => (
                  <button
                    key={option.total}
                    type="button"
                    className={`count-option ${formData.cantidadJugadores === option.total ? 'selected' : ''}`}
                    onClick={() => handleChange('cantidadJugadores', option.total)}
                  >
                    <span className="count-format">{option.format}</span>
                    <span className="count-number">{option.total}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="nombre">
                Nombre del partido <span className="required">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Ej: Partido del Sábado"
                maxLength={50}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fecha">
                  Fecha <span className="required">*</span>
                </label>
                <div className="date-input-wrap">
                  <input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleChange('fecha', e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    min={getTodayString()}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="horario">
                  Horario <span className="required">*</span>
                </label>
                <TimePicker
                  id="horario"
                  value={formData.horario}
                  onChange={(v) => handleChange('horario', v)}
                  ariaLabel="Horario del partido"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ubicacion">
                Ubicación <span className="required">*</span>
              </label>
              <input
                id="ubicacion"
                type="text"
                value={formData.ubicacion}
                onChange={(e) => handleChange('ubicacion', e.target.value)}
                placeholder="Ej: Cancha Los Pinos, Av. Libertador 1234"
                maxLength={100}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-create"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Creando...' : 'Crear Partido'}</span>
              {!isSubmitting && <span className="btn-arrow" aria-hidden="true" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

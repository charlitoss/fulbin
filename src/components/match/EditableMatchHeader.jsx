import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, MapPin, Users, Edit2, Check, X, UserPlus, ChevronRight } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ShareButton from '../ui/ShareButton'
import Countdown from '../ui/Countdown'
import TimePicker from '../ui/TimePicker'
import { formatDate } from '../../utils/dateUtils'

function EditableMatchHeader({
  match,
  onAddPlayer,
  onPlayersPerTeamChange,
  isPastKickoff = false,
  onCountdownComplete,
  onStartMatch,
}) {
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  // Separate state for the split fechaHorario edit mode (date input + TimePicker)
  const [editFecha, setEditFecha] = useState('')
  const [editHorario, setEditHorario] = useState('')
  const pickerInputRef = useRef(null)
  const titleInputRef = useRef(null)

  // Open the native date picker as soon as the fechaHorario field enters edit mode
  useEffect(() => {
    if (editingField === 'fechaHorario' && pickerInputRef.current) {
      pickerInputRef.current.showPicker?.()
    }
  }, [editingField])

  // Auto-resize the title textarea (fallback for browsers without field-sizing: content)
  useEffect(() => {
    if (editingField !== 'nombre' || !titleInputRef.current) return
    const el = titleInputRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editingField, editValue])

  const saveDateTime = async (fecha, horario) => {
    if (!fecha || !horario) {
      cancelEdit()
      return
    }
    try {
      await updateMatch({
        matchId: match._id,
        fecha,
        horario,
      })
    } catch (err) {
      console.error('Error updating match:', err)
    }
    cancelEdit()
  }
  
  const updateMatch = useMutation(api.matches.update)
  
  const dateInfo = formatDate(match.fecha)
  
  const startEdit = (field, currentValue) => {
    setEditingField(field)
    setEditValue(currentValue)
  }
  
  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
    setEditFecha('')
    setEditHorario('')
  }
  
  const saveFieldValue = async (field, rawValue) => {
    const value = field === 'jugadoresPorEquipo' ? parseInt(rawValue, 10) : rawValue
    if (!value && field !== 'detallesUbicacion') {
      cancelEdit()
      return
    }
    try {
      await updateMatch({ matchId: match._id, [field]: value })
    } catch (err) {
      console.error('Error updating match:', err)
    }
    cancelEdit()
  }

  const saveEdit = async () => {
    if (!editValue.trim() && editingField !== 'detallesUbicacion') {
      cancelEdit()
      return
    }
    
    const newValue = editingField === 'jugadoresPorEquipo' 
      ? parseInt(editValue, 10) 
      : editValue.trim()
    
    try {
      await updateMatch({
        matchId: match._id,
        [editingField]: newValue,
      })
      
      // If players per team changed and we have a handler, call it
      if (editingField === 'jugadoresPorEquipo' && onPlayersPerTeamChange) {
        const oldValue = match.jugadoresPorEquipo
        if (newValue < oldValue) {
          onPlayersPerTeamChange(newValue, oldValue)
        }
      }
    } catch (err) {
      console.error('Error updating match:', err)
    }
    
    cancelEdit()
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }
  
  // Render editable field
  const renderEditableText = (field, value, icon, placeholder) => {
    if (editingField === field) {
      return (
        <div className="editable-field editing">
          {icon}
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
            className="editable-input"
          />
          <button className="edit-action-btn save" onClick={saveEdit}>
            <Check size={14} />
          </button>
          <button className="edit-action-btn cancel" onClick={cancelEdit}>
            <X size={14} />
          </button>
        </div>
      )
    }
    
    return (
      <div
        className="editable-field"
        onClick={() => startEdit(field, value)}
      >
        {icon}
        <span>{value || placeholder}</span>
        <ChevronRight size={16} className="edit-icon" />
      </div>
    )
  }
  
  // Render combined editable date + time as a single field. We split into a
  // native <input type="date"> (which has a popup picker in every browser)
  // and our custom <TimePicker> (because Firefox has no popup for type="time").
  const renderEditableDateTime = () => {
    if (editingField === 'fechaHorario') {
      return (
        <div className="editable-field editing editable-datetime">
          <input
            ref={pickerInputRef}
            type="date"
            value={editFecha}
            onChange={(e) => setEditFecha(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            onKeyDown={handleKeyDown}
            autoFocus
            className="editable-input editable-date-input"
          />
          <TimePicker
            value={editHorario}
            onChange={setEditHorario}
            ariaLabel="Horario del partido"
            className="editable-time-picker"
          />
          <button
            className="edit-action-btn save"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => saveDateTime(editFecha, editHorario)}
          >
            <Check size={14} />
          </button>
          <button
            className="edit-action-btn cancel"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelEdit}
          >
            <X size={14} />
          </button>
        </div>
      )
    }

    const monthNum = match.fecha ? Number(match.fecha.split('-')[1]) : ''
    const display = `${dateInfo.dayShort} ${dateInfo.day}/${monthNum} ${match.horario}`

    return (
      <div
        className="editable-field"
        onClick={() => {
          setEditingField('fechaHorario')
          setEditFecha(match.fecha)
          setEditHorario(match.horario)
        }}
      >
        <span>{display}</span>
        <ChevronRight size={16} className="edit-icon" />
      </div>
    )
  }
  
  // Handle direct select change for players per team
  const handlePlayersPerTeamChange = async (e) => {
    const newValue = parseInt(e.target.value, 10)
    
    try {
      await updateMatch({
        matchId: match._id,
        jugadoresPorEquipo: newValue,
        cantidadJugadores: newValue * 2,
      })
      
      // If players per team changed and we have a handler, call it
      if (onPlayersPerTeamChange) {
        const oldValue = match.jugadoresPorEquipo
        if (newValue < oldValue) {
          onPlayersPerTeamChange(newValue, oldValue)
        }
      }
    } catch (err) {
      console.error('Error updating match:', err)
    }
  }
  
  // Render editable players per team - direct dropdown
  const renderEditablePlayersPerTeam = () => {
    return (
      <div className="editable-field player-count-select">
        <select
          value={match.jugadoresPorEquipo}
          onChange={handlePlayersPerTeamChange}
          className="editable-select inline-select"
        >
          {[5, 6, 7, 8, 9, 10, 11].map(n => (
            <option key={n} value={n}>{n} vs {n}</option>
          ))}
        </select>
        <ChevronRight size={16} className="edit-icon" />
      </div>
    )
  }
  
  // Render editable title
  const renderEditableTitle = () => {
    if (editingField === 'nombre') {
      return (
        <div className="editable-title editing">
          <img src="/soccer-ball.svg" alt="" className="title-ball" />
          <textarea
            ref={titleInputRef}
            rows={1}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre del partido"
            autoFocus
            maxLength={80}
            className="editable-title-input"
          />
          <button className="edit-action-btn save" onClick={saveEdit}>
            <Check size={16} />
          </button>
          <button className="edit-action-btn cancel" onClick={cancelEdit}>
            <X size={16} />
          </button>
        </div>
      )
    }
    
    return (
      <h1 
        className="editable-title"
        onClick={() => startEdit('nombre', match.nombre)}
      >
        <img src="/soccer-ball.svg" alt="" className="title-ball" />
        {match.nombre}
        <Edit2 size={14} className="edit-icon" />
      </h1>
    )
  }
  
  return (
    <div className="match-header">
      <div className="match-header-title">
        {renderEditableTitle()}
      </div>

      <div className="match-header-info editable-info">
        {renderEditablePlayersPerTeam()}
        {renderEditableText('ubicacion', match.ubicacion, null, 'Ubicación')}
        {renderEditableDateTime()}
        <Countdown
          targetDate={match.fecha}
          targetTime={match.horario}
          onComplete={onCountdownComplete}
        />
      </div>

      <div className="match-header-actions">
        <ShareButton matchId={match._id} match={match} />
        {isPastKickoff && match.pasoActual === 'armado_equipos' && onStartMatch ? (
          <button className="btn-add-player btn-start-match" onClick={onStartMatch}>
            <span>Empezar partido</span>
          </button>
        ) : (
          onAddPlayer && (
            <button className="btn-add-player" onClick={onAddPlayer} title="Agregar jugador">
              <span className="icon-plus" aria-hidden="true" />
              <span>Anotarse</span>
            </button>
          )
        )}
      </div>
    </div>
  )
}

export default EditableMatchHeader

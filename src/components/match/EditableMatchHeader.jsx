import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, MapPin, Users, Edit2, Check, X, UserPlus, ChevronRight } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ShareButton from '../ui/ShareButton'
import Countdown from '../ui/Countdown'
import { formatDate } from '../../utils/dateUtils'

function EditableMatchHeader({ match, onAddPlayer, onPlayersPerTeamChange }) {
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const pickerInputRef = useRef(null)
  const titleInputRef = useRef(null)

  // Open the native picker as soon as the field enters edit mode
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

  const saveDateTime = async (datetimeLocalValue) => {
    if (!datetimeLocalValue) {
      cancelEdit()
      return
    }
    const [datePart, timePart] = datetimeLocalValue.split('T')
    try {
      await updateMatch({
        matchId: match._id,
        fecha: datePart,
        horario: timePart,
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
  
  // Render combined editable date + time as a single field
  const renderEditableDateTime = () => {
    if (editingField === 'fechaHorario') {
      return (
        <div className="editable-field editing">
          <input
            ref={pickerInputRef}
            type="datetime-local"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveDateTime(editValue)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="editable-input"
          />
        </div>
      )
    }

    const monthNum = match.fecha ? Number(match.fecha.split('-')[1]) : ''
    const display = `${dateInfo.dayShort} ${dateInfo.day}/${monthNum} ${match.horario}`

    return (
      <div
        className="editable-field"
        onClick={() => startEdit('fechaHorario', `${match.fecha}T${match.horario}`)}
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
          <img src="/soccer-ball.png" alt="" className="title-ball" />
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
        <img src="/soccer-ball.png" alt="" className="title-ball" />
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
        <Countdown targetDate={match.fecha} targetTime={match.horario} />
      </div>

      <div className="match-header-actions">
        <ShareButton matchId={match._id} match={match} />
        {onAddPlayer && (
          <button className="btn-add-player" onClick={onAddPlayer} title="Agregar jugador">
            <span className="icon-plus" aria-hidden="true" />
            <span>Anotarse</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default EditableMatchHeader

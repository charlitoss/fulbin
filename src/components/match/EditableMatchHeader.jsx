import { useState } from 'react'
import { Calendar, Clock, MapPin, Users, Edit2, Check, X, UserPlus, ChevronRight } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ShareButton from '../ui/ShareButton'
import Countdown from '../ui/Countdown'
import { formatDate } from '../../utils/dateUtils'

function EditableMatchHeader({ match, onAddPlayer, onPlayersPerTeamChange }) {
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  
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
    if (e.key === 'Enter') {
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
  
  // Render editable date
  const renderEditableDate = () => {
    if (editingField === 'fecha') {
      return (
        <div className="editable-field editing">
          <Calendar size={18} />
          <input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
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
        onClick={() => startEdit('fecha', match.fecha)}
      >
        <Calendar size={18} />
        <span>{dateInfo.dayName} {dateInfo.day} de {dateInfo.month}, {dateInfo.year}</span>
        <ChevronRight size={16} className="edit-icon" />
      </div>
    )
  }
  
  // Render editable time with countdown
  const renderEditableTime = () => {
    if (editingField === 'horario') {
      return (
        <div className="editable-field editing">
          <Clock size={18} />
          <input
            type="time"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
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
      <div className="time-with-countdown">
        <div
          className="editable-field"
          onClick={() => startEdit('horario', match.horario)}
        >
          <Clock size={18} />
          <span>{match.horario}</span>
          <ChevronRight size={16} className="edit-icon" />
        </div>
        <Countdown targetDate={match.fecha} targetTime={match.horario} />
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
        <Users size={18} />
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
          <span>⚽</span>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre del partido"
            autoFocus
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
        <span>⚽</span>
        {match.nombre}
        <Edit2 size={14} className="edit-icon" />
      </h1>
    )
  }
  
  return (
    <div className="match-header">
      <div className="match-header-top">
        {renderEditableTitle()}
        {onAddPlayer && (
          <button className="btn-add-player" onClick={onAddPlayer} title="Agregar jugador">
            <UserPlus size={18} />
            <span>Anotarse</span>
          </button>
        )}
        <ShareButton matchId={match._id} match={match} />
      </div>
      
      <div className="match-header-info editable-info">
        {renderEditableTime()}
        {renderEditableText('ubicacion', match.ubicacion, <MapPin size={18} />, 'Ubicación')}
        {renderEditableDate()}
        {renderEditablePlayersPerTeam()}
      </div>
    </div>
  )
}

export default EditableMatchHeader

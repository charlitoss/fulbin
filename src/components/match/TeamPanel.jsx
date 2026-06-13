import { useState } from 'react'
import { X, Info, Edit2, Check, ArrowLeftRight, UserPlus } from 'lucide-react'
import { PHYSICAL_STATES } from '../../utils/constants'
import PlayerCard from '../player/PlayerCard'
import EmptySlot from '../player/EmptySlot'

function TeamPanel({
  team, // 'blanco' or 'oscuro'
  teamName,
  players, // Array of { player, ...assignment }
  registrations,
  onViewInfo,
  onUnassign,
  onSwapTeam, // Callback to swap player to other team
  onAddPlayer, // Prop for adding player
  onTeamNameChange, // Callback for name change
  jugadoresPorEquipo, // Number of players per team
  mode = 'builder', // 'builder' | 'in-game'
  onGoalDelta, // (jugadorId, delta) — only used in 'in-game' mode
  readOnly = false, // in-game: goals shown without +/-; builder: spectator view (no edits)
  points = null, // points each player on this team earned (finalized view)
}) {
  const isInGame = mode === 'in-game'
  // Builder-mode interactions (drag, rename, add/remove) are off for spectators.
  const interactive = !isInGame && !readOnly
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggingPlayerId, setDraggingPlayerId] = useState(null)
  
  // Drag handlers for player rows
  const handleDragStart = (e, playerId) => {
    setDraggingPlayerId(playerId)
    e.dataTransfer.setData('text/plain', JSON.stringify({ playerId, fromTeam: team }))
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragEnd = () => {
    setDraggingPlayerId(null)
  }
  
  // Drop zone handlers for the panel
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }
  
  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setIsDragOver(false)
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data.fromTeam && data.fromTeam !== team && data.playerId) {
        onSwapTeam(data.playerId)
      }
    } catch (err) {
      // Ignore invalid drag data
    }
  }
  
  const handleStartEdit = () => {
    setEditName(teamName)
    setIsEditing(true)
  }
  
  const handleSave = () => {
    if (editName.trim() && onTeamNameChange) {
      onTeamNameChange(team, editName.trim())
    }
    setIsEditing(false)
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }
  // Get physical state for a player
  const getPhysicalState = (playerId) => {
    const reg = registrations.find(r => r.jugadorId === playerId)
    return PHYSICAL_STATES[reg?.estadoFisico] || PHYSICAL_STATES.normal
  }
  
  // Render assigned player with index
  const renderAssignedPlayer = (assignment, index) => {
    const player = assignment.player
    if (!player) return null

    const playerId = player._id || player.id
    const registration = registrations.find(r => r.jugadorId === playerId)
    const isDragging = draggingPlayerId === playerId

    if (isInGame) {
      return (
        <PlayerCard
          key={playerId}
          player={player}
          registration={registration}
          index={index}
          compact={true}
          goalControls={{
            goles: assignment.goles ?? 0,
            onDelta: readOnly ? null : (delta) => onGoalDelta?.(playerId, delta),
            readOnly,
          }}
          points={points}
        />
      )
    }

    // Spectator (read-only) builder view: show the player, no drag/move/remove.
    if (readOnly) {
      return (
        <PlayerCard
          key={playerId}
          player={player}
          registration={registration}
          onCardClick={onViewInfo}
          index={index}
          compact={true}
        />
      )
    }

    return (
      <div
        key={playerId}
        className={isDragging ? 'dragging' : ''}
        draggable
        onDragStart={(e) => handleDragStart(e, playerId)}
        onDragEnd={handleDragEnd}
      >
        <PlayerCard
          player={player}
          registration={registration}
          onMove={() => onSwapTeam(playerId)}
          onRemove={() => onUnassign(playerId)}
          onCardClick={onViewInfo}
          index={index}
          compact={true}
        />
      </div>
    )
  }
  
  return (
    <div
      className={`team-panel team-panel-${team} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={interactive ? handleDragOver : undefined}
      onDragLeave={interactive ? handleDragLeave : undefined}
      onDrop={interactive ? handleDrop : undefined}
    >
      <div className={`team-panel-header team-${team}`}>
        {isEditing && interactive ? (
          <div className="team-panel-title-edit">
            <img
              src={team === 'blanco' ? '/icons/teamflag-light.svg' : '/icons/teamflag-dark.svg'}
              alt=""
              className="step-title-icon team-flag-icon"
              width="32"
              height="32"
            />
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="team-name-input-inline"
              autoFocus
              maxLength={25}
            />
            <button className="btn-icon-sm btn-save-name" onClick={handleSave}>
              <Check size={14} />
            </button>
          </div>
        ) : (
          <h3
            className="step-title team-panel-title"
            onClick={interactive ? handleStartEdit : undefined}
            title={interactive ? 'Click para editar' : undefined}
          >
            <img
              src={team === 'blanco' ? '/icons/teamflag-light.svg' : '/icons/teamflag-dark.svg'}
              alt=""
              className="step-title-icon team-flag-icon"
              width="32"
              height="32"
            />
            {teamName}
            {interactive && <Edit2 size={12} className="edit-icon-inline" />}
          </h3>
        )}
        <span className="count-chip">{players.length}</span>
      </div>

      <div className="team-panel-list">
        {/* Jugadores asignados */}
        {players.map((assignment, index) => renderAssignedPlayer(assignment, index))}

        {/* Lugares vacíos */}
        {interactive && jugadoresPorEquipo && Array.from({ length: Math.max(0, jugadoresPorEquipo - players.length) }).map((_, index) => (
          <EmptySlot
            key={`empty-${index}`}
            index={players.length + index}
            onClick={() => onAddPlayer(team)}
          />
        ))}
      </div>
    </div>
  )
}

export default TeamPanel

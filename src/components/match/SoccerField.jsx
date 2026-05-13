import { useState, useRef, useEffect, useCallback } from 'react'
import { PHYSICAL_STATES } from '../../utils/constants'
import Field from './Field'

function SoccerField({
  teamConfig,
  players,
  registrations,
  onPositionChange,
  onSwapTeam,
  onPlayerClick
}) {
  const [dragging, setDragging] = useState(null)
  const [dragPosition, setDragPosition] = useState(null)
  const fieldRef = useRef(null)
  const draggingRef = useRef(null)
  
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
  
  // Drag and drop handlers
  const handleDragStart = (e, playerId) => {
    setDragging(playerId)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    if (!dragging || !fieldRef.current) return
    
    const rect = fieldRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // Clamp values
    const clampedX = Math.max(5, Math.min(95, x))
    const clampedY = Math.max(5, Math.min(95, y))
    
    // Check if player crossed the center line (team boundary)
    // Field is now landscape: blanco = left half (x < 50), oscuro = right (x >= 50)
    const assignment = teamConfig.asignaciones.find(a => a.jugadorId === dragging)
    if (assignment) {
      const wasInBlancoHalf = assignment.equipo === 'blanco'
      const isNowInBlancoHalf = clampedX < 50

      if (wasInBlancoHalf !== isNowInBlancoHalf) {
        // Player crossed to the other team's half - swap team
        onSwapTeam(dragging)
        setDragging(null)
        return
      }
    }
    
    onPositionChange(dragging, clampedX, clampedY)
    setDragging(null)
  }
  
  const handleDragEnd = () => {
    setDragging(null)
  }
  
  // Touch handlers for mobile — attached to document during drag
  // to ensure events are captured regardless of which element the finger is over
  const handleTouchStart = (e, playerId, assignment) => {
    e.preventDefault()
    draggingRef.current = playerId
    setDragging(playerId)
    setDragPosition({ x: assignment.coordenadaX, y: assignment.coordenadaY })
  }

  const handleTouchMove = useCallback((e) => {
    if (!draggingRef.current || !fieldRef.current) return
    e.preventDefault()

    const touch = e.touches[0]
    const rect = fieldRef.current.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100

    const clampedX = Math.max(5, Math.min(95, x))
    const clampedY = Math.max(5, Math.min(95, y))

    setDragPosition({ x: clampedX, y: clampedY })
  }, [])

  const handleTouchEnd = useCallback(() => {
    const currentDragging = draggingRef.current
    if (!currentDragging || !fieldRef.current) {
      draggingRef.current = null
      setDragging(null)
      setDragPosition(null)
      return
    }

    setDragPosition(prev => {
      if (!prev) {
        draggingRef.current = null
        setDragging(null)
        return null
      }

      // Check if player crossed the center line during touch drag
      const assignment = teamConfig.asignaciones.find(a => a.jugadorId === currentDragging)
      if (assignment) {
        const wasInBlancoHalf = assignment.equipo === 'blanco'
        const isNowInBlancoHalf = prev.y < 50

        if (wasInBlancoHalf !== isNowInBlancoHalf) {
          onSwapTeam(currentDragging)
          draggingRef.current = null
          setDragging(null)
          return null
        }
      }

      onPositionChange(currentDragging, prev.x, prev.y)
      draggingRef.current = null
      setDragging(null)
      return null
    })
  }, [teamConfig.asignaciones, onSwapTeam, onPositionChange])

  // Attach touch move/end listeners to document during drag so events
  // are captured even if the finger moves outside the player element
  useEffect(() => {
    if (!dragging) return

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [dragging, handleTouchMove, handleTouchEnd])
  
  // Render player marker
  const renderPlayer = (assignment) => {
    const player = players[assignment.jugadorId]
    if (!player) return null

    const registration = registrations.find(r => r.jugadorId === assignment.jugadorId)
    const physicalState = PHYSICAL_STATES[registration?.estadoFisico] || PHYSICAL_STATES.normal
    const tinyStateIcon = physicalState.icon?.replace('Size=Medium', 'Size=Tiny')
    const isBlanco = assignment.equipo === 'blanco'
    const isDragging = dragging === assignment.jugadorId
    const firstName = (player.nombre || '').split(' ')[0].toUpperCase()

    const posX = isDragging && dragPosition ? dragPosition.x : assignment.coordenadaX
    const posY = isDragging && dragPosition ? dragPosition.y : assignment.coordenadaY

    return (
      <div
        key={assignment.jugadorId}
        className={`field-player ${isBlanco ? 'team-blanco' : 'team-oscuro'} ${isDragging ? 'dragging' : ''}`}
        style={{
          left: `${posX}%`,
          top: `${posY}%`,
        }}
        draggable
        onDragStart={(e) => handleDragStart(e, assignment.jugadorId)}
        onDragEnd={handleDragEnd}
        onTouchStart={(e) => handleTouchStart(e, assignment.jugadorId, assignment)}
        onClick={() => onPlayerClick(player)}
      >
        <div className="field-player-dot" aria-hidden="true" />
        <div className="field-player-tag">
          <span className="field-player-name">{firstName}</span>
          {tinyStateIcon && (
            <img
              src={tinyStateIcon}
              alt={physicalState.label}
              title={physicalState.label}
              className="field-player-mood"
              width="10"
              height="10"
            />
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="soccer-field-container">
      {/* Soccer Field SVG */}
      <div
        ref={fieldRef}
        className="soccer-field"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Field />

        {/* Player markers */}
        <div className="field-players">
          {teamConfig.asignaciones.map(renderPlayer)}
        </div>

        {/* Empty state */}
        {teamConfig.asignaciones.length === 0 && (
          <div className="field-empty">
            <p>Asigna jugadores a los equipos</p>
            <p>desde el panel lateral</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SoccerField

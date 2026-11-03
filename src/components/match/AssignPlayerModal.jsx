import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { PHYSICAL_STATES } from '../../utils/constants'

function AssignPlayerModal({
  isOpen,
  onClose,
  player,
  registration,
  currentAssignment,
  teamConfig,
  playersPerTeam,
  onAssign,
  onUnassign
}) {
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  
  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen && player) {
      setSelectedTeam(currentAssignment?.equipo || null)
      setSelectedRole(currentAssignment?.rol || null)
    }
  }, [isOpen, player, currentAssignment])
  
  if (!player) return null
  
  const physicalState = PHYSICAL_STATES[registration?.estadoFisico] || PHYSICAL_STATES.normal
  
  // Count players per team
  const blancoCount = teamConfig.asignaciones.filter(a => a.equipo === 'blanco').length
  const oscuroCount = teamConfig.asignaciones.filter(a => a.equipo === 'oscuro').length
  
  // Count roles per team
  const getRoleCounts = (team) => {
    return teamConfig.asignaciones
      .filter(a => a.equipo === team)
      .reduce((acc, a) => {
        acc[a.rol] = (acc[a.rol] || 0) + 1
        return acc
      }, {})
  }
  
  const blancoRoles = getRoleCounts('blanco')
  const oscuroRoles = getRoleCounts('oscuro')
  
  // Check if team is full
  const isTeamFull = (team) => {
    const count = team === 'blanco' ? blancoCount : oscuroCount
    // Don't count current player if already assigned to this team
    const adjustment = currentAssignment?.equipo === team ? 1 : 0
    return (count - adjustment) >= playersPerTeam
  }
  
  // Check if role is available (only 1 goalkeeper per team)
  const isRoleAvailable = (team, role) => {
    if (role !== 'arquero') return true
    const roles = team === 'blanco' ? blancoRoles : oscuroRoles
    const currentCount = roles.arquero || 0
    // Don't count current player if already assigned as goalkeeper on this team
    const adjustment = currentAssignment?.equipo === team && currentAssignment?.rol === 'arquero' ? 1 : 0
    return (currentCount - adjustment) < 1
  }
  
  const handleAssign = () => {
    if (selectedTeam && selectedRole) {
      const playerId = player._id || player.id
      onAssign(playerId, selectedTeam, selectedRole)
    }
  }
  
  const handleUnassign = () => {
    const playerId = player._id || player.id
    onUnassign(playerId)
    onClose()
  }
  
  const roles = [
    { id: 'arquero', label: 'Arquero', icon: '🧤' },
    { id: 'defensor', label: 'Defensor', icon: '🛡️' },
    { id: 'medio', label: 'Mediocampista', icon: '⚙️' },
    { id: 'delantero', label: 'Delantero', icon: '⚡' }
  ]
  
  // Get preferred position hint
  const preferredPosition = player.perfilPermanente?.posicionPreferida
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Asignar: ${player.nombre}`}
      footer={
        <>
          {currentAssignment && (
            <button className="btn btn-ghost" onClick={handleUnassign}>
              Quitar del equipo
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={!selectedTeam || !selectedRole}
          >
            {currentAssignment ? 'Actualizar' : 'Asignar'}
          </button>
        </>
      }
    >
      <div className="assign-modal-content">
        {/* Player info summary */}
        <div className="assign-player-summary">
          <span className="player-state-badge">
            {physicalState.emoji} {physicalState.label}
          </span>
          {preferredPosition && (
            <span className="player-preferred">
              Posición preferida: {preferredPosition}
            </span>
          )}
        </div>
        
        {/* Team selection */}
        <div className="assign-section">
          <label>Equipo</label>
          <div className="team-selector">
            <button
              className={`team-option team-blanco ${selectedTeam === 'blanco' ? 'selected' : ''} ${isTeamFull('blanco') ? 'full' : ''}`}
              onClick={() => !isTeamFull('blanco') && setSelectedTeam('blanco')}
              disabled={isTeamFull('blanco')}
            >
              <span className="team-color blanco" />
              <span className="team-name">{teamConfig.nombreEquipoBlanco}</span>
              <span className="team-count">{blancoCount}/{playersPerTeam}</span>
            </button>
            
            <button
              className={`team-option team-oscuro ${selectedTeam === 'oscuro' ? 'selected' : ''} ${isTeamFull('oscuro') ? 'full' : ''}`}
              onClick={() => !isTeamFull('oscuro') && setSelectedTeam('oscuro')}
              disabled={isTeamFull('oscuro')}
            >
              <span className="team-color oscuro" />
              <span className="team-name">{teamConfig.nombreEquipoOscuro}</span>
              <span className="team-count">{oscuroCount}/{playersPerTeam}</span>
            </button>
          </div>
        </div>
        
        {/* Role selection */}
        <div className="assign-section">
          <label>Rol</label>
          <div className="role-selector">
            {roles.map(role => {
              const isAvailable = !selectedTeam || isRoleAvailable(selectedTeam, role.id)
              const roleCounts = selectedTeam === 'blanco' ? blancoRoles : oscuroRoles
              const currentCount = roleCounts[role.id] || 0
              
              return (
                <button
                  key={role.id}
                  className={`role-option ${selectedRole === role.id ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                  onClick={() => isAvailable && setSelectedRole(role.id)}
                  disabled={!isAvailable}
                >
                  <span className="role-icon">{role.icon}</span>
                  <span className="role-label">{role.label}</span>
                  {selectedTeam && (
                    <span className="role-count">
                      {currentCount} en equipo
                    </span>
                  )}
                  {!isAvailable && role.id === 'arquero' && (
                    <span className="role-warning">Ya hay arquero</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Hint */}
        {preferredPosition && selectedRole && (
          <div className="assign-hint">
            {getPreferredRoleMatch(preferredPosition, selectedRole)}
          </div>
        )}
      </div>
    </Modal>
  )
}

// Helper to show if selected role matches preference
function getPreferredRoleMatch(preferredPosition, selectedRole) {
  const positionToRole = {
    'Arquero': 'arquero',
    'Defensor': 'defensor',
    'Mediocampista': 'medio',
    'Delantero': 'delantero'
  }
  
  const preferredRole = positionToRole[preferredPosition]
  
  if (preferredRole === selectedRole) {
    return <span className="hint-match">✓ Coincide con su posición preferida</span>
  }
  
  return <span className="hint-different">ℹ️ Su posición preferida es {preferredPosition}</span>
}

export default AssignPlayerModal

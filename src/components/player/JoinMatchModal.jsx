import { useState, useEffect, useRef, useMemo } from 'react'
import { X, UserPlus, Users, Clock, Eye, ArrowRight } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../ui/Modal'
import { PHYSICAL_STATES, MAX_SUPLENTES } from '../../utils/constants'

const REGISTRATION_TYPES = {
  jugador: { label: 'Jugador', icon: Users, description: 'Jugar en el partido' },
  suplente: { label: 'Suplente', icon: Clock, description: 'En lista de espera' },
  hinchada: { label: 'Hinchada', icon: Eye, description: 'Ir a ver el partido' }
}

const STATE_ICONS = {
  cansado: '/icons/State=Down, Size=Medium.svg',
  normal: '/icons/State=Good, Size=Medium.svg',
  excelente: '/icons/State=Fire, Size=Medium.svg',
}

function JoinMatchModal({ isOpen, onClose, matchId, onJoined, match, playerOnly = false, defaultType = null }) {
  // Main player (the person filling the form)
  const [nombre, setNombre] = useState('')
  const [estadoFisico, setEstadoFisico] = useState('normal')
  const [tipoInscripcion, setTipoInscripcion] = useState('jugador')
  
  // Friends to add
  const [friendName, setFriendName] = useState('')
  const [friends, setFriends] = useState([])
  const friendInputRef = useRef(null)
  
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Players from the organizer's roster who aren't registered yet (empty for
  // unowned matches) — offered as one-tap chips.
  const [selectedRoster, setSelectedRoster] = useState([])

  // Convex queries
  const registrations = useQuery(api.registrations.listByMatch, isOpen && matchId ? { matchId } : "skip")
  const rosterAvailable = useQuery(api.players.availableForMatch, isOpen && matchId ? { matchId } : "skip")

  // Convex mutations. The server resolves names against the match owner's
  // roster (find-or-create) and rejects duplicates with YA_INSCRITO.
  const joinMatch = useMutation(api.registrations.join)

  // Calculate available spots - always count from registrations
  const spotsInfo = useMemo(() => {
    if (!registrations || !match) {
      return { jugadores: 0, suplentes: 0, cupoTotal: 10, maxSuplentes: MAX_SUPLENTES }
    }

    const cupoTotal = match.cantidadJugadores // Total de jugadores (ya es jugadoresPorEquipo * 2)
    const maxSuplentes = MAX_SUPLENTES
    
    // Siempre contar desde registrations - jugadores son los que NO son suplente ni hinchada
    const jugadores = registrations.filter(r => 
      r.asistira && 
      r.tipoInscripcion !== 'suplente' && 
      r.tipoInscripcion !== 'hinchada'
    ).length
    
    const suplentes = registrations.filter(r => 
      r.asistira && 
      r.tipoInscripcion === 'suplente'
    ).length
    
    return { jugadores, suplentes, cupoTotal, maxSuplentes }
  }, [registrations, match])
  
  useEffect(() => {
    if (isOpen && matchId) {
      // If playerOnly mode, always set to jugador
      if (playerOnly) {
        setTipoInscripcion('jugador')
      } else if (defaultType) {
        // Caller pre-selected a type (e.g. clicked the Suplentes empty slot)
        setTipoInscripcion(defaultType)
      } else {
        // Auto-select type based on availability
        if (spotsInfo.jugadores >= spotsInfo.cupoTotal) {
          if (spotsInfo.suplentes >= spotsInfo.maxSuplentes) {
            setTipoInscripcion('hinchada')
          } else {
            setTipoInscripcion('suplente')
          }
        } else {
          setTipoInscripcion('jugador')
        }
      }
    }
  }, [isOpen, matchId, playerOnly, defaultType, spotsInfo])
  
  // Check if type is available
  const isTypeAvailable = (type) => {
    if (type === 'jugador') {
      return spotsInfo.jugadores < spotsInfo.cupoTotal
    }
    if (type === 'suplente') {
      return spotsInfo.suplentes < spotsInfo.maxSuplentes
    }
    return true // hinchada always available
  }
  
  // Process friend names and return validated friends + any errors
  // This is extracted so it can be reused by handleAddFriend and handleSubmit
  const processFriendNames = (namesString, currentFriends) => {
    const names = namesString.split(',').map(n => n.trim()).filter(n => n.length > 0)
    
    if (names.length === 0) {
      return { newFriends: [], errors: [] }
    }
    
    const errors = []
    const newFriends = []
    
    for (const name of names) {
      if (name.length < 2) {
        errors.push(`"${name}" debe tener al menos 2 caracteres`)
        continue
      }
      
      if (nombre.trim().toLowerCase() === name.toLowerCase()) {
        errors.push(`"${name}" es tu propio nombre`)
        continue
      }
      
      const alreadyInList = currentFriends.some(f => f.nombre.toLowerCase() === name.toLowerCase()) ||
        newFriends.some(f => f.nombre.toLowerCase() === name.toLowerCase())

      if (alreadyInList) {
        errors.push(`"${name}" ya está en la lista`)
        continue
      }

      newFriends.push({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${newFriends.length}`,
        nombre: name
      })
    }
    
    return { newFriends, errors }
  }
  
  // Add friend(s) to the list - supports multiple names separated by comma
  const handleAddFriend = () => {
    setError('')
    
    if (!friendName.trim()) {
      setError('Ingresa el nombre del amigo')
      return
    }
    
    const { newFriends, errors } = processFriendNames(friendName, friends)
    
    if (newFriends.length > 0) {
      setFriends([...friends, ...newFriends])
    }
    
    if (errors.length > 0) {
      setError(errors.join('. '))
    }
    
    setFriendName('')
    friendInputRef.current?.focus()
  }
  
  // Remove friend from list
  const handleRemoveFriend = (id) => {
    setFriends(friends.filter(f => f.id !== id))
  }

  const toggleRosterPlayer = (player) => {
    setSelectedRoster(prev =>
      prev.some(p => p._id === player._id)
        ? prev.filter(p => p._id !== player._id)
        : [...prev, player]
    )
  }
  
  // Submit main player + friends
  const handleSubmit = async () => {
    setError('')
    
    // Auto-add any pending friend names before submitting
    let finalFriends = friends
    if (friendName.trim() && tipoInscripcion !== 'hinchada') {
      const { newFriends, errors } = processFriendNames(friendName, friends)
      if (newFriends.length > 0) {
        finalFriends = [...friends, ...newFriends]
        setFriends(finalFriends)
        setFriendName('')
      }
      if (errors.length > 0) {
        setError(errors.join('. '))
        return
      }
    }
    
    // Roster selections only count outside hinchada mode (the section is
    // hidden there); a main name is optional when there are selections.
    const rosterToRegister = tipoInscripcion !== 'hinchada' ? selectedRoster : []

    // Validate main player name
    const trimmedName = nombre.trim()
    if (!trimmedName && rosterToRegister.length === 0) {
      setError('Ingresá tu nombre o elegí jugadores del plantel')
      return
    }

    if (trimmedName && trimmedName.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return
    }

    // Check availability for selected type
    if (!isTypeAvailable(tipoInscripcion)) {
      setError(`No hay más lugares disponibles como ${REGISTRATION_TYPES[tipoInscripcion].label.toLowerCase()}`)
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Calculate how many spots are available for jugadores
      const availableJugadorSpots = spotsInfo.cupoTotal - spotsInfo.jugadores

      // 1. Register main player (server resolves the player by name)
      let mainPlayerId
      if (trimmedName) {
        try {
          const result = await joinMatch({
            matchId,
            nombre: trimmedName,
            estadoFisico: tipoInscripcion === 'hinchada' ? 'normal' : estadoFisico,
            tipoInscripcion: tipoInscripcion,
          })
          mainPlayerId = result.playerId
        } catch (err) {
          if (String(err.message).includes('YA_INSCRITO')) {
            setError('Ya estás inscrito en este partido')
            setIsSubmitting(false)
            return
          }
          throw err
        }
      }

      // Track how many jugador spots we've used (1 for main player if they're jugador)
      let jugadorSpotsUsed = trimmedName && tipoInscripcion === 'jugador' ? 1 : 0

      // 2. Register roster picks + friends - overflow goes to suplentes if
      // registering as jugador. Skip roster picks that duplicate typed names.
      const typedNames = new Set(
        [trimmedName, ...finalFriends.map(f => f.nombre)]
          .filter(Boolean)
          .map(n => n.toLowerCase())
      )
      const others = [
        ...rosterToRegister
          .filter(p => !typedNames.has(p.nombre.toLowerCase()))
          .map(p => ({ playerId: p._id, nombre: p.nombre })),
        ...finalFriends.map(f => ({ nombre: f.nombre })),
      ]

      const joinErrors = []
      for (const person of others) {
        // Determine registration type for this person
        let personType = tipoInscripcion
        if (tipoInscripcion === 'jugador') {
          // Check if we still have jugador spots
          if (jugadorSpotsUsed >= availableJugadorSpots) {
            // Overflow to suplente
            personType = 'suplente'
          } else {
            jugadorSpotsUsed++
          }
        }

        try {
          await joinMatch({
            matchId,
            ...(person.playerId ? { playerId: person.playerId } : { nombre: person.nombre }),
            estadoFisico: 'normal',
            tipoInscripcion: personType,
          })
        } catch (err) {
          if (String(err.message).includes('YA_INSCRITO')) {
            joinErrors.push(`"${person.nombre}" ya está inscrito`)
          } else {
            throw err
          }
        }
      }

      if (joinErrors.length > 0) {
        setError(joinErrors.join('. '))
        setIsSubmitting(false)
        return
      }

      // Reset and close
      setNombre('')
      setEstadoFisico('normal')
      setTipoInscripcion('jugador')
      setFriendName('')
      setFriends([])
      setSelectedRoster([])
      setIsSubmitting(false)
      
      if (onJoined) {
        // Pass the main player ID so the caller can auto-assign if needed
        onJoined(mainPlayerId)
      }
      
      onClose()
    } catch (err) {
      console.error('Error registering:', err)
      setError('Error al inscribir. Por favor intenta de nuevo.')
      setIsSubmitting(false)
    }
  }
  
  const handleClose = () => {
    setNombre('')
    setEstadoFisico('normal')
    setTipoInscripcion('jugador')
    setFriendName('')
    setFriends([])
    setSelectedRoster([])
    setError('')
    onClose()
  }
  
  const handleFriendKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddFriend()
    }
  }
  
  // Count pending friends in the input field (comma-separated names)
  const pendingFriendsCount = friendName.trim()
    ? friendName.split(',').map(n => n.trim()).filter(n => n.length > 0).length
    : 0
  const rosterCount = tipoInscripcion !== 'hinchada' ? selectedRoster.length : 0
  const totalToRegister = (nombre.trim() ? 1 : 0) + rosterCount + friends.length + pendingFriendsCount
  const cupoLleno = spotsInfo.jugadores >= spotsInfo.cupoTotal
  const suplentesLleno = spotsInfo.suplentes >= spotsInfo.maxSuplentes

  // On touch devices, don't autofocus the name field: it pops the on-screen
  // keyboard on open and hides the lower half of the form (physical state,
  // invite-a-friend). Let users see the whole form first, then tap to focus.
  // Desktop (fine pointer) keeps autofocus so you can type right away.
  const autoFocusName = typeof window !== 'undefined'
    && !window.matchMedia('(pointer: coarse)').matches

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      title="Anotarse al partido"
      footer={
        <>
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <span>
              {isSubmitting
                ? 'Inscribiendo...'
                : totalToRegister > 1
                  ? `Confirmar (${totalToRegister})`
                  : 'Confirmar'
              }
            </span>
            {!isSubmitting && <span className="icon-arrow-right" aria-hidden="true" />}
          </button>
        </>
      }
    >
      <div className="join-form">
        {error && (
          <div className="form-error">{error}</div>
        )}
        
        {/* Registration type selector - only show if not playerOnly */}
        {!playerOnly && (
          <div className="form-group">
            <div className="registration-type-selector">
              {Object.entries(REGISTRATION_TYPES).map(([key, type]) => {
                const available = isTypeAvailable(key)
                const isSelected = tipoInscripcion === key

                return (
                  <div
                    key={key}
                    className={`type-option ${isSelected ? 'selected' : ''} ${!available ? 'disabled' : ''}`}
                    onClick={() => available && setTipoInscripcion(key)}
                  >
                    <span className="type-label">{type.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Spots info */}
            <div className="spots-info">
              <span>Jugadores {spotsInfo.jugadores}/{spotsInfo.cupoTotal}</span>
              <span>Suplentes {spotsInfo.suplentes}</span>
            </div>
          </div>
        )}
        
        {/* Main player section */}
        <div className="form-group">
          <label htmlFor="nombre">
            Tu nombre <span className="required">*</span>
          </label>
          <input
            type="text"
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            maxLength={50}
            autoFocus={autoFocusName}
          />
        </div>
        
        {/* Physical state - only for jugador and suplente */}
        {tipoInscripcion !== 'hinchada' && (
          <div className="form-group">
            <div className="physical-state-selector">
              {Object.entries(PHYSICAL_STATES).map(([key, state]) => (
                <div
                  key={key}
                  className={`state-option ${estadoFisico === key ? 'selected' : ''}`}
                  onClick={() => setEstadoFisico(key)}
                >
                  <img src={STATE_ICONS[key]} alt="" className="state-icon" />
                  <span className="state-label">{state.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Roster quick-select - players the organizer already manages */}
        {tipoInscripcion !== 'hinchada' && rosterAvailable?.length > 0 && (
          <div className="form-group roster-picker">
            <label>Del plantel</label>
            <div className="roster-chips">
              {rosterAvailable.map((player) => {
                const selected = selectedRoster.some(p => p._id === player._id)
                return (
                  <button
                    key={player._id}
                    type="button"
                    className={`roster-chip${selected ? ' selected' : ''}`}
                    onClick={() => toggleRosterPlayer(player)}
                  >
                    {player.nombre}
                  </button>
                )
              })}
            </div>
            <span className="hint">Tocá los jugadores que querés anotar</span>
          </div>
        )}

        {/* Friends section - only for jugador and suplente */}
        {tipoInscripcion !== 'hinchada' && (
          <div className="friends-section form-group">
            <label htmlFor="friend-input">Anota a un amigo (opcional)</label>
            <input
              id="friend-input"
              ref={friendInputRef}
              type="text"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              placeholder="Juan, Pedro, Mati"
              maxLength={200}
              className="friend-input"
            />
            <span className="hint">Podes agregar varios separados por coma</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default JoinMatchModal

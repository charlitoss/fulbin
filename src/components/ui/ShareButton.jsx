import { useState, useRef, useEffect, useMemo } from 'react'
import { Share2, Check, Link2, MessageCircle, X } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { formatDate } from '../../utils/dateUtils'
import { copyToClipboard, openWhatsApp, appBaseUrl } from '../../utils/share'

function ShareButton({ matchId, match }) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef(null)

  // Player / team data for the share message. These queries are already loaded
  // (and cached by Convex) by the inscription / team-builder steps, so this
  // adds no extra network cost — it just lets the share message list players.
  const registrationsData = useQuery(api.registrations.listByMatch, { matchId })
  const playersData = useQuery(api.players.list)
  const teamConfig = useQuery(api.teamConfigurations.getByMatch, { matchId })

  const playersById = useMemo(() => {
    if (!playersData) return {}
    return playersData.reduce((acc, player) => {
      acc[player._id] = player
      return acc
    }, {})
  }, [playersData])

  // Get match data for the share message (match is now passed as prop)
  const shortCode = match?.codigoCorto || ''
  const shareUrl = shortCode
    ? `${appBaseUrl()}#/p/${shortCode}`
    : `${appBaseUrl()}#/partido/${matchId}`
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])
  
  const playerName = (jugadorId) => playersById[jugadorId]?.nombre || 'Jugador'
  const byTimestamp = (a, b) => new Date(a.timestamp) - new Date(b.timestamp)

  // Suplentes + hinchada lists, shared by the inscription and team-builder steps
  const buildBenchSections = () => {
    const regs = registrationsData || []
    const suplentes = regs
      .filter(r => r.asistira && r.tipoInscripcion === 'suplente')
      .sort(byTimestamp)
    const hinchada = regs
      .filter(r => r.asistira && r.tipoInscripcion === 'hinchada')
      .sort(byTimestamp)

    let section = ''
    if (suplentes.length) {
      section += `\n\n🔄 *Suplentes:*\n` + suplentes.map(r => `- ${playerName(r.jugadorId)}`).join('\n')
    }
    if (hinchada.length) {
      section += `\n\n👀 *Hinchada:*\n` + hinchada.map(r => `- ${playerName(r.jugadorId)}`).join('\n')
    }
    return section
  }

  // Match details block shared in every step
  const buildHeader = () => {
    const dateInfo = formatDate(match.fecha)
    const playersFormat = `${match.jugadoresPorEquipo} vs ${match.jugadoresPorEquipo}`

    return `⚽ *${match.nombre}*

📅 ${dateInfo.dayName} ${dateInfo.day} de ${dateInfo.month} - ${match.horario}hs
📍 ${match.ubicacion}
👥 ${playersFormat}`
  }

  // Inscription step: list inscribed players + count, plus suplentes / hinchada if any
  const buildInscriptionSection = () => {
    const regs = registrationsData || []
    const inscribed = regs
      .filter(r => r.asistira && r.tipoInscripcion !== 'suplente' && r.tipoInscripcion !== 'hinchada')
      .sort(byTimestamp)

    let section = `\n\n✅ *Anotados (${inscribed.length}/${match.cantidadJugadores}):*\n`
    section += inscribed.length
      ? inscribed.map((r, i) => `${i + 1}. ${playerName(r.jugadorId)}`).join('\n')
      : '_Todavía no hay anotados_'

    return section + buildBenchSections()
  }

  // Team builder step: list players grouped by team, plus suplentes / hinchada if any
  const buildTeamSection = () => {
    const assignments = teamConfig?.asignaciones || []
    const blanco = assignments.filter(a => a.equipo === 'blanco')
    const oscuro = assignments.filter(a => a.equipo === 'oscuro')
    const blancoName = teamConfig?.nombreEquipoBlanco || 'Equipo Blanco'
    const oscuroName = teamConfig?.nombreEquipoOscuro || 'Equipo Oscuro'

    const roster = (list) => list.length
      ? list.map(a => `- ${playerName(a.jugadorId)}`).join('\n')
      : '_Sin jugadores_'

    return `\n\n⚪ *${blancoName}:*\n${roster(blanco)}\n\n⚫ *${oscuroName}:*\n${roster(oscuro)}` + buildBenchSections()
  }

  // Generate WhatsApp message, tailored to the current step of the match
  const getWhatsAppMessage = () => {
    if (!match) return shareUrl

    let message = buildHeader()
    if (match.pasoActual === 'inscripcion') {
      message += buildInscriptionSection()
    } else if (match.pasoActual === 'armado_equipos') {
      message += buildTeamSection()
    }
    message += `\n\nAnotate acá: ${shareUrl}`

    return message
  }
  
  const copyLink = async () => {
    await copyToClipboard(shareUrl)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setShowMenu(false)
    }, 1500)
  }

  const shareWhatsApp = () => {
    const text = getWhatsAppMessage()
    setShowMenu(false)
    openWhatsApp(text)
  }
  
  return (
    <div className="share-button-container" ref={menuRef}>
      <button 
        className={`share-btn ${showMenu ? 'active' : ''}`}
        onClick={() => setShowMenu(!showMenu)}
      >
        <span className="icon-compartir" aria-hidden="true" />
        <span>Compartir</span>
      </button>
      
      {showMenu && (
        <div className="share-menu">
          <div className="share-menu-options">
            <button className="share-option" onClick={shareWhatsApp}>
              <MessageCircle size={18} />
              <span>Enviar por WhatsApp</span>
            </button>

            <button className="share-option" onClick={copyLink}>
              <Link2 size={18} />
              <span>{copied ? '¡Copiado!' : 'Copiar link'}</span>
              {copied && <Check size={16} className="copied-icon" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShareButton

import { useState, useRef, useEffect } from 'react'
import { Share2, Check, Link2, MessageCircle, X } from 'lucide-react'
import { formatDate } from '../../utils/dateUtils'

function ShareButton({ matchId, match }) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef(null)
  
  // Get match data for the share message (match is now passed as prop)
  const shortCode = match?.codigoCorto || ''
  const shareUrl = shortCode 
    ? `${window.location.origin}${window.location.pathname}#/p/${shortCode}`
    : `${window.location.origin}${window.location.pathname}#/partido/${matchId}`
  
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
  
  // Generate WhatsApp message
  const getWhatsAppMessage = () => {
    if (!match) return shareUrl
    
    const dateInfo = formatDate(match.fecha)
    const playersFormat = `${match.jugadoresPorEquipo} vs ${match.jugadoresPorEquipo}`
    
    return `⚽ *${match.nombre}*

📅 ${dateInfo.dayName} ${dateInfo.day} de ${dateInfo.month} - ${match.horario}hs
📍 ${match.ubicacion}
👥 ${playersFormat}

Anotate acá: ${shareUrl}`
  }
  
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setShowMenu(false)
      }, 1500)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setShowMenu(false)
      }, 1500)
    }
  }
  
  const shareWhatsApp = () => {
    const text = getWhatsAppMessage()
    setShowMenu(false)
    const encoded = encodeURIComponent(text)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    // whatsapp:// preserves the full prefilled text on iOS where wa.me sometimes drops everything but the URL
    const target = isMobile
      ? `whatsapp://send?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`
    window.open(target, '_blank')
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

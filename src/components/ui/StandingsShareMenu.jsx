import { useState, useRef, useEffect } from 'react'
import { Check, Link2, MessageCircle, Image } from 'lucide-react'
import { buildStandingsMessage } from '../../utils/standingsShare'
import { copyStandingsImage } from '../../utils/standingsImage'
import { copyToClipboard, openWhatsApp } from '../../utils/share'

// "Compartir" menu for a standings table: WhatsApp text version, PNG card of
// the table, and (when the group is public) the public page link. Used by the
// signed-in StandingsPage and the public group page.
function StandingsShareMenu({ groupName, tournamentName, partidos, tabla, results, publicUrl }) {
  const [showMenu, setShowMenu] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'link' | 'image' | 'image-error'
  const menuRef = useRef(null)

  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const flash = (value, close = true) => {
    setFeedback(value)
    setTimeout(() => {
      setFeedback(null)
      if (close) setShowMenu(false)
    }, 1800)
  }

  const shareText = () => {
    const message = buildStandingsMessage({
      groupName,
      tournamentName,
      partidos,
      tabla,
      results: results ?? [],
      publicUrl,
    })
    setShowMenu(false)
    openWhatsApp(message)
  }

  const copyImage = async () => {
    try {
      await copyStandingsImage({ groupName, tournamentName, partidos, tabla })
      flash('image')
    } catch {
      flash('image-error', false)
    }
  }

  const copyPublicLink = async () => {
    await copyToClipboard(publicUrl)
    flash('link')
  }

  if (!tabla?.length) return null

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
            <button className="share-option" onClick={shareText}>
              <MessageCircle size={18} />
              <span>Enviar tabla por WhatsApp</span>
            </button>

            <button className="share-option" onClick={copyImage}>
              <Image size={18} />
              <span>
                {feedback === 'image'
                  ? '¡Copiado!'
                  : feedback === 'image-error'
                    ? 'No se pudo generar'
                    : 'Copiar imagen (Tabla)'}
              </span>
              {feedback === 'image' && <Check size={16} className="copied-icon" />}
            </button>

            {publicUrl && (
              <button className="share-option" onClick={copyPublicLink}>
                <Link2 size={18} />
                <span>{feedback === 'link' ? '¡Copiado!' : 'Copiar link público'}</span>
                {feedback === 'link' && <Check size={16} className="copied-icon" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StandingsShareMenu

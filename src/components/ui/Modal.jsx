import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function Modal({ isOpen, onClose, title, children, footer, onSubmit }) {
  const overlayRef = useRef(null)

  // Mobile keyboards shrink the visual viewport but not the layout viewport, so
  // a full-height fixed overlay leaves a blank gap (and the page scrolls under
  // it). Pin the overlay to the visual viewport so it tracks the keyboard.
  useEffect(() => {
    if (!isOpen) return
    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      const el = overlayRef.current
      if (!el) return
      el.style.height = `${vv.height}px`
      // Use top (not transform): a transform on a position:fixed element re-bases
      // it to the document on some engines, which broke modal placement.
      el.style.top = `${vv.offsetTop}px`
    }

    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      const el = overlayRef.current
      if (el) {
        el.style.height = ''
        el.style.top = ''
      }
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
      // Enter to submit (but not when in textarea or when shift is pressed)
      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        const target = e.target
        // Don't submit if user is in a textarea or the friend input field
        if (target.tagName !== 'TEXTAREA' && !target.classList.contains('friend-input')) {
          e.preventDefault()
          onSubmit()
        }
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, onSubmit])
  
  if (!isOpen) return null
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
  
  // Portal to <body> so the overlay lives outside #root. When the CRT effect is on,
  // `#root` has a `filter`, which makes it the containing block for position:fixed
  // descendants — that re-based the overlay to document scroll and dragged it off-screen
  // on long, scrolled lists. Rendering at the body level keeps it viewport-fixed.
  return createPortal(
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <img src="/icons/removeplayer.svg" alt="" width="24" height="24" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default Modal

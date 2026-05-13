import { useEffect } from 'react'
import { X } from 'lucide-react'

function Modal({ isOpen, onClose, title, children, footer, onSubmit }) {
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
  
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
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
    </div>
  )
}

export default Modal

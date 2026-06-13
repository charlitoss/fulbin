import { useState, useRef, useEffect } from 'react'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'

// Sign-in button / signed-in user menu. Renders nothing until WorkOS is
// configured, so the anonymous-only app is unaffected.
function AuthControls({ onNavigate }) {
  const { user, isLoading, signIn, signOut } = useAuthSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  if (!authEnabled || isLoading) return null

  if (!user) {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-sm auth-login-btn"
        onClick={() => signIn()}
      >
        Iniciar sesión
      </button>
    )
  }

  const displayName = user.firstName || user.email || 'Organizador'

  return (
    <div className="auth-menu" ref={menuRef}>
      <button
        type="button"
        className="auth-user-chip"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {user.profilePictureUrl ? (
          <img src={user.profilePictureUrl} alt="" className="auth-avatar" />
        ) : (
          <span className="auth-avatar auth-avatar--initial">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="auth-user-name">{displayName}</span>
        <span className={`auth-chevron${menuOpen ? ' auth-chevron--open' : ''}`} aria-hidden="true">›</span>
      </button>
      {menuOpen && (
        <div className="auth-dropdown" role="menu">
          <div className="auth-dropdown-user">
            <span className="auth-dropdown-name">{displayName}</span>
            {user.email && <span className="auth-dropdown-email">{user.email}</span>}
          </div>
          <button
            type="button"
            className="auth-dropdown-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              signOut()
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default AuthControls

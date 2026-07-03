import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import { Menu, MenuItem, MenuDivider } from './Menu'

// Sign-in button / signed-in user menu. Renders nothing until WorkOS is
// configured, so the anonymous-only app is unaffected.
function AuthControls({ onNavigate }) {
  const { user, isLoading, signIn, signOut } = useAuthSession()
  const isSuperAdmin = useQuery(api.admin.amISuperAdmin, user ? {} : 'skip')
  const groups = useQuery(api.groups.myGroups, user ? {} : 'skip')
  const setActiveGroup = useMutation(api.groups.setActive)
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
        <Menu className="auth-dropdown">
          <MenuItem
            onClick={() => {
              setMenuOpen(false)
              onNavigate('#/mi-perfil')
            }}
          >
            Mi perfil
          </MenuItem>
          {isSuperAdmin && (
            <MenuItem
              onClick={() => {
                setMenuOpen(false)
                onNavigate('#/admin')
              }}
            >
              Administración
            </MenuItem>
          )}
          {groups && groups.length > 0 && (
            <>
              <MenuDivider />
              <li className="menu-li menu-section">
                <span className="menu-section-label">Grupos</span>
                <button
                  type="button"
                  className="menu-section-action"
                  onClick={() => {
                    setMenuOpen(false)
                    onNavigate('#/grupos')
                  }}
                >
                  Ver todos
                </button>
              </li>
              {groups.map((g) => (
                <MenuItem
                  key={g._id}
                  className={g.esActivo ? 'menu-item--selected' : ''}
                  onClick={() => {
                    setMenuOpen(false)
                    if (!g.esActivo) setActiveGroup({ groupId: g._id })
                  }}
                >
                  <span className="menu-item-grow">{g.nombre}</span>
                  {g.esActivo && (
                    <img src="/icons/selected-check.svg" alt="" width="18" height="18" />
                  )}
                </MenuItem>
              ))}
            </>
          )}
          <MenuDivider />
          <MenuItem
            onClick={() => {
              setMenuOpen(false)
              signOut()
            }}
          >
            Cerrar sesión
          </MenuItem>
        </Menu>
      )}
    </div>
  )
}

export default AuthControls

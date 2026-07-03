// Reusable dropdown menu built on a <ul>. Visual style matches the Compartir
// (share) menu — see .menu / .menu-item in global.css.
export function Menu({ children, className = '', ...props }) {
  return (
    <ul className={`menu${className ? ` ${className}` : ''}`} role="menu" {...props}>
      {children}
    </ul>
  )
}

export function MenuItem({ children, onClick, className = '' }) {
  return (
    <li className="menu-li">
      <button
        type="button"
        role="menuitem"
        className={`menu-item${className ? ` ${className}` : ''}`}
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  )
}

// Non-interactive header row (e.g. signed-in user info).
export function MenuHeader({ children }) {
  return <li className="menu-li menu-header">{children}</li>
}

// Thin separator line between menu sections.
export function MenuDivider() {
  return <li className="menu-li menu-divider" role="separator" aria-hidden="true" />
}

export default Menu

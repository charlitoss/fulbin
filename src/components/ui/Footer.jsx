import CrtToggle from './CrtToggle'

function Footer({ crtEnabled, onCrtToggle, onCrtOpenSettings }) {
  return (
    <footer className="app-footer">
      <div className="app-footer__center">
        <a href="https://github.com/charlitoss" target="_blank" rel="noopener noreferrer" className="footer-tag">Github</a>
        <span className="footer-tag">@2026</span>
        <a href="mailto:cprioglio@gmail.com" className="footer-tag">Contacto</a>
      </div>
      <CrtToggle
        enabled={crtEnabled}
        onToggle={onCrtToggle}
        onOpenSettings={onCrtOpenSettings}
      />
    </footer>
  )
}

export default Footer

import { Monitor, MonitorOff, Settings } from 'lucide-react'

function CrtToggle({ enabled, onToggle, onOpenSettings }) {
  return (
    <div className="crt-toggle-group">
      {enabled && (
        <button
          type="button"
          className="crt-toggle crt-toggle--settings"
          onClick={onOpenSettings}
          aria-label="Ajustes CRT"
          title="Ajustes CRT"
        >
          <Settings size={12} />
        </button>
      )}
      <button
        type="button"
        className="crt-toggle"
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={enabled ? 'Apagar efecto CRT' : 'Encender efecto CRT'}
        title={enabled ? 'Apagar efecto CRT' : 'Encender efecto CRT'}
      >
        {enabled ? <Monitor size={12} /> : <MonitorOff size={12} />}
        <span>CRT</span>
      </button>
    </div>
  )
}

export default CrtToggle

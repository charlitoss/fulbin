import { X, RotateCcw } from 'lucide-react'
import { CRT_PARAM_META, CRT_DEFAULTS } from './crtSettings'

function CrtControlPanel({ params, onChange, onReset, onClose }) {
  const groups = {}
  for (const [key, meta] of Object.entries(CRT_PARAM_META)) {
    if (!groups[meta.group]) groups[meta.group] = []
    groups[meta.group].push({ key, ...meta })
  }

  const update = (key, value) => {
    onChange({ ...params, [key]: Number(value) })
  }

  return (
    <div className="crt-panel" role="dialog" aria-label="CRT controls">
      <header className="crt-panel__header">
        <strong>CRT Shader</strong>
        <div className="crt-panel__actions">
          <button
            type="button"
            className="crt-panel__icon-btn"
            onClick={onReset}
            aria-label="Reset to defaults"
            title="Reset to defaults"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className="crt-panel__icon-btn"
            onClick={onClose}
            aria-label="Close panel"
            title="Close panel"
          >
            <X size={14} />
          </button>
        </div>
      </header>
      <div className="crt-panel__body">
        {Object.entries(groups).map(([groupName, items]) => (
          <fieldset key={groupName} className="crt-panel__group">
            <legend>{groupName}</legend>
            {items.map(({ key, label, min, max, step }) => (
              <label key={key} className="crt-panel__row">
                <span className="crt-panel__label">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={params[key]}
                  onChange={e => update(key, e.target.value)}
                />
                <span className="crt-panel__value">
                  {Number(params[key]).toFixed(step < 1 ? 2 : 0)}
                </span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  )
}

export { CRT_DEFAULTS }
export default CrtControlPanel

import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Custom 24h time picker. Replaces <input type="time"> because Firefox
// (1) does not have a popup picker for time inputs at all and
// (2) ignores lang="es-AR" and falls back to OS locale, which is often AM/PM.
// This component gives a consistent 24h dropdown UX in every browser.

const PAD = (n) => String(n).padStart(2, '0')

function buildOptions(stepMin) {
  const out = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      out.push(`${PAD(h)}:${PAD(m)}`)
    }
  }
  return out
}

export default function TimePicker({
  id,
  value,
  onChange,
  step = 30,
  className = '',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const reactId = useId()
  const triggerId = id || `time-picker-${reactId}`
  const options = useMemo(() => buildOptions(step), [step])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Scroll the selected option into view when the panel opens.
  useEffect(() => {
    if (!open || !listRef.current) return
    const sel = listRef.current.querySelector('[data-selected="true"]')
    if (sel) sel.scrollIntoView({ block: 'center' })
  }, [open])

  const handleTriggerKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div
      ref={wrapRef}
      className={`time-picker ${open ? 'is-open' : ''} ${className}`}
    >
      <button
        type="button"
        id={triggerId}
        className="time-picker-trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="time-picker-value">{value || '--:--'}</span>
      </button>
      {open && (
        <ul
          ref={listRef}
          className="time-picker-panel"
          role="listbox"
          aria-label={ariaLabel || 'Horario'}
        >
          {options.map((opt) => {
            const isSel = opt === value
            return (
              <li
                key={opt}
                role="option"
                aria-selected={isSel}
                data-selected={isSel}
                className={`time-picker-option ${isSel ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
              >
                {opt}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

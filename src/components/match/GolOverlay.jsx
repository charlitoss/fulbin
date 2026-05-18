import { useEffect, useState } from 'react'

const PHASES = {
  IN: 'slide-in',
  FLASH: 'flash',
  OUT: 'slide-out',
}

const SLIDE_IN_MS = 400
const FLASH_MS = 900
const SLIDE_OUT_MS = 400

function GolOverlay({ trigger }) {
  const [phase, setPhase] = useState(null)

  useEffect(() => {
    if (!trigger) return

    setPhase(PHASES.IN)
    const t1 = setTimeout(() => setPhase(PHASES.FLASH), SLIDE_IN_MS)
    const t2 = setTimeout(() => setPhase(PHASES.OUT), SLIDE_IN_MS + FLASH_MS)
    const t3 = setTimeout(() => setPhase(null), SLIDE_IN_MS + FLASH_MS + SLIDE_OUT_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [trigger])

  if (!phase) return null

  return (
    <div className="gol-overlay-wrapper" aria-hidden="true">
      <div className={`gol-overlay gol-overlay--${phase}`}>
        <span className="gol-overlay__text">¡Gol!</span>
      </div>
    </div>
  )
}

export default GolOverlay

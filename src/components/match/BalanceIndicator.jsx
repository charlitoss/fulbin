import { useState, useRef, useLayoutEffect } from 'react'

const MAX_LEVEL = 10
const SEGMENT_PITCH = 5 // 2px bar + 3px gap

function BalanceIndicator({ teamStats, teamConfig }) {
  const { blanco, oscuro } = teamStats

  const sideRef = useRef(null)
  const [segmentsPerSide, setSegmentsPerSide] = useState(10)

  useLayoutEffect(() => {
    if (!sideRef.current) return
    const measure = () => {
      const width = sideRef.current?.clientWidth || 0
      // (width + gap) / (bar + gap) gives the count that exactly fills the strip
      const count = Math.max(1, Math.floor((width + 3) / SEGMENT_PITCH))
      setSegmentsPerSide(count)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(sideRef.current)
    return () => ro.disconnect()
  }, [])

  const blancoFilled = Math.round((blanco.avgLevel / MAX_LEVEL) * segmentsPerSide)
  const oscuroFilled = Math.round((oscuro.avgLevel / MAX_LEVEL) * segmentsPerSide)

  return (
    <div className="balance-indicator">
      <div className="balance-header">
        <span className="balance-team-label balance-team-label-left">
          <img src="/icons/teamflag-light.svg" alt="" width="16" height="16" />
          <span className="balance-team-name">{teamConfig.nombreEquipoBlanco}</span>
          <span className="balance-team-value">{blanco.avgLevel.toFixed(1)}</span>
        </span>
        <h4 className="balance-title">
          <span className="balance-title-full">Balance de Equipos</span>
          <span className="balance-title-short">Balance</span>
        </h4>
        <span className="balance-team-label balance-team-label-right">
          <span className="balance-team-value">{oscuro.avgLevel.toFixed(1)}</span>
          <span className="balance-team-name">{teamConfig.nombreEquipoOscuro}</span>
          <img src="/icons/teamflag-dark.svg" alt="" width="16" height="16" />
        </span>
      </div>

      <div className="balance-divergent-bar">
        <div ref={sideRef} className="balance-divergent-side balance-divergent-side-left">
          {Array.from({ length: segmentsPerSide }, (_, i) => (
            <div
              key={i}
              className={`progress-bar-segment ${i >= segmentsPerSide - blancoFilled ? 'filled' : ''}`}
            />
          ))}
        </div>
        <div className="balance-divergent-center" />
        <div className="balance-divergent-side balance-divergent-side-right">
          {Array.from({ length: segmentsPerSide }, (_, i) => (
            <div
              key={i}
              className={`progress-bar-segment ${i < oscuroFilled ? 'filled' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default BalanceIndicator

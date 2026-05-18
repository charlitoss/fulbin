import { useEffect, useState } from 'react'

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function InGameHeader({ match, teamConfig, goalsBlanco, goalsOscuro, onFinish }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const iniciadoEn = match.iniciadoEn ?? now
  const elapsed = formatElapsed(now - iniciadoEn)

  return (
    <div className="in-game-header">
      <div className="in-game-header-top">
        <h1 className="in-game-title">
          <img src="/soccer-ball.png" alt="" className="title-ball" />
          <span className="in-game-title-text">Partido</span>
          <span className="in-game-clock" aria-label="Tiempo de juego">{elapsed}</span>
        </h1>
        <button className="btn-finish" onClick={onFinish}>Finalizar partido</button>
      </div>

      <div className="in-game-scoreboard">
        <div className="in-game-score-team">
          <span className="in-game-score">{goalsBlanco}</span>
          <span className="in-game-score-label">
            <img src="/icons/teamflag-light.svg" alt="" width="16" height="16" />
            {teamConfig?.nombreEquipoBlanco ?? 'Equipo Blanco'}
          </span>
        </div>
        <span className="in-game-score-dash">–</span>
        <div className="in-game-score-team">
          <span className="in-game-score">{goalsOscuro}</span>
          <span className="in-game-score-label">
            <img src="/icons/teamflag-dark.svg" alt="" width="16" height="16" />
            {teamConfig?.nombreEquipoOscuro ?? 'Equipo Oscuro'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default InGameHeader

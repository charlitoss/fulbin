import { useEffect, useState } from 'react'
import { formatDate } from '../../utils/dateUtils'

/**
 * Goal celebration animation timings.
 * Single source of truth — these values are read by both the JS phase
 * machine below and the CSS animations (passed in via CSS custom
 * properties on the scoreboard wrapper). Tweak here and both update.
 */
const TIMINGS = {
  enter: 300,        // score slides out + GOL slides in
  flashCycle: 1000,  // one on/off cycle of GOL!!!
  flashCount: 3,     // how many times GOL!!! blinks
  exit: 300,         // GOL slides out + score slides in
  highlightCycle: 800, // one on/off cycle of the scoring team's number
  highlightCount: 3,   // how many times the number blinks
}

const PHASE_FLASH_MS = TIMINGS.flashCycle * TIMINGS.flashCount
const PHASE_HIGHLIGHT_MS = TIMINGS.highlightCycle * TIMINGS.highlightCount

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function InGameHeader({
  match,
  teamConfig,
  goalsBlanco,
  goalsOscuro,
  onFinish,
  finalized = false,
  golTrigger = null,
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (finalized) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [finalized])

  const iniciadoEn = match.iniciadoEn ?? now
  const elapsed = formatElapsed(now - iniciadoEn)

  const dateInfo = formatDate(match.fecha)
  const monthNum = match.fecha ? Number(match.fecha.split('-')[1]) : ''
  const scheduledLabel = `${dateInfo.dayShort} ${dateInfo.day}/${monthNum} ${match.horario}`

  // Goal animation phases: null → 'enter' → 'flash' → 'exit' → 'highlight' → null
  const [phase, setPhase] = useState(null)
  const [scoringTeam, setScoringTeam] = useState(null)
  useEffect(() => {
    if (!golTrigger) return
    setScoringTeam(golTrigger.team ?? null)
    setPhase('enter')
    const t1 = setTimeout(() => setPhase('flash'), TIMINGS.enter)
    const t2 = setTimeout(() => setPhase('exit'), TIMINGS.enter + PHASE_FLASH_MS)
    const t3 = setTimeout(() => setPhase('highlight'), TIMINGS.enter + PHASE_FLASH_MS + TIMINGS.exit)
    const t4 = setTimeout(() => {
      setPhase(null)
      setScoringTeam(null)
    }, TIMINGS.enter + PHASE_FLASH_MS + TIMINGS.exit + PHASE_HIGHLIGHT_MS)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [golTrigger])

  const golVisible = phase === 'enter' || phase === 'flash' || phase === 'exit'

  const blancoHighlightClass = phase === 'highlight' && scoringTeam === 'blanco' ? ' in-game-score--highlight' : ''
  const oscuroHighlightClass = phase === 'highlight' && scoringTeam === 'oscuro' ? ' in-game-score--highlight' : ''

  // Pass timing values into CSS via custom properties so animation durations
  // stay in sync with the JS phase machine above.
  const scoreboardStyle = {
    '--gol-enter-ms': `${TIMINGS.enter}ms`,
    '--gol-flash-cycle-ms': `${TIMINGS.flashCycle}ms`,
    '--gol-flash-count': TIMINGS.flashCount,
    '--gol-exit-ms': `${TIMINGS.exit}ms`,
    '--gol-highlight-cycle-ms': `${TIMINGS.highlightCycle}ms`,
    '--gol-highlight-count': TIMINGS.highlightCount,
  }

  return (
    <div className="in-game-header">
      <div className="in-game-header-top">
        <h1 className="in-game-title">
          <img src="/soccer-ball.svg" alt="" className="title-ball" />
          <span className="in-game-title-text">
            {finalized ? 'Partido finalizado' : 'Partido'}
          </span>
          <span className="in-game-clock" aria-label={finalized ? 'Fecha del partido' : 'Tiempo de juego'}>
            {finalized ? scheduledLabel : elapsed}
          </span>
        </h1>
        {!finalized && onFinish && (
          <button className="btn-finish" onClick={onFinish}>Finalizar partido</button>
        )}
      </div>

      <div className="in-game-scoreboard" style={scoreboardStyle}>
        <div className={`in-game-scoreboard__score${phase ? ` phase-${phase}` : ''}`}>
          <div className="in-game-score-team">
            <span className={`in-game-score${blancoHighlightClass}`}>{goalsBlanco}</span>
            <span className="in-game-score-label">
              <img src="/icons/teamflag-light.svg" alt="" width="16" height="16" />
              {teamConfig?.nombreEquipoBlanco ?? 'Equipo Blanco'}
            </span>
          </div>
          <span className="in-game-score-dash">–</span>
          <div className="in-game-score-team">
            <span className={`in-game-score${oscuroHighlightClass}`}>{goalsOscuro}</span>
            <span className="in-game-score-label">
              <img src="/icons/teamflag-dark.svg" alt="" width="16" height="16" />
              {teamConfig?.nombreEquipoOscuro ?? 'Equipo Oscuro'}
            </span>
          </div>
        </div>

        {golVisible && (
          <div className={`in-game-scoreboard__gol phase-${phase}`} aria-hidden="true">
            <img src="/soccer-ball.svg" alt="" className="in-game-scoreboard__gol-ball" />
            <span className="in-game-scoreboard__gol-text">GOL!!!</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default InGameHeader

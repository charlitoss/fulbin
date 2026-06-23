import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import { formatDate, timeUntilLabel } from '../../utils/dateUtils'
import Tag from '../ui/Tag'

// Status tag per match step (Figma: Match card states).
const TAG_BY_ESTADO = {
  inscripcion: { color: 'green', label: 'Inscripción' },
  armado_equipos: { color: 'green', label: 'Armando' },
  jugando: { color: 'orange', label: 'Jugando' },
  finalizado: { color: 'grey', label: 'Finalizado' },
}

// Big right-hand figure: live/final score when there is one, else the size.
const scoreText = (match) =>
  match.marcador
    ? `${match.marcador.golesBlanco} — ${match.marcador.golesOscuro}`
    : `${match.jugadoresPorEquipo} vs ${match.jugadoresPorEquipo}`

function MyMatchesPage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const matches = useQuery(api.matches.myMatches, user ? {} : 'skip')

  if (!authEnabled || (!isLoading && !user)) {
    return (
      <div className="my-matches-page">
        <div className="my-matches-empty">
          <h2>Mis partidos</h2>
          <p>Iniciá sesión para ver el historial de partidos que organizaste.</p>
          {authEnabled && (
            <button type="button" className="btn btn-primary" onClick={() => signIn()}>
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading || matches === undefined) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <h2>Mis partidos</h2>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onNavigate('#/nuevo')}
        >
          Nuevo partido
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="my-matches-empty">
          <p>Todavía no tenés partidos vinculados a tu cuenta.</p>
          <p className="my-matches-hint">
            Los partidos que crees estando logueado aparecen acá. También podés
            abrir un partido existente y reclamarlo.
          </p>
        </div>
      ) : (
        <ul className="match-card-list">
          {matches.map((match) => {
            const tag = TAG_BY_ESTADO[match.pasoActual] ?? { color: 'grey', label: match.pasoActual }
            const upcoming = match.pasoActual === 'inscripcion' || match.pasoActual === 'armado_equipos'
            const countdown = upcoming ? timeUntilLabel(match.fecha, match.horario) : null
            return (
              <li key={match._id}>
                <button
                  type="button"
                  className={`match-card match-card--${match.pasoActual}`}
                  onClick={() => onNavigate(`#/partido/${match._id}`)}
                >
                  <div className="match-card-main">
                    <div className="match-card-title">
                      <img src="/soccer-ball.svg" alt="" className="match-card-ball" width="20" height="20" />
                      <span className="match-card-name">{match.nombre}</span>
                    </div>
                    <div className="match-card-meta">
                      <span>{formatDate(match.fecha).short}</span>
                      <span className="match-card-sep">—</span>
                      <span>{match.horario} hs</span>
                      <span className="match-card-sep">—</span>
                      <span>{match.ubicacion}</span>
                      {countdown && (
                        <>
                          <span className="match-card-sep">—</span>
                          <span className="match-card-countdown">{countdown}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="match-card-right">
                    <span className="match-card-score">{scoreText(match)}</span>
                    <Tag color={tag.color} size="md">{tag.label}</Tag>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MyMatchesPage

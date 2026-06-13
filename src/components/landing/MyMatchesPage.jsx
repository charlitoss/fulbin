import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import { formatDate } from '../../utils/dateUtils'

const ESTADO_LABELS = {
  inscripcion: 'Inscripción',
  armado_equipos: 'Armando equipos',
  jugando: 'Jugando',
  finalizado: 'Finalizado',
}

const winnerText = (r) => {
  if (!r) return null
  const blanco = r.nombreBlanco || 'Blanco'
  const oscuro = r.nombreOscuro || 'Oscuro'
  if (r.golesBlanco > r.golesOscuro) return `Ganó ${blanco}`
  if (r.golesOscuro > r.golesBlanco) return `Ganó ${oscuro}`
  return 'Empate'
}

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
        <ul className="my-matches-list">
          {matches.map((match) => (
            <li key={match._id}>
              <button
                type="button"
                className="my-match-card"
                onClick={() => onNavigate(`#/partido/${match._id}`)}
              >
                <div className="my-match-main">
                  <span className="my-match-name">{match.nombre}</span>
                  <span className="my-match-meta">
                    {formatDate(match.fecha).short} · {match.horario} hs ·{' '}
                    {match.ubicacion}
                  </span>
                </div>
                <div className="my-match-side">
                  <span className={`my-match-estado my-match-estado--${match.pasoActual}`}>
                    {ESTADO_LABELS[match.pasoActual] ?? match.pasoActual}
                  </span>
                  {match.resultado ? (
                    <>
                      <span className="my-match-resultado">
                        {match.resultado.golesBlanco} — {match.resultado.golesOscuro}
                      </span>
                      <span className="my-match-winner">{winnerText(match.resultado)}</span>
                    </>
                  ) : (
                    <span className="my-match-codigo">{match.codigoCorto}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MyMatchesPage

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'

// Individual standings across the admin's finished matches: teams change
// every match, so points follow players (win 3, draw 1, loss 0).
function StandingsPage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const stats = useQuery(api.stats.myStats, user ? {} : 'skip')

  if (!authEnabled || (!isLoading && !user)) {
    return (
      <div className="my-matches-page">
        <div className="my-matches-empty">
          <h2>Tabla de posiciones</h2>
          <p>Iniciá sesión para ver la tabla de tu grupo.</p>
          {authEnabled && (
            <button type="button" className="btn btn-primary" onClick={() => signIn()}>
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading || stats === undefined || stats === null) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <h2>Tabla de posiciones</h2>
        <span className="standings-matches-count">
          {stats.partidos} partido{stats.partidos === 1 ? '' : 's'}
        </span>
      </div>

      {stats.tabla.length === 0 ? (
        <div className="my-matches-empty">
          <p>Todavía no hay partidos finalizados.</p>
          <p className="my-matches-hint">
            Cuando termines un partido, los jugadores del equipo ganador suman
            3 puntos y los de un empate suman 1.
          </p>
        </div>
      ) : (
        <div className="standings-table-wrap">
          <table className="standings-table">
            <thead>
              <tr>
                <th className="standings-pos">#</th>
                <th className="standings-name">Jugador</th>
                <th title="Partidos jugados">PJ</th>
                <th title="Ganados">G</th>
                <th title="Empatados">E</th>
                <th title="Perdidos">P</th>
                <th title="Goles">⚽</th>
                <th title="Puntos">Pts</th>
              </tr>
            </thead>
            <tbody>
              {stats.tabla.map((row, index) => (
                <tr key={row.playerId} className={index < 3 ? 'standings-top' : ''}>
                  <td className="standings-pos">{index + 1}</td>
                  <td className="standings-name">{row.nombre}</td>
                  <td>{row.pj}</td>
                  <td>{row.pg}</td>
                  <td>{row.pe}</td>
                  <td>{row.pp}</td>
                  <td>{row.goles}</td>
                  <td className="standings-puntos">{row.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default StandingsPage

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'

// Individual standings across the admin's finished matches: teams change
// every match, so points follow players (win 3, draw 1, loss 0). Results can
// be scoped to a tournament (e.g. Apertura / Clausura) or viewed across all.
function StandingsPage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const tournaments = useQuery(api.tournaments.mine, user ? {} : 'skip')
  const createTournament = useMutation(api.tournaments.create)

  // null = "Todos"; a string = a tournament id; undefined = not yet defaulted.
  const [selected, setSelected] = useState(undefined)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  // Default the view to the active tournament once tournaments load.
  useEffect(() => {
    if (selected === undefined && tournaments) {
      const active = tournaments.find((t) => t.activo)
      setSelected(active ? active._id : null)
    }
  }, [tournaments, selected])

  const selectedId = selected === undefined || selected === null ? undefined : selected
  const stats = useQuery(
    api.stats.myStats,
    user ? { tournamentId: selectedId } : 'skip'
  )

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

  const handleCreate = async () => {
    const nombre = newName.trim()
    if (nombre.length < 2) return
    const id = await createTournament({ nombre })
    setSelected(id)
    setNewName('')
    setCreating(false)
  }

  const loading = isLoading || stats === undefined || stats === null || tournaments === undefined

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <h2>Tabla de posiciones</h2>
        {stats && (
          <span className="standings-matches-count">
            {stats.partidos} partido{stats.partidos === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Tournament switcher */}
      <div className="tournament-switcher">
        <button
          type="button"
          className={`tournament-chip${selected === null ? ' selected' : ''}`}
          onClick={() => setSelected(null)}
        >
          Todos
        </button>
        {(tournaments ?? []).map((t) => (
          <button
            key={t._id}
            type="button"
            className={`tournament-chip${selected === t._id ? ' selected' : ''} ${
              t.activo ? 'is-active' : 'is-past'
            }`}
            onClick={() => setSelected(t._id)}
          >
            <span>{t.nombre}</span>
            {t.activo && <span className="tournament-tag">Activo</span>}
          </button>
        ))}
        {creating ? (
          <span className="tournament-create">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ej: Apertura 2026"
              maxLength={40}
              autoFocus
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate}>
              Crear
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setCreating(false); setNewName('') }}
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="tournament-chip tournament-chip--add"
            onClick={() => setCreating(true)}
          >
            + Nuevo torneo
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : stats.tabla.length === 0 ? (
        <div className="my-matches-empty">
          <p>Todavía no hay partidos finalizados en esta tabla.</p>
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
                <th className="standings-th-pts" title="Puntos">Pts</th>
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

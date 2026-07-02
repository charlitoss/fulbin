import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { Trophy } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import StandingsTable from '../ui/StandingsTable'
import StandingsShareMenu from '../ui/StandingsShareMenu'
import { appBaseUrl } from '../../utils/share'

// Read-only public view of a group (#/g/:publicToken): standings, results
// and per-player stats. No account needed — the unguessable token is the
// credential, and the group must have its public page enabled.
// All names come from the DB (user-typed): rendered via JSX only.

function NotFound({ onNavigate }) {
  return (
    <div className="my-matches-page">
      <div className="my-matches-empty">
        <h2>Página no disponible</h2>
        <p>
          Este link no existe o el grupo desactivó su página pública. Pedile un
          link nuevo a quien organiza.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate('#/')}>
          Volver al inicio
        </button>
      </div>
    </div>
  )
}

// Public per-player stats (#/g/:token/jugador/:playerId).
function PublicPlayerView({ publicToken, playerId, onNavigate }) {
  const stats = useQuery(api.public.playerStats, { publicToken, playerId })

  if (stats === undefined) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }
  if (stats === null) return <NotFound onNavigate={onNavigate} />

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate(`#/g/${publicToken}`)}
        >
          ← {stats.grupo}
        </button>
      </div>

      <div className="public-player-header">
        <h2>{stats.nombre}</h2>
        {stats.posicion && <span className="roster-card-meta">{stats.posicion}</span>}
      </div>

      <div className="public-player-stats">
        <div className="public-stat">
          <span className="public-stat-value">{stats.puntos}</span>
          <span className="public-stat-label">Puntos</span>
        </div>
        <div className="public-stat">
          <span className="public-stat-value">{stats.pj}</span>
          <span className="public-stat-label">Jugados</span>
        </div>
        <div className="public-stat">
          <span className="public-stat-value">{stats.pg}-{stats.pe}-{stats.pp}</span>
          <span className="public-stat-label">G-E-P</span>
        </div>
        <div className="public-stat">
          <span className="public-stat-value">{stats.goles}</span>
          <span className="public-stat-label">Goles</span>
        </div>
      </div>

      {stats.historial.length > 0 && (
        <>
          <div className="standings-subtitle-row">
            <span className="standings-subtitle">Historial</span>
          </div>
          <ul className="my-matches-list">
            {stats.historial.map((h) => (
              <li key={h.matchId}>
                <button
                  type="button"
                  className="roster-card"
                  onClick={() => onNavigate(`#/p/${h.codigoCorto}`)}
                >
                  <div className="roster-card-main">
                    <span className="roster-card-name">{h.nombre}</span>
                    <span className="roster-card-meta">
                      {h.fecha} · {h.marcador}
                      {h.goles > 0 && <> · ⚽ {h.goles}</>}
                    </span>
                  </div>
                  <span
                    className={`public-result-tag public-result-tag--${h.resultado.toLowerCase()}`}
                  >
                    {h.resultado}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function PublicGroupPage({ publicToken, playerId, onNavigate }) {
  const overview = useQuery(api.public.groupOverview, { publicToken })

  // null = "Todos"; a string = a tournament id; undefined = not yet defaulted.
  const [selected, setSelected] = useState(undefined)

  useEffect(() => {
    if (selected === undefined && overview?.torneos) {
      const active = overview.torneos.find((t) => t.activo)
      setSelected(active ? active._id : null)
    }
  }, [overview, selected])

  const selectedId = selected === undefined || selected === null ? undefined : selected
  const stats = useQuery(
    api.public.standings,
    overview ? { publicToken, tournamentId: selectedId } : 'skip'
  )
  const results = useQuery(
    api.public.results,
    overview ? { publicToken, tournamentId: selectedId } : 'skip'
  )

  if (playerId) {
    return (
      <PublicPlayerView
        publicToken={publicToken}
        playerId={playerId}
        onNavigate={onNavigate}
      />
    )
  }

  if (overview === undefined) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }
  if (overview === null) return <NotFound onNavigate={onNavigate} />

  const current = selected
    ? overview.torneos.find((t) => t._id === selected)
    : null
  const currentName = selected == null ? 'Tabla histórica' : current?.nombre ?? '…'

  return (
    <div className="my-matches-page">
      <div className="my-matches-header public-group-header">
        <div>
          <h2>{overview.nombre}</h2>
          <span className="public-group-badge">Página pública · solo lectura</span>
        </div>
        <StandingsShareMenu
          groupName={overview.nombre}
          tournamentName={selected == null ? null : currentName}
          partidos={stats?.partidos ?? 0}
          tabla={stats?.tabla ?? []}
          results={results ?? []}
          publicUrl={`${appBaseUrl()}#/g/${publicToken}`}
        />
      </div>

      {overview.torneos.length > 0 && (
        <div className="public-season-picker">
          <button
            type="button"
            className={`players-toggle-btn${selected === null ? ' active' : ''}`}
            onClick={() => setSelected(null)}
          >
            Todos
          </button>
          {overview.torneos.map((t) => (
            <button
              key={t._id}
              type="button"
              className={`players-toggle-btn${selected === t._id ? ' active' : ''}`}
              onClick={() => setSelected(t._id)}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      )}

      {current?.finalizado && current?.campeon && (
        <div className="standings-champion">
          <Trophy size={18} className="standings-champion-icon" />
          <span className="standings-champion-label">Campeón</span>
          <span className="standings-champion-name">{current.campeon.nombre}</span>
          <span className="standings-champion-pts">{current.campeon.puntos} pts</span>
        </div>
      )}

      <div className="standings-subtitle-row">
        <span className="standings-subtitle">Tabla de posiciones</span>
      </div>

      {stats === undefined ? (
        <div className="loading">Cargando...</div>
      ) : !stats || stats.tabla.length === 0 ? (
        <div className="my-matches-empty">
          <h2>Todavía no hay partidos finalizados.</h2>
        </div>
      ) : (
        <StandingsTable
          tabla={stats.tabla}
          onPlayerClick={(id) => onNavigate(`#/g/${publicToken}/jugador/${id}`)}
        />
      )}

      {(results?.length ?? 0) > 0 && (
        <>
          <div className="standings-subtitle-row">
            <span className="standings-subtitle">Últimos resultados</span>
          </div>
          <ul className="my-matches-list">
            {results.map((m) => (
              <li key={m._id}>
                <button
                  type="button"
                  className="roster-card"
                  onClick={() => onNavigate(`#/p/${m.codigoCorto}`)}
                >
                  <div className="roster-card-main">
                    <span className="roster-card-name">{m.nombre}</span>
                    <span className="roster-card-meta">{m.fecha}</span>
                  </div>
                  {m.resultado && (
                    <span className="match-card-score">
                      {m.resultado.golesBlanco} - {m.resultado.golesOscuro}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default PublicGroupPage

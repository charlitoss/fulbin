import { useState, useEffect } from 'react'
import { Pencil, Trophy } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import TournamentsModal from './TournamentsModal'
import Modal from '../ui/Modal'

// Individual standings across the admin's finished matches: teams change
// every match, so points follow players (win 3, draw 1, loss 0). Results are
// scoped to the active tournament; manage seasons via the Torneos modal.
function StandingsPage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const tournaments = useQuery(api.tournaments.mine, user ? {} : 'skip')
  const finalize = useMutation(api.tournaments.finalize)

  // null = "Todos"; a string = a tournament id; undefined = not yet defaulted.
  const [selected, setSelected] = useState(undefined)
  const [showManage, setShowManage] = useState(false)
  const [showFinalize, setShowFinalize] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

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

  const current = selected ? (tournaments ?? []).find((t) => t._id === selected) : null
  const currentName = selected == null ? 'Todos los partidos' : current?.nombre ?? '…'
  const leader = stats?.tabla?.[0]

  const handleFinalize = async () => {
    if (!current?._id || finalizing) return
    setFinalizing(true)
    try {
      await finalize({ tournamentId: current._id })
      setShowFinalize(false)
    } finally {
      setFinalizing(false)
    }
  }

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

  const loading = isLoading || stats === undefined || stats === null || tournaments === undefined

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <h2>Tabla de posiciones</h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowManage(true)}
        >
          Torneos
        </button>
      </div>

      {/* Active / selected tournament — click to manage seasons */}
      <div className="standings-current">
        <button
          type="button"
          className="standings-current-name"
          onClick={() => setShowManage(true)}
        >
          <span>{currentName}</span>
          {current?.activo && <span className="tournament-tag">Activo</span>}
          {current?.finalizadoEn && (
            <span className="tournament-tag tournament-tag--past">Finalizado</span>
          )}
          <Pencil size={13} className="standings-current-edit" />
        </button>
        <div className="standings-current-right">
          {current?.activo && (
            <button
              type="button"
              className="btn btn-secondary btn-sm standings-finalize-btn"
              onClick={() => setShowFinalize(true)}
            >
              Finalizar torneo
            </button>
          )}
          {stats && (
            <span className="standings-matches-count">
              {stats.partidos} partido{stats.partidos === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {/* Champion banner for a finalized season */}
      {current?.finalizadoEn && current?.campeon && (
        <div className="standings-champion">
          <Trophy size={18} className="standings-champion-icon" />
          <span className="standings-champion-label">Campeón</span>
          <span className="standings-champion-name">{current.campeon.nombre}</span>
          <span className="standings-champion-pts">{current.campeon.puntos} pts</span>
        </div>
      )}

      <Modal
        isOpen={showFinalize}
        onClose={() => setShowFinalize(false)}
        title="Finalizar torneo"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFinalize(false)}
              disabled={finalizing}
            >
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? 'Finalizando...' : 'Finalizar'}
            </button>
          </>
        }
      >
        {leader ? (
          <p>
            Se coronará campeón a <strong>{leader.nombre}</strong> con {leader.puntos} pts.
            El torneo quedará cerrado y la tabla congelada.
          </p>
        ) : (
          <p>
            Todavía no hay partidos finalizados, así que no se coronará campeón. Podés
            finalizarlo igual y la tabla quedará congelada.
          </p>
        )}
      </Modal>

      <TournamentsModal
        isOpen={showManage}
        onClose={() => setShowManage(false)}
        tournaments={tournaments ?? []}
        selectedId={selected ?? null}
        onSelect={setSelected}
      />

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

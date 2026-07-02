import { useState, useEffect } from 'react'
import { Pencil, Trophy } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import TournamentsModal from './TournamentsModal'
import TournamentSettingsModal from './TournamentSettingsModal'
import StandingsTable from '../ui/StandingsTable'
import StandingsShareMenu from '../ui/StandingsShareMenu'
import { appBaseUrl } from '../../utils/share'

// Individual standings across the admin's finished matches: teams change
// every match, so points follow players (win 3, draw 1, loss 0). Results are
// scoped to the active tournament; manage seasons via the Torneos modal.
function StandingsPage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const tournaments = useQuery(api.tournaments.mine, user ? {} : 'skip')
  const groups = useQuery(api.groups.myGroups, user ? {} : 'skip')
  const myMatches = useQuery(api.matches.myMatches, user ? {} : 'skip')

  // null = "Todos"; a string = a tournament id; undefined = not yet defaulted.
  const [selected, setSelected] = useState(undefined)
  const [showManage, setShowManage] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

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
  const currentName = selected == null ? 'Tabla histórica' : current?.nombre ?? '…'
  const leader = stats?.tabla?.[0]

  // Share context: the active group's name/public link + this view's results.
  const activeGroup = (groups ?? []).find((g) => g.esActivo)
  const shareResults = (myMatches ?? [])
    .filter(
      (m) =>
        m.pasoActual === 'finalizado' &&
        (selectedId === undefined || m.tournamentId === selectedId)
    )
    .sort((a, b) => (b.finalizadoEn ?? 0) - (a.finalizadoEn ?? 0))

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
      {/* Torneo name is the prominent title; click it to switch/configure */}
      <div className="my-matches-header">
        <button
          type="button"
          className="standings-torneo-title"
          onClick={() => (current ? setShowSettings(true) : setShowManage(true))}
        >
          <span>{currentName}</span>
          {current?.activo && <span className="tournament-tag">Activo</span>}
          {current?.finalizadoEn && (
            <span className="tournament-tag tournament-tag--past">Finalizado</span>
          )}
          {current && <Pencil size={15} className="standings-current-edit" />}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowManage(true)}
        >
          Todos los torneos
        </button>
      </div>

      <div className="standings-subtitle-row">
        <span className="standings-subtitle">Tabla de posiciones</span>
        {!loading && stats.tabla.length > 0 && (
          <StandingsShareMenu
            groupName={activeGroup?.nombre ?? 'Fulbin'}
            tournamentName={selected == null ? null : currentName}
            partidos={stats.partidos}
            tabla={stats.tabla}
            results={shareResults}
            publicUrl={
              activeGroup?.publico && activeGroup?.publicToken
                ? `${appBaseUrl()}#/g/${activeGroup.publicToken}`
                : null
            }
          />
        )}
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

      <TournamentsModal
        isOpen={showManage}
        onClose={() => setShowManage(false)}
        tournaments={tournaments ?? []}
        selectedId={selected ?? null}
        onSelect={setSelected}
      />

      <TournamentSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        tournament={current}
        leader={leader}
        onSelect={setSelected}
      />

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : stats.tabla.length === 0 ? (
        <div className="my-matches-empty">
          <h2>Todavía no tenés partidos finalizados.</h2>
          <p>Cuando termine un partido, los jugadores ganadores sumarán 3 puntos.</p>
        </div>
      ) : (
        <StandingsTable tabla={stats.tabla} />
      )}
    </div>
  )
}

export default StandingsPage

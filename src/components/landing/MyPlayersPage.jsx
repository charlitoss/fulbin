import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import PlayerProfileModal from '../player/PlayerProfileModal'

function initials(name) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function MyPlayersPage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const roster = useQuery(api.players.myRoster, user ? {} : 'skip')
  const myProfileId = useQuery(api.players.myProfileId, user ? {} : 'skip')
  const [modal, setModal] = useState({ open: false, player: null })
  const [view, setView] = useState('activos') // 'activos' | 'inactivos'

  if (!authEnabled || (!isLoading && !user)) {
    return (
      <div className="my-matches-page">
        <div className="my-matches-empty">
          <h2>Mis jugadores</h2>
          <p>Iniciá sesión para armar el plantel de tu grupo.</p>
          {authEnabled && (
            <button type="button" className="btn btn-primary" onClick={() => signIn()}>
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading || roster === undefined) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }

  const activos = roster.filter((p) => p.activo !== false)
  const inactivos = roster.filter((p) => p.activo === false)
  const shown = view === 'inactivos' ? inactivos : activos

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <h2>Mis jugadores</h2>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setModal({ open: true, player: null })}
        >
          Agregar jugador
        </button>
      </div>

      {roster.length === 0 ? (
        <div className="my-matches-empty">
          <h2>Aún no tenés jugadores.</h2>
          <p>
            Agregá jugadores acá, o se agregarán automáticamente cuando se
            anotan a un partido.
          </p>
        </div>
      ) : (
        <>
          <div className="players-toggle">
            <button
              type="button"
              className={`players-toggle-btn${view === 'activos' ? ' active' : ''}`}
              onClick={() => setView('activos')}
            >
              Activos ({activos.length})
            </button>
            <button
              type="button"
              className={`players-toggle-btn${view === 'inactivos' ? ' active' : ''}`}
              onClick={() => setView('inactivos')}
            >
              Inactivos ({inactivos.length})
            </button>
          </div>

          {shown.length === 0 ? (
            <div className="my-matches-empty">
              {view === 'inactivos' ? (
                <>
                  <h2>No hay jugadores inactivos.</h2>
                  <p>
                    Cuando un jugador deja de venir, archivalo desde su ficha.
                    Su historial y sus puntos se conservan.
                  </p>
                </>
              ) : (
                <>
                  <h2>No hay jugadores activos.</h2>
                  <p>Agregá un jugador nuevo o reactivá los que estén archivados.</p>
                </>
              )}
            </div>
          ) : (
            <ul className="my-matches-list my-players-list">
              {shown.map((player) => {
                const perfil = player.perfilPermanente
                const inactive = player.activo === false
                const isSelf = player._id === myProfileId
                return (
                  <li key={player._id}>
                    <button
                      type="button"
                      className={`roster-card${inactive ? ' roster-card--inactive' : ''}`}
                      onClick={() => setModal({ open: true, player })}
                    >
                      <div className="my-player-main">
                        <span className="auth-avatar auth-avatar--initial roster-avatar">
                          {initials(player.nombre)}
                        </span>
                        <div className="roster-card-main">
                          <span className="roster-card-name">
                            {player.nombre}
                            {isSelf && <span className="roster-card-you"> (Vos)</span>}
                          </span>
                          <span className="roster-card-meta">
                            {perfil?.posicionPreferida ?? 'Sin posición'}
                            {inactive && <span className="player-inactive-tag">Inactivo</span>}
                          </span>
                        </div>
                      </div>
                      <span className="roster-nivel">
                        {(perfil?.nivelGeneral ?? 5).toFixed(1)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <PlayerProfileModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, player: null })}
        player={modal.player}
        hideDelete={!!modal.player && modal.player._id === myProfileId}
      />
    </div>
  )
}

export default MyPlayersPage

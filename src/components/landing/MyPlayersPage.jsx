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
  const [modal, setModal] = useState({ open: false, player: null })

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
          <p>Tu plantel está vacío.</p>
          <p className="my-matches-hint">
            Agregá jugadores acá, o se suman solos cuando se anotan a un
            partido tuyo. Al reclamar un partido viejo, sus jugadores también
            pasan a tu plantel.
          </p>
        </div>
      ) : (
        <ul className="my-matches-list">
          {roster.map((player) => {
            const perfil = player.perfilPermanente
            return (
              <li key={player._id}>
                <button
                  type="button"
                  className="my-match-card"
                  onClick={() => setModal({ open: true, player })}
                >
                  <div className="my-player-main">
                    <span className="auth-avatar auth-avatar--initial roster-avatar">
                      {initials(player.nombre)}
                    </span>
                    <div className="my-match-main">
                      <span className="my-match-name">{player.nombre}</span>
                      <span className="my-match-meta">
                        {perfil?.posicionPreferida ?? 'Sin posición'}
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

      <PlayerProfileModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, player: null })}
        player={modal.player}
      />
    </div>
  )
}

export default MyPlayersPage

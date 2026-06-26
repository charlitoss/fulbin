import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import PlayerProfileModal from '../player/PlayerProfileModal'

// The admin's own editable player profile (so the balancer can include them).
// Reuses the roster profile editor against a self player linked to the account.
function MyProfilePage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const myProfileId = useQuery(api.players.myProfileId, user ? {} : 'skip')
  const ensureMyProfile = useMutation(api.players.ensureMyProfile)
  const [playerId, setPlayerId] = useState(null)

  useEffect(() => {
    if (!user) return
    if (myProfileId === null) {
      ensureMyProfile({}).then(setPlayerId)
    } else if (myProfileId) {
      setPlayerId(myProfileId)
    }
  }, [user, myProfileId, ensureMyProfile])

  const player = useQuery(api.players.getById, playerId ? { playerId } : 'skip')

  // Self-heal: if the linked profile was deleted in a previous session (an old
  // bug let it be removed), getById returns null — recreate it so the page
  // always loads instead of hanging on "Cargando...".
  useEffect(() => {
    if (playerId && player === null) {
      ensureMyProfile({}).then(setPlayerId)
    }
  }, [playerId, player, ensureMyProfile])

  if (!authEnabled || (!isLoading && !user)) {
    return (
      <div className="my-matches-page">
        <div className="my-matches-empty">
          <h2>Mi perfil</h2>
          <p>Iniciá sesión para editar tu perfil de jugador.</p>
          {authEnabled && (
            <button type="button" className="btn btn-primary" onClick={() => signIn()}>
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <h2>Mi perfil de jugador</h2>
      </div>
      <PlayerProfileModal
        isOpen
        onClose={() => onNavigate('#/mis-partidos')}
        player={player}
        hideDelete
      />
    </div>
  )
}

export default MyProfilePage

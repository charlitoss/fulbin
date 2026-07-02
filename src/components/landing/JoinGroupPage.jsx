import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { Users } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import { PENDING_INVITE_KEY } from '../../utils/constants'

// Accept-an-invite screen (#/unirse/:code). Shows a safe preview of the
// group; joining requires an account, so anonymous visitors go through
// sign-in first and come back here.
function JoinGroupPage({ code, onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const preview = useQuery(api.groups.byInviteCode, { code })
  const joinByInvite = useMutation(api.groups.joinByInvite)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  if (preview === undefined || isLoading) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }

  if (preview === null) {
    return (
      <div className="my-matches-page">
        <div className="my-matches-empty">
          <h2>Invitación no válida</h2>
          <p>
            El link de invitación no existe o fue desactivado. Pedile al
            organizador que te comparta uno nuevo.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('#/')}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  const handleJoin = async () => {
    setJoining(true)
    setError(null)
    try {
      await joinByInvite({ code })
      onNavigate('#/mis-partidos')
    } catch (err) {
      setError(
        String(err?.message ?? '').includes('INVITACION_INVALIDA')
          ? 'La invitación ya no es válida.'
          : 'No se pudo completar la unión al grupo. Probá de nuevo.'
      )
      setJoining(false)
    }
  }

  const handleSignInFirst = () => {
    try {
      sessionStorage.setItem(PENDING_INVITE_KEY, code)
    } catch {}
    signIn()
  }

  return (
    <div className="my-matches-page">
      <div className="my-matches-empty join-group-card">
        <h2>Te invitaron a co-organizar</h2>
        <p className="join-group-name">{preview.nombre}</p>
        <p className="join-group-meta">
          <Users size={16} /> {preview.miembros}{' '}
          {preview.miembros === 1 ? 'miembro' : 'miembros'}
          {preview.organizador && <> · organiza {preview.organizador}</>}
        </p>
        <p>
          Como co-organizador vas a poder crear partidos, editar el plantel y
          manejar los torneos del grupo.
        </p>

        {error && <p className="join-group-error">{error}</p>}

        {user ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? 'Uniéndote…' : 'Unirme al grupo'}
          </button>
        ) : authEnabled ? (
          <>
            <p className="group-hint">Necesitás una cuenta para unirte.</p>
            <button type="button" className="btn btn-primary" onClick={handleSignInFirst}>
              Iniciar sesión y unirme
            </button>
          </>
        ) : (
          <p className="group-hint">
            El inicio de sesión no está disponible en esta instalación.
          </p>
        )}
      </div>
    </div>
  )
}

export default JoinGroupPage

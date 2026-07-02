import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { Users } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import { PENDING_INVITE_KEY } from '../../utils/constants'

// Accept-an-invite screen (#/unirse/:code). Shows a safe preview of the
// group; joining requires an account, so anonymous visitors go through
// sign-in first and come back here (the code survives the redirect via
// sessionStorage — the WorkOS callback drops the URL hash).
function JoinGroupPage({ code, onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  // The WorkOS user appears before the Convex token exchange finishes; a
  // mutation sent in that window arrives unauthenticated. Gate on this.
  const { isAuthenticated } = useConvexAuth()
  const preview = useQuery(api.groups.byInviteCode, { code })
  const joinByInvite = useMutation(api.groups.joinByInvite)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)
  const attemptedAutoJoin = useRef(false)

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

  // Sign-in started from this invite ("Iniciar sesión y unirme"): the intent
  // is explicit, so finish the join automatically once Convex auth is ready.
  // joinByInvite is idempotent, so a StrictMode double-fire is harmless.
  useEffect(() => {
    if (!isAuthenticated || !preview || attemptedAutoJoin.current) return
    let pending = null
    try {
      pending = sessionStorage.getItem(PENDING_INVITE_KEY)
    } catch {}
    if (pending === code) {
      try {
        sessionStorage.removeItem(PENDING_INVITE_KEY)
      } catch {}
      attemptedAutoJoin.current = true
      handleJoin()
    }
  }, [isAuthenticated, preview, code])

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

  const handleSignInFirst = () => {
    try {
      sessionStorage.setItem(PENDING_INVITE_KEY, code)
    } catch {}
    signIn()
  }

  // Signed in with WorkOS but the Convex session is still connecting.
  const connecting = !!user && !isAuthenticated

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
            disabled={joining || connecting}
          >
            {joining ? 'Uniéndote…' : connecting ? 'Conectando…' : 'Unirme al grupo'}
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

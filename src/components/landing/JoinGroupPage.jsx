import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { Plus } from 'lucide-react'
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

  const ctaLabel = joining ? 'Uniéndote…' : connecting ? 'Conectando…' : 'Unirme al fulbin'

  return (
    <div className="my-matches-page">
      <div className="my-matches-empty join-card">
        <p className="join-card-header">
          {preview.organizador || 'Alguien'} te invitó a organizar un fulbin
        </p>
        <div className="join-card-divider" />

        <img src="/soccer-ball.svg" alt="" className="join-card-ball" width="64" height="64" />
        <h2 className="join-card-name">{preview.nombre}</h2>
        <span className="join-card-count">
          {preview.jugadores} {preview.jugadores === 1 ? 'jugador' : 'jugadores'}
        </span>
        <p className="join-card-desc">
          Como organizador podés crear partidos, editar el plantel y compartir
          los resultados
        </p>

        {error && <p className="join-group-error">{error}</p>}

        <div className="join-card-divider" />
        {authEnabled ? (
          <button
            type="button"
            className="btn btn-primary join-card-cta"
            onClick={user ? handleJoin : handleSignInFirst}
            disabled={joining || connecting}
          >
            <Plus size={18} aria-hidden="true" />
            <span>{ctaLabel}</span>
          </button>
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

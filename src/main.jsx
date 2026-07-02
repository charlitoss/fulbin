import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient, useConvexAuth, useMutation } from 'convex/react'
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react'
import { ConvexProviderWithAuthKit } from '@convex-dev/workos'
import { api } from '../convex/_generated/api'
import { authEnabled } from './auth/useAuthSession'
import { PENDING_INVITE_KEY } from './utils/constants'
import App from './App'
import './styles/global.css'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

// Mirrors the WorkOS user into the Convex users table after each sign-in.
function SyncUser() {
  const { user } = useAuth()
  const { isAuthenticated } = useConvexAuth()
  const ensureUser = useMutation(api.users.ensureUser)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    const nombre = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    ensureUser({
      nombre: nombre ?? undefined,
      email: user.email ?? undefined,
      avatar: user.profilePictureUrl ?? undefined,
    })
  }, [isAuthenticated, user?.id])

  return null
}

function Root() {
  if (!authEnabled) {
    return (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    )
  }

  return (
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
      // Persist the refresh token in localStorage instead of a cross-site cookie
      // on api.workos.com. Without this, AuthKit refreshes the session via a
      // third-party cookie that Safari/Brave/Chrome block, so the silent refresh
      // fails and the user gets logged out unexpectedly (clicking "Iniciar
      // sesión" then logs back in instantly because the WorkOS SSO session is
      // still alive). The fully-secure alternative is a paid custom AuthKit
      // domain; this is WorkOS's documented fallback when you don't have one.
      devMode={true}
      redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI || window.location.origin}
      onRedirectCallback={() => {
        // The app routes via the URL hash; drop the /callback path after login.
        window.history.replaceState(null, '', '/')
        // If sign-in started from a group invite, resume it: the login
        // redirect drops the hash, so JoinGroupPage stashes the code first.
        try {
          const pendingInvite = sessionStorage.getItem(PENDING_INVITE_KEY)
          if (pendingInvite) {
            sessionStorage.removeItem(PENDING_INVITE_KEY)
            window.location.hash = `#/unirse/${pendingInvite}`
          }
        } catch {}
      }}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <SyncUser />
        <App />
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)

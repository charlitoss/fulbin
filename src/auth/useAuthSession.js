import { useAuth } from '@workos-inc/authkit-react'

// Auth is optional: until WorkOS is provisioned (VITE_WORKOS_CLIENT_ID set),
// the app runs in the legacy anonymous-only mode and no auth UI is rendered.
export const authEnabled = Boolean(import.meta.env.VITE_WORKOS_CLIENT_ID)

const disabledSession = {
  user: null,
  isLoading: false,
  signIn: () => {},
  signOut: () => {},
}

// authEnabled is a build-time constant, so the same branch runs on every
// render and the conditional hook call is safe.
export function useAuthSession() {
  if (!authEnabled) return disabledSession
  return useAuth()
}

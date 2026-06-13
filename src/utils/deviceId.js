// A stable per-browser anonymous identity. Players who inscribe without an
// account get this token stamped on their registration so they can later
// remove their own inscriptions (but not others'). It is a bearer secret, not
// strong auth — proportionate for a casual app where the match link is already
// the trust boundary. The match owner's actions stay protected by their JWT.

const KEY = 'fulbin:device-id'
let cached = null

function randomId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    // fall through
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getDeviceId() {
  if (cached) return cached
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = randomId()
      localStorage.setItem(KEY, id)
    }
    cached = id
  } catch {
    // localStorage unavailable (private mode / SSR) — use an ephemeral id.
    cached = randomId()
  }
  return cached
}

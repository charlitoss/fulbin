import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'

// Offers a signed-in user ownership of a match that has none (created
// anonymously or before the user system existed).
function ClaimMatchBanner({ match }) {
  const { user } = useAuthSession()
  const claim = useMutation(api.matches.claim)
  const [claiming, setClaiming] = useState(false)

  if (!authEnabled || !user || match.ownerId) return null

  const handleClaim = async () => {
    setClaiming(true)
    try {
      await claim({ matchId: match._id })
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="claim-banner">
      <span className="claim-banner-text">¿Organizás este partido?</span>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleClaim}
        disabled={claiming}
      >
        {claiming ? 'Reclamando...' : 'Reclamar partido'}
      </button>
    </div>
  )
}

export default ClaimMatchBanner

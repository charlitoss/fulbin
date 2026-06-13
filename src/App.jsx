import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import SplashPage from './components/landing/SplashPage'
import CreateMatchPage from './components/landing/CreateMatchPage'
import MyMatchesPage from './components/landing/MyMatchesPage'
import MyPlayersPage from './components/landing/MyPlayersPage'
import StandingsPage from './components/landing/StandingsPage'
import MatchPage from './components/match/MatchPage'
import AuthControls from './components/ui/AuthControls'
import { authEnabled, useAuthSession } from './auth/useAuthSession'
import Footer from './components/ui/Footer'
import CrtEffect from './components/ui/CrtEffect'
import CrtControlPanel from './components/ui/CrtControlPanel'
import { CRT_DEFAULTS, loadCrtParams, saveCrtParams } from './components/ui/crtSettings'

const CRT_STORAGE_KEY = 'fulbin:crt-enabled'

// Component to handle short code redirect
function ShortCodeRedirect({ shortCode, onNavigate }) {
  const match = useQuery(api.matches.getByShortCode, { shortCode: shortCode.toUpperCase() })
  
  useEffect(() => {
    if (match) {
      // Redirect to the full match URL
      window.location.hash = `#/partido/${match._id}`
    }
  }, [match])
  
  if (match === undefined) {
    return (
      <div className="match-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }
  
  if (match === null) {
    return (
      <div className="match-page">
        <div className="error-state">
          <h3>Partido no encontrado</h3>
          <p>El código <strong>{shortCode.toUpperCase()}</strong> no corresponde a ningún partido.</p>
          <button className="btn btn-primary" onClick={() => onNavigate('#/')}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }
  
  return null
}

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')
  const [crtEnabled, setCrtEnabled] = useState(() => {
    try {
      return localStorage.getItem(CRT_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [crtParams, setCrtParams] = useState(loadCrtParams)
  const [crtPanelOpen, setCrtPanelOpen] = useState(false)

  const { user } = useAuthSession()
  const isLoggedIn = authEnabled && !!user
  const homeRoute = isLoggedIn ? '#/mis-partidos' : '#/'

  useEffect(() => {
    try {
      localStorage.setItem(CRT_STORAGE_KEY, String(crtEnabled))
    } catch {}
    document.body.classList.toggle('crt-on', crtEnabled)
    if (!crtEnabled) setCrtPanelOpen(false)
  }, [crtEnabled])

  useEffect(() => {
    saveCrtParams(crtParams)
  }, [crtParams])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  // Logged-in users land on their matches instead of the marketing splash.
  useEffect(() => {
    if (isLoggedIn && (route === '#/' || route === '' || route === '#')) {
      navigate('#/mis-partidos')
    }
  }, [isLoggedIn, route])

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  
  const navigate = (path) => {
    window.location.hash = path
  }
  
  // Parse route
  const getRouteComponent = () => {
    if (route === '#/' || route === '' || route === '#') {
      return <SplashPage onNavigate={navigate} />
    }

    if (route === '#/nuevo') {
      return <CreateMatchPage onNavigate={navigate} />
    }

    if (route === '#/mis-partidos') {
      return <MyMatchesPage onNavigate={navigate} />
    }

    if (route === '#/mis-jugadores') {
      return <MyPlayersPage onNavigate={navigate} />
    }

    if (route === '#/tabla') {
      return <StandingsPage onNavigate={navigate} />
    }

    // Short code route: #/p/ABC123
    const shortCodeRoute = route.match(/^#\/p\/([A-Za-z0-9]{6})$/)
    if (shortCodeRoute) {
      const shortCode = shortCodeRoute[1]
      return <ShortCodeRedirect shortCode={shortCode} onNavigate={navigate} />
    }

    // Match detail route: #/partido/match_123
    const matchRoute = route.match(/^#\/partido\/(.+)$/)
    if (matchRoute) {
      const matchId = matchRoute[1]
      return <MatchPage matchId={matchId} onNavigate={navigate} />
    }

    // 404 - fall back to splash
    return <SplashPage onNavigate={navigate} />
  }

  const isSplash = route === '#/' || route === '' || route === '#'
  const isMatchRoute = /^#\/partido\//.test(route)

  // Top-left back button: label + target depend on where you are and whether
  // you're signed in (signed-in home is Mis partidos, not the splash).
  let back = null
  if (['#/nuevo', '#/mis-jugadores', '#/tabla'].includes(route)) {
    back = { label: '← Volver', target: homeRoute }
  } else if (route === '#/mis-partidos') {
    back = isLoggedIn ? null : { label: '← Volver', target: '#/' }
  } else if (isMatchRoute && isLoggedIn) {
    back = { label: '← Mis partidos', target: '#/mis-partidos' }
  }
  const showBack = !!back

  return (
    <div className={`app${isSplash ? ' app--splash' : ''}`}>
      {isSplash && (
        <div className="splash-auth">
          <AuthControls onNavigate={navigate} />
        </div>
      )}
      {!isSplash && (
        <header className={`app-logo${showBack ? ' app-logo--with-back' : ''}`}>
          {showBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm topbar-back"
              onClick={() => navigate(back.target)}
            >
              {back.label}
            </button>
          )}
          <img src="/LOGO.svg" alt="Fulbin" width="120" height="41" />
          <div className="app-header-auth">
            <AuthControls onNavigate={navigate} />
          </div>
        </header>
      )}
      {getRouteComponent()}
      <Footer
        crtEnabled={crtEnabled}
        onCrtToggle={() => setCrtEnabled(v => !v)}
        onCrtOpenSettings={() => setCrtPanelOpen(v => !v)}
      />
      {crtEnabled && <CrtEffect params={crtParams} />}
      {crtEnabled && crtPanelOpen && (
        <CrtControlPanel
          params={crtParams}
          onChange={setCrtParams}
          onReset={() => setCrtParams({ ...CRT_DEFAULTS })}
          onClose={() => setCrtPanelOpen(false)}
        />
      )}
    </div>
  )
}

export default App

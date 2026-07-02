import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import SplashPage from './components/landing/SplashPage'
import CreateMatchPage from './components/landing/CreateMatchPage'
import MyMatchesPage from './components/landing/MyMatchesPage'
import MyPlayersPage from './components/landing/MyPlayersPage'
import StandingsPage from './components/landing/StandingsPage'
import MyProfilePage from './components/landing/MyProfilePage'
import AdminPage from './components/landing/AdminPage'
import GroupsPage from './components/landing/GroupsPage'
import JoinGroupPage from './components/landing/JoinGroupPage'
import MatchPage from './components/match/MatchPage'
import AuthControls from './components/ui/AuthControls'
import { authEnabled, useAuthSession } from './auth/useAuthSession'
import Footer from './components/ui/Footer'
import CrtEffect from './components/ui/CrtEffect'
import CrtControlPanel from './components/ui/CrtControlPanel'
import { CRT_DEFAULTS, loadCrtParams, saveCrtParams } from './components/ui/crtSettings'

const CRT_STORAGE_KEY = 'fulbin:crt-enabled'

// Visible top nav for signed-in users.
const NAV_LINKS = [
  { label: 'Partidos', route: '#/mis-partidos' },
  { label: 'Jugadores', route: '#/mis-jugadores' },
  { label: 'Torneos', route: '#/tabla' },
]

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

  // On match routes, size the nav to the match content card (744px); 600 elsewhere.
  const matchRouteId = (route.match(/^#\/partido\/(.+)$/) || [])[1]
  const navMaxWidth = matchRouteId ? 744 : 600

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

    if (route === '#/mi-perfil') {
      return <MyProfilePage onNavigate={navigate} />
    }

    if (route === '#/admin') {
      return <AdminPage onNavigate={navigate} />
    }

    if (route === '#/grupos') {
      return <GroupsPage onNavigate={navigate} />
    }

    // Group invite route: #/unirse/ABC123
    const inviteRoute = route.match(/^#\/unirse\/([A-Za-z0-9]{6})$/)
    if (inviteRoute) {
      return <JoinGroupPage code={inviteRoute[1].toUpperCase()} onNavigate={navigate} />
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

  // Anonymous users keep the simple "← Volver" back button on sub-pages;
  // signed-in users navigate via the always-visible top nav instead.
  let back = null
  if (!isLoggedIn && ['#/nuevo', '#/mis-partidos', '#/mis-jugadores', '#/tabla'].includes(route)) {
    back = { label: '← Volver', target: '#/' }
  }
  const showBack = !!back

  return (
    <div className={`app${isSplash ? ' app--splash' : ''}`}>
      {isSplash && (
        <div className="splash-auth">
          <AuthControls onNavigate={navigate} />
        </div>
      )}

      {!isSplash && isLoggedIn && (
        <header className="app-nav" style={{ maxWidth: navMaxWidth }}>
          <button
            type="button"
            className="app-nav-brand"
            onClick={() => navigate('#/mis-partidos')}
            aria-label="Inicio"
          >
            <img src="/LOGO.svg" alt="Fulbin" className="app-nav-logo app-nav-logo--full" width="100" height="34" />
            <img src="/Symbol%20LOGO.svg" alt="Fulbin" className="app-nav-logo app-nav-logo--symbol" width="32" height="32" />
          </button>
          <nav>
            <ul className="app-nav-links">
              {NAV_LINKS.map((item) => (
                <li key={item.route}>
                  <button
                    type="button"
                    className={`app-nav-link${route === item.route ? ' active' : ''}`}
                    onClick={() => navigate(item.route)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <AuthControls onNavigate={navigate} />
        </header>
      )}

      {!isSplash && !isLoggedIn && (
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

import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import SplashPage from './components/landing/SplashPage'
import CreateMatchPage from './components/landing/CreateMatchPage'
import MatchPage from './components/match/MatchPage'
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
  
  return (
    <div className={`app${isSplash ? ' app--splash' : ''}`}>
      {!isSplash && (
        <header className="app-logo">
          <img src="/LOGO.svg" alt="Fulbin" width="120" height="41" />
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

const STEPS = [
  'Crea tu partido',
  'Invita a tus amigos',
  'Arma los equipos',
  'Anotá los goles',
]

export default function SplashPage({ onNavigate }) {
  return (
    <div className="splash-page">
      <div className="splash-content">
        <img
          src="/LOGO.svg"
          alt="Fulbin"
          className="splash-logo"
          width="234"
          height="79"
        />

        <div className="splash-card">
          <img
            src="/icons/cover.jpg"
            alt=""
            aria-hidden="true"
            className="splash-cover"
            width="318"
            height="187"
          />

          <h1 className="splash-headline">
            <span>Organiza el fulbito</span>
            <span>con amigos</span>
          </h1>

          <ol className="splash-howto">
            {STEPS.map((step, index) => (
              <li key={index} className="splash-howto-item">
                <span className="count-chip">{index + 1}</span>
                <span className="splash-howto-label">{step}</span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            className="btn-add-player splash-cta"
            onClick={() => onNavigate('#/nuevo')}
          >
            <span>Nuevo Partido</span>
            <span className="btn-arrow" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

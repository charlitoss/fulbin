import CreateMatchForm from './CreateMatchForm'

// Standalone create-match page (anonymous / splash flow at #/nuevo).
export default function CreateMatchPage({ onNavigate }) {
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="hero-form-container">
          <CreateMatchForm
            heading="Crear partido"
            className="match-form hero-form"
            onCreated={(matchId) => onNavigate(`#/partido/${matchId}`)}
          />
        </div>
      </div>
    </div>
  )
}

const SEGMENT_COUNT = 20

function ProgressBar({ current, total, showMessage = true, label }) {
  const percentage = Math.min((current / total) * 100, 100)
  const isComplete = current >= total
  const filled = Math.floor(percentage / (100 / SEGMENT_COUNT))
  const displayLabel = label !== undefined ? label : `Somos ${current} /${total}`

  return (
    <div className="progress-section">
      <div className="progress-header">
        <span className="progress-title">{displayLabel}</span>
        <div className="progress-bar">
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
            <div
              key={i}
              className={`progress-bar-segment ${i < filled ? 'filled' : ''}`}
            />
          ))}
        </div>
      </div>
      {showMessage && isComplete && (
        <p className="progress-message complete">
          ¡Cupo completo! Puedes continuar al armado de equipos
        </p>
      )}
    </div>
  )
}

export default ProgressBar

// Pure-CSS soccer field — landscape, responsive, no SVG.
// Mirrors the Figma "Field" frame (9:4855): green base + dot pattern, white
// frame lines, left/right penalty areas, center line with kick-off dot.
function Field() {
  return (
    <div className="field-frame">
      <div className="field-line field-line-vertical" />
      <div className="field-middle">
        <div className="field-line field-line-horizontal" />
        <div className="field-mid-row">
          <FieldHalf side="left" />
          <div className="field-center-line">
            <div className="field-penalty-dot" />
          </div>
          <FieldHalf side="right" />
        </div>
        <div className="field-line field-line-horizontal" />
      </div>
      <div className="field-line field-line-vertical" />
    </div>
  )
}

function FieldHalf({ side }) {
  const boundary = (
    <div className="field-line field-line-vertical field-area-boundary" />
  )
  const inner = (
    <div className="field-area-inner">
      <div className="field-line field-line-horizontal" />
      <div className={`field-area-dot-wrap field-area-dot-wrap-${side}`}>
        <div className="field-penalty-dot" />
      </div>
      <div className="field-line field-line-horizontal" />
    </div>
  )

  return (
    <div className={`field-half field-half-${side}`}>
      <div className={`field-area field-area-${side}`}>
        {side === 'left' ? <>{inner}{boundary}</> : <>{boundary}{inner}</>}
      </div>
    </div>
  )
}

export default Field

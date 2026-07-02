// Renders the standings table to a shareable PNG card, drawn on a <canvas>
// with the app's design tokens (dark surface, electric-mint accent,
// GeistPixel-Grid). No dependencies; names are drawn with fillText, so
// untrusted text can't inject anything.

const COLORS = {
  bg: '#0D0D0D',
  card: '#161616',
  border: '#383838',
  divider: '#2E2E2E',
  text: '#F5F5F5',
  muted: '#9E9E9E',
  primary: '#1EFFB4',
  leaderBg: 'rgba(30, 255, 180, 0.08)',
}

const FONT = 'GeistPixel-Grid'
const SCALE = 2 // retina-crisp export

function font(size, weight = 400) {
  return `${weight} ${size}px '${FONT}', monospace`
}

// Truncate a name so it fits its column.
function fit(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

// Draw the card and return the canvas. Layout: header (group + season),
// table (pos / name / PJ G E P / goles / pts), footer (app name + date).
async function drawStandingsCard({ groupName, tournamentName, partidos, tabla, maxRows = 12 }) {
  // Make sure the pixel font is loaded before measuring/drawing.
  try {
    await document.fonts.load(`16px '${FONT}'`)
  } catch {}

  const rows = tabla.slice(0, maxRows)
  const width = 640
  const headerH = tournamentName ? 118 : 92
  const rowH = 42
  const footerH = 64
  const height = headerH + 46 + rows.length * rowH + footerH

  const canvas = document.createElement('canvas')
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Background + card frame
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = COLORS.card
  ctx.fillRect(8, 8, width - 16, height - 16)
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2
  ctx.strokeRect(8, 8, width - 16, height - 16)

  const left = 32
  const right = width - 32

  // Header
  ctx.fillStyle = COLORS.primary
  ctx.font = font(26, 700)
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(fit(ctx, groupName, right - left), left, 52)

  let cursorY = 52
  if (tournamentName) {
    cursorY += 30
    ctx.fillStyle = COLORS.text
    ctx.font = font(17)
    ctx.fillText(fit(ctx, tournamentName, right - left), left, cursorY)
  }
  cursorY += 26
  ctx.fillStyle = COLORS.muted
  ctx.font = font(13)
  ctx.fillText(
    `Tabla de posiciones · ${partidos} ${partidos === 1 ? 'partido' : 'partidos'}`,
    left,
    cursorY
  )

  // Column layout (right-aligned stat columns)
  const cols = { pts: right - 8, goles: right - 78, pep: right - 128, pg: right - 178, pj: right - 228 }
  const nameMax = cols.pj - 60 - left - 44

  // Table header
  let y = headerH + 28
  ctx.fillStyle = COLORS.muted
  ctx.font = font(12)
  ctx.textAlign = 'left'
  ctx.fillText('#  Jugador', left, y)
  ctx.textAlign = 'right'
  ctx.fillText('PJ', cols.pj, y)
  ctx.fillText('G', cols.pg, y)
  ctx.fillText('E-P', cols.pep, y)
  ctx.fillText('Goles', cols.goles, y)
  ctx.fillText('Pts', cols.pts, y)

  y += 12
  ctx.strokeStyle = COLORS.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(left, y)
  ctx.lineTo(right, y)
  ctx.stroke()

  // Rows
  rows.forEach((row, i) => {
    const rowTop = y + i * rowH
    const baseline = rowTop + 28

    if (i === 0) {
      ctx.fillStyle = COLORS.leaderBg
      ctx.fillRect(left - 8, rowTop + 4, right - left + 16, rowH - 4)
    }

    ctx.textAlign = 'left'
    ctx.fillStyle = i === 0 ? COLORS.primary : COLORS.muted
    ctx.font = font(15, 700)
    ctx.fillText(String(i + 1), left, baseline)

    ctx.fillStyle = i === 0 ? COLORS.primary : COLORS.text
    ctx.font = font(16, i === 0 ? 700 : 400)
    ctx.fillText(fit(ctx, row.nombre, nameMax), left + 34, baseline)

    ctx.textAlign = 'right'
    ctx.fillStyle = i === 0 ? COLORS.primary : COLORS.muted
    ctx.font = font(15)
    ctx.fillText(String(row.pj), cols.pj, baseline)
    ctx.fillText(String(row.pg), cols.pg, baseline)
    ctx.fillText(`${row.pe}-${row.pp}`, cols.pep, baseline)
    ctx.fillText(String(row.goles), cols.goles, baseline)
    ctx.font = font(17, 700)
    ctx.fillStyle = i === 0 ? COLORS.primary : COLORS.text
    ctx.fillText(String(row.puntos), cols.pts, baseline)
  })

  // Footer
  const footY = height - 30
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.muted
  ctx.font = font(12)
  const fecha = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.fillText(fecha, left, footY)
  ctx.textAlign = 'right'
  ctx.fillStyle = COLORS.primary
  ctx.font = font(14, 700)
  ctx.fillText('⚽ Fulbin', right, footY)
  ctx.textAlign = 'left'

  if (tabla.length > rows.length) {
    ctx.fillStyle = COLORS.muted
    ctx.font = font(11)
    ctx.fillText(`y ${tabla.length - rows.length} más…`, left, footY - 22)
  }

  return canvas
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

// Generate the card PNG. Returns { blob, file }.
export async function generateStandingsImage(data) {
  const canvas = await drawStandingsCard(data)
  const blob = await canvasToBlob(canvas)
  const file = new File([blob], 'tabla-fulbin.png', { type: 'image/png' })
  return { blob, file }
}

// Share the card: Web Share API with files on mobile (lands straight in a
// WhatsApp chat); otherwise copy to clipboard or download. Returns which
// path ran: 'shared' | 'copied' | 'downloaded'.
export async function shareStandingsImage(data) {
  const { blob, file } = await generateStandingsImage(data)

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'shared' // user closed the sheet
      // fall through to clipboard/download
    }
  }

  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      return 'copied'
    } catch {
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tabla-fulbin.png'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return 'downloaded'
}

// Builds the WhatsApp text version of the standings (and optionally the
// latest results), in the same emoji + *bold* style as the match share
// message (ShareButton). Pure string concatenation — player names never
// touch the DOM here.

const medal = (index) => (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`)

export function buildStandingsMessage({
  groupName,
  tournamentName,
  partidos,
  tabla,
  results = [],
  publicUrl = null,
  maxResults = 5,
}) {
  let message = `🏆 *${groupName}*`
  if (tournamentName) message += `\n📋 ${tournamentName}`
  message += `\n\n*Tabla de posiciones* (${partidos} ${partidos === 1 ? 'partido' : 'partidos'}):\n`

  message += tabla.length
    ? tabla
        .map(
          (row, i) =>
            `${medal(i)} ${row.nombre} — *${row.puntos} pts* (${row.pj}PJ · ${row.pg}G ${row.pe}E ${row.pp}P · ⚽${row.goles})`
        )
        .join('\n')
    : '_Todavía no hay partidos finalizados_'

  const shown = results.slice(0, maxResults)
  if (shown.length) {
    message += `\n\n📅 *Últimos resultados:*\n`
    message += shown
      .map((m) => {
        const r = m.resultado
        const marcador = r
          ? `${r.nombreBlanco || 'Blanco'} ${r.golesBlanco}-${r.golesOscuro} ${r.nombreOscuro || 'Oscuro'}`
          : 'sin resultado'
        return `- ${m.nombre}: ${marcador}`
      })
      .join('\n')
  }

  if (publicUrl) {
    message += `\n\nTabla completa y estadísticas: ${publicUrl}`
  }

  return message
}

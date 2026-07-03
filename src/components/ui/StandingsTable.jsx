// The standings table itself, shared by the signed-in StandingsPage and the
// public group page. Player names render through JSX only — never as HTML.
function StandingsTable({ tabla, onPlayerClick }) {
  return (
    <div className="standings-table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="standings-pos">#</th>
            <th className="standings-name">Jugador</th>
            <th className="standings-th-stat" title="Partidos jugados">PJ</th>
            <th className="standings-th-stat" title="Ganados">G</th>
            <th className="standings-th-stat" title="Empatados">E</th>
            <th className="standings-th-stat" title="Perdidos">P</th>
            <th title="Goles">
              <img src="/soccer-ball.svg" alt="Goles" className="standings-goal-icon" width="16" height="16" />
            </th>
            <th className="standings-th-pts" title="Puntos">Pts</th>
          </tr>
        </thead>
        <tbody>
          {tabla.map((row, index) => (
            <tr key={row.playerId} className={index === 0 ? 'standings-leader' : ''}>
              <td className="standings-pos">{index + 1}</td>
              <td className="standings-name">
                {onPlayerClick ? (
                  <button
                    type="button"
                    className="standings-player-link"
                    onClick={() => onPlayerClick(row.playerId)}
                  >
                    {row.nombre}
                  </button>
                ) : (
                  row.nombre
                )}
              </td>
              <td>{row.pj}</td>
              <td>{row.pg}</td>
              <td>{row.pe}</td>
              <td>{row.pp}</td>
              <td>{row.goles}</td>
              <td className="standings-puntos">{row.puntos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StandingsTable

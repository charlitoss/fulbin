import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import TeamPanel from './TeamPanel'
import SoccerField from './SoccerField'
import HinchadaPanel from './HinchadaPanel'
import InGameHeader from './InGameHeader'
import PlayerCard from '../player/PlayerCard'

function InGameStep({ match, onFinish, finalized = false }) {
  const teamConfig = useQuery(api.teamConfigurations.getByMatch, { matchId: match._id })
  const registrationsData = useQuery(api.registrations.listByMatch, { matchId: match._id })
  const playersData = useQuery(api.players.list)

  const incrementPlayerGoals = useMutation(api.teamConfigurations.incrementPlayerGoals)

  const players = useMemo(() => {
    if (!playersData) return {}
    return playersData.reduce((acc, p) => {
      acc[p._id] = p
      return acc
    }, {})
  }, [playersData])

  const registrations = useMemo(() => {
    if (!registrationsData) return []
    return registrationsData.filter(r => r.asistira)
  }, [registrationsData])

  const buildTeamPlayers = useCallback((teamKey) => {
    if (!teamConfig) return []
    return teamConfig.asignaciones
      .filter(a => a.equipo === teamKey)
      .map(a => ({ ...a, player: players[a.jugadorId] }))
      .filter(entry => entry.player)
  }, [teamConfig, players])

  const blancoPlayers = useMemo(() => buildTeamPlayers('blanco'), [buildTeamPlayers])
  const oscuroPlayers = useMemo(() => buildTeamPlayers('oscuro'), [buildTeamPlayers])

  const goalsBlanco = useMemo(
    () => blancoPlayers.reduce((sum, a) => sum + (a.goles ?? 0), 0),
    [blancoPlayers]
  )
  const goalsOscuro = useMemo(
    () => oscuroPlayers.reduce((sum, a) => sum + (a.goles ?? 0), 0),
    [oscuroPlayers]
  )

  const suplentes = useMemo(
    () => registrations.filter(r => r.tipoInscripcion === 'suplente'),
    [registrations]
  )
  const hinchada = useMemo(
    () => registrations.filter(r => r.tipoInscripcion === 'hinchada'),
    [registrations]
  )

  // Trigger the Gol overlay only on a net score increase (live games only).
  const prevTotalsRef = useRef({ blanco: goalsBlanco, oscuro: goalsOscuro })
  const [golTrigger, setGolTrigger] = useState(null)
  useEffect(() => {
    if (finalized) return
    const prev = prevTotalsRef.current
    let scoringTeam = null
    if (goalsBlanco > prev.blanco) scoringTeam = 'blanco'
    else if (goalsOscuro > prev.oscuro) scoringTeam = 'oscuro'
    if (scoringTeam) {
      setGolTrigger({ key: Date.now(), team: scoringTeam })
    }
    prevTotalsRef.current = { blanco: goalsBlanco, oscuro: goalsOscuro }
  }, [goalsBlanco, goalsOscuro, finalized])

  const handleGoalDelta = useCallback((jugadorId, delta) => {
    if (finalized) return
    incrementPlayerGoals({ matchId: match._id, jugadorId, delta })
  }, [incrementPlayerGoals, match._id, finalized])

  if (!teamConfig || !playersData || !registrationsData) {
    return (
      <div className="match-page">
        <div className="loading">Cargando partido…</div>
      </div>
    )
  }

  return (
    <>
      <InGameHeader
        match={match}
        teamConfig={teamConfig}
        goalsBlanco={goalsBlanco}
        goalsOscuro={goalsOscuro}
        onFinish={onFinish}
        finalized={finalized}
        golTrigger={golTrigger}
      />

      <div className="team-builder-step">
        <div className="team-builder-layout-new">
          <div className="team-builder-teams-row">
            <TeamPanel
              team="blanco"
              teamName={teamConfig.nombreEquipoBlanco}
              players={blancoPlayers}
              registrations={registrations}
              jugadoresPorEquipo={match.jugadoresPorEquipo}
              mode="in-game"
              onGoalDelta={handleGoalDelta}
              readOnly={finalized}
            />
            <TeamPanel
              team="oscuro"
              teamName={teamConfig.nombreEquipoOscuro}
              players={oscuroPlayers}
              registrations={registrations}
              jugadoresPorEquipo={match.jugadoresPorEquipo}
              mode="in-game"
              onGoalDelta={handleGoalDelta}
              readOnly={finalized}
            />
          </div>
        </div>
      </div>

      <SoccerField
        teamConfig={teamConfig}
        players={players}
        registrations={registrations}
        onPositionChange={() => {}}
        onSwapTeam={() => {}}
        onPlayerClick={() => {}}
      />

      {(suplentes.length > 0 || hinchada.length > 0) && (
      <div className="team-builder-extras-row">
        {suplentes.length > 0 && (
          <div className="inscription-step">
            <div className="inscription-step-header">
              <p className="step-title">
                <img src="/icons/moveplayer.svg" alt="" className="step-title-icon" width="24" height="24" />
                Suplentes
              </p>
            </div>
            <div className="player-list compact-list">
              {suplentes.map((registration, index) => {
                const player = players[registration.jugadorId]
                if (!player) return null
                return (
                  <PlayerCard
                    key={registration.jugadorId}
                    player={player}
                    registration={registration}
                    index={index}
                    compact={true}
                  />
                )
              })}
            </div>
          </div>
        )}

        <HinchadaPanel hinchada={hinchada} players={players} />
      </div>
      )}
    </>
  )
}

export default InGameStep

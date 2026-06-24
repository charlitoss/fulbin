import { useState, useEffect } from 'react'
import { Trophy } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../ui/Modal'

function InlineConfirm({ text, busy, yesLabel = 'Sí', danger, onYes, onNo }) {
  return (
    <div className="tournament-settings-confirm">
      <span className="tournament-settings-confirm-text">{text}</span>
      <div className="tournament-settings-confirm-actions">
        <button
          className={`btn btn-sm${danger ? ' btn-secondary btn-danger-text' : ' btn-primary'}`}
          disabled={busy}
          onClick={onYes}
        >
          {busy ? '...' : yesLabel}
        </button>
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={onNo}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// Focused settings for a single tournament: rename, finalize/reopen, delete.
function TournamentSettingsModal({ isOpen, onClose, tournament, leader, onSelect }) {
  const rename = useMutation(api.tournaments.rename)
  const finalize = useMutation(api.tournaments.finalize)
  const reopen = useMutation(api.tournaments.reopen)
  const remove = useMutation(api.tournaments.remove)

  const [name, setName] = useState('')
  const [confirm, setConfirm] = useState(null) // 'finalize' | 'reopen' | 'delete'
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(tournament?.nombre ?? '')
      setConfirm(null)
    }
  }, [isOpen, tournament])

  if (!tournament) return null
  const finalized = !!tournament.finalizadoEn

  const saveName = async () => {
    const nombre = name.trim()
    if (nombre.length >= 2 && nombre !== tournament.nombre) {
      await rename({ tournamentId: tournament._id, nombre })
    }
  }

  const run = async (fn) => {
    setBusy(true)
    try { await fn() } finally { setBusy(false); setConfirm(null) }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar torneo"
      footer={
        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
          Listo
        </button>
      }
    >
      <div className="tournament-settings">
        <div className="form-group">
          <label htmlFor="trn-name">Nombre</label>
          <input
            id="trn-name"
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
          />
        </div>

        {finalized ? (
          <div className="tournament-settings-block">
            {tournament.campeon && (
              <p className="tournament-settings-champ">
                <Trophy size={14} /> Campeón: <strong>{tournament.campeon.nombre}</strong> ({tournament.campeon.puntos} pts)
              </p>
            )}
            {confirm === 'reopen' ? (
              <InlineConfirm
                text="¿Reabrir el torneo? Se borra el campeón y vuelve a estar activo."
                busy={busy}
                yesLabel="Reabrir"
                onYes={() => run(() => reopen({ tournamentId: tournament._id }))}
                onNo={() => setConfirm(null)}
              />
            ) : (
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setConfirm('reopen')}>
                Reabrir torneo
              </button>
            )}
          </div>
        ) : (
          <div className="tournament-settings-block">
            {confirm === 'finalize' ? (
              <InlineConfirm
                text={leader
                  ? `Se coronará campeón a ${leader.nombre} (${leader.puntos} pts) y la tabla quedará congelada.`
                  : 'No hay partidos finalizados, no se coronará campeón. La tabla quedará congelada.'}
                busy={busy}
                yesLabel="Finalizar"
                onYes={() => run(() => finalize({ tournamentId: tournament._id }))}
                onNo={() => setConfirm(null)}
              />
            ) : (
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setConfirm('finalize')}>
                Finalizar torneo
              </button>
            )}
          </div>
        )}

        <div className="tournament-settings-block">
          {confirm === 'delete' ? (
            <InlineConfirm
              text="¿Eliminar el torneo? Sus partidos quedan en Todos."
              busy={busy}
              yesLabel="Eliminar"
              danger
              onYes={() => run(async () => {
                await remove({ tournamentId: tournament._id })
                onSelect(null)
                onClose()
              })}
              onNo={() => setConfirm(null)}
            />
          ) : (
            <button
              className="btn btn-secondary btn-danger-text"
              style={{ width: '100%' }}
              onClick={() => setConfirm('delete')}
            >
              Eliminar torneo
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default TournamentSettingsModal

import { useState, useEffect } from 'react'
import { Check, Pencil, Trash2, Trophy } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../ui/Modal'

// Manage tournaments (seasons): view, create, finalize (crown champion),
// reopen, rename, delete. A season is either active or finalized.
function TournamentsModal({ isOpen, onClose, tournaments, selectedId, onSelect }) {
  const create = useMutation(api.tournaments.create)
  const finalize = useMutation(api.tournaments.finalize)
  const reopen = useMutation(api.tournaments.reopen)
  const rename = useMutation(api.tournaments.rename)
  const remove = useMutation(api.tournaments.remove)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirming, setConfirming] = useState(null) // { id, action: 'delete' | 'finalize' }
  const [busy, setBusy] = useState(false)

  // Drop any transient prompts when the modal is dismissed.
  useEffect(() => {
    if (!isOpen) {
      setCreating(false)
      setNewName('')
      setEditingId(null)
      setConfirming(null)
    }
  }, [isOpen])

  const activeT = tournaments.find((t) => t.activo)

  const handleCreate = async () => {
    const nombre = newName.trim()
    if (nombre.length < 2) return
    const id = await create({ nombre })
    onSelect(id)
    setNewName('')
    setCreating(false)
  }

  const startEdit = (t) => {
    setEditingId(t._id)
    setEditName(t.nombre)
  }

  const saveEdit = async () => {
    const nombre = editName.trim()
    if (nombre.length >= 2) await rename({ tournamentId: editingId, nombre })
    setEditingId(null)
  }

  const handleFinalize = async (t) => {
    setBusy(true)
    try {
      await finalize({ tournamentId: t._id })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const handleRemove = async (t) => {
    setBusy(true)
    try {
      await remove({ tournamentId: t._id })
      if (selectedId === t._id) onSelect(null)
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const handleReopen = async (t) => {
    await reopen({ tournamentId: t._id })
    onSelect(t._id)
  }

  const pick = (id) => {
    onSelect(id)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Torneos"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => setCreating(true)}
          disabled={creating}
          style={{ width: '100%' }}
        >
          Crear torneo
        </button>
      }
    >
      <ul className="tournament-list">
        <li className="tournament-list-row">
          <button
            className={`tournament-list-name${selectedId == null ? ' selected' : ''}`}
            onClick={() => pick(null)}
          >
            {selectedId == null && (
              <span className="tournament-check"><Check size={14} /></span>
            )}
            Tabla histórica
          </button>
        </li>
        {tournaments.map((t) => (
          <li key={t._id} className="tournament-list-row">
            {editingId === t._id ? (
              <span className="tournament-edit">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                  maxLength={40}
                />
                <button className="btn btn-primary btn-sm" onClick={saveEdit}>Guardar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
              </span>
            ) : confirming?.id === t._id ? (
              <span className="tournament-confirm">
                <span className="tournament-confirm-text">
                  {confirming.action === 'delete'
                    ? `¿Eliminar «${t.nombre}»? Sus partidos quedan en Todos.`
                    : `¿Finalizar «${t.nombre}» y coronar al campeón?`}
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => (confirming.action === 'delete' ? handleRemove(t) : handleFinalize(t))}
                >
                  Sí
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => setConfirming(null)}
                >
                  No
                </button>
              </span>
            ) : (
              <>
                <button
                  className={`tournament-list-name${selectedId === t._id ? ' selected' : ''}${
                    t.activo ? ' is-active' : ' is-past'
                  }`}
                  onClick={() => pick(t._id)}
                >
                  {selectedId === t._id && (
                    <span className="tournament-check"><Check size={14} /></span>
                  )}
                  <span className="tournament-list-label">
                    <span>{t.nombre}</span>
                    {t.campeon && (
                      <span className="tournament-champion">
                        <Trophy size={12} /> {t.campeon.nombre}
                      </span>
                    )}
                  </span>
                  {t.activo && <span className="tournament-tag">Activo</span>}
                  {t.finalizadoEn && (
                    <span className="tournament-tag tournament-tag--past">Finalizado</span>
                  )}
                </button>
                <div className="tournament-list-actions">
                  {t.activo ? (
                    <button
                      className="tournament-action"
                      onClick={() => setConfirming({ id: t._id, action: 'finalize' })}
                    >
                      Finalizar
                    </button>
                  ) : (
                    <button className="tournament-action" onClick={() => handleReopen(t)}>
                      Reabrir
                    </button>
                  )}
                  <button
                    className="tournament-action"
                    onClick={() => startEdit(t)}
                    aria-label="Renombrar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="tournament-action tournament-action--danger"
                    onClick={() => setConfirming({ id: t._id, action: 'delete' })}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {creating && (
        <div className="tournament-create">
          {activeT && (
            <p className="tournament-create-note">
              Se finalizará «{activeT.nombre}» y se coronará a su campeón.
            </p>
          )}
          <div className="tournament-create-row">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ej: Apertura 2026"
              autoFocus
              maxLength={40}
            />
            <button className="btn btn-primary btn-sm" onClick={handleCreate}>Crear</button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setCreating(false); setNewName('') }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default TournamentsModal

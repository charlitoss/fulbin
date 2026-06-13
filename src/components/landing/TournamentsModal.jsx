import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../ui/Modal'

// Manage tournaments (seasons): view, create, activate, rename, delete.
function TournamentsModal({ isOpen, onClose, tournaments, selectedId, onSelect }) {
  const create = useMutation(api.tournaments.create)
  const activate = useMutation(api.tournaments.activate)
  const rename = useMutation(api.tournaments.rename)
  const remove = useMutation(api.tournaments.remove)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

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

  const handleRemove = async (t) => {
    await remove({ tournamentId: t._id })
    if (selectedId === t._id) onSelect(null)
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
        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
          Listo
        </button>
      }
    >
      <ul className="tournament-list">
        <li className="tournament-list-row">
          <button
            className={`tournament-list-name${selectedId == null ? ' selected' : ''}`}
            onClick={() => pick(null)}
          >
            Todos los partidos
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
            ) : (
              <>
                <button
                  className={`tournament-list-name${selectedId === t._id ? ' selected' : ''}${
                    t.activo ? ' is-active' : ' is-past'
                  }`}
                  onClick={() => pick(t._id)}
                >
                  <span>{t.nombre}</span>
                  {t.activo && <span className="tournament-tag">Activo</span>}
                </button>
                <div className="tournament-list-actions">
                  {!t.activo && (
                    <button
                      className="tournament-action"
                      onClick={() => activate({ tournamentId: t._id })}
                    >
                      Activar
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
                    onClick={() => handleRemove(t)}
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

      {creating ? (
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
      ) : (
        <button
          type="button"
          className="btn btn-secondary tournament-add-btn"
          onClick={() => setCreating(true)}
        >
          + Nuevo torneo
        </button>
      )}
    </Modal>
  )
}

export default TournamentsModal

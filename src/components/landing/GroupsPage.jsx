import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { Check, Link2, Users, Globe, RefreshCw } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import Modal from '../ui/Modal'
import { copyToClipboard, appBaseUrl } from '../../utils/share'

function initials(name) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Settings for one group: rename, members, invite link, public page toggle.
function GroupSettingsModal({ group, onClose }) {
  const members = useQuery(api.groups.members, { groupId: group._id })
  const rename = useMutation(api.groups.rename)
  const rotateInvite = useMutation(api.groups.rotateInvite)
  const revokeInvite = useMutation(api.groups.revokeInvite)
  const removeMember = useMutation(api.groups.removeMember)
  const setPublic = useMutation(api.groups.setPublic)
  const leave = useMutation(api.groups.leave)
  const removeGroup = useMutation(api.groups.remove)

  const [nombre, setNombre] = useState(group.nombre)
  const [copied, setCopied] = useState(null) // 'invite' | 'public'
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isOwner = group.rol === 'owner'
  const inviteUrl = group.inviteCode ? `${appBaseUrl()}#/unirse/${group.inviteCode}` : null
  const publicUrl = group.publicToken ? `${appBaseUrl()}#/g/${group.publicToken}` : null

  const copy = async (text, which) => {
    if (await copyToClipboard(text)) {
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  const saveRename = async () => {
    const trimmed = nombre.trim()
    if (trimmed.length >= 2 && trimmed !== group.nombre) {
      await rename({ groupId: group._id, nombre: trimmed })
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={group.nombre}>
      <div className="group-settings">
        {isOwner ? (
          <div className="form-group">
            <label htmlFor="group-name">Nombre del grupo</label>
            <div className="group-rename-row">
              <input
                id="group-name"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={40}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={saveRename}
                disabled={nombre.trim().length < 2 || nombre.trim() === group.nombre}
              >
                Guardar
              </button>
            </div>
          </div>
        ) : null}

        <div className="form-group">
          <label>Miembros ({members?.length ?? '…'})</label>
          <ul className="group-members-list">
            {(members ?? []).map((m) => (
              <li key={m.membershipId} className="group-member-row">
                <span className="auth-avatar auth-avatar--initial roster-avatar">
                  {initials(m.nombre)}
                </span>
                <span className="group-member-name">{m.nombre}</span>
                <span className="group-member-rol">
                  {m.rol === 'owner' ? 'Dueño' : 'Co-organizador'}
                </span>
                {isOwner && m.rol !== 'owner' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeMember({ groupId: group._id, userId: m.userId })}
                  >
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isOwner && (
          <div className="form-group">
            <label>Invitar co-organizadores</label>
            <p className="group-hint">
              Cualquier persona con cuenta que abra el link se une como
              co-organizador: puede crear partidos, editar el plantel y manejar
              torneos.
            </p>
            {inviteUrl ? (
              <>
                <div className="group-link-row">
                  <code className="group-link">{inviteUrl}</code>
                </div>
                <div className="group-actions-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => copy(inviteUrl, 'invite')}
                  >
                    {copied === 'invite' ? (
                      <>
                        <Check size={16} /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Link2 size={16} /> Copiar link
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => rotateInvite({ groupId: group._id })}
                    title="Genera un link nuevo; el anterior deja de funcionar"
                  >
                    <RefreshCw size={16} /> Regenerar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => revokeInvite({ groupId: group._id })}
                  >
                    Desactivar
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => rotateInvite({ groupId: group._id })}
              >
                <Link2 size={16} /> Crear link de invitación
              </button>
            )}
          </div>
        )}

        {isOwner && (
          <div className="form-group">
            <label>Página pública</label>
            <p className="group-hint">
              Compartí la tabla, los resultados y las estadísticas con
              cualquiera — sin cuenta, solo lectura.
            </p>
            <label className="group-toggle-row">
              <input
                type="checkbox"
                checked={group.publico}
                onChange={(e) => setPublic({ groupId: group._id, publico: e.target.checked })}
              />
              <Globe size={16} /> Página pública activada
            </label>
            {group.publico && publicUrl && (
              <div className="group-actions-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => copy(publicUrl, 'public')}
                >
                  {copied === 'public' ? (
                    <>
                      <Check size={16} /> ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Link2 size={16} /> Copiar link público
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="form-group group-danger-zone">
          {isOwner ? (
            confirmDelete ? (
              <div className="group-actions-row">
                <span className="group-hint">
                  Los partidos jugados se conservan pero quedan sin grupo. ¿Seguro?
                </span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    await removeGroup({ groupId: group._id })
                    onClose()
                  }}
                >
                  Eliminar definitivamente
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmDelete(true)}
              >
                Eliminar grupo
              </button>
            )
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                await leave({ groupId: group._id })
                onClose()
              }}
            >
              Abandonar grupo
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function GroupsPage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const groups = useQuery(api.groups.myGroups, user ? {} : 'skip')
  const setActive = useMutation(api.groups.setActive)
  const createGroup = useMutation(api.groups.create)

  const [settingsFor, setSettingsFor] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')

  if (!authEnabled || (!isLoading && !user)) {
    return (
      <div className="my-matches-page">
        <div className="my-matches-empty">
          <h2>Mis grupos</h2>
          <p>Iniciá sesión para manejar tus grupos y co-organizadores.</p>
          {authEnabled && (
            <button type="button" className="btn btn-primary" onClick={() => signIn()}>
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading || groups === undefined) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }

  const handleCreate = async () => {
    const nombre = newName.trim()
    if (nombre.length < 2) return
    await createGroup({ nombre })
    setNewName('')
    setCreateOpen(false)
  }

  // Keep the settings modal in sync with live query data.
  const settingsGroup = settingsFor
    ? groups.find((g) => g._id === settingsFor) ?? null
    : null

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <h2>Mis grupos</h2>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setCreateOpen(true)}
        >
          Crear grupo
        </button>
      </div>

      <ul className="my-matches-list">
        {groups.map((g) => (
          <li key={g._id}>
            <div className={`roster-card group-card${g.esActivo ? ' group-card--active' : ''}`}>
              <button
                type="button"
                className="group-card-main"
                onClick={() => {
                  if (!g.esActivo) setActive({ groupId: g._id })
                }}
                title={g.esActivo ? 'Grupo activo' : 'Cambiar a este grupo'}
              >
                <span className="auth-avatar auth-avatar--initial roster-avatar">
                  {initials(g.nombre)}
                </span>
                <div className="roster-card-main">
                  <span className="roster-card-name">
                    {g.nombre}
                    {g.esActivo && <span className="roster-card-you"> (Activo)</span>}
                  </span>
                  <span className="roster-card-meta">
                    <Users size={14} /> {g.miembros}{' '}
                    {g.miembros === 1 ? 'miembro' : 'miembros'}
                    {' · '}
                    {g.rol === 'owner' ? 'Dueño' : 'Co-organizador'}
                    {g.publico && (
                      <>
                        {' · '}
                        <Globe size={14} /> Pública
                      </>
                    )}
                  </span>
                </div>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSettingsFor(g._id)}
              >
                Ajustes
              </button>
            </div>
          </li>
        ))}
      </ul>

      {settingsGroup && (
        <GroupSettingsModal
          group={settingsGroup}
          onClose={() => setSettingsFor(null)}
        />
      )}

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear grupo"
        onSubmit={handleCreate}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={newName.trim().length < 2}
            >
              Crear
            </button>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="new-group-name">Nombre del grupo</label>
          <input
            id="new-group-name"
            type="text"
            placeholder="Ej: Los pibes del martes"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
          />
          <p className="group-hint">
            Cada grupo tiene su propio plantel, torneos y partidos.
          </p>
        </div>
      </Modal>
    </div>
  )
}

export default GroupsPage

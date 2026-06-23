import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authEnabled, useAuthSession } from '../../auth/useAuthSession'
import Modal from '../ui/Modal'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function errMsg(err) {
  const m = String(err?.message ?? err)
  if (m.includes('administrador')) return 'No se puede aplicar esta acción a un administrador.'
  if (m.includes('NO_AUTORIZADO')) return 'No tenés permiso para esta acción.'
  if (m.includes('WORKOS_DELETE')) return 'No se pudo eliminar la cuenta en WorkOS. Intentá de nuevo.'
  return 'No se pudo completar la acción. Intentá de nuevo.'
}

// Super-admin user management: list every registered user with their activity,
// and disable / soft-delete / permanently-delete accounts.
function AdminPage({ onNavigate }) {
  const { user, isLoading, signIn } = useAuthSession()
  const isAdmin = useQuery(api.admin.amISuperAdmin, user ? {} : 'skip')
  const users = useQuery(api.admin.listUsers, isAdmin ? {} : 'skip')

  const setUserDisabled = useMutation(api.admin.setUserDisabled)
  const softDeleteUser = useMutation(api.admin.softDeleteUser)
  const deleteUserPermanently = useAction(api.admin.deleteUserPermanently)

  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null) // 'soft' | 'permanent'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => { setSelected(null); setConfirm(null); setError(''); setBusy(false) }

  const run = async (fn) => {
    setBusy(true); setError('')
    try { await fn(); close() }
    catch (err) { setError(errMsg(err)); setBusy(false); setConfirm(null) }
  }

  if (!authEnabled || (!isLoading && !user)) {
    return (
      <div className="my-matches-page">
        <div className="my-matches-empty">
          <h2>Administración</h2>
          <p>Iniciá sesión para acceder.</p>
          {authEnabled && (
            <button type="button" className="btn btn-primary" onClick={() => signIn()}>Iniciar sesión</button>
          )}
        </div>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="my-matches-page">
        <div className="my-matches-empty">
          <h2>Administración</h2>
          <p>No tenés acceso a esta sección.</p>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate('#/mis-partidos')}>
            Volver
          </button>
        </div>
      </div>
    )
  }

  if (isAdmin === undefined || users === undefined) {
    return (
      <div className="my-matches-page">
        <div className="loading">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="my-matches-page">
      <div className="my-matches-header">
        <h2>Administración</h2>
        <span className="standings-matches-count">
          {users.length} usuario{users.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="standings-table-wrap">
        <table className="standings-table admin-table">
          <thead>
            <tr>
              <th className="standings-name">Usuario</th>
              <th>Alta</th>
              <th title="Partidos">PJ</th>
              <th title="Jugadores en su plantel">👥</th>
              <th title="Torneos">🏆</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u._id}
                className="admin-row"
                onClick={() => { setSelected(u); setConfirm(null); setError('') }}
              >
                <td className="standings-name">
                  <span className="admin-user-name">{u.nombre}</span>
                  <span className="admin-user-email">{u.email}</span>
                </td>
                <td>{fmtDate(u.createdAt)}</td>
                <td>{u.partidos}</td>
                <td>{u.jugadores}</td>
                <td>{u.torneos}</td>
                <td>
                  {u.isAdmin && <span className="admin-badge admin-badge--admin">Admin</span>}
                  {u.deshabilitado && <span className="admin-badge admin-badge--off">Deshabilitado</span>}
                  {!u.isAdmin && !u.deshabilitado && <span className="admin-badge admin-badge--ok">Activo</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!selected}
        onClose={close}
        title="Usuario"
        footer={
          selected && (
            <div className="admin-actions">
              {selected.isAdmin ? (
                <span className="admin-actions-note">
                  <ShieldCheck size={14} /> Administrador — protegido
                </span>
              ) : confirm ? (
                <div className="admin-confirm">
                  <span className="admin-confirm-text">
                    {confirm === 'permanent'
                      ? '¿Eliminar definitivamente? También se borra la cuenta de WorkOS.'
                      : '¿Eliminar la cuenta? Sus partidos quedan anónimos.'}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm btn-danger-text"
                    disabled={busy}
                    onClick={() => run(confirm === 'permanent'
                      ? () => deleteUserPermanently({ userId: selected._id })
                      : () => softDeleteUser({ userId: selected._id }))}
                  >
                    {busy ? '...' : 'Sí, eliminar'}
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setConfirm(null)}>
                    No
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => run(() => setUserDisabled({ userId: selected._id, deshabilitado: !selected.deshabilitado }))}
                  >
                    {selected.deshabilitado ? 'Habilitar' : 'Deshabilitar'}
                  </button>
                  <button className="btn btn-secondary btn-danger-text" disabled={busy} onClick={() => setConfirm('soft')}>
                    Eliminar
                  </button>
                  <button className="btn btn-secondary btn-danger-text" disabled={busy} onClick={() => setConfirm('permanent')}>
                    Eliminar def.
                  </button>
                </>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="admin-detail">
            {error && <div className="form-error">{error}</div>}
            <div className="admin-detail-head">
              <span className="auth-avatar auth-avatar--initial roster-avatar">
                {(selected.nombre || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </span>
              <div>
                <div className="admin-detail-name">{selected.nombre}</div>
                <div className="admin-detail-email">{selected.email}</div>
              </div>
            </div>
            <dl className="admin-detail-grid">
              <div><dt>Estado</dt><dd>{selected.isAdmin ? 'Administrador' : selected.deshabilitado ? 'Deshabilitado' : 'Activo'}</dd></div>
              <div><dt>Alta</dt><dd>{fmtDate(selected.createdAt)}</dd></div>
              <div><dt>Última actividad</dt><dd>{fmtDate(selected.lastActivity)}</dd></div>
              <div><dt>Partidos</dt><dd>{selected.partidos} ({selected.partidosFinalizados} finalizados)</dd></div>
              <div><dt>Jugadores</dt><dd>{selected.jugadores}</dd></div>
              <div><dt>Torneos</dt><dd>{selected.torneos}</dd></div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AdminPage

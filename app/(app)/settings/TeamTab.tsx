'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLang } from '@/components/ui/I18n'
import { Modal, toast } from '@/components/ui/Primitives'
import { MATRIX, PERMISSIONS, ROLES, ROLE_COLORS, initials, roleKey, type RoleName } from '@/lib/permissions'
import { fmtDate } from '@/lib/ui/model'
import { CardHead, errText } from './shared'

type User = { id: string; name: string; email: string; role: RoleName; active: boolean; mustChange: boolean; createdAt: string }

export default function TeamTab({ admin }: { admin: boolean }) {
  const { t, lang } = useLang()
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editRole, setEditRole] = useState<{ id: string; role: RoleName } | null>(null)
  const [pwUser, setPwUser] = useState<User | null>(null)
  const [pw, setPw] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role: 'ESTIMATOR' as RoleName, password: '' })

  const load = useCallback(async () => {
    if (!admin) return
    const res = await fetch('/api/users')
    if (res.ok) setUsers((await res.json()).users)
  }, [admin])
  useEffect(() => { load() }, [load])

  async function patch(u: User, body: Record<string, unknown>, okMsg?: string) {
    const res = await fetch(`/api/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { toast(errText(d, t('save_failed')), 'err'); return false }
    if (okMsg) toast(okMsg, 'ok')
    load(); return true
  }
  async function add() {
    if (!form.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) || form.password.length < 8) { toast(t('um_invalid'), 'err'); return }
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { toast(res.status === 409 ? t('um_exists') : errText(d, t('save_failed')), 'err'); return }
    setShowAdd(false); setForm({ name: '', email: '', role: 'ESTIMATOR', password: '' }); load()
  }
  async function remove(u: User) {
    if (!confirm(t('um_confirm_delete', { name: u.name }))) return
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) toast(errText(d, t('save_failed')), 'err'); else load()
  }

  const rolePill = (r: RoleName) => (
    <span className="role-pill"><span className="role-dot" style={{ background: ROLE_COLORS[r] }} />{t(roleKey(r))}</span>
  )
  const admins = users.filter(u => u.role === 'ADMIN' && u.active).length

  return (
    <div>
      {!admin && <div className="notice">{t('um_readonly')}</div>}

      {admin && (
        <div className="card pad-0" style={{ marginBottom: 14 }}>
          <CardHead k="um_title" sub="um_sub" right={
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <span className="tag">{users.length} {t('um_users_count')}</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>+ {t('um_add')}</button>
            </div>
          } />
          {showAdd && (
            <div className="um-add" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.1fr) auto' }}>
              <div><label className="input-label">{t('um_name')}</label><input type="text" value={form.name} placeholder={t('um_name')} autoFocus onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="input-label">{t('um_email')}</label><input type="text" value={form.email} placeholder="name@blackconstruction.sa" onChange={e => setForm(f => ({ ...f, email: e.target.value.trim() }))} /></div>
              <div><label className="input-label">{t('um_role')}</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as RoleName }))}>
                  {ROLES.map(r => <option key={r} value={r}>{t(roleKey(r))}</option>)}
                </select>
              </div>
              <div><label className="input-label">{t('um_temp_pw')}</label><input type="password" autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>{t('um_cancel')}</button>
                <button className="btn btn-primary btn-sm" onClick={add}>{t('um_save')}</button>
              </div>
            </div>
          )}
          <div className="tbl-scroll">
            <table className="um-table">
              <thead><tr><th>{t('um_name')}</th><th>{t('um_role')}</th><th>{t('um_status')}</th><th>{t('um_added')}</th><th className="right">{t('um_actions')}</th></tr></thead>
              <tbody>
                {users.map(u => {
                  const isMe = u.id === session?.user.id
                  const locked = isMe || (u.role === 'ADMIN' && u.active && admins <= 1)
                  return (
                    <tr key={u.id} className={u.active ? '' : 'is-off'}>
                      <td>
                        <div className="um-user">
                          <span className="avatar" style={{ background: ROLE_COLORS[u.role] }}>{initials(u.name)}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="um-name">{u.name}{isMe && <span className="tag">{t('um_you')}</span>}{u.mustChange && <span className="tag" title={t('um_must_change')}>⟳</span>}</div>
                            <div className="um-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {editRole?.id === u.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select className="um-select" value={editRole.role} onChange={e => setEditRole({ id: u.id, role: e.target.value as RoleName })}>
                              {ROLES.map(r => <option key={r} value={r}>{t(roleKey(r))}</option>)}
                            </select>
                            <button className="btn btn-primary btn-sm" onClick={async () => {
                              if (editRole.role !== u.role && await patch(u, { role: editRole.role }, t('um_role_saved'))) setEditRole(null)
                              else if (editRole.role === u.role) setEditRole(null)
                            }}>{t('um_save_role')}</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditRole(null)}>{t('um_cancel')}</button>
                          </div>
                        ) : rolePill(u.role)}
                      </td>
                      <td>
                        <span className="status-cell">
                          <span className="status-dot" style={{ background: u.active ? 'var(--go)' : 'var(--mute-3)' }} />
                          <span style={{ color: u.active ? 'var(--go)' : 'var(--mute)' }}>{t(u.active ? 'um_active' : 'um_suspended')}</span>
                        </span>
                      </td>
                      <td className="dim mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(u.createdAt, lang)}</td>
                      <td className="right">
                        <div className="um-actions">
                          <button className="btn btn-secondary btn-sm" disabled={locked || editRole?.id === u.id} onClick={() => setEditRole({ id: u.id, role: u.role })}>{t('um_edit_role')}</button>
                          <button className="btn btn-secondary btn-sm" disabled={!u.active} onClick={() => { setPw(''); setPwUser(u) }}>{t('um_reset_pw')}</button>
                          <button className="btn btn-secondary btn-sm" disabled={locked} onClick={() => patch(u, { active: !u.active })}>{t(u.active ? 'um_deactivate' : 'um_activate')}</button>
                          <button className="btn btn-danger btn-sm" disabled={locked} onClick={() => remove(u)}>{t('um_delete')}</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card pad-0" style={{ marginBottom: 14 }}>
        <CardHead k="rp_title" sub="rp_sub" />
        <div className="tbl-scroll">
          <table className="perm-table">
            <thead>
              <tr>
                <th>{t('permissions')}</th>
                {ROLES.map(r => (
                  <th key={r} className="c">
                    <div className="role-th">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="role-dot" style={{ background: ROLE_COLORS[r] }} />{t(roleKey(r))}</span>
                      {admin && <span className="n">{users.filter(u => u.role === r).length} {t('um_users_count')}</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(g => [
                <tr key={g.group} className="group-row"><td colSpan={ROLES.length + 1}>{t(g.group)}</td></tr>,
                ...g.items.map(p => (
                  <tr key={p}>
                    <td style={{ color: 'var(--ink-2)' }}>{t(p)}</td>
                    {ROLES.map(r => {
                      const v = MATRIX[r][p]
                      return (
                        <td key={r} className="c">
                          <button className={`switch${v ? ' on' : ''}`} role="switch" aria-checked={!!v} disabled aria-label={`${t(roleKey(r))} · ${t(p)}`} />
                          {v === 'own' && <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 3 }}>{t('perm_own')}</div>}
                        </td>
                      )
                    })}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </div>

      {pwUser && (
        <Modal title={t('um_reset_pw')} onClose={() => setPwUser(null)} actions={<>
          <button className="btn btn-ghost" onClick={() => setPwUser(null)}>{t('um_cancel')}</button>
          <button className="btn btn-primary" disabled={pw.length < 8} onClick={async () => {
            if (await patch(pwUser, { password: pw }, t('um_pw_set', { email: pwUser.email }))) setPwUser(null)
          }}>{t('um_reset_pw')}</button>
        </>}>
          <div className="form-stack">
            <div className="card-sub">{t('um_confirm_reset', { email: pwUser.email })}</div>
            <div className="form-field"><label className="input-label">{t('um_temp_pw')}</label>
              <input type="password" autoComplete="new-password" autoFocus value={pw} onChange={e => setPw(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

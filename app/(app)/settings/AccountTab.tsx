'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useLang } from '@/components/ui/I18n'
import { toast } from '@/components/ui/Primitives'
import { MATRIX, PERMISSIONS, ROLE_COLORS, initials, roleKey, type RoleName } from '@/lib/permissions'

export default function AccountTab() {
  const { t } = useLang()
  const { data: session } = useSession()
  const role = (session?.user.role ?? 'ESTIMATOR') as RoleName
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function update() {
    if (!pw.current) { setErr(t('ac_pw_current')); return }
    if (pw.next.length < 8) { setErr(t('ac_pw_short')); return }
    if (pw.next !== pw.confirm) { setErr(t('ac_pw_mismatch')); return }
    setBusy(true); setErr('')
    const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current: pw.current, password: pw.next }) })
    setBusy(false)
    if (!res.ok) { setErr(res.status === 400 ? t('ac_pw_wrong') : t('save_failed')); return }
    toast(t('ac_pw_relogin'), 'ok')
    setTimeout(() => signOut({ callbackUrl: '/login' }), 1200)
  }

  const f = (k: string, key: keyof typeof pw, ac: string) => (
    <div className="form-field"><label className="input-label">{t(k)}</label>
      <input type="password" autoComplete={ac} value={pw[key]} onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  )

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="card-eyebrow"><span className="dot" />{t('ac_profile')}</div>
        <div className="um-user" style={{ marginTop: 14 }}>
          <span className="avatar" style={{ background: ROLE_COLORS[role], width: 52, height: 52, fontSize: 16 }}>{initials(session?.user.name ?? '')}</span>
          <div><div className="card-title" style={{ marginTop: 0 }}>{session?.user.name}</div><div className="um-email">{session?.user.email}</div></div>
        </div>
        <div className="info-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
          <div className="info-cell">
            <div className="info-k">{t('um_role')}</div>
            <div className="info-v"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="role-dot" style={{ background: ROLE_COLORS[role] }} />{t(roleKey(role))}</span></div>
          </div>
        </div>
        <div className="card-divider" />
        <div className="info-k" style={{ marginBottom: 8 }}>{t('ac_perms')}</div>
        <div className="perm-list">
          {PERMISSIONS.flatMap(g => g.items).map(p => {
            const v = MATRIX[role][p]
            return (
              <div key={p} className={`perm-item${v ? ' on' : ''}`}>
                <span className="perm-mark">{v ? '✓' : '—'}</span>{t(p)}{v === 'own' ? ` (${t('perm_own')})` : ''}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="card-eyebrow"><span className="dot" />{t('ac_security')}</div>
        <div className="card-title">{t('ac_change_pw')}</div>
        <div className="form-stack">
          {f('ac_current_pw', 'current', 'current-password')}
          {f('ac_new_pw', 'next', 'new-password')}
          {f('ac_confirm_pw', 'confirm', 'new-password')}
          <div className="form-error" role="alert">{err}</div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy} onClick={update}>{busy ? t('saving') : t('ac_update_pw')}</button>
      </div>
    </div>
  )
}

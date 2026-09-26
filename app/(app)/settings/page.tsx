'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useAr } from '@/hooks/useAr'
import ScoringTab from './ScoringTab'
import AuditTab from './AuditTab'

type User = {
  id:         string
  name:       string
  email:      string
  role:       string
  active:     boolean
  mustChange: boolean
  createdAt:  string
}

type Tab = 'scoring' | 'team' | 'data' | 'audit' | 'account'

const ROLES = ['ESTIMATOR', 'MANAGER', 'EXECUTIVE', 'ADMIN']

const ROLE_HELP: Record<string, { en: string; ar: string }> = {
  ADMIN:     { en: 'Full access: users, bulk import/export, audit log, scoring formula, danger zone.', ar: 'وصول كامل: المستخدمون، الاستيراد والتصدير، سجل التدقيق، معادلة التقييم، منطقة الخطر.' },
  MANAGER:   { en: 'Create bids and edit any bid. Analytics & reports. No user management.', ar: 'إنشاء العطاءات وتعديل أي عطاء. التحليلات والتقارير. بدون إدارة المستخدمين.' },
  EXECUTIVE: { en: 'Executive dashboards, analytics & reports. Edits only their own bids.', ar: 'لوحات تنفيذية وتحليلات وتقارير. يعدّل عطاءاته فقط.' },
  ESTIMATOR: { en: 'Create and score bids; edit only bids they created.', ar: 'إنشاء وتقييم العطاءات؛ تعديل العطاءات التي أنشأها فقط.' },
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user.role === 'ADMIN'
  const ar = useAr()

  const [tab, setTab] = useState<Tab>('scoring')

  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [teamErr, setTeamErr] = useState('')

  // Create-user form
  const [form,    setForm]    = useState({ name: '', email: '', role: 'ESTIMATOR', password: '' })
  const [formErr, setFormErr] = useState('')
  const [saving,  setSaving]  = useState(false)

  // Edit / reset password / delete
  const [editUser,  setEditUser]  = useState<User | null>(null)
  const [editForm,  setEditForm]  = useState({ name: '', role: 'ESTIMATOR' })
  const [pwUser,    setPwUser]    = useState<User | null>(null)
  const [pwValue,   setPwValue]   = useState('')
  const [delUser,   setDelUser]   = useState<User | null>(null)
  const [modalErr,  setModalErr]  = useState('')

  // Backup
  const [backupLoading, setBackupLoading] = useState(false)

  // Import
  const fileRef = useRef<HTMLInputElement>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult,  setImportResult]  = useState<{ ok: number; failed: { row: number; error: string }[] } | null>(null)

  // Reset (re-authentication required)
  const [resetModal,   setResetModal]   = useState(false)
  const [resetForm,    setResetForm]    = useState({ email: '', password: '', confirm: '' })
  const [resetErr,     setResetErr]     = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetDone,    setResetDone]    = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) setUsers((await res.json()).users)
    setLoading(false)
  }, [isAdmin])

  useEffect(() => { load() }, [load])

  function errText(data: any): string {
    if (!data?.error) return 'Request failed'
    if (typeof data.error === 'string') return data.error
    const fe = data.error.fieldErrors ?? {}
    return Object.entries(fe).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' · ') || 'Invalid input'
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setFormErr('')
    setSaving(true)
    const res = await fetch('/api/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setFormErr(errText(data)); return }
    setModal(false)
    setForm({ name: '', email: '', role: 'ESTIMATOR', password: '' })
    load()
  }

  async function patch(id: string, update: Record<string, unknown>): Promise<string | null> {
    const res = await fetch(`/api/users/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(update),
    })
    const data = await res.json().catch(() => ({}))
    load()
    return res.ok ? null : errText(data)
  }

  async function quickToggle(u: User) {
    setTeamErr('')
    const err = await patch(u.id, { active: !u.active })
    if (err) setTeamErr(err)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setSaving(true); setModalErr('')
    const update: Record<string, unknown> = {}
    if (editForm.name !== editUser.name) update.name = editForm.name
    if (editForm.role !== editUser.role) update.role = editForm.role
    const err = Object.keys(update).length ? await patch(editUser.id, update) : null
    setSaving(false)
    if (err) setModalErr(err); else setEditUser(null)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwUser) return
    setSaving(true); setModalErr('')
    const err = await patch(pwUser.id, { password: pwValue })
    setSaving(false)
    if (err) setModalErr(err); else { setPwUser(null); setPwValue('') }
  }

  async function confirmDelete() {
    if (!delUser) return
    setSaving(true); setModalErr('')
    const res  = await fetch(`/api/users/${delUser.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setModalErr(errText(data)); return }
    setDelUser(null)
    load()
  }

  async function downloadBackup() {
    setBackupLoading(true)
    try {
      const res = await fetch('/api/admin/backup')
      const cd  = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : 'black-backup.json'
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBackupLoading(false)
    }
  }

  async function downloadTemplate() {
    const res = await fetch('/api/admin/import/template')
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'black-import-template.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    setImportResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res  = await fetch('/api/admin/import', { method: 'POST', body: fd })
      const data = await res.json()
      setImportResult(data)
    } finally {
      setImportLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function closeReset() {
    setResetModal(false)
    setResetForm({ email: '', password: '', confirm: '' })
    setResetErr('')
  }

  const resetReady = resetForm.confirm === 'DELETE' && resetForm.email.trim() !== '' && resetForm.password !== ''

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetReady) return
    setResetLoading(true); setResetErr('')
    try {
      const res  = await fetch('/api/admin/reset-bids', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setResetErr(errText(data)); return }
      setResetDone(data.deleted ?? 0)
      closeReset()
    } finally {
      setResetLoading(false)
    }
  }

  const roleBadge: Record<string, string> = {
    ESTIMATOR: '#4A6585', MANAGER: '#1F6E45', EXECUTIVE: '#B07A1B', ADMIN: '#A8362A',
  }

  const TABS: { key: Tab; label: string; admin?: boolean }[] = [
    { key: 'scoring', label: ar ? 'معادلة التقييم' : 'Scoring Formula' },
    { key: 'team',    label: ar ? 'الفريق والأدوار' : 'Team & Roles', admin: true },
    { key: 'data',    label: ar ? 'البيانات' : 'Data', admin: true },
    { key: 'audit',   label: ar ? 'سجل التدقيق' : 'Audit Trail', admin: true },
    { key: 'account', label: ar ? 'حسابي' : 'My Account' },
  ]
  const visibleTabs = TABS.filter(t => !t.admin || isAdmin)
  const current     = visibleTabs.some(t => t.key === tab) ? tab : 'scoring'

  return (
    <div className="page-wrap">

      <div className="page-header">
        <div className="h-left">
          <div className="h-kicker"><span className="dash" />{ar ? '07 · النظام' : '07 · System'}</div>
          <h1 className="h-title">{ar ? 'إعدادات' : 'Platform'} <em>{ar ? 'المنصة' : 'Settings'}</em></h1>
          <p className="h-sub">
            {isAdmin
              ? (ar ? 'إدارة وصول الفريق والأدوار ومعادلة التقييم وسجل التدقيق' : 'Manage team access, roles, the scoring formula, and the audit trail.')
              : (ar ? 'اطلع على معادلة التقييم وأدر حسابك. تتم إدارة باقي الإعدادات من قِبل المسؤول.' : 'View the scoring formula and manage your account. Other settings are managed by your administrator.')}
          </p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {visibleTabs.map(t => (
          <button key={t.key} role="tab" aria-selected={current === t.key} className={`tab${current === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {current === 'scoring' && <ScoringTab ar={ar} />}

      {current === 'account' && (
        <div className="card">
          <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 12 }}>
            <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'حسابي' : 'My Account'}</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 14 }}>
            <div><strong>{session?.user.name}</strong> · <span className="mono">{session?.user.email}</span></div>
            <div style={{ color: 'var(--mute)' }}>
              {ar ? 'الدور: ' : 'Role: '}<strong style={{ color: roleBadge[session?.user.role ?? ''] }}>{session?.user.role}</strong>
              {session?.user.role && ROLE_HELP[session.user.role] && <> — {ar ? ROLE_HELP[session.user.role].ar : ROLE_HELP[session.user.role].en}</>}
            </div>
          </div>
          <Link href="/settings/change-password" className="btn btn--secondary btn--sm">{ar ? 'تغيير كلمة المرور' : 'Change password'}</Link>
        </div>
      )}

      {/* Team — ADMIN only */}
      {isAdmin && current === 'team' && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-section-head" style={{ marginBottom: 16, paddingBottom: 12 }}>
            <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'أعضاء الفريق' : 'Team Members'}</span>
            <button className="btn btn--primary btn--sm" onClick={() => { setFormErr(''); setModal(true) }}>
              {ar ? '+ مستخدم جديد' : '+ New user'}
            </button>
          </div>

          {teamErr && <p style={{ color: 'var(--nogo)', fontSize: 12, marginBottom: 10 }}>{teamErr}</p>}

          {loading ? (
            <p style={{ color: 'var(--mute)', fontSize: 13 }}>{ar ? 'جارٍ التحميل…' : 'Loading…'}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{ar ? 'الاسم' : 'Name'}</th>
                    <th>{ar ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th>{ar ? 'الدور' : 'Role'}</th>
                    <th>{ar ? 'الحالة' : 'Status'}</th>
                    <th>{ar ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const self = u.id === session?.user.id
                    return (
                      <tr key={u.id}>
                        <td>
                          {u.name}{self && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--mute)' }}>({ar ? 'أنت' : 'you'})</span>}
                          {u.mustChange && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--review)', fontWeight: 600 }}>
                              {ar ? 'يجب تغيير كلمة المرور' : 'MUST CHANGE PW'}
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{u.email}</td>
                        <td><span style={{ fontSize: 11, fontWeight: 700, color: roleBadge[u.role] ?? 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{u.role}</span></td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, color: u.active ? 'var(--go)' : 'var(--mute)' }}>
                            {u.active ? (ar ? 'نشط' : 'ACTIVE') : (ar ? 'غير نشط' : 'INACTIVE')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button className="btn btn--ghost btn--xs" onClick={() => { setModalErr(''); setEditForm({ name: u.name, role: u.role }); setEditUser(u) }}>
                              {ar ? 'تعديل الدور' : 'Edit role'}
                            </button>
                            <button className="btn btn--ghost btn--xs" onClick={() => { setModalErr(''); setPwValue(''); setPwUser(u) }}>
                              {ar ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
                            </button>
                            {!self && (
                              <button className="btn btn--ghost btn--xs" onClick={() => quickToggle(u)}>
                                {u.active ? (ar ? 'تعطيل' : 'Deactivate') : (ar ? 'تفعيل' : 'Activate')}
                              </button>
                            )}
                            {!self && (
                              <button className="btn btn--ghost btn--xs" style={{ color: 'var(--nogo)' }} onClick={() => { setModalErr(''); setDelUser(u) }}>
                                {ar ? 'حذف' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 18, borderTop: '1px solid var(--hairline-soft)', paddingTop: 14 }}>
            <div className="card-eyebrow" style={{ marginBottom: 8 }}><span className="eyebrow-dot" />{ar ? 'صلاحيات الأدوار' : 'Role permissions'}</div>
            {ROLES.slice().reverse().map(r => (
              <div key={r} style={{ fontSize: 12, marginBottom: 4 }}>
                <strong style={{ color: roleBadge[r], fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r}</strong>
                <span style={{ color: 'var(--mute)' }}> — {ar ? ROLE_HELP[r].ar : ROLE_HELP[r].en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data — ADMIN only */}
      {isAdmin && current === 'data' && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 12 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'نسخ احتياطي للبيانات' : 'Data Backup'}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>
              {ar
                ? 'قم بتنزيل نسخة JSON كاملة من جميع عطاءات مؤسستك. استخدم هذا لأرشفة البيانات قبل أي عملية جماعية.'
                : 'Download a complete JSON snapshot of all bids in your organisation. Use this to archive data before a bulk operation.'}
            </p>
            <button className="btn btn--ghost" onClick={downloadBackup} disabled={backupLoading}>
              {backupLoading
                ? (ar ? 'جارٍ التحضير…' : 'Preparing…')
                : (ar ? '↓ تنزيل النسخة الاحتياطية (JSON)' : '↓ Download backup (JSON)')}
            </button>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 12 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'استيراد جماعي' : 'Bulk Import'}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>
              {ar
                ? 'استورد عطاءات متعددة من ملف Excel أو CSV. يتم حساب النقاط والقرارات تلقائياً. قم بتنزيل القالب للاطلاع على تنسيق الأعمدة الصحيح.'
                : 'Import multiple bids from an Excel (.xlsx) or CSV file. Scores and decisions are auto-computed. Download the template for the exact column format.'}
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)',
                cursor: importLoading ? 'default' : 'pointer',
                background: 'var(--surface-3)', color: 'var(--ink)',
              }}>
                {importLoading
                  ? (ar ? 'جارٍ الاستيراد…' : 'Importing…')
                  : (ar ? '↑ رفع الملف (.xlsx / .csv)' : '↑ Upload file (.xlsx / .csv)')}
                <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} disabled={importLoading} onChange={handleImport} />
              </label>
              <button className="btn btn--ghost btn--sm" onClick={downloadTemplate}>
                {ar ? '↓ تنزيل القالب' : '↓ Download template'}
              </button>
            </div>

            {importResult && (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                background: importResult.failed.length === 0 ? 'rgba(34,139,74,0.07)' : 'rgba(180,60,40,0.06)',
                border: `1px solid ${importResult.failed.length === 0 ? 'var(--go)' : 'var(--nogo)'}`,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, marginBottom: importResult.failed.length ? 8 : 0 }}>
                  {ar
                    ? `تم استيراد ${importResult.ok} عطاء بنجاح${importResult.failed.length > 0 ? ` · ${importResult.failed.length} فشل` : ''}`
                    : `${importResult.ok} bid${importResult.ok !== 1 ? 's' : ''} imported successfully${importResult.failed.length > 0 ? ` · ${importResult.failed.length} failed` : ''}`}
                </div>
                {importResult.failed.map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--nogo)', marginTop: 4 }}>
                    Row {f.row}: {f.error}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone — rendered for ADMIN only; the API also re-authenticates */}
          <div className="card" style={{ marginBottom: 14, border: '1px solid var(--nogo)', borderRadius: 'var(--radius)' }}>
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 12 }}>
              <span className="card-eyebrow" style={{ color: 'var(--nogo)' }}>
                <span className="eyebrow-dot" style={{ background: 'var(--nogo)' }} />{ar ? 'منطقة الخطر' : 'Danger Zone'}
              </span>
            </div>
            {resetDone !== null ? (
              <p style={{ fontSize: 13, color: 'var(--go)', fontWeight: 600 }}>
                {ar
                  ? `تم حذف ${resetDone} سجلات. تم مسح جميع البيانات.`
                  : `Done — ${resetDone} record${resetDone !== 1 ? 's' : ''} deleted. All data has been cleared.`}
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>
                  {ar
                    ? <>حذف دائم لجميع <strong>العطاءات والمحادثات وسجلات التقارير</strong> في مؤسستك. لا يمكن التراجع عن هذا. قم بتنزيل نسخة احتياطية أولاً. يتطلب إعادة إدخال بيانات الدخول.</>
                    : <>Permanently delete <strong>all bids, AI conversations, and report logs</strong> in this organisation. This cannot be undone. Download a backup first. Requires re-entering your credentials.</>}
                </p>
                <button className="btn btn--sm" onClick={() => setResetModal(true)} style={{ background: 'var(--nogo)', color: '#fff', border: 'none' }}>
                  {ar ? 'إعادة تعيين جميع البيانات…' : 'Reset all data…'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {isAdmin && current === 'audit' && <AuditTab ar={ar} />}

      {/* Create user modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>{ar ? 'إنشاء مستخدم' : 'Create user'}</span>
              <button className="ai-chat-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px 24px' }}>
              {formErr && <p style={{ color: 'var(--nogo)', fontSize: 12 }}>{formErr}</p>}
              {[
                { label: ar ? 'الاسم الكامل' : 'Full name', key: 'name',     type: 'text',     placeholder: 'Ahmed Al-Rashid' },
                { label: ar ? 'البريد الإلكتروني' : 'Email', key: 'email',   type: 'email',    placeholder: 'ahmed@black-sa.com' },
                { label: ar ? 'كلمة المرور' : 'Password',   key: 'password', type: 'password', placeholder: ar ? 'الحد الأدنى 8 أحرف (سيُجبر المستخدم على التغيير)' : 'Min 8 chars (user will be forced to change)' },
              ].map(f => (
                <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500 }}>
                  {f.label}
                  <input
                    type={f.type}
                    className="field"
                    placeholder={f.placeholder}
                    value={(form as Record<string,string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required
                  />
                </label>
              ))}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500 }}>
                {ar ? 'الدور' : 'Role'}
                <select className="field" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 400 }}>{ar ? ROLE_HELP[form.role].ar : ROLE_HELP[form.role].en}</span>
              </label>
              <button type="submit" className="btn btn--primary" disabled={saving} style={{ marginTop: 4 }}>
                {saving ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : (ar ? 'إنشاء مستخدم' : 'Create user')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit role modal */}
      {editUser && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span>{ar ? 'تعديل المستخدم' : 'Edit user'} · {editUser.email}</span>
              <button className="ai-chat-close" onClick={() => setEditUser(null)}>✕</button>
            </div>
            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px 24px' }}>
              {modalErr && <p style={{ color: 'var(--nogo)', fontSize: 12 }}>{modalErr}</p>}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500 }}>
                {ar ? 'الاسم الكامل' : 'Full name'}
                <input className="field" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required minLength={2} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500 }}>
                {ar ? 'الدور' : 'Role'}
                <select className="field" value={editForm.role} disabled={editUser.id === session?.user.id} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 400 }}>
                  {editUser.id === session?.user.id
                    ? (ar ? 'لا يمكنك تغيير دورك بنفسك.' : 'You cannot change your own role.')
                    : (ar ? ROLE_HELP[editForm.role].ar : ROLE_HELP[editForm.role].en)}
                </span>
              </label>
              <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? '…' : (ar ? 'حفظ' : 'Save')}</button>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {pwUser && (
        <div className="modal-backdrop" onClick={() => setPwUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span>{ar ? 'إعادة تعيين كلمة المرور' : 'Reset password'} · {pwUser.email}</span>
              <button className="ai-chat-close" onClick={() => setPwUser(null)}>✕</button>
            </div>
            <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px 24px' }}>
              {modalErr && <p style={{ color: 'var(--nogo)', fontSize: 12 }}>{modalErr}</p>}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500 }}>
                {ar ? 'كلمة مرور مؤقتة' : 'Temporary password'}
                <input className="field" type="password" value={pwValue} onChange={e => setPwValue(e.target.value)} required minLength={8} maxLength={72} autoFocus />
                <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 400 }}>
                  {ar ? 'الحد الأدنى 8 أحرف. سيُطلب من المستخدم تغييرها عند تسجيل الدخول التالي.' : 'Min 8 characters. The user must change it at their next sign-in.'}
                </span>
              </label>
              <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? '…' : (ar ? 'تعيين كلمة المرور' : 'Set password')}</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete user modal */}
      {delUser && (
        <div className="modal-backdrop" onClick={() => setDelUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ borderBottom: '2px solid var(--nogo)' }}>
              <span style={{ color: 'var(--nogo)', fontWeight: 700 }}>{ar ? 'حذف المستخدم' : 'Delete user'}</span>
              <button className="ai-chat-close" onClick={() => setDelUser(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modalErr && <p style={{ color: 'var(--nogo)', fontSize: 12 }}>{modalErr}</p>}
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                {ar
                  ? <>سيتم حذف <strong>{delUser.name}</strong> ({delUser.email}) نهائياً. ستنتقل ملكية عطاءاته إليك، ويبقى سجل التدقيق محفوظاً. لإيقاف الوصول مؤقتاً استخدم &quot;تعطيل&quot;.</>
                  : <>This permanently deletes <strong>{delUser.name}</strong> ({delUser.email}). Their bids will be reassigned to you and the audit trail is kept. To suspend access temporarily, use Deactivate instead.</>}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn--sm btn--ghost" onClick={() => setDelUser(null)}>{ar ? 'إلغاء' : 'Cancel'}</button>
                <button className="btn btn--sm" disabled={saving} onClick={confirmDelete} style={{ background: 'var(--nogo)', color: '#fff', border: 'none' }}>
                  {saving ? '…' : (ar ? 'حذف نهائي' : 'Delete user')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation modal — requires admin re-authentication */}
      {resetModal && (
        <div className="modal-backdrop" onClick={closeReset}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header" style={{ borderBottom: '2px solid var(--nogo)' }}>
              <span style={{ color: 'var(--nogo)', fontWeight: 700 }}>{ar ? 'إعادة تعيين جميع البيانات' : 'Reset all data'}</span>
              <button className="ai-chat-close" onClick={closeReset}>✕</button>
            </div>
            <form onSubmit={confirmReset} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }} autoComplete="off">
              <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
                {ar
                  ? <>سيؤدي هذا إلى حذف جميع <strong>العطاءات والمحادثات وسجلات التقارير</strong> لمؤسستك بشكل دائم. لا يمكن التراجع. أعد إدخال بيانات دخولك للتأكيد.</>
                  : <>This will permanently delete <strong>all bids, AI conversations, and report logs</strong> for your organisation. There is no undo. Re-enter your credentials to confirm.</>}
              </p>
              {resetErr && <p style={{ color: 'var(--nogo)', fontSize: 12, fontWeight: 600 }}>{resetErr}</p>}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500 }}>
                {ar ? 'البريد الإلكتروني للمسؤول' : 'Admin email'}
                <input className="field" type="email" autoComplete="off" value={resetForm.email} onChange={e => setResetForm(p => ({ ...p, email: e.target.value }))} autoFocus />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500 }}>
                {ar ? 'كلمة المرور' : 'Password'}
                <input className="field" type="password" autoComplete="new-password" value={resetForm.password} onChange={e => setResetForm(p => ({ ...p, password: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500 }}>
                <span style={{ color: 'var(--nogo)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                  {ar ? <>اكتب <strong>DELETE</strong> للتأكيد</> : <>Type <strong>DELETE</strong> to confirm</>}
                </span>
                <input
                  className="field"
                  placeholder="DELETE"
                  value={resetForm.confirm}
                  onChange={e => setResetForm(p => ({ ...p, confirm: e.target.value }))}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn--sm" onClick={closeReset}
                  style={{ background: 'var(--surface-3)', color: 'var(--mute)', border: '1px solid var(--hairline)' }}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn--sm"
                  disabled={!resetReady || resetLoading}
                  style={{
                    background: resetReady ? 'var(--nogo)' : 'var(--surface-3)',
                    color: resetReady ? '#fff' : 'var(--mute)',
                    border: 'none', transition: 'all 0.15s',
                    cursor: resetReady ? 'pointer' : 'default',
                  }}
                >
                  {resetLoading ? (ar ? 'جارٍ التحقق والحذف…' : 'Verifying & deleting…') : (ar ? 'حذف كل شيء نهائيًا' : 'Delete everything permanently')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

type User = {
  id:         string
  name:       string
  email:      string
  role:       string
  active:     boolean
  mustChange: boolean
  createdAt:  string
}

const ROLES = ['ESTIMATOR', 'MANAGER', 'EXECUTIVE', 'ADMIN']

export default function SettingsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user.role === 'ADMIN'

  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)

  // Create-user form
  const [form,    setForm]    = useState({ name: '', email: '', role: 'ESTIMATOR', password: '' })
  const [formErr, setFormErr] = useState('')
  const [saving,  setSaving]  = useState(false)

  // Backup
  const [backupLoading, setBackupLoading] = useState(false)

  // Import
  const fileRef = useRef<HTMLInputElement>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult,  setImportResult]  = useState<{ ok: number; failed: { row: number; error: string }[] } | null>(null)

  // Reset
  const [resetModal,   setResetModal]   = useState(false)
  const [resetPhrase,  setResetPhrase]  = useState('')
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
    if (!res.ok) { setFormErr(data.error?.fieldErrors ? JSON.stringify(data.error.fieldErrors) : data.error); setSaving(false); return }
    setModal(false)
    setForm({ name: '', email: '', role: 'ESTIMATOR', password: '' })
    setSaving(false)
    load()
  }

  async function patch(id: string, update: { role?: string; active?: boolean }) {
    await fetch(`/api/users/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(update),
    })
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

  async function confirmReset() {
    setResetLoading(true)
    try {
      const res  = await fetch('/api/admin/reset-bids', { method: 'POST' })
      const data = await res.json()
      setResetDone(data.deleted ?? 0)
      setResetModal(false)
      setResetPhrase('')
    } finally {
      setResetLoading(false)
    }
  }

  const roleBadge: Record<string, string> = {
    ESTIMATOR: '#4A6585', MANAGER: '#1F6E45', EXECUTIVE: '#B07A1B', ADMIN: '#A8362A',
  }

  return (
    <div className="page-wrap">

      <div className="page-header">
        <div className="h-left">
          <div className="h-kicker"><span className="dash" />07 · System</div>
          <h1 className="h-title"><em>Settings</em></h1>
          <p className="h-sub">Manage team access, roles, and platform configuration.</p>
        </div>
      </div>

      {/* Users section — ADMIN only */}
      {isAdmin && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-section-head" style={{ marginBottom: 16, paddingBottom: 12 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />Team Members</span>
              <button className="btn btn--primary btn--sm" onClick={() => setModal(true)}>+ New user</button>
            </div>

            {loading ? (
              <p style={{ color: 'var(--mute)', fontSize: 13 }}>Loading…</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}{u.mustChange && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--review)', fontWeight: 600 }}>MUST CHANGE PW</span>}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            disabled={u.id === session?.user.id}
                            onChange={e => patch(u.id, { role: e.target.value })}
                            style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--hairline)', background: 'var(--canvas)', color: roleBadge[u.role] ?? 'var(--ink)', fontWeight: 600 }}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, color: u.active ? 'var(--go)' : 'var(--mute)' }}>
                            {u.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td>
                          {u.id !== session?.user.id && (
                            <button
                              className="btn btn--ghost btn--sm"
                              onClick={() => patch(u.id, { active: !u.active })}
                            >
                              {u.active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section A — Data Backup */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 12 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />Data Backup</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>
              Download a complete JSON snapshot of all bids in your organisation. Use this to archive data before a bulk operation.
            </p>
            <button
              className="btn btn--ghost"
              onClick={downloadBackup}
              disabled={backupLoading}
            >
              {backupLoading ? 'Preparing…' : '↓ Download backup (JSON)'}
            </button>
          </div>

          {/* Section B — Bulk Import */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 12 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />Bulk Import</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>
              Import multiple bids from an Excel (.xlsx) or CSV file. Scores and decisions are auto-computed.
              Download the template for the exact column format.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)',
                cursor: importLoading ? 'default' : 'pointer',
                background: 'var(--surface-3)', color: 'var(--ink)',
              }}>
                {importLoading ? 'Importing…' : '↑ Upload file (.xlsx / .csv)'}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.csv"
                  style={{ display: 'none' }}
                  disabled={importLoading}
                  onChange={handleImport}
                />
              </label>
              <button className="btn btn--ghost btn--sm" onClick={downloadTemplate}>
                ↓ Download template
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
                  {importResult.ok} bid{importResult.ok !== 1 ? 's' : ''} imported successfully
                  {importResult.failed.length > 0 && ` · ${importResult.failed.length} failed`}
                </div>
                {importResult.failed.map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--nogo)', marginTop: 4 }}>
                    Row {f.row}: {f.error}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section C — Danger Zone */}
          <div className="card" style={{ marginBottom: 14, border: '1px solid var(--nogo)', borderRadius: 'var(--radius)' }}>
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 12 }}>
              <span className="card-eyebrow" style={{ color: 'var(--nogo)' }}>
                <span className="eyebrow-dot" style={{ background: 'var(--nogo)' }} />Danger Zone
              </span>
            </div>
            {resetDone !== null ? (
              <p style={{ fontSize: 13, color: 'var(--go)', fontWeight: 600 }}>
                Done — {resetDone} bid{resetDone !== 1 ? 's' : ''} deleted.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 14, lineHeight: 1.6 }}>
                  Permanently delete <strong>all bids</strong> in this organisation. This cannot be undone.
                  Download a backup first.
                </p>
                <button
                  className="btn btn--sm"
                  onClick={() => setResetModal(true)}
                  style={{ background: 'var(--nogo)', color: '#fff', border: 'none' }}
                >
                  Reset all bids…
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Non-admin message */}
      {!isAdmin && (
        <div className="card">
          <p style={{ color: 'var(--mute)', fontSize: 13 }}>Settings are managed by your administrator.</p>
        </div>
      )}

      {/* Create user modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Create user</span>
              <button className="ai-chat-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px 24px' }}>
              {formErr && <p style={{ color: 'var(--nogo)', fontSize: 12 }}>{formErr}</p>}
              {[
                { label: 'Full name', key: 'name',     type: 'text',     placeholder: 'Ahmed Al-Rashid' },
                { label: 'Email',    key: 'email',    type: 'email',    placeholder: 'ahmed@black-sa.com' },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Min 8 chars (user will be forced to change)' },
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
                Role
                <select
                  className="field"
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <button type="submit" className="btn btn--primary" disabled={saving} style={{ marginTop: 4 }}>
                {saving ? 'Creating…' : 'Create user'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset confirmation modal */}
      {resetModal && (
        <div className="modal-backdrop" onClick={() => { setResetModal(false); setResetPhrase('') }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--nogo)' }}>
              <span style={{ color: 'var(--nogo)', fontWeight: 700 }}>Reset all bids</span>
              <button className="ai-chat-close" onClick={() => { setResetModal(false); setResetPhrase('') }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
                This will permanently delete <strong>all bids</strong> in your organisation.
                There is no undo. Type <strong>RESET BIDS</strong> to confirm.
              </p>
              <input
                className="field"
                placeholder="Type RESET BIDS"
                value={resetPhrase}
                onChange={e => setResetPhrase(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}
              />
              <button
                className="btn"
                disabled={resetPhrase !== 'RESET BIDS' || resetLoading}
                onClick={confirmReset}
                style={{
                  background: resetPhrase === 'RESET BIDS' ? 'var(--nogo)' : 'var(--surface-3)',
                  color: resetPhrase === 'RESET BIDS' ? '#fff' : 'var(--mute)',
                  border: 'none', transition: 'all 0.15s',
                }}
              >
                {resetLoading ? 'Deleting…' : 'Delete all bids permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

export default function ChangePasswordPage() {
  const [current,  setCurrent]  = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [busy,     setBusy]     = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ current, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); setBusy(false); return }
      // Force re-login so the new session has mustChange=false
      await signOut({ callbackUrl: '/login' })
    } catch {
      setError('Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div className="page-inner" style={{ maxWidth: 420, margin: '60px auto' }}>
      <h1 className="page-title" style={{ marginBottom: 8 }}>Set a new password</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
        Your account requires a password change before you can continue.
      </p>

      <form onSubmit={submit} className="form-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 10, padding: 28 }}>
        {error && <p style={{ color: 'var(--nogo)', fontSize: 13 }}>{error}</p>}

        {/* Hidden username field so password managers can associate the new password with the account */}
        <input type="email" name="username" autoComplete="username" tabIndex={-1} aria-hidden="true" readOnly value="" style={{ display: 'none' }} />

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500 }}>
          Current password
          <input
            type="password"
            className="field"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500 }}>
          New password
          <input
            type="password"
            className="field"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500 }}>
          Confirm new password
          <input
            type="password"
            className="field"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className="btn btn--primary" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  )
}

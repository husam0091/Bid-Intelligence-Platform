'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'

type Change = { field: string; from: unknown; to: unknown }
type Log = {
  id: string; createdAt: string; userId: string; userName: string; userEmail: string
  action: string; entity: string; bidSr: number | null; summary: string; changes: Change[] | Record<string, unknown> | null
}
type AuditUser = { userId: string; userName: string; userEmail: string }

const ACTIONS = [
  'BID_CREATE', 'BID_UPDATE', 'BID_STATUS', 'BID_DELETE', 'BULK_IMPORT', 'DATA_RESET', 'BACKUP_EXPORT',
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_PASSWORD_RESET', 'SCORING_UPDATE',
]

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'var(--go)', UPDATE: 'var(--data-blue)', STATUS: 'var(--data-blue)',
  DELETE: 'var(--nogo)', RESET: 'var(--nogo)', IMPORT: 'var(--review)', EXPORT: 'var(--mute)',
}
const colorFor = (a: string) => ACTION_COLOR[Object.keys(ACTION_COLOR).find(k => a.endsWith(k)) ?? ''] ?? 'var(--ink)'

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export default function AuditTab({ ar }: { ar: boolean }) {
  const [filters, setFilters] = useState({ userId: '', from: '', to: '', bid: '', action: '' })
  const [page,    setPage]    = useState(1)
  const [data,    setData]    = useState<{ logs: Log[]; total: number; pageSize: number; users: AuditUser[] } | null>(null)
  const [open,    setOpen]    = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page: String(page) })
    const res = await fetch(`/api/admin/audit?${qs}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [filters, page])

  useEffect(() => { load() }, [load])

  const set = (k: keyof typeof filters, v: string) => { setPage(1); setFilters(f => ({ ...f, [k]: v })) }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="card">
      <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
        <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'سجل التدقيق' : 'Audit Trail'}</span>
        <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>
          {data ? (ar ? `${data.total} سجل` : `${data.total} entries`) : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.7fr 1.2fr auto', gap: 10, marginBottom: 14, alignItems: 'end' }}>
        <label className="field-label">{ar ? 'المستخدم' : 'User'}
          <select className="field" value={filters.userId} onChange={e => set('userId', e.target.value)}>
            <option value="">{ar ? 'الكل' : 'All users'}</option>
            {data?.users.map(u => <option key={u.userId} value={u.userId}>{u.userName} ({u.userEmail})</option>)}
          </select>
        </label>
        <label className="field-label">{ar ? 'من' : 'From'}
          <input className="field" type="date" value={filters.from} onChange={e => set('from', e.target.value)} />
        </label>
        <label className="field-label">{ar ? 'إلى' : 'To'}
          <input className="field" type="date" value={filters.to} onChange={e => set('to', e.target.value)} />
        </label>
        <label className="field-label">{ar ? 'رقم العطاء' : 'Bid #'}
          <input className="field" type="number" min="1" value={filters.bid} onChange={e => set('bid', e.target.value)} placeholder="#" />
        </label>
        <label className="field-label">{ar ? 'الإجراء' : 'Action'}
          <select className="field" value={filters.action} onChange={e => set('action', e.target.value)}>
            <option value="">{ar ? 'الكل' : 'All actions'}</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <button className="btn btn--ghost btn--sm" onClick={() => { setPage(1); setFilters({ userId: '', from: '', to: '', bid: '', action: '' }) }}>
          {ar ? 'مسح' : 'Clear'}
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 150 }}>{ar ? 'الوقت' : 'Timestamp'}</th>
              <th>{ar ? 'المستخدم' : 'User'}</th>
              <th>{ar ? 'الإجراء' : 'Action'}</th>
              <th style={{ width: 60 }}>{ar ? 'العطاء' : 'Bid #'}</th>
              <th>{ar ? 'الوصف' : 'Summary'}</th>
              <th style={{ width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map(l => {
              const changes = Array.isArray(l.changes) ? l.changes : null
              const isOpen  = open === l.id
              return (
                <Fragment key={l.id}>
                  <tr>
                    <td className="mono" style={{ fontSize: 11 }}>{new Date(l.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' })}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{l.userName}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>{l.userEmail}</div>
                    </td>
                    <td><span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: colorFor(l.action) }}>{l.action}</span></td>
                    <td className="mono">{l.bidSr ?? '—'}</td>
                    <td style={{ fontSize: 12 }}>{l.summary}</td>
                    <td>
                      {l.changes && (
                        <button className="btn btn--ghost btn--xs" onClick={() => setOpen(isOpen ? null : l.id)}>
                          {isOpen ? (ar ? 'إخفاء' : 'Hide') : (ar ? 'التفاصيل' : 'Details')}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--surface)', padding: '10px 16px' }}>
                        {changes ? (
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', color: 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                                <th style={{ padding: '4px 8px', width: 180 }}>{ar ? 'الحقل' : 'FIELD'}</th>
                                <th style={{ padding: '4px 8px' }}>{ar ? 'القيمة السابقة' : 'PREVIOUS VALUE'}</th>
                                <th style={{ padding: '4px 8px' }}>{ar ? 'القيمة الجديدة' : 'NEW VALUE'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changes.map(c => (
                                <tr key={c.field} style={{ borderTop: '1px dashed var(--hairline-soft)' }}>
                                  <td className="mono" style={{ padding: '4px 8px' }}>{c.field}</td>
                                  <td className="mono diff-from" style={{ padding: '4px 8px', wordBreak: 'break-all' }}>{fmt(c.from)}</td>
                                  <td className="mono diff-to" style={{ padding: '4px 8px', wordBreak: 'break-all' }}>{fmt(c.to)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <pre className="mono" style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(l.changes, null, 2)}</pre>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {data && data.logs.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--mute)', padding: '28px 0', fontSize: 12 }}>
                {ar ? 'لا توجد سجلات تطابق الفلاتر' : 'No audit entries match these filters'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>
        <span>{loading ? (ar ? 'جارٍ التحميل…' : 'Loading…') : `${ar ? 'صفحة' : 'Page'} ${page} / ${pages}`}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn--ghost btn--xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
          <button className="btn btn--ghost btn--xs" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      </div>
    </div>
  )
}

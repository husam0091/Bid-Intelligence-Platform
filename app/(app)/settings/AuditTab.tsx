'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/I18n'
import { ACTION_KEY, actionClass, roleKey } from '@/lib/permissions'
import { DECISION_MAP, OUTCOME_MAP, SAR, fmtDateTime } from '@/lib/ui/model'
import { CardHead } from './shared'

type Change = { field: string; from: unknown; to: unknown }
type Log = { id: string; createdAt: string; userId: string; userName: string; userEmail: string; action: string; entityId: string | null; bidSr: number | null; summary: string; changes: Change[] | Record<string, unknown> | null }
type Filters = { userId: string; from: string; to: string; bid: string; action: string }
const EMPTY: Filters = { userId: '', from: '', to: '', bid: '', action: '' }

export default function AuditTab() {
  const { t, lang } = useLang()
  const router = useRouter()
  const [f, setF] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ logs: Log[]; total: number; pageSize: number; users: { userId: string; userName: string; userEmail: string }[] } | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: String(page) })
    const res = await fetch(`/api/admin/audit?${qs}`)
    if (res.ok) setData(await res.json())
  }, [f, page])
  useEffect(() => { load() }, [load])

  const set = (k: keyof Filters, v: string) => { setPage(1); setF(p => ({ ...p, [k]: v })) }
  const label = (field: string) => { const k = 'fld_' + field, v = t(k); return v === k ? field : v }
  const value = (field: string, v: unknown): string => {
    if (v === '' || v == null) return '—'
    if (['contractValue', 'actualSpend', 'estValue'].includes(field)) return SAR(Number(v), lang)
    if (field === 'outcome') return t((OUTCOME_MAP as any)[String(v)] ?? String(v))
    if (field === 'decision') return t((DECISION_MAP as any)[String(v)] ?? String(v))
    if (field === 'role') return t(roleKey(String(v)))
    if (field === 'active') return t(v ? 'um_active' : 'um_suspended')
    if (field === 'winBands' && Array.isArray(v)) return v.map((b: any) => `≥${b.min}:${Math.round(b.p * 100)}%`).join(' ')
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }
  const fld = (k: string, c: React.ReactNode) => <div className="form-field"><label className="input-label">{t(k)}</label>{c}</div>
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="card pad-0">
      <CardHead k="au_title" sub="au_sub" right={<span className="tag">{t('au_entries', { n: data?.total ?? 0 })}</span>} />
      <div className="audit-filters">
        {fld('au_user', (
          <select value={f.userId} onChange={e => set('userId', e.target.value)}>
            <option value="">{t('au_all_users')}</option>
            {data?.users.map(u => <option key={u.userId} value={u.userId}>{u.userName}</option>)}
          </select>
        ))}
        {fld('au_from', <input type="date" value={f.from} onChange={e => set('from', e.target.value)} />)}
        {fld('au_to', <input type="date" value={f.to} onChange={e => set('to', e.target.value)} />)}
        {fld('au_bid', <input type="number" min="1" placeholder="#" value={f.bid} onChange={e => set('bid', e.target.value)} />)}
        {fld('au_action', (
          <select value={f.action} onChange={e => set('action', e.target.value)}>
            <option value="">{t('au_all_actions')}</option>
            {Object.entries(ACTION_KEY).map(([a, k]) => <option key={a} value={a}>{t(k)}</option>)}
          </select>
        ))}
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'end' }} onClick={() => { setPage(1); setF(EMPTY) }}>{t('au_clear')}</button>
      </div>
      <div className="tbl-scroll">
        <table className="perm-table audit-table">
          <thead><tr><th>{t('au_ts')}</th><th>{t('au_user')}</th><th>{t('au_action')}</th><th>{t('au_bid')}</th><th>{t('au_summary')}</th><th className="right" /></tr></thead>
          <tbody>
            {data && !data.logs.length && <tr><td colSpan={6} className="empty">{t('au_empty')}</td></tr>}
            {data?.logs.map(a => {
              const changes = Array.isArray(a.changes) ? a.changes : null
              const isOpen = !!open[a.id]
              return (
                <Fragment key={a.id}>
                  <tr>
                    <td className="mono" style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>{fmtDateTime(a.createdAt, lang)}</td>
                    <td><div style={{ fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{a.userName}</div><div className="um-email">{a.userEmail}</div></td>
                    <td><span className={`tag action-tag ${actionClass(a.action)}`}>{t(ACTION_KEY[a.action] ?? a.action)}</span></td>
                    <td className="mono">
                      {a.bidSr != null
                        ? (a.action !== 'BID_DELETE' && a.entityId
                          ? <button className="link-btn" onClick={() => router.push(`/bids/${a.entityId}`)}>#{a.bidSr}</button>
                          : `#${a.bidSr}`)
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--ink-2)' }}>{a.summary}</td>
                    <td className="right">
                      <button className="btn btn-secondary btn-sm" aria-expanded={isOpen} onClick={() => setOpen(o => ({ ...o, [a.id]: !isOpen }))}>{isOpen ? t('au_hide') : t('au_details')}</button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="diff-row">
                      <td colSpan={6}>
                        {changes && changes.length ? (
                          <table className="diff-table">
                            <thead><tr><th>{t('au_field')}</th><th>{t('au_prev')}</th><th>{t('au_new')}</th></tr></thead>
                            <tbody>
                              {changes.map(c => (
                                <tr key={c.field}>
                                  <td style={{ fontWeight: 600 }}>{label(c.field)}</td>
                                  <td><span className="diff-prev">{value(c.field, c.from)}</span></td>
                                  <td><span className="diff-new">{value(c.field, c.to)}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : a.changes && !changes ? (
                          <pre className="mono" style={{ fontSize: 11.5, whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(a.changes, null, 2)}</pre>
                        ) : <div className="dim" style={{ fontSize: 12.5 }}>{t('au_no_changes')}</div>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="card-foot" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mono dim" style={{ fontSize: 11 }}>{page} / {pages}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>→</button>
          </div>
        </div>
      )}
    </div>
  )
}

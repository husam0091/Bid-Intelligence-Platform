'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/I18n'
import { AiBand, DecisionPill, Eyebrow, OutcomePill, RiskPill, toast } from '@/components/ui/Primitives'
import {
  CRITERIA_GROUPS, GROUP_NAME_KEY, OUTCOMES, OUTCOME_DB, SAR, decisionCls, fmtDate, perfColorVar, type Outcome, type Project,
} from '@/lib/ui/model'

export default function BidDetailView({ project: p, canEdit, canDelete }: { project: Project; canEdit: boolean; canDelete: boolean }) {
  const { t, lang } = useLang()
  const router = useRouter()
  const dcls = decisionCls(p.decision)
  const initial = { outcome: p.outcome, contractValue: p.contractValue, actualSpend: p.actualSpend, consultant: p.consultant, mainCompetitor: p.mainCompetitor, remarks: p.remarks }
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => setDraft(d => ({ ...d, [k]: v }))

  async function save() {
    if (JSON.stringify(draft) === JSON.stringify(initial)) { toast(t('bd_nochange')); return }
    setBusy(true)
    const res = await fetch(`/api/bids/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, outcome: OUTCOME_DB[draft.outcome] }),
    })
    setBusy(false)
    if (res.ok) { toast(t('bd_saved'), 'ok'); router.refresh() }
    else toast((await res.json().catch(() => ({}))).error ?? t('save_failed'), 'err')
  }

  async function remove() {
    if (!confirm(t('bd_confirm_delete'))) return
    setBusy(true)
    const res = await fetch(`/api/bids/${p.id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) { toast(t('bd_deleted')); router.push('/bids'); router.refresh() }
    else toast(t('save_failed'), 'err')
  }

  const cell = (k: string, v: string) => (
    <div className="info-cell"><div className="info-k">{t(k)}</div><div className="info-v">{v || '—'}</div></div>
  )
  const field = (k: string, c: React.ReactNode) => (
    <div className="form-field"><label className="input-label">{t(k)}</label>{c}</div>
  )

  return (
    <div className="page">
      <Link href="/bids" className="btn btn-ghost btn-sm back-link">← {t('bd_back')}</Link>
      <header className="page-header" style={{ marginTop: 10 }}>
        <div className="h-left">
          <div className="h-kicker"><span className="dash" />{(lang === 'ar' ? 'عطاء #' : 'BID #') + p.sr}</div>
          <h1 className="h-title display">{p.name}</h1>
          <div className="h-sub">{[t(p.location), t(p.type), t(p.clientCategory), fmtDate(p.date, lang)].join(' · ')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <DecisionPill d={p.decision} /><OutcomePill o={p.outcome} />
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-col">
          <div className="card">
            <Eyebrow k="bd_info" />
            <div className="info-grid">
              {cell('location', t(p.location))}{cell('type', t(p.type))}{cell('size', t(p.size))}
              {cell('duration', t(p.duration))}{cell('tender_type', t(p.tenderType))}{cell('client_sector', t(p.clientCategory))}
              {cell('estimated_value', SAR(p.estValue, lang))}{cell('submission_date', fmtDate(p.date, lang))}{cell('consultant', p.consultant)}
              {cell('pmc', p.pmc)}{cell('bd_competitor', p.mainCompetitor)}{cell('bd_created_by', p.createdByName)}
            </div>
          </div>

          <div className="card">
            <div className="row-spread">
              <Eyebrow k="bd_criteria" />
              <span className="mono" style={{ fontSize: 12, color: 'var(--mute)' }}>{p.totalScore} / 135</span>
            </div>
            {CRITERIA_GROUPS.map(g => {
              const sum = g.items.reduce((a, id) => a + (p.scores[id] || 0), 0)
              const max = g.items.length * 5
              const pc = (sum / max) * 100
              return (
                <div key={g.id} className="crit-group">
                  <div className="crit-head">
                    <span className="crit-title"><span className="role-dot" style={{ background: g.color }} />{t(GROUP_NAME_KEY[g.id])}</span>
                    <span className="mono" style={{ fontWeight: 600, color: perfColorVar(pc) }}>{sum}/{max}</span>
                  </div>
                  <div className="crit-bar"><div style={{ width: pc + '%', background: perfColorVar(pc) }} /></div>
                  <div className="crit-list">
                    {g.items.map(id => {
                      const v = p.scores[id] || 0
                      const lv = v <= 1 ? 'lv-low' : v <= 3 ? 'lv-mid' : 'lv-high'
                      return (
                        <div key={id} className="crit-row" title={t('h_' + id)}>
                          <span className="crit-name">{t(id)}</span>
                          <span className="score-dots" aria-label={`${v} / 5`}>{[0, 1, 2, 3, 4].map(i => <i key={i} className={i < v ? `on ${lv}` : ''} />)}</span>
                          <span className="mono crit-v">{v}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="detail-col">
          <div className={`card verdict-panel ${dcls}`} style={{ position: 'static' }}>
            <Eyebrow k="bd_result" />
            <div className={`verdict-headline display ${dcls}`} style={{ fontSize: 56 }}>{t(p.decision)}</div>
            <div className="row-spread" style={{ marginBottom: 6 }}>
              <span className="info-k">{t('total_score')}</span>
              <span className="mono num" style={{ fontWeight: 600 }}>{p.totalScore} <span style={{ color: 'var(--mute)' }}>/ 135</span></span>
            </div>
            <div className="verdict-bar-bg"><div className="verdict-bar-fill" style={{ width: `${(p.totalScore / 135) * 100}%`, background: `var(--${dcls})` }} /></div>
            <div className="grid grid-2" style={{ marginTop: 16, gap: 10 }}>
              <div><div className="info-k">{t('risk_index')}</div><div style={{ marginTop: 6 }}><RiskPill r={p.riskIndex} /></div></div>
              <div><div className="info-k">{t('win_pct')}</div><div className="mono num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{Math.round(p.expectWin * 100)}%</div></div>
            </div>
            {p.commercialFlag ? (
              <div className="verdict-alert" style={{ background: 'var(--review-tint)', borderColor: 'var(--review-soft)', color: 'var(--ink-2)', borderInlineStartColor: 'var(--review)' }}>
                <span style={{ color: 'var(--review)', fontWeight: 700 }}>⚑</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 3, color: 'var(--review)' }}>{t('commercial_flag')} · {p.cfr}/25</div>
                  {t('hard_stop_msg')}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--go)' }}>✓ {t('commercial_ok')}</div>
            )}
          </div>

          <AiBand url={`/api/ai/insight?bidId=${p.id}&lang=${lang}`} pick={j => j.insight} label={t('ai_summary_pred')} />

          <div className="card">
            <Eyebrow k="bd_update" />
            {!canEdit && <div className="notice" style={{ marginTop: 12, marginBottom: 0 }}>{t('bd_readonly')}</div>}
            <div className="form-stack">
              {field('outcome', (
                <select value={draft.outcome} disabled={!canEdit} onChange={e => set('outcome', e.target.value as Outcome)}>
                  {OUTCOMES.map(o => <option key={o} value={o}>{t(o)}</option>)}
                </select>
              ))}
              <div className="grid grid-2" style={{ gap: 12 }}>
                {field('contract_value_sar', <input type="number" min="0" step="1000" value={draft.contractValue} disabled={!canEdit} onChange={e => set('contractValue', Number(e.target.value) || 0)} />)}
                {field('actual_spend_sar', <input type="number" min="0" step="1000" value={draft.actualSpend} disabled={!canEdit} onChange={e => set('actualSpend', Number(e.target.value) || 0)} />)}
              </div>
              {field('consultant', <input type="text" value={draft.consultant} placeholder={t('consultant_ph')} disabled={!canEdit} onChange={e => set('consultant', e.target.value)} />)}
              {field('bd_competitor', <input type="text" value={draft.mainCompetitor} placeholder={t('competitor_ph')} disabled={!canEdit} onChange={e => set('mainCompetitor', e.target.value)} />)}
              {field('bd_remarks', <textarea rows={3} value={draft.remarks} placeholder={t('remarks_ph')} disabled={!canEdit} onChange={e => set('remarks', e.target.value)} />)}
            </div>
            {canEdit && (
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }} disabled={busy} onClick={save}>
                {busy ? t('saving') : t('bd_save')}
              </button>
            )}
            {canDelete && (
              <div className="danger-row">
                <span className="info-k">{t('bd_admin_only')}</span>
                <button className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>{t('bd_delete')}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

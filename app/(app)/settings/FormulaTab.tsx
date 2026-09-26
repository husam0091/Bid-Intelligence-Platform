'use client'

import { useEffect, useState } from 'react'
import { useLang } from '@/components/ui/I18n'
import { Pill, toast } from '@/components/ui/Primitives'
import { fmtRule } from '@/lib/ui/i18n'
import { DEFAULT_SCORING } from '@/lib/decision'
import { fromRules, toRules, type Rules } from '@/lib/ui/model'
import { CardHead, errText } from './shared'

const clone = (r: Rules): Rules => JSON.parse(JSON.stringify(r))

export default function FormulaTab() {
  const { t } = useLang()
  const [rules, setRules] = useState<Rules | null>(null)
  const [draft, setDraft] = useState<Rules | null>(null)
  const [admin, setAdmin] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/scoring-config').then(r => r.json()).then(d => {
      const r = toRules(d.config); r.bands.sort((a, b) => b.min - a.min)
      setRules(r); setDraft(clone(r)); setAdmin(!!d.canEdit)
    }).catch(() => toast(t('save_failed'), 'err'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft || !rules) return <div className="empty">…</div>

  const upd = (fn: (d: Rules) => void) => setDraft(d => { const n = clone(d!); fn(n); return n })
  const numIn = (val: number, set: (v: number) => void, o: { max?: number; lock?: boolean } = {}) => (
    <input type="number" className="num-input" value={val} min={0} max={o.max ?? 135} step={1}
      disabled={!admin || o.lock} onChange={e => set(Number(e.target.value))} />
  )

  async function save() {
    const d = clone(draft!)
    const inRange = (v: number) => Number.isFinite(v) && v >= 0 && v <= 135
    const ok = inRange(d.go) && inRange(d.review) && d.go > d.review && d.bands.every(b => inRange(b.min) && b.p >= 0 && b.p <= 1) && d.commercialFlag >= 0 && d.commercialFlag <= 25
    if (!ok) { toast(t('sf_invalid'), 'err'); return }
    d.bands.sort((a, b) => b.min - a.min)
    d.bands[d.bands.length - 1].min = 0
    setSaving(true)
    const res = await fetch('/api/scoring-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fromRules(d)) })
    const j = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { toast(errText(j, t('sf_invalid')), 'err'); return }
    const saved = toRules(j.config); saved.bands.sort((a, b) => b.min - a.min)
    setRules(saved); setDraft(clone(saved))
    toast(t('sf_saved', { n: j.recomputed }), 'ok')
  }

  const row = (label: string, valueNode: React.ReactNode, rule: string, pill?: React.ReactNode) => (
    <tr>
      <td style={{ fontWeight: 600, color: 'var(--ink)' }}><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>{pill}{label}</span></td>
      <td>{valueNode}</td>
      <td className="dim">{rule}</td>
    </tr>
  )

  const P = (k: string) => t(k)
  const kpis: [string, string, string[]][] = [
    ['total_bids', t('f_total'), [P('nav_operations'), P('nav_ceo'), P('nav_analytics')]],
    ['win_rate', `${t('f_win')} · ${t('f_win_note')}`, [P('nav_operations'), P('nav_ceo'), P('nav_analytics')]],
    ['GO', fmtRule(t, 'f_go', rules), [P('nav_operations')]],
    ['REVIEW', fmtRule(t, 'f_review', rules), [P('nav_operations')]],
    ['NO GO', fmtRule(t, 'f_nogo', rules), [P('nav_operations')]],
    ['pipeline_value', t('f_pipeline'), [P('nav_ceo')]],
    ['contract_value', t('f_contract'), [P('nav_ceo')]],
    ['actual_spend', t('f_spend'), [P('nav_ceo')]],
    ['avg_score_kpi', t('f_avg_score'), [P('nav_ceo')]],
    ['avg_score_wins', t('f_mean_both'), [P('nav_analytics')]],
    ['variance', t('f_variance'), [P('nav_operations'), P('nav_ceo')]],
  ]

  return (
    <div>
      <div className="card pad-0" style={{ marginBottom: 14 }}>
        <CardHead k="sf_title" sub="sf_sub" />
        {!admin && <div className="notice" style={{ margin: '14px 20px 0' }}>{t('sf_readonly')}</div>}
        <div className="tbl-scroll">
          <table className="perm-table">
            <thead><tr><th>{t('sf_param')}</th><th>{t('sf_value')}</th><th>{t('sf_rule')}</th></tr></thead>
            <tbody>
              {row(t('sf_go'), numIn(draft.go, v => upd(d => { d.go = v })), t('sf_go_rule'), <Pill value="GO" kind="decision" />)}
              {row(t('sf_review'), numIn(draft.review, v => upd(d => { d.review = v })), t('sf_review_rule'), <Pill value="REVIEW" kind="decision" />)}
              {row(t('sf_nogo'), <span className="mono dim">&lt; {draft.review}</span>, t('sf_nogo_rule'), <Pill value="NO GO" kind="decision" />)}
              <tr className="group-row"><td colSpan={3}>{t('sf_bands')}</td></tr>
              {draft.bands.map((b, i) => (
                <tr key={i}>
                  <td><span className="band-cell">{t('sf_band')}{numIn(b.min, v => upd(d => { d.bands[i].min = v }), { lock: i === draft.bands.length - 1 })}</span></td>
                  <td><span className="band-cell">{numIn(Math.round(b.p * 100), v => upd(d => { d.bands[i].p = v / 100 }), { max: 100 })}%</span></td>
                  <td className="dim">{t('sf_band_rule')}</td>
                </tr>
              ))}
              <tr className="group-row"><td colSpan={3}>{t('commercial_flag')}</td></tr>
              {row(t('sf_flag'), <span className="band-cell">&lt;{numIn(draft.commercialFlag, v => upd(d => { d.commercialFlag = v }), { max: 25 })}/ 25</span>, t('sf_flag_rule'))}
            </tbody>
          </table>
        </div>
        {admin && (
          <div className="card-foot">
            <button className="btn btn-ghost" onClick={() => { const d = toRules(DEFAULT_SCORING); d.bands.sort((a, b) => b.min - a.min); setDraft(d) }}>{t('sf_defaults')}</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? t('saving') : t('sf_save')}</button>
          </div>
        )}
      </div>

      <div className="card pad-0" style={{ marginBottom: 14 }}>
        <CardHead k="kf_title" sub="kf_sub" />
        <div className="tbl-scroll">
          <table className="perm-table">
            <thead><tr><th>{t('kf_kpi')}</th><th>{t('kf_formula')}</th><th>{t('kf_pages')}</th></tr></thead>
            <tbody>
              {kpis.map(([k, f, pages]) => (
                <tr key={k}>
                  <td style={{ fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{t(k)}</td>
                  <td><span className="kpi-formula" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}><span className="fx">ƒ</span><span>{f}</span></span></td>
                  <td><div className="chip-row">{pages.map(x => <span key={x} className="tag">{x}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { useLang } from '@/components/ui/I18n'
import { AiBand, Eyebrow, ExecutionTable, Formula, KpiF, Minibar, SectionHeader, WinLegend } from '@/components/ui/Primitives'
import { DoughnutChart, StackedChart } from '@/components/ui/Charts'
import { fmtRule } from '@/lib/ui/i18n'
import { monthlyTotals, quarterlyOutcomes } from '@/lib/ui/buckets'
import {
  CLIENT_CATEGORIES, PCT, PROJECT_TYPES, TENDER_TYPES, winColorVar, winStats, type Project, type Rules,
} from '@/lib/ui/model'

type Filters = { type: string; clientCategory: string; tenderType: string; risk: string }

export default function PipelineView({ projects, rules }: { projects: Project[]; rules: Rules }) {
  const { t, lang } = useLang()
  const [f, setF] = useState<Filters>({ type: 'all', clientCategory: 'all', tenderType: 'all', risk: 'all' })

  const filtered = useMemo(() => projects.filter(p =>
    (f.type === 'all' || p.type === f.type) &&
    (f.clientCategory === 'all' || p.clientCategory === f.clientCategory) &&
    (f.tenderType === 'all' || p.tenderType === f.tenderType) &&
    (f.risk === 'all' || p.riskIndex === f.risk)), [projects, f])

  const total = filtered.length
  const ws = winStats(filtered)
  const goCount = filtered.filter(p => p.decision === 'GO').length
  const reviewCount = filtered.filter(p => p.decision === 'REVIEW').length
  const nogoCount = filtered.filter(p => p.decision === 'NO GO').length
  const pctOf = (n: number) => `${total ? Math.round((n / total) * 100) : 0}% ${t('of_portfolio')}`

  const cities = [...new Set(filtered.map(p => p.location))]
    .map(c => ({ key: c, list: filtered.filter(p => p.location === c) }))
    .sort((a, b) => b.list.length - a.list.length).slice(0, 6)

  const select = (labelKey: string, key: keyof Filters, opts: string[]) => (
    <div>
      <label className="input-label">{t(labelKey)}</label>
      <select value={f[key]} onChange={e => setF(prev => ({ ...prev, [key]: e.target.value }))}>
        <option value="all">{t('all')}</option>
        {opts.map(o => <option key={o} value={o}>{t(o)}</option>)}
      </select>
    </div>
  )

  return (
    <div className="page">
      <SectionHeader kicker="ops_kicker" title="ops_title" em="ops_title_em" sub="ops_sub" />
      <AiBand url={`/api/ai/portfolio?lang=${lang}`} pick={j => j.callout} />

      <div className="card flat" style={{ marginBottom: 18, padding: '14px 16px' }}>
        <div className="grid grid-4" style={{ gap: 12 }}>
          {select('project_type', 'type', PROJECT_TYPES)}
          {select('client', 'clientCategory', CLIENT_CATEGORIES)}
          {select('tender_type', 'tenderType', TENDER_TYPES)}
          {select('risk_index', 'risk', ['LOW', 'MEDIUM', 'HIGH'])}
        </div>
      </div>

      <div className="grid grid-5" style={{ marginBottom: 18 }}>
        <KpiF label="total_bids" value={total} accent="ink"
          sub={`${ws.won} ${t('Won').toLowerCase()} · ${ws.lost} ${t('Lost').toLowerCase()}`}
          spark={monthlyTotals(projects)} formula={`${t('f_total')} = ${total}`} />
        <KpiF label="win_rate" value={PCT(ws.rate)} accent="blue" sub={t('target')} formula={`${t('f_win')} = ${ws.won} / ${ws.decided}`} />
        <KpiF label="go" value={goCount} accent="go" sub={pctOf(goCount)} formula={`${fmtRule(t, 'f_go', rules)} = ${goCount}`} />
        <KpiF label="review" value={reviewCount} accent="review" sub={pctOf(reviewCount)} formula={`${fmtRule(t, 'f_review', rules)} = ${reviewCount}`} />
        <KpiF label="nogo" value={nogoCount} accent="nogo" sub={pctOf(nogoCount)} formula={`${fmtRule(t, 'f_nogo', rules)} = ${nogoCount}`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <Eyebrow k="decision_mix" />
          <div className="card-title">{t('by_recommendation')}</div>
          <div className="donut-summary" style={{ marginTop: 16 }}>
            <DoughnutChart
              data={[
                { label: t('GO'), value: goCount, color: 'var(--go)' },
                { label: t('REVIEW'), value: reviewCount, color: 'var(--review)' },
                { label: t('NO GO'), value: nogoCount, color: 'var(--nogo)' },
              ].filter(d => d.value > 0)}
              center={
                <div>
                  <div className="display" style={{ fontSize: 28, lineHeight: 1 }}>{total}</div>
                  <div style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{t('total_bids')}</div>
                </div>
              }
            />
            <div className="donut-list">
              {[
                ['var(--go)', `${t('GO')} · ${fmtRule(t, 'f_go', rules)}`, goCount],
                ['var(--review)', t('REVIEW'), reviewCount],
                ['var(--nogo)', `${t('NO GO')} · ${fmtRule(t, 'f_nogo', rules)}`, nogoCount],
              ].map(([c, label, n]) => (
                <div key={String(label)} className="donut-list-item">
                  <span className="sw" style={{ background: String(c) }} /><span>{label}</span>
                  <span className="mono num" style={{ color: 'var(--ink)' }}>{n}</span>
                  <span className="pct">{Math.round((Number(n) / (total || 1)) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="row-spread">
            <div><Eyebrow k="monthly_outcomes" /><div className="card-title">{t('bids_over_time')}</div></div>
            <div className="tag">{t('quarterly')}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <StackedChart buckets={quarterlyOutcomes(filtered)} keys={['Won', 'Lost', 'Pending', 'Rejected']} height={230} />
          </div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        <div className="card">
          <Eyebrow k="risk_distribution" />
          <div className="card-title">{t('portfolio_risk_shape')}</div>
          <div style={{ marginTop: 14 }}>
            {([['LOW', 'var(--go)'], ['MEDIUM', 'var(--review)'], ['HIGH', 'var(--nogo)']] as const).map(([k, c]) => {
              const n = filtered.filter(p => p.riskIndex === k).length
              return <Minibar key={k} label={t(k)} value={n} max={total || 1} color={c} display={`${Math.round((n / (total || 1)) * 100)}%`} sub={t('n_bids', { n })} />
            })}
          </div>
          <div className="legend" style={{ marginTop: 12 }}>
            <span className="legend-item"><span className="legend-sw" style={{ background: 'var(--review)' }} />{t('commercial_flag')}: {filtered.filter(p => p.commercialFlag).length}</span>
          </div>
        </div>
        <WinByCard eyebrow="win_by_client" title="sector_dynamics" groups={CLIENT_CATEGORIES.map(c => ({ key: c, list: filtered.filter(p => p.clientCategory === c) }))} />
        <WinByCard eyebrow="top_locations" title="avg_win_by_city" groups={cities} />
      </div>

      <ExecutionTable projects={filtered} />
    </div>
  )
}

function WinByCard({ eyebrow, title, groups }: { eyebrow: string; title: string; groups: { key: string; list: Project[] }[] }) {
  const { t } = useLang()
  return (
    <div className="card">
      <Eyebrow k={eyebrow} />
      <div className="card-title">{t(title)}</div>
      <div style={{ marginTop: 14 }}>
        {groups.map(g => {
          const s = winStats(g.list)
          const v = Math.round(s.rate * 100)
          return <Minibar key={g.key} label={t(g.key)} value={v} max={100} color={winColorVar(v)} display={`${v}%`} sub={t('won_of', { w: s.won, d: s.decided })} target={45} />
        })}
        <WinLegend />
      </div>
      <Formula text={`${t('f_win')} · ${t('f_win_note')}`} style={{ marginTop: 10 }} />
    </div>
  )
}

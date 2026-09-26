'use client'

import { useLang } from '@/components/ui/I18n'
import { AiBand, Eyebrow, ExecutionTable, Formula, KpiF, ScoreGauge, SectionHeader } from '@/components/ui/Primitives'
import { BarChart, StackedChart, ValueTrackingChart } from '@/components/ui/Charts'
import { last12Months, quarterValues } from '@/lib/ui/buckets'
import { DECISIONS, SAR, decisionCls, fmtShort, meanScore, sumOf, winStats, type Project, type Rules } from '@/lib/ui/model'

export default function ExecutiveView({ projects, rules }: { projects: Project[]; rules: Rules }) {
  const { t, lang } = useLang()
  const won = projects.filter(p => p.outcome === 'Won')
  const ws = winStats(projects)
  const pipeline = sumOf(projects, 'estValue')
  const contract = sumOf(won, 'contractValue')
  const spend = sumOf(won, 'actualSpend')
  const quarters = quarterValues(projects)
  const months = last12Months(projects, lang)
  const wr = Math.round(ws.rate * 100)

  const decs = DECISIONS.map(d => { const sub = projects.filter(p => p.decision === d); return { d, n: sub.length, value: sumOf(sub, 'estValue') } })
  const tv = decs.reduce((s, x) => s + x.value, 0) || 1

  return (
    <div className="page">
      <SectionHeader kicker="ceo_kicker" title="ceo_title" em="ceo_title_em" sub="ceo_sub" />
      <AiBand url={`/api/ai/portfolio?lang=${lang}`} pick={j => j.callout} />

      <div className="grid grid-5" style={{ marginBottom: 18 }}>
        <KpiF label="total_bids" value={projects.length} accent="ink"
          sub={`${ws.won} ${t('Won').toLowerCase()} · ${projects.filter(p => p.outcome === 'Pending').length} ${t('Pending').toLowerCase()}`}
          formula={`${t('f_total')} = ${projects.length}`} />
        <KpiF label="win_rate" value={wr + '%'} accent={wr >= 45 ? 'go' : wr >= 30 ? 'review' : 'nogo'} sub={t('target')} formula={`${t('f_win')} = ${ws.won} / ${ws.decided}`} />
        <KpiF label="pipeline_value" value={SAR(pipeline, lang)} accent="blue" spark={quarters.map(q => q.est)} formula={t('f_pipeline')} />
        <KpiF label="contract_value" value={SAR(contract, lang)} accent="go" spark={quarters.map(q => q.contract)} formula={t('f_contract')} />
        <KpiF label="actual_spend" value={SAR(spend, lang)} accent="ink" spark={quarters.map(q => q.actual)}
          sub={contract ? `${Math.round((spend / contract) * 100)}% ${t('of')} ${t('contract').toLowerCase()}` : undefined} formula={t('f_spend')} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="row-spread" style={{ marginBottom: 12 }}>
            <div><Eyebrow k="value_tracking" /><div className="card-title">{t('estimated_contract_spend')}</div></div>
            <div className="tag">{t('quarterly')}</div>
          </div>
          <ValueTrackingChart buckets={quarters} height={330} />
        </div>
        <AvgScoreCard projects={projects} rules={rules} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="row-spread">
            <div><Eyebrow k="monthly_12" /><div className="card-title">{t('monthly_12_sub')}</div></div>
            <div className="tag">{t('n_bids', { n: months.reduce((s, m) => s + m.GO + m.REVIEW + m['NO GO'], 0) })}</div>
          </div>
          <div style={{ marginTop: 12 }}><StackedChart buckets={months} keys={['GO', 'REVIEW', 'NO GO']} height={250} /></div>
        </div>
        <div className="card">
          <Eyebrow k="value_by_decision" />
          <div className="card-title">{t('value_by_decision_sub')}</div>
          <div style={{ marginTop: 12 }}>
            <BarChart
              height={250}
              data={decs.map(x => ({ label: [t(x.d), t('n_bids', { n: x.n })], value: x.value, color: `var(--${decisionCls(x.d)})`, sub: t('n_bids', { n: x.n }) }))}
              format={v => `${(v / 1e6).toFixed(1)}M · ${Math.round((v / tv) * 100)}%`}
              yFormat={v => fmtShort(v)}
              tooltipFormat={v => SAR(v, lang)}
            />
          </div>
        </div>
      </div>

      <ExecutionTable projects={projects} />
    </div>
  )
}

function AvgScoreCard({ projects, rules }: { projects: Project[]; rules: Rules }) {
  const { t } = useLang()
  const avg = meanScore(projects)
  const color = avg >= rules.go ? 'var(--go)' : avg >= rules.review ? 'var(--review)' : 'var(--nogo)'
  const total = projects.length || 1
  return (
    <div className="card">
      <Eyebrow k="avg_bid_score" />
      <div className="card-title">{t('avg_bid_score_sub')}</div>
      <div className="gauge-wrap" dir="ltr">
        <ScoreGauge value={avg} rules={rules} />
        <div className="gauge-readout">
          <span className="gauge-val" style={{ color }}>{avg.toFixed(1)}</span>
          <span className="gauge-max">/135</span>
        </div>
      </div>
      <div className="grid grid-3" style={{ gap: 8, marginTop: 6 }}>
        {DECISIONS.map(d => {
          const sub = projects.filter(p => p.decision === d)
          return (
            <div key={d} className={`dec-tile ${decisionCls(d)}`}>
              <div className="dec-tile-label">{t(d)}</div>
              <div className="dec-tile-num">{sub.length}</div>
              <div className="dec-tile-meta">{Math.round((sub.length / total) * 100)}%<span> · {t('avg_short')} {sub.length ? meanScore(sub).toFixed(1) : '—'}</span></div>
            </div>
          )
        })}
      </div>
      <Formula text={`${t('f_avg_score')} = ${avg.toFixed(1)}`} style={{ marginTop: 12 }} />
    </div>
  )
}

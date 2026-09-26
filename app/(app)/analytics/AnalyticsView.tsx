'use client'

import { useLang } from '@/components/ui/I18n'
import { AiBand, Eyebrow, Formula, KpiF, SectionHeader, WinLegend } from '@/components/ui/Primitives'
import { BarChart } from '@/components/ui/Charts'
import { CLIENT_CATEGORIES, OUTCOMES, PCT, PROJECT_TYPES, TENDER_TYPES, meanScore, winStats, type Project } from '@/lib/ui/model'

export default function AnalyticsView({ projects }: { projects: Project[] }) {
  const { t, lang } = useLang()
  const total = projects.length
  const won = projects.filter(p => p.outcome === 'Won')
  const lost = projects.filter(p => p.outcome === 'Lost')
  const ws = winStats(projects)

  const series = (keys: readonly string[], prop: 'type' | 'clientCategory' | 'tenderType') => keys.map(k => {
    const s = winStats(projects.filter(p => p[prop] === k))
    const wonOf = t('won_of', { w: s.won, d: s.decided })
    return { label: [t(k), wonOf], value: s.rate * 100, sub: wonOf }
  })

  const chartCard = (kicker: string, data: ReturnType<typeof series>) => (
    <div className="card">
      <Eyebrow k={kicker} />
      <div className="card-title">{t('win_rate')}</div>
      <div style={{ marginTop: 12 }}><BarChart data={data} height={210} horizontal unit="%" target={45} colorByWin /></div>
      <WinLegend />
      <Formula text={`${t('f_win')} · ${t('f_win_note')}`} style={{ marginTop: 10 }} />
    </div>
  )

  return (
    <div className="page">
      <SectionHeader kicker="ana_kicker" title="ana_title" em="ana_title_em" sub="ana_sub" />
      <AiBand url={`/api/ai/portfolio?lang=${lang}`} pick={j => j.callout} />

      <div className="grid grid-5" style={{ marginBottom: 18 }}>
        <KpiF label="total_bids" value={total} accent="ink" formula={`${t('f_total')} = ${total}`} />
        <KpiF label="total_wins" value={won.length} accent="go" formula={`${t('f_wins')} = ${won.length}`} />
        <KpiF label="win_rate" value={PCT(ws.rate)} accent="blue" sub={t('target')} formula={`${t('f_win')} = ${ws.won} / ${ws.decided}`} />
        <KpiF label="avg_score_wins" value={meanScore(won).toFixed(1)} accent="go" unit="/135" formula={t('f_mean_won', { n: won.length })} />
        <KpiF label="avg_score_losses" value={meanScore(lost).toFixed(1)} accent="nogo" unit="/135" formula={t('f_mean_lost', { n: lost.length })} />
      </div>

      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        {chartCard('by_project_type', series(PROJECT_TYPES, 'type'))}
        {chartCard('by_client_sector', series(CLIENT_CATEGORIES, 'clientCategory'))}
        {chartCard('by_tender_type', series(TENDER_TYPES, 'tenderType'))}
      </div>

      <div className="card">
        <Eyebrow k="outcome_summary" />
        <div className="card-title">{t('detailed_counts')}</div>
        <div className="grid grid-4" style={{ marginTop: 14 }}>
          {(['Won', 'Lost', 'Pending', 'Rejected'] as const).filter(k => OUTCOMES.includes(k)).map(k => {
            const n = projects.filter(p => p.outcome === k).length
            return (
              <div key={k} className={`outcome-card ${k.toLowerCase()}`}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t(k)}</div>
                <div className="num">{n}</div>
                <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 4 }}>{total ? Math.round((n / total) * 100) : 0}% {t('of_portfolio')}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

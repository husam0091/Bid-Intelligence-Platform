import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { VBarChart, ScoreGauge, KpiFormula } from '@/components/charts/Charts'
import { winRate as calcWinRate, WIN_RATE_FORMULA, WIN_RATE_FORMULA_AR, EXECUTION_WHERE, fmtM } from '@/lib/metrics'
import { getScoringConfig } from '@/lib/scoring-config'
import { MAX_SCORE } from '@/lib/decision'

const DECISION_COLOR: Record<string, string> = {
  GO: 'var(--go)', REVIEW: 'var(--review)', NO_GO: 'var(--nogo)',
}

const SPEND_COLORS = { est: 'var(--ink-3)', contract: 'var(--data-blue)', actual: 'var(--review)' }

export default async function ExecutivePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const orgId = (session.user as any).orgId

  const ar = (await cookies()).get('lang')?.value === 'ar'

  const [allBids, execBids, scoring] = await Promise.all([
    prisma.bid.findMany({
      where: { orgId },
      select: { date: true, outcome: true, estValue: true, decision: true, totalScore: true, contractValue: true, actualSpend: true },
      orderBy: { date: 'asc' },
    }),
    prisma.bid.findMany({
      where: { orgId, ...EXECUTION_WHERE },
      select: {
        id: true, sr: true, name: true, consultant: true, type: true, decision: true, outcome: true,
        totalScore: true, expectWin: true, estValue: true, contractValue: true, actualSpend: true,
      },
      orderBy: { sr: 'asc' },
    }),
    getScoringConfig(orgId),
  ])

  const total     = allBids.length
  const wonBids   = allBids.filter(b => b.outcome === 'WON')
  const wonCount  = wonBids.length
  const lostCount = allBids.filter(b => b.outcome === 'LOST').length
  const winRate   = calcWinRate(wonCount, lostCount)
  const estTotal  = allBids.reduce((s, b) => s + b.estValue, 0)
  const conTotal  = wonBids.reduce((s, b) => s + b.contractValue, 0)
  const actTotal  = wonBids.reduce((s, b) => s + b.actualSpend, 0)
  const conFilled = wonBids.filter(b => b.contractValue > 0).length
  const actFilled = wonBids.filter(b => b.actualSpend > 0).length
  const avgScore  = total > 0 ? Math.round(allBids.reduce((s, b) => s + b.totalScore, 0) / total) : 0

  // Monthly bid count — last 12 months
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const count = allBids.filter(b => {
      const bd = new Date(b.date)
      return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth()
    }).length
    return {
      label: d.toLocaleDateString(ar ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'short' }),
      sub:   d.getMonth() === 0 || i === 0 ? String(d.getFullYear()) : undefined,
      value: count,
    }
  })

  // Value by decision — SAR M, share of total est. value, and bid count
  const decisionLabel = (d: string) => ar ? (d === 'GO' ? 'مقبول' : d === 'REVIEW' ? 'مراجعة' : 'مرفوض') : d.replace('_', ' ')
  const valueByDecision = (['GO', 'REVIEW', 'NO_GO'] as const).map(dec => {
    const rows  = allBids.filter(b => b.decision === dec)
    const value = rows.reduce((s, b) => s + b.estValue, 0)
    const pct   = estTotal > 0 ? Math.round((value / estTotal) * 100) : 0
    return {
      label:  decisionLabel(dec),
      value:  value / 1_000_000,
      top:    fmtM(value),
      topSub: `${pct}%`,
      sub:    ar ? `${rows.length} عطاء` : `${rows.length} bid${rows.length !== 1 ? 's' : ''}`,
      color:  DECISION_COLOR[dec],
    }
  })

  // Decision mix for the gauge card
  const decisionMix = (['GO', 'REVIEW', 'NO_GO'] as const).map(dec => {
    const rows = allBids.filter(b => b.decision === dec)
    return {
      dec, n: rows.length,
      pct: total > 0 ? Math.round((rows.length / total) * 100) : 0,
      avg: rows.length > 0 ? Math.round(rows.reduce((s, b) => s + b.totalScore, 0) / rows.length) : 0,
    }
  })

  // Spend comparison — top 6 projects in execution by estimated value
  const spendProjects = [...execBids].sort((a, b) => b.estValue - a.estValue).slice(0, 6)
  const spendMax = Math.max(...spendProjects.flatMap(p => [p.estValue, p.contractValue, p.actualSpend]), 1)

  const fo = (en: string, arText: string) => (ar ? arText : en)

  return (
    <>
      <Header title="Executive" titleAr="التنفيذي" />

      <div className="page-wrap">

        <div className="page-header">
          <div className="h-left">
            <div className="h-kicker"><span className="dash" />{ar ? '02 · التنفيذي' : '02 · Executive'}</div>
            <h1 className="h-title">{ar ? 'المحفظة' : 'Portfolio'} <em>{ar ? 'نظرة عامة' : 'Overview'}</em></h1>
            <p className="h-sub">{ar ? 'رؤية تنفيذية موحدة — قيم العقود ومعدل الفوز وقرارات خط الأنابيب وانكشاف المحفظة' : 'Consolidated executive view — contract values, win rate, pipeline decisions, and portfolio exposure.'}</p>
          </div>
        </div>

        {/* KPIs — each shows the formula it is calculated from */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 14 }}>
          <div className="card kpi">
            <span className="kpi-label">{fo('Total Bids', 'إجمالي العطاءات')}</span>
            <span className="kpi-value">{total}</span>
            <KpiFormula>{fo('Count of all bids', 'عدد جميع العطاءات')}</KpiFormula>
          </div>
          <div className={`card kpi ${winRate >= 45 ? 'accent-go' : 'accent-review'}`}>
            <span className="kpi-label">{fo('Win Rate', 'معدل الفوز')}</span>
            <span className={`kpi-value ${winRate >= 45 ? 'text-go' : 'text-review'}`}>{winRate}%</span>
            <KpiFormula>{ar ? WIN_RATE_FORMULA_AR : WIN_RATE_FORMULA} = {wonCount} / {wonCount + lostCount}</KpiFormula>
          </div>
          <div className="card kpi accent-blue">
            <span className="kpi-label">{fo('Est. Total (SAR)', 'الإجمالي التقديري (ريال)')}</span>
            <span className="kpi-value">{fmtM(estTotal)}</span>
            <KpiFormula>{fo(`Σ Est. Value · all ${total} bids`, `Σ القيمة التقديرية · ${total} عطاء`)}</KpiFormula>
          </div>
          <div className="card kpi">
            <span className="kpi-label">{fo('Contract (SAR)', 'العقود (ريال)')}</span>
            <span className="kpi-value">{fmtM(conTotal)}</span>
            <KpiFormula>
              {fo(`Σ Contract Value · won bids (${conFilled}/${wonCount} entered)`, `Σ قيمة العقد · العطاءات الفائزة (${conFilled}/${wonCount} مُدخلة)`)}
            </KpiFormula>
          </div>
          <div className="card kpi">
            <span className="kpi-label">{fo('Actual Spend (SAR)', 'الإنفاق الفعلي (ريال)')}</span>
            <span className="kpi-value">{fmtM(actTotal)}</span>
            <KpiFormula>
              {fo(`Σ Actual Spend · won bids (${actFilled}/${wonCount} entered)`, `Σ الإنفاق الفعلي · العطاءات الفائزة (${actFilled}/${wonCount} مُدخلة)`)}
            </KpiFormula>
          </div>
        </div>
        {wonCount > 0 && (conFilled < wonCount || actFilled < wonCount) && (
          <p style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--font-mono)', margin: '-4px 0 14px' }}>
            {fo(
              'ⓘ Contract and Actual Spend come from each won bid. Open a bid in Bid History → "Update Bid" to enter them.',
              'ⓘ تأتي قيم العقد والإنفاق الفعلي من كل عطاء فائز. افتح العطاء من سجل العطاءات ← "تحديث العطاء" لإدخالها.',
            )}
          </p>
        )}

        {/* Row 1: Spend comparison + Composite score */}
        <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>

          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 10, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{fo('Est. vs Contract vs Actual Spend (SAR)', 'التقديري مقابل العقد مقابل الفعلي (ريال)')}</span>
              <span style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>{fo('Top 6 in execution', 'أعلى 6 قيد التنفيذ')}</span>
            </div>
            {spendProjects.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--mute)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '32px 0' }}>
                {fo('No projects in execution', 'لا توجد مشاريع قيد التنفيذ')}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', marginBottom: 4 }}>
                  {[
                    { c: SPEND_COLORS.est, l: fo('Estimated', 'تقديري') },
                    { c: SPEND_COLORS.contract, l: fo('Contract', 'عقد') },
                    { c: SPEND_COLORS.actual, l: fo('Actual', 'فعلي') },
                  ].map(l => (
                    <span key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: l.c, display: 'inline-block' }} />{l.l}
                    </span>
                  ))}
                </div>
                {spendProjects.map(p => {
                  const burn = p.contractValue > 0 && p.actualSpend > 0 ? Math.round((p.actualSpend / p.contractValue) * 100) : null
                  const rows = [
                    { k: fo('Est.', 'تقديري'),  v: p.estValue,      c: SPEND_COLORS.est },
                    { k: fo('Contract', 'عقد'), v: p.contractValue, c: SPEND_COLORS.contract },
                    { k: fo('Actual', 'فعلي'),  v: p.actualSpend,   c: SPEND_COLORS.actual },
                  ]
                  return (
                    <div key={p.id} className="spend-row">
                      <div className="spend-row-head">
                        <Link href={`/bids/${p.id}`} className="spend-row-name" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                          #{p.sr} · {p.name}
                        </Link>
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: burn == null ? 'var(--mute)' : burn > 100 ? 'var(--nogo)' : 'var(--go)', flexShrink: 0 }}>
                          {burn == null ? (p.contractValue > 0 ? fo('no spend recorded', 'لا إنفاق مسجل') : fo('no contract yet', 'لا عقد بعد')) : `${fo('spent', 'المنفق')} ${burn}% ${fo('of contract', 'من العقد')}`}
                        </span>
                      </div>
                      {rows.map(r => (
                        <div key={r.k} className="spend-bar">
                          <span>{r.k}</span>
                          <div className="spend-bar-track">
                            <div className="spend-bar-fill" style={{ width: `${Math.round((r.v / spendMax) * 100)}%`, background: r.c }} />
                          </div>
                          <span className="spend-bar-val">{r.v > 0 ? fmtM(r.v) : '—'}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 6, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{fo('Composite Score', 'النقاط الإجمالية')}</span>
              <span style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>
                {fo(`Avg of ${total} bids · max ${MAX_SCORE}`, `متوسط ${total} عطاء · الحد الأقصى ${MAX_SCORE}`)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ScoreGauge
                score={avgScore}
                max={MAX_SCORE}
                reviewMin={scoring.reviewMin}
                goMin={scoring.goMin}
                label={fo('Portfolio Average Score', 'متوسط نقاط المحفظة')}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 8 }}>
              {decisionMix.map(m => (
                <div key={m.dec} style={{ borderTop: `3px solid ${DECISION_COLOR[m.dec]}`, background: 'var(--surface)', borderRadius: 4, padding: '8px 10px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: DECISION_COLOR[m.dec], fontWeight: 700, letterSpacing: '0.06em' }}>
                    {decisionLabel(m.dec)}
                  </div>
                  <div style={{ fontFamily: "'Archivo Narrow',sans-serif", fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
                    {m.n} <span style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 500 }}>· {m.pct}%</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--mute)' }}>
                    {fo(`avg score ${m.avg}/${MAX_SCORE}`, `متوسط ${m.avg}/${MAX_SCORE}`)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--mute)', marginTop: 10, textAlign: 'center' }}>
              GO ≥ {scoring.goMin} · REVIEW {scoring.reviewMin}–{scoring.goMin - 1} · NO GO &lt; {scoring.reviewMin}
            </div>
          </div>

        </div>

        {/* Row 2: Monthly trend (wide) + Value by decision (narrow) */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>

          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{fo('Monthly Bids (Last 12 Months)', 'العطاءات الشهرية (آخر 12 شهرًا)')}</span>
              <span style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>
                {fo(`${months.reduce((s, m) => s + m.value, 0)} bids in period`, `${months.reduce((s, m) => s + m.value, 0)} عطاء في الفترة`)}
              </span>
            </div>
            <VBarChart
              data={months.map(m => ({ label: m.label, sub: m.sub, value: m.value, color: 'var(--data-blue)' }))}
              width={720} height={130} maxBarW={40} gap={12}
            />
          </div>

          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{fo('Est. Value by Decision', 'القيمة التقديرية حسب القرار')}</span>
              <span style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>{fo('SAR · % of total', 'ريال · ٪ من الإجمالي')}</span>
            </div>
            <VBarChart data={valueByDecision} width={300} height={130} maxBarW={52} gap={18} />
          </div>

        </div>

        {/* Currently in Execution table — never NO GO / REJECTED / LOST */}
        <div className="card">
          <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 10 }}>
            <span className="card-eyebrow"><span className="eyebrow-dot" />{fo('Currently in Execution', 'قيد التنفيذ حالياً')}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>
              {fo(`${execBids.length} projects · Won or Pending · excludes NO GO & Rejected`, `${execBids.length} مشروع · فائز أو معلق · باستثناء المرفوض`)}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{fo('Project', 'المشروع')}</th>
                  <th>{fo('Consultant', 'الاستشاري')}</th>
                  <th>{fo('Type', 'النوع')}</th>
                  <th>{fo('Decision', 'القرار')}</th>
                  <th>{fo('Status', 'الحالة')}</th>
                  <th>{fo('Score', 'النقاط')}</th>
                  <th>{fo('Win%', '٪ الفوز')}</th>
                  <th>{fo('Est. SAR M', 'تقديري ريال م')}</th>
                  <th>{fo('Contract M', 'عقد م')}</th>
                  <th>{fo('Actual M', 'فعلي م')}</th>
                  <th>{fo('Variance', 'الفرق')}</th>
                </tr>
              </thead>
              <tbody>
                {execBids.map(b => {
                  const est      = b.estValue      / 1_000_000
                  const con      = b.contractValue / 1_000_000
                  const act      = b.actualSpend   / 1_000_000
                  const variance = act - con
                  const hasVar   = con > 0 && act > 0
                  return (
                    <tr key={b.id}>
                      <td className="mono" style={{ color: 'var(--mute)' }}>{b.sr}</td>
                      <td style={{ fontWeight: 500, maxWidth: 180 }}>
                        <Link href={`/bids/${b.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{b.name}</Link>
                      </td>
                      <td style={{ color: 'var(--mute)' }}>{b.consultant || '—'}</td>
                      <td style={{ color: 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{b.type}</td>
                      <td><span className={`pill pill-${b.decision === 'GO' ? 'go' : 'review'}`}>{decisionLabel(b.decision)}</span></td>
                      <td><span className={`pill ${b.outcome === 'WON' ? 'pill-go' : 'pill-pending'}`}>{b.outcome}</span></td>
                      <td className="mono" style={{ fontWeight: 700 }}>{b.totalScore}<span style={{ color: 'var(--mute)', fontWeight: 400 }}>/{MAX_SCORE}</span></td>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--go)' }}>{Math.round(b.expectWin * 100)}%</td>
                      <td className="mono">{est.toFixed(1)}</td>
                      <td className="mono">{con ? con.toFixed(1) : '—'}</td>
                      <td className="mono">{act ? act.toFixed(1) : '—'}</td>
                      <td className="mono" style={{ color: !hasVar ? 'var(--mute)' : variance > 0 ? 'var(--nogo)' : variance < 0 ? 'var(--go)' : 'var(--mute)', fontWeight: 700 }}>
                        {hasVar ? `${variance > 0 ? '+' : ''}${variance.toFixed(1)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
                {execBids.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', color: 'var(--mute)', padding: '24px 0', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      {fo('No projects in execution', 'لا توجد مشاريع قيد التنفيذ')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}

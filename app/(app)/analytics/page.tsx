import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Header } from '@/components/layout/Header'
import { VBarChart, KpiFormula } from '@/components/charts/Charts'
import { winRate as calcWinRate, WIN_RATE_FORMULA, WIN_RATE_FORMULA_AR } from '@/lib/metrics'

// Distinct categorical colours so every bar is identifiable at a glance.
const CAT_COLORS = ['var(--data-blue)', 'var(--review)', 'var(--go)', '#7A5C9E', '#2E8B8B', 'var(--nogo)']

function HBar({ label, value, max, color = '#1B2B1E', subtitle }: {
  label: string; value: number; max: number; color?: string; subtitle?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          {subtitle && <span style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>{subtitle}</span>}
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 7, background: '#E8E4DC', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const orgId = (session.user as any).orgId

  const ar = (await cookies()).get('lang')?.value === 'ar'

  const allBids = await prisma.bid.findMany({
    where: { orgId },
    select: {
      location: true, type: true, tenderType: true, clientCategory: true,
      decision: true, outcome: true, totalScore: true, date: true, estValue: true, riskIndex: true,
    },
    orderBy: { date: 'asc' },
  })

  const total   = allBids.length
  const won     = allBids.filter(b => b.outcome === 'WON').length
  const lost    = allBids.filter(b => b.outcome === 'LOST').length
  const winRate = calcWinRate(won, lost)

  // Win rate by location
  const locMap: Record<string, { total: number; won: number; closed: number }> = {}
  allBids.forEach(b => {
    if (!locMap[b.location]) locMap[b.location] = { total: 0, won: 0, closed: 0 }
    locMap[b.location].total++
    if (b.outcome === 'WON') { locMap[b.location].won++; locMap[b.location].closed++ }
    if (b.outcome === 'LOST') locMap[b.location].closed++
  })
  const byLocation = Object.entries(locMap)
    .map(([loc, v]) => ({ loc, ...v, wr: calcWinRate(v.won, v.closed - v.won) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Win rate by type
  const typeMap: Record<string, { total: number; won: number; closed: number }> = {}
  allBids.forEach(b => {
    if (!typeMap[b.type]) typeMap[b.type] = { total: 0, won: 0, closed: 0 }
    typeMap[b.type].total++
    if (b.outcome === 'WON') { typeMap[b.type].won++; typeMap[b.type].closed++ }
    if (b.outcome === 'LOST') typeMap[b.type].closed++
  })
  const byType = Object.entries(typeMap)
    .map(([type, v]) => ({ type, ...v, wr: calcWinRate(v.won, v.closed - v.won) }))
    .sort((a, b) => b.total - a.total)

  // Score distribution (buckets: <50, 50-59, 60-74, 75-89, 90+)
  const buckets = [
    { label: '<50',   min: 0,  max: 49,  color: '#A8362A' },
    { label: '50–59', min: 50, max: 59,  color: '#C85A4A' },
    { label: '60–74', min: 60, max: 74,  color: '#B07A1B' },
    { label: '75–89', min: 75, max: 89,  color: '#2E7D32' },
    { label: '90+',   min: 90, max: 999, color: '#1F6E45' },
  ]
  const scoreDistribution = buckets.map(b => ({
    label: b.label,
    value: allBids.filter(bid => bid.totalScore >= b.min && bid.totalScore <= b.max).length,
    color: b.color,
  }))

  // Monthly trend (last 12 months)
  const now = new Date()
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const bidsM = allBids.filter(b => {
      const bd = new Date(b.date)
      return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth()
    })
    const wonM  = bidsM.filter(b => b.outcome === 'WON').length
    return { label, value: bidsM.length, won: wonM, color: '#1B2B1E' }
  })

  // Decision by type table
  const decisionByType = byType.map(t => {
    const typeBids = allBids.filter(b => b.type === t.type)
    return {
      type:   t.type,
      total:  t.total,
      go:     typeBids.filter(b => b.decision === 'GO').length,
      review: typeBids.filter(b => b.decision === 'REVIEW').length,
      nogo:   typeBids.filter(b => b.decision === 'NO_GO').length,
      wr:     t.wr,
    }
  })

  // Average score for wins vs losses
  const wonBids  = allBids.filter(b => b.outcome === 'WON')
  const lostBids = allBids.filter(b => b.outcome === 'LOST')
  const avgScoreWins  = wonBids.length  > 0 ? Math.round(wonBids.reduce((s, b)  => s + b.totalScore, 0) / wonBids.length)  : 0
  const avgScoreLoss  = lostBids.length > 0 ? Math.round(lostBids.reduce((s, b) => s + b.totalScore, 0) / lostBids.length) : 0

  // Win rate by client category
  const catMap: Record<string, { total: number; won: number; closed: number }> = {}
  allBids.forEach(b => {
    const cat = b.clientCategory
    if (!catMap[cat]) catMap[cat] = { total: 0, won: 0, closed: 0 }
    catMap[cat].total++
    if (b.outcome === 'WON')  { catMap[cat].won++;  catMap[cat].closed++ }
    if (b.outcome === 'LOST')   catMap[cat].closed++
  })
  const byCategory = Object.entries(catMap)
    .map(([cat, v]) => ({ cat, ...v, wr: calcWinRate(v.won, v.closed - v.won) }))
    .sort((a, b) => b.total - a.total)

  // Win rate by tender type
  const tendMap: Record<string, { total: number; won: number; closed: number }> = {}
  allBids.forEach(b => {
    const t = b.tenderType
    if (!tendMap[t]) tendMap[t] = { total: 0, won: 0, closed: 0 }
    tendMap[t].total++
    if (b.outcome === 'WON')  { tendMap[t].won++;  tendMap[t].closed++ }
    if (b.outcome === 'LOST')   tendMap[t].closed++
  })
  const byTender = Object.entries(tendMap)
    .map(([t, v]) => ({ t, ...v, wr: calcWinRate(v.won, v.closed - v.won) }))
    .sort((a, b) => b.total - a.total)

  // Outcome counts
  const pendingCount  = allBids.filter(b => b.outcome === 'PENDING').length
  const rejectedCount = allBids.filter(b => b.outcome === 'REJECTED').length

  // Category label helper
  function catLabel(cat: string) {
    if (cat === 'GOV')     return ar ? 'حكومي'       : 'Government'
    if (cat === 'PRIVATE') return ar ? 'خاص'          : 'Private'
    return ar ? 'شبه حكومي' : 'Semi-Gov'
  }

  // Type label helper
  function typeLabel(t: string) {
    const lower = t.charAt(0) + t.slice(1).toLowerCase()
    if (t === 'BUILDING')       return ar ? 'مباني'       : lower
    if (t === 'INFRASTRUCTURE') return ar ? 'بنية تحتية'  : lower
    if (t === 'INDUSTRIAL')     return ar ? 'صناعي'       : lower
    return lower
  }

  // Tender type label helper
  function tenderLabel(t: string) {
    const lower = t.charAt(0) + t.slice(1).toLowerCase()
    if (t === 'OPEN')       return ar ? 'مفتوح'    : lower
    if (t === 'LIMITED')    return ar ? 'محدود'    : lower
    if (t === 'NEGOTIATED') return ar ? 'تفاوضي'   : lower
    return lower
  }

  return (
    <>
      <Header title="Analytics" titleAr="التحليلات" />

      <div className="page-wrap">

        <div className="page-header">
          <div className="h-left">
            <div className="h-kicker"><span className="dash" />{ar ? '06 · الذكاء' : '06 · Intelligence'}</div>
            <h1 className="h-title">{ar ? 'أداء' : 'Performance'} <em>{ar ? 'المحفظة' : 'Analytics'}</em></h1>
            <p className="h-sub">{ar ? 'تحليل معدل الفوز عبر نوع المشروع وقطاع العميل وهيكل المناقصة' : 'Cut win rate across project type, client sector, and tender structure.'}</p>
          </div>
        </div>

        {/* Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { label: ar ? 'إجمالي العطاءات' : 'Total Bids',         value: total,           accent: '' },
            { label: ar ? 'إجمالي المكاسب'  : 'Total Wins',         value: won,             accent: 'accent-go' },
            { label: ar ? 'معدل الفوز'      : 'Win Rate',           value: `${winRate}%`,   accent: winRate >= 45 ? 'accent-go' : 'accent-review',
              sub: `${ar ? WIN_RATE_FORMULA_AR : WIN_RATE_FORMULA} = ${won} / ${won + lost} · ${ar ? 'الهدف ≥ ٤٥٪' : 'target ≥ 45%'}` },
            { label: ar ? 'متوسط النقاط · المكاسب'  : 'Avg Score · Wins',   value: avgScoreWins,    accent: '', unit: '/135', sub: ar ? `متوسط ${wonBids.length} عطاء فائز` : `mean of ${wonBids.length} won bids` },
            { label: ar ? 'متوسط النقاط · الخسائر'  : 'Avg Score · Losses', value: avgScoreLoss,    accent: '', unit: '/135', sub: ar ? `متوسط ${lostBids.length} عطاء خاسر` : `mean of ${lostBids.length} lost bids` },
          ].map((k: { label: string; value: string | number; accent: string; sub?: string; unit?: string }) => (
            <div key={k.label} className={`card kpi ${k.accent}`}>
              <span className="kpi-label">{k.label}</span>
              <span className={`kpi-value${k.accent === 'accent-go' ? ' text-go' : k.accent === 'accent-review' ? ' text-review' : ''}`}>
                {k.value}{k.unit && <span className="kpi-unit">{k.unit}</span>}
              </span>
              {k.sub && <KpiFormula>{k.sub}</KpiFormula>}
            </div>
          ))}
        </div>

        {/* 3-column win-rate charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>

          {/* By Project Type */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'حسب نوع المشروع' : 'By Project Type'}</span>
            </div>
            <div style={{ fontFamily:"'Archivo Narrow',sans-serif", fontWeight:700, fontSize:15, marginBottom:12 }}>{ar ? 'معدل الفوز (٪)' : 'WIN RATE (%)'}</div>
            <VBarChart
              data={byType.map((t, i) => ({ label: typeLabel(t.type), value: t.wr, top: `${t.wr}%`, sub: ar ? `${t.won}/${t.closed} فوز` : `${t.won}/${t.closed} won`, color: CAT_COLORS[i % CAT_COLORS.length] }))}
              width={300} height={110} max={100} maxBarW={48} gap={20}
            />
          </div>

          {/* By Client Sector */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'حسب قطاع العميل' : 'By Client Sector'}</span>
            </div>
            <div style={{ fontFamily:"'Archivo Narrow',sans-serif", fontWeight:700, fontSize:15, marginBottom:12 }}>{ar ? 'معدل الفوز (٪)' : 'WIN RATE (%)'}</div>
            <VBarChart
              data={byCategory.map((t, i) => ({ label: catLabel(t.cat), value: t.wr, top: `${t.wr}%`, sub: ar ? `${t.won}/${t.closed} فوز` : `${t.won}/${t.closed} won`, color: CAT_COLORS[i % CAT_COLORS.length] }))}
              width={300} height={110} max={100} maxBarW={48} gap={20}
            />
          </div>

          {/* By Tender Type */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'حسب نوع المناقصة' : 'By Tender Type'}</span>
            </div>
            <div style={{ fontFamily:"'Archivo Narrow',sans-serif", fontWeight:700, fontSize:15, marginBottom:12 }}>{ar ? 'معدل الفوز (٪)' : 'WIN RATE (%)'}</div>
            <VBarChart
              data={byTender.map((t, i) => ({ label: tenderLabel(t.t), value: t.wr, top: `${t.wr}%`, sub: ar ? `${t.won}/${t.closed} فوز` : `${t.won}/${t.closed} won`, color: CAT_COLORS[i % CAT_COLORS.length] }))}
              width={300} height={110} max={100} maxBarW={48} gap={20}
            />
          </div>

        </div>

        {/* Outcome summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { label: ar ? 'فائز'   : 'Won',      value: won,            accent: 'accent-go' },
            { label: ar ? 'خسارة'  : 'Lost',     value: lostBids.length, accent: 'accent-nogo' },
            { label: ar ? 'معلق'   : 'Pending',  value: pendingCount,    accent: '' },
            { label: ar ? 'مرفوض'  : 'Rejected', value: rejectedCount,   accent: '' },
          ].map(k => (
            <div key={k.label} className={`card kpi ${k.accent}`}>
              <span className="card-eyebrow" style={{ marginBottom:8 }}><span className="eyebrow-dot" />{k.label}</span>
              <span className={`kpi-value${k.accent === 'accent-go' ? ' text-go' : k.accent === 'accent-nogo' ? ' text-nogo' : ''}`}>{k.value}</span>
              <span style={{ fontSize:10, color:'var(--mute)', fontFamily:"'JetBrains Mono',monospace", marginTop:4 }}>
                {total > 0 ? Math.round((k.value / total) * 100) : 0}{ar ? '٪ من المحفظة' : '% of portfolio'}
              </span>
            </div>
          ))}
        </div>

        {/* Decision breakdown by type */}
        <div className="card">
          <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 10 }}>
            <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'توزيع القرارات حسب نوع المشروع' : 'Decision Breakdown by Project Type'}</span>
          </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'الإجمالي' : 'Total'}</th>
                    <th>{ar ? 'مقبول' : 'GO'}</th>
                    <th>{ar ? 'مراجعة' : 'REVIEW'}</th>
                    <th>{ar ? 'مرفوض' : 'NO GO'}</th>
                    <th>{ar ? 'معدل الفوز' : 'Win Rate'}</th>
                    <th style={{ width: 140 }}>{ar ? 'نسبة المقبول' : 'GO Ratio'}</th>
                  </tr>
                </thead>
                <tbody>
                  {decisionByType.map(row => (
                    <tr key={row.type}>
                      <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{typeLabel(row.type)}</td>
                      <td className="mono">{row.total}</td>
                      <td><span className="mono" style={{ color: '#1F6E45', fontWeight: 700 }}>{row.go}</span></td>
                      <td><span className="mono" style={{ color: '#B07A1B', fontWeight: 700 }}>{row.review}</span></td>
                      <td><span className="mono" style={{ color: '#A8362A', fontWeight: 700 }}>{row.nogo}</span></td>
                      <td>
                        <span style={{ color: row.wr >= 45 ? 'var(--go)' : row.wr >= 30 ? 'var(--review)' : 'var(--nogo)', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                          {row.wr}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 5, background: '#E8E4DC', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${row.total > 0 ? Math.round((row.go / row.total) * 100) : 0}%`, height: '100%', background: '#1F6E45', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", width: 28, textAlign: 'right' }}>
                            {row.total > 0 ? Math.round((row.go / row.total) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {decisionByType.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#6E6A62', padding: '24px 0', fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                        {ar ? 'لا توجد بيانات بعد' : 'No data yet'}
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

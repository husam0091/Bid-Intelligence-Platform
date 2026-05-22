import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { cookies } from 'next/headers'

function DonutChart({ segments, ar }: { segments: { label: string; value: number; color: string }[]; ar: boolean }) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1
  const R = 44; const cx = 60; const cy = 60; const stroke = 16
  let cumulative = 0

  function arc(pct: number, startPct: number) {
    if (pct <= 0) return ''
    if (pct >= 1) pct = 0.9999
    const s = startPct * 2 * Math.PI - Math.PI / 2
    const e = (startPct + pct) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + R * Math.cos(s)
    const y1 = cy + R * Math.sin(s)
    const x2 = cx + R * Math.cos(e)
    const y2 = cy + R * Math.sin(e)
    return `M ${x1} ${y1} A ${R} ${R} 0 ${pct > 0.5 ? 1 : 0} 1 ${x2} ${y2}`
  }

  return (
    <svg viewBox="0 0 120 120" style={{ width: 110, height: 110, flexShrink: 0 }}>
      {segments.map(seg => {
        const pct   = seg.value / total
        const start = cumulative
        cumulative += pct
        const d = arc(pct, start)
        if (!d) return null
        return <path key={seg.label} d={d} fill="none" stroke={seg.color} strokeWidth={stroke} />
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={18} fontWeight="800" fill="#1B2B1E" fontFamily="'Archivo Narrow',sans-serif">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#6E6A62" fontFamily="'JetBrains Mono',monospace">{ar ? 'الإجمالي' : 'TOTAL'}</text>
    </svg>
  )
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const ar = cookieStore.get('lang')?.value === 'ar'

  const orgId = (session.user as any).orgId

  const [total, goCount, reviewCount, nogoCount, highRisk, lowRisk, medRisk, wonCount, closedCount, allBids, pendingBids] =
    await Promise.all([
      prisma.bid.count({ where: { orgId } }),
      prisma.bid.count({ where: { orgId, decision: 'GO' } }),
      prisma.bid.count({ where: { orgId, decision: 'REVIEW' } }),
      prisma.bid.count({ where: { orgId, decision: 'NO_GO' } }),
      prisma.bid.count({ where: { orgId, riskIndex: 'HIGH' } }),
      prisma.bid.count({ where: { orgId, riskIndex: 'LOW' } }),
      prisma.bid.count({ where: { orgId, riskIndex: 'MEDIUM' } }),
      prisma.bid.count({ where: { orgId, outcome: 'WON' } }),
      prisma.bid.count({ where: { orgId, outcome: { in: ['WON', 'LOST'] } } }),
      prisma.bid.findMany({
        where:   { orgId },
        orderBy: { date: 'asc' },
        select:  { location: true, decision: true, outcome: true, date: true, clientCategory: true },
      }),
      prisma.bid.findMany({
        where:   { orgId, outcome: 'PENDING' },
        orderBy: { date: 'desc' },
        take:    10,
        select:  { id: true, sr: true, name: true, location: true, type: true, decision: true, riskIndex: true, expectWin: true, estValue: true, date: true, totalScore: true },
      }),
    ])

  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0

  // Monthly bid counts — last 6 months, stacked by decision
  const now = new Date()
  const months: { label: string; go: number; review: number; nogo: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const mb = allBids.filter(b => {
      const bd = new Date(b.date)
      return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth()
    })
    months.push({ label, go: mb.filter(b => b.decision === 'GO').length, review: mb.filter(b => b.decision === 'REVIEW').length, nogo: mb.filter(b => b.decision === 'NO_GO').length })
  }
  const maxBar = Math.max(...months.map(m => m.go + m.review + m.nogo), 1)

  // Win dynamics by client category
  const catMap: Record<string, { total: number; won: number }> = { GOV: {total:0,won:0}, PRIVATE: {total:0,won:0}, SEMI: {total:0,won:0} }
  allBids.forEach(b => {
    const cat = b.clientCategory ?? 'GOV'
    if (!catMap[cat]) catMap[cat] = { total: 0, won: 0 }
    catMap[cat].total++
    if (b.outcome === 'WON') catMap[cat].won++
  })
  const catLabels: Record<string, string> = { GOV: 'Government', PRIVATE: 'Private', SEMI: 'Semi-Gov' }
  const winDynamics = Object.entries(catMap).map(([cat, v]) => ({
    label: catLabels[cat] ?? cat,
    total: v.total,
    won:   v.won,
    wr:    v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
  }))

  // Bids by city — top 6
  const cityMap: Record<string, number> = {}
  allBids.forEach(b => { cityMap[b.location] = (cityMap[b.location] ?? 0) + 1 })
  const topCities = Object.entries(cityMap)
    .map(([city, n]) => ({ city, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
  const maxCity = Math.max(...topCities.map(c => c.n), 1)

  function decisionClass(d: string) {
    if (d === 'GO')     return 'pill pill-go'
    if (d === 'REVIEW') return 'pill pill-review'
    return 'pill pill-nogo'
  }

  function riskColor(r: string) {
    if (r === 'LOW')    return '#1F6E45'
    if (r === 'MEDIUM') return '#B07A1B'
    return '#A8362A'
  }

  // Bar chart dimensions
  const barW = 50; const barGap = 20; const pitch = barW + barGap
  const chartH = 80; const labelH = 18

  return (
    <>
      <Header title="Operations Dashboard" titleAr="لوحة العمليات" />

      <div className="page-wrap">
        {/* Page header */}
        <div className="page-header">
          <div className="h-left">
            <div className="h-kicker"><span className="dash" />{ar ? '01 · العمليات' : '01 · Operations'}</div>
            <h1 className="h-title">{ar ? 'خط الأنابيب' : 'Pipeline'} <em>{ar ? 'القيادة' : 'Command'}</em></h1>
            <p className="h-sub">{ar ? 'نظرة حية على جميع العطاءات — القرارات والمخاطر ومعدل الفوز في محفظتك' : 'Live overview of all bids — decisions, risk exposure, and win performance across your portfolio.'}</p>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { label: ar ? 'إجمالي المشاريع' : 'Total Projects', value: total,         accent: '' },
            { label: ar ? 'معدل الفوز' : 'Win Rate',            value: `${winRate}%`, accent: winRate >= 60 ? 'accent-go' : 'accent-review' },
            { label: ar ? 'مقبول' : 'GO',                       value: goCount,        accent: 'accent-go' },
            { label: ar ? 'مراجعة' : 'REVIEW',                  value: reviewCount,    accent: 'accent-review' },
            { label: ar ? 'مخاطر عالية' : 'High Risk',          value: highRisk,       accent: highRisk > 0 ? 'accent-nogo' : '' },
          ].map(k => (
            <div key={k.label} className={`card kpi ${k.accent}`}>
              <span className="kpi-label">{k.label}</span>
              <span className={`kpi-value${k.accent === 'accent-go' ? ' text-go' : k.accent === 'accent-review' ? ' text-review' : k.accent === 'accent-nogo' ? ' text-nogo' : ''}`}>
                {k.value}
              </span>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>

          {/* By Recommendation — donut */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'حسب التوصية' : 'By Recommendation'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart ar={ar} segments={[
                { label: 'GO',     value: goCount,     color: '#1F6E45' },
                { label: 'REVIEW', value: reviewCount, color: '#B07A1B' },
                { label: 'NO GO',  value: nogoCount,   color: '#A8362A' },
              ]} />
              <div style={{ flex: 1 }}>
                {[
                  { label: 'GO',     value: goCount,     color: '#1F6E45' },
                  { label: 'REVIEW', value: reviewCount, color: '#B07A1B' },
                  { label: 'NO GO',  value: nogoCount,   color: '#A8362A' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, flex: 1 }}>{s.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13 }}>{s.value}</span>
                    <span style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", width: 34, textAlign: 'right' }}>
                      {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bids Over Time — stacked bar */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'العطاءات بمرور الوقت' : 'Bids Over Time'}</span>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: 'var(--mute)' }}>
                {[['#1F6E45','GO'],['#B07A1B','REVIEW'],['#A8362A','NO GO']].map(([c,l]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 1, background: c, display: 'inline-block' }} />{l}
                  </span>
                ))}
              </div>
            </div>
            <svg viewBox={`0 0 ${6 * pitch} ${chartH + labelH}`} style={{ width: '100%', maxHeight: 180, overflow: 'visible' }}>
              {months.map((m, i) => {
                const x      = i * pitch
                const goH    = Math.round((m.go     / maxBar) * chartH)
                const revH   = Math.round((m.review / maxBar) * chartH)
                const nogoH  = Math.round((m.nogo   / maxBar) * chartH)
                const tot    = m.go + m.review + m.nogo
                const base   = chartH
                return (
                  <g key={m.label}>
                    {nogoH > 0 && <rect x={x} y={base - nogoH}              width={barW} height={nogoH} fill="#A8362A" rx={1} opacity={0.85} />}
                    {revH  > 0 && <rect x={x} y={base - nogoH - revH}       width={barW} height={revH}  fill="#B07A1B" rx={1} opacity={0.85} />}
                    {goH   > 0 && <rect x={x} y={base - nogoH - revH - goH} width={barW} height={goH}   fill="#1F6E45" rx={1} opacity={0.85} />}
                    <text x={x + barW/2} y={base + 13} textAnchor="middle" fontSize={9} fill="#6E6A62" fontFamily="'JetBrains Mono',monospace">{m.label}</text>
                    {tot > 0 && <text x={x + barW/2} y={base - nogoH - revH - goH - 3} textAnchor="middle" fontSize={9} fill="#1B2B1E" fontWeight="700" fontFamily="'JetBrains Mono',monospace">{tot}</text>}
                  </g>
                )
              })}
            </svg>
          </div>

        </div>

        {/* 3-column: Portfolio by Shape · Win Dynamics · Bids by City */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* Portfolio by Shape */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 8 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'المحفظة حسب الشكل' : 'Portfolio by Shape'}</span>
            </div>
            {[
              { label: 'LOW',    value: lowRisk,  color: '#1F6E45' },
              { label: 'MEDIUM', value: medRisk,  color: '#B07A1B' },
              { label: 'HIGH',   value: highRisk, color: '#A8362A' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: row.color, fontWeight: 700, width: 50, flexShrink: 0 }}>{row.label}</span>
                <div style={{ flex: 1, height: 5, background: '#E8E4DC', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${total > 0 ? Math.round((row.value / total) * 100) : 0}%`, height: '100%', background: row.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, width: 22, textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Win Dynamics */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 8 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'ديناميكيات الفوز' : 'Win Dynamics'}</span>
            </div>
            {winDynamics.map(row => (
              <div key={row.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--ink-2)' }}>{row.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: row.wr >= 60 ? '#1F6E45' : row.wr >= 40 ? '#B07A1B' : '#A8362A' }}>{row.wr}%</span>
                </div>
                <div style={{ height: 5, background: '#E8E4DC', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${row.wr}%`, height: '100%', background: row.wr >= 60 ? '#1F6E45' : row.wr >= 40 ? '#B07A1B' : '#A8362A', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Bids by City */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 8 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'العطاءات حسب المدينة' : 'Bids by City'}</span>
            </div>
            {topCities.map(row => (
              <div key={row.city} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: 'var(--ink-2)', width: 76, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.city}</span>
                <div style={{ flex: 1, height: 5, background: '#E8E4DC', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((row.n / maxCity) * 100)}%`, height: '100%', background: '#1B2B1E', borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 12, width: 18, textAlign: 'right' }}>{row.n}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Currently in Execution */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'قيد التنفيذ حالياً' : 'Currently in Execution'}</span>
            <span className="breadcrumb">{ar ? 'معلق' : 'Pending'} · {pendingBids.length} bid{pendingBids.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>{ar ? 'المشروع' : 'Project'}</th>
                  <th>{ar ? 'الموقع' : 'Location'}</th>
                  <th>{ar ? 'النوع' : 'Type'}</th>
                  <th>{ar ? 'القرار' : 'Decision'}</th>
                  <th>{ar ? 'المخاطر' : 'Risk'}</th>
                  <th style={{ width: 55 }}>{ar ? '٪ الفوز' : 'Win %'}</th>
                  <th style={{ width: 50 }}>{ar ? 'النقاط' : 'Score'}</th>
                  <th>{ar ? 'القيمة التقديرية (ريال)' : 'Est. Value (SAR)'}</th>
                  <th>{ar ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {pendingBids.map(bid => (
                  <tr key={bid.id}>
                    <td className="mono" style={{ color: '#6E6A62' }}>{bid.sr}</td>
                    <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bid.name}</td>
                    <td style={{ fontSize: 12 }}>{bid.location}</td>
                    <td style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>{bid.type}</td>
                    <td><span className={decisionClass(bid.decision)}>{bid.decision.replace('_', ' ')}</span></td>
                    <td><span className="mono" style={{ color: riskColor(bid.riskIndex), fontWeight: 600, fontSize: 11 }}>{bid.riskIndex}</span></td>
                    <td className="mono">{Math.round(bid.expectWin * 100)}%</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{bid.totalScore}</td>
                    <td className="mono" style={{ color: '#6E6A62', fontSize: 12 }}>{bid.estValue.toLocaleString()}</td>
                    <td className="mono" style={{ color: '#6E6A62', fontSize: 11 }}>{new Date(bid.date).toLocaleDateString('en-SA')}</td>
                  </tr>
                ))}
                {pendingBids.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: '#6E6A62', padding: '32px 0', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                      {ar ? 'لا توجد عطاءات قيد التنفيذ' : 'No pending bids in execution'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>{/* /page-wrap */}
    </>
  )
}

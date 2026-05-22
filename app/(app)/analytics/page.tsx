import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'

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

function VBarChart({ data, height = 110 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max  = Math.max(...data.map(d => d.value), 1)
  const W    = 520; const H = height; const padB = 20
  const barW = data.length > 0 ? Math.floor((W - (data.length - 1) * 6) / data.length) : 40

  return (
    <svg viewBox={`0 0 ${W} ${H + padB}`} style={{ width: '100%', overflow: 'visible' }}>
      {data.map((d, i) => {
        const barH  = Math.max(2, Math.round((d.value / max) * H))
        const x     = i * (barW + 6)
        const y     = H - barH
        const color = d.color ?? '#1B2B1E'
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={2} opacity={0.85} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={9} fill="#6E6A62" fontFamily="'JetBrains Mono',monospace">
              {d.label}
            </text>
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill={color} fontFamily="'JetBrains Mono',monospace" fontWeight="700">
                {d.value}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const orgId = (session.user as any).orgId

  const allBids = await prisma.bid.findMany({
    where: { orgId },
    select: {
      location: true, type: true, tenderType: true, clientCategory: true,
      decision: true, outcome: true, totalScore: true, date: true, estValue: true, riskIndex: true,
    },
    orderBy: { date: 'asc' },
  })

  const total   = allBids.length
  const closed  = allBids.filter(b => b.outcome === 'WON' || b.outcome === 'LOST').length
  const won     = allBids.filter(b => b.outcome === 'WON').length
  const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0

  // Win rate by location
  const locMap: Record<string, { total: number; won: number; closed: number }> = {}
  allBids.forEach(b => {
    if (!locMap[b.location]) locMap[b.location] = { total: 0, won: 0, closed: 0 }
    locMap[b.location].total++
    if (b.outcome === 'WON') { locMap[b.location].won++; locMap[b.location].closed++ }
    if (b.outcome === 'LOST') locMap[b.location].closed++
  })
  const byLocation = Object.entries(locMap)
    .map(([loc, v]) => ({ loc, ...v, wr: v.closed > 0 ? Math.round((v.won / v.closed) * 100) : 0 }))
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
    .map(([type, v]) => ({ type, ...v, wr: v.closed > 0 ? Math.round((v.won / v.closed) * 100) : 0 }))
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
    .map(([cat, v]) => ({ cat, ...v, wr: v.closed > 0 ? Math.round((v.won / v.closed) * 100) : 0 }))
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
    .map(([t, v]) => ({ t, ...v, wr: v.closed > 0 ? Math.round((v.won / v.closed) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)

  // Outcome counts
  const pendingCount  = allBids.filter(b => b.outcome === 'PENDING').length
  const rejectedCount = allBids.filter(b => b.outcome === 'REJECTED').length

  return (
    <>
      <Header title="Analytics" titleAr="التحليلات" />

      <div className="page-content">

        {/* Page title block */}
        <div className="h-block">
          <div className="h-kicker"><span className="h-dash" />06 · Intelligence</div>
          <h1 className="h-title">Performance <em>Analytics</em></h1>
          <p className="h-sub">Cut win rate across project type, client sector, and tender structure.</p>
        </div>

        {/* Summary KPIs — matching prototype: Total Bids / Total Wins / Win Rate / Avg Score Wins / Avg Score Losses */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { label: 'Total Bids',       value: total,           accent: '' },
            { label: 'Total Wins',        value: won,             accent: 'accent-go' },
            { label: 'Win Rate',          value: `${winRate}%`,   accent: winRate >= 60 ? 'accent-go' : 'accent-review', sub: 'target ≥ 45%' },
            { label: 'Avg Score · Wins',  value: avgScoreWins,    accent: '' },
            { label: 'Avg Score · Losses',value: avgScoreLoss,    accent: '' },
          ].map(k => (
            <div key={k.label} className={`kpi-card ${k.accent}`}>
              <span className="kpi-label">{k.label}</span>
              <span className={`kpi-value${k.accent === 'accent-go' ? ' text-go' : k.accent === 'accent-review' ? ' text-review' : ''}`}>{k.value}</span>
              {k.sub && <span style={{ fontSize:10, color:'var(--mute)', fontFamily:"'JetBrains Mono',monospace", marginTop:4 }}>{k.sub}</span>}
            </div>
          ))}
        </div>

        {/* 3-column win-rate charts — matching prototype exactly */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>

          {/* By Project Type */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />By Project Type</span>
            </div>
            <div style={{ fontFamily:"'Archivo Narrow',sans-serif", fontWeight:700, fontSize:15, marginBottom:12 }}>WIN RATE</div>
            <VBarChart
              data={byType.map(t => ({ label: t.type.charAt(0) + t.type.slice(1).toLowerCase(), value: t.wr, color: 'var(--ink)' }))}
              height={90}
            />
          </div>

          {/* By Client Sector */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />By Client Sector</span>
            </div>
            <div style={{ fontFamily:"'Archivo Narrow',sans-serif", fontWeight:700, fontSize:15, marginBottom:12 }}>WIN RATE</div>
            <VBarChart
              data={byCategory.map(c => ({ label: c.cat === 'GOV' ? 'Government' : c.cat === 'PRIVATE' ? 'Private' : 'Semi-Gov', value: c.wr, color: 'var(--data-blue)' }))}
              height={90}
            />
          </div>

          {/* By Tender Type */}
          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />By Tender Type</span>
            </div>
            <div style={{ fontFamily:"'Archivo Narrow',sans-serif", fontWeight:700, fontSize:15, marginBottom:12 }}>WIN RATE</div>
            <VBarChart
              data={byTender.map(t => ({ label: t.t.charAt(0) + t.t.slice(1).toLowerCase(), value: t.wr, color: 'var(--go)' }))}
              height={90}
            />
          </div>

        </div>

        {/* Outcome summary cards — with colored accent stripes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { label: 'Won',      value: won,           accent: 'accent-go' },
            { label: 'Lost',     value: lostBids.length,accent: 'accent-nogo' },
            { label: 'Pending',  value: pendingCount,   accent: '' },
            { label: 'Rejected', value: rejectedCount,  accent: '' },
          ].map(k => (
            <div key={k.label} className={`kpi-card ${k.accent}`}>
              <span className="card-eyebrow" style={{ marginBottom:8 }}><span className="eyebrow-dot" />{k.label}</span>
              <span className={`kpi-value${k.accent === 'accent-go' ? ' text-go' : k.accent === 'accent-nogo' ? ' text-nogo' : ''}`}>{k.value}</span>
              <span style={{ fontSize:10, color:'var(--mute)', fontFamily:"'JetBrains Mono',monospace", marginTop:4 }}>
                {total > 0 ? Math.round((k.value / total) * 100) : 0}% of portfolio
              </span>
            </div>
          ))}
        </div>

        {/* Decision breakdown by type */}
        <div className="card">
          <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 10 }}>
            <span className="card-eyebrow"><span className="eyebrow-dot" />Decision Breakdown by Project Type</span>
          </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Total</th>
                    <th>GO</th>
                    <th>REVIEW</th>
                    <th>NO GO</th>
                    <th>Win Rate</th>
                    <th style={{ width: 140 }}>GO Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {decisionByType.map(row => (
                    <tr key={row.type}>
                      <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{row.type}</td>
                      <td className="mono">{row.total}</td>
                      <td><span className="mono" style={{ color: '#1F6E45', fontWeight: 700 }}>{row.go}</span></td>
                      <td><span className="mono" style={{ color: '#B07A1B', fontWeight: 700 }}>{row.review}</span></td>
                      <td><span className="mono" style={{ color: '#A8362A', fontWeight: 700 }}>{row.nogo}</span></td>
                      <td>
                        <span style={{ color: row.wr >= 60 ? '#1F6E45' : row.wr >= 40 ? '#B07A1B' : '#A8362A', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
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
                        No data yet
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

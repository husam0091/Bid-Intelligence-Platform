import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Header } from '@/components/layout/Header'

function BarChart({ data, height = 120 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 480
  const H = height
  const barW = Math.floor((W - (data.length - 1) * 8) / data.length)
  const padB = 20
  return (
    <svg viewBox={`0 0 ${W} ${H + padB}`} style={{ width: '100%', overflow: 'visible' }}>
      {data.map((d, i) => {
        const barH  = Math.max(2, Math.round((d.value / max) * H))
        const x     = i * (barW + 8)
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

// Grouped bar chart: 3 bars per project (est / contract / actual spend)
function GroupedSpendChart({ projects, legendEst, legendContract, legendActual, emptyLabel }: {
  projects: { label: string; est: number; contract: number; actual: number }[]
  legendEst: string
  legendContract: string
  legendActual: string
  emptyLabel: string
}) {
  if (projects.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#6E6A62', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", padding: '32px 0' }}>
        {emptyLabel}
      </div>
    )
  }
  const maxVal = Math.max(...projects.flatMap(p => [p.est, p.contract, p.actual]), 1)
  const W = 520; const H = 130; const padB = 36
  const groupW = Math.floor((W - (projects.length - 1) * 12) / projects.length)
  const barW   = Math.max(8, Math.floor((groupW - 4) / 3))
  const gap    = 2
  const colors = { est: '#1B2B1E', contract: '#4A7C59', actual: '#B07A1B' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 8, justifyContent: 'flex-end' }}>
        {[{ k: 'est', label: legendEst }, { k: 'contract', label: legendContract }, { k: 'actual', label: legendActual }].map(l => (
          <div key={l.k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[l.k as keyof typeof colors] }} />
            <span style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>{l.label}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H + padB}`} style={{ width: '100%', overflow: 'visible' }}>
        {projects.map((p, i) => {
          const gx = i * (groupW + 12)
          const bars = [
            { val: p.est,      color: colors.est      },
            { val: p.contract, color: colors.contract  },
            { val: p.actual,   color: colors.actual    },
          ]
          return (
            <g key={p.label}>
              {bars.map((b, j) => {
                const barH = Math.max(2, Math.round((b.val / maxVal) * H))
                const bx   = gx + j * (barW + gap)
                const by   = H - barH
                return <rect key={j} x={bx} y={by} width={barW} height={barH} fill={b.color} rx={2} opacity={0.85} />
              })}
              <text
                x={gx + (barW * 1.5 + gap)}
                y={H + 14}
                textAnchor="middle"
                fontSize={8}
                fill="#6E6A62"
                fontFamily="'JetBrains Mono',monospace"
              >
                {p.label.length > 10 ? p.label.slice(0, 9) + '…' : p.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Semicircle composite score gauge
function ScoreGauge({ score, max = 135 }: { score: number; max?: number }) {
  const pct    = Math.min(score / max, 1)
  const cx     = 90; const cy = 85; const R = 65; const stroke = 14
  const color  = pct >= 0.67 ? '#1F6E45' : pct >= 0.56 ? '#B07A1B' : '#A8362A'

  // Semicircle: from 180° to 0° (left to right across top)
  function semiArc(fraction: number) {
    const startAngle = Math.PI         // 180°
    const endAngle   = Math.PI - fraction * Math.PI
    const x1 = cx + R * Math.cos(startAngle)
    const y1 = cy + R * Math.sin(startAngle)
    const x2 = cx + R * Math.cos(endAngle)
    const y2 = cy + R * Math.sin(endAngle)
    const lg = fraction > 0.5 ? 1 : 0
    return `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2}`
  }

  return (
    <svg viewBox="0 0 180 100" style={{ width: '100%', maxWidth: 220 }}>
      {/* Background track */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="#E8E4DC" strokeWidth={stroke} />
      {/* Filled arc */}
      {pct > 0 && <path d={semiArc(pct)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />}
      {/* Score text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={26} fontWeight="800" fill="#1B2B1E" fontFamily="'Archivo Narrow',sans-serif">
        {score}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={9} fill="#6E6A62" fontFamily="'JetBrains Mono',monospace">
        / {max}
      </text>
      {/* Min / Max labels */}
      <text x={cx - R - 2} y={cy + 16} textAnchor="middle" fontSize={8} fill="#6E6A62" fontFamily="'JetBrains Mono',monospace">0</text>
      <text x={cx + R + 2} y={cy + 16} textAnchor="middle" fontSize={8} fill="#6E6A62" fontFamily="'JetBrains Mono',monospace">{max}</text>
    </svg>
  )
}

const DECISION_COLOR: Record<string, string> = {
  GO: '#1F6E45', REVIEW: '#B07A1B', NO_GO: '#A8362A',
}

export default async function ExecutivePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const orgId = (session.user as any).orgId

  const ar = (await cookies()).get('lang')?.value === 'ar'

  const [
    total, wonCount, lostCount, pendingCount,
    allBids, pendingBids,
  ] = await Promise.all([
    prisma.bid.count({ where: { orgId } }),
    prisma.bid.count({ where: { orgId, outcome: 'WON' } }),
    prisma.bid.count({ where: { orgId, outcome: 'LOST' } }),
    prisma.bid.count({ where: { orgId, outcome: 'PENDING' } }),
    prisma.bid.findMany({
      where: { orgId },
      select: { date: true, outcome: true, estValue: true, decision: true, totalScore: true, contractValue: true, actualSpend: true },
      orderBy: { date: 'asc' },
    }),
    prisma.bid.findMany({
      where: { orgId, outcome: 'PENDING' },
      select: {
        sr: true,
        name: true,
        consultant: true,
        type: true,
        decision: true,
        totalScore: true,
        expectWin: true,
        estValue: true,
        contractValue: true,
        actualSpend: true,
      },
      orderBy: { sr: 'asc' },
    }),
  ])

  const closed    = wonCount + lostCount
  const winRate   = closed > 0 ? Math.round((wonCount / closed) * 100) : 0
  const estTotal  = Math.round(allBids.reduce((s, b) => s + b.estValue, 0) / 1_000_000)
  const conTotal  = Math.round(allBids.reduce((s, b) => s + b.contractValue, 0) / 1_000_000)
  const actTotal  = Math.round(allBids.reduce((s, b) => s + b.actualSpend, 0) / 1_000_000)
  const avgScore  = allBids.length > 0
    ? Math.round(allBids.reduce((s, b) => s + b.totalScore, 0) / allBids.length)
    : 0

  // Monthly bid count (last 6 months)
  const now = new Date()
  const months: { label: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const count = allBids.filter(b => {
      const bd = new Date(b.date)
      return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth()
    }).length
    months.push({ label, total: count })
  }

  // Grouped spend chart: top 6 pending bids by estValue
  const topPending = pendingBids.slice(0, 6)
  const spendProjects = topPending.map(b => ({
    label:    b.name,
    est:      Math.round(b.estValue      / 1_000_000),
    contract: Math.round(b.contractValue / 1_000_000),
    actual:   Math.round(b.actualSpend   / 1_000_000),
  }))

  // Value by decision bar
  const valueByDecision = ['GO', 'REVIEW', 'NO_GO'].map(dec => ({
    label: dec.replace('_', ' '),
    value: Math.round(allBids.filter(b => b.decision === dec).reduce((s, b) => s + b.estValue, 0) / 1_000_000),
    color: DECISION_COLOR[dec],
  }))

  return (
    <>
      <Header title="Executive" titleAr="التنفيذي" />

      <div className="page-wrap">

        <div className="page-header">
          <div className="h-left">
            <div className="h-kicker"><span className="dash" />{ar ? '02 · التنفيذي' : '02 · Executive'}</div>
            <h1 className="h-title">{ar ? 'محفظة' : 'Portfolio'} <em>{ar ? 'شاملة' : 'At-a-Glance'}</em></h1>
            <p className="h-sub">{ar ? 'رؤية تنفيذية موحدة — قيم العقود ومعدل الفوز وقرارات خط الأنابيب وانكشاف المحفظة' : 'Consolidated executive view — contract values, win rate, pipeline decisions, and portfolio exposure.'}</p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { label: ar ? 'إجمالي العطاءات'       : 'Total Bids',        value: total,          accent: '' },
            { label: ar ? 'معدل الفوز'             : 'Win Rate',          value: `${winRate}%`,  accent: winRate >= 60 ? 'accent-go' : 'accent-review' },
            { label: ar ? 'الإجمالي التقديري (م)'  : 'Est. Total (M)',    value: `${estTotal}M`, accent: 'accent-blue' },
            { label: ar ? 'العقد (م)'              : 'Contract (M)',      value: `${conTotal}M`, accent: '' },
            { label: ar ? 'الإنفاق الفعلي (م)'     : 'Actual Spend (M)',  value: `${actTotal}M`, accent: '' },
          ].map(k => (
            <div key={k.label} className={`card kpi ${k.accent}`}>
              <span className="kpi-label">{k.label}</span>
              <span className={`kpi-value${k.accent === 'accent-go' ? ' text-go' : k.accent === 'accent-review' ? ' text-review' : ''}`}>{k.value}</span>
            </div>
          ))}
        </div>

        {/* Row 1: Grouped Spend Chart + Composite Score Gauge */}
        <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>

          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'التقديري مقابل العقد مقابل الفعلي (ريال م)' : 'Est. vs Contract vs Actual Spend (SAR M)'}</span>
            </div>
            <GroupedSpendChart
              projects={spendProjects}
              legendEst={ar ? 'تقديري' : 'Estimated'}
              legendContract={ar ? 'عقد' : 'Contract'}
              legendActual={ar ? 'فعلي' : 'Actual'}
              emptyLabel={ar ? 'لا توجد مشاريع نشطة' : 'No active projects'}
            />
          </div>

          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'النقاط الإجمالية' : 'Composite Score'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
              <ScoreGauge score={avgScore} max={135} />
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <div style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
                  {ar ? 'متوسط نقاط المحفظة' : 'Portfolio Average Score'}
                </div>
                <div style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                  {ar ? `${allBids.length} عطاءات · الحد الأقصى 135` : `${allBids.length} bids · max 135`}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Row 2: Monthly Trend + Value by Decision */}
        <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>

          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'العطاءات الشهرية (آخر 6 أشهر)' : 'Monthly Bids (Last 6 Mo)'}</span>
            </div>
            <BarChart data={months.map(m => ({ label: m.label, value: m.total, color: '#1B2B1E' }))} height={100} />
          </div>

          <div className="card">
            <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
              <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'القيمة التقديرية حسب القرار (ريال م)' : 'Est. Value by Decision (SAR M)'}</span>
            </div>
            <BarChart data={valueByDecision} height={100} />
          </div>

        </div>

        {/* Currently in Execution table */}
        <div className="card">
          <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 10 }}>
            <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'قيد التنفيذ حالياً' : 'Currently in Execution'}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
              {ar ? `${pendingCount} معلق` : `${pendingCount} pending`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{ar ? 'المشروع' : 'Project'}</th>
                  <th>{ar ? 'المقاول' : 'Contractor'}</th>
                  <th>{ar ? 'النوع' : 'Type'}</th>
                  <th>{ar ? 'القرار' : 'Decision'}</th>
                  <th>{ar ? 'النقاط' : 'Score'}</th>
                  <th>{ar ? '٪ الفوز' : 'Win%'}</th>
                  <th>{ar ? 'تقديري ريال م' : 'Est. SAR M'}</th>
                  <th>{ar ? 'عقد م' : 'Contract M'}</th>
                  <th>{ar ? 'فعلي م' : 'Actual M'}</th>
                  <th>{ar ? 'الفرق' : 'Variance'}</th>
                </tr>
              </thead>
              <tbody>
                {pendingBids.map((b, idx) => {
                  const est      = b.estValue      / 1_000_000
                  const con      = b.contractValue / 1_000_000
                  const act      = b.actualSpend   / 1_000_000
                  const variance = act - con
                  const decColor = DECISION_COLOR[b.decision] ?? '#6E6A62'
                  return (
                    <tr key={b.sr}>
                      <td className="mono" style={{ color: '#6E6A62' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500, maxWidth: 180 }}>{b.name}</td>
                      <td style={{ color: '#6E6A62' }}>{b.consultant || '—'}</td>
                      <td style={{ color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{b.type}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: 3,
                          fontSize: 10,
                          fontFamily: "'JetBrains Mono',monospace",
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          color: decColor,
                          background: `${decColor}18`,
                          border: `1px solid ${decColor}40`,
                        }}>
                          {b.decision.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="mono" style={{ fontWeight: 700 }}>{b.totalScore}</td>
                      <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: '#1F6E45' }}>
                        {Math.round(b.expectWin * 100)}%
                      </td>
                      <td className="mono">{est.toFixed(1)}</td>
                      <td className="mono">{con.toFixed(1)}</td>
                      <td className="mono">{act.toFixed(1)}</td>
                      <td className="mono" style={{ color: variance > 0 ? '#A8362A' : variance < 0 ? '#1F6E45' : '#6E6A62', fontWeight: 700 }}>
                        {variance > 0 ? '+' : ''}{variance.toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
                {pendingBids.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', color: '#6E6A62', padding: '24px 0', fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                      {ar ? 'لا توجد عطاءات معلقة' : 'No pending bids'}
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

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import BidSelector from './BidSelector'

const OUTCOME_COLOR: Record<string, string> = {
  WON:      '#1F6E45',
  LOST:     '#A8362A',
  PENDING:  '#1B5483',
  REJECTED: '#6E6A62',
}

const DECISION_COLOR: Record<string, string> = {
  GO:     '#1F6E45',
  REVIEW: '#B07A1B',
  NO_GO:  '#A8362A',
}

// Horizontal comparison bar
function CompareBar({ label, score, max = 135, color, highlight = false }: {
  label: string; score: number; max?: number; color: string; highlight?: boolean
}) {
  const pct = Math.min(100, Math.round((score / max) * 100))
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: highlight ? 700 : 400, color: highlight ? color : '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
          {label}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 12, color }}>
          {score}
        </span>
      </div>
      <div style={{ height: 8, background: '#E8E4DC', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// Score distribution SVG chart — all bids as vertical bars, colored by outcome
function ScoreDistribution({ bids, selectedId }: {
  bids: { id: string; totalScore: number; outcome: string; name: string }[]
  selectedId?: string
}) {
  if (bids.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#6E6A62', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", padding: '24px 0' }}>
        No bid data
      </div>
    )
  }

  const sorted = [...bids].sort((a, b) => b.totalScore - a.totalScore)
  const W   = 480
  const H   = 100
  const padB = 20
  const barW = Math.max(4, Math.floor((W - (sorted.length - 1) * 2) / sorted.length))
  const gap  = 2

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8, justifyContent: 'flex-end' }}>
        {Object.entries(OUTCOME_COLOR).map(([outcome, color]) => (
          <div key={outcome} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>{outcome}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H + padB}`} style={{ width: '100%', overflow: 'visible' }}>
        {sorted.map((b, i) => {
          const barH   = Math.max(3, Math.round((b.totalScore / 135) * H))
          const x      = i * (barW + gap)
          const y      = H - barH
          const color  = OUTCOME_COLOR[b.outcome] ?? '#6E6A62'
          const isSelected = b.id === selectedId
          return (
            <g key={b.id}>
              <rect
                x={x} y={y}
                width={barW} height={barH}
                fill={color}
                rx={1}
                opacity={isSelected ? 1 : 0.65}
                stroke={isSelected ? '#1B2B1E' : 'none'}
                strokeWidth={isSelected ? 1.5 : 0}
              />
              {isSelected && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={8} fill="#1B2B1E" fontFamily="'JetBrains Mono',monospace" fontWeight="700">
                  {b.totalScore}
                </text>
              )}
            </g>
          )
        })}
        {/* Score bands */}
        {[90, 75, 60].map(band => {
          const bandY = H - Math.round((band / 135) * H)
          return (
            <line key={band} x1={0} y1={bandY} x2={W} y2={bandY} stroke="#D9D4C4" strokeWidth={0.5} strokeDasharray="3,3" />
          )
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 4 }}>
        {[{ label: '≥90 GO', y: 90 }, { label: '75 GO', y: 75 }, { label: '60 REVIEW', y: 60 }].map(b => (
          <span key={b.label} style={{ fontSize: 9, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>{b.label}</span>
        ))}
      </div>
    </div>
  )
}

export default async function PredictorPage({
  searchParams,
}: {
  searchParams: { id?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const orgId = (session.user as any).orgId

  const allBids = await prisma.bid.findMany({
    where: { orgId },
    select: {
      id: true, sr: true, name: true, type: true,
      totalScore: true, decision: true, outcome: true, expectWin: true,
      location: true, clientCategory: true, estValue: true, date: true,
    },
    orderBy: { sr: 'asc' },
  })

  const selectedId  = searchParams.id
  const selectedBid = selectedId ? allBids.find(b => b.id === selectedId) ?? null : null

  // Historical averages
  const wonBids  = allBids.filter(b => b.outcome === 'WON')
  const lostBids = allBids.filter(b => b.outcome === 'LOST')
  const wonAvg   = wonBids.length  > 0 ? Math.round(wonBids.reduce((s, b)  => s + b.totalScore, 0) / wonBids.length)  : 0
  const lostAvg  = lostBids.length > 0 ? Math.round(lostBids.reduce((s, b) => s + b.totalScore, 0) / lostBids.length) : 0

  // Comparable past projects (same type as selected, top 4, excluding selected itself)
  const comparables = selectedBid
    ? allBids.filter(b => b.type === selectedBid.type && b.id !== selectedId).slice(0, 4)
    : []

  const decisionColor = selectedBid ? (DECISION_COLOR[selectedBid.decision] ?? '#6E6A62') : '#6E6A62'
  const decisionClass = selectedBid
    ? (selectedBid.decision === 'GO' ? 'go' : selectedBid.decision === 'REVIEW' ? 'review' : 'nogo')
    : 'nogo'

  return (
    <>
      <Header title="Win Predictor" titleAr="توقع الفوز" />

      <div className="page-wrap">

        <div className="page-header">
          <div className="h-left">
            <div className="h-kicker"><span className="dash" />05 · Intelligence</div>
            <h1 className="h-title">Win <em>Predictor</em></h1>
            <p className="h-sub">Benchmark this project against historical wins and losses. Surface comparable past bids.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

          {/* ── LEFT column ── */}
          <div>

            {/* Project selector */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <span className="card-eyebrow"><span className="eyebrow-dot" />Project</span>
              </div>
              <BidSelector
                bids={allBids.map(b => ({ id: b.id, sr: b.sr, name: b.name }))}
                selectedId={selectedId}
              />
            </div>

            {/* Score + verdict */}
            {selectedBid ? (
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                  <div style={{
                    fontFamily: "'Archivo Narrow',sans-serif",
                    fontWeight: 800,
                    fontSize: 88,
                    lineHeight: 1,
                    color: decisionColor,
                    letterSpacing: '-0.03em',
                  }}>
                    {selectedBid.totalScore}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#6E6A62', marginBottom: 14 }}>
                    / 135 points
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span className={`pill pill-${decisionClass}`} style={{ fontSize: 14, padding: '5px 18px' }}>
                      {selectedBid.decision.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 800, fontSize: 40, color: decisionColor, lineHeight: 1 }}>
                    {Math.round(selectedBid.expectWin * 100)}%
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#6E6A62', letterSpacing: '0.14em', marginBottom: 16 }}>
                    WIN PROBABILITY
                  </div>
                </div>

                {/* AI Summary placeholder */}
                <div style={{ padding: '12px 14px', background: '#F4F1E8', borderRadius: 5, borderLeft: `3px solid ${decisionColor}` }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#6E6A62', letterSpacing: '0.14em', marginBottom: 6 }}>
                    AI SUMMARY
                  </div>
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: '#3A3630', margin: 0 }}>
                    <strong>{selectedBid.name}</strong> scores {selectedBid.totalScore}/135 with a{' '}
                    <strong style={{ color: decisionColor }}>{selectedBid.decision.replace('_', ' ')}</strong> recommendation
                    and {Math.round(selectedBid.expectWin * 100)}% estimated win probability.
                    {wonAvg > 0 && selectedBid.totalScore >= wonAvg
                      ? ' Score is at or above the portfolio won-bid average.'
                      : wonAvg > 0
                        ? ` Score is ${wonAvg - selectedBid.totalScore} points below the won-bid average of ${wonAvg}.`
                        : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#6E6A62' }}>
                <div style={{ fontSize: 32, fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, marginBottom: 8 }}>—</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em' }}>
                  SELECT A PROJECT ABOVE
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT column ── */}
          <div>

            {/* Historical averages */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <span className="card-eyebrow"><span className="eyebrow-dot" />Score Benchmarks</span>
              </div>
              <CompareBar label={`Won Average (${wonBids.length} bids)`}   score={wonAvg}  color="#1F6E45" />
              <CompareBar label={`Lost Average (${lostBids.length} bids)`} score={lostAvg} color="#A8362A" />
              {selectedBid && (
                <CompareBar
                  label="This Project"
                  score={selectedBid.totalScore}
                  color={decisionColor}
                  highlight
                />
              )}
              {!selectedBid && (
                <div style={{ height: 32, background: '#F4F1E8', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
                  <span style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
                    — select a project to compare —
                  </span>
                </div>
              )}
            </div>

            {/* Comparable past projects */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 10 }}>
                <span className="card-eyebrow"><span className="eyebrow-dot" />Comparable Past Projects</span>
                <span style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
                  {selectedBid ? `Same type · top ${comparables.length}` : 'Select a project'}
                </span>
              </div>
              {comparables.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {comparables.map(b => {
                    const dColor = DECISION_COLOR[b.decision] ?? '#6E6A62'
                    return (
                      <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 12px', background: '#F4F1E8',
                        borderRadius: 5, borderLeft: `3px solid ${dColor}`,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                          <div style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                            {b.location} · SAR {(b.estValue / 1_000_000).toFixed(1)}M
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 800, fontSize: 20, color: dColor, lineHeight: 1 }}>{b.totalScore}</div>
                          <div style={{ fontSize: 9, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>/135</div>
                        </div>
                        <span style={{
                          fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0,
                          color: OUTCOME_COLOR[b.outcome] ?? '#6E6A62',
                          letterSpacing: '0.06em',
                        }}>
                          {b.outcome}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#6E6A62', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", padding: '20px 0' }}>
                  {selectedBid ? 'No comparable bids found' : '—'}
                </div>
              )}
            </div>

            {/* Score distribution chart */}
            <div className="card">
              <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <span className="card-eyebrow"><span className="eyebrow-dot" />Score Distribution</span>
                <span style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>{allBids.length} bids</span>
              </div>
              <ScoreDistribution
                bids={allBids.map(b => ({ id: b.id, totalScore: b.totalScore, outcome: b.outcome, name: b.name }))}
                selectedId={selectedId}
              />
            </div>

          </div>

        </div>

      </div>
    </>
  )
}

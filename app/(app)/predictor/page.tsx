import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Header } from '@/components/layout/Header'
import BidSelector from './BidSelector'
import { getScoringConfig } from '@/lib/scoring-config'
import { MAX_SCORE } from '@/lib/decision'

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

// Score distribution — histogram of all bids in 5-point bins, stacked by outcome.
// Fixed number of bins, so it always fits the card no matter how many bids exist.
function ScoreDistribution({ bids, selectedScore, reviewMin, goMin, ar }: {
  bids: { totalScore: number; outcome: string }[]
  selectedScore?: number
  reviewMin: number
  goMin: number
  ar: boolean
}) {
  if (bids.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--mute)', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", padding: '24px 0' }}>
        {ar ? 'لا توجد بيانات' : 'No bid data'}
      </div>
    )
  }

  const BIN = 5
  const nBins = Math.ceil((MAX_SCORE + 1) / BIN)            // 0–4, 5–9, … 135
  const outcomes = ['WON', 'LOST', 'PENDING', 'REJECTED'] as const
  const bins = Array.from({ length: nBins }, () => ({ WON: 0, LOST: 0, PENDING: 0, REJECTED: 0 } as Record<string, number>))
  bids.forEach(b => { const i = Math.min(nBins - 1, Math.floor(Math.max(0, b.totalScore) / BIN)); bins[i][b.outcome] = (bins[i][b.outcome] ?? 0) + 1 })
  const maxBin = Math.max(...bins.map(b => outcomes.reduce((s, o) => s + b[o], 0)), 1)

  const W = 480; const H = 110; const padT = 14; const padB = 22
  const slot = W / nBins
  const barW = slot - 2
  const xFor = (score: number) => (score / (nBins * BIN)) * W

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8, justifyContent: 'flex-end' }}>
        {Object.entries(OUTCOME_COLOR).map(([outcome, color]) => (
          <div key={outcome} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: 'var(--mute)', fontFamily: "'JetBrains Mono',monospace" }}>{outcome}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${padT + H + padB}`} style={{ width: '100%', display: 'block' }} role="img">
        {/* Decision zones */}
        <rect x={0} y={padT} width={xFor(reviewMin)} height={H} style={{ fill: 'var(--nogo-tint)' }} />
        <rect x={xFor(reviewMin)} y={padT} width={xFor(goMin) - xFor(reviewMin)} height={H} style={{ fill: 'var(--review-tint)' }} />
        <rect x={xFor(goMin)} y={padT} width={W - xFor(goMin)} height={H} style={{ fill: 'var(--go-tint)' }} />
        {bins.map((b, i) => {
          let y = padT + H
          return (
            <g key={i}>
              <title>{`${i * BIN}–${i * BIN + BIN - 1}: ${outcomes.map(o => `${o} ${b[o]}`).join(', ')}`}</title>
              {outcomes.map(o => {
                if (!b[o]) return null
                const h = (b[o] / maxBin) * H
                y -= h
                return <rect key={o} x={i * slot + 1} y={y} width={barW} height={h} fill={OUTCOME_COLOR[o]} opacity={0.8} />
              })}
            </g>
          )
        })}
        {[reviewMin, goMin].map(t => (
          <line key={t} x1={xFor(t)} x2={xFor(t)} y1={padT} y2={padT + H} style={{ stroke: 'var(--mute-2)' }} strokeWidth={0.75} strokeDasharray="3,3" />
        ))}
        {selectedScore != null && (
          <g>
            <line x1={xFor(selectedScore)} x2={xFor(selectedScore)} y1={padT - 4} y2={padT + H} style={{ stroke: 'var(--ink)' }} strokeWidth={2} />
            <text x={Math.min(W - 20, Math.max(20, xFor(selectedScore)))} y={padT - 6} textAnchor="middle" fontSize={9} fontWeight={700} fontFamily="'JetBrains Mono',monospace" style={{ fill: 'var(--ink)' }}>
              {ar ? 'هذا' : 'This'} · {selectedScore}
            </text>
          </g>
        )}
        {[0, reviewMin, goMin, MAX_SCORE].map(t => (
          <text key={t} x={Math.max(6, Math.min(W - 8, xFor(t)))} y={padT + H + 14} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono',monospace" style={{ fill: 'var(--mute)' }}>{t}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, fontSize: 9, color: 'var(--mute)', fontFamily: "'JetBrains Mono',monospace" }}>
        <span>{ar ? 'مرفوض' : 'NO GO'} &lt; {reviewMin}</span>
        <span>{ar ? 'مراجعة' : 'REVIEW'} {reviewMin}–{goMin - 1}</span>
        <span>{ar ? 'مقبول' : 'GO'} ≥ {goMin}</span>
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

  const ar = (await cookies()).get('lang')?.value === 'ar'

  const allBids = await prisma.bid.findMany({
    where: { orgId },
    select: {
      id: true, sr: true, name: true, type: true,
      totalScore: true, decision: true, outcome: true, expectWin: true,
      location: true, clientCategory: true, estValue: true, date: true,
    },
    orderBy: { sr: 'asc' },
  })
  const scoring = await getScoringConfig(orgId)

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
            <div className="h-kicker"><span className="dash" />{ar ? '05 · الذكاء' : '05 · Intelligence'}</div>
            <h1 className="h-title">{ar ? 'توقع' : 'Win'} <em>{ar ? 'الفوز' : 'Predictor'}</em></h1>
            <p className="h-sub">{ar ? 'قارن هذا المشروع بالمكاسب والخسائر التاريخية. اكشف العطاءات السابقة المماثلة' : 'Benchmark this project against historical wins and losses. Surface comparable past bids.'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>

          {/* ── LEFT column ── */}
          <div>

            {/* Project selector */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'المشروع' : 'Project'}</span>
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
                    / 135 {ar ? 'نقطة' : 'points'}
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
                    {ar ? 'احتمالية الفوز' : 'WIN PROBABILITY'}
                  </div>
                </div>

                {/* AI Summary placeholder */}
                <div style={{ padding: '12px 14px', background: '#F4F1E8', borderRadius: 5, borderLeft: `3px solid ${decisionColor}` }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#6E6A62', letterSpacing: '0.14em', marginBottom: 6 }}>
                    {ar ? 'ملخص الذكاء الاصطناعي' : 'AI SUMMARY'}
                  </div>
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: '#3A3630', margin: 0 }}>
                    <strong>{selectedBid.name}</strong> {ar ? 'يحصل على' : 'scores'} {selectedBid.totalScore}/135 {ar ? 'مع توصية' : 'with a'}{' '}
                    <strong style={{ color: decisionColor }}>{selectedBid.decision.replace('_', ' ')}</strong> {ar ? 'واحتمالية فوز تقديرية' : 'recommendation and'} {Math.round(selectedBid.expectWin * 100)}% {ar ? '' : 'estimated win probability.'}{ar ? '.' : ''}
                    {wonAvg > 0 && selectedBid.totalScore >= wonAvg
                      ? (ar ? ' النقاط تساوي أو تتجاوز متوسط العطاءات الفائزة في المحفظة.' : ' Score is at or above the portfolio won-bid average.')
                      : wonAvg > 0
                        ? (ar ? ` النقاط أقل بـ ${wonAvg - selectedBid.totalScore} نقطة من متوسط العطاءات الفائزة ${wonAvg}.` : ` Score is ${wonAvg - selectedBid.totalScore} points below the won-bid average of ${wonAvg}.`)
                        : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#6E6A62' }}>
                <div style={{ fontSize: 32, fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, marginBottom: 8 }}>—</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em' }}>
                  {ar ? 'اختر مشروعًا أعلاه' : 'SELECT A PROJECT ABOVE'}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT column ── */}
          <div>

            {/* Historical averages */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'معايير النقاط' : 'Score Benchmarks'}</span>
              </div>
              <CompareBar
                label={ar ? `متوسط الفائزين (${wonBids.length} عطاءات)` : `Won Average (${wonBids.length} bids)`}
                score={wonAvg}
                color="#1F6E45"
              />
              <CompareBar
                label={ar ? `متوسط الخاسرين (${lostBids.length} عطاءات)` : `Lost Average (${lostBids.length} bids)`}
                score={lostAvg}
                color="#A8362A"
              />
              {selectedBid && (
                <CompareBar
                  label={ar ? 'هذا المشروع' : 'This Project'}
                  score={selectedBid.totalScore}
                  color={decisionColor}
                  highlight
                />
              )}
              {!selectedBid && (
                <div style={{ height: 32, background: '#F4F1E8', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
                  <span style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
                    {ar ? '— اختر مشروعًا للمقارنة —' : '— select a project to compare —'}
                  </span>
                </div>
              )}
            </div>

            {/* Comparable past projects */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 10 }}>
                <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'مشاريع سابقة مماثلة' : 'Comparable Past Projects'}</span>
                <span style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
                  {selectedBid
                    ? (ar ? `نفس النوع · أفضل ${comparables.length}` : `Same type · top ${comparables.length}`)
                    : (ar ? 'اختر مشروعًا' : 'Select a project')}
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
                  {selectedBid ? (ar ? 'لم يتم العثور على عطاءات مماثلة' : 'No comparable bids found') : '—'}
                </div>
              )}
            </div>

            {/* Score distribution chart */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
                <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'توزيع النقاط' : 'Score Distribution'}</span>
                <span style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
                  {ar ? `${allBids.length} عطاءات` : `${allBids.length} bids`}
                </span>
              </div>
              <ScoreDistribution
                bids={allBids.map(b => ({ totalScore: b.totalScore, outcome: b.outcome }))}
                selectedScore={selectedBid?.totalScore}
                reviewMin={scoring.reviewMin}
                goMin={scoring.goMin}
                ar={ar}
              />
            </div>

          </div>

        </div>

      </div>
    </>
  )
}

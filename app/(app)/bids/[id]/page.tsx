import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'

interface Props { params: { id: string } }

const CRITERIA_SECTIONS = [
  {
    label: 'Strategic Fit',
    fields: [
      { key: 'relStrength',     label: 'Relationship Strength' },
      { key: 'budgetKnown',     label: 'Budget Known' },
      { key: 'competitors',     label: 'Competitor Landscape' },
      { key: 'limitedInv',      label: 'Limited Invitations' },
      { key: 'similarExp',      label: 'Similar Experience' },
      { key: 'noPriceBreakers', label: 'No Price Breakers' },
      { key: 'techAdv',         label: 'Technical Advantage' },
      { key: 'withinExpertise', label: 'Within Expertise' },
      { key: 'lowChanges',      label: 'Low Change Orders Risk' },
      { key: 'goodLocation',    label: 'Good Location' },
    ],
  },
  {
    label: 'Capacity',
    fields: [
      { key: 'teamAvail',       label: 'Team Availability' },
      { key: 'equipAvail',      label: 'Equipment Availability' },
      { key: 'cashFlow',        label: 'Cash Flow' },
      { key: 'currWorkload',    label: 'Current Workload' },
      { key: 'noImpactRunning', label: 'No Impact on Running Projects' },
    ],
  },
  {
    label: 'Risk / Compliance',
    fields: [
      { key: 'ld',        label: 'Liquidated Damages' },
      { key: 'apg',       label: 'Advance Payment Guarantee' },
      { key: 'perfBond',  label: 'Performance Bond' },
      { key: 'retention', label: 'Retention Terms' },
    ],
  },
  {
    label: 'Complexity',
    fields: [
      { key: 'newSystem',   label: 'New Systems Required' },
      { key: 'complexMEP',  label: 'Complex MEP' },
      { key: 'specialAuth', label: 'Special Authorities' },
    ],
  },
  {
    label: 'Commercial / Financial',
    fields: [
      { key: 'clientRep',   label: 'Client Reputation' },
      { key: 'clearDwgs',   label: 'Clear Drawings' },
      { key: 'advPayment',  label: 'Advance Payment' },
      { key: 'payments',    label: 'Payment Terms' },
      { key: 'finDuration', label: 'Financial Duration' },
    ],
  },
]

function ScoreBar({ value }: { value: number }) {
  const w = Math.round((value / 5) * 100)
  const color = value >= 4 ? '#1F6E45' : value >= 3 ? '#B07A1B' : '#A8362A'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 5, background: '#E8E4DC', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span className="mono" style={{ width: 14, textAlign: 'right', fontWeight: 700, color, fontSize: 12 }}>{value}</span>
    </div>
  )
}

export default async function BidDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const orgId = (session.user as any).orgId

  const bid = await prisma.bid.findFirst({
    where: { id: params.id, orgId },
  })

  if (!bid) notFound()

  const decisionPill  = bid.decision === 'GO' ? 'pill pill-go' : bid.decision === 'REVIEW' ? 'pill pill-review' : 'pill pill-nogo'
  const riskPill      = bid.riskIndex === 'LOW' ? 'pill pill-low' : bid.riskIndex === 'MEDIUM' ? 'pill pill-medium' : 'pill pill-high'
  const outcomePill   = bid.outcome === 'WON' ? 'pill pill-go' : bid.outcome === 'LOST' ? 'pill pill-nogo' : 'pill pill-pending'
  const decisionColor = bid.decision === 'GO' ? '#1F6E45' : bid.decision === 'REVIEW' ? '#B07A1B' : '#A8362A'

  return (
    <>
      <Header title="Bid Detail" titleAr="تفاصيل العطاء" />

      <div className="page-wrap">
        <div>

          {/* breadcrumb + actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
              <Link href="/bids" style={{ color: '#6E6A62', textDecoration: 'none' }}>Bid History</Link>
              <span>/</span>
              <span style={{ color: '#1B2B1E' }}>#{bid.sr}</span>
            </div>
            <Link href="/bids/new" className="btn btn--secondary btn--sm">+ New Bid</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>

            {/* Left: details */}
            <div>
              {/* Summary card */}
              <div className="card" style={{ marginBottom: 12 }}>
                <h2 style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 800, fontSize: 22, margin: '0 0 4px' }}>
                  {bid.name}
                </h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                  <span className={decisionPill}>{bid.decision.replace('_', ' ')}</span>
                  <span className={riskPill}>{bid.riskIndex} RISK</span>
                  <span className={outcomePill}>{bid.outcome}</span>
                  {bid.hardStop && (
                    <span style={{ fontSize: 11, color: '#A8362A', background: '#FEF2F2', borderRadius: 3, padding: '2px 6px', fontFamily: "'JetBrains Mono',monospace" }}>
                      HARD STOP
                    </span>
                  )}
                </div>

                <div className="grid-4" style={{ rowGap: 12 }}>
                  {[
                    { label: 'Location',   value: bid.location },
                    { label: 'Type',       value: bid.type },
                    { label: 'Size',       value: bid.size },
                    { label: 'Tender',     value: bid.tenderType },
                    { label: 'Client',     value: bid.clientCategory },
                    { label: 'Duration',   value: bid.duration },
                    { label: 'Consultant', value: bid.consultant || '—' },
                    { label: 'Competitor', value: bid.mainCompetitor || '—' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>{item.label.toUpperCase()}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {bid.remarks && (
                  <div style={{ marginTop: 12, padding: '10px 12px', background: '#F7F5EE', borderRadius: 4, fontSize: 13, color: '#4A4740', borderLeft: '3px solid #D9D4C4' }}>
                    {bid.remarks}
                  </div>
                )}
              </div>

              {/* Financials */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, borderBottom: '1px solid #D9D4C4', paddingBottom: 8 }}>
                  Financials (SAR)
                </div>
                <div className="grid-3">
                  {[
                    { label: 'Est. Value',      value: bid.estValue.toLocaleString() },
                    { label: 'Contract Value',   value: bid.contractValue ? bid.contractValue.toLocaleString() : '—' },
                    { label: 'Actual Spend',     value: bid.actualSpend   ? bid.actualSpend.toLocaleString()   : '—' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 10, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>{item.label.toUpperCase()}</div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Criteria breakdown */}
              {CRITERIA_SECTIONS.map(section => {
                const sectionScore = section.fields.reduce((s, f) => s + ((bid as any)[f.key] ?? 0), 0)
                const maxScore     = section.fields.length * 5
                return (
                  <div key={section.label} className="card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #D9D4C4', paddingBottom: 8 }}>
                      <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {section.label}
                      </span>
                      <span className="mono" style={{ fontSize: 12, color: '#6E6A62' }}>
                        {sectionScore}/{maxScore}
                      </span>
                    </div>
                    {section.fields.map(f => (
                      <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13 }}>{f.label}</span>
                        <ScoreBar value={(bid as any)[f.key] ?? 0} />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Right: score summary */}
            <div style={{ position: 'sticky', top: 80 }}>
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, borderBottom: '1px solid #D9D4C4', paddingBottom: 10 }}>
                  Assessment Result
                </div>

                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>TOTAL SCORE</div>
                  <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "'Archivo Narrow',sans-serif", color: decisionColor, lineHeight: 1 }}>
                    {bid.totalScore}
                  </div>
                  <div style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>/ 135</div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>DECISION</div>
                  <span className={decisionPill} style={{ fontSize: 14 }}>{bid.decision.replace('_', ' ')}</span>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>CFR RISK</div>
                  <span className={riskPill}>{bid.riskIndex}</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>WIN PROBABILITY</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: decisionColor }}>
                    {Math.round(bid.expectWin * 100)}%
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E8E4DC', paddingTop: 12 }}>
                  {[
                    { label: 'Bid Date', value: new Date(bid.date).toLocaleDateString('en-SA') },
                    { label: 'Serial #', value: String(bid.sr) },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{item.label}</span>
                      <span className="mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

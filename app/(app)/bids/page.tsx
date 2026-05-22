import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { cookies } from 'next/headers'

function decisionPill(d: string) {
  if (d === 'GO')     return 'pill pill-go'
  if (d === 'REVIEW') return 'pill pill-review'
  return 'pill pill-nogo'
}

function outcomePill(o: string) {
  if (o === 'WON')      return 'pill pill-go'
  if (o === 'LOST')     return 'pill pill-nogo'
  if (o === 'REJECTED') return 'pill pill-nogo'
  return 'pill pill-pending'
}

function riskPill(r: string) {
  if (r === 'LOW')    return 'pill pill-low'
  if (r === 'MEDIUM') return 'pill pill-medium'
  return 'pill pill-high'
}

interface Props {
  searchParams: { decision?: string; outcome?: string; riskIndex?: string }
}

export default async function BidsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const ar = cookieStore.get('lang')?.value === 'ar'

  const orgId     = (session.user as any).orgId
  const { decision, outcome, riskIndex } = searchParams

  const where: Record<string, unknown> = { orgId }
  if (decision)  where.decision  = decision
  if (outcome)   where.outcome   = outcome
  if (riskIndex) where.riskIndex = riskIndex

  const bids = await prisma.bid.findMany({
    where,
    orderBy: { date: 'desc' },
    select: {
      id: true, sr: true, name: true, location: true, type: true,
      decision: true, riskIndex: true, expectWin: true, outcome: true,
      estValue: true, date: true, totalScore: true,
    },
  })

  const DECISIONS  = ['GO', 'REVIEW', 'NO_GO']
  const OUTCOMES   = ['PENDING', 'WON', 'LOST', 'REJECTED']
  const RISKS      = ['LOW', 'MEDIUM', 'HIGH']

  function filterHref(key: string, val: string) {
    const p: Record<string, string> = {}
    if (decision)  p.decision  = decision
    if (outcome)   p.outcome   = outcome
    if (riskIndex) p.riskIndex = riskIndex
    if (p[key] === val) delete p[key]; else p[key] = val
    const qs = new URLSearchParams(p).toString()
    return qs ? `/bids?${qs}` : '/bids'
  }

  function decisionLabel(d: string) {
    if (!ar) return d.replace('_', ' ')
    if (d === 'GO')     return 'مقبول'
    if (d === 'REVIEW') return 'مراجعة'
    return 'مرفوض'
  }

  function outcomeLabel(o: string) {
    if (!ar) return o
    if (o === 'PENDING')  return 'معلق'
    if (o === 'WON')      return 'فائز'
    if (o === 'LOST')     return 'خسارة'
    if (o === 'REJECTED') return 'مرفوض'
    return o
  }

  return (
    <>
      <Header title="Bid History" titleAr="سجل العطاءات" />

      <div className="page-wrap">

        <div className="page-header">
          <div className="h-left">
            <div className="h-kicker">
              <span className="dash" />
              {ar ? '04 · العطاءات' : '04 · Bids'}
            </div>
            <h1 className="h-title">
              {ar ? 'سجل' : 'Bid'} <em>{ar ? 'العطاءات' : 'History'}</em>
            </h1>
            <p className="h-sub">
              {ar
                ? 'جميع العطاءات المُدخلة في عرض واضح. انقر على أي صف لتحديث نتيجته'
                : 'Every bid entered in plain view. Click any row to update its outcome'}
            </p>
          </div>
          <Link href="/bids/new" className="btn btn--primary" style={{ alignSelf: 'flex-end' }}>
            {ar ? '+ عطاء جديد' : '+ New Bid'}
          </Link>
        </div>

        {/* Filter chips — decisions + outcomes only, matching prototype */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <span className="breadcrumb" style={{ marginRight: 6 }}>
            {ar ? 'تصفية' : 'Filter'}
          </span>
          <Link href="/bids"
            className={`btn btn--xs ${!decision && !outcome && !riskIndex ? 'btn--primary' : 'btn--secondary'}`}>
            {ar ? 'الكل' : 'All'}
          </Link>
          {DECISIONS.map(d => (
            <Link key={d} href={filterHref('decision', d)}
              className={`btn btn--xs ${decision === d ? 'btn--primary' : 'btn--secondary'}`}>
              {decisionLabel(d)}
            </Link>
          ))}
          <span style={{ width: 1, height: 18, background: 'var(--hairline)', margin: '0 2px', display: 'inline-block' }} />
          {OUTCOMES.map(o => (
            <Link key={o} href={filterHref('outcome', o)}
              className={`btn btn--xs ${outcome === o ? 'btn--primary' : 'btn--secondary'}`}>
              {outcomeLabel(o)}
            </Link>
          ))}
          {(decision || outcome || riskIndex) && (
            <Link href="/bids" className="btn btn--xs btn--ghost" style={{ marginLeft: 4 }}>
              ✕ {ar ? 'مسح' : 'Clear'}
            </Link>
          )}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>{ar ? 'المشروع' : 'Project'}</th>
                    <th>{ar ? 'الموقع' : 'Location'}</th>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th style={{ width: 60 }}>{ar ? 'النقاط' : 'Score'}</th>
                    <th>{ar ? 'القرار' : 'Decision'}</th>
                    <th>{ar ? 'المخاطر' : 'Risk'}</th>
                    <th style={{ width: 60 }}>{ar ? '٪ الفوز' : 'Win %'}</th>
                    <th>{ar ? 'النتيجة' : 'Outcome'}</th>
                    <th>{ar ? 'القيمة التقديرية (ريال)' : 'Est. Value (SAR)'}</th>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map(bid => {
                    const rowAccent = bid.decision === 'GO' ? 'var(--go)' : bid.decision === 'REVIEW' ? 'var(--review)' : 'var(--nogo)'
                    return (
                    <tr key={bid.id} style={{ borderLeft: `3px solid ${rowAccent}` }}>
                      <td className="mono" style={{ color: '#6E6A62' }}>{bid.sr}</td>
                      <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bid.name}
                      </td>
                      <td style={{ fontSize: 12 }}>{bid.location}</td>
                      <td style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
                        {bid.type}
                      </td>
                      <td className="mono" style={{ fontWeight: 700 }}>{bid.totalScore}</td>
                      <td><span className={decisionPill(bid.decision)}>{decisionLabel(bid.decision)}</span></td>
                      <td><span className={riskPill(bid.riskIndex)}>{bid.riskIndex}</span></td>
                      <td className="mono">{Math.round(bid.expectWin * 100)}%</td>
                      <td><span className={outcomePill(bid.outcome)}>{outcomeLabel(bid.outcome)}</span></td>
                      <td className="mono" style={{ color: '#6E6A62', fontSize: 12 }}>
                        {bid.estValue.toLocaleString()}
                      </td>
                      <td className="mono" style={{ color: '#6E6A62', fontSize: 11 }}>
                        {new Date(bid.date).toLocaleDateString('en-SA')}
                      </td>
                      <td>
                        <Link href={`/bids/${bid.id}`} className="btn btn--ghost btn--xs">
                          {ar ? 'عرض' : 'View'}
                        </Link>
                      </td>
                    </tr>
                    )
                  })}
                  {bids.length === 0 && (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', color: '#6E6A62', padding: '40px 0', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                        {ar ? 'لا توجد عطاءات تطابق الفلاتر المحددة' : 'No bids match the selected filters'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        <div style={{ marginTop: 8, color: 'var(--mute)', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
          {bids.length} {ar
            ? (bids.length !== 1 ? 'عطاءات' : 'عطاء')
            : (bids.length !== 1 ? 'bids' : 'bid')}
          {(decision || outcome || riskIndex) && (ar ? ' (مُصفّى)' : ' (filtered)')}
        </div>

      </div>
    </>
  )
}

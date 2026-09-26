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

type FilterKey = 'decision' | 'outcome' | 'clientCategory' | 'type'

interface Props {
  searchParams: Partial<Record<FilterKey | 'riskIndex', string>>
}

const FILTERS: Record<FilterKey, string[]> = {
  decision:       ['GO', 'REVIEW', 'NO_GO'],
  outcome:        ['PENDING', 'WON', 'LOST', 'REJECTED'],
  clientCategory: ['GOV', 'PRIVATE', 'SEMI'],
  type:           ['BUILDING', 'INFRASTRUCTURE', 'INDUSTRIAL'],
}

export default async function BidsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const ar = cookieStore.get('lang')?.value === 'ar'

  const orgId     = (session.user as any).orgId
  // Only accept known enum values from the query string.
  const active: Partial<Record<FilterKey | 'riskIndex', string>> = {}
  ;(Object.keys(FILTERS) as FilterKey[]).forEach(k => {
    const v = searchParams[k]
    if (v && FILTERS[k].includes(v)) active[k] = v
  })
  if (searchParams.riskIndex && ['LOW', 'MEDIUM', 'HIGH'].includes(searchParams.riskIndex)) active.riskIndex = searchParams.riskIndex
  const anyFilter = Object.keys(active).length > 0

  const bids = await prisma.bid.findMany({
    where:   { orgId, ...active } as any,
    orderBy: { sr: 'asc' },
    select: {
      id: true, sr: true, name: true, location: true, type: true, clientCategory: true,
      decision: true, riskIndex: true, expectWin: true, outcome: true,
      estValue: true, date: true, totalScore: true,
    },
  })

  function toHref(p: Record<string, string>) {
    const qs = new URLSearchParams(p).toString()
    return qs ? `/bids?${qs}` : '/bids'
  }

  function clearHref(key: string) {
    const p: Record<string, string> = { ...(active as Record<string, string>) }
    delete p[key]
    return toHref(p)
  }

  function filterHref(key: string, val: string) {
    const p: Record<string, string> = { ...(active as Record<string, string>) }
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

  function categoryLabel(c: string) {
    if (c === 'GOV')     return ar ? 'حكومي'     : 'Gov'
    if (c === 'PRIVATE') return ar ? 'خاص'       : 'Private'
    return ar ? 'شبه حكومي' : 'Semi'
  }

  function typeLabel(t: string) {
    if (t === 'BUILDING')       return ar ? 'مباني'      : 'Building'
    if (t === 'INFRASTRUCTURE') return ar ? 'بنية تحتية' : 'Infrastructure'
    return ar ? 'صناعي' : 'Industrial'
  }

  const GROUPS: { key: FilterKey; label: string; fmt: (v: string) => string }[] = [
    { key: 'decision',       label: ar ? 'القرار'     : 'Decision', fmt: decisionLabel },
    { key: 'outcome',        label: ar ? 'النتيجة'    : 'Outcome',  fmt: outcomeLabel },
    { key: 'clientCategory', label: ar ? 'العميل'     : 'Client',   fmt: categoryLabel },
    { key: 'type',           label: ar ? 'نوع المشروع' : 'Type',     fmt: typeLabel },
  ]

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
                ? 'جميع العطاءات المُدخلة مرتبة حسب الرقم التسلسلي. افتح أي عطاء لتحديث نتيجته وقيم العقد'
                : 'Every bid entered, in serial order. Open any bid to update its outcome and contract values.'}
            </p>
          </div>
          <Link href="/bids/new" className="btn btn--primary" style={{ alignSelf: 'flex-end' }}>
            {ar ? '+ عطاء جديد' : '+ New Bid'}
          </Link>
        </div>

        {/* Filters — one row per dimension; chips combine (AND) across rows */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, padding: '12px 16px' }}>
          {GROUPS.map(g => (
            <div key={g.key} className="filter-group">
              <span className="filter-group-label">{g.label}</span>
              <Link href={clearHref(g.key)}
                className={`btn btn--xs ${!active[g.key] ? 'btn--primary' : 'btn--secondary'}`}>
                {ar ? 'الكل' : 'All'}
              </Link>
              {FILTERS[g.key].map(v => (
                <Link key={v} href={filterHref(g.key, v)}
                  className={`btn btn--xs ${active[g.key] === v ? 'btn--primary' : 'btn--secondary'}`}>
                  {g.fmt(v)}
                </Link>
              ))}
            </div>
          ))}
          {anyFilter && (
            <div>
              <Link href="/bids" className="btn btn--xs btn--ghost">✕ {ar ? 'مسح كل الفلاتر' : 'Clear all filters'}</Link>
            </div>
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
                    <th>{ar ? 'العميل' : 'Client'}</th>
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
                        {typeLabel(bid.type)}
                      </td>
                      <td style={{ fontSize: 11, color: '#6E6A62', fontFamily: "'JetBrains Mono',monospace" }}>
                        {categoryLabel(bid.clientCategory)}
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
                      <td colSpan={13} style={{ textAlign: 'center', color: '#6E6A62', padding: '40px 0', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
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
          {anyFilter && (ar ? ' (مُصفّى)' : ' (filtered)')}
        </div>

      </div>
    </>
  )
}

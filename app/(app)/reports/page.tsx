'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAr } from '@/hooks/useAr'

type Log = { id: string; type: string; format: string; filename: string; createdAt: string }
type BidOption = { id: string; sr: number; name: string }

const REPORTS_EN = [
  {
    id:     'pipeline-summary',
    title:  'Pipeline Summary',
    titleAr:'ملخص خط الأنابيب',
    desc:   'All pending bids — decision, risk exposure, score, and estimated value.',
    descAr: 'جميع العطاءات المعلقة — القرار والمخاطر والنقاط والقيمة التقديرية.',
    config: null as null | 'scorecard' | 'monthly' | 'group',
  },
  {
    id:     'win-loss',
    title:  'Win / Loss Analysis',
    titleAr:'تحليل الفوز والخسارة',
    desc:   'Completed bids grouped by outcome with win rate by type, location, and client.',
    descAr: 'العطاءات المكتملة مجمّعة حسب النتيجة مع معدل الفوز حسب النوع والموقع والعميل.',
    config: null as null | 'scorecard' | 'monthly' | 'group',
  },
  {
    id:     'scorecard',
    title:  'Single Bid Scorecard',
    titleAr:'بطاقة تقييم عطاء واحد',
    desc:   'Full 27-criterion scoring breakdown and decision rationale for one selected bid.',
    descAr: 'تفصيل كامل لـ 27 معياراً وتبرير القرار لعطاء محدد.',
    config: 'scorecard' as null | 'scorecard' | 'monthly' | 'group',
  },
  {
    id:     'executive-monthly',
    title:  'Executive Monthly',
    titleAr:'التقرير التنفيذي الشهري',
    desc:   'Monthly snapshot of bids submitted, pipeline value, and win performance.',
    descAr: 'لقطة شهرية للعطاءات المقدمة وقيمة خط الأنابيب وأداء الفوز.',
    config: 'monthly' as null | 'scorecard' | 'monthly' | 'group',
  },
  {
    id:     'by-group',
    title:  'By Location / Client',
    titleAr:'حسب الموقع / العميل',
    desc:   'Win rate, bid count, and portfolio value grouped by city or client category.',
    descAr: 'معدل الفوز وعدد العطاءات وقيمة المحفظة مجمّعة حسب المدينة أو فئة العميل.',
    config: 'group' as null | 'scorecard' | 'monthly' | 'group',
  },
]

const TYPE_LABEL_EN: Record<string, string> = {
  'pipeline-summary':  'Pipeline Summary',
  'win-loss':          'Win/Loss',
  'scorecard':         'Scorecard',
  'executive-monthly': 'Executive Monthly',
  'by-group':          'By Group',
}

const TYPE_LABEL_AR: Record<string, string> = {
  'pipeline-summary':  'ملخص خط الأنابيب',
  'win-loss':          'فوز/خسارة',
  'scorecard':         'بطاقة التقييم',
  'executive-monthly': 'التقرير التنفيذي الشهري',
  'by-group':          'حسب المجموعة',
}

function relTime(iso: string, ar: boolean) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return ar ? 'الآن' : 'just now'
  if (m < 60) return ar ? `منذ ${m} دقيقة` : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return ar ? `منذ ${h} ساعة` : `${h}h ago`
  return ar ? `منذ ${Math.floor(h/24)} يوم` : `${Math.floor(h/24)}d ago`
}

export default function ReportsPage() {
  const ar = useAr()

  const [configOpen,     setConfigOpen]     = useState<string | null>(null)
  const [bids,           setBids]           = useState<BidOption[]>([])
  const [scorecardBidId, setScorecardBidId] = useState('')
  const [groupBy,        setGroupBy]        = useState<'location' | 'clientCategory'>('location')
  const [year,           setYear]           = useState(new Date().getFullYear())
  const [month,          setMonth]          = useState(new Date().getMonth() + 1)
  const [exporting,      setExporting]      = useState<string | null>(null)
  const [logs,           setLogs]           = useState<Log[]>([])

  const fetchLogs = useCallback(async () => {
    const res = await fetch('/api/reports/logs')
    if (res.ok) setLogs((await res.json()).logs ?? [])
  }, [])

  useEffect(() => {
    fetchLogs()
    fetch('/api/bids').then(r => r.json()).then(d => {
      setBids((d.data ?? []).map((b: any) => ({ id: b.id, sr: b.sr, name: b.name })))
    }).catch(() => {})
  }, [fetchLogs])

  async function doExport(type: string, format: string) {
    const body: Record<string, unknown> = {}
    if (type === 'scorecard') {
      if (!scorecardBidId) {
        alert(ar ? 'اختر عطاءً أولاً — انقر على إعداد.' : 'Select a bid first — click Configure.')
        return
      }
      body.bidId = scorecardBidId
    } else if (type === 'executive-monthly') {
      body.year = year; body.month = month
    } else if (type === 'by-group') {
      body.groupBy = groupBy
    }

    setExporting(`${type}-${format}`)
    try {
      const res = await fetch(`/api/reports/${type}/${format}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? 'Export failed')
        return
      }
      const cd       = res.headers.get('Content-Disposition') ?? ''
      const m        = cd.match(/filename="([^"]+)"/)
      const filename = m ? m[1] : `report.${format === 'excel' ? 'xlsx' : format}`
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      fetchLogs()
    } finally {
      setExporting(null)
    }
  }

  const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  const MONTHS = ar ? MONTHS_AR : MONTHS_EN
  const curYear = new Date().getFullYear()

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div className="h-left">
          <div className="h-kicker"><span className="dash" />{ar ? '08 · التقارير' : '08 · Reports'}</div>
          <h1 className="h-title"><em>{ar ? 'تقارير' : 'Reports'}</em></h1>
          <p className="h-sub">{ar ? 'إنشاء وتهيئة وتصدير تقارير المحفظة بتنسيق PDF أو Excel أو CSV' : 'Generate, configure, and export portfolio reports in PDF, Excel, or CSV.'}</p>
        </div>
      </div>

      {/* 3+2 card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 14 }}>
        {REPORTS_EN.map((rpt, idx) => {
          const isOpen  = configOpen === rpt.id
          const gridCol = idx < 3 ? 'span 2' : 'span 3'
          return (
            <div key={rpt.id} className="card" style={{ gridColumn: gridCol, display: 'flex', flexDirection: 'column' }}>
              {/* Card header */}
              <div className="card-section-head" style={{ paddingBottom: 10, marginBottom: 10 }}>
                <span className="card-eyebrow">
                  <span className="eyebrow-dot" />{ar ? rpt.titleAr : rpt.title}
                </span>
                {rpt.config && (
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => setConfigOpen(isOpen ? null : rpt.id)}
                    style={{ fontSize: 11 }}
                  >
                    {ar ? 'إعداد' : 'Configure'} {isOpen ? '▲' : '▾'}
                  </button>
                )}
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.65, marginBottom: 14, flex: 1 }}>
                {ar ? rpt.descAr : rpt.desc}
              </p>

              {/* Configure: Scorecard bid selector */}
              {isOpen && rpt.config === 'scorecard' && (
                <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)' }}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {ar ? 'اختر العطاء' : 'Select Bid'}
                    <select
                      className="field"
                      value={scorecardBidId}
                      onChange={e => setScorecardBidId(e.target.value)}
                      style={{ fontSize: 12 }}
                    >
                      <option value="">{ar ? '— اختر عطاءً —' : '— Choose a bid —'}</option>
                      {bids.map(b => (
                        <option key={b.id} value={b.id}>#{b.sr} · {b.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {/* Configure: Executive Monthly month/year */}
              {isOpen && rpt.config === 'monthly' && (
                <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', display: 'flex', gap: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {ar ? 'الشهر' : 'Month'}
                    <select className="field" value={month} onChange={e => setMonth(+e.target.value)} style={{ fontSize: 12 }}>
                      {MONTHS.map((mn, i) => <option key={i} value={i+1}>{mn}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 500, flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {ar ? 'السنة' : 'Year'}
                    <select className="field" value={year} onChange={e => setYear(+e.target.value)} style={{ fontSize: 12 }}>
                      {[curYear-2, curYear-1, curYear, curYear+1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {/* Configure: By Group toggle */}
              {isOpen && rpt.config === 'group' && (
                <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', display: 'flex', gap: 6 }}>
                  {(['location', 'clientCategory'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setGroupBy(v)}
                      style={{
                        padding: '5px 12px', fontSize: 11, fontWeight: 700,
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)',
                        background: groupBy === v ? 'var(--ink)' : 'transparent',
                        color:      groupBy === v ? 'var(--canvas)' : 'var(--ink)',
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      {v === 'location'
                        ? (ar ? 'حسب الموقع' : 'By Location')
                        : (ar ? 'حسب العميل' : 'By Client')}
                    </button>
                  ))}
                </div>
              )}

              {/* Export buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {(['pdf', 'excel', 'csv'] as const).map(fmt => {
                  const busy = exporting === `${rpt.id}-${fmt}`
                  return (
                    <button
                      key={fmt}
                      className="btn btn--ghost btn--sm"
                      disabled={!!exporting}
                      onClick={() => doExport(rpt.id, fmt)}
                      style={{ flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}
                    >
                      {busy ? '…' : fmt.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Exports */}
      <div className="card">
        <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 12 }}>
          <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'التصديرات الأخيرة' : 'Recent Exports'}</span>
        </div>
        {logs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--mute)' }}>{ar ? 'لا توجد تصديرات بعد.' : 'No exports yet.'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{ar ? 'نوع التقرير' : 'Report Type'}</th>
                  <th>{ar ? 'التنسيق' : 'Format'}</th>
                  <th>{ar ? 'اسم الملف' : 'Filename'}</th>
                  <th>{ar ? 'متى' : 'When'}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{(ar ? TYPE_LABEL_AR : TYPE_LABEL_EN)[l.type] ?? l.type}</td>
                    <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>{l.format}</td>
                    <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--mute)' }}>{l.filename}</td>
                    <td style={{ fontSize: 11, color: 'var(--mute)' }}>{relTime(l.createdAt, ar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

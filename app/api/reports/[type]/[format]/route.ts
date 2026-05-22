export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Workbook } from 'exceljs'

const VALID_TYPES   = new Set(['pipeline-summary', 'win-loss', 'scorecard', 'executive-monthly', 'by-group'])
const VALID_FORMATS = new Set(['pdf', 'excel', 'csv'])

const CRITERIA_KEYS = [
  'relStrength', 'budgetKnown', 'competitors', 'limitedInv', 'similarExp', 'noPriceBreakers',
  'techAdv', 'withinExpertise', 'lowChanges', 'goodLocation',
  'teamAvail', 'equipAvail', 'cashFlow', 'currWorkload', 'noImpactRunning',
  'ld', 'apg', 'perfBond', 'retention',
  'newSystem', 'complexMEP', 'specialAuth',
  'clientRep', 'clearDwgs', 'advPayment', 'payments', 'finDuration',
]

const CRITERIA_GROUPS: Record<string, string[]> = {
  'Competitive Position': ['relStrength','budgetKnown','competitors','limitedInv','similarExp','noPriceBreakers','techAdv','withinExpertise','lowChanges','goodLocation'],
  'Load Factor':          ['teamAvail','equipAvail','cashFlow','currWorkload','noImpactRunning'],
  'Contractual':          ['ld','apg','perfBond','retention'],
  'Technical':            ['newSystem','complexMEP','specialAuth'],
  'Commercial':           ['clientRep','clearDwgs','advPayment','payments','finDuration'],
}

// ── CSV ───────────────────────────────────────────────────────────────────────
function cc(v: unknown): string {
  const s = String(v ?? '')
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"' : s
}
function cr(vals: unknown[]): string { return vals.map(cc).join(',') }

function buildCSV(type: string, rows: any[], body: Record<string,unknown>): Buffer {
  let lines: string[]

  if (type === 'pipeline-summary') {
    lines = [
      cr(['SR','Project Name','Location','Type','Decision','Risk','Win%','Score','Est. Value (SAR)','Date']),
      ...rows.map(r => cr([r.sr, r.name, r.location, r.type, r.decision, r.riskIndex,
        Math.round(r.expectWin*100)+'%', r.totalScore, r.estValue,
        new Date(r.date).toISOString().split('T')[0]])),
    ]
  } else if (type === 'win-loss') {
    const won = rows.filter(r => r.outcome === 'WON').length
    lines = [
      cr(['Total Evaluated', rows.length]), cr(['Won', won]),
      cr(['Lost', rows.length - won]),
      cr(['Win Rate', rows.length ? Math.round(won/rows.length*100)+'%' : '—']),
      '',
      cr(['SR','Project Name','Location','Type','Outcome','Decision','Score','Est. Value (SAR)','Date']),
      ...rows.map(r => cr([r.sr, r.name, r.location, r.type, r.outcome, r.decision,
        r.totalScore, r.estValue, new Date(r.date).toISOString().split('T')[0]])),
    ]
  } else if (type === 'scorecard' && rows[0]) {
    const bid = rows[0]
    lines = [
      cr(['Field','Value']),
      cr(['Project', bid.name]), cr(['Location', bid.location]),
      cr(['Type', bid.type]),   cr(['Size', bid.size]),
      cr(['Decision', bid.decision]), cr(['Risk Index', bid.riskIndex]),
      cr(['Total Score', `${bid.totalScore}/135`]),
      cr(['Win Probability', `${Math.round(bid.expectWin*100)}%`]),
      '',
      cr(['Criterion','Score (0–5)']),
      ...CRITERIA_KEYS.map(k => cr([k, bid[k]])),
    ]
  } else if (type === 'executive-monthly') {
    const won = rows.filter(r => r.outcome === 'WON').length
    lines = [
      cr(['Metric','Value']),
      cr(['Total Bids', rows.length]), cr(['Won', won]),
      cr(['Win Rate', rows.length ? Math.round(won/rows.length*100)+'%' : '—']),
      cr(['Total Est. Value (SAR)', rows.reduce((s,r)=>s+r.estValue,0)]),
      '',
      cr(['SR','Project Name','Location','Outcome','Decision','Score','Est. Value (SAR)']),
      ...rows.map(r => cr([r.sr, r.name, r.location, r.outcome, r.decision, r.totalScore, r.estValue])),
    ]
  } else /* by-group */ {
    const groupBy = String(body.groupBy ?? 'location')
    const grouped: Record<string, any[]> = {}
    for (const r of rows) { (grouped[String(r[groupBy])] ??= []).push(r) }
    const col = groupBy === 'clientCategory' ? 'Client Category' : 'Location'
    lines = [
      cr([col, 'Total Bids', 'Won', 'Win Rate', 'Est. Value (SAR)']),
      ...Object.entries(grouped).map(([key, bids]) => {
        const won = bids.filter(b => b.outcome === 'WON').length
        return cr([key, bids.length, won, Math.round(won/bids.length*100)+'%',
          bids.reduce((s,b) => s+b.estValue, 0)])
      }),
    ]
  }
  return Buffer.from(lines.join('\r\n'))
}

// ── Excel ─────────────────────────────────────────────────────────────────────
async function buildExcel(type: string, title: string, rows: any[], body: Record<string,unknown>): Promise<Buffer> {
  const wb = new Workbook()
  wb.creator = 'Black Bid Intelligence'
  wb.created = new Date()

  const INK   = 'FF14141A'
  const WHITE = 'FFFFFFFF'

  function sheet(name: string, headers: string[], dataRows: (string|number)[][]) {
    const ws = wb.addWorksheet(name)
    const tRow = ws.addRow([`${title} — ${new Date().toLocaleDateString('en-GB')}`])
    tRow.font = { bold: true, size: 12, color: { argb: INK } }
    ws.mergeCells(1, 1, 1, Math.max(headers.length, 1))
    ws.addRow([])
    const hRow = ws.addRow(headers)
    hRow.font = { bold: true, color: { argb: WHITE } }
    hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } }
    for (const vals of dataRows) ws.addRow(vals)
    ws.columns.forEach((col, i) => {
      col.width = Math.min(Math.max(
        headers[i]?.length ?? 10,
        ...dataRows.map(r => String(r[i] ?? '').length),
      ) + 4, 40)
    })
  }

  if (type === 'pipeline-summary') {
    sheet('Pipeline Summary',
      ['SR','Project Name','Location','Type','Decision','Risk','Win%','Score','Est. Value (SAR)','Date'],
      rows.map(r => [r.sr, r.name, r.location, r.type, r.decision, r.riskIndex,
        Math.round(r.expectWin*100)+'%', r.totalScore, r.estValue,
        new Date(r.date).toLocaleDateString('en-GB')]))
  } else if (type === 'win-loss') {
    const won  = rows.filter(r => r.outcome === 'WON')
    const lost = rows.filter(r => r.outcome === 'LOST')
    sheet('Summary', ['Metric','Value'], [
      ['Total Evaluated', rows.length], ['Won', won.length], ['Lost', lost.length],
      ['Win Rate', rows.length ? Math.round(won.length/rows.length*100)+'%' : '—'],
    ])
    sheet('Won', ['SR','Name','Location','Type','Score','Est. Value (SAR)','Date'],
      won.map(r => [r.sr, r.name, r.location, r.type, r.totalScore, r.estValue, new Date(r.date).toLocaleDateString('en-GB')]))
    sheet('Lost', ['SR','Name','Location','Type','Score','Est. Value (SAR)','Date'],
      lost.map(r => [r.sr, r.name, r.location, r.type, r.totalScore, r.estValue, new Date(r.date).toLocaleDateString('en-GB')]))
  } else if (type === 'scorecard' && rows[0]) {
    const bid = rows[0]
    sheet('Summary', ['Field','Value'], [
      ['Project', bid.name], ['Location', bid.location], ['Type', bid.type], ['Size', bid.size],
      ['Decision', bid.decision], ['Risk Index', bid.riskIndex],
      ['Total Score', `${bid.totalScore}/135`], ['Win Probability', `${Math.round(bid.expectWin*100)}%`],
    ])
    sheet('Criteria', ['Criterion','Score (0–5)'],
      CRITERIA_KEYS.map(k => [k, bid[k]]))
  } else if (type === 'executive-monthly') {
    const won = rows.filter(r => r.outcome === 'WON').length
    sheet('KPIs', ['Metric','Value'], [
      ['Total Bids', rows.length], ['Won', won],
      ['Win Rate', rows.length ? Math.round(won/rows.length*100)+'%' : '—'],
      ['Total Est. Value (SAR)', rows.reduce((s,r) => s+r.estValue, 0)],
    ])
    sheet('Bids', ['SR','Project Name','Location','Outcome','Decision','Score','Est. Value (SAR)'],
      rows.map(r => [r.sr, r.name, r.location, r.outcome, r.decision, r.totalScore, r.estValue]))
  } else /* by-group */ {
    const groupBy = String(body.groupBy ?? 'location')
    const grouped: Record<string, any[]> = {}
    for (const r of rows) { (grouped[String(r[groupBy])] ??= []).push(r) }
    const col = groupBy === 'clientCategory' ? 'Client Category' : 'Location'
    sheet(col, [col, 'Total Bids', 'Won', 'Win Rate', 'Est. Value (SAR)'],
      Object.entries(grouped).map(([key, bids]) => {
        const won = bids.filter(b => b.outcome === 'WON').length
        return [key, bids.length, won, Math.round(won/bids.length*100)+'%',
          bids.reduce((s,b) => s+b.estValue, 0)]
      }))
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf as ArrayBuffer)
}

// ── PDF ───────────────────────────────────────────────────────────────────────
async function buildPDF(type: string, title: string, rows: any[], body: Record<string,unknown>): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit') as any
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  const fmt = (n: number) => n.toLocaleString('en-US')
  const PAGE_BOTTOM = doc.page.height - 80

  // Header bar
  doc.rect(0, 0, doc.page.width, 56).fill('#14141A')
  doc.fillColor('#FFFFFF').fontSize(15).font('Helvetica-Bold')
    .text('BLACK BID INTELLIGENCE', 50, 16, { lineBreak: false })
  doc.fillColor('#8A8A8C').fontSize(8).font('Helvetica')
    .text(`${title.toUpperCase()}  ·  ${new Date().toLocaleDateString('en-GB')}`, 50, 38, { lineBreak: false })
  doc.y = 76

  if (type === 'pipeline-summary') {
    doc.fillColor('#14141A').fontSize(12).font('Helvetica-Bold').text('Active Pipeline — Pending Bids')
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`${rows.length} bids pending`).moveDown(0.8)
    for (const r of rows) {
      if (doc.y > PAGE_BOTTOM) doc.addPage()
      doc.fillColor('#14141A').fontSize(10).font('Helvetica-Bold').text(`#${r.sr}  ${r.name}`)
      doc.fontSize(9).font('Helvetica').fillColor('#555555')
        .text(`${r.location}  ·  ${r.type}  ·  ${r.decision}  ·  Risk: ${r.riskIndex}  ·  Score: ${r.totalScore}/135  ·  Win: ${Math.round(r.expectWin*100)}%  ·  SAR ${fmt(r.estValue)}`)
      doc.moveDown(0.5)
    }
  } else if (type === 'win-loss') {
    const won  = rows.filter(r => r.outcome === 'WON').length
    const lost = rows.length - won
    doc.fillColor('#14141A').fontSize(12).font('Helvetica-Bold').text('Win / Loss Analysis')
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`Total: ${rows.length}  ·  Won: ${won}  ·  Lost: ${lost}  ·  Win Rate: ${rows.length ? Math.round(won/rows.length*100) : 0}%`)
      .moveDown(0.8)
    for (const r of rows) {
      if (doc.y > PAGE_BOTTOM) doc.addPage()
      doc.fillColor('#14141A').fontSize(10).font('Helvetica-Bold').text(`#${r.sr}  ${r.name}`)
      doc.fontSize(9).font('Helvetica').fillColor('#555555')
        .text(`${r.location}  ·  ${r.outcome}  ·  Decision: ${r.decision}  ·  Score: ${r.totalScore}/135  ·  SAR ${fmt(r.estValue)}`)
      doc.moveDown(0.5)
    }
  } else if (type === 'scorecard' && rows[0]) {
    const bid = rows[0]
    doc.fillColor('#14141A').fontSize(12).font('Helvetica-Bold').text(`Scorecard: ${bid.name}`)
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`${bid.location}  ·  ${bid.type}  ·  ${bid.size}`)
      .text(`Decision: ${bid.decision}  ·  Risk: ${bid.riskIndex}  ·  Score: ${bid.totalScore}/135  ·  Win: ${Math.round(bid.expectWin*100)}%`)
      .moveDown(0.8)
    for (const [group, keys] of Object.entries(CRITERIA_GROUPS)) {
      doc.fillColor('#14141A').fontSize(10).font('Helvetica-Bold').text(group)
      for (const k of keys) {
        doc.fontSize(9).font('Helvetica').fillColor('#555555').text(`${k}: ${bid[k]}/5`, { indent: 16 })
      }
      doc.moveDown(0.5)
    }
  } else if (type === 'executive-monthly') {
    const won  = rows.filter(r => r.outcome === 'WON').length
    const total = rows.reduce((s,r) => s+r.estValue, 0)
    doc.fillColor('#14141A').fontSize(12).font('Helvetica-Bold').text('Executive Monthly Report')
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`Total Bids: ${rows.length}  ·  Won: ${won}  ·  Win Rate: ${rows.length ? Math.round(won/rows.length*100) : 0}%`)
      .text(`Total Est. Value: SAR ${fmt(total)}`).moveDown(0.8)
    for (const r of rows) {
      if (doc.y > PAGE_BOTTOM) doc.addPage()
      doc.fillColor('#14141A').fontSize(10).font('Helvetica-Bold').text(`#${r.sr}  ${r.name}`)
      doc.fontSize(9).font('Helvetica').fillColor('#555555')
        .text(`${r.location}  ·  ${r.outcome}  ·  ${r.decision}  ·  SAR ${fmt(r.estValue)}`)
      doc.moveDown(0.5)
    }
  } else /* by-group */ {
    const groupBy = String(body.groupBy ?? 'location')
    const grouped: Record<string, any[]> = {}
    for (const r of rows) { (grouped[String(r[groupBy])] ??= []).push(r) }
    const col = groupBy === 'clientCategory' ? 'Client Category' : 'Location'
    doc.fillColor('#14141A').fontSize(12).font('Helvetica-Bold').text(`Analysis by ${col}`)
    doc.moveDown(0.8)
    for (const [key, bids] of Object.entries(grouped)) {
      if (doc.y > PAGE_BOTTOM) doc.addPage()
      const won = bids.filter(b => b.outcome === 'WON').length
      doc.fillColor('#14141A').fontSize(10).font('Helvetica-Bold').text(key)
      doc.fontSize(9).font('Helvetica').fillColor('#555555')
        .text(`${bids.length} bids  ·  ${won} won  ·  Win Rate: ${Math.round(won/bids.length*100)}%  ·  SAR ${fmt(bids.reduce((s,b)=>s+b.estValue,0))}`)
      doc.moveDown(0.6)
    }
  }

  // Page numbers
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    doc.fillColor('#8A8A8C').fontSize(7.5).font('Helvetica')
      .text(
        `Page ${i+1} of ${range.count}  ·  Black Bid Intelligence  ·  Confidential`,
        50, doc.page.height - 28, { lineBreak: false },
      )
  }

  doc.flushPages()
  doc.end()
  await new Promise<void>((resolve, reject) => {
    doc.on('end', resolve)
    doc.on('error', reject)
  })
  return Buffer.concat(chunks)
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: { type: string; format: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, format } = params
  if (!VALID_TYPES.has(type) || !VALID_FORMATS.has(format)) {
    return NextResponse.json({ error: 'Invalid type or format' }, { status: 400 })
  }

  const orgId  = (session.user as any).orgId  as string
  const userId = (session.user as any).id     as string
  const body   = await req.json().catch(() => ({})) as Record<string,unknown>

  let rows: any[] = []
  let title: string = type

  if (type === 'pipeline-summary') {
    title = 'Pipeline Summary'
    rows  = await prisma.bid.findMany({ where: { orgId, outcome: 'PENDING' }, orderBy: { sr: 'asc' } })
  } else if (type === 'win-loss') {
    title = 'Win/Loss Analysis'
    rows  = await prisma.bid.findMany({ where: { orgId, outcome: { in: ['WON', 'LOST'] } }, orderBy: { date: 'desc' } })
  } else if (type === 'scorecard') {
    title = 'Bid Scorecard'
    const bid = await prisma.bid.findFirst({ where: { orgId, id: String(body.bidId ?? '') } })
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
    rows = [bid]
  } else if (type === 'executive-monthly') {
    title = 'Executive Monthly'
    const year  = parseInt(String(body.year  ?? new Date().getFullYear()), 10)
    const month = parseInt(String(body.month ?? (new Date().getMonth()+1)), 10)
    rows = await prisma.bid.findMany({
      where: { orgId, date: { gte: new Date(year, month-1, 1), lte: new Date(year, month, 0, 23, 59, 59) } },
      orderBy: { sr: 'asc' },
    })
  } else /* by-group */ {
    title = 'By Group Analysis'
    rows  = await prisma.bid.findMany({ where: { orgId }, orderBy: { sr: 'asc' } })
  }

  const date = new Date().toISOString().split('T')[0]
  let buf: Buffer
  let contentType: string
  let ext: string

  try {
    if (format === 'csv') {
      buf = buildCSV(type, rows, body)
      contentType = 'text/csv; charset=utf-8'
      ext = 'csv'
    } else if (format === 'excel') {
      buf = await buildExcel(type, title, rows, body)
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ext = 'xlsx'
    } else {
      buf = await buildPDF(type, title, rows, body)
      contentType = 'application/pdf'
      ext = 'pdf'
    }
  } catch (err: any) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: err?.message ?? 'Generation failed' }, { status: 500 })
  }

  const filename = `black-${type}-${date}.${ext}`
  await prisma.reportLog.create({ data: { orgId, userId, type, format, filename } }).catch(() => {})

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

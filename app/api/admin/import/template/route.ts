import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import * as XLSX from 'xlsx'

const HEADERS = [
  'name', 'location', 'type', 'size', 'duration', 'tenderType', 'clientCategory',
  'consultant', 'pmc', 'estValue', 'contractValue', 'actualSpend', 'date', 'outcome',
  'remarks', 'links', 'mainCompetitor',
  'relStrength', 'budgetKnown', 'competitors', 'limitedInv', 'similarExp', 'noPriceBreakers',
  'techAdv', 'withinExpertise', 'lowChanges', 'goodLocation',
  'teamAvail', 'equipAvail', 'cashFlow', 'currWorkload', 'noImpactRunning',
  'ld', 'apg', 'perfBond', 'retention',
  'newSystem', 'complexMEP', 'specialAuth',
  'clientRep', 'clearDwgs', 'advPayment', 'payments', 'finDuration',
]

const EXAMPLE = [
  'Al-Riyadh Tower', 'Riyadh', 'BUILDING', 'LARGE', '18 months',
  'OPEN', 'GOV', 'Al-Rashid Consultants', '', '45000000',
  '0', '0', '2025-01-15', 'PENDING', '', '', '',
  '4', '3', '3', '4', '4', '3', '4', '5', '3', '4',
  '4', '4', '3', '3', '4',
  '3', '3', '2', '3',
  '2', '2', '1',
  '4', '3', '3', '3', '4',
]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, EXAMPLE])
  XLSX.utils.book_append_sheet(wb, ws, 'Bids')

  // Notes sheet
  const notes = [
    ['Field', 'Required', 'Allowed values / format'],
    ['name', 'Yes', 'Any text'],
    ['location', 'Yes', 'Any text'],
    ['type', 'Yes', 'BUILDING | INFRASTRUCTURE | INDUSTRIAL'],
    ['size', 'Yes', 'MEDIUM_SMALL | LARGE | MEGA'],
    ['duration', 'Yes', 'e.g. 18 months'],
    ['tenderType', 'Yes', 'OPEN | LIMITED | NEGOTIATED'],
    ['clientCategory', 'Yes', 'GOV | PRIVATE | SEMI'],
    ['consultant', 'No', 'Any text'],
    ['pmc', 'No', 'Any text'],
    ['estValue', 'Yes', 'Positive number (SAR)'],
    ['contractValue', 'No', 'Number (SAR), default 0'],
    ['actualSpend', 'No', 'Number (SAR), default 0'],
    ['date', 'No', 'YYYY-MM-DD, default today'],
    ['outcome', 'No', 'WON | LOST | PENDING | REJECTED, default PENDING'],
    ['remarks', 'No', 'Any text'],
    ['links', 'No', 'Any text'],
    ['mainCompetitor', 'No', 'Any text'],
    ['Criteria fields (27)', 'No', '0–5 integer, default 0'],
  ]
  const wsNotes = XLSX.utils.aoa_to_sheet(notes)
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="black-import-template.xlsx"',
    },
  })
}

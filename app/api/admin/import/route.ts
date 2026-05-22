import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { computeDecision } from '@/lib/decision'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

const CRITERIA_KEYS = [
  'relStrength', 'budgetKnown', 'competitors', 'limitedInv', 'similarExp', 'noPriceBreakers',
  'techAdv', 'withinExpertise', 'lowChanges', 'goodLocation',
  'teamAvail', 'equipAvail', 'cashFlow', 'currWorkload', 'noImpactRunning',
  'ld', 'apg', 'perfBond', 'retention',
  'newSystem', 'complexMEP', 'specialAuth',
  'clientRep', 'clearDwgs', 'advPayment', 'payments', 'finDuration',
] as const

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId     = (session.user as any).orgId
  const createdBy = (session.user as any).id

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  let rows: Record<string, unknown>[] = []

  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = buffer.toString('utf-8')
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true })
    rows = result.data
  } else {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
  }

  let ok = 0
  const failed: { row: number; error: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    try {
      const name           = String(r.name           ?? '').trim()
      const location       = String(r.location       ?? '').trim()
      const type           = String(r.type           ?? '').trim()
      const size           = String(r.size           ?? '').trim()
      const duration       = String(r.duration       ?? '12 months').trim() || '12 months'
      const tenderType     = String(r.tenderType     ?? '').trim()
      const clientCategory = String(r.clientCategory ?? '').trim()
      const outcome        = String(r.outcome        ?? 'PENDING').trim() || 'PENDING'
      const estValue       = parseFloat(String(r.estValue ?? '0'))

      if (!name || !location) throw new Error('name and location are required')
      if (!['BUILDING', 'INFRASTRUCTURE', 'INDUSTRIAL'].includes(type))
        throw new Error(`invalid type "${type}" — must be BUILDING | INFRASTRUCTURE | INDUSTRIAL`)
      if (!['MEDIUM_SMALL', 'LARGE', 'MEGA'].includes(size))
        throw new Error(`invalid size "${size}" — must be MEDIUM_SMALL | LARGE | MEGA`)
      if (!['OPEN', 'LIMITED', 'NEGOTIATED'].includes(tenderType))
        throw new Error(`invalid tenderType "${tenderType}" — must be OPEN | LIMITED | NEGOTIATED`)
      if (!['GOV', 'PRIVATE', 'SEMI'].includes(clientCategory))
        throw new Error(`invalid clientCategory "${clientCategory}" — must be GOV | PRIVATE | SEMI`)
      if (!['WON', 'LOST', 'PENDING', 'REJECTED'].includes(outcome))
        throw new Error(`invalid outcome "${outcome}"`)
      if (isNaN(estValue) || estValue <= 0) throw new Error('estValue must be a positive number')

      const criteria: Record<string, number> = {}
      for (const k of CRITERIA_KEYS) {
        const v = parseInt(String(r[k] ?? '0'), 10)
        criteria[k] = isNaN(v) ? 0 : Math.min(5, Math.max(0, v))
      }

      const derived = computeDecision(criteria)
      const last = await prisma.bid.findFirst({ where: { orgId }, orderBy: { sr: 'desc' }, select: { sr: true } })
      const sr   = (last?.sr ?? 0) + 1

      const dateRaw = r.date ? new Date(String(r.date)) : new Date()
      const date    = isNaN(dateRaw.getTime()) ? new Date() : dateRaw

      await prisma.bid.create({
        data: {
          sr, orgId, createdBy,
          name, location,
          type:           type as any,
          size:           size as any,
          duration,
          tenderType:     tenderType as any,
          clientCategory: clientCategory as any,
          consultant:     String(r.consultant     ?? ''),
          pmc:            String(r.pmc            ?? ''),
          estValue,
          contractValue:  parseFloat(String(r.contractValue ?? '0')) || 0,
          actualSpend:    parseFloat(String(r.actualSpend   ?? '0')) || 0,
          date,
          outcome:        outcome as any,
          remarks:        String(r.remarks        ?? ''),
          links:          String(r.links          ?? ''),
          mainCompetitor: String(r.mainCompetitor ?? ''),
          ...criteria,
          ...derived,
        },
      })
      ok++
    } catch (err: any) {
      failed.push({ row: i + 2, error: err?.message ?? 'Unknown error' })
    }
  }

  return NextResponse.json({ ok, failed })
}

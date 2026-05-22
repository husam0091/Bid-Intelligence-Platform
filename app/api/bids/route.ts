import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { computeDecision } from '@/lib/decision'
import { z } from 'zod'

const BidSchema = z.object({
  name:           z.string().min(1),
  location:       z.string().min(1),
  type:           z.enum(['BUILDING', 'INFRASTRUCTURE', 'INDUSTRIAL']),
  size:           z.enum(['MEDIUM_SMALL', 'LARGE', 'MEGA']),
  duration:       z.string().min(1),
  tenderType:     z.enum(['OPEN', 'LIMITED', 'NEGOTIATED']),
  clientCategory: z.enum(['GOV', 'PRIVATE', 'SEMI']),
  consultant:     z.string().default(''),
  pmc:            z.string().default(''),
  estValue:       z.number().positive(),
  contractValue:  z.number().default(0),
  actualSpend:    z.number().default(0),
  date:           z.string(),
  outcome:        z.enum(['WON', 'LOST', 'PENDING', 'REJECTED']).default('PENDING'),
  remarks:        z.string().default(''),
  links:          z.string().default(''),
  mainCompetitor: z.string().default(''),
  // 27 criteria
  relStrength: z.number().min(0).max(5), budgetKnown: z.number().min(0).max(5),
  competitors: z.number().min(0).max(5), limitedInv:  z.number().min(0).max(5),
  similarExp:  z.number().min(0).max(5), noPriceBreakers: z.number().min(0).max(5),
  techAdv:     z.number().min(0).max(5), withinExpertise: z.number().min(0).max(5),
  lowChanges:  z.number().min(0).max(5), goodLocation: z.number().min(0).max(5),
  teamAvail:   z.number().min(0).max(5), equipAvail:  z.number().min(0).max(5),
  cashFlow:    z.number().min(0).max(5), currWorkload: z.number().min(0).max(5),
  noImpactRunning: z.number().min(0).max(5),
  ld:          z.number().min(0).max(5), apg:         z.number().min(0).max(5),
  perfBond:    z.number().min(0).max(5), retention:   z.number().min(0).max(5),
  newSystem:   z.number().min(0).max(5), complexMEP:  z.number().min(0).max(5),
  specialAuth: z.number().min(0).max(5),
  clientRep:   z.number().min(0).max(5), clearDwgs:   z.number().min(0).max(5),
  advPayment:  z.number().min(0).max(5), payments:    z.number().min(0).max(5),
  finDuration: z.number().min(0).max(5),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })

  const orgId = (session.user as any).orgId
  const url   = new URL(req.url)
  const p     = url.searchParams

  const where: Record<string, unknown> = { orgId }
  if (p.get('outcome'))   where.outcome   = p.get('outcome')
  if (p.get('decision'))  where.decision  = p.get('decision')
  if (p.get('riskIndex')) where.riskIndex = p.get('riskIndex')
  if (p.get('location'))  where.location  = p.get('location')
  if (p.get('type'))      where.type      = p.get('type')

  const bids = await prisma.bid.findMany({
    where,
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ data: bids })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })

  const orgId     = (session.user as any).orgId
  const createdBy = (session.user as any).id

  const body   = await req.json()
  const parsed = BidSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  const criteria = {
    relStrength: d.relStrength, budgetKnown: d.budgetKnown, competitors: d.competitors,
    limitedInv: d.limitedInv, similarExp: d.similarExp, noPriceBreakers: d.noPriceBreakers,
    techAdv: d.techAdv, withinExpertise: d.withinExpertise, lowChanges: d.lowChanges,
    goodLocation: d.goodLocation, teamAvail: d.teamAvail, equipAvail: d.equipAvail,
    cashFlow: d.cashFlow, currWorkload: d.currWorkload, noImpactRunning: d.noImpactRunning,
    ld: d.ld, apg: d.apg, perfBond: d.perfBond, retention: d.retention,
    newSystem: d.newSystem, complexMEP: d.complexMEP, specialAuth: d.specialAuth,
    clientRep: d.clientRep, clearDwgs: d.clearDwgs, advPayment: d.advPayment,
    payments: d.payments, finDuration: d.finDuration,
  }

  const derived = computeDecision(criteria)

  // auto-increment sr per org
  const last = await prisma.bid.findFirst({ where: { orgId }, orderBy: { sr: 'desc' }, select: { sr: true } })
  const sr   = (last?.sr ?? 0) + 1

  const bid = await prisma.bid.create({
    data: {
      sr, orgId, createdBy,
      name: d.name, location: d.location, type: d.type, size: d.size,
      duration: d.duration, tenderType: d.tenderType, clientCategory: d.clientCategory,
      consultant: d.consultant, pmc: d.pmc, estValue: d.estValue,
      contractValue: d.contractValue, actualSpend: d.actualSpend,
      date: new Date(d.date), outcome: d.outcome,
      remarks: d.remarks, links: d.links, mainCompetitor: d.mainCompetitor,
      ...criteria,
      ...derived,
    },
  })

  return NextResponse.json({ data: bid }, { status: 201 })
}

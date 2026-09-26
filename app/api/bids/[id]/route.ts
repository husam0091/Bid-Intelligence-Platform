import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getActor, unauthorized, forbidden, can } from '@/lib/rbac'
import { logAudit, diff, snapshot } from '@/lib/audit'

const PatchSchema = z.object({
  outcome:        z.enum(['WON','LOST','PENDING','REJECTED']).optional(),
  contractValue:  z.number().min(0).optional(),
  actualSpend:    z.number().min(0).optional(),
  remarks:        z.string().max(4000).optional(),
  consultant:     z.string().max(200).optional(),
  mainCompetitor: z.string().max(200).optional(),
  grossMarginPct: z.number().min(-100).max(100).nullable().optional(),
})

async function getBidScoped(id: string, orgId: string) {
  return prisma.bid.findFirst({ where: { id, orgId } })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const actor = await getActor()
  if (!actor) return unauthorized()

  const bid = await getBidScoped(params.id, actor.orgId)
  if (!bid) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  return NextResponse.json({ data: bid, canEdit: can.editBid(actor.role, actor.id, bid) })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actor = await getActor()
  if (!actor) return unauthorized()

  const bid = await getBidScoped(params.id, actor.orgId)
  if (!bid) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  // Standard users may only edit bids they created; ADMIN / MANAGER may edit any.
  if (!can.editBid(actor.role, actor.id, bid)) return forbidden()

  const body   = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const changes = diff(bid as unknown as Record<string, unknown>, parsed.data)
  if (changes.length === 0) return NextResponse.json({ data: bid })

  const updated = await prisma.bid.update({
    where: { id: params.id },
    data:  parsed.data,
  })

  const statusOnly = changes.length === 1 && changes[0].field === 'outcome'
  await logAudit(actor, {
    action:   statusOnly ? 'BID_STATUS' : 'BID_UPDATE',
    entity:   'BID', entityId: bid.id, bidSr: bid.sr,
    summary:  `Updated bid #${bid.sr} "${bid.name}": ${changes.map(c => c.field).join(', ')}`,
    changes,
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (!can.deleteBid(actor.role)) return forbidden()

  const bid = await getBidScoped(params.id, actor.orgId)
  if (!bid) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  await prisma.bid.delete({ where: { id: params.id } })

  const { id: _id, ...rest } = bid
  await logAudit(actor, {
    action: 'BID_DELETE', entity: 'BID', entityId: bid.id, bidSr: bid.sr,
    summary: `Deleted bid #${bid.sr} "${bid.name}"`,
    changes: snapshot(rest, 'delete'),
  })

  return NextResponse.json({ ok: true })
}

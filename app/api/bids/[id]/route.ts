import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PatchSchema = z.object({
  outcome:       z.enum(['WON','LOST','PENDING','REJECTED']).optional(),
  contractValue: z.number().optional(),
  actualSpend:   z.number().optional(),
  remarks:       z.string().optional(),
})

async function getBidScoped(id: string, orgId: string) {
  return prisma.bid.findFirst({ where: { id, orgId } })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })

  const orgId = (session.user as any).orgId
  const bid   = await getBidScoped(params.id, orgId)
  if (!bid) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  return NextResponse.json({ data: bid })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })

  const role  = (session.user as any).role
  const orgId = (session.user as any).orgId

  if (role === 'ESTIMATOR') {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' }, { status: 403 })
  }

  const bid = await getBidScoped(params.id, orgId)
  if (!bid) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  const body   = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const updated = await prisma.bid.update({
    where: { id: params.id },
    data:  parsed.data,
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })

  const role  = (session.user as any).role
  const orgId = (session.user as any).orgId

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' }, { status: 403 })
  }

  const bid = await getBidScoped(params.id, orgId)
  if (!bid) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  // soft delete — set outcome to REJECTED (hard delete not supported)
  const updated = await prisma.bid.update({
    where: { id: params.id },
    data:  { outcome: 'REJECTED' },
  })

  return NextResponse.json({ data: updated })
}

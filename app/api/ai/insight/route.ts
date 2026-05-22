import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { getBidInsight } from '@/lib/ai'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bidId = searchParams.get('bidId')
  const lang  = searchParams.get('lang') ?? 'en'

  if (!bidId) return NextResponse.json({ error: 'bidId required' }, { status: 400 })

  const bid = await prisma.bid.findFirst({
    where:  { id: bidId, orgId: session.user.orgId },
    select: { id: true, name: true, type: true, location: true, estValue: true, totalScore: true, riskIndex: true, decision: true },
  })
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const insight = await getBidInsight({
    bidId:      bid.id,
    orgId:      session.user.orgId,
    lang,
    name:       bid.name,
    type:       bid.type,
    location:   bid.location,
    estValue:   bid.estValue,
    totalScore: bid.totalScore,
    riskIndex:  bid.riskIndex,
    decision:   bid.decision,
  })

  return NextResponse.json({ insight })
}

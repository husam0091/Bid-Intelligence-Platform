import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = (session.user as any).orgId
  const [org, bids] = await Promise.all([
    prisma.org.findUnique({ where: { id: orgId }, select: { slug: true } }),
    prisma.bid.findMany({ where: { orgId }, orderBy: { sr: 'asc' } }),
  ])

  const date = new Date().toISOString().split('T')[0]
  const filename = `black-backup-${org?.slug ?? orgId}-${date}.json`
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), orgId, bids }, null, 2)

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = (session.user as any).orgId as string
  const logs = await prisma.reportLog.findMany({
    where:   { orgId },
    orderBy: { createdAt: 'desc' },
    take:    20,
  })
  return NextResponse.json({ logs })
}

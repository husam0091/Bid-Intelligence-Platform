import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = (session.user as any).orgId
  const { count } = await prisma.bid.deleteMany({ where: { orgId } })

  return NextResponse.json({ deleted: count })
}

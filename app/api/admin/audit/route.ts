import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'

/** ADMIN only. Filters: userId, from, to (YYYY-MM-DD), bid (serial #), action, page. */
export async function GET(req: Request) {
  const actor = await requireAdmin()
  if (actor instanceof NextResponse) return actor

  const p     = new URL(req.url).searchParams
  const where: Record<string, unknown> = { orgId: actor.orgId }
  if (p.get('userId')) where.userId = p.get('userId')
  if (p.get('action')) where.action = p.get('action')
  const bid = parseInt(p.get('bid') ?? '', 10)
  if (!isNaN(bid)) where.bidSr = bid

  const createdAt: Record<string, Date> = {}
  const from = p.get('from'); const to = p.get('to')
  if (from && !isNaN(Date.parse(from))) createdAt.gte = new Date(`${from}T00:00:00`)
  if (to   && !isNaN(Date.parse(to)))   createdAt.lte = new Date(`${to}T23:59:59.999`)
  if (Object.keys(createdAt).length) where.createdAt = createdAt

  const pageSize = 50
  const page     = Math.max(1, parseInt(p.get('page') ?? '1', 10) || 1)

  const [total, logs, users] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.findMany({ where: { orgId: actor.orgId }, distinct: ['userId'], select: { userId: true, userName: true, userEmail: true } }),
  ])

  return NextResponse.json({ logs, total, page, pageSize, users })
}

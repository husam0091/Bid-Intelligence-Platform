import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const actor = await requireAdmin()
  if (actor instanceof NextResponse) return actor

  const orgId = actor.orgId
  const [org, bids] = await Promise.all([
    prisma.org.findUnique({ where: { id: orgId }, select: { slug: true } }),
    prisma.bid.findMany({ where: { orgId }, orderBy: { sr: 'asc' } }),
  ])

  const date = new Date().toISOString().split('T')[0]
  const filename = `black-backup-${org?.slug ?? orgId}-${date}.json`
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), orgId, bids }, null, 2)

  await logAudit(actor, {
    action: 'BACKUP_EXPORT', entity: 'SYSTEM',
    summary: `Exported backup of ${bids.length} bid(s)`,
  })

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

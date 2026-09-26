import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAdmin } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const Schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
  confirm:  z.literal('DELETE'),
})

export async function POST(req: Request) {
  const actor = await requireAdmin()
  if (actor instanceof NextResponse) return actor

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type DELETE and re-enter your email and password to confirm.', code: 'CONFIRMATION_REQUIRED' }, { status: 400 })
  }

  // Re-authenticate: the credentials must belong to the signed-in admin, not just any admin.
  const user = await prisma.user.findUnique({ where: { id: actor.id } })
  const emailOk = user && user.email.toLowerCase() === parsed.data.email.trim().toLowerCase()
  const passOk  = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false
  if (!emailOk || !passOk) {
    await logAudit(actor, { action: 'DATA_RESET', entity: 'SYSTEM', summary: 'Data reset attempt REJECTED — re-authentication failed' })
    return NextResponse.json({ error: 'Email or password is incorrect.', code: 'REAUTH_FAILED' }, { status: 403 })
  }

  const orgId = actor.orgId

  // Delete in dependency order — cascades handle AiCache (from Bid) and Message (from Conversation).
  // The audit log is intentionally preserved.
  const [reports, conversations, bids] = await prisma.$transaction([
    prisma.reportLog.deleteMany({ where: { orgId } }),
    prisma.conversation.deleteMany({ where: { orgId } }),
    prisma.bid.deleteMany({ where: { orgId } }),
  ])

  await logAudit(actor, {
    action: 'DATA_RESET', entity: 'SYSTEM',
    summary: `Reset all data — ${bids.count} bids, ${conversations.count} conversations, ${reports.count} report logs deleted`,
    changes: { bids: bids.count, conversations: conversations.count, reports: reports.count },
  })

  return NextResponse.json({
    deleted: bids.count + conversations.count + reports.count,
    bids: bids.count,
    conversations: conversations.count,
    reports: reports.count,
  })
}

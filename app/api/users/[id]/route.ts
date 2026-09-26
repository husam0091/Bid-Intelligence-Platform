import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAdmin } from '@/lib/rbac'
import { logAudit, diff } from '@/lib/audit'

const PatchSchema = z.object({
  name:     z.string().min(2).max(80).optional(),
  role:     z.enum(['ESTIMATOR', 'MANAGER', 'EXECUTIVE', 'ADMIN']).optional(),
  active:   z.boolean().optional(),
  // Admin password reset: sets a temporary password the user must change on next sign-in.
  password: z.string().min(8).max(72).optional(),
})

const USER_SELECT = { id: true, name: true, email: true, role: true, active: true, mustChange: true } as const

async function activeAdminCount(orgId: string) {
  return prisma.user.count({ where: { orgId, role: 'ADMIN', active: true } })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin()
  if (actor instanceof NextResponse) return actor

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const { password, ...fields } = parsed.data

  const target = await prisma.user.findFirst({ where: { id: params.id, orgId: actor.orgId } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const self = target.id === actor.id
  if (self && fields.active === false)
    return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
  if (self && fields.role && fields.role !== 'ADMIN')
    return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })

  const losesAdmin = target.role === 'ADMIN' && target.active &&
    ((fields.role && fields.role !== 'ADMIN') || fields.active === false)
  if (losesAdmin && (await activeAdminCount(actor.orgId)) <= 1)
    return NextResponse.json({ error: 'At least one active admin is required' }, { status: 400 })

  const data: Record<string, unknown> = { ...fields }
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12)
    data.mustChange   = true
  }

  const user = await prisma.user.update({ where: { id: params.id }, data, select: USER_SELECT })

  const changes = diff(target as unknown as Record<string, unknown>, fields)
  if (changes.length) {
    await logAudit(actor, {
      action: 'USER_UPDATE', entity: 'USER', entityId: user.id,
      summary: `Updated user ${user.name} <${user.email}>: ${changes.map(c => c.field).join(', ')}`,
      changes,
    })
  }
  if (password) {
    await logAudit(actor, {
      action: 'USER_PASSWORD_RESET', entity: 'USER', entityId: user.id,
      summary: `Reset password for ${user.name} <${user.email}> (must change on next sign-in)`,
    })
  }
  return NextResponse.json({ user })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin()
  if (actor instanceof NextResponse) return actor

  const target = await prisma.user.findFirst({ where: { id: params.id, orgId: actor.orgId } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.id === actor.id)
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  if (target.role === 'ADMIN' && target.active && (await activeAdminCount(actor.orgId)) <= 1)
    return NextResponse.json({ error: 'At least one active admin is required' }, { status: 400 })

  // Bids must keep an owner: they are reassigned to the admin performing the deletion.
  // The original creator stays visible in the audit trail.
  const [reassigned] = await prisma.$transaction([
    prisma.bid.updateMany({ where: { createdBy: target.id }, data: { createdBy: actor.id } }),
    prisma.conversation.deleteMany({ where: { userId: target.id } }),
    prisma.user.delete({ where: { id: target.id } }),
  ])

  await logAudit(actor, {
    action: 'USER_DELETE', entity: 'USER', entityId: target.id,
    summary: `Deleted user ${target.name} <${target.email}>${reassigned.count ? ` — ${reassigned.count} bid(s) reassigned to ${actor.name}` : ''}`,
    changes: [
      { field: 'name',  from: target.name,  to: null },
      { field: 'email', from: target.email, to: null },
      { field: 'role',  from: target.role,  to: null },
    ],
  })
  return NextResponse.json({ ok: true, reassignedBids: reassigned.count })
}

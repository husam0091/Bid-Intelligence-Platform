import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAdmin } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

const CreateSchema = z.object({
  name:     z.string().min(2).max(80),
  email:    z.string().email(),
  role:     z.enum(['ESTIMATOR', 'MANAGER', 'EXECUTIVE', 'ADMIN']),
  password: z.string().min(8).max(72),
})

const USER_SELECT = { id: true, name: true, email: true, role: true, active: true, mustChange: true, createdAt: true } as const

export async function GET() {
  const actor = await requireAdmin()
  if (actor instanceof NextResponse) return actor

  const users = await prisma.user.findMany({
    where:   { orgId: actor.orgId },
    select:  USER_SELECT,
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

export async function POST(req: Request) {
  const actor = await requireAdmin()
  if (actor instanceof NextResponse) return actor

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { name, email, role, password } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data:   { orgId: actor.orgId, name, email, passwordHash, role, mustChange: true },
    select: USER_SELECT,
  })

  await logAudit(actor, {
    action: 'USER_CREATE', entity: 'USER', entityId: user.id,
    summary: `Created user ${user.name} <${user.email}> as ${user.role}`,
    changes: [
      { field: 'name',  from: null, to: user.name },
      { field: 'email', from: null, to: user.email },
      { field: 'role',  from: null, to: user.role },
    ],
  })
  return NextResponse.json({ user }, { status: 201 })
}

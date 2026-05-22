import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const CreateSchema = z.object({
  name:     z.string().min(2).max(80),
  email:    z.string().email(),
  role:     z.enum(['ESTIMATOR', 'MANAGER', 'EXECUTIVE', 'ADMIN']),
  password: z.string().min(8).max(72),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    where:   { orgId: session.user.orgId },
    select:  { id: true, name: true, email: true, role: true, active: true, mustChange: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { name, email, role, password } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data:   { orgId: session.user.orgId, name, email, passwordHash, role, mustChange: true },
    select: { id: true, name: true, email: true, role: true, active: true, mustChange: true, createdAt: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const Schema = z.object({
  current:  z.string().min(1),
  password: z.string().min(8).max(72),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const valid = await bcrypt.compare(parsed.data.current, user.passwordHash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  await prisma.user.update({
    where: { id: user.id },
    data:  { passwordHash, mustChange: false },
  })
  return NextResponse.json({ ok: true })
}

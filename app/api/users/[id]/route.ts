import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PatchSchema = z.object({
  role:   z.enum(['ESTIMATOR', 'MANAGER', 'EXECUTIVE', 'ADMIN']).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Guard: prevent deactivating your own account
  if (params.id === session.user.id && (await req.clone().json()).active === false)
    return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const target = await prisma.user.findFirst({ where: { id: params.id, orgId: session.user.orgId } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const user = await prisma.user.update({
    where:  { id: params.id },
    data:   parsed.data,
    select: { id: true, name: true, email: true, role: true, active: true, mustChange: true },
  })
  return NextResponse.json({ user })
}

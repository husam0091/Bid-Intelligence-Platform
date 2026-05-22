import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { nlSearchToFilter } from '@/lib/ai'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query } = await req.json() as { query?: string }
  if (!query?.trim()) return NextResponse.json({ filters: {} })

  const filters = await nlSearchToFilter(query.trim())
  return NextResponse.json({ filters })
}

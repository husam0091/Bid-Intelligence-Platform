import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getPortfolioCallout } from '@/lib/ai'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lang = new URL(req.url).searchParams.get('lang') ?? 'en'

  const callout = await getPortfolioCallout({ orgId: session.user.orgId, lang })
  return NextResponse.json({ callout })
}

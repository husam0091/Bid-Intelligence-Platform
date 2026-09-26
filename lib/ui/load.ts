import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { getScoringConfig } from '@/lib/scoring-config'
import { toProject, toRules, type Lang } from '@/lib/ui/model'

/** Session, language, scoring rules and every bid of the org — the data each dashboard page needs. */
export async function loadPortfolio() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const orgId = session.user.orgId
  const lang: Lang = (await cookies()).get('lang')?.value === 'ar' ? 'ar' : 'en'
  const [bids, cfg] = await Promise.all([
    prisma.bid.findMany({ where: { orgId }, orderBy: { sr: 'asc' }, include: { creator: { select: { name: true } } } }),
    getScoringConfig(orgId),
  ])
  return {
    session, lang,
    me: { id: session.user.id, role: session.user.role, name: session.user.name },
    projects: bids.map(toProject),
    rules: toRules(cfg),
  }
}

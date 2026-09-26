import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { LangProvider } from '@/components/ui/I18n'
import AiChatPanel from '@/components/ai/AiChatPanel'
import { EXECUTION_WHERE } from '@/lib/metrics'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const lang  = (await cookies()).get('lang')?.value === 'ar' ? 'ar' : 'en'
  const orgId = (session.user as any).orgId
  const [highRisk, execution, history] = await Promise.all([
    prisma.bid.count({ where: { orgId, riskIndex: 'HIGH' } }),
    prisma.bid.count({ where: { orgId, ...EXECUTION_WHERE } }),
    prisma.bid.count({ where: { orgId } }),
  ])

  return (
    <SessionProvider session={session}>
      <LangProvider initial={lang}>
        <div className="app">
          <Sidebar counts={{ highRisk, execution, history }} />
          <main>
            <Header />
            <div className="page-wrap">{children}</div>
          </main>
        </div>
        <AiChatPanel />
      </LangProvider>
    </SessionProvider>
  )
}

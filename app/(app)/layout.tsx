import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SessionProvider } from '@/components/providers/SessionProvider'
import AiChatPanel from '@/components/ai/AiChatPanel'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const orgId = (session.user as any).orgId
  const [pipelineCount, historyCount] = await Promise.all([
    prisma.bid.count({ where: { orgId, outcome: 'PENDING' } }),
    prisma.bid.count({ where: { orgId } }),
  ])

  return (
    <SessionProvider session={session}>
      <div className="app">
        <Sidebar pipelineCount={pipelineCount} historyCount={historyCount} />
        <main>
          {children}
        </main>
      </div>
      <AiChatPanel />
    </SessionProvider>
  )
}

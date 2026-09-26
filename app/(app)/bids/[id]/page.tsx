import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { toProject } from '@/lib/ui/model'
import BidDetailView from './BidDetailView'

export default async function BidDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const bid = await prisma.bid.findFirst({
    where: { id: params.id, orgId: session.user.orgId },
    include: { creator: { select: { name: true } } },
  })
  if (!bid) notFound()
  return (
    <BidDetailView
      project={toProject(bid)}
      canEdit={can.editBid(session.user.role, session.user.id, bid)}
      canDelete={can.deleteBid(session.user.role)}
    />
  )
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const result = await Promise.all(
    conversations.map(async (conv) => {
      const lastMessage = await prisma.message.findFirst({
        where: { conversationId: conv.id },
        orderBy: { createdAt: 'desc' },
      });
      const preview = lastMessage
        ? lastMessage.content.slice(0, 100)
        : '';
      return {
        id: conv.id,
        title: conv.title,
        updatedAt: conv.updatedAt,
        preview,
      };
    })
  );

  return NextResponse.json({ conversations: result });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const orgId = (session.user as any).orgId as string;

  const body = await request.json().catch(() => ({}));
  const title: string = body.title ?? 'New conversation';

  const conversation = await prisma.conversation.create({
    data: { orgId, userId, title },
  });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
    },
  });
}

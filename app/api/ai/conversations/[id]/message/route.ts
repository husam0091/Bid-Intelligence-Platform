import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { chatWithPortfolio } from '@/lib/ai';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const orgId = (session.user as any).orgId as string;

  const body = await request.json();
  const content: string = body.content;

  // Verify conversation ownership
  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: params.id,
      role: 'USER',
      content,
    },
  });

  // Fetch all messages to build history
  const allMessages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: 'asc' },
  });

  // Build history excluding the last user message (it's the current question)
  const historyMessages = allMessages.slice(0, -1);
  const history: { role: 'user' | 'assistant'; content: string }[] =
    historyMessages.map((m) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

  // Call AI
  const aiReply = await chatWithPortfolio({
    orgId,
    lang: 'en',
    question: content,
    history,
  });

  // Save assistant reply
  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: params.id,
      role: 'ASSISTANT',
      content: aiReply,
    },
  });

  // Auto-title if still default
  if (conversation.title === 'New conversation') {
    await prisma.conversation.update({
      where: { id: params.id },
      data: { title: content.slice(0, 60) },
    });
  }

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    message: {
      id: assistantMessage.id,
      role: 'ASSISTANT',
      content: aiReply,
      createdAt: assistantMessage.createdAt,
    },
  });
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { chatWithPortfolio } from '@/lib/ai'

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question, lang, history } = await req.json() as { question?: string; lang?: string; history?: Message[] }
  if (!question?.trim()) return NextResponse.json({ error: 'question required' }, { status: 400 })

  try {
    const answer = await chatWithPortfolio({
      orgId:    session.user.orgId,
      lang:     lang ?? 'en',
      question: question.trim(),
      history:  history ?? [],
    })
    return NextResponse.json({ answer })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ answer: `I encountered an error: ${msg}. Please try again.` })
  }
}

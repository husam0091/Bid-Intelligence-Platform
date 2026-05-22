'use client'

import { useState, useRef, useEffect } from 'react'
import { renderMd } from '@/lib/render-md'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AiChatPanel({ lang = 'en' }: { lang?: string }) {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const ar = lang === 'ar'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    const next: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setLoading(true)
    try {
      const res  = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question: q, lang, history: messages }),
      })
      const data = await res.json()
      setMessages([...next, { role: 'assistant', content: data.answer ?? '—' }])
    } catch {
      setMessages([...next, { role: 'assistant', content: ar ? 'حدث خطأ.' : 'Something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="AI Chat"
        className="ai-chat-fab"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {open && (
        <div className={`ai-chat-panel${ar ? ' rtl' : ''}`} dir={ar ? 'rtl' : 'ltr'}>
          {/* Header */}
          <div className="ai-chat-header">
            <span>{ar ? 'مساعد المحفظة' : 'Portfolio AI'}</span>
            <button onClick={() => setOpen(false)} className="ai-chat-close">✕</button>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.length === 0 && (
              <p className="ai-chat-empty">
                {ar
                  ? 'اسألني أي شيء عن عطاءاتك وأرقامك.'
                  : 'Ask me anything about your bids and portfolio data.'}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg--${m.role}`}>
                {m.role === 'assistant' ? renderMd(m.content) : <p>{m.content}</p>}
              </div>
            ))}
            {loading && (
              <div className="ai-msg ai-msg--assistant ai-msg--loading">
                <span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="ai-chat-input-row">
            <input
              className="ai-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={ar ? 'اكتب سؤالك…' : 'Ask a question…'}
              disabled={loading}
            />
            <button className="ai-chat-send" onClick={send} disabled={loading || !input.trim()}>
              {ar ? '←' : '→'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { renderMd } from '@/lib/render-md'

type Msg = { id?: string; role: 'user' | 'assistant'; content: string; createdAt?: string }
type Conv = { id: string; title: string; updatedAt: string; preview?: string }

const SUGGESTIONS = [
  'What is our win rate this year?',
  'Which location has the best win rate?',
  'Show me our high-risk bids',
  'What types of bids do we win most?',
  'Which bids are in the active pipeline?',
]

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AiChatPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const paramConvId  = searchParams.get('conversation')

  const [convs,       setConvs]       = useState<Conv[]>([])
  const [activeId,    setActiveId]    = useState<string | null>(paramConvId)
  const [messages,    setMessages]    = useState<Msg[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [convLoading, setConvLoading] = useState(false)
  const [hoverConvId, setHoverConvId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch conversation list
  const fetchConvs = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations')
      const d   = await res.json()
      setConvs(d.conversations ?? [])
    } catch {}
  }, [])

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (id: string) => {
    setConvLoading(true)
    try {
      const res = await fetch(`/api/ai/conversations/${id}`)
      const d   = await res.json()
      setMessages((d.conversation?.messages ?? []).map((m: any) => ({
        id:        m.id,
        role:      m.role === 'USER' ? 'user' : 'assistant',
        content:   m.content,
        createdAt: m.createdAt,
      })))
    } catch {
      setMessages([])
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => { fetchConvs() }, [fetchConvs])

  useEffect(() => {
    if (paramConvId) {
      setActiveId(paramConvId)
      fetchMessages(paramConvId)
    } else {
      setActiveId(null)
      setMessages([])
    }
  }, [paramConvId, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function newChat() {
    try {
      const res  = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const d    = await res.json()
      const id   = d.conversation?.id
      if (!id) return
      await fetchConvs()
      router.push(`/ai?conversation=${id}`)
    } catch {}
  }

  async function deleteConv(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' })
    if (activeId === id) router.push('/ai')
    await fetchConvs()
  }

  async function send(q?: string) {
    const text = (q ?? input).trim()
    if (!text || loading) return

    // If no conversation yet, create one first
    let convId = activeId
    if (!convId) {
      const res = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const d   = await res.json()
      convId    = d.conversation?.id
      if (!convId) return
      setActiveId(convId)
      router.push(`/ai?conversation=${convId}`)
    }

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res  = await fetch(`/api/ai/conversations/${convId}/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: text }),
      })
      const d = await res.json()
      const reply = d.message?.content ?? 'No response.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      await fetchConvs()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--canvas)', overflow: 'hidden' }}>

      {/* ── Left sidebar ── */}
      <div style={{
        width: 260, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--hairline)',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--hairline-soft)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>✦</span>
            <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Portfolio AI
            </span>
          </div>
          <button
            onClick={newChat}
            style={{
              width: '100%', padding: '8px 12px',
              background: 'var(--ink)', color: 'var(--canvas)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            + New chat
          </button>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {convs.length === 0 && (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--mute)', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
              No conversations yet
            </div>
          )}
          {convs.map(c => {
            const isActive = c.id === activeId
            return (
              <div
                key={c.id}
                onMouseEnter={() => setHoverConvId(c.id)}
                onMouseLeave={() => setHoverConvId(null)}
                onClick={() => router.push(`/ai?conversation=${c.id}`)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: isActive ? 'var(--go-tint)' : hoverConvId === c.id ? 'var(--canvas)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--review)' : '3px solid transparent',
                  position: 'relative',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: isActive ? 600 : 400,
                      color: 'var(--ink)', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.title}
                    </div>
                    {c.preview && (
                      <div style={{
                        fontSize: 10.5, color: 'var(--mute)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginTop: 2,
                      }}>
                        {c.preview}
                      </div>
                    )}
                    <div style={{ fontSize: 9.5, color: 'var(--mute-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 3 }}>
                      {relTime(c.updatedAt)}
                    </div>
                  </div>
                  {hoverConvId === c.id && (
                    <button
                      onClick={(e) => deleteConv(c.id, e)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--nogo)', fontSize: 13, padding: 2, flexShrink: 0,
                        lineHeight: 1,
                      }}
                      title="Delete conversation"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--surface-3)',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Archivo Narrow',sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeId ? (convs.find(c => c.id === activeId)?.title || 'Conversation') : 'Portfolio AI'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: "'JetBrains Mono',monospace" }}>
              Ask anything about your bids and data
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Welcome state — no conversation selected */}
          {!activeId && (
            <div style={{ margin: 'auto', maxWidth: 520, textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, background: 'var(--ink)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px', fontSize: 20, color: 'var(--canvas)',
              }}>✦</div>
              <h2 style={{ fontFamily: "'Archivo Narrow',sans-serif", fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                Portfolio AI
              </h2>
              <p style={{ color: 'var(--mute)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                Ask questions about your bid history, win rates, pipeline, and patterns. Powered by live data.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    background: 'var(--surface-3)', border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)', padding: '7px 13px',
                    fontSize: 12, cursor: 'pointer', color: 'var(--ink)',
                    fontFamily: 'inherit', transition: 'border-color 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ink)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--hairline)')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation selected but loading */}
          {activeId && convLoading && (
            <div style={{ margin: 'auto', color: 'var(--mute)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
              Loading conversation…
            </div>
          )}

          {/* Messages */}
          {!convLoading && messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: 620,
                background: m.role === 'user' ? 'var(--ink)' : 'var(--surface-3)',
                color: m.role === 'user' ? 'var(--canvas)' : 'var(--ink)',
                border: m.role === 'assistant' ? '1px solid var(--hairline)' : 'none',
                borderRadius: 'var(--radius)',
                borderBottomRightRadius: m.role === 'user' ? 2 : 'var(--radius)',
                borderBottomLeftRadius:  m.role === 'assistant' ? 2 : 'var(--radius)',
                padding: '11px 15px', fontSize: 13.5, lineHeight: 1.6,
                boxShadow: m.role === 'assistant' ? 'var(--shadow-1)' : 'none',
              }}>
                {m.role === 'assistant' && (
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.18em', color: 'var(--mute)', marginBottom: 5, textTransform: 'uppercase' }}>AI</div>
                )}
                {m.role === 'assistant' ? renderMd(m.content) : <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>}
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div style={{ display: 'flex' }}>
              <div style={{
                background: 'var(--surface-3)', border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius)', borderBottomLeftRadius: 2,
                padding: '11px 15px', display: 'flex', gap: 5, alignItems: 'center',
              }}>
                <span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input bar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-3)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 8,
            background: 'var(--canvas)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius)', overflow: 'hidden',
          }}>
            <input
              className="ai-chat-input"
              style={{ background: 'transparent', flex: 1, padding: '12px 15px', fontSize: 13.5 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about your portfolio…"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                background: input.trim() ? 'var(--ink)' : 'transparent',
                border: 'none', borderLeft: '1px solid var(--hairline)',
                padding: '0 18px',
                color: input.trim() ? 'var(--canvas)' : 'var(--mute)',
                fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >→</button>
          </div>
          <p style={{ textAlign: 'center', marginTop: 6, fontSize: 10.5, color: 'var(--mute-3)', fontFamily: "'JetBrains Mono',monospace" }}>
            Answers are based on your real portfolio data
          </p>
        </div>
      </div>

    </div>
  )
}

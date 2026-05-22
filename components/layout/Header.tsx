'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

interface HeaderProps {
  title:    string
  titleAr?: string
}

export function Header({ title, titleAr }: HeaderProps) {
  const { data: session } = useSession()
  const user = session?.user as any
  const isAr = typeof document !== 'undefined' && document.body.classList.contains('ar')
  const displayTitle = isAr && titleAr ? titleAr : title

  const [time, setTime] = useState('')
  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="app-header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icononly_transparent.png" width={16} height={16} alt="" style={{ opacity:0.55, flexShrink:0 }} />
      <span className="app-header-wordmark">Black</span>
      <span className="app-header-divider" />
      <span className="breadcrumb">Bid Intelligence · <b>{displayTitle.toUpperCase()}</b></span>
      <div className="app-header-meta">
        {time && (
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--go)', flexShrink:0, display:'inline-block' }} />
            {time}
          </span>
        )}
        {user?.name && <span>User · {user.name}</span>}
        <span>KSA · 2026</span>
      </div>
    </header>
  )
}

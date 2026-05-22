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
    <header className="main-header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icononly_transparent.png" width={16} height={16} alt="" className="wordmark" />
      <span className="header-divider" />
      <nav className="crumb">Bid Intelligence · <b>{displayTitle.toUpperCase()}</b></nav>
      <div className="header-meta">
        {time && (
          <div className="meta-cell">
            <span className="lbl">STATUS</span>
            <span className="val"><span className="live-dot" />{time}</span>
          </div>
        )}
        {user?.name && (
          <div className="meta-cell">
            <span className="lbl">USER</span>
            <span className="val">{user.name}</span>
          </div>
        )}
        <div className="meta-cell">
          <span className="lbl">REGION</span>
          <span className="val">KSA · 2026</span>
        </div>
      </div>
    </header>
  )
}

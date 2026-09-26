'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLang } from '@/components/ui/I18n'
import { NAV, isActive, roleKey } from '@/components/layout/Sidebar'

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { lang, t } = useLang()
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [lang])

  const current = NAV.find(n => isActive(pathname, n.href))

  return (
    <div className="main-header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fulllogo_transparent_nobuffer.png" className="wordmark" alt="Black Construction" />
      <div className="header-divider" />
      <div className="crumb">
        {t('crumb_app')} · <b>{current ? t(current.key) : ''}</b>
      </div>
      <div className="header-meta">
        <div className="meta-cell">
          <span className="lbl">{t('last_sync')}</span>
          <span className="val"><span className="live-dot" />{time}</span>
        </div>
        <div className="meta-cell">
          <span className="lbl">{t('user')}</span>
          <span className="val">{session?.user.name ? `${session.user.name} · ${t(roleKey(session.user.role))}` : '—'}</span>
        </div>
        <div className="meta-cell">
          <span className="lbl">KSA</span>
          <span className="val">2026</span>
        </div>
      </div>
    </div>
  )
}

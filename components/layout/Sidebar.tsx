'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

const NAV_GROUPS = [
  {
    label: 'Operations', labelAr: 'العمليات',
    items: [
      { href: '/dashboard', label: 'Pipeline',  labelAr: 'العمليات',    icon: '▦', roles: ['ESTIMATOR','MANAGER','EXECUTIVE','ADMIN'] },
      { href: '/executive', label: 'Executive', labelAr: 'التنفيذي',    icon: '◈', roles: ['EXECUTIVE','ADMIN'] },
    ],
  },
  {
    label: 'Bids', labelAr: 'العطاءات',
    items: [
      { href: '/bids/new', label: 'New Bid',     labelAr: 'عطاء جديد',    icon: '+', roles: ['ESTIMATOR','MANAGER','ADMIN'] },
      { href: '/bids',     label: 'Bid History', labelAr: 'سجل العطاءات', icon: '≡', roles: ['ESTIMATOR','MANAGER','EXECUTIVE','ADMIN'] },
    ],
  },
  {
    label: 'Intelligence', labelAr: 'الذكاء',
    items: [
      { href: '/predictor', label: 'Win Predictor', labelAr: 'توقع الفوز', icon: '◎', roles: ['ESTIMATOR','MANAGER','EXECUTIVE','ADMIN'] },
      { href: '/analytics', label: 'Analytics',     labelAr: 'التحليلات',  icon: '∿', roles: ['MANAGER','EXECUTIVE','ADMIN'] },
      { href: '/reports',   label: 'Reports',       labelAr: 'التقارير',   icon: '▤', roles: ['MANAGER','EXECUTIVE','ADMIN'] },
    ],
  },
  {
    label: 'System', labelAr: 'النظام',
    items: [
      { href: '/ai',       label: 'AI Chat',  labelAr: 'مساعد الذكاء', icon: '✦', roles: ['ESTIMATOR','MANAGER','EXECUTIVE','ADMIN'] },
      { href: '/settings', label: 'Settings', labelAr: 'الإعدادات',    icon: '⚙', roles: ['ADMIN'] },
    ],
  },
]

export function Sidebar({ pipelineCount, historyCount }: { pipelineCount?: number; historyCount?: number }) {
  const pathname          = usePathname()
  const { data: session } = useSession()
  const user              = session?.user as any
  const role              = user?.role ?? 'ESTIMATOR'
  const [lang,     setLangState] = useState<'en' | 'ar'>('en')
  const [sideOpen, setSideOpen]  = useState(false)
  const [dark,     setDark]      = useState(false)

  useEffect(() => {
    const savedLang = localStorage.getItem('blackbid_lang') as 'en' | 'ar' | null
    if (savedLang) applyLang(savedLang, false)
    const savedDark = localStorage.getItem('blackbid_dark') === 'true'
    if (savedDark) { document.body.classList.add('dark'); setDark(true) }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.body.classList.toggle('dark', next)
    localStorage.setItem('blackbid_dark', String(next))
  }

  function applyLang(l: 'en' | 'ar', save = true) {
    setLangState(l)
    document.documentElement.setAttribute('lang', l)
    document.body.classList.toggle('ar', l === 'ar')
    if (save) localStorage.setItem('blackbid_lang', l)
  }

  const ar = lang === 'ar'

  return (
    <>
      {/* Mobile burger */}
      <button className="sidebar-toggle" onClick={() => setSideOpen(o => !o)} aria-label="Menu">
        ☰
      </button>

      {/* Overlay */}
      {sideOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:99 }}
          onClick={() => setSideOpen(false)}
        />
      )}

      <nav className={`sidebar${sideOpen ? ' open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icononly_transparent.png" width={22} height={22} alt="Black" style={{ filter: 'invert(1) brightness(2)', display: 'block' }} />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">Black</div>
            <div className="sidebar-brand-sub">Bid Intelligence · 2026</div>
          </div>
        </div>

        {/* Language + dark mode toggles */}
        <div style={{ padding: '10px 16px 4px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="lang-toggle" style={{ flex: 1 }}>
            <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => applyLang('en')}>EN</button>
            <button className={`lang-btn${lang === 'ar' ? ' active' : ''}`} onClick={() => applyLang('ar')}>AR</button>
          </div>
          <button
            onClick={toggleDark}
            title={dark ? 'Light mode' : 'Dark mode'}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: dark ? 'var(--ink)' : 'transparent',
              border: '1px solid var(--hairline)',
              color: dark ? 'var(--canvas)' : 'var(--mute)',
              cursor: 'pointer', fontSize: 13, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', lineHeight: 1,
            }}
          >
            {dark ? '◐' : '◑'}
          </button>
        </div>

        {/* Nav */}
        <div className="sidebar-nav">
          {NAV_GROUPS.map(group => {
            const visible = group.items.filter(i => i.roles.includes(role))
            if (!visible.length) return null
            return (
              <div key={group.label} className="nav-group">
                <span className="nav-label">{ar ? group.labelAr : group.label}</span>
                {visible.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${pathname === item.href || (item.href !== '/bids' && pathname.startsWith(item.href + '/')) ? ' active' : ''}`}
                    onClick={() => setSideOpen(false)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span style={{ flex: 1 }}>{ar ? item.labelAr : item.label}</span>
                    {item.href === '/dashboard' && pipelineCount != null && pipelineCount > 0 && (
                      <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, background: 'rgba(27,43,30,0.15)', color: 'rgba(27,43,30,0.75)', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', flexShrink: 0 }}>
                        {pipelineCount}
                      </span>
                    )}
                    {item.href === '/bids' && historyCount != null && historyCount > 0 && (
                      <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, background: 'rgba(27,43,30,0.15)', color: 'rgba(27,43,30,0.75)', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', flexShrink: 0 }}>
                        {historyCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {user?.name && (
            <div className="sidebar-user">
              <div className="sidebar-user-name">{user.name} · <span style={{ fontWeight:400, opacity:0.7 }}>{role}</span></div>
              <div className="sidebar-user-role">KSA · 2026</div>
            </div>
          )}
          <button className="sidebar-signout" onClick={() => signOut({ callbackUrl: '/login' })}>
            {ar ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </div>
      </nav>
    </>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useLang } from '@/components/ui/I18n'

const ICON: Record<string, string> = {
  ops: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  ceo: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
  spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2"/>',
  chart: '<path d="M3 3v18h18M7 14l4-4 4 4 5-7"/>',
  doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
}

const ALL = ['ESTIMATOR', 'MANAGER', 'EXECUTIVE', 'ADMIN']
export const NAV = [
  { href: '/dashboard', key: 'nav_operations', group: 'nav_dashboards',   icon: 'ops',     roles: ALL },
  { href: '/executive', key: 'nav_ceo',        group: 'nav_dashboards',   icon: 'ceo',     roles: ['EXECUTIVE', 'ADMIN'] },
  { href: '/bids/new',  key: 'nav_newbid',     group: 'nav_bids',         icon: 'plus',    roles: ['ESTIMATOR', 'MANAGER', 'ADMIN'] },
  { href: '/bids',      key: 'nav_history',    group: 'nav_bids',         icon: 'history', roles: ALL },
  { href: '/predictor', key: 'nav_predictor',  group: 'nav_intelligence', icon: 'spark',   roles: ALL },
  { href: '/analytics', key: 'nav_analytics',  group: 'nav_intelligence', icon: 'chart',   roles: ['MANAGER', 'EXECUTIVE', 'ADMIN'] },
  { href: '/reports',   key: 'nav_reports',    group: 'nav_intelligence', icon: 'doc',     roles: ['MANAGER', 'EXECUTIVE', 'ADMIN'] },
  { href: '/ai',        key: 'nav_ai',         group: 'nav_system',       icon: 'chat',    roles: ALL },
  { href: '/settings',  key: 'nav_settings',   group: 'nav_system',       icon: 'gear',    roles: ALL },
]

export function isActive(pathname: string, href: string) {
  if (href === '/bids') return pathname === '/bids' || (/^\/bids\/[^/]+$/.test(pathname) && pathname !== '/bids/new')
  return pathname === href || pathname.startsWith(href + '/')
}

export const roleKey = (role?: string) => 'role_' + (role ?? 'estimator').toLowerCase()

export function Sidebar({ counts }: { counts: { highRisk: number; execution: number; history: number } }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { lang, t, setLang } = useLang()
  const role = session?.user.role ?? 'ESTIMATOR'

  const badge = (href: string) => {
    if (href === '/bids' && counts.history) return <span className="nav-count">{counts.history}</span>
    if (href === '/dashboard' && counts.highRisk) return <span className="nav-count" style={{ background: 'var(--nogo-tint)', color: 'var(--nogo)' }}>{counts.highRisk}</span>
    if (href === '/executive' && counts.execution) return <span className="nav-count">{counts.execution}</span>
    return null
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icononly_transparent.png" alt="Black Construction" />
        </div>
        <div className="brand-text">
          <div className="brand-name">{t('brand_name')}</div>
          <div className="brand-sub">{t('brand_sub')}</div>
        </div>
      </div>

      <div className={`lang-toggle ${lang === 'en' ? 'en-active' : 'ar-active'}`}>
        {(['en', 'ar'] as const).map(l => (
          <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
        ))}
      </div>

      <nav className="nav">
        {['nav_dashboards', 'nav_bids', 'nav_intelligence', 'nav_system'].map(g => {
          const items = NAV.filter(n => n.group === g && n.roles.includes(role))
          if (!items.length) return null
          return (
            <div key={g} className="nav-group">
              <div className="nav-label">{t(g)}</div>
              {items.map(n => (
                <Link key={n.href} href={n.href} className={`nav-item${isActive(pathname, n.href) ? ' active' : ''}`}>
                  <span className="nav-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" dangerouslySetInnerHTML={{ __html: ICON[n.icon] }} />
                  </span>
                  <span>{t(n.key)}</span>
                  {badge(n.href)}
                </Link>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="name">{(session?.user.name ?? '').toUpperCase()}</div>
        <div>{t(roleKey(role))}</div>
        <div className="place">{t('ksa_year')}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, paddingInline: 0, justifyContent: 'flex-start' }} onClick={() => signOut({ callbackUrl: '/login' })}>
          {t('sign_out')}
        </button>
      </div>
    </aside>
  )
}

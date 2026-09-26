'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLang } from '@/components/ui/I18n'
import { SectionHeader } from '@/components/ui/Primitives'
import FormulaTab from './FormulaTab'
import TeamTab from './TeamTab'
import DataTab from './DataTab'
import AuditTab from './AuditTab'
import AccountTab from './AccountTab'

type Tab = 'formula' | 'team' | 'data' | 'audit' | 'account'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { t } = useLang()
  const admin = session?.user.role === 'ADMIN'
  const tabs: Tab[] = ['formula', 'team', 'data', ...(admin ? (['audit'] as Tab[]) : []), 'account']
  const [tab, setTab] = useState<Tab>('formula')
  const current = tabs.includes(tab) ? tab : 'formula'

  return (
    <div className="page" style={{ maxWidth: 1120 }}>
      <SectionHeader kicker="set_kicker" title="set_title" sub="set_sub2" />
      <div className="tabs" role="tablist">
        {tabs.map(k => (
          <button key={k} className={`tab${current === k ? ' active' : ''}`} role="tab" aria-selected={current === k} onClick={() => setTab(k)}>
            {t('tab_' + k)}
          </button>
        ))}
      </div>
      <div className="tab-body">
        {current === 'formula' && <FormulaTab />}
        {current === 'team' && <TeamTab admin={admin} />}
        {current === 'data' && <DataTab admin={admin} />}
        {current === 'audit' && admin && <AuditTab />}
        {current === 'account' && <AccountTab />}
      </div>
    </div>
  )
}

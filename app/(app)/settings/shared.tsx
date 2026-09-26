'use client'

import { useLang } from '@/components/ui/I18n'

export function CardHead({ k, sub, right }: { k: string; sub?: string; right?: React.ReactNode }) {
  const { t } = useLang()
  return (
    <div className="card-head">
      <div>
        <div className="card-eyebrow"><span className="dot" />{t(k)}</div>
        <div className="card-title">{t(k)}</div>
        {sub && <div className="card-sub">{t(sub)}</div>}
      </div>
      {right}
    </div>
  )
}

export const errText = (d: any, fallback: string): string =>
  typeof d?.error === 'string' ? d.error
    : d?.error?.fieldErrors ? Object.entries(d.error.fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' · ')
      : fallback

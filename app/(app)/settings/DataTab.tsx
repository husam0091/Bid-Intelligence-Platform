'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLang } from '@/components/ui/I18n'
import { Modal, toast } from '@/components/ui/Primitives'
import { errText } from './shared'

async function download(url: string, fallbackName: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(String(res.status))
  const name = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? fallbackName
  const href = URL.createObjectURL(await res.blob())
  const a = document.createElement('a'); a.href = href; a.download = name; a.click()
  URL.revokeObjectURL(href)
}

export default function DataTab({ admin }: { admin: boolean }) {
  const { t } = useLang()
  const router = useRouter()
  const { data: session } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [importRes, setImportRes] = useState<{ ok: number; failed: { row: number; error: string }[] } | null>(null)
  const [modal, setModal] = useState(false)
  const [reset, setReset] = useState({ email: '', password: '', confirm: '' })
  const [err, setErr] = useState('')

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setImportRes(null)
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch('/api/admin/import', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) { toast(errText(d, t('import_invalid')), 'err'); return }
      setImportRes(d); toast(t('imported_ok', { n: d.ok }), d.failed.length ? '' : 'ok'); router.refresh()
    } catch { toast(t('import_invalid'), 'err') }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function confirmReset() {
    if (!reset.email.trim()) { setErr(t('dz_bad_email')); return }
    if (!reset.password) { setErr(t('dz_bad_pw')); return }
    if (reset.confirm !== 'DELETE') { setErr(t('dz_bad_type')); return }
    setBusy(true); setErr('')
    const res = await fetch('/api/admin/reset-bids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reset) })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setErr(res.status === 403 ? t('reauth_failed') : errText(d, t('save_failed'))); return }
    setModal(false); setReset({ email: '', password: '', confirm: '' })
    toast(t('dz_done'), 'ok'); router.refresh()
  }

  const f = (k: string, c: React.ReactNode) => <div className="form-field"><label className="input-label">{t(k)}</label>{c}</div>

  return (
    <div>
      <div className="card" style={{ marginBottom: 14, padding: 22 }}>
        <div className="card-eyebrow"><span className="dot" />{t('data_management')}</div>
        <div className="card-title">{t('data_management')}</div>
        <div className="card-sub" style={{ marginTop: 6, marginBottom: 16 }}>{t('data_management_desc')}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" disabled={!admin || busy} onClick={() => download('/api/admin/backup', 'black-backup.json').catch(() => toast(t('save_failed'), 'err'))}>↓ {t('export_bids')}</button>
          <button className="btn btn-secondary" disabled={!admin || busy} onClick={() => fileRef.current?.click()}>↑ {busy ? '…' : t('import_json')}</button>
          <button className="btn btn-ghost" disabled={!admin} onClick={() => download('/api/admin/import/template', 'black-import-template.xlsx').catch(() => toast(t('save_failed'), 'err'))}>↓ {t('download_template')}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={onImport} />
        </div>
        {importRes && (
          <div className={importRes.failed.length ? 'notice' : ''} style={{ marginTop: 14, fontSize: 12.5 }}>
            <strong>{t('imported_ok', { n: importRes.ok })}</strong>{importRes.failed.length > 0 && ` · ${t('imported_failed', { n: importRes.failed.length })}`}
            {importRes.failed.map(x => <div key={x.row} style={{ color: 'var(--nogo)', marginTop: 4 }}>Row {x.row}: {x.error}</div>)}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 22, borderColor: 'var(--nogo-soft)' }}>
        <div className="card-eyebrow"><span className="dot" style={{ background: 'var(--nogo)' }} />{t('danger_zone')}</div>
        <div className="card-title" style={{ color: 'var(--nogo)' }}>{t('danger_zone')}</div>
        {!admin ? <div className="card-sub" style={{ marginTop: 6 }}>{t('dz_admin_only')}</div> : <>
          <div className="card-sub" style={{ marginTop: 6, marginBottom: 14 }}>{t('danger_zone_desc')}</div>
          <button className="btn btn-danger" onClick={() => { setErr(''); setModal(true) }}>↺ {t('reset_all')}</button>
        </>}
      </div>

      {modal && admin && (
        <Modal title={t('dz_modal_title')} onClose={() => setModal(false)} actions={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>{t('um_cancel')}</button>
          <button className="btn btn-danger" disabled={busy} onClick={confirmReset}>{busy ? '…' : t('dz_confirm')}</button>
        </>}>
          <div className="form-stack">
            <div className="card-sub">{t('dz_modal_msg')}</div>
            {f('dz_email', <input type="text" autoComplete="off" autoFocus placeholder={session?.user.email ?? ''} value={reset.email} onChange={e => setReset(r => ({ ...r, email: e.target.value }))} />)}
            {f('dz_password', <input type="password" autoComplete="new-password" value={reset.password} onChange={e => setReset(r => ({ ...r, password: e.target.value }))} />)}
            {f('dz_type', <input type="text" autoComplete="off" placeholder="DELETE" value={reset.confirm} onChange={e => setReset(r => ({ ...r, confirm: e.target.value }))} />)}
            <div className="form-error" role="alert">{err}</div>
          </div>
        </Modal>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAr } from '@/hooks/useAr'

interface Props {
  bidId:   string
  canEdit: boolean
  canDelete: boolean
  initial: {
    outcome:        string
    contractValue:  number
    actualSpend:    number
    remarks:        string
    consultant:     string
    mainCompetitor: string
  }
}

const OUTCOMES = ['PENDING', 'WON', 'LOST', 'REJECTED']

export default function BidEditPanel({ bidId, canEdit, canDelete, initial }: Props) {
  const ar     = useAr()
  const router = useRouter()
  const [form,   setForm]   = useState({
    ...initial,
    contractValue: initial.contractValue ? String(initial.contractValue) : '',
    actualSpend:   initial.actualSpend   ? String(initial.actualSpend)   : '',
  })
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!canEdit) {
    return (
      <div className="card" style={{ marginBottom: 12, fontSize: 12, color: 'var(--mute)' }}>
        {ar
          ? 'عرض فقط — يمكنك تعديل العطاءات التي أنشأتها فقط. تواصل مع المدير لإجراء تغييرات.'
          : 'Read-only — you can only edit bids you created. Ask a manager or admin to make changes.'}
      </div>
    )
  }

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    const res = await fetch(`/api/bids/${bidId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome:        form.outcome,
        contractValue:  parseFloat(form.contractValue) || 0,
        actualSpend:    parseFloat(form.actualSpend)   || 0,
        remarks:        form.remarks,
        consultant:     form.consultant,
        mainCompetitor: form.mainCompetitor,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg({ ok: true, text: ar ? 'تم الحفظ' : 'Saved' })
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setMsg({ ok: false, text: d.error ?? (ar ? 'فشل الحفظ' : 'Save failed') })
    }
  }

  async function remove() {
    setSaving(true)
    const res = await fetch(`/api/bids/${bidId}`, { method: 'DELETE' })
    setSaving(false)
    if (res.ok) { router.push('/bids'); router.refresh() }
    else setMsg({ ok: false, text: ar ? 'فشل الحذف' : 'Delete failed' })
  }

  const label = (en: string, a: string, help?: string) => (
    <>
      <span>{ar ? a : en}</span>
      {help && <span className="field-help">{help}</span>}
    </>
  )

  return (
    <form className="card" style={{ marginBottom: 12 }} onSubmit={save}>
      <div style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, borderBottom: '1px solid var(--hairline)', paddingBottom: 8 }}>
        {ar ? 'تحديث العطاء' : 'Update Bid'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label className="field-label">
          {label('Outcome', 'النتيجة')}
          <select className="field" value={form.outcome} onChange={e => set('outcome', e.target.value)}>
            {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="field-label">
          {label('Contract Value (SAR)', 'قيمة العقد (ريال)', ar ? 'القيمة الموقعة عند الفوز' : 'Signed value once the bid is won')}
          <input className="field" type="number" min="0" step="any" value={form.contractValue} onChange={e => set('contractValue', e.target.value)} placeholder="0" />
        </label>
        <label className="field-label">
          {label('Actual Spend (SAR)', 'الإنفاق الفعلي (ريال)', ar ? 'التكلفة المتكبدة حتى الآن' : 'Cost incurred to date during execution')}
          <input className="field" type="number" min="0" step="any" value={form.actualSpend} onChange={e => set('actualSpend', e.target.value)} placeholder="0" />
        </label>
        <label className="field-label">
          {label('Consultant', 'الاستشاري')}
          <input className="field" value={form.consultant} onChange={e => set('consultant', e.target.value)} />
        </label>
        <label className="field-label">
          {label('Main Competitor', 'المنافس الرئيسي')}
          <input className="field" value={form.mainCompetitor} onChange={e => set('mainCompetitor', e.target.value)} />
        </label>
        <label className="field-label">
          {label('Remarks', 'ملاحظات')}
          <textarea className="field" rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)} />
        </label>
        {msg && <div style={{ fontSize: 12, color: msg.ok ? 'var(--go)' : 'var(--nogo)' }}>{msg.text}</div>}
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ التغييرات' : 'Save changes')}
        </button>
        <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>
          {ar ? 'يتم تسجيل كل تغيير في سجل التدقيق.' : 'Every change is recorded in the audit trail.'}
        </div>
        {canDelete && (
          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 10, marginTop: 4 }}>
            {!confirmDelete ? (
              <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--nogo)' }} onClick={() => setConfirmDelete(true)}>
                {ar ? 'حذف العطاء…' : 'Delete bid…'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--nogo)' }}>{ar ? 'حذف نهائي؟' : 'Delete permanently?'}</span>
                <button type="button" className="btn btn--sm" style={{ background: 'var(--nogo)', color: '#fff', border: 'none' }} disabled={saving} onClick={remove}>
                  {ar ? 'نعم، احذف' : 'Yes, delete'}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(false)}>{ar ? 'إلغاء' : 'Cancel'}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_SCORING, MAX_SCORE, type ScoringConfig } from '@/lib/decision'

const mono = { fontFamily: 'var(--font-mono)' } as const

export default function ScoringTab({ ar }: { ar: boolean }) {
  const [cfg,     setCfg]     = useState<ScoringConfig | null>(null)
  const [draft,   setDraft]   = useState<ScoringConfig | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/scoring-config').then(r => r.json()).then(d => {
      setCfg(d.config); setDraft(d.config); setCanEdit(!!d.canEdit)
    }).catch(() => setMsg({ ok: false, text: 'Could not load scoring configuration' }))
  }, [])

  if (!cfg || !draft) return <p style={{ color: 'var(--mute)', fontSize: 13 }}>{ar ? 'جارٍ التحميل…' : 'Loading…'}</p>

  const dirty = JSON.stringify(cfg) !== JSON.stringify(draft)
  const setNum = (k: 'goMin' | 'reviewMin' | 'cfrFlagMin', v: string) => setDraft(d => d && ({ ...d, [k]: parseInt(v, 10) || 0 }))
  const setBand = (i: number, k: 'min' | 'p', v: string) => setDraft(d => {
    if (!d) return d
    const winBands = d.winBands.map((b, j) => j !== i ? b : { ...b, [k]: k === 'p' ? Math.min(100, Math.max(0, parseFloat(v) || 0)) / 100 : parseInt(v, 10) || 0 })
    return { ...d, winBands }
  })

  async function save() {
    if (!draft) return
    setSaving(true); setMsg(null)
    const res = await fetch('/api/scoring-config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Save failed' }); return }
    setCfg(d.config); setDraft(d.config)
    setMsg({ ok: true, text: ar ? `تم الحفظ — أعيد تصنيف ${d.recomputed} عطاء` : `Saved — ${d.recomputed} bid(s) re-classified with the new thresholds` })
  }

  const numInput = (value: number, onChange: (v: string) => void, extra: React.CSSProperties = {}) => (
    <input className="field" type="number" value={value} disabled={!canEdit} onChange={e => onChange(e.target.value)}
      style={{ width: 80, padding: '5px 8px', ...mono, ...extra }} />
  )

  const d = draft
  return (
    <>
      {!canEdit && (
        <div className="card" style={{ marginBottom: 14, fontSize: 12, color: 'var(--mute)', borderLeft: '3px solid var(--review)' }}>
          {ar ? 'عرض فقط — يمكن لمسؤول النظام فقط تعديل منطق التقييم والحدود.' : 'Read-only — only an Admin can change the scoring logic and thresholds.'}
        </div>
      )}

      {/* Score → decision */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
          <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'قواعد القرار والمخاطر' : 'Decision & Risk Rules'}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 12, lineHeight: 1.6 }}>
          {ar
            ? `مجموع النقاط = مجموع 27 معياراً (كل معيار 0–5، الحد الأقصى ${MAX_SCORE}). يحدد المجموع القرار والمخاطر معاً:`
            : `Total Score = sum of the 27 criteria (each 0–5, max ${MAX_SCORE}). The total alone sets both the decision and the risk level:`}
        </p>
        <table className="data-table" style={{ maxWidth: 620 }}>
          <thead><tr><th>{ar ? 'النقاط' : 'Score'}</th><th>{ar ? 'القرار' : 'Decision'}</th><th>{ar ? 'المخاطر' : 'Risk'}</th></tr></thead>
          <tbody>
            <tr>
              <td style={{ ...mono, display: 'flex', alignItems: 'center', gap: 6 }}>≥ {numInput(d.goMin, v => setNum('goMin', v))}</td>
              <td><span className="pill pill-go">GO</span></td><td><span className="pill pill-low">LOW</span></td>
            </tr>
            <tr>
              <td style={{ ...mono, display: 'flex', alignItems: 'center', gap: 6 }}>{numInput(d.reviewMin, v => setNum('reviewMin', v))} – {d.goMin - 1}</td>
              <td><span className="pill pill-review">REVIEW</span></td><td><span className="pill pill-medium">MEDIUM</span></td>
            </tr>
            <tr>
              <td style={mono}>&lt; {d.reviewMin}</td>
              <td><span className="pill pill-nogo">NO GO</span></td><td><span className="pill pill-high">HIGH</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Win probability */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
          <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'احتمالية الفوز المتوقعة' : 'Expected Win Probability'}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 12 }}>
          {ar ? 'يتم تعيين احتمالية الفوز حسب أعلى شريحة يصل إليها المجموع:' : 'Win % is taken from the highest band the total score reaches:'}
        </p>
        <table className="data-table" style={{ maxWidth: 420 }}>
          <thead><tr><th>{ar ? 'النقاط ≥' : 'Score ≥'}</th><th>{ar ? 'احتمالية الفوز %' : 'Win %'}</th></tr></thead>
          <tbody>
            {d.winBands.map((b, i) => (
              <tr key={i}>
                <td>{numInput(b.min, v => setBand(i, 'min', v))}</td>
                <td style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {numInput(Math.round(b.p * 10000) / 100, v => setBand(i, 'p', v))}<span style={mono}>%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Commercial flag */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
          <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'التنبيه التجاري' : 'Commercial Flag'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--mute)', flexWrap: 'wrap' }}>
          {ar ? 'إذا كان مجموع المخاطر التجارية والمالية (5 معايير، الحد الأقصى 25) أقل من' : 'Flag a bid when the Commercial & Financial sub-score (5 criteria, max 25) is below'}
          {numInput(d.cfrFlagMin, v => setNum('cfrFlagMin', v))}
          {ar ? '— تنبيه استشاري فقط، لا يغير القرار.' : '— advisory only; it does not change the decision.'}
        </div>
      </div>

      {canEdit && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <button className="btn btn--primary" disabled={!dirty || saving} onClick={save}>
            {saving ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ وإعادة احتساب جميع العطاءات' : 'Save & re-classify all bids')}
          </button>
          <button className="btn btn--ghost" disabled={!dirty || saving} onClick={() => setDraft(cfg)}>{ar ? 'تراجع' : 'Discard'}</button>
          <button className="btn btn--ghost btn--sm" disabled={saving} onClick={() => setDraft(DEFAULT_SCORING)}>{ar ? 'القيم الافتراضية' : 'Restore defaults'}</button>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, color: msg.ok ? 'var(--go)' : 'var(--nogo)', marginBottom: 14 }}>{msg.text}</p>}

      {/* KPI formulas reference */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
          <span className="card-eyebrow"><span className="eyebrow-dot" />{ar ? 'معادلات مؤشرات الأداء' : 'Dashboard KPI Formulas'}</span>
        </div>
        <table className="data-table">
          <tbody>
            {[
              [ar ? 'معدل الفوز' : 'Win Rate', ar ? 'الفائز ÷ (الفائز + الخاسر) × 100 — المعلق والمرفوض مستبعدان' : 'Won ÷ (Won + Lost) × 100 — Pending and Rejected are excluded'],
              [ar ? 'الإجمالي التقديري' : 'Est. Total', ar ? 'Σ القيمة التقديرية لجميع العطاءات' : 'Σ Est. Value of all bids'],
              [ar ? 'العقود' : 'Contract', ar ? 'Σ قيمة العقد للعطاءات الفائزة' : 'Σ Contract Value of WON bids'],
              [ar ? 'الإنفاق الفعلي' : 'Actual Spend', ar ? 'Σ الإنفاق الفعلي للعطاءات الفائزة' : 'Σ Actual Spend of WON bids'],
              [ar ? 'الفرق' : 'Variance', ar ? 'الإنفاق الفعلي − قيمة العقد (موجب = تجاوز)' : 'Actual Spend − Contract Value (positive = overrun)'],
              [ar ? 'متوسط النقاط' : 'Composite Score', ar ? `متوسط مجموع النقاط لجميع العطاءات (من ${MAX_SCORE})` : `Mean Total Score of all bids (out of ${MAX_SCORE})`],
              [ar ? 'قيد التنفيذ' : 'Currently in Execution', ar ? 'عطاءات فائزة أو معلقة، باستثناء "مرفوض" والعطاءات المرفوضة' : 'Bids that are WON or PENDING, excluding NO GO decisions and REJECTED outcomes'],
            ].map(([k, v]) => (
              <tr key={k}><td style={{ fontWeight: 600, width: 200 }}>{k}</td><td style={{ ...mono, fontSize: 12 }}>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

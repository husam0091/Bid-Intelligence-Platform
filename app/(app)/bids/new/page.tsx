'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { computeDecision } from '@/lib/decision'
import { renderMd } from '@/lib/render-md'
import { useAr } from '@/hooks/useAr'

type ComparableBid = {
  id: string; name: string; location: string; type: string
  clientCategory: string; estValue: number; date: string
  totalScore: number; decision: string; outcome: string
}

const GROUPS = [
  {
    key: 'competitive', label: 'Competitive Position', labelAr: 'الموقف التنافسي', color: 'var(--ink)', max: 50,
    fields: [
      { key: 'relStrength',     label: 'Relationship Strength',          labelAr: 'قوة العلاقة' },
      { key: 'budgetKnown',     label: 'Budget Known',                   labelAr: 'الميزانية معروفة' },
      { key: 'competitors',     label: 'Competitor Landscape',           labelAr: 'المشهد التنافسي' },
      { key: 'limitedInv',      label: 'Limited Invitations',            labelAr: 'دعوات محدودة' },
      { key: 'similarExp',      label: 'Similar Experience',             labelAr: 'تجربة مشابهة' },
      { key: 'noPriceBreakers', label: 'No Price Breakers',              labelAr: 'لا كسر للسعر' },
      { key: 'techAdv',         label: 'Technical Advantage',            labelAr: 'ميزة تقنية' },
      { key: 'withinExpertise', label: 'Within Expertise',               labelAr: 'ضمن الخبرة' },
      { key: 'lowChanges',      label: 'Low Change Orders Risk',         labelAr: 'مخاطر أوامر تغيير منخفضة' },
      { key: 'goodLocation',    label: 'Good Location',                  labelAr: 'موقع جيد' },
    ],
  },
  {
    key: 'load', label: 'Company Load Factor', labelAr: 'عامل حمل الشركة', color: 'var(--data-blue)', max: 25,
    fields: [
      { key: 'teamAvail',       label: 'Team Availability',              labelAr: 'توافر الفريق' },
      { key: 'equipAvail',      label: 'Equipment Availability',         labelAr: 'توافر المعدات' },
      { key: 'cashFlow',        label: 'Cash Flow Capacity',             labelAr: 'طاقة التدفق النقدي' },
      { key: 'currWorkload',    label: 'Current Workload',               labelAr: 'عبء العمل الحالي' },
      { key: 'noImpactRunning', label: 'No Impact on Running Projects',  labelAr: 'لا تأثير على المشاريع الجارية' },
    ],
  },
  {
    key: 'contractual', label: 'Contractual Risk', labelAr: 'المخاطر التعاقدية', color: 'var(--review)', max: 20,
    fields: [
      { key: 'ld',       label: 'Liquidated Damages',           labelAr: 'التعويضات المحددة' },
      { key: 'apg',      label: 'Advance Payment Guarantee',    labelAr: 'ضمان الدفعة المقدمة' },
      { key: 'perfBond', label: 'Performance Bond',             labelAr: 'ضمان الأداء' },
      { key: 'retention',label: 'Retention Terms',              labelAr: 'شروط الاحتجاز' },
    ],
  },
  {
    key: 'technical', label: 'Technical Risk', labelAr: 'المخاطر التقنية', color: 'var(--go)', max: 15,
    fields: [
      { key: 'newSystem',   label: 'New Systems Required',   labelAr: 'أنظمة جديدة مطلوبة' },
      { key: 'complexMEP',  label: 'Complex MEP',            labelAr: 'أنظمة ميكانيكية وكهربائية معقدة' },
      { key: 'specialAuth', label: 'Special Authorities',    labelAr: 'سلطات خاصة' },
    ],
  },
  {
    key: 'commercial', label: 'Commercial & Financial Risk', labelAr: 'المخاطر التجارية والمالية', color: 'var(--nogo)', max: 25,
    fields: [
      { key: 'clientRep',   label: 'Client Reputation',   labelAr: 'سمعة العميل' },
      { key: 'clearDwgs',   label: 'Clear Drawings',      labelAr: 'رسومات واضحة' },
      { key: 'advPayment',  label: 'Advance Payment',     labelAr: 'دفعة مقدمة' },
      { key: 'payments',    label: 'Payment Terms',       labelAr: 'شروط الدفع' },
      { key: 'finDuration', label: 'Financial Duration',  labelAr: 'المدة المالية' },
    ],
  },
]

const STEP_NAMES_EN = ['PROFILE', 'COMPETITIVE', 'LOAD', 'CONTRACTUAL', 'TECHNICAL', 'COMMERCIAL', 'REVIEW & SAVE']
const STEP_NAMES_AR = ['الملف', 'تنافسية', 'الحمل', 'تعاقدي', 'تقني', 'تجاري', 'مراجعة وحفظ']
const STEP_NUMS     = ['01', '02', '03', '04', '05', '06', '07']

const ALL_KEYS = GROUPS.flatMap(g => g.fields.map(f => f.key))
const defaultCriteria = Object.fromEntries(ALL_KEYS.map(k => [k, 3]))

function groupScore(group: typeof GROUPS[0], criteria: Record<string, number>) {
  return group.fields.reduce((s, f) => s + (criteria[f.key] ?? 0), 0)
}

function StepIndicator({ step, ar }: { step: number; ar: boolean }) {
  return (
    <div className="steps">
      {STEP_NUMS.map((num, i) => {
        const idx    = i + 1
        const active = step === idx
        const done   = step > idx
        return (
          <div
            key={idx}
            className={`step${active ? ' current' : done ? ' done' : ''}`}
          >
            <div className="step-bar" />
            <div className="step-num">{num}</div>
            <div className="step-name">{ar ? STEP_NAMES_AR[i] : STEP_NAMES_EN[i]}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function NewBidPage() {
  const router  = useRouter()
  const ar      = useAr()
  const [step,        setStep]        = useState(1)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [advice,      setAdvice]      = useState<string | null>(null)
  const [advLoading,  setAdvLoading]  = useState(false)
  const [advFetched,  setAdvFetched]  = useState(false)

  const [info, setInfo] = useState({
    name: '', location: '', type: 'BUILDING', size: 'LARGE',
    duration: '', tenderType: 'OPEN', clientCategory: 'GOV',
    consultant: '', pmc: '', estValue: '',
    date: new Date().toISOString().slice(0, 10),
    outcome: 'PENDING', remarks: '', mainCompetitor: '',
  })

  const [criteria,    setCriteria]    = useState<Record<string, number>>(defaultCriteria)
  const [comparables, setComparables] = useState<ComparableBid[]>([])

  useEffect(() => {
    fetch(`/api/bids?type=${info.type}`)
      .then(r => r.json())
      .then(d => setComparables((d.data ?? []).slice(0, 4)))
      .catch(() => {})
  }, [info.type])

  async function fetchAdvice() {
    setAdvLoading(true)
    setAdvFetched(false)
    try {
      const res = await fetch('/api/ai/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...info,
          totalScore: result.totalScore,
          decision:   result.decision,
          riskIndex:  result.riskIndex,
          expectWin:  result.expectWin,
          hardStop:   result.hardStop,
          lang: 'en',
          criteria,
        }),
      })
      const d = await res.json()
      setAdvice(d.content ?? null)
    } catch {
      setAdvice('Advisory unavailable at this time.')
    } finally {
      setAdvLoading(false)
      setAdvFetched(true)
    }
  }

  useEffect(() => {
    if (step === 7 && !advFetched && !advLoading) {
      fetchAdvice()
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  async function continueInChat() {
    if (!advice) return
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Discussion: ${info.name || 'New Bid'}` }),
      })
      const d    = await res.json()
      const id   = d.conversation?.id
      if (!id) return
      // Seed user message
      const userMsg = `I'm reviewing a bid: ${info.name || 'New Bid'} (${info.type}, ${info.location}). Score: ${result.totalScore}/135, Decision: ${result.decision}. Please help me think through this further.`
      await fetch(`/api/ai/conversations/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg }),
      })
      router.push(`/ai?conversation=${id}`)
    } catch {}
  }

  const result = useMemo(() => computeDecision(criteria), [criteria])

  const decisionClass =
    result.decision === 'GO'     ? 'go'     :
    result.decision === 'REVIEW' ? 'review' : 'nogo'

  const decisionColor =
    result.decision === 'GO'     ? 'var(--go)'     :
    result.decision === 'REVIEW' ? 'var(--review)' : 'var(--nogo)'

  const scoreBarPct = Math.min(100, Math.round((result.totalScore / 135) * 100))

  function setField(k: string, v: string) { setInfo(p => ({ ...p, [k]: v })) }
  function setScore(k: string, v: number) { setCriteria(p => ({ ...p, [k]: v })) }

  function nextStep() { setStep(s => Math.min(7, s + 1)) }
  function prevStep() { setStep(s => Math.max(1, s - 1)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...info, ...criteria,
          estValue: parseFloat(info.estValue) || 0,
          contractValue: 0, actualSpend: 0, links: '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save bid')
      router.push(`/bids/${data.data.id}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  /* The group for the current step (steps 2-6) */
  const currentGroup = step >= 2 && step <= 6 ? GROUPS[step - 2] : null

  /* Rating label helper */
  function ratingLabel(v: number): string {
    if (v === 0) return 'N/A'
    if (v === 1) return ar ? 'ضعيف جداً'  : 'Very Poor'
    if (v === 2) return ar ? 'ضعيف'       : 'Poor'
    if (v === 3) return ar ? 'مقبول'      : 'Fair'
    if (v === 4) return ar ? 'جيد'        : 'Good'
    return ar ? 'ممتاز' : 'Excellent'
  }

  /* Advisory section labels */
  const advisorySections = [
    { key: 'business', label: ar ? 'الأعمال'       : 'BUSINESS',     color: 'var(--data-blue)', match: /## 1\. Business Perspective([\s\S]*?)(?=## 2\.|$)/i },
    { key: 'risk',     label: ar ? 'إدارة المخاطر' : 'RISK MGMT',    color: 'var(--nogo)',      match: /## 2\. Risk Management([\s\S]*?)(?=## 3\.|$)/i },
    { key: 'project',  label: ar ? 'إدارة المشروع' : 'PROJECT MGMT', color: 'var(--review)',    match: /## 3\. Project Management([\s\S]*?)$/i },
  ]

  return (
    <>
      <Header title="New Bid Assessment" titleAr="تقييم عطاء جديد" />

      <div className="page-wrap">
        <div className="page-header">
          <div className="h-left">
            <div className="h-kicker">
              <span className="dash" />
              {ar ? '03 · إدخال العطاء' : '03 · BID ENTRY'}
            </div>
            <h1 className="h-title">
              {ar ? 'تقييم' : 'Score a'} <em>{ar ? 'عطاء جديد' : 'New Tender'}</em>
            </h1>
            <p className="h-sub">
              {ar
                ? 'أدخل تفاصيل المشروع وقيّم كل معيار من معايير التقييم السبعة والعشرين. تتحدث لوحة الحكم في الوقت الفعلي'
                : 'Fill in project details and rate each of the 27 scoring criteria. The verdict panel updates live.'}
            </p>
          </div>
        </div>

        <StepIndicator step={step} ar={ar} />

        <form onSubmit={handleSubmit}>
          <div className="wizard">

            {/* ── Left column ── */}
            <div>
              {error && <div className="bid-error">{error}</div>}

              {/* STEP 1 — Project Profile */}
              {step === 1 && (
                <>
                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-section-head">
                      <span className="card-eyebrow"><span className="eyebrow-dot" />Project Profile</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <label className="input-label">
                        {ar ? 'اسم المشروع *' : 'Project Name *'}
                        <input className="field" required value={info.name}
                          onChange={e => setField('name', e.target.value)}
                          placeholder={ar ? 'مثال: برج الرياض - المبنى ج' : 'e.g. Al Riyadh Tower Block C'} />
                      </label>
                      <label className="input-label">
                        {ar ? 'الموقع *' : 'Location *'}
                        <input className="field" required value={info.location}
                          onChange={e => setField('location', e.target.value)}
                          placeholder={ar ? 'المدينة / المنطقة' : 'City / Region'} />
                      </label>
                      <label className="input-label">
                        {ar ? 'النوع' : 'Type'}
                        <select className="field" value={info.type} onChange={e => setField('type', e.target.value)}>
                          <option value="BUILDING">{ar ? 'مباني' : 'Building'}</option>
                          <option value="INFRASTRUCTURE">{ar ? 'بنية تحتية' : 'Infrastructure'}</option>
                          <option value="INDUSTRIAL">{ar ? 'صناعي' : 'Industrial'}</option>
                        </select>
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
                      <label className="input-label">
                        {ar ? 'القيمة التقديرية (ريال) *' : 'Est. Value (SAR) *'}
                        <input className="field" required type="number" min="1" value={info.estValue}
                          onChange={e => setField('estValue', e.target.value)} placeholder="0" />
                      </label>
                      <label className="input-label">
                        {ar ? 'الحجم' : 'Size'}
                        <select className="field" value={info.size} onChange={e => setField('size', e.target.value)}>
                          <option value="MEDIUM_SMALL">Medium / Small</option>
                          <option value="LARGE">Large</option>
                          <option value="MEGA">Mega</option>
                        </select>
                      </label>
                      <label className="input-label">
                        {ar ? 'المدة' : 'Duration'}
                        <input className="field" value={info.duration}
                          onChange={e => setField('duration', e.target.value)}
                          placeholder={ar ? 'مثال: 24 شهرًا' : 'e.g. 24 months'} />
                      </label>
                      <label className="input-label">
                        {ar ? 'نوع المناقصة' : 'Tender Type'}
                        <select className="field" value={info.tenderType} onChange={e => setField('tenderType', e.target.value)}>
                          <option value="OPEN">{ar ? 'مفتوح' : 'OPEN'}</option>
                          <option value="LIMITED">{ar ? 'محدود' : 'LIMITED'}</option>
                          <option value="NEGOTIATED">{ar ? 'تفاوضي' : 'NEGOTIATED'}</option>
                        </select>
                      </label>
                      <label className="input-label">
                        {ar ? 'تاريخ العطاء' : 'Bid Date'}
                        <input className="field" type="date" value={info.date}
                          onChange={e => setField('date', e.target.value)} />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                      <label className="input-label">
                        {ar ? 'فئة العميل' : 'Client Category'}
                        <select className="field" value={info.clientCategory} onChange={e => setField('clientCategory', e.target.value)}>
                          <option value="GOV">{ar ? 'حكومي' : 'GOVERNMENT'}</option>
                          <option value="PRIVATE">{ar ? 'خاص' : 'PRIVATE'}</option>
                          <option value="SEMI">{ar ? 'شبه حكومي' : 'SEMI-GOVERNMENT'}</option>
                        </select>
                      </label>
                      <label className="input-label">
                        {ar ? 'الاستشاري' : 'Consultant'}
                        <input className="field" value={info.consultant}
                          onChange={e => setField('consultant', e.target.value)}
                          placeholder={ar ? 'مثال: إيكوم' : 'e.g. AECOM'} />
                      </label>
                      <label className="input-label">
                        {ar ? 'المنافس الرئيسي' : 'Main Competitor'}
                        <input className="field" value={info.mainCompetitor}
                          onChange={e => setField('mainCompetitor', e.target.value)} />
                      </label>
                    </div>
                  </div>

                  {comparables.length > 0 && (
                    <div className="card" style={{ marginBottom: 14 }}>
                      <div className="card-section-head" style={{ marginBottom: 12, paddingBottom: 8 }}>
                        <span className="card-eyebrow"><span className="eyebrow-dot" />Comparable Past Projects</span>
                        <span style={{ fontSize: 10, color: 'var(--mute)', fontFamily: "'JetBrains Mono',monospace" }}>
                          {ar ? `أفضل ${comparables.length} · نفس النوع` : `Top ${comparables.length} · same type`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {comparables.map(b => {
                          const dColor = b.decision === 'GO' ? 'var(--go)' : b.decision === 'REVIEW' ? 'var(--review)' : 'var(--nogo)'
                          return (
                            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: 'var(--bg-card-alt, #F4F1E8)', borderRadius: 5, borderLeft: `3px solid ${dColor}` }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                                  {b.location} · {b.clientCategory} · SAR {(b.estValue / 1_000_000).toFixed(1)}M · {new Date(b.date).toLocaleDateString('en-SA', { month: 'short', year: '2-digit' })}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 800, fontSize: 20, color: dColor, lineHeight: 1 }}>{b.totalScore}</div>
                                <div style={{ fontSize: 9, color: 'var(--mute)', fontFamily: "'JetBrains Mono',monospace" }}>/135</div>
                              </div>
                              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: b.outcome === 'WON' ? 'var(--go)' : b.outcome === 'LOST' ? 'var(--nogo)' : 'var(--mute)', letterSpacing: '0.06em', flexShrink: 0 }}>
                                {b.outcome}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* STEPS 2–6 — One criteria group per step */}
              {currentGroup && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-section-head" style={{ borderLeftColor: currentGroup.color }}>
                    <div>
                      <span className="card-eyebrow">
                        <span className="eyebrow-dot" style={{ background: currentGroup.color }} />
                        {ar ? currentGroup.labelAr : currentGroup.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 18, color: currentGroup.color }}>
                        {groupScore(currentGroup, criteria)}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--mute)' }}>
                        /{currentGroup.max}
                      </span>
                    </div>
                  </div>

                  {currentGroup.fields.map((f, fi) => (
                    <div key={f.key} className="criteria-row" style={{ borderBottom: fi < currentGroup.fields.length - 1 ? '1px dashed var(--hairline-soft)' : 'none' }}>
                      <div className="criteria-name">{ar ? f.labelAr : f.label}</div>
                      <span className="criteria-score-label">
                        {ratingLabel(criteria[f.key])}
                      </span>
                      <div className="rating">
                        {[0,1,2,3,4,5].map(v => (
                          <button
                            key={v}
                            type="button"
                            className={`rating-btn${criteria[f.key] === v ? ' filled' : ''}`}
                            style={criteria[f.key] === v ? { background: currentGroup.color, borderColor: currentGroup.color } : {}}
                            onClick={() => setScore(f.key, v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 7 — AI Advisory */}
              {step === 7 && (
                <div style={{ marginBottom: 14 }}>
                  {/* Advisory header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13 }}>✦</span>
                      <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {ar ? 'توصية الذكاء الاصطناعي' : 'AI Advisory'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchAdvice}
                      disabled={advLoading}
                      style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: 'var(--mute)', background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: advLoading ? 'default' : 'pointer' }}
                    >
                      {advLoading ? (ar ? 'جارٍ الجلب…' : 'Fetching…') : (ar ? '↻ تحديث' : '↻ Refresh')}
                    </button>
                  </div>

                  {/* Loading skeleton */}
                  {advLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {advisorySections.map(s => (
                        <div key={s.key} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 12, paddingTop: 10, paddingBottom: 10, background: 'var(--surface)', borderRadius: '0 4px 4px 0' }}>
                          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: s.color, letterSpacing: '0.14em', marginBottom: 8 }}>{s.label}</div>
                          {[70, 90, 60].map((w, i) => (
                            <div key={i} style={{ height: 10, width: `${w}%`, background: 'var(--hairline)', borderRadius: 3, marginBottom: 6, animation: 'pulse 1.4s infinite' }} />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rendered advice */}
                  {!advLoading && advice && (() => {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {advisorySections.map(s => {
                          const m = advice.match(s.match)
                          const content = m ? m[1].trim() : advice
                          return (
                            <div key={s.key} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 12, paddingTop: 10, paddingBottom: 10, background: 'var(--surface)', borderRadius: '0 4px 4px 0' }}>
                              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: s.color, letterSpacing: '0.14em', marginBottom: 8, fontWeight: 700 }}>
                                {s.label}
                              </div>
                              <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>
                                {renderMd(content)}
                              </div>
                            </div>
                          )
                        })}
                        <button
                          type="button"
                          onClick={continueInChat}
                          style={{
                            alignSelf: 'flex-start', padding: '8px 14px',
                            background: 'var(--ink)', color: 'var(--canvas)',
                            border: 'none', borderRadius: 'var(--radius-sm)',
                            fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {ar ? '→ تابع هذه المحادثة في محادثة الذكاء الاصطناعي' : 'Continue this conversation in AI Chat →'}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* STEP 7 — Score Summary */}
              {step === 7 && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-section-head" style={{ marginBottom: 14, paddingBottom: 10 }}>
                    <span className="card-eyebrow">
                      <span className="eyebrow-dot" />
                      {ar ? 'ملخص النقاط' : 'Score Summary'}
                    </span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                      {ar ? 'المشروع:' : 'Project:'} {info.name || '—'} · {info.location || '—'} · {info.type}
                    </div>
                  </div>
                  {GROUPS.map(g => {
                    const gs  = groupScore(g, criteria)
                    const pct = Math.round((gs / g.max) * 100)
                    return (
                      <div key={g.key} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{ar ? g.labelAr : g.label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: g.color }}>{gs}/{g.max}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--hairline)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: g.color, borderRadius: 3 }} />
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-card-alt, #F4F1E8)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--mute)', letterSpacing: '0.12em' }}>
                      {ar ? 'مجموع النقاط' : 'TOTAL SCORE'}
                    </span>
                    <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 800, fontSize: 28, color: decisionColor }}>
                      {result.totalScore}
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--mute)' }}>
                        {ar ? '/135 نقطة' : '/135 points'}
                      </span>
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: decisionColor, letterSpacing: '0.06em' }}>{result.decision.replace('_', ' ')}</span>
                  </div>
                </div>
              )}

              {/* Back / Next / Save buttons */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', paddingBottom: 40 }}>
                <div>
                  {step > 1 && (
                    <button type="button" className="btn btn--secondary" onClick={prevStep}>
                      {ar ? 'رجوع' : '← Back'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn--secondary" onClick={() => router.back()}>
                    {ar ? 'إلغاء' : 'Cancel'}
                  </button>
                  {step < 7 && (
                    <button type="button" className="btn btn--primary" onClick={nextStep}>
                      {ar ? '→ التالي' : 'Next →'}
                    </button>
                  )}
                  {step === 7 && (
                    <button type="submit" className="btn btn--primary" disabled={saving}>
                      {saving ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ العطاء' : 'Save Bid')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right column: verdict panel (always visible) ── */}
            <div className={`verdict-panel verdict-panel--${decisionClass}`}>
              <div className="card-eyebrow" style={{ marginBottom: 14 }}>
                <span className="eyebrow-dot" style={{ background: 'var(--mute)' }} />
                {ar ? 'الحكم الفوري' : 'Live Verdict'}
              </div>

              <div className={`verdict-headline verdict-headline--${decisionClass}`}>
                {result.decision.replace('_', ' ')}
              </div>

              <div style={{ margin: '16px 0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  {ar ? 'مجموع النقاط' : 'Total Score'}
                </span>
                <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 26, color: decisionColor, letterSpacing: '-0.02em' }}>
                  {result.totalScore}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mute)', marginLeft: 2 }}>
                    {ar ? '/135 نقطة' : '/135 points'}
                  </span>
                </span>
              </div>
              <div className="verdict-bar-bg">
                <div className="verdict-bar-fill" style={{ width: `${scoreBarPct}%`, background: decisionColor }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5 }}>
                    {ar ? 'مخاطر التجارية والمالية' : 'CFR Risk'}
                  </div>
                  <span className={`pill pill-${result.riskIndex.toLowerCase()}`}>{result.riskIndex}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5 }}>
                    {ar ? 'احتمالية الفوز' : 'WIN PROBABILITY'}
                  </div>
                  <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 22, color: decisionColor }}>
                    {Math.round(result.expectWin * 100)}%
                  </span>
                </div>
              </div>

              {result.hardStop && (
                <div className="verdict-alert">
                  <span style={{ fontSize: 14 }}>⚠</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {ar ? 'إيقاف إجباري — مخاطر تجارية' : 'Hard Stop — Commercial Risk'}
                    </div>
                    <div>
                      {ar
                        ? 'نقاط المخاطر التجارية أدنى من الحد المطلوب. تم تصنيف العطاء كـ مرفوض بغض النظر عن المجموع الكلي'
                        : 'CFR score below threshold. Bid forced to NO GO regardless of total score.'}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, borderTop: '1px solid var(--hairline-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {GROUPS.map(g => {
                  const gs  = groupScore(g, criteria)
                  const pct = Math.round((gs / g.max) * 100)
                  return (
                    <div key={g.key} className="minibar-row">
                      <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ar ? g.labelAr : g.label}
                      </span>
                      <div className="minibar-track">
                        <div className="minibar-fill" style={{ width: `${pct}%`, background: g.color }} />
                      </div>
                      <span className="minibar-val">{gs}/{g.max}</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: 14, borderTop: '1px solid var(--hairline-soft)', paddingTop: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'var(--mute)', lineHeight: 1.9, letterSpacing: '0.05em' }}>
                <div>≥90 → GO &nbsp;&nbsp;(75% · 60%)</div>
                <div>75–89 → GO &nbsp;(60% · 51%)</div>
                <div>60–74 → REVIEW (38%)</div>
                <div>&lt;60 &nbsp;→ NO GO (18%)</div>
                <div style={{ marginTop: 4, color: 'var(--nogo)' }}>CFR &lt;13 → hard stop</div>
              </div>
            </div>

          </div>
        </form>
      </div>
    </>
  )
}

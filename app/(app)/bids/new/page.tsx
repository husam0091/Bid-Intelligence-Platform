'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { computeDecision } from '@/lib/decision'
import { renderMd } from '@/lib/render-md'

type ComparableBid = {
  id: string; name: string; location: string; type: string
  clientCategory: string; estValue: number; date: string
  totalScore: number; decision: string; outcome: string
}

const GROUPS = [
  {
    key: 'competitive', label: 'Competitive Position', color: 'var(--ink)', max: 50,
    fields: [
      { key: 'relStrength',     label: 'Relationship Strength' },
      { key: 'budgetKnown',     label: 'Budget Known' },
      { key: 'competitors',     label: 'Competitor Landscape' },
      { key: 'limitedInv',      label: 'Limited Invitations' },
      { key: 'similarExp',      label: 'Similar Experience' },
      { key: 'noPriceBreakers', label: 'No Price Breakers' },
      { key: 'techAdv',         label: 'Technical Advantage' },
      { key: 'withinExpertise', label: 'Within Expertise' },
      { key: 'lowChanges',      label: 'Low Change Orders Risk' },
      { key: 'goodLocation',    label: 'Good Location' },
    ],
  },
  {
    key: 'load', label: 'Company Load Factor', color: 'var(--data-blue)', max: 25,
    fields: [
      { key: 'teamAvail',       label: 'Team Availability' },
      { key: 'equipAvail',      label: 'Equipment Availability' },
      { key: 'cashFlow',        label: 'Cash Flow Capacity' },
      { key: 'currWorkload',    label: 'Current Workload' },
      { key: 'noImpactRunning', label: 'No Impact on Running Projects' },
    ],
  },
  {
    key: 'contractual', label: 'Contractual Risk', color: 'var(--review)', max: 20,
    fields: [
      { key: 'ld',       label: 'Liquidated Damages' },
      { key: 'apg',      label: 'Advance Payment Guarantee' },
      { key: 'perfBond', label: 'Performance Bond' },
      { key: 'retention',label: 'Retention Terms' },
    ],
  },
  {
    key: 'technical', label: 'Technical Risk', color: 'var(--go)', max: 15,
    fields: [
      { key: 'newSystem',   label: 'New Systems Required' },
      { key: 'complexMEP',  label: 'Complex MEP' },
      { key: 'specialAuth', label: 'Special Authorities' },
    ],
  },
  {
    key: 'commercial', label: 'Commercial & Financial Risk', color: 'var(--nogo)', max: 25,
    fields: [
      { key: 'clientRep',   label: 'Client Reputation' },
      { key: 'clearDwgs',   label: 'Clear Drawings' },
      { key: 'advPayment',  label: 'Advance Payment' },
      { key: 'payments',    label: 'Payment Terms' },
      { key: 'finDuration', label: 'Financial Duration' },
    ],
  },
]

const STEP_LABELS = [
  '01\nPROFILE',
  '02\nCOMPETITIVE',
  '03\nLOAD',
  '04\nCONTRACTUAL',
  '05\nTECHNICAL',
  '06\nCOMMERCIAL',
  '07\nREVIEW & SAVE',
]

const ALL_KEYS = GROUPS.flatMap(g => g.fields.map(f => f.key))
const defaultCriteria = Object.fromEntries(ALL_KEYS.map(k => [k, 3]))

function groupScore(group: typeof GROUPS[0], criteria: Record<string, number>) {
  return group.fields.reduce((s, f) => s + (criteria[f.key] ?? 0), 0)
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-card)',
      border: '1px solid var(--hairline)',
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 18,
      fontSize: 10,
      fontFamily: "'JetBrains Mono',monospace",
      letterSpacing: '0.06em',
    }}>
      {STEP_LABELS.map((label, i) => {
        const num    = i + 1
        const active = step === num
        const done   = step > num
        const lines  = label.split('\n')
        return (
          <div
            key={num}
            style={{
              flex: 1,
              padding: '10px 4px',
              textAlign: 'center',
              borderRight: i < STEP_LABELS.length - 1 ? '1px solid var(--hairline)' : 'none',
              background: active ? 'var(--ink)' : done ? 'var(--bg-card-alt, #F4F1E8)' : 'transparent',
              color: active ? '#fff' : done ? 'var(--ink)' : 'var(--mute)',
              transition: 'background 0.15s',
              lineHeight: 1.4,
            }}
          >
            <div style={{ fontWeight: active ? 700 : done ? 600 : 400, fontSize: 9 }}>{lines[0]}</div>
            <div style={{ fontWeight: active ? 700 : 400, fontSize: 8, marginTop: 1 }}>{lines[1]}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function NewBidPage() {
  const router  = useRouter()
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

  return (
    <>
      <Header title="New Bid Assessment" titleAr="تقييم عطاء جديد" />

      <div className="page-content">
        <div className="h-block">
          <div className="h-kicker"><span className="h-dash" />03 · BID ENTRY</div>
          <h1 className="h-title">Score a <em>New Tender</em></h1>
          <p className="h-sub">Fill in project details and rate each of the 27 scoring criteria. The verdict panel updates live.</p>
        </div>

        <StepIndicator step={step} />

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
                        Project Name *
                        <input className="field" required value={info.name}
                          onChange={e => setField('name', e.target.value)} placeholder="e.g. Al Riyadh Tower Block C" />
                      </label>
                      <label className="input-label">
                        Location *
                        <input className="field" required value={info.location}
                          onChange={e => setField('location', e.target.value)} placeholder="City / Region" />
                      </label>
                      <label className="input-label">
                        Type
                        <select className="field" value={info.type} onChange={e => setField('type', e.target.value)}>
                          <option value="BUILDING">Building</option>
                          <option value="INFRASTRUCTURE">Infrastructure</option>
                          <option value="INDUSTRIAL">Industrial</option>
                        </select>
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
                      <label className="input-label">
                        Est. Value (SAR) *
                        <input className="field" required type="number" min="1" value={info.estValue}
                          onChange={e => setField('estValue', e.target.value)} placeholder="0" />
                      </label>
                      <label className="input-label">
                        Size
                        <select className="field" value={info.size} onChange={e => setField('size', e.target.value)}>
                          <option value="MEDIUM_SMALL">Medium / Small</option>
                          <option value="LARGE">Large</option>
                          <option value="MEGA">Mega</option>
                        </select>
                      </label>
                      <label className="input-label">
                        Duration
                        <input className="field" value={info.duration}
                          onChange={e => setField('duration', e.target.value)} placeholder="e.g. 24 months" />
                      </label>
                      <label className="input-label">
                        Tender Type
                        <select className="field" value={info.tenderType} onChange={e => setField('tenderType', e.target.value)}>
                          <option value="OPEN">Open</option>
                          <option value="LIMITED">Limited</option>
                          <option value="NEGOTIATED">Negotiated</option>
                        </select>
                      </label>
                      <label className="input-label">
                        Bid Date
                        <input className="field" type="date" value={info.date}
                          onChange={e => setField('date', e.target.value)} />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                      <label className="input-label">
                        Client Category
                        <select className="field" value={info.clientCategory} onChange={e => setField('clientCategory', e.target.value)}>
                          <option value="GOV">Government</option>
                          <option value="PRIVATE">Private</option>
                          <option value="SEMI">Semi-Government</option>
                        </select>
                      </label>
                      <label className="input-label">
                        Consultant
                        <input className="field" value={info.consultant}
                          onChange={e => setField('consultant', e.target.value)} placeholder="e.g. AECOM" />
                      </label>
                      <label className="input-label">
                        Main Competitor
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
                          Top {comparables.length} · same type
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
                        {currentGroup.label}
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
                      <div className="criteria-name">{f.label}</div>
                      <span className="criteria-score-label">
                        {criteria[f.key] === 0 ? 'N/A' : criteria[f.key] === 1 ? 'Very Poor' : criteria[f.key] === 2 ? 'Poor' : criteria[f.key] === 3 ? 'Fair' : criteria[f.key] === 4 ? 'Good' : 'Excellent'}
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
                        AI Advisory
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchAdvice}
                      disabled={advLoading}
                      style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: 'var(--mute)', background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: advLoading ? 'default' : 'pointer' }}
                    >
                      {advLoading ? 'Fetching…' : '↻ Refresh'}
                    </button>
                  </div>

                  {/* Loading skeleton */}
                  {advLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'BUSINESS', color: 'var(--data-blue)' },
                        { label: 'RISK MGMT', color: 'var(--nogo)' },
                        { label: 'PROJECT MGMT', color: 'var(--review)' },
                      ].map(s => (
                        <div key={s.label} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 12, paddingTop: 10, paddingBottom: 10, background: 'var(--surface)', borderRadius: '0 4px 4px 0' }}>
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
                    const sections = [
                      { key: 'business',   label: 'BUSINESS',     color: 'var(--data-blue)', match: /## 1\. Business Perspective([\s\S]*?)(?=## 2\.|$)/i },
                      { key: 'risk',       label: 'RISK MGMT',    color: 'var(--nogo)',      match: /## 2\. Risk Management([\s\S]*?)(?=## 3\.|$)/i },
                      { key: 'project',    label: 'PROJECT MGMT', color: 'var(--review)',    match: /## 3\. Project Management([\s\S]*?)$/i },
                    ]
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sections.map(s => {
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
                          Continue this conversation in AI Chat →
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
                    <span className="card-eyebrow"><span className="eyebrow-dot" />Score Summary</span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--mute)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Project: {info.name || '—'} · {info.location || '—'} · {info.type}
                    </div>
                  </div>
                  {GROUPS.map(g => {
                    const gs  = groupScore(g, criteria)
                    const pct = Math.round((gs / g.max) * 100)
                    return (
                      <div key={g.key} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{g.label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: g.color }}>{gs}/{g.max}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--hairline)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: g.color, borderRadius: 3 }} />
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-card-alt, #F4F1E8)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--mute)', letterSpacing: '0.12em' }}>TOTAL SCORE</span>
                    <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 800, fontSize: 28, color: decisionColor }}>{result.totalScore}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--mute)' }}>/135</span></span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: decisionColor, letterSpacing: '0.06em' }}>{result.decision.replace('_', ' ')}</span>
                  </div>
                </div>
              )}

              {/* Back / Next / Save buttons */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', paddingBottom: 40 }}>
                <div>
                  {step > 1 && (
                    <button type="button" className="btn btn--secondary" onClick={prevStep}>
                      ← Back
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn--secondary" onClick={() => router.back()}>
                    Cancel
                  </button>
                  {step < 7 && (
                    <button type="button" className="btn btn--primary" onClick={nextStep}>
                      Next →
                    </button>
                  )}
                  {step === 7 && (
                    <button type="submit" className="btn btn--primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save Bid'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right column: verdict panel (always visible) ── */}
            <div className={`verdict-panel verdict-panel--${decisionClass}`}>
              <div className="card-eyebrow" style={{ marginBottom: 14 }}>
                <span className="eyebrow-dot" style={{ background: 'var(--mute)' }} />
                Live Verdict
              </div>

              <div className={`verdict-headline verdict-headline--${decisionClass}`}>
                {result.decision.replace('_', ' ')}
              </div>

              <div style={{ margin: '16px 0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  Total Score
                </span>
                <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 26, color: decisionColor, letterSpacing: '-0.02em' }}>
                  {result.totalScore}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mute)', marginLeft: 2 }}>/135</span>
                </span>
              </div>
              <div className="verdict-bar-bg">
                <div className="verdict-bar-fill" style={{ width: `${scoreBarPct}%`, background: decisionColor }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5 }}>CFR Risk</div>
                  <span className={`pill pill-${result.riskIndex.toLowerCase()}`}>{result.riskIndex}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5 }}>Win Probability</div>
                  <span style={{ fontFamily: "'Archivo Narrow',sans-serif", fontWeight: 700, fontSize: 22, color: decisionColor }}>
                    {Math.round(result.expectWin * 100)}%
                  </span>
                </div>
              </div>

              {result.hardStop && (
                <div className="verdict-alert">
                  <span style={{ fontSize: 14 }}>⚠</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>Hard Stop — Commercial Risk</div>
                    <div>CFR score below threshold. Bid forced to NO GO regardless of total score.</div>
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
                        {g.label}
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

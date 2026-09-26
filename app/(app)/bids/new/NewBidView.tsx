'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/I18n'
import { Eyebrow, Minibar, OutcomePill, Pill, SectionHeader, toast } from '@/components/ui/Primitives'
import { renderMd } from '@/lib/render-md'
import {
  ALL_CRITERIA, CLIENT_CATEGORIES, CLIENT_DB, CRITERIA_GROUPS, DURATIONS, GROUP_DESC_KEY, GROUP_NAME_KEY, LOCATIONS,
  PROJECT_TYPES, SAR, SIZES, SIZE_DB, TENDER_DB, TENDER_TYPES, TYPE_DB, DECISION_DB,
  decisionCls, evaluate, findComparables, fmtDate, fmtMonth, perfColorVar,
  type Client, type PType, type Project, type Rules, type Size, type Tender,
} from '@/lib/ui/model'

const STEPS = [
  { id: 'profile', key: 'step_profile' }, { id: 'competitive', key: 'step_competitive' }, { id: 'load', key: 'step_load' },
  { id: 'contract', key: 'step_contract' }, { id: 'technical', key: 'step_technical' }, { id: 'commercial', key: 'step_commercial' },
  { id: 'review', key: 'step_review' },
]

type Draft = {
  name: string; location: string; type: PType; estValue: number; size: Size; duration: string; tenderType: Tender
  date: string; clientCategory: Client; consultant: string; pmc: string
}
const blankDraft = (): Draft => ({
  name: '', location: LOCATIONS[0], type: PROJECT_TYPES[0], estValue: 1_000_000, size: SIZES[0], duration: DURATIONS[2],
  tenderType: TENDER_TYPES[0], date: new Date().toISOString().slice(0, 10), clientCategory: CLIENT_CATEGORIES[0], consultant: '', pmc: 'None',
})
const blankScores = () => Object.fromEntries(ALL_CRITERIA.map(k => [k, 3])) as Record<string, number>
const lv = (v: number) => (v <= 1 ? ' lv-low' : v <= 3 ? ' lv-mid' : ' lv-high')

export default function NewBidView({ projects, rules }: { projects: Project[]; rules: Rules }) {
  const { t, lang } = useLang()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [bid, setBid] = useState<Draft>(blankDraft)
  const [scores, setScores] = useState<Record<string, number>>(blankScores)
  const [saving, setSaving] = useState(false)
  const ev = useMemo(() => evaluate(scores, rules), [scores, rules])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setBid(b => ({ ...b, [k]: v }))
  const groupSum = (id: string) => {
    const g = CRITERIA_GROUPS.find(x => x.id === id)!
    return { sum: g.items.reduce((a, k) => a + (scores[k] || 0), 0), max: g.items.length * 5 }
  }

  async function save() {
    if (!bid.name.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال اسم المشروع' : 'Please enter a project name')
      setStep(0); return
    }
    setSaving(true)
    const res = await fetch('/api/bids', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: bid.name.trim(), location: bid.location, type: TYPE_DB[bid.type], size: SIZE_DB[bid.size],
        duration: bid.duration, tenderType: TENDER_DB[bid.tenderType], clientCategory: CLIENT_DB[bid.clientCategory],
        consultant: bid.consultant, pmc: bid.pmc, estValue: Number(bid.estValue) || 0, date: bid.date,
        ...scores,
      }),
    })
    setSaving(false)
    if (!res.ok) { toast((await res.json().catch(() => ({}))).error ?? t('save_failed'), 'err'); return }
    toast(t('saved'), 'ok')
    router.push('/bids'); router.refresh()
  }

  const field = (labelKey: string, child: React.ReactNode) => (
    <div><label className="input-label">{t(labelKey)}</label><div className="field-help">{t('h_' + labelKey)}</div>{child}</div>
  )
  const sel = <K extends keyof Draft>(k: K, opts: readonly string[]) => (
    <select value={String(bid[k])} onChange={e => set(k, e.target.value as Draft[K])}>
      {opts.map(o => <option key={o} value={o}>{t(o)}</option>)}
    </select>
  )

  const current = STEPS[step]
  const dcls = decisionCls(ev.decision)

  return (
    <div className="page">
      <SectionHeader kicker="new_kicker" title="new_title" em="new_title_em" sub="new_sub" />
      <div className="wizard">
        <div>
          <div className="steps">
            {STEPS.map((s, idx) => {
              const gs = CRITERIA_GROUPS.some(g => g.id === s.id) ? groupSum(s.id) : null
              return (
                <button key={s.id} className={`step${idx === step ? ' current' : idx < step ? ' done' : ''}`} onClick={() => setStep(idx)}>
                  <span className="step-bar" />
                  <span className="step-num">0{idx + 1}</span>
                  <span className="step-name">{t(s.key)}</span>
                  {gs && <span className="step-score" style={{ color: perfColorVar((gs.sum / gs.max) * 100) }}>{gs.sum}/{gs.max}</span>}
                </button>
              )
            })}
          </div>

          <div>
            {current.id === 'profile' && (
              <div>
                <div className="card" style={{ padding: 22 }}>
                  <div className="card-eyebrow"><span className="dot" />STEP 01 · FOUNDATION</div>
                  <div className="card-title" style={{ marginBottom: 18 }}>{t('project_profile')}</div>
                  <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {field('project_name', <input type="text" value={bid.name} placeholder={t('placeholder_name')} onChange={e => set('name', e.target.value)} />)}
                    {field('location', sel('location', LOCATIONS))}
                    {field('type', sel('type', PROJECT_TYPES))}
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
                    {field('estimated_value', <input type="number" min="1" value={bid.estValue} onChange={e => set('estValue', Number(e.target.value))} />)}
                    {field('size', sel('size', SIZES))}
                    {field('duration', sel('duration', DURATIONS))}
                    {field('tender_type', sel('tenderType', TENDER_TYPES))}
                    {field('submission_date', <input type="date" value={bid.date} onChange={e => set('date', e.target.value)} />)}
                  </div>
                  <div className="grid grid-3">
                    {field('client_sector', sel('clientCategory', CLIENT_CATEGORIES))}
                    {field('consultant', <input type="text" value={bid.consultant} placeholder={t('consultant_ph')} onChange={e => set('consultant', e.target.value)} />)}
                    {field('pmc', <input type="text" value={bid.pmc} onChange={e => set('pmc', e.target.value)} />)}
                  </div>
                </div>
                <Comparables bid={bid} projects={projects} />
              </div>
            )}

            {current.id !== 'profile' && current.id !== 'review' && (() => {
              const g = CRITERIA_GROUPS.find(x => x.id === current.id)!
              const { sum, max } = groupSum(g.id)
              const pct = Math.round((sum / max) * 100)
              return (
                <div className="card" style={{ padding: 22 }}>
                  <div className="row-spread" style={{ marginBottom: 6 }}>
                    <div>
                      <div className="card-eyebrow"><span className="dot" style={{ background: g.color }} />{t(GROUP_NAME_KEY[g.id])}</div>
                      <div className="card-title" style={{ fontSize: 20, marginTop: 8 }}>{t(GROUP_NAME_KEY[g.id])}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="display" style={{ fontSize: 28, color: g.color, fontWeight: 800, lineHeight: 1 }}>{sum} / {max}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.15em', marginTop: 3 }}>{pct}%</div>
                    </div>
                  </div>
                  <div className="card-sub">{t(GROUP_DESC_KEY[g.id])}</div>
                  <div className="scale-hint">{t('scale_hint')}</div>
                  <div style={{ marginTop: 16, height: 4, background: 'var(--hairline-soft)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: g.color, transition: 'width 0.3s' }} />
                  </div>
                  <div className="card-divider" />
                  {g.items.map(id => (
                    <div key={id} className="criteria-row">
                      <div><div className="criteria-name">{t(id)}</div><div className="field-help">{t('h_' + id)}</div></div>
                      <div className="rating">
                        {[0, 1, 2, 3, 4, 5].map(v => (
                          <button key={v} className={`rating-btn${lv(v)}${scores[id] === v ? ' filled' : ''}`} onClick={() => setScores(s => ({ ...s, [id]: v }))}>{v}</button>
                        ))}
                      </div>
                      <div className="criteria-score">{scores[id] || 0}/5</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {current.id === 'review' && (
              <div className="card" style={{ padding: 22 }}>
                <Eyebrow k="summary" />
                <div className="card-title">{bid.name || t('placeholder_name')}</div>
                <div className="card-divider" />
                <div className="grid grid-3" style={{ gap: 14, fontSize: 12 }}>
                  {([
                    ['location', t(bid.location)], ['type', t(bid.type)], ['size', t(bid.size)],
                    ['duration', t(bid.duration)], ['tender_type', t(bid.tenderType)], ['client_sector', t(bid.clientCategory)],
                    ['estimated_value', SAR(bid.estValue, lang)], ['submission_date', fmtDate(bid.date, lang)], ['consultant', bid.consultant || '—'],
                  ] as const).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 3 }}>{t(k)}</div>
                      <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="card-divider" />
                <Eyebrow k="sub_scores" />
                <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                  {CRITERIA_GROUPS.map(g => {
                    const { sum, max } = groupSum(g.id)
                    return <Minibar key={g.id} label={t(GROUP_NAME_KEY[g.id])} value={sum} max={max} color={perfColorVar((sum / max) * 100)} display={`${sum}/${max}`} sub={`${Math.round((sum / max) * 100)}%`} />
                  })}
                </div>
                <div style={{ marginTop: 18 }}>
                  <Advisory bid={bid} scores={scores} ev={ev} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'space-between' }}>
            <div>{step > 0 && <button className="btn btn-secondary" onClick={() => setStep(s => Math.max(0, s - 1))}>← {t('back')}</button>}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => { setBid(blankDraft()); setScores(blankScores()); setStep(0) }}>↺ {t('reset')}</button>
              {step < STEPS.length - 1
                ? <button className="btn btn-primary" onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}>{t('next')} →</button>
                : <button className="btn btn-primary" disabled={saving} onClick={save}>✓ {saving ? t('saving') : t('save_bid')}</button>}
            </div>
          </div>
        </div>

        <div>
          <div className={`verdict-panel ${dcls}`}>
            <div className="card-eyebrow"><span className="dot" />{t('live_verdict')}</div>
            <div className={`verdict-headline display ${dcls}`}>{t(ev.decision)}</div>
            <div style={{ marginTop: 8 }}>
              <div className="row-spread" style={{ marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--mute)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t('total_score')}</span>
                <span className="mono num" style={{ fontSize: 14, fontWeight: 600 }}>{ev.total} <span style={{ color: 'var(--mute)' }}>/ 135</span></span>
              </div>
              <div className="verdict-bar-bg"><div className="verdict-bar-fill" style={{ width: `${(ev.total / 135) * 100}%`, background: `var(--${dcls})` }} /></div>
            </div>
            <div className="grid grid-2" style={{ marginTop: 18, gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t('risk_index')}</div>
                <div style={{ marginTop: 6 }}><Pill value={ev.riskIndex} kind="risk" /></div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t('win_pct')}</div>
                <div className="mono num" style={{ fontSize: 22, color: 'var(--ink)', marginTop: 2, fontWeight: 700 }}>{Math.round(ev.winPct * 100)}%</div>
              </div>
            </div>
            {ev.commercialFlag && (
              <div className="verdict-alert">
                <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 700 }}>⚠</span>
                <div><div style={{ fontWeight: 700, marginBottom: 3 }}>{t('hard_stop')}</div>{t('hard_stop_msg')}</div>
              </div>
            )}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>{t('sub_scores')}</div>
              {CRITERIA_GROUPS.map(g => {
                const { sum, max } = groupSum(g.id)
                return (
                  <div key={g.id} style={{ marginBottom: 10 }}>
                    <div className="row-spread" style={{ marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t(GROUP_NAME_KEY[g.id])}</span>
                      <span className="mono num" style={{ fontSize: 10.5, color: 'var(--mute)' }}>{sum}/{max}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--track)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${(sum / max) * 100}%`, height: '100%', borderRadius: 999, background: perfColorVar((sum / max) * 100), transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Comparables({ bid, projects }: { bid: Draft; projects: Project[] }) {
  const { t, lang } = useLang()
  const list = findComparables(bid, projects, 4)
  return (
    <div className="card flat" style={{ marginTop: 16, padding: 16 }}>
      <Eyebrow k="comparable_projects" />
      <div className="card-sub" style={{ marginTop: 4 }}>{t('comparable_sub')}</div>
      {list.length ? list.map(p => (
        <div key={p.id} className="comparable">
          <div>
            <div className="nm">{p.name}</div>
            <div className="meta">{[t(p.location), t(p.type), t(p.clientCategory), SAR(p.estValue, lang), fmtMonth(p.date, lang)].join(' · ')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mono num" style={{ color: 'var(--ink)', fontSize: 13 }}>{p.totalScore}</span>
            <OutcomePill o={p.outcome} />
          </div>
        </div>
      )) : <div style={{ color: 'var(--mute)', fontSize: 12, padding: '12px 0' }}>{t('no_comparables')}</div>}
    </div>
  )
}

/** AI advisory for the unsaved bid (existing /api/ai/advise endpoint), loaded on demand. */
function Advisory({ bid, scores, ev }: { bid: Draft; scores: Record<string, number>; ev: ReturnType<typeof evaluate> }) {
  const { t, lang } = useLang()
  const [state, setState] = useState<{ loading: boolean; text?: string }>({ loading: false })
  async function run() {
    setState({ loading: true })
    try {
      const res = await fetch('/api/ai/advise', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bid.name, location: bid.location, type: bid.type, size: bid.size,
          totalScore: ev.total, decision: DECISION_DB[ev.decision], riskIndex: ev.riskIndex, expectWin: ev.winPct,
          hardStop: ev.commercialFlag, lang, criteria: scores,
        }),
      })
      setState({ loading: false, text: (await res.json()).content })
    } catch { setState({ loading: false, text: t('ai_unavailable') }) }
  }
  return (
    <div className="ai-band" style={{ alignItems: 'flex-start' }}>
      <div className="ai-icon">AI</div>
      <div className="ai-content">
        <div className="ai-label">{t('ai_summary_pred')}</div>
        <div className="ai-text">
          {state.text ? <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{renderMd(state.text)}</div>
            : state.loading ? <span style={{ color: 'var(--mute)' }}>{t('ai_thinking')}</span>
              : <button className="btn btn-secondary btn-sm" onClick={run}>{lang === 'ar' ? 'توليد التوصية' : 'Generate advisory'}</button>}
        </div>
      </div>
    </div>
  )
}

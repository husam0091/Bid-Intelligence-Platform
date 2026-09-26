'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/I18n'
import { DecisionPill, Eyebrow, OutcomePill, RiskPill, SectionHeader } from '@/components/ui/Primitives'
import { CLIENT_CATEGORIES, DECISIONS, OUTCOMES, PROJECT_TYPES, SAR, applyAiFilter, fmtMonth, type Project } from '@/lib/ui/model'

type HF = { decision: string; outcome: string; client: string; type: string }

export default function HistoryView({ projects }: { projects: Project[] }) {
  const { t, lang } = useLang()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [hf, setHf] = useState<HF>({ decision: 'all', outcome: 'all', client: 'all', type: 'all' })
  const [ai, setAi] = useState<{ state: 'idle' | 'loading' | 'done'; results?: Project[] }>({ state: 'idle' })

  async function runSearch(query: string) {
    if (!query.trim()) { setAi({ state: 'idle' }); return }
    setAi({ state: 'loading' })
    try {
      const res = await fetch('/api/ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      const { filters } = res.ok ? await res.json() : { filters: { text: query } }
      const f = filters && Object.keys(filters).length ? filters : { text: query }
      setAi({ state: 'done', results: applyAiFilter(projects, f) })
    } catch {
      setAi({ state: 'done', results: applyAiFilter(projects, { text: query }) })
    }
  }
  const clearAi = () => { setAi({ state: 'idle' }); setQ('') }

  const base = ai.state === 'done' && ai.results ? ai.results
    : projects.filter(p => !q || `${p.name} ${p.location} ${p.consultant}`.toLowerCase().includes(q.toLowerCase()))
  const list = base.filter(p =>
    (hf.decision === 'all' || p.decision === hf.decision) &&
    (hf.outcome === 'all' || p.outcome === hf.outcome) &&
    (hf.client === 'all' || p.clientCategory === hf.client) &&
    (hf.type === 'all' || p.type === hf.type)
  ).sort((a, b) => a.sr - b.sr)

  const group = (labelKey: string, key: keyof HF, opts: string[]) => (
    <div className="filter-group">
      <span className="filter-label">{t(labelKey)}</span>
      <div className="chip-row" role="group" aria-label={t(labelKey)}>
        {['all', ...opts].map(o => (
          <button key={o} className={`chip${hf[key] === o ? ' active' : ''}`} aria-pressed={hf[key] === o}
            onClick={() => setHf(prev => ({ ...prev, [key]: o }))}>
            {o === 'all' ? t('all') : t(o)}
          </button>
        ))}
      </div>
    </div>
  )

  const open = (p: Project) => router.push(`/bids/${p.id}`)

  return (
    <div className="page">
      <SectionHeader kicker="hist_kicker" title="hist_title" em="hist_title_em" sub="hist_sub" />

      <div className="card" style={{ marginBottom: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <span className="search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
            </span>
            <input type="text" placeholder={t('nl_search')} value={q}
              onChange={e => { setQ(e.target.value); if (ai.state === 'done') setAi({ state: 'idle' }) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(q) } }} />
          </div>
          <button className="btn btn-primary" onClick={() => runSearch(q)}>{t('search_btn')}</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--mute)' }}>{t('nl_examples')}</div>
        <div className="filter-grid">
          {group('filter_decision', 'decision', DECISIONS)}
          {group('filter_outcome', 'outcome', OUTCOMES)}
          {group('filter_client', 'client', CLIENT_CATEGORIES)}
          {group('filter_type', 'type', PROJECT_TYPES)}
        </div>
      </div>

      {ai.state !== 'idle' && (
        <div className="ai-band">
          <div className="ai-icon">AI</div>
          <div className="ai-content">
            <div className="ai-label">AI search</div>
            <div className="ai-text">
              {ai.state === 'loading'
                ? <span style={{ color: 'var(--mute)' }}>{lang === 'ar' ? 'جارٍ تحليل الاستعلام…' : 'Reading your question…'}</span>
                : lang === 'ar'
                  ? `وجدت ${ai.results!.length} من ${projects.length} عطاءً يطابق طلبك.`
                  : `Found ${ai.results!.length} of ${projects.length} bids matching your question.`}
            </div>
          </div>
          {ai.state === 'done' && <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={clearAi}>✕</button>}
        </div>
      )}

      <div className="card pad-0">
        <div className="card-head">
          <div>
            <Eyebrow k="hist_title" />
            <div className="card-title">{t('showing')} {list.length} {t('of')} {projects.length}</div>
          </div>
        </div>
        <div className="tbl-scroll">
          <div className="hist-table">
            <div className="hist-row head" role="row">
              <div>#</div><div>{t('project')}</div><div>{t('filter_client')}</div><div>{t('location')}</div><div>{t('type')}</div>
              <div>{t('date')}</div><div className="right">{t('score')}</div><div>{t('decision')}</div><div>{t('risk')}</div>
              <div>{t('outcome')}</div><div className="right">{t('value')}</div><div />
            </div>
            {list.map(p => (
              <div key={p.id} className="hist-row clickable" role="row" tabIndex={0} title={p.name}
                onClick={() => open(p)} onKeyDown={e => { if (e.key === 'Enter') open(p) }}>
                <div className="mono" style={{ color: 'var(--mute)', fontSize: 11 }}>{p.sr}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)' }}>{t(p.tenderType)}{p.commercialFlag ? ` · ⚑ ${t('commercial_flag')}` : ''}</div>
                </div>
                <div className="dim">{t(p.clientCategory)}</div>
                <div className="dim">{t(p.location)}</div>
                <div className="dim">{t(p.type)}</div>
                <div className="mono" style={{ color: 'var(--mute)', fontSize: 11.5 }}>{fmtMonth(p.date, lang)}</div>
                <div className="right mono num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.totalScore}</div>
                <div><DecisionPill d={p.decision} /></div>
                <div><RiskPill r={p.riskIndex} /></div>
                <div><OutcomePill o={p.outcome} /></div>
                <div className="right mono num" style={{ color: 'var(--ink-2)', fontSize: 12 }}>{SAR(p.estValue, lang)}</div>
                <div className="row-chev" aria-hidden="true">›</div>
              </div>
            ))}
            {!list.length && <div className="empty">{t('no_results')}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

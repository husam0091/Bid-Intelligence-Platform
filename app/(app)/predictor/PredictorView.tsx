'use client'

import { useState } from 'react'
import { useLang } from '@/components/ui/I18n'
import { AiBand, Eyebrow, OutcomePill, SectionHeader } from '@/components/ui/Primitives'
import { ScoreDistChart } from '@/components/ui/Charts'
import { SAR, findComparables, fmtMonth, meanScore, type Project, type Rules } from '@/lib/ui/model'

export default function PredictorView({ projects, rules, initialId }: { projects: Project[]; rules: Rules; initialId?: string }) {
  const { t, lang } = useLang()
  const [id, setId] = useState(initialId && projects.some(p => p.id === initialId) ? initialId : projects[projects.length - 1]?.id)
  const current = projects.find(p => p.id === id) ?? projects[0]

  const won = projects.filter(p => p.outcome === 'Won')
  const lost = projects.filter(p => p.outcome === 'Lost')
  const avgWon = meanScore(won), avgLost = meanScore(lost)

  let prediction = '—', guidance = '', color = 'var(--mute)'
  if (current) {
    if (current.totalScore >= avgWon) { prediction = t('likely_win'); guidance = t('guidance_win'); color = 'var(--go)' }
    else if (current.totalScore >= (avgWon + avgLost) / 2) { prediction = t('borderline'); guidance = t('guidance_border'); color = 'var(--review)' }
    else { prediction = t('likely_loss'); guidance = t('guidance_loss'); color = 'var(--nogo)' }
  }

  const benchmark = (label: string, value: number | string, count: number | null, c: string, hl?: boolean) => (
    <div className={`benchmark${hl ? ' this-project' : ''}`}>
      <div className="benchmark-head">
        <span>{label}{count !== null ? ` (${count})` : ''}</span>
        <span className="v" style={{ color: c }}>{value}</span>
      </div>
      <div className="benchmark-track"><div className="benchmark-fill" style={{ width: `${(Number(value) / 135) * 100}%`, background: c }} /></div>
    </div>
  )
  const comparables = current ? findComparables(current, projects, 4) : []

  return (
    <div className="page">
      <SectionHeader kicker="pred_kicker" title="pred_title" em="pred_title_em" sub="pred_sub" />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: 18, alignItems: 'flex-start' }}>
        <div className="card" style={{ padding: 24 }}>
          <Eyebrow k="current_project" />
          <select style={{ marginTop: 8, marginBottom: 20 }} value={current?.id} onChange={e => setId(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {t(p.location)}</option>)}
          </select>
          <div className="gauge-container">
            <div className="gauge-num" style={{ color }}>{current ? current.totalScore : '—'}</div>
            <div className="gauge-denom">{t('score_of_135')}</div>
          </div>
          <div className="card-divider" />
          <Eyebrow k="prediction" />
          <div className="display" style={{ fontSize: 32, color, marginTop: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{prediction}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.55 }}>{guidance}</div>
          {current && (
            <div style={{ marginTop: 16 }}>
              <AiBand url={`/api/ai/insight?bidId=${current.id}&lang=${lang}`} pick={j => j.insight} label={t('ai_summary_pred')} />
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <Eyebrow k="benchmarks" />
            <div className="card-title">{t('historical_averages')}</div>
            <div style={{ marginTop: 16 }}>
              {benchmark(t('won_projects_avg'), avgWon.toFixed(1), won.length, 'var(--go)')}
              {benchmark(t('lost_projects_avg'), avgLost.toFixed(1), lost.length, 'var(--nogo)')}
              {current && benchmark(t('this_project'), current.totalScore, null, color, true)}
            </div>
          </div>

          {current && (
            <div className="card" style={{ marginBottom: 14 }}>
              <Eyebrow k="comparable_projects" />
              <div className="card-title">{t('comparable_sub')}</div>
              {comparables.length ? (
                <div style={{ marginTop: 10 }}>
                  {comparables.map(p => (
                    <div key={p.id} className="comparable">
                      <div>
                        <div className="nm">{p.name}</div>
                        <div className="meta">{[t(p.location), t(p.type), t(p.clientCategory), SAR(p.estValue, lang), fmtMonth(p.date, lang)].join(' · ')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="mono num" style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 600 }}>{p.totalScore}</span>
                        <OutcomePill o={p.outcome} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: 'var(--mute)', fontSize: 12, padding: '12px 0' }}>{t('no_comparables')}</div>}
            </div>
          )}

          <div className="card">
            <Eyebrow k="score_distribution" />
            <div className="card-title">{t('colored_by_outcome')}</div>
            <div style={{ marginTop: 14 }}><ScoreDistChart projects={projects} currentId={current?.id} rules={rules} /></div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--mute)', marginTop: 8, justifyContent: 'center', flexWrap: 'wrap', fontFamily: 'var(--font-mono)' }}>
              {(['Won', 'Lost', 'Pending', 'Rejected'] as const).map(k => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, background: `var(--${k === 'Won' ? 'go' : k === 'Lost' ? 'nogo' : k.toLowerCase()})`, borderRadius: 2 }} />{t(k)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

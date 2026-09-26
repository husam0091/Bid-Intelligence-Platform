'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/ui/I18n'
import {
  SAR, inExecution, type Decision, type Outcome, type Project, type Risk, type Rules,
} from '@/lib/ui/model'

// ── Page header ─────────────────────────────────────────────────────────────
export function SectionHeader({ kicker, title, em, sub, right }: {
  kicker: string; title: string; em?: string; sub?: string; right?: React.ReactNode
}) {
  const { t } = useLang()
  return (
    <header className="page-header">
      <div className="h-left">
        <div className="h-kicker"><span className="dash" />{t(kicker)}</div>
        <h1 className="h-title display">{t(title)} {em && <em>{t(em)}</em>}</h1>
        {sub && <div className="h-sub">{t(sub)}</div>}
      </div>
      {right}
    </header>
  )
}

export function Eyebrow({ k, children }: { k?: string; children?: React.ReactNode }) {
  const { t } = useLang()
  return <div className="card-eyebrow"><span className="dot" />{k ? t(k) : children}</div>
}

// ── Pills ───────────────────────────────────────────────────────────────────
export function Pill({ value, kind }: { value: string; kind: 'decision' | 'risk' | 'outcome' }) {
  const { t } = useLang()
  const cls = kind === 'decision'
    ? (value === 'GO' ? 'pill-go' : value === 'REVIEW' ? 'pill-review' : 'pill-nogo')
    : kind === 'risk' ? `pill-risk-${value}` : `pill-outcome-${value}`
  return <span className={`pill ${cls}`}>{t(value)}</span>
}
export const DecisionPill = ({ d }: { d: Decision }) => <Pill value={d} kind="decision" />
export const RiskPill     = ({ r }: { r: Risk }) => <Pill value={r} kind="risk" />
export const OutcomePill  = ({ o }: { o: Outcome }) => <Pill value={o} kind="outcome" />

// ── Sparkline ───────────────────────────────────────────────────────────────
export function Sparkline({ values, width = 200, height = 26, stroke = 'var(--c-blue)', fill = 'var(--data-blue-soft)' }: {
  values: number[]; width?: number; height?: number; stroke?: string; fill?: string
}) {
  if (values.length < 2) return null
  const min = Math.min(...values, 0), max = Math.max(...values, 1), range = max - min || 1
  const step = width / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => [i * step, height - ((v - min) / range) * height])
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg width="100%" height={height} className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={1.8} fill={stroke} />
    </svg>
  )
}

// ── KPI card with formula caption ───────────────────────────────────────────
export function KpiF({ label, value, unit, sub, spark, formula, accent = 'ink' }: {
  label: string; value: string | number; unit?: string; sub?: React.ReactNode; spark?: number[]; formula?: string; accent?: string
}) {
  const { t } = useLang()
  const v = String(value)
  return (
    <div className={`kpi accent-${accent}`}>
      <div className="kpi-label">{t(label)}</div>
      <div className={`kpi-value${v.length > 6 ? ' small' : ''}`}>{v}{unit && <span className="kpi-unit">{unit}</span>}</div>
      {sub && <div className="kpi-delta">{sub}</div>}
      {spark && spark.length > 1 && <div className="kpi-trend"><Sparkline values={spark} /></div>}
      {formula && <Formula text={formula} />}
    </div>
  )
}

export const Formula = ({ text, style }: { text: string; style?: React.CSSProperties }) => (
  <div className="kpi-formula" style={style}><span className="fx">ƒ</span><span>{text}</span></div>
)

// ── Mini bar ────────────────────────────────────────────────────────────────
export function Minibar({ label, value, max, color = 'var(--c-blue)', display, sub, target }: {
  label: React.ReactNode; value: number; max: number; color?: string; display?: string; sub?: string; target?: number
}) {
  return (
    <div className="minibar-row">
      <div className="lbl">{label}</div>
      <div className="minibar-track">
        <div className="minibar-fill" style={{ width: `${Math.min(100, max ? (value / max) * 100 : 0)}%`, background: color }} />
        {target != null && <span className="minibar-target" style={{ insetInlineStart: `calc(${(target / max) * 100}% - 1px)` }} />}
      </div>
      <div className="val">{display ?? String(value)}{sub && <span className="sub">{sub}</span>}</div>
    </div>
  )
}

export function WinLegend() {
  const { t } = useLang()
  const sw = (c: string, txt: string) => (
    <span className="legend-item" key={txt}><span className="legend-sw" style={{ background: c }} />{txt}</span>
  )
  return (
    <div className="legend" style={{ marginTop: 12 }}>
      {sw('var(--go)', '≥ 45%')}{sw('var(--review)', '30–45%')}{sw('var(--nogo)', '< 30%')}
      <span className="legend-item"><span className="legend-tick" />{t('target_short')} 45%</span>
    </div>
  )
}

// ── AI band (fetches from the app's AI endpoints) ───────────────────────────
const KEYWORDS = /(\b(?:GO|NO[\s-]GO|NO-GO|NOGO|REVIEW|HIGH RISK|LOW RISK|MEDIUM RISK)\b)/i

export function AiBand({ url, pick, label, body, fallbackKey = 'ai_unavailable' }: {
  url: string; pick: (json: any) => string | undefined; label?: string; body?: unknown; fallbackKey?: string
}) {
  const { t } = useLang()
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setText(null)
    const init = body === undefined ? undefined
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    fetch(url, init).then(r => (r.ok ? r.json() : null)).then(j => {
      if (live) setText((j && pick(j)) || t(fallbackKey))
    }).catch(() => { if (live) setText(t(fallbackKey)) })
    return () => { live = false }
  }, [url, JSON.stringify(body)]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="ai-band">
      <div className="ai-icon">AI</div>
      <div className="ai-content">
        <div className="ai-label">{label ?? t('ai_label')}</div>
        <div className="ai-text">
          {text == null
            ? <span style={{ color: 'var(--mute)' }}>{t('ai_thinking')}</span>
            : text.split(KEYWORDS).map((tok, i) => (KEYWORDS.test(tok) && tok.match(KEYWORDS)?.[0] === tok ? <b key={i}>{tok}</b> : tok))}
        </div>
      </div>
    </div>
  )
}

// ── Semicircle gauge (score out of 135, zones at REVIEW / GO) ──────────────
export function ScoreGauge({ value, rules, max = 135 }: { value: number; rules: Rules; max?: number }) {
  const W = 260, H = 150, cx = 130, cy = 132, r = 100, sw = 18
  const pt = (v: number, rad = r) => {
    const a = Math.PI - (Math.max(0, Math.min(max, v)) / max) * Math.PI
    return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)]
  }
  const arc = (a: number, b: number, color: string) => {
    const [x1, y1] = pt(a), [x2, y2] = pt(b)
    return <path d={`M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`} fill="none" stroke={color} strokeWidth={sw} />
  }
  const tick = (v: number) => {
    const [x, y] = pt(v, r + 18)
    return <text x={x.toFixed(1)} y={(y + 4).toFixed(1)} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={11} fontWeight={600} fill="var(--ink-3)">{v}</text>
  }
  const [nx, ny] = pt(value, r - 28)
  return (
    <svg viewBox={`-10 -6 ${W + 20} ${H + 10}`} className="gauge-svg" role="img" aria-label={`${value.toFixed(1)} / ${max}`}>
      {arc(0, rules.review - 0.8, 'var(--nogo)')}
      {arc(rules.review + 0.8, rules.go - 0.8, 'var(--review)')}
      {arc(rules.go + 0.8, max, 'var(--go)')}
      {tick(rules.review)}{tick(rules.go)}
      <text x={cx - r} y={cy + 20} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={10} fill="var(--mute)">0</text>
      <text x={cx + r} y={cy + 20} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={10} fill="var(--mute)">{max}</text>
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="var(--ink)" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={8} fill="var(--ink)" />
      <circle cx={cx} cy={cy} r={3} fill="var(--surface-3)" />
    </svg>
  )
}

// ── "Currently in execution" table — Won + Pending only, never NO GO ───────
export function ExecutionTable({ projects }: { projects: Project[] }) {
  const { t, lang } = useLang()
  const router = useRouter()
  const list = inExecution(projects).sort((a, b) =>
    a.outcome === b.outcome ? (b.estValue || 0) - (a.estValue || 0) : a.outcome === 'Won' ? -1 : 1)
  const open = (p: Project) => router.push(`/bids/${p.id}`)
  return (
    <div className="card pad-0">
      <div className="card-head">
        <div>
          <Eyebrow k="live_projects" />
          <div className="card-title">{t('active_execution')}</div>
        </div>
        <span className="tag">{t('n_bids', { n: list.length })}</span>
      </div>
      {!list.length ? <div className="empty">{t('exec_empty')}</div> : (
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('project')}</th><th>{t('location')}</th><th>{t('status')}</th><th>{t('decision')}</th>
                <th className="right">{t('estimated')}</th><th className="right">{t('contract')}</th>
                <th className="right">{t('actual_spend')}</th><th className="right">{t('variance')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => {
                const has = p.actualSpend > 0 && p.contractValue > 0
                const v = has ? (p.actualSpend - p.contractValue) / p.contractValue : null
                const vc = v == null ? 'var(--mute)' : Math.abs(v) < 0.05 ? 'var(--go)' : v > 0 ? 'var(--nogo)' : 'var(--review)'
                return (
                  <tr key={p.id} className="row-link" tabIndex={0} onClick={() => open(p)} onKeyDown={e => { if (e.key === 'Enter') open(p) }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>#{p.sr} · {t(p.type)} · {t(p.clientCategory)}</div>
                    </td>
                    <td className="dim">{t(p.location)}</td>
                    <td><OutcomePill o={p.outcome} /></td>
                    <td><DecisionPill d={p.decision} /></td>
                    <td className="right mono num" style={{ color: 'var(--mute)' }}>{SAR(p.estValue, lang)}</td>
                    <td className="right mono num" style={{ color: 'var(--ink)' }}>{p.contractValue ? SAR(p.contractValue, lang) : '—'}</td>
                    <td className="right mono num" style={{ color: 'var(--mute)' }}>{p.actualSpend ? SAR(p.actualSpend, lang) : '—'}</td>
                    <td className="right mono num" style={{ color: vc, fontWeight: 600 }}>{v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Toasts ──────────────────────────────────────────────────────────────────
export function toast(msg: string, kind: 'ok' | 'err' | '' = '') {
  let host = document.getElementById('toastHost')
  if (!host) {
    host = document.createElement('div')
    host.id = 'toastHost'; host.className = 'toast-host'; host.setAttribute('aria-live', 'polite')
    document.body.appendChild(host)
  }
  const n = document.createElement('div')
  n.className = `toast ${kind}`; n.textContent = msg
  host.appendChild(n)
  setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 300) }, 2800)
}

// ── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, actions }: {
  title: string; onClose: () => void; children: React.ReactNode; actions: React.ReactNode
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-title">{title}</div>
        {children}
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  )
}

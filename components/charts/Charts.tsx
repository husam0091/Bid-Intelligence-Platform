// Server-safe SVG chart primitives (no hooks) shared by the dashboard pages.
// Colours are CSS variables so charts follow light / dark mode.

const MONO = "'JetBrains Mono',monospace"

export interface VBarDatum {
  label:     string
  value:     number
  color?:    string
  /** Text drawn above the bar. Defaults to the value. */
  top?:      string
  /** Optional second line above the bar (e.g. a percentage). */
  topSub?:   string
  /** Optional second line under the category label (e.g. "31 bids"). */
  sub?:      string
}

/**
 * Vertical bar chart with value labels. Bars are capped at `maxBarW` so a chart with
 * few categories doesn't render slabs; the group is centred in the available width.
 */
export function VBarChart({ data, height = 120, maxBarW = 56, gap = 14, width = 520, max }: {
  data: VBarDatum[]; height?: number; maxBarW?: number; gap?: number; width?: number; max?: number
}) {
  const hasTopSub = data.some(d => d.topSub)
  const hasSub    = data.some(d => d.sub)
  const padT  = hasTopSub ? 30 : 16
  const padB  = hasSub ? 34 : 20
  const top   = Math.max(max ?? 0, ...data.map(d => d.value), 1)
  const n     = Math.max(data.length, 1)
  const slot  = width / n
  const barW  = Math.min(maxBarW, Math.max(6, slot - gap))
  return (
    <svg viewBox={`0 0 ${width} ${height + padT + padB}`} style={{ width: '100%', overflow: 'visible' }} role="img">
      <line x1={0} x2={width} y1={padT + height} y2={padT + height} style={{ stroke: 'var(--hairline)' }} strokeWidth={1} />
      {data.map((d, i) => {
        const barH  = d.value > 0 ? Math.max(2, Math.round((d.value / top) * height)) : 0
        const cx    = slot * i + slot / 2
        const x     = cx - barW / 2
        const y     = padT + height - barH
        const color = d.color ?? 'var(--data-blue)'
        return (
          <g key={d.label + i}>
            <title>{`${d.label}: ${d.top ?? d.value}${d.topSub ? ` (${d.topSub})` : ''}`}</title>
            {barH > 0 && <rect x={x} y={y} width={barW} height={barH} rx={2} style={{ fill: color }} opacity={0.9} />}
            <text x={cx} y={y - (d.topSub ? 15 : 4)} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily={MONO} style={{ fill: 'var(--ink)' }}>
              {d.top ?? d.value}
            </text>
            {d.topSub && (
              <text x={cx} y={y - 3} textAnchor="middle" fontSize={9.5} fontWeight={600} fontFamily={MONO} style={{ fill: color }}>
                {d.topSub}
              </text>
            )}
            <text x={cx} y={padT + height + 14} textAnchor="middle" fontSize={10} fontFamily={MONO} style={{ fill: 'var(--mute)' }}>
              {d.label}
            </text>
            {d.sub && (
              <text x={cx} y={padT + height + 27} textAnchor="middle" fontSize={9} fontFamily={MONO} style={{ fill: 'var(--mute-2)' }}>
                {d.sub}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Semicircle gauge with coloured threshold bands, tick labels at the thresholds,
 * and a needle pointing at `score`.
 */
export function ScoreGauge({ score, max, reviewMin, goMin, label, sub }: {
  score: number; max: number; reviewMin: number; goMin: number; label?: string; sub?: string
}) {
  const cx = 160; const cy = 150; const R = 118; const stroke = 22
  const angle = (v: number) => Math.PI - (Math.min(Math.max(v, 0), max) / max) * Math.PI
  const pt    = (v: number, r = R) => ({ x: cx + r * Math.cos(angle(v)), y: cy - r * Math.sin(angle(v)) })
  const arc   = (a: number, b: number) => {
    const p1 = pt(a); const p2 = pt(b)
    return `M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`
  }
  const color = score >= goMin ? 'var(--go)' : score >= reviewMin ? 'var(--review)' : 'var(--nogo)'
  const tip   = pt(score, R - stroke / 2 - 30)
  const ticks = [0, reviewMin, goMin, max]

  return (
    <svg viewBox="0 0 320 235" style={{ width: '100%', maxWidth: 420 }} role="img" aria-label={`Score ${score} of ${max}`}>
      <path d={arc(0, reviewMin)}   fill="none" strokeWidth={stroke} style={{ stroke: 'var(--nogo)' }}   opacity={0.25} />
      <path d={arc(reviewMin, goMin)} fill="none" strokeWidth={stroke} style={{ stroke: 'var(--review)' }} opacity={0.25} />
      <path d={arc(goMin, max)}     fill="none" strokeWidth={stroke} style={{ stroke: 'var(--go)' }}     opacity={0.25} />
      {score > 0 && <path d={arc(0, score)} fill="none" strokeWidth={stroke - 10} strokeLinecap="round" style={{ stroke: color }} />}
      {ticks.map(t => {
        const o = pt(t, R + stroke / 2 + 10)
        return (
          <text key={t} x={o.x} y={o.y + 3} textAnchor="middle" fontSize={10} fontFamily={MONO} style={{ fill: 'var(--mute)' }}>{t}</text>
        )
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} strokeWidth={3.5} strokeLinecap="round" style={{ stroke: 'var(--ink)' }} />
      <circle cx={cx} cy={cy} r={8} style={{ fill: 'var(--ink)' }} />
      <circle cx={cx} cy={cy} r={3} style={{ fill: 'var(--canvas)' }} />
      <text x={cx} y={cy + 44} textAnchor="middle" fontSize={36} fontWeight={800} fontFamily="'Archivo Narrow',sans-serif" style={{ fill: color }}>
        {score}<tspan fontSize={12} fontWeight={400} fontFamily={MONO} style={{ fill: 'var(--mute)' }}> / {max}</tspan>
      </text>
      {label && <text x={cx} y={cy + 64} textAnchor="middle" fontSize={11} fontFamily={MONO} style={{ fill: 'var(--ink-2)' }}>{label}</text>}
      {sub && <text x={cx} y={cy + 79} textAnchor="middle" fontSize={9.5} fontFamily={MONO} style={{ fill: 'var(--mute)' }}>{sub}</text>}
    </svg>
  )
}

/** Small caption under a KPI value explaining how it is calculated. */
export function KpiFormula({ children }: { children: React.ReactNode }) {
  return (
    <span className="kpi-formula" title={typeof children === 'string' ? children : undefined}>
      <span aria-hidden style={{ opacity: 0.7 }}>ƒ </span>{children}
    </span>
  )
}

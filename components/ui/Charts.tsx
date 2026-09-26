'use client'

// Chart.js wrappers ported from the prototype. Colours are read from CSS variables
// at draw time so light / dark themes re-skin the charts.

import { useEffect, useRef } from 'react'
import { Chart, registerables, type ChartConfiguration, type Plugin } from 'chart.js'
import { useLang } from '@/components/ui/I18n'
import { SAR, fmtShort, type Project, type Rules } from '@/lib/ui/model'

type Colors = Record<string, string>

function readColors(): Colors {
  const s = getComputedStyle(document.body)
  const v = (n: string) => s.getPropertyValue(n).trim()
  return {
    ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), mute: v('--mute'),
    hairline: v('--hairline'), hairlineSoft: v('--hairline-soft'),
    surface3: v('--surface-3'), blue: v('--c-blue'), amber: v('--c-amber'), blueSoft: v('--data-blue-soft'),
    GO: v('--go'), REVIEW: v('--review'), 'NO GO': v('--nogo'),
    Won: v('--go'), Lost: v('--nogo'), Pending: v('--pending'), Rejected: v('--rejected'),
  }
}
/** Chart.js can't read CSS variables — resolve `var(--x)` to its computed value. */
const resolveVar = (c: string) =>
  c.startsWith('var(') ? getComputedStyle(document.body).getPropertyValue(c.slice(4, -1)).trim() || c : c
const winColor = (C: Colors, v: number) => (v >= 45 ? C.GO : v >= 30 ? C.REVIEW : C['NO GO'])

// Value labels at bar ends (or stack totals)
const valueLabels: Plugin = {
  id: 'valueLabels',
  afterDraw(chart, _args, opts: any) {
    if (!opts?.display) return
    const { ctx } = chart
    const hz = (chart.options as any).indexAxis === 'y'
    const fmt = opts.format || ((v: number) => v)
    const fs = opts.size || 11
    const C = opts.colors as Colors
    ctx.save()
    ctx.font = `600 ${fs}px "JetBrains Mono", monospace`
    const draw = (raw: unknown, x: number, y: number, align: CanvasTextAlign, base: CanvasTextBaseline) => {
      const txt = String(raw)
      ctx.textAlign = align; ctx.textBaseline = base
      const w = ctx.measureText(txt).width, bh = fs + 4
      const bx = align === 'left' ? x - 3 : x - w / 2 - 3
      const by = base === 'middle' ? y - bh / 2 : y - bh + 2
      ctx.fillStyle = C.surface3; ctx.fillRect(bx, by, w + 6, bh)
      ctx.fillStyle = C.ink2; ctx.fillText(txt, x, y)
    }
    if (opts.stackTotal) {
      const m0 = chart.getDatasetMeta(0)
      for (let j = 0; j < (chart.data.labels?.length ?? 0); j++) {
        let sum = 0
        chart.data.datasets.forEach((ds, i) => { if (chart.isDatasetVisible(i)) sum += Number(ds.data[j]) || 0 })
        if (!sum || !m0.data[j]) continue
        draw(fmt(sum), m0.data[j].x, (chart.scales as any).y.getPixelForValue(sum) - 4, 'center', 'bottom')
      }
    } else {
      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i)
        if (meta.hidden || meta.type !== 'bar') return
        meta.data.forEach((bar: any, j) => {
          const v = ds.data[j]
          if (v == null) return
          if (hz) draw(fmt(v), bar.x + 6, bar.y, 'left', 'middle')
          else draw(fmt(v), bar.x, bar.y - 4, 'center', 'bottom')
        })
      })
    }
    ctx.restore()
  },
}

// Dashed reference lines (targets / thresholds)
const refLines: Plugin = {
  id: 'refLines',
  afterDatasetsDraw(chart, _args, opts: any) {
    if (!opts?.lines) return
    const { ctx, chartArea: a } = chart
    const hz = (chart.options as any).indexAxis === 'y'
    const scale: any = hz ? chart.scales.x : chart.scales.y
    opts.lines.forEach((l: { value: number; label: string; color: string }) => {
      const p = scale.getPixelForValue(l.value)
      ctx.save()
      ctx.strokeStyle = l.color; ctx.globalAlpha = 0.85; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.25
      ctx.beginPath()
      if (hz) { ctx.moveTo(p, a.top); ctx.lineTo(p, a.bottom) } else { ctx.moveTo(a.left, p); ctx.lineTo(a.right, p) }
      ctx.stroke()
      ctx.setLineDash([]); ctx.globalAlpha = 1
      ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.fillStyle = l.color
      if (hz) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(l.label, p, a.top - 3) }
      else { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(l.label, a.right, p - 3) }
      ctx.restore()
    })
  },
}

let registered = false
function ensureRegistered() {
  if (registered) return
  Chart.register(...registerables, valueLabels, refLines)
  Chart.defaults.font.family = "'Inter Tight', system-ui, sans-serif"
  Chart.defaults.font.size = 11.5
  Chart.defaults.animation = { duration: 450 } as any
  registered = true
}

function commonOpts(C: Colors): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 18, right: 8 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: C.surface3, borderColor: C.hairline, borderWidth: 1,
        titleColor: C.ink, bodyColor: C.ink2, padding: 12, cornerRadius: 10,
        titleFont: { family: 'Inter Tight', size: 12, weight: 600 },
        bodyFont: { family: 'JetBrains Mono', size: 11.5 },
        boxPadding: 6, usePointStyle: true, caretSize: 6,
      },
    },
    scales: {
      x: { ticks: { color: C.ink3, font: { size: 11.5 } }, grid: { display: false }, border: { color: C.hairline } },
      y: { ticks: { color: C.mute, font: { size: 10.5, family: 'JetBrains Mono' }, padding: 6 }, grid: { color: C.hairlineSoft }, border: { display: false }, beginAtZero: true },
    },
  }
}
const legendOpts = (C: Colors) => ({
  display: true, position: 'bottom', align: 'start',
  labels: { color: C.ink3, font: { size: 12 }, padding: 14, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 },
})

/** Mounts a Chart.js chart on a canvas; rebuilds whenever `deps` change. */
function useChart(build: (C: Colors) => ChartConfiguration, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ensureRegistered()
    const chart = new Chart(ref.current, build(readColors()))
    return () => chart.destroy()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}

const Box = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div style={{ position: 'relative', height }}>{children}</div>
)

// ── Doughnut ────────────────────────────────────────────────────────────────
export function DoughnutChart({ data, height = 140, center }: {
  data: { label: string; value: number; color: string }[]; height?: number; center?: React.ReactNode
}) {
  const ref = useChart(C => {
    const o = commonOpts(C)
    return {
      type: 'doughnut',
      data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => resolveVar(d.color)), borderWidth: 0, borderRadius: 6, spacing: 3, hoverOffset: 6 } as any] },
      options: { ...o, layout: { padding: 6 }, interaction: { mode: 'nearest', intersect: true }, cutout: '72%', scales: {} },
    }
  }, [JSON.stringify(data)])
  return (
    <Box height={height}>
      <canvas ref={ref} />
      {center && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>{center}</div>}
    </Box>
  )
}

// ── Bar (vertical / horizontal, % or values, optional target line) ─────────
export interface BarDatum { label: string | string[]; value: number; color?: string; sub?: string }
export function BarChart({ data, height = 220, horizontal, unit, target, colorByWin, format, yFormat, tooltipFormat }: {
  data: BarDatum[]; height?: number; horizontal?: boolean; unit?: '%'; target?: number; colorByWin?: boolean
  format?: (v: number) => string; yFormat?: (v: number) => string; tooltipFormat?: (v: number) => string
}) {
  const { t, lang } = useLang()
  const ref = useChart(C => {
    const o = commonOpts(C)
    const pct = unit === '%'
    const fmt = format || ((v: number) => (pct ? Math.round(v) + '%' : String(v)))
    if (horizontal) {
      o.indexAxis = 'y'
      o.layout.padding = { top: 16, right: 42 }
      o.scales = {
        x: { beginAtZero: true, max: pct ? 100 : undefined, ticks: { color: C.mute, font: { size: 10.5, family: 'JetBrains Mono' }, callback: (v: number) => (pct ? v + '%' : v), maxTicksLimit: 6 }, grid: { color: C.hairlineSoft }, border: { display: false } },
        y: { ticks: { color: C.ink2, font: { size: 12.5, weight: 500 } }, grid: { display: false }, border: { color: C.hairline } },
      }
    } else {
      if (pct) { o.scales.y.max = 100; o.scales.y.ticks.callback = (v: number) => v + '%' }
      if (yFormat) o.scales.y.ticks.callback = yFormat
      o.layout.padding = { top: 22, right: 8 }
    }
    const tfmt = tooltipFormat || fmt
    o.plugins.valueLabels = { display: true, format: fmt, colors: C }
    if (target != null) o.plugins.refLines = { lines: [{ value: target, label: `${t('target_short')} ${target}${pct ? '%' : ''}`, color: C.ink3 }] }
    o.plugins.tooltip.callbacks = {
      title: (i: any[]) => { const l = data[i[0].dataIndex].label; return Array.isArray(l) ? l[0] : l },
      label: (c: any) => ` ${tfmt(c.raw)}${data[c.dataIndex].sub ? '  ·  ' + data[c.dataIndex].sub : ''}`,
    }
    return {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => (colorByWin ? winColor(C, d.value) : resolveVar(d.color ?? C.blue))),
          borderRadius: 6, borderSkipped: false, barThickness: horizontal ? 22 : undefined, maxBarThickness: 44, categoryPercentage: 0.7,
        } as any],
      },
      options: o,
    }
  }, [JSON.stringify(data), lang, horizontal, unit, target])
  return <Box height={height}><canvas ref={ref} /></Box>
}

// ── Stacked bar (outcomes or decisions per period) ──────────────────────────
export function StackedChart({ buckets, keys, height = 230 }: {
  buckets: ({ label: string } & Record<string, number | string>)[]; keys: string[]; height?: number
}) {
  const { t, lang } = useLang()
  const ref = useChart(C => {
    const o = commonOpts(C)
    o.scales.x.stacked = true
    o.scales.y.stacked = true
    o.scales.y.ticks.precision = 0
    o.plugins.legend = legendOpts(C)
    o.plugins.valueLabels = { display: true, stackTotal: true, colors: C }
    return {
      type: 'bar',
      data: {
        labels: buckets.map(b => b.label),
        datasets: keys.map(k => ({
          label: t(k), data: buckets.map(b => Number(b[k]) || 0), backgroundColor: C[k],
          borderColor: C.surface3, borderWidth: 1.5, borderRadius: 4, borderSkipped: false, maxBarThickness: 38,
        })),
      },
      options: o,
    }
  }, [JSON.stringify(buckets), keys.join(), lang])
  return <Box height={height}><canvas ref={ref} /></Box>
}

// ── Combo: Estimated / Contract bars + Actual spend line ────────────────────
export function ValueTrackingChart({ buckets, height = 260 }: {
  buckets: { label: string; est: number; contract: number; actual: number }[]; height?: number
}) {
  const { t, lang } = useLang()
  const ref = useChart(C => {
    const o = commonOpts(C)
    o.scales.y.ticks.callback = (v: number) => fmtShort(v)
    o.plugins.legend = legendOpts(C)
    o.plugins.tooltip.callbacks = { label: (c: any) => ` ${c.dataset.label}:  ${SAR(c.raw, lang)}` }
    return {
      type: 'bar',
      data: {
        labels: buckets.map(b => b.label),
        datasets: [
          { type: 'line', label: t('spend'), data: buckets.map(b => b.actual), borderColor: C.amber, backgroundColor: C.amber, borderWidth: 2.5, tension: 0.35, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: C.surface3, pointBorderColor: C.amber, pointBorderWidth: 2, order: 0 } as any,
          { type: 'bar', label: t('estimated'), data: buckets.map(b => b.est), backgroundColor: C.blueSoft, borderRadius: 6, borderSkipped: false, maxBarThickness: 28, order: 1 },
          { type: 'bar', label: t('contract'), data: buckets.map(b => b.contract), backgroundColor: C.blue, borderRadius: 6, borderSkipped: false, maxBarThickness: 28, order: 1 },
        ],
      },
      options: o,
    }
  }, [JSON.stringify(buckets), lang])
  return <Box height={height}><canvas ref={ref} /></Box>
}

// ── Ranked score distribution (horizontal), thresholds at REVIEW / GO ──────
export function ScoreDistChart({ projects, currentId, rules }: { projects: Project[]; currentId?: string; rules: Rules }) {
  const { t, lang } = useLang()
  const sorted = [...projects].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
  const ref = useChart(C => {
    const o = commonOpts(C)
    o.indexAxis = 'y'
    o.layout.padding = { top: 18, right: 34 }
    o.interaction = { mode: 'nearest', axis: 'y', intersect: false }
    o.scales = {
      x: { min: 0, max: 135, ticks: { stepSize: 15, color: C.mute, font: { size: 10.5, family: 'JetBrains Mono' } }, grid: { color: C.hairlineSoft }, border: { display: false } },
      y: { ticks: { color: C.ink2, autoSkip: false, font: (c: any) => ({ size: 11.5, weight: sorted[c.index]?.id === currentId ? 700 : 400 }) }, grid: { display: false }, border: { color: C.hairline } },
    }
    o.plugins.valueLabels = { display: true, size: 10.5, colors: C }
    o.plugins.refLines = { lines: [
      { value: rules.review, label: `${t('REVIEW')} ${rules.review}`, color: C.REVIEW },
      { value: rules.go, label: `${t('GO')} ${rules.go}`, color: C.GO },
    ] }
    o.plugins.tooltip.callbacks = {
      title: (i: any[]) => sorted[i[0].dataIndex].name,
      label: (c: any) => { const p = sorted[c.dataIndex]; return ` ${p.totalScore} / 135  ·  ${t(p.outcome)}` },
    }
    return {
      type: 'bar',
      data: {
        labels: sorted.map(p => p.name),
        datasets: [{
          data: sorted.map(p => p.totalScore),
          backgroundColor: sorted.map(p => C[p.outcome] || C.mute),
          borderColor: sorted.map(p => (p.id === currentId ? C.ink : 'transparent')),
          borderWidth: 2, borderRadius: 4, borderSkipped: false, barThickness: 12,
        } as any],
      },
      options: o,
    }
  }, [sorted.map(p => p.id + p.totalScore + p.outcome).join(), currentId, rules.go, rules.review, lang])
  return <Box height={Math.max(220, sorted.length * 20.6 + 70)}><canvas ref={ref} /></Box>
}

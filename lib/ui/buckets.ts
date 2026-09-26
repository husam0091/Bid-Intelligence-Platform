import type { Lang, Project } from '@/lib/ui/model'

const qKey = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3) + 1
  return { label: `Q${q} '${String(d.getFullYear()).slice(2)}`, sort: d.getFullYear() * 10 + q }
}

/** Outcome counts per quarter (Pipeline "Bids over time"). */
export function quarterlyOutcomes(projects: Project[]) {
  const map: Record<string, any> = {}
  projects.forEach(p => {
    const { label, sort } = qKey(new Date(p.date))
    map[label] ??= { label, sort, Won: 0, Lost: 0, Pending: 0, Rejected: 0 }
    map[label][p.outcome]++
  })
  return Object.values(map).sort((a, b) => a.sort - b.sort)
}

/** Monthly total bids (sparkline input). */
export function monthlyTotals(projects: Project[]) {
  const map: Record<number, number> = {}
  projects.forEach(p => { const d = new Date(p.date); const k = d.getFullYear() * 100 + d.getMonth(); map[k] = (map[k] ?? 0) + 1 })
  return Object.keys(map).map(Number).sort((a, b) => a - b).map(k => map[k])
}

/** Quarterly est. value (all bids) and contract / spend (won bids). */
export function quarterValues(projects: Project[]) {
  const map: Record<string, { label: string; sort: number; est: number; contract: number; actual: number }> = {}
  projects.forEach(p => {
    const { label, sort } = qKey(new Date(p.date))
    map[label] ??= { label, sort, est: 0, contract: 0, actual: 0 }
    map[label].est += p.estValue || 0
    if (p.outcome === 'Won') { map[label].contract += p.contractValue || 0; map[label].actual += p.actualSpend || 0 }
  })
  return Object.values(map).sort((a, b) => a.sort - b.sort)
}

/** Decision counts for each of the last 12 calendar months. */
export function last12Months(projects: Project[], lang: Lang) {
  const now = new Date()
  const out = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2)
    const sub = projects.filter(p => { const x = new Date(p.date); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() })
    out.push({ label, GO: sub.filter(p => p.decision === 'GO').length, REVIEW: sub.filter(p => p.decision === 'REVIEW').length, 'NO GO': sub.filter(p => p.decision === 'NO GO').length })
  }
  return out
}

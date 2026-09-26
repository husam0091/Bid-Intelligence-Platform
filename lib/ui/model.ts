// View model shared by the server pages and the client UI.
// Converts DB enums (BUILDING, NO_GO, WON…) to the display keys the UI and i18n
// dictionary use (Building, NO GO, Won…), and back again for writes.

import { deriveFromScore, commercialScore, MAX_SCORE, type ScoringConfig } from '@/lib/decision'

export { MAX_SCORE }

export type Outcome   = 'Won' | 'Lost' | 'Pending' | 'Rejected'
export type Decision  = 'GO' | 'REVIEW' | 'NO GO'
export type Risk      = 'LOW' | 'MEDIUM' | 'HIGH'
export type PType     = 'Building' | 'Infrastructure' | 'Industrial'
export type Client    = 'Gov' | 'Private' | 'Semi'
export type Tender    = 'Open' | 'Limited' | 'Negotiated'
export type Size      = 'Medium/Small' | 'Large' | 'Mega'

export const CRITERIA_GROUPS = [
  { id: 'competitive', color: 'var(--c-blue)',  items: ['relStrength','budgetKnown','competitors','limitedInv','similarExp','noPriceBreakers','techAdv','withinExpertise','lowChanges','goodLocation'] },
  { id: 'load',        color: 'var(--c-teal)',  items: ['teamAvail','equipAvail','cashFlow','currWorkload','noImpactRunning'] },
  { id: 'contract',    color: 'var(--c-amber)', items: ['ld','apg','perfBond','retention'] },
  { id: 'technical',   color: 'var(--c-plum)',  items: ['newSystem','complexMEP','specialAuth'] },
  { id: 'commercial',  color: 'var(--c-slate)', items: ['clientRep','clearDwgs','advPayment','payments','finDuration'] },
] as const
export const GROUP_NAME_KEY: Record<string, string> = { competitive: 'competitive_position', load: 'company_load_factor', contract: 'contractual_risk', technical: 'technical_risk', commercial: 'commercial_financial_risk' }
export const GROUP_DESC_KEY: Record<string, string> = { competitive: 'competitive_desc', load: 'load_desc', contract: 'contractual_desc', technical: 'technical_desc', commercial: 'commercial_desc' }
export const GROUP_STEP_KEY: Record<string, string> = { competitive: 'step_competitive', load: 'step_load', contract: 'step_contract', technical: 'step_technical', commercial: 'step_commercial' }
export const ALL_CRITERIA: string[] = CRITERIA_GROUPS.flatMap(g => [...g.items])

export const LOCATIONS = ['Riyadh','Jeddah','Mecca (Makkah)','Medina (Madinah)','Dammam','Al-Khobar','Dhahran','Tabuk','Abha','Umluj',"Ha'il",'Al-Ahsa (Hofuf)','Al-Qatif','Yanbu','Najran','Al-Bahah','Jazan (Jizan)','Al-Kharj','Al-Ula','Ras Tanura','Jubail','Al Qasim']
export const PROJECT_TYPES: PType[]   = ['Building', 'Infrastructure', 'Industrial']
export const SIZES: Size[]            = ['Medium/Small', 'Large', 'Mega']
export const DURATIONS                = ['6 Months', '1 Year', '2 Year', '3 Year', '4 Year', '5 Year']
export const TENDER_TYPES: Tender[]   = ['Open', 'Limited', 'Negotiated']
export const CLIENT_CATEGORIES: Client[] = ['Gov', 'Private', 'Semi']
export const OUTCOMES: Outcome[]      = ['Pending', 'Won', 'Lost', 'Rejected']
export const DECISIONS: Decision[]    = ['GO', 'REVIEW', 'NO GO']

// ── enum maps ────────────────────────────────────────────────────────────────
const inv = <K extends string, V extends string>(m: Record<K, V>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<V, K>

export const TYPE_MAP    = { BUILDING: 'Building', INFRASTRUCTURE: 'Infrastructure', INDUSTRIAL: 'Industrial' } as const
export const SIZE_MAP    = { MEDIUM_SMALL: 'Medium/Small', LARGE: 'Large', MEGA: 'Mega' } as const
export const TENDER_MAP  = { OPEN: 'Open', LIMITED: 'Limited', NEGOTIATED: 'Negotiated' } as const
export const CLIENT_MAP  = { GOV: 'Gov', PRIVATE: 'Private', SEMI: 'Semi' } as const
export const OUTCOME_MAP = { WON: 'Won', LOST: 'Lost', PENDING: 'Pending', REJECTED: 'Rejected' } as const
export const DECISION_MAP = { GO: 'GO', REVIEW: 'REVIEW', NO_GO: 'NO GO' } as const

export const TYPE_DB     = inv(TYPE_MAP)
export const SIZE_DB     = inv(SIZE_MAP)
export const TENDER_DB   = inv(TENDER_MAP)
export const CLIENT_DB   = inv(CLIENT_MAP)
export const OUTCOME_DB  = inv(OUTCOME_MAP)
export const DECISION_DB = inv(DECISION_MAP)

// ── Project (view model) ─────────────────────────────────────────────────────
export interface Project {
  id: string
  sr: number
  name: string
  location: string
  type: PType
  size: Size
  duration: string
  tenderType: Tender
  clientCategory: Client
  consultant: string
  pmc: string
  mainCompetitor: string
  remarks: string
  estValue: number
  contractValue: number
  actualSpend: number
  date: string
  outcome: Outcome
  decision: Decision
  riskIndex: Risk
  totalScore: number
  expectWin: number
  commercialFlag: boolean
  cfr: number
  createdBy: string
  createdByName: string
  scores: Record<string, number>
}

type BidRow = Record<string, any> & { creator?: { name: string } | null }

export function toProject(b: BidRow): Project {
  const scores: Record<string, number> = {}
  for (const k of ALL_CRITERIA) scores[k] = Number(b[k] ?? 0)
  return {
    id: b.id, sr: b.sr, name: b.name, location: b.location,
    type: (TYPE_MAP as any)[b.type], size: (SIZE_MAP as any)[b.size], duration: b.duration ?? '',
    tenderType: (TENDER_MAP as any)[b.tenderType], clientCategory: (CLIENT_MAP as any)[b.clientCategory],
    consultant: b.consultant ?? '', pmc: b.pmc ?? '', mainCompetitor: b.mainCompetitor ?? '', remarks: b.remarks ?? '',
    estValue: b.estValue ?? 0, contractValue: b.contractValue ?? 0, actualSpend: b.actualSpend ?? 0,
    date: new Date(b.date).toISOString(),
    outcome: (OUTCOME_MAP as any)[b.outcome], decision: (DECISION_MAP as any)[b.decision], riskIndex: b.riskIndex,
    totalScore: b.totalScore, expectWin: b.expectWin, commercialFlag: !!b.hardStop,
    cfr: commercialScore(scores),
    createdBy: b.createdBy, createdByName: b.creator?.name ?? '',
    scores,
  }
}

// ── Rules (scoring config in UI shape) ───────────────────────────────────────
export interface Rules { go: number; review: number; commercialFlag: number; bands: { min: number; p: number }[] }

export const toRules = (c: ScoringConfig): Rules =>
  ({ go: c.goMin, review: c.reviewMin, commercialFlag: c.cfrFlagMin, bands: c.winBands })
export const fromRules = (r: Rules): ScoringConfig =>
  ({ goMin: r.go, reviewMin: r.review, cfrFlagMin: r.commercialFlag, winBands: r.bands })

export function evaluate(scores: Record<string, number>, r: Rules) {
  const total = ALL_CRITERIA.reduce((a, k) => a + (Number(scores[k]) || 0), 0)
  const cfr = commercialScore(scores)
  const d = deriveFromScore(total, cfr, fromRules(r))
  return { total, cfr, decision: DECISION_MAP[d.decision] as Decision, riskIndex: d.riskIndex as Risk, winPct: d.expectWin, commercialFlag: d.hardStop }
}

// ── Stats ────────────────────────────────────────────────────────────────────
export function winStats(list: Project[]) {
  const won = list.filter(p => p.outcome === 'Won').length
  const lost = list.filter(p => p.outcome === 'Lost').length
  const decided = won + lost
  return { won, lost, decided, rate: decided ? won / decided : 0 }
}
export const sumOf = (list: Project[], key: 'estValue' | 'contractValue' | 'actualSpend') =>
  list.reduce((s, p) => s + (Number(p[key]) || 0), 0)
export const meanScore = (list: Project[]) => list.length ? list.reduce((s, p) => s + (p.totalScore || 0), 0) / list.length : 0
export const inExecution = (list: Project[]) =>
  list.filter(p => (p.outcome === 'Won' || p.outcome === 'Pending') && p.decision !== 'NO GO')

// ── Formatters ───────────────────────────────────────────────────────────────
export type Lang = 'en' | 'ar'
export function SAR(n: number | null | undefined, lang: Lang = 'en') {
  if (n == null || isNaN(n)) return '—'
  const prefix = lang === 'ar' ? 'ر.س' : 'SAR'
  const a = Math.abs(n)
  if (a >= 1e9) return `${prefix} ${(n / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${prefix} ${(n / 1e6).toFixed(2)}M`
  if (a >= 1e3) return `${prefix} ${(n / 1e3).toFixed(0)}K`
  return `${prefix} ${Math.round(n).toLocaleString()}`
}
export const PCT = (n: number | null | undefined) => (n == null || isNaN(n) ? '—' : `${Math.round(n * 100)}%`)
export function fmtShort(n: number) {
  const a = Math.abs(n)
  if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return Math.round(n / 1e3) + 'K'
  return String(Math.round(n))
}
const locale = (lang: Lang) => (lang === 'ar' ? 'ar-SA' : 'en-GB')
export function fmtMonth(s: string, lang: Lang) {
  const d = new Date(s)
  return isNaN(+d) ? '—' : d.toLocaleDateString(locale(lang), { month: 'short', year: '2-digit' })
}
export function fmtDate(s: string, lang: Lang) {
  const d = new Date(s)
  return isNaN(+d) ? '—' : d.toLocaleDateString(locale(lang), { day: '2-digit', month: 'short', year: 'numeric' })
}
export function fmtDateTime(s: string, lang: Lang) {
  const d = new Date(s)
  return isNaN(+d) ? '—' : d.toLocaleString(locale(lang), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export const winColorVar  = (v: number) => (v >= 45 ? 'var(--go)' : v >= 30 ? 'var(--review)' : 'var(--nogo)')
export const decisionCls  = (d: Decision) => (d === 'GO' ? 'go' : d === 'REVIEW' ? 'review' : 'nogo')
export const levelCls     = (v: number) => (v <= 2 ? 'lv-low' : v === 3 ? 'lv-mid' : 'lv-high')
export const perfColorVar = (pct: number) => (pct >= 70 ? 'var(--go)' : pct >= 50 ? 'var(--review)' : 'var(--nogo)')

/** Applies a filter object returned by /api/ai/search (DB enum values) to view-model projects. */
export function applyAiFilter(list: Project[], f: Record<string, any>): Project[] {
  const eq = (map: Record<string, string>, v: unknown) => (v ? map[String(v)] ?? String(v) : undefined)
  const outcome = eq(OUTCOME_MAP, f.outcome), decision = eq(DECISION_MAP, f.decision)
  const type = eq(TYPE_MAP, f.type), client = eq(CLIENT_MAP, f.clientCategory), tender = eq(TENDER_MAP, f.tenderType)
  return list.filter(p => {
    if (outcome && p.outcome !== outcome) return false
    if (decision && p.decision !== decision) return false
    if (f.riskIndex && p.riskIndex !== f.riskIndex) return false
    if (type && p.type !== type) return false
    if (client && p.clientCategory !== client) return false
    if (tender && p.tenderType !== tender) return false
    if (f.location && !p.location.toLowerCase().includes(String(f.location).split(' (')[0].toLowerCase())) return false
    if (f.minValue && p.estValue < f.minValue) return false
    if (f.maxValue && p.estValue > f.maxValue) return false
    if (f.minScore && p.totalScore < f.minScore) return false
    if (f.maxScore && p.totalScore > f.maxScore) return false
    const y = new Date(p.date).getFullYear()
    if (f.yearFrom && y < f.yearFrom) return false
    if (f.yearTo && y > f.yearTo) return false
    if (f.text && !`${p.name} ${p.consultant} ${p.location}`.toLowerCase().includes(String(f.text).toLowerCase())) return false
    return true
  })
}

/** Similar decided bids: same type / sector / size / tender / location and closest value. */
export function findComparables(bid: Pick<Project, 'type' | 'clientCategory' | 'size' | 'tenderType' | 'location' | 'estValue'> & { id?: string }, projects: Project[], n = 4) {
  return projects
    .filter(p => (p.outcome === 'Won' || p.outcome === 'Lost') && p.id !== bid.id)
    .map(p => {
      let s = 0
      if (p.type === bid.type) s += 3
      if (p.clientCategory === bid.clientCategory) s += 2
      if (p.size === bid.size) s += 2
      if (p.tenderType === bid.tenderType) s += 1
      if (p.location === bid.location) s += 1
      if (bid.estValue && p.estValue) s += (Math.min(bid.estValue, p.estValue) / Math.max(bid.estValue, p.estValue)) * 2
      return { p, s }
    })
    .sort((a, b) => b.s - a.s).slice(0, n).map(x => x.p)
}

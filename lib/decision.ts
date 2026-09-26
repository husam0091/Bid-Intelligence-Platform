export type RiskIndex = 'LOW' | 'MEDIUM' | 'HIGH'
export type Decision  = 'GO' | 'REVIEW' | 'NO_GO'

export interface DecisionResult {
  totalScore: number
  riskIndex:  RiskIndex
  decision:   Decision
  expectWin:  number
  /** Advisory flag: commercial & financial sub-score is below `cfrFlagMin`. Does NOT override the decision. */
  hardStop:   boolean
}

export interface WinBand { min: number; p: number }

/**
 * Org-level scoring configuration. Editable by ADMIN only (Settings → Scoring Formula).
 * Decision and risk are derived from the total score with one unified rule set:
 *   score >= goMin               → GO     | LOW risk
 *   reviewMin <= score < goMin   → REVIEW | MEDIUM risk
 *   score < reviewMin            → NO GO  | HIGH risk
 */
export interface ScoringConfig {
  goMin:      number
  reviewMin:  number
  cfrFlagMin: number
  winBands:   WinBand[]
}

export const MAX_SCORE = 135

export const DEFAULT_SCORING: ScoringConfig = {
  goMin:      80,
  reviewMin:  65,
  cfrFlagMin: 13,
  winBands: [
    { min: 90, p: 0.75 },
    { min: 75, p: 0.51 },
    { min: 65, p: 0.3825 },
    { min: 50, p: 0.18 },
    { min: 0,  p: 0.09 },
  ],
}

export const COMMERCIAL_IDS = [
  'clientRep', 'clearDwgs', 'advPayment', 'payments', 'finDuration',
] as const

export function commercialScore(criteria: Record<string, number>): number {
  return COMMERCIAL_IDS.reduce((sum, k) => sum + (criteria[k] ?? 0), 0)
}

export function decisionForScore(total: number, cfg: ScoringConfig = DEFAULT_SCORING): { decision: Decision; riskIndex: RiskIndex } {
  if (total >= cfg.goMin)     return { decision: 'GO',     riskIndex: 'LOW' }
  if (total >= cfg.reviewMin) return { decision: 'REVIEW', riskIndex: 'MEDIUM' }
  return { decision: 'NO_GO', riskIndex: 'HIGH' }
}

export function winProbabilityForScore(total: number, cfg: ScoringConfig = DEFAULT_SCORING): number {
  const bands = [...cfg.winBands].sort((a, b) => b.min - a.min)
  for (const b of bands) if (total >= b.min) return b.p
  return bands.length ? bands[bands.length - 1].p : 0
}

export function deriveFromScore(total: number, cfr: number, cfg: ScoringConfig = DEFAULT_SCORING): DecisionResult {
  const { decision, riskIndex } = decisionForScore(total, cfg)
  return {
    totalScore: total,
    riskIndex,
    decision,
    expectWin: winProbabilityForScore(total, cfg),
    hardStop:  cfr < cfg.cfrFlagMin,
  }
}

export function computeDecision(criteria: Record<string, number>, cfg: ScoringConfig = DEFAULT_SCORING): DecisionResult {
  const total = Object.values(criteria).reduce((a, b) => a + b, 0)
  return deriveFromScore(total, commercialScore(criteria), cfg)
}

/** Validates and normalises an untrusted config object; falls back to defaults field by field. */
export function normaliseScoring(raw: unknown): ScoringConfig {
  const r = (raw ?? {}) as Partial<ScoringConfig>
  const int = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : d)
  const bands = Array.isArray(r.winBands)
    ? r.winBands
        .filter(b => b && typeof b.min === 'number' && typeof b.p === 'number')
        .map(b => ({ min: Math.max(0, Math.round(b.min)), p: Math.min(1, Math.max(0, b.p)) }))
    : []
  return {
    goMin:      int(r.goMin,      DEFAULT_SCORING.goMin),
    reviewMin:  int(r.reviewMin,  DEFAULT_SCORING.reviewMin),
    cfrFlagMin: int(r.cfrFlagMin, DEFAULT_SCORING.cfrFlagMin),
    winBands:   bands.length ? bands.sort((a, b) => b.min - a.min) : DEFAULT_SCORING.winBands,
  }
}

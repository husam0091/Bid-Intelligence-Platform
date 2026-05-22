export type RiskIndex = 'LOW' | 'MEDIUM' | 'HIGH'
export type Decision  = 'GO' | 'REVIEW' | 'NO_GO'

export interface DecisionResult {
  totalScore: number
  riskIndex:  RiskIndex
  decision:   Decision
  expectWin:  number
  hardStop:   boolean
}

const COMMERCIAL_IDS = [
  'clientRep', 'clearDwgs', 'advPayment', 'payments', 'finDuration',
] as const

export function computeDecision(criteria: Record<string, number>): DecisionResult {
  const cfr   = COMMERCIAL_IDS.reduce((sum, k) => sum + (criteria[k] ?? 0), 0)
  const total = Object.values(criteria).reduce((a, b) => a + b, 0)

  const riskIndex: RiskIndex = cfr >= 20 ? 'LOW' : cfr >= 13 ? 'MEDIUM' : 'HIGH'
  const hardStop = riskIndex === 'HIGH'

  let decision: Decision
  let expectWin: number

  if (total >= 90) {
    decision  = hardStop ? 'NO_GO' : 'GO'
    expectWin = hardStop ? 0.18 : riskIndex === 'LOW' ? 0.75 : 0.60
  } else if (total >= 75) {
    decision  = hardStop ? 'NO_GO' : 'GO'
    expectWin = hardStop ? 0.18 : riskIndex === 'LOW' ? 0.60 : 0.51
  } else if (total >= 60) {
    decision  = hardStop ? 'NO_GO' : 'REVIEW'
    expectWin = 0.3825
  } else if (total >= 50) {
    decision  = 'NO_GO'
    expectWin = 0.18
  } else {
    decision  = 'NO_GO'
    expectWin = 0.09
  }

  return { totalScore: total, riskIndex, decision, expectWin, hardStop }
}

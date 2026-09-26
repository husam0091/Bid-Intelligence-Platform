import { computeDecision, deriveFromScore, decisionForScore, winProbabilityForScore, normaliseScoring, DEFAULT_SCORING } from '../lib/decision'
import { winRate } from '../lib/metrics'

const ALL_ZERO: Record<string, number> = {
  relStrength:0, budgetKnown:0, competitors:0, limitedInv:0, similarExp:0,
  noPriceBreakers:0, techAdv:0, withinExpertise:0, lowChanges:0, goodLocation:0,
  teamAvail:0, equipAvail:0, cashFlow:0, currWorkload:0, noImpactRunning:0,
  ld:0, apg:0, perfBond:0, retention:0,
  newSystem:0, complexMEP:0, specialAuth:0,
  clientRep:0, clearDwgs:0, advPayment:0, payments:0, finDuration:0,
}

const ALL_FIVE: Record<string, number> = Object.fromEntries(
  Object.keys(ALL_ZERO).map(k => [k, 5])
)

describe('unified decision rules (score → decision + risk)', () => {
  test.each([
    [135, 'GO',     'LOW'],
    [80,  'GO',     'LOW'],
    [79,  'REVIEW', 'MEDIUM'],
    [75,  'REVIEW', 'MEDIUM'],   // Excel: 75 routes to REVIEW, never GO
    [65,  'REVIEW', 'MEDIUM'],
    [64,  'NO_GO',  'HIGH'],
    [54,  'NO_GO',  'HIGH'],     // Excel: low scores are HIGH risk, not MEDIUM
    [25,  'NO_GO',  'HIGH'],
    [0,   'NO_GO',  'HIGH'],
  ])('score %i → %s / %s', (score, decision, risk) => {
    expect(decisionForScore(score)).toEqual({ decision, riskIndex: risk })
  })

  test('decision and risk never contradict each other', () => {
    for (let s = 0; s <= 135; s++) {
      const { decision, riskIndex } = decisionForScore(s)
      expect({ GO: 'LOW', REVIEW: 'MEDIUM', NO_GO: 'HIGH' }[decision]).toBe(riskIndex)
    }
  })
})

describe('win probability', () => {
  test.each([
    [135, 0.75], [90, 0.75],
    [89, 0.51], [87, 0.51], [85, 0.51], [76, 0.51], [75, 0.51],   // Excel keeps 51% for 76 / 85 / 87
    [74, 0.3825], [65, 0.3825],
    [64, 0.18], [50, 0.18],
    [49, 0.09], [0, 0.09],
  ])('score %i → %d', (score, p) => {
    expect(winProbabilityForScore(score)).toBe(p)
  })
})

describe('computeDecision', () => {
  test('all zeros → NO_GO, HIGH, 9%, commercial flag', () => {
    const r = computeDecision(ALL_ZERO)
    expect(r.totalScore).toBe(0)
    expect(r.riskIndex).toBe('HIGH')
    expect(r.decision).toBe('NO_GO')
    expect(r.expectWin).toBe(0.09)
    expect(r.hardStop).toBe(true)
  })

  test('all fives → GO, LOW, 75%', () => {
    const r = computeDecision(ALL_FIVE)
    expect(r.totalScore).toBe(135)
    expect(r.riskIndex).toBe('LOW')
    expect(r.decision).toBe('GO')
    expect(r.expectWin).toBe(0.75)
    expect(r.hardStop).toBe(false)
  })

  test('score 51 (Al Rimal seed bid) → NO_GO, HIGH, 18%', () => {
    const r = computeDecision({
      ...ALL_ZERO,
      relStrength:2, budgetKnown:5, competitors:2, limitedInv:2, similarExp:2,
      noPriceBreakers:2, techAdv:2, withinExpertise:2, lowChanges:2, goodLocation:5,
      teamAvail:2, equipAvail:4, noImpactRunning:1,
      ld:2, apg:2,
      newSystem:2,
      clientRep:5, clearDwgs:1, advPayment:3, payments:1, finDuration:2,
    })
    expect(r.totalScore).toBe(51)
    expect(r.riskIndex).toBe('HIGH')
    expect(r.decision).toBe('NO_GO')
    expect(r.expectWin).toBe(0.18)
  })

  test('commercial flag is advisory: high score with weak CFR stays GO', () => {
    const r = computeDecision({ ...ALL_FIVE, clientRep:0, clearDwgs:0, advPayment:0, payments:0, finDuration:0 })
    expect(r.totalScore).toBe(110)
    expect(r.hardStop).toBe(true)
    expect(r.decision).toBe('GO')
    expect(r.riskIndex).toBe('LOW')
  })

  test('custom thresholds are respected', () => {
    const cfg = { ...DEFAULT_SCORING, goMin: 100, reviewMin: 90 }
    expect(deriveFromScore(95, 25, cfg).decision).toBe('REVIEW')
    expect(deriveFromScore(100, 25, cfg).decision).toBe('GO')
    expect(deriveFromScore(89, 25, cfg).decision).toBe('NO_GO')
  })
})

describe('normaliseScoring', () => {
  test('falls back to defaults for missing / invalid fields', () => {
    expect(normaliseScoring(null)).toEqual(DEFAULT_SCORING)
    expect(normaliseScoring({ goMin: 'x', winBands: 'nope' })).toEqual(DEFAULT_SCORING)
  })
  test('sorts bands descending and clamps probabilities', () => {
    const c = normaliseScoring({ winBands: [{ min: 0, p: -1 }, { min: 90, p: 2 }] })
    expect(c.winBands).toEqual([{ min: 90, p: 1 }, { min: 0, p: 0 }])
  })
})

describe('winRate', () => {
  test('won ÷ (won + lost), never hardcoded', () => {
    expect(winRate(9, 3)).toBe(75)
    expect(winRate(0, 0)).toBe(0)
    expect(winRate(5, 0)).toBe(100)
    expect(winRate(1, 2)).toBe(33)
  })
})

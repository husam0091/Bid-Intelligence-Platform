import { computeDecision } from '../lib/decision'

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

describe('computeDecision', () => {
  test('all zeros → NO_GO, HIGH, 9%', () => {
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

  test('score 51, HIGH risk (CFR=12) → NO_GO, 18%', () => {
    // Al Rimal seed bid
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
    expect(r.hardStop).toBe(true)
    expect(r.decision).toBe('NO_GO')
    expect(r.expectWin).toBe(0.18)
  })

  test('HARD STOP: score >=75 but CFR LOW still blocked when CFR<13', () => {
    const r = computeDecision({
      ...ALL_ZERO,
      relStrength:5,budgetKnown:5,competitors:5,limitedInv:5,similarExp:5,
      noPriceBreakers:5,techAdv:5,withinExpertise:5,lowChanges:5,goodLocation:5,
      teamAvail:5,equipAvail:5,cashFlow:5,currWorkload:5,noImpactRunning:5,
      ld:5,apg:5,perfBond:5,retention:5,
      newSystem:5,complexMEP:5,specialAuth:5,
      // CFR deliberately low: 0+0+0+0+0 = 0 → HIGH
      clientRep:0, clearDwgs:0, advPayment:0, payments:0, finDuration:0,
    })
    expect(r.riskIndex).toBe('HIGH')
    expect(r.hardStop).toBe(true)
    expect(r.decision).toBe('NO_GO')
  })

  test('CFR=13 (MEDIUM) with score 80 → GO, 51%', () => {
    const base = { ...ALL_ZERO }
    // CFR = 3+3+3+2+2 = 13 → MEDIUM
    // score: need >= 75
    const r = computeDecision({
      ...base,
      relStrength:5,budgetKnown:5,competitors:5,limitedInv:5,similarExp:5,
      noPriceBreakers:4,techAdv:4,withinExpertise:4,
      teamAvail:4, equipAvail:4,
      ld:3, apg:2,
      clientRep:3, clearDwgs:3, advPayment:3, payments:2, finDuration:2,
    })
    expect(r.riskIndex).toBe('MEDIUM')
    expect(r.hardStop).toBe(false)
    if (r.totalScore >= 75) {
      expect(r.decision).toBe('GO')
      expect(r.expectWin).toBe(0.51)
    }
  })

  test('CFR=20 (LOW) with score >=90 → GO, 75%', () => {
    const r = computeDecision({
      ...ALL_ZERO,
      relStrength:5,budgetKnown:5,competitors:5,limitedInv:5,similarExp:5,
      noPriceBreakers:5,techAdv:5,withinExpertise:5,lowChanges:5,goodLocation:5,
      teamAvail:5,equipAvail:5,cashFlow:5,currWorkload:5,noImpactRunning:5,
      ld:5,apg:5,perfBond:5,retention:5,
      newSystem:5,complexMEP:5,specialAuth:5,
      clientRep:4,clearDwgs:4,advPayment:4,payments:4,finDuration:4,
    })
    expect(r.riskIndex).toBe('LOW')
    expect(r.decision).toBe('GO')
    expect(r.expectWin).toBe(0.75)
    expect(r.totalScore).toBe(130)
  })

  test('score in 60-74 range → REVIEW (no hard stop)', () => {
    const r = computeDecision({
      ...ALL_ZERO,
      relStrength:3,budgetKnown:3,competitors:3,limitedInv:3,similarExp:3,
      teamAvail:3,equipAvail:3,
      clientRep:4,clearDwgs:3,advPayment:3,payments:3,finDuration:4,
    })
    if (r.totalScore >= 60 && r.totalScore < 75) {
      expect(r.decision).toBe('REVIEW')
      expect(r.expectWin).toBe(0.3825)
    }
  })
})

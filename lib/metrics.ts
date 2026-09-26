/**
 * Win rate = Won ÷ (Won + Lost) × 100 — i.e. won bids over completed (decided) bids.
 * PENDING bids are not decided yet and REJECTED bids were never competed, so both are excluded.
 */
export function winRate(won: number, lost: number): number {
  const completed = won + lost
  return completed > 0 ? Math.round((won / completed) * 100) : 0
}

export const WIN_RATE_FORMULA    = 'Won ÷ (Won + Lost)'
export const WIN_RATE_FORMULA_AR = 'الفائز ÷ (الفائز + الخاسر)'

/** Bids that belong in a "Currently in Execution" table: never NO GO, never REJECTED/LOST. */
export const EXECUTION_WHERE = {
  outcome:  { in: ['PENDING', 'WON'] as ('PENDING' | 'WON')[] },
  decision: { not: 'NO_GO' as const },
}

export function toM(v: number): number {
  return Math.round((v / 1_000_000) * 10) / 10
}

export function fmtM(v: number): string {
  const m = v / 1_000_000
  return `${m >= 100 ? Math.round(m).toLocaleString('en-US') : m.toFixed(1)}M`
}

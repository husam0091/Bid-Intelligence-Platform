import { prisma } from '@/lib/prisma'
import { DEFAULT_SCORING, normaliseScoring, type ScoringConfig } from '@/lib/decision'

export async function getScoringConfig(orgId: string): Promise<ScoringConfig> {
  const row = await prisma.scoringConfig.findUnique({ where: { orgId } })
  if (!row) return DEFAULT_SCORING
  return normaliseScoring({ goMin: row.goMin, reviewMin: row.reviewMin, cfrFlagMin: row.cfrFlagMin, winBands: row.winBands })
}

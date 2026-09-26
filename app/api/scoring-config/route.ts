import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getActor, unauthorized, forbidden, can } from '@/lib/rbac'
import { getScoringConfig } from '@/lib/scoring-config'
import { deriveFromScore, commercialScore, MAX_SCORE } from '@/lib/decision'
import { logAudit, diff } from '@/lib/audit'

const Schema = z.object({
  goMin:      z.number().int().min(1).max(MAX_SCORE),
  reviewMin:  z.number().int().min(0).max(MAX_SCORE),
  cfrFlagMin: z.number().int().min(0).max(25),
  winBands:   z.array(z.object({ min: z.number().int().min(0).max(MAX_SCORE), p: z.number().min(0).max(1) })).min(1).max(10),
}).refine(c => c.reviewMin < c.goMin, { message: 'REVIEW threshold must be below the GO threshold', path: ['reviewMin'] })
  .refine(c => c.winBands.some(b => b.min === 0), { message: 'Win-probability bands must include a band starting at 0', path: ['winBands'] })

/** Everyone can read the formula (read-only for non-admins). */
export async function GET() {
  const actor = await getActor()
  if (!actor) return unauthorized()
  const config = await getScoringConfig(actor.orgId)
  return NextResponse.json({ config, canEdit: can.editScoring(actor.role) })
}

/** ADMIN only. Saves thresholds and re-derives decision / risk / win % on every existing bid. */
export async function PUT(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (!can.editScoring(actor.role)) return forbidden()

  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid configuration' }, { status: 422 })

  const next   = { ...parsed.data, winBands: [...parsed.data.winBands].sort((a, b) => b.min - a.min) }
  const before = await getScoringConfig(actor.orgId)

  await prisma.scoringConfig.upsert({
    where:  { orgId: actor.orgId },
    create: { orgId: actor.orgId, ...next, updatedBy: actor.id },
    update: { ...next, updatedBy: actor.id },
  })

  const bids = await prisma.bid.findMany({
    where:  { orgId: actor.orgId },
    select: { id: true, totalScore: true, decision: true, riskIndex: true, expectWin: true, hardStop: true,
              clientRep: true, clearDwgs: true, advPayment: true, payments: true, finDuration: true },
  })
  const updates = bids.flatMap(b => {
    const d = deriveFromScore(b.totalScore, commercialScore(b as unknown as Record<string, number>), next)
    const changed = d.decision !== b.decision || d.riskIndex !== b.riskIndex || d.expectWin !== b.expectWin || d.hardStop !== b.hardStop
    return changed
      ? [prisma.bid.update({ where: { id: b.id }, data: { decision: d.decision, riskIndex: d.riskIndex, expectWin: d.expectWin, hardStop: d.hardStop } })]
      : []
  })
  if (updates.length) await prisma.$transaction(updates)

  await logAudit(actor, {
    action: 'SCORING_UPDATE', entity: 'SCORING',
    summary: `Updated scoring formula — ${updates.length} bid(s) re-classified`,
    changes: diff(before as unknown as Record<string, unknown>, next),
  })

  return NextResponse.json({ config: next, recomputed: updates.length })
}

import { prisma } from '@/lib/prisma'
import type { Actor } from '@/lib/rbac'

export type AuditAction =
  | 'BID_CREATE' | 'BID_UPDATE' | 'BID_DELETE' | 'BID_STATUS'
  | 'BULK_IMPORT' | 'DATA_RESET' | 'BACKUP_EXPORT'
  | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE' | 'USER_PASSWORD_RESET'
  | 'SCORING_UPDATE'

export interface FieldChange { field: string; from: unknown; to: unknown }

function norm(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString()
  return v ?? null
}

/** Field-level diff of `after` against `before`, limited to the keys present in `after`. */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>): FieldChange[] {
  const out: FieldChange[] = []
  for (const key of Object.keys(after)) {
    const a = norm(before[key]); const b = norm(after[key])
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ field: key, from: a, to: b })
  }
  return out
}

/** Snapshot helper for creations/deletions: every field recorded as from→to. */
export function snapshot(obj: Record<string, unknown>, direction: 'create' | 'delete'): FieldChange[] {
  const skip = new Set(['id', 'orgId', 'createdAt', 'updatedAt', 'createdBy'])
  return Object.entries(obj)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => direction === 'create'
      ? { field: k, from: null, to: norm(v) }
      : { field: k, from: norm(v), to: null })
}

export async function logAudit(actor: Actor, entry: {
  action:    AuditAction
  entity:    'BID' | 'USER' | 'SCORING' | 'SYSTEM'
  entityId?: string | null
  bidSr?:    number | null
  summary?:  string
  changes?:  FieldChange[] | Record<string, unknown>
}) {
  try {
    await prisma.auditLog.create({
      data: {
        orgId:     actor.orgId,
        userId:    actor.id,
        userName:  actor.name,
        userEmail: actor.email,
        action:    entry.action,
        entity:    entry.entity,
        entityId:  entry.entityId ?? null,
        bidSr:     entry.bidSr ?? null,
        summary:   entry.summary ?? '',
        changes:   (entry.changes ?? undefined) as any,
      },
    })
  } catch (err) {
    // Auditing must never break the user's action, but it must be visible in logs.
    console.error('[audit] failed to write audit log', err)
  }
}

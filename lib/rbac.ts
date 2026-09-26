import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export type Role = 'ESTIMATOR' | 'MANAGER' | 'EXECUTIVE' | 'ADMIN'

export interface Actor {
  id:    string
  name:  string
  email: string
  role:  Role
  orgId: string
}

/**
 * Permission boundaries (single source of truth).
 *  ADMIN     – everything: users, bulk import/export, audit log, scoring formula, danger zone.
 *  MANAGER   – create bids, edit any bid in the org.
 *  ESTIMATOR / EXECUTIVE – create bids (estimator) and edit ONLY bids they created.
 *  Nobody but ADMIN may manage users, view audit logs, edit the scoring formula or reset data.
 */
export const can = {
  manageUsers:   (r: string) => r === 'ADMIN',
  viewAudit:     (r: string) => r === 'ADMIN',
  editScoring:   (r: string) => r === 'ADMIN',
  dangerZone:    (r: string) => r === 'ADMIN',
  bulkData:      (r: string) => r === 'ADMIN',
  deleteBid:     (r: string) => r === 'ADMIN',
  editAnyBid:    (r: string) => r === 'ADMIN' || r === 'MANAGER',
  editBid:       (r: string, userId: string, bid: { createdBy: string }) =>
    r === 'ADMIN' || r === 'MANAGER' || bid.createdBy === userId,
}

/**
 * Resolves the signed-in user from the DATABASE (not just the JWT), so a role change
 * or deactivation takes effect immediately on every protected API call.
 */
export async function getActor(): Promise<Actor | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const u = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, orgId: true, active: true },
  })
  if (!u || !u.active) return null
  return { id: u.id, name: u.name, email: u.email, role: u.role as Role, orgId: u.orgId }
}

export const unauthorized = () => NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
export const forbidden    = () => NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' }, { status: 403 })

/** Returns the actor if ADMIN, otherwise a ready-made 401/403 response. */
export async function requireAdmin(): Promise<Actor | NextResponse> {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (actor.role !== 'ADMIN') return forbidden()
  return actor
}

// Read-only description of what each role can do, shown in Settings → Team & Roles.
// Mirrors the rules enforced server-side in lib/rbac.ts, middleware.ts and the API routes.

export const ROLES = ['ADMIN', 'EXECUTIVE', 'MANAGER', 'ESTIMATOR'] as const
export type RoleName = (typeof ROLES)[number]

export const ROLE_COLORS: Record<RoleName, string> = {
  ADMIN: 'var(--ink)', EXECUTIVE: 'var(--c-plum)', MANAGER: 'var(--c-blue)', ESTIMATOR: 'var(--c-teal)',
}

export const PERMISSIONS = [
  { group: 'perm_g_dash',  items: ['view_dashboards', 'view_analytics', 'view_executive'] },
  { group: 'perm_g_bids',  items: ['create_bids', 'view_history', 'edit_outcome', 'delete_bids'] },
  { group: 'perm_g_intel', items: ['use_ai'] },
  { group: 'perm_g_data',  items: ['export_data', 'import_data', 'reset_data'] },
  { group: 'perm_g_admin', items: ['manage_users'] },
] as const

/** true = allowed, 'own' = only on bids the user created, false = denied. */
export const MATRIX: Record<RoleName, Record<string, boolean | 'own'>> = {
  ADMIN:     { view_dashboards: true, view_analytics: true, view_executive: true,  create_bids: true,  view_history: true, edit_outcome: true,  delete_bids: true,  use_ai: true, export_data: true,  import_data: true,  reset_data: true,  manage_users: true },
  EXECUTIVE: { view_dashboards: true, view_analytics: true, view_executive: true,  create_bids: false, view_history: true, edit_outcome: 'own', delete_bids: false, use_ai: true, export_data: false, import_data: false, reset_data: false, manage_users: false },
  MANAGER:   { view_dashboards: true, view_analytics: true, view_executive: false, create_bids: true,  view_history: true, edit_outcome: true,  delete_bids: false, use_ai: true, export_data: false, import_data: false, reset_data: false, manage_users: false },
  ESTIMATOR: { view_dashboards: true, view_analytics: false, view_executive: false, create_bids: true,  view_history: true, edit_outcome: 'own', delete_bids: false, use_ai: true, export_data: false, import_data: false, reset_data: false, manage_users: false },
}

export const roleKey = (r: string) => 'role_' + r.toLowerCase()
export const initials = (name: string) =>
  (name || '').split(/\s+/).filter(Boolean).map(w => w.replace(/^(Al-|M\.)/, '')).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

/** Maps server audit actions to the i18n label keys. */
export const ACTION_KEY: Record<string, string> = {
  BID_CREATE: 'act_bid_created', BID_UPDATE: 'act_bid_updated', BID_STATUS: 'act_bid_status', BID_DELETE: 'act_bid_deleted',
  BULK_IMPORT: 'act_bulk_import', DATA_RESET: 'act_data_reset', BACKUP_EXPORT: 'act_backup_export',
  USER_CREATE: 'act_user_added', USER_UPDATE: 'act_user_updated', USER_DELETE: 'act_user_deleted',
  USER_PASSWORD_RESET: 'act_password_reset_admin', SCORING_UPDATE: 'act_rules_updated',
}
/** CSS modifier for the action tag colour. */
export const actionClass = (a: string) =>
  a.startsWith('BID') ? 'action-bid' : a.startsWith('USER') ? 'action-user' : a === 'SCORING_UPDATE' ? 'action-rules' : 'action-data'

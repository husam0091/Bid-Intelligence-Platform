import dict from '@/lib/i18n-dict.json'
import type { Lang, Rules } from '@/lib/ui/model'

// Strings the prototype did not need (real sign-out, extra nav pages, server messages).
const EXTRA: Record<Lang, Record<string, string>> = {
  en: {
    ai_unavailable: 'Could not generate insight right now.',
    sign_out: 'Sign out', nav_reports: 'Reports', nav_ai: 'AI Chat',
    readonly_bid: 'Read-only — you can only edit bids you created.',
    saving: 'Saving…', saved: 'Saved', save_failed: 'Save failed',
    reauth_failed: 'Email or password is incorrect.',
    danger_zone_desc: "Permanently deletes all bids, AI conversations and report logs. The audit trail is kept. This can't be undone.",
    dz_modal_msg: 'This permanently deletes all bids, AI conversations and report logs. Confirm with your own administrator credentials.',
    dz_done: 'All data deleted', dz_bad_email: 'Email or password is incorrect.',
    reset_data: 'Reset all data',
    data_management_desc: 'Export a full JSON backup of all bids, or bulk-import bids from Excel / CSV (use the template for the column format).',
    import_json: 'Import (.xlsx / .csv)', download_template: 'Download template', imported_ok: '{n} bids imported', imported_failed: '{n} rows failed',
    um_confirm_reset: 'Set a temporary password for {email}. They must change it at next sign-in.',
    um_temp_pw: 'Temporary password (min 8 characters)', um_pw_set: 'Temporary password set for {email}',
    um_added: 'Added', um_actions: 'Actions', um_must_change: 'Must change password',
    um_readonly: 'Only administrators can manage users. The permissions below are shown read-only.',
    rp_sub: 'What each role can see and do. These rules are enforced by the server; change a user\'s role to change their access.',
    perm_own: 'own bids only', view_dashboards: 'View pipeline dashboard', view_analytics: 'View analytics & reports', perm_edit_note: 'Estimators and executives can only update bids they created.',
    act_bid_status: 'Status updated', act_bulk_import: 'Bulk import', act_backup_export: 'Backup exported',
    act_user_updated: 'User updated', act_password_reset_admin: 'Password reset',
    fld_mainCompetitor: 'Main competitor', fld_name: 'Name', fld_email: 'Email', fld_active: 'Active',
    fld_goMin: 'GO threshold', fld_reviewMin: 'REVIEW threshold', fld_cfrFlagMin: 'Commercial flag', fld_winBands: 'Win bands',
    ac_pw_wrong: 'Current password is incorrect.', ac_pw_relogin: 'Password updated — please sign in again.',
  },
  ar: {
    ai_unavailable: 'تعذر توليد الرؤية الآن.',
    sign_out: 'تسجيل الخروج', nav_reports: 'التقارير', nav_ai: 'مساعد الذكاء',
    readonly_bid: 'للعرض فقط — يمكنك تعديل العطاءات التي أنشأتها فقط.',
    saving: 'جارٍ الحفظ…', saved: 'تم الحفظ', save_failed: 'فشل الحفظ',
    reauth_failed: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    danger_zone_desc: 'حذف دائم لجميع العطاءات ومحادثات الذكاء الاصطناعي وسجلات التقارير. يتم الاحتفاظ بسجل التدقيق. لا يمكن التراجع.',
    dz_modal_msg: 'سيؤدي هذا إلى حذف جميع العطاءات والمحادثات وسجلات التقارير نهائياً. أكّد ببيانات دخولك كمسؤول.',
    dz_done: 'تم حذف جميع البيانات', dz_bad_email: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    reset_data: 'إعادة تعيين جميع البيانات',
    data_management_desc: 'صدّر نسخة JSON كاملة من جميع العطاءات، أو استورد عطاءات من Excel / CSV (استخدم القالب لمعرفة الأعمدة).',
    import_json: 'استيراد (.xlsx / .csv)', download_template: 'تنزيل القالب', imported_ok: 'تم استيراد {n} عطاء', imported_failed: 'فشل {n} صف',
    um_confirm_reset: 'عيّن كلمة مرور مؤقتة لـ {email}. سيُطلب منه تغييرها عند تسجيل الدخول التالي.',
    um_temp_pw: 'كلمة مرور مؤقتة (8 أحرف على الأقل)', um_pw_set: 'تم تعيين كلمة مرور مؤقتة لـ {email}',
    um_added: 'تاريخ الإضافة', um_actions: 'الإجراءات', um_must_change: 'يجب تغيير كلمة المرور',
    um_readonly: 'يمكن للمسؤولين فقط إدارة المستخدمين. الصلاحيات أدناه للعرض فقط.',
    rp_sub: 'ما يمكن لكل دور رؤيته وفعله. يفرض الخادم هذه القواعد؛ غيّر دور المستخدم لتغيير صلاحياته.',
    perm_own: 'عطاءاته فقط', view_dashboards: 'عرض لوحة خط الأنابيب', view_analytics: 'عرض التحليلات والتقارير', perm_edit_note: 'يمكن للمُسعّرين والتنفيذيين تحديث العطاءات التي أنشؤوها فقط.',
    act_bid_status: 'تحديث الحالة', act_bulk_import: 'استيراد جماعي', act_backup_export: 'تصدير نسخة احتياطية',
    act_user_updated: 'تحديث مستخدم', act_password_reset_admin: 'إعادة تعيين كلمة المرور',
    fld_mainCompetitor: 'المنافس الرئيسي', fld_name: 'الاسم', fld_email: 'البريد الإلكتروني', fld_active: 'نشط',
    fld_goMin: 'حد القبول', fld_reviewMin: 'حد المراجعة', fld_cfrFlagMin: 'التنبيه التجاري', fld_winBands: 'شرائح الفوز',
    ac_pw_wrong: 'كلمة المرور الحالية غير صحيحة.', ac_pw_relogin: 'تم تحديث كلمة المرور — يرجى تسجيل الدخول مجدداً.',
  },
}

const D: Record<Lang, Record<string, string>> = {
  en: { ...(dict as any).en, ...EXTRA.en },
  ar: { ...(dict as any).ar, ...EXTRA.ar },
}

export type T = (key: string, vars?: Record<string, string | number>) => string

/** Dictionary lookup (falls back to English, then to the key itself), with {placeholder} substitution. */
export function makeT(lang: Lang): T {
  return (key, vars) => {
    let s = D[lang]?.[key] ?? D.en[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
    return s
  }
}

/** Fills {go} / {review} placeholders in formula strings with the live thresholds. */
export const fmtRule = (t: T, key: string, r: Rules, extra: Record<string, string | number> = {}) =>
  t(key, { go: r.go, review: r.review, ...extra })

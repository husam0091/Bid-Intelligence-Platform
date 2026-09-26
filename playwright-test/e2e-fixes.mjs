// End-to-end checks for RBAC, audit trail, danger-zone re-auth, sorting and chart fixes.
// Usage: start the app against a seeded DB (admin@black.sa / changeme, mustChange=false), then
//   BASE=http://localhost:3055 node e2e-fixes.mjs
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
const BASE = process.env.BASE ?? 'http://localhost:3055'
const OUT  = process.env.OUT ?? 'screenshots-e2e'
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium' })
let fails = 0
const ok = (cond, label, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${label} ${extra}`); if (!cond) fails++ }

async function login(ctx, email, pw) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', pw)
  await page.click('button[type=submit]')
  await page.waitForURL(/dashboard|change-password/, { timeout: 20000 })
  return page
}

const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const a = await login(admin, 'admin@black.sa', 'changeme')
const shot = async (p, n, full = true) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full })

// ── Pages
for (const [path, name] of [['/dashboard','01-dashboard'],['/executive','02-executive'],['/analytics','03-analytics'],['/bids?decision=GO&clientCategory=GOV','05-bids-filtered']]) {
  await a.goto(BASE + path); await a.waitForLoadState('networkidle'); await shot(a, name)
}
const bids = (await (await a.request.get(`${BASE}/api/bids`)).json()).data
ok(bids.every((b, i) => i === 0 || bids[i-1].sr < b.sr), 'API /api/bids sorted ascending by sr')
await a.goto(`${BASE}/predictor?id=${bids[4].id}`); await a.waitForLoadState('networkidle'); await shot(a, '04-predictor')
const card = await a.locator('text=Colored by outcome').locator('xpath=ancestor::div[contains(concat(" ",@class," ")," card ")][1]').boundingBox()
const svg  = await a.locator('text=Colored by outcome').locator('xpath=ancestor::div[contains(concat(" ",@class," ")," card ")][1]').locator('canvas').first().boundingBox()
ok(svg.x + svg.width <= card.x + card.width + 1, 'Score distribution fits inside its card', JSON.stringify({ svgR: svg.x + svg.width, cardR: card.x + card.width }))

// Execution table never contains NO GO / REJECTED
await a.goto(`${BASE}/executive`)
const execText = await a.locator('text=Currently in execution').locator('xpath=ancestor::div[contains(concat(" ",@class," ")," card ")][1]//tbody').innerText()
ok(!/NO GO|REJECTED/.test(execText), 'Executive execution table excludes NO GO / REJECTED')
const winKpi = await a.locator('.kpi', { hasText: 'Win Rate' }).innerText()
ok(/Won ÷ \(Won \+ Lost\)/.test(winKpi), 'Win Rate KPI shows its formula', JSON.stringify(winKpi))
ok(await a.locator('.brand-name').innerText() === 'BLACK CONSTRUCTION' || (await a.locator('.brand-name').innerText()).toLowerCase() === 'black construction', 'Sidebar shows full company name')

// Bid detail + edit (admin)
await a.goto(`${BASE}/bids/${bids[1].id}`); await a.waitForLoadState('networkidle')
await a.fill('input[type=number] >> nth=0', String(1_700_000 + Date.now() % 50_000))
await a.click('text=Save changes'); await a.waitForSelector('text=Bid updated')
await shot(a, '06-bid-detail')

// New bid wizard with descriptions
await a.goto(`${BASE}/bids/new`); await a.waitForLoadState('networkidle'); await shot(a, '07-newbid-profile')
await a.fill('input[placeholder*="Riyadh Tower"]', 'E2E Tower')
await a.fill('input[type=number]', '5000000'); await a.click('text=Next →'); await shot(a, '08-newbid-criteria')

// Settings tabs
await a.goto(`${BASE}/settings`); await a.waitForLoadState('networkidle'); await shot(a, '09-settings-scoring')
await a.click('button.tab:has-text("Team")'); await a.waitForTimeout(800); await shot(a, '10-settings-team')

// Create an estimator via API
let r = await a.request.post(`${BASE}/api/users`, { data: { name: 'Est One', email: 'est@black.sa', role: 'ESTIMATOR', password: 'password123' } })
ok(r.status() === 201, 'Admin creates estimator', r.status())
const estId = (await r.json()).user.id
await (await admin.newPage()).close()

// Danger zone re-auth
r = await a.request.post(`${BASE}/api/admin/reset-bids`, { data: {} })
ok(r.status() === 400, 'Reset without DELETE confirmation → 400', r.status())
r = await a.request.post(`${BASE}/api/admin/reset-bids`, { data: { email: 'admin@black.sa', password: 'wrong', confirm: 'DELETE' } })
ok(r.status() === 403, 'Reset with wrong password → 403', r.status())
r = await a.request.post(`${BASE}/api/admin/reset-bids`, { data: { email: 'est@black.sa', password: 'password123', confirm: 'DELETE' } })
ok(r.status() === 403, 'Reset with a different user\'s credentials → 403', r.status())
await a.click('button.tab:has-text("Data")'); await a.click('button.btn-danger:has-text("Reset all data")'); await a.waitForTimeout(300); await shot(a, '11-reset-modal', false)
await a.keyboard.press('Escape'); await a.goto(`${BASE}/settings`)

// Scoring config
r = await a.request.put(`${BASE}/api/scoring-config`, { data: { goMin: 60, reviewMin: 70, cfrFlagMin: 13, winBands: [{ min: 0, p: .1 }] } })
ok(r.status() === 422, 'Invalid thresholds rejected', r.status())

// ── Estimator
const est = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
await (await est.newPage()).close()
let e = await login(est, 'est@black.sa', 'password123')
if (e.url().includes('change-password')) {
  await e.fill('input[type=password] >> nth=0', 'password123')
  await e.fill('input[type=password] >> nth=1', 'password456')
  const n = await e.locator('input[type=password]').count(); if (n > 2) await e.fill('input[type=password] >> nth=2', 'password456')
  await e.click('button[type=submit]'); await e.waitForURL(/login/, { timeout: 15000 })
  e = await login(est, 'est@black.sa', 'password456')   // app signs out after a password change
}
for (const [m, url, body, exp, label] of [
  ['get', '/api/users', null, 403, 'Estimator cannot list users'],
  ['post', '/api/users', { name: 'X Y', email: 'x@y.sa', role: 'ADMIN', password: 'password123' }, 403, 'Estimator cannot create users'],
  ['patch', `/api/users/${estId}`, { role: 'ADMIN' }, 403, 'Estimator cannot change roles (incl. own)'],
  ['delete', `/api/users/${estId}`, null, 403, 'Estimator cannot delete users'],
  ['get', '/api/admin/audit', null, 403, 'Estimator cannot view audit log'],
  ['put', '/api/scoring-config', { goMin: 70, reviewMin: 60, cfrFlagMin: 13, winBands: [{ min: 0, p: .1 }] }, 403, 'Estimator cannot edit scoring formula'],
  ['post', '/api/admin/reset-bids', { email: 'est@black.sa', password: 'password456', confirm: 'DELETE' }, 403, 'Estimator cannot reset data'],
  ['patch', `/api/bids/${bids[0].id}`, { outcome: 'LOST' }, 403, 'Estimator cannot edit a bid they did not create'],
  ['get', '/api/scoring-config', null, 200, 'Estimator can VIEW scoring formula'],
]) {
  const res = await e.request[m](BASE + url, body ? { data: body } : {})
  ok(res.status() === exp, label, `(${res.status()})`)
}
const crit = Object.fromEntries(['relStrength','budgetKnown','competitors','limitedInv','similarExp','noPriceBreakers','techAdv','withinExpertise','lowChanges','goodLocation','teamAvail','equipAvail','cashFlow','currWorkload','noImpactRunning','ld','apg','perfBond','retention','newSystem','complexMEP','specialAuth','clientRep','clearDwgs','advPayment','payments','finDuration'].map(k => [k, 3]))
r = await e.request.post(`${BASE}/api/bids`, { data: { name: 'Est Bid', location: 'Jeddah', type: 'BUILDING', size: 'LARGE', duration: '12 months', tenderType: 'OPEN', clientCategory: 'GOV', estValue: 1000000, date: '2026-09-01', ...crit } })
const own = (await r.json()).data
ok(r.status() === 201 && own.totalScore === 81 && own.decision === 'GO' && own.riskIndex === 'LOW', 'Estimator creates bid; 81 → GO/LOW', `${own?.totalScore} ${own?.decision} ${own?.riskIndex}`)
r = await e.request.patch(`${BASE}/api/bids/${own.id}`, { data: { outcome: 'WON', contractValue: 900000 } })
ok(r.status() === 200, 'Estimator can edit own bid', r.status())
await e.goto(`${BASE}/settings`); await e.waitForLoadState('networkidle')
const st = await e.locator('.page-wrap').innerText()
ok(!/Danger Zone|Reset all data|Audit Trail|User Management/i.test(st), 'Settings hides Danger Zone / Team / Audit for estimator')
await shot(e, '12-settings-estimator')
await e.goto(`${BASE}/bids/${bids[0].id}`); await e.waitForLoadState('networkidle')
ok(await e.locator('text=Read-only').count() > 0, 'Bid detail is read-only for estimator on others\' bids')

// Deactivate estimator → immediate loss of API access
r = await a.request.patch(`${BASE}/api/users/${estId}`, { data: { active: false } })
r = await e.request.post(`${BASE}/api/bids`, { data: { name: 'nope' } })
ok(r.status() === 401, 'Deactivated user is locked out of the API immediately', r.status())

// Audit trail content
await a.goto(`${BASE}/settings`); await a.click('button.tab:has-text("Audit")'); await a.waitForTimeout(1200)
await a.click('button:has-text("Details") >> nth=0').catch(() => {})
await a.waitForTimeout(300); await shot(a, '13-audit-trail')
const audit = (await (await a.request.get(`${BASE}/api/admin/audit`)).json())
const actions = audit.logs.map(l => l.action)
ok(['BID_CREATE','BID_UPDATE','USER_CREATE','USER_UPDATE','DATA_RESET'].every(x => actions.includes(x)), 'Audit contains creates, edits, user changes, reset attempts', JSON.stringify([...new Set(actions)]))
const upd = audit.logs.find(l => l.action === 'BID_UPDATE' && l.userEmail === 'est@black.sa')
ok(upd && upd.changes.some(c => c.field === 'outcome' && c.from === 'PENDING' && c.to === 'WON'), 'Audit records before → after for estimator edit')
const f = await (await a.request.get(`${BASE}/api/admin/audit?bid=${own.sr}`)).json()
ok(f.logs.length >= 2 && f.logs.every(l => l.bidSr === own.sr), 'Audit filter by bid # works', f.logs.length)

await browser.close()
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)

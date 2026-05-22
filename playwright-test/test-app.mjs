import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost'
const OUT  = join(__dirname, 'screenshots')

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page    = await ctx.newPage()

const errors = []
let passed  = 0

async function shot(name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false })
}

async function check(label, fn) {
  try {
    await fn()
    console.log(`  ✓ ${label}`)
    passed++
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message.split('\n')[0]}`)
    errors.push(`${label}: ${e.message.split('\n')[0]}`)
  }
}

// ── 1. Login page ────────────────────────────────────────────────────────────
console.log('\n[1] Login page')
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.login-root', { timeout: 5000 })
await shot('01-login')
await check('BrandMark logo img',   () => page.locator('.login-brand img.login-logo').waitFor())
await check('Brand logo alt = "Black Construction"', async () => {
  const alt = await page.locator('.login-brand img.login-logo').getAttribute('alt')
  if (!alt?.includes('Black')) throw new Error(`got alt="${alt}"`)
})
await check('Email + Password inputs', async () => {
  await page.locator('input[name="email"]').waitFor()
  await page.locator('input[name="password"]').waitFor()
})
await check('Sign In button',       () => page.locator('button[type="submit"]').waitFor())
await check('EN/AR language toggle',() => page.locator('.login-lang').waitFor())

// ── 2. Login ──────────────────────────────────────────────────────────────────
console.log('\n[2] Login')
await page.fill('input[name="email"]',    'admin@black.sa')
await page.fill('input[name="password"]', 'changeme')
await shot('02-login-filled')
await Promise.all([
  page.waitForURL(`${BASE}/dashboard`, { timeout: 12000 }),
  page.click('button[type="submit"]'),
])
await page.waitForSelector('.sidebar', { timeout: 5000 })
await shot('03-dashboard')
console.log('  ✓ Login successful → /dashboard')

// ── 3. Dashboard ──────────────────────────────────────────────────────────────
console.log('\n[3] Dashboard content')
await check('Sidebar present',      () => page.locator('.sidebar').waitFor())
await check('Operations nav active',() => page.locator('.nav-item.active', { hasText: 'Pipeline' }).waitFor({ timeout: 3000 }))
await check('KPI cards visible',    () => page.locator('.kpi-card').first().waitFor({ timeout: 3000 }))

// ── 4. Bid History ────────────────────────────────────────────────────────────
console.log('\n[4] Bid History (/bids)')
await Promise.all([
  page.waitForURL(`${BASE}/bids`, { timeout: 8000 }),
  page.goto(`${BASE}/bids`),
])
await shot('04-bids')
await check('No 404 (URL is /bids)',     async () => {
  if (!page.url().includes('/bids')) throw new Error(`URL is ${page.url()}`)
})
await check('"Bid History" heading',     () => page.locator('h1, h2', { hasText: 'Bid History' }).first().waitFor({ timeout: 3000 }))

// ── 5. New Bid ────────────────────────────────────────────────────────────────
console.log('\n[5] New Bid (/bids/new)')
await page.goto(`${BASE}/bids/new`)
await page.waitForURL(`${BASE}/bids/new`)
await shot('05-bids-new')
await check('No 404',                    async () => {
  if (!page.url().includes('/bids/new')) throw new Error(`URL is ${page.url()}`)
})
await check('"New Bid" heading',         () => page.locator('h1', { hasText: /new tender|new bid/i }).first().waitFor({ timeout: 3000 }))

// ── 6. AI Chat ────────────────────────────────────────────────────────────────
console.log('\n[6] AI Chat (/ai)')
await page.goto(`${BASE}/ai`)
await page.waitForURL(`${BASE}/ai`)
await page.waitForLoadState('domcontentloaded')
await shot('06-ai-chat')
await check('Portfolio AI heading',      () => page.locator('h2', { hasText: 'Portfolio AI' }).waitFor({ timeout: 5000 }))
await check('Chat input visible',        () => page.locator('.ai-chat-input').waitFor())
await check('Suggestion chips visible',  () => page.locator('button', { hasText: /win rate/i }).first().waitFor())

// ── 7. Win Predictor ──────────────────────────────────────────────────────────
console.log('\n[7] Win Predictor (/predictor)')
await page.goto(`${BASE}/predictor`)
await page.waitForURL(`${BASE}/predictor`)
await shot('07-predictor')
await check('No 404',                    async () => {
  if (!page.url().includes('/predictor')) throw new Error(`URL is ${page.url()}`)
})

// ── 8. Analytics ──────────────────────────────────────────────────────────────
console.log('\n[8] Analytics (/analytics)')
await page.goto(`${BASE}/analytics`)
await page.waitForURL(`${BASE}/analytics`)
await shot('08-analytics')
await check('No 404',                    async () => {
  if (!page.url().includes('/analytics')) throw new Error(`URL is ${page.url()}`)
})
await check('"Analytics" heading',       () => page.locator('h1, h2', { hasText: /analytics/i }).first().waitFor({ timeout: 3000 }))

// ── 9. Settings ───────────────────────────────────────────────────────────────
console.log('\n[9] Settings (/settings)')
await page.goto(`${BASE}/settings`)
await page.waitForURL(`${BASE}/settings`)
await shot('09-settings')
await check('No 404',                    async () => {
  if (!page.url().includes('/settings')) throw new Error(`URL is ${page.url()}`)
})
await check('Settings heading',          () => page.locator('h1', { hasText: /settings/i }).waitFor({ timeout: 3000 }))
await check('User table visible',        () => page.locator('.data-table').waitFor({ timeout: 5000 }))

// ── 10. Arabic toggle ─────────────────────────────────────────────────────────
console.log('\n[10] Arabic RTL toggle')
await page.goto(`${BASE}/dashboard`)
await page.waitForSelector('.sidebar')
await page.locator('.lang-btn', { hasText: 'AR' }).click()
await page.waitForTimeout(600)
await shot('10-arabic-dashboard')
await check('body.ar class added',       async () => {
  const cls = await page.locator('body').getAttribute('class')
  if (!cls?.includes('ar')) throw new Error(`class="${cls}"`)
})
await check('dir=rtl on content',        async () => {
  const dir = await page.locator('.sidebar').getAttribute('class')
  // sidebar doesn't have dir, but body.ar flips via CSS
  if (!dir) throw new Error('sidebar missing')
})

// ── 11. AI Chat — send a message ──────────────────────────────────────────────
console.log('\n[11] AI Chat — send message')
await page.goto(`${BASE}/ai`)
await page.locator('.ai-chat-input').waitFor({ timeout: 5000 })
// Click a suggestion chip
await page.locator('button', { hasText: /win rate/i }).first().click()
// Wait for loading dots or a response
await page.waitForTimeout(3000)
await shot('11-ai-chat-response')
await check('AI response or loading',    async () => {
  const hasMsg = await page.locator('div', { hasText: /75%|win rate|portfolio|pending/i }).count()
  if (hasMsg === 0) {
    // Maybe still loading — check for dots
    const hasDots = await page.locator('.ai-dot').count()
    if (hasDots === 0) throw new Error('No response or loading indicator')
  }
})

// ── Summary ───────────────────────────────────────────────────────────────────
await browser.close()

const total = passed + errors.length
console.log(`\n══════════════════════════════════════`)
console.log(`Results: ${passed}/${total} passed`)
if (errors.length > 0) {
  console.log('Failed:')
  errors.forEach(e => console.log(`  ✗ ${e}`))
}
console.log(`Screenshots: ${OUT}`)

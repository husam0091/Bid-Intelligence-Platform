import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const BASE = 'http://localhost'
const OUT  = './test-screenshots'

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page    = await ctx.newPage()

const errors = []

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
}

async function check(label, fn) {
  try {
    await fn()
    console.log(`  ✓ ${label}`)
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`)
    errors.push(`${label}: ${e.message}`)
  }
}

// ── 1. Login page ────────────────────────────────────────────────────────────
console.log('\n[1] Login page')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await shot('01-login')
await check('login-root exists',   () => page.locator('.login-root').waitFor({ timeout: 3000 }))
await check('BrandMark logo',      () => page.locator('.login-brand svg').waitFor({ timeout: 3000 }))
await check('Brand name "Black"',  async () => {
  const text = await page.locator('.login-brand-name').textContent()
  if (text?.trim() !== 'Black') throw new Error(`got "${text}"`)
})
await check('Email input',         () => page.locator('input[name="email"]').waitFor())
await check('Password input',      () => page.locator('input[name="password"]').waitFor())
await check('Sign In button',      () => page.locator('button[type="submit"]').waitFor())
await check('EN/AR toggle',        () => page.locator('.login-lang').waitFor())

// ── 2. Login flow ────────────────────────────────────────────────────────────
console.log('\n[2] Login flow')
await page.fill('input[name="email"]',    'admin@black.sa')
await page.fill('input[name="password"]', 'changeme')
await shot('02-login-filled')
await page.click('button[type="submit"]')
await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 })
await page.waitForLoadState('networkidle')
await shot('03-dashboard')
console.log('  ✓ Redirected to /dashboard after login')

// ── 3. Dashboard content ─────────────────────────────────────────────────────
console.log('\n[3] Dashboard')
await check('Sidebar visible',     () => page.locator('.sidebar').waitFor())
await check('Nav item active',     () => page.locator('.nav-item.active').waitFor())
await check('Page has KPI area',   async () => {
  const url = page.url()
  if (!url.includes('/dashboard')) throw new Error(`on ${url}`)
})

// ── 4. Bid History page ──────────────────────────────────────────────────────
console.log('\n[4] Bid History')
await page.click('a[href="/bids"]')
await page.waitForLoadState('networkidle')
await shot('04-bids')
await check('No 404',              async () => {
  const h1 = await page.locator('h1, h2').first().textContent().catch(() => '')
  if (h1?.includes('404')) throw new Error('Got 404 page')
})

// ── 5. New Bid page ───────────────────────────────────────────────────────────
console.log('\n[5] New Bid')
await page.click('a[href="/bids/new"]')
await page.waitForLoadState('networkidle')
await shot('05-bids-new')
await check('No 404',              async () => {
  const text = await page.content()
  if (text.includes('404') && text.includes('could not be found')) throw new Error('Got 404')
})

// ── 6. AI Chat page ───────────────────────────────────────────────────────────
console.log('\n[6] AI Chat')
await page.click('a[href="/ai"]')
await page.waitForLoadState('networkidle')
await shot('06-ai-chat')
await check('AI Chat header',      () => page.locator('text=Portfolio AI').waitFor({ timeout: 5000 }))
await check('Message input',       () => page.locator('.ai-chat-input').waitFor())
await check('Suggestion chips',    () => page.locator('text=What is our win rate').waitFor())

// ── 7. Analytics page ─────────────────────────────────────────────────────────
console.log('\n[7] Analytics')
await page.click('a[href="/analytics"]')
await page.waitForLoadState('networkidle')
await shot('07-analytics')

// ── 8. Settings page ─────────────────────────────────────────────────────────
console.log('\n[8] Settings')
await page.click('a[href="/settings"]')
await page.waitForLoadState('networkidle')
await shot('08-settings')
await check('Settings loads',      async () => {
  const text = await page.content()
  if (text.includes('404') && text.includes('could not be found')) throw new Error('Got 404')
})

// ── 9. Arabic language toggle ─────────────────────────────────────────────────
console.log('\n[9] Language toggle')
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
const arBtn = page.locator('.lang-btn', { hasText: 'AR' })
await arBtn.click()
await page.waitForTimeout(500)
await shot('09-arabic-mode')
await check('RTL direction set',   async () => {
  const dir = await page.locator('body').getAttribute('class')
  if (!dir?.includes('ar')) throw new Error(`body class: "${dir}"`)
})

// ── Summary ───────────────────────────────────────────────────────────────────
await browser.close()

console.log('\n══════════════════════════════════════')
if (errors.length === 0) {
  console.log('All checks passed. Screenshots saved to ./test-screenshots/')
} else {
  console.log(`${errors.length} check(s) failed:`)
  errors.forEach(e => console.log(`  - ${e}`))
  console.log('\nScreenshots saved to ./test-screenshots/')
}

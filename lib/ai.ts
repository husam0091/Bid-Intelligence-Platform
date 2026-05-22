import { prisma } from '@/lib/prisma'

// ── AI client (plain fetch — Pollinations free API, no key needed) ───────────
const AI_URL = 'https://text.pollinations.ai/openai/chat/completions'
const MODEL   = 'openai'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

async function callAI(messages: ChatMessage[], maxTokens = 400, temperature = 0.4): Promise<string> {
  const res = await fetch(AI_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
    signal:  AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`AI API ${res.status}: ${await res.text()}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content?.trim() ?? ''
}

// ── Portfolio context builder ───────────────────────────────────────────────
// Pulls live DB stats and injects them into every AI call.
// This is what makes the AI "understand" the user's actual data.
export async function buildPortfolioContext(orgId: string): Promise<string> {
  const [bids, stats] = await Promise.all([
    prisma.bid.findMany({
      where:   { orgId },
      select:  {
        name: true, location: true, type: true, clientCategory: true,
        tenderType: true, size: true, estValue: true, contractValue: true,
        actualSpend: true, outcome: true, decision: true, riskIndex: true,
        totalScore: true, expectWin: true, hardStop: true, date: true,
      },
      orderBy: { date: 'desc' },
    }),
    prisma.bid.groupBy({
      by:    ['outcome'],
      where: { orgId },
      _count: true,
    }),
  ])

  const total       = bids.length
  const wonCount    = bids.filter(b => b.outcome === 'WON').length
  const lostCount   = bids.filter(b => b.outcome === 'LOST').length
  const pendingCount= bids.filter(b => b.outcome === 'PENDING').length
  const rejectedCount = bids.filter(b => b.outcome === 'REJECTED').length
  const closed      = wonCount + lostCount
  const winRate     = closed > 0 ? Math.round((wonCount / closed) * 100) : 0
  const goCount     = bids.filter(b => b.decision === 'GO').length
  const highRisk    = bids.filter(b => b.riskIndex === 'HIGH').length
  const avgScore    = total > 0 ? Math.round(bids.reduce((s, b) => s + b.totalScore, 0) / total) : 0
  const totalPipeline = bids.filter(b => b.outcome === 'PENDING').reduce((s, b) => s + b.estValue, 0)

  // Location breakdown
  const byLocation: Record<string, { count: number; won: number }> = {}
  bids.forEach(b => {
    if (!byLocation[b.location]) byLocation[b.location] = { count: 0, won: 0 }
    byLocation[b.location].count++
    if (b.outcome === 'WON') byLocation[b.location].won++
  })
  const topLocations = Object.entries(byLocation)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([loc, d]) => `${loc} (${d.count} bids, ${d.count > 0 ? Math.round(d.won/d.count*100) : 0}% win)`)
    .join(', ')

  // Score distribution of won vs lost
  const wonBids  = bids.filter(b => b.outcome === 'WON')
  const lostBids = bids.filter(b => b.outcome === 'LOST')
  const avgWonScore  = wonBids.length  > 0 ? Math.round(wonBids.reduce((s,b)=>s+b.totalScore,0)/wonBids.length)  : 0
  const avgLostScore = lostBids.length > 0 ? Math.round(lostBids.reduce((s,b)=>s+b.totalScore,0)/lostBids.length) : 0

  // Recent 5 bids for context
  const recentSummary = bids.slice(0, 5).map(b =>
    `${b.name} (${b.location}, ${b.type}, SAR ${(b.estValue/1e6).toFixed(1)}M, score ${b.totalScore}, ${b.decision}, ${b.outcome})`
  ).join('\n  ')

  return `
COMPANY BID PORTFOLIO — LIVE DATA CONTEXT
==========================================
Total bids: ${total} | Win rate: ${winRate}% (${wonCount} won / ${lostCount} lost / ${pendingCount} pending / ${rejectedCount} rejected)
GO decisions: ${goCount} | High-risk bids: ${highRisk} | Avg score: ${avgScore}/135
Active pipeline value: SAR ${(totalPipeline/1e6).toFixed(1)}M

Score benchmarks: Won avg = ${avgWonScore}/135 | Lost avg = ${avgLostScore}/135
Top locations: ${topLocations || 'N/A'}

Recent bids:
  ${recentSummary || 'None yet'}

Scoring system: 27 criteria, max 135 pts. Decision bands:
  ≥90 = GO (win 60–75%) | 75–89 = GO/REVIEW (51–60%) | 60–74 = REVIEW (38%) | <60 = NO GO
  HARD STOP: if Commercial & Financial Risk domain < 13pts → forced NO GO regardless of total
`.trim()
}

// ── Cache helpers ────────────────────────────────────────────────────────────
async function getCached(cacheKey: string): Promise<string | null> {
  const row = await prisma.aiCache.findUnique({ where: { cacheKey } })
  if (!row) return null
  if (new Date() > row.expiresAt) {
    await prisma.aiCache.delete({ where: { cacheKey } }).catch(() => {})
    return null
  }
  return row.response
}

async function setCached(bidId: string, cacheKey: string, response: string, ttlHours = 24) {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
  await prisma.aiCache.upsert({
    where:  { cacheKey },
    create: { bidId, lang: 'en', feature: 'cache', cacheKey, response, expiresAt },
    update: { response, expiresAt },
  })
}

// ── Feature 1: Bid Insight ───────────────────────────────────────────────────
export async function getBidInsight(params: {
  bidId:      string
  orgId:      string
  lang:       string
  name:       string
  type:       string
  location:   string
  estValue:   number
  totalScore: number
  riskIndex:  string
  decision:   string
}): Promise<string> {
  const cacheKey = `insight_${params.orgId}_${params.lang}_${params.bidId}_${params.totalScore}_${params.riskIndex}`

  const cached = await getCached(cacheKey)
  if (cached) return cached

  const portfolioCtx = await buildPortfolioContext(params.orgId)

  const prompt = params.lang === 'ar'
    ? `أنت مستشار عطاءات خبير في السوق السعودي للإنشاءات. ${portfolioCtx}\n\nالعطاء الحالي: ${params.name}، النوع: ${params.type}، الموقع: ${params.location}، القيمة: ${params.estValue.toLocaleString()} ريال. النتيجة: ${params.totalScore}/135، الخطر: ${params.riskIndex}، القرار: ${params.decision}. اكتب جملة واحدة موجزة تذكر أبرز نقطة قوة أو خطر مقارنةً بسجل الشركة.`
    : `You are an expert bid consultant for the Saudi construction market.\n${portfolioCtx}\n\nThis bid: ${params.name}, type: ${params.type}, location: ${params.location}, value: SAR ${params.estValue.toLocaleString()}. Score: ${params.totalScore}/135, risk: ${params.riskIndex}, decision: ${params.decision}. Write one concise sentence citing the single biggest strength or risk, referencing the company's historical win patterns where relevant.`

  const response = await callAI([{ role: 'user', content: prompt }], 120, 0.4)
  await setCached(params.bidId, cacheKey, response || 'No insight available.', 24)
  return response || 'No insight available.'
}

// ── Feature 2: Portfolio Callout ─────────────────────────────────────────────
export async function getPortfolioCallout(params: {
  orgId: string
  lang:  string
}): Promise<string> {
  const today    = new Date().toISOString().slice(0, 10)
  const cacheKey = `portfolio_${params.orgId}_${params.lang}_${today}`

  const cached = await getCached(cacheKey)
  if (cached) return cached

  const portfolioCtx = await buildPortfolioContext(params.orgId)

  // Need a bidId for the cache FK — use a placeholder org-level entry
  const anyBid = await prisma.bid.findFirst({ where: { orgId: params.orgId }, select: { id: true } })
  if (!anyBid) return ''

  const prompt = params.lang === 'ar'
    ? `أنت محلل محفظة عطاءات. ${portfolioCtx}\n\nبناءً على هذه البيانات الحقيقية للشركة، أبرز نمطاً قابلاً للتنفيذ في جملة واحدة فقط.`
    : `You are a bid portfolio analyst.\n${portfolioCtx}\n\nBased on this real company data, surface one actionable pattern in one sentence.`

  const response = await callAI([{ role: 'user', content: prompt }], 100, 0.3)
  await setCached(anyBid.id, cacheKey, response, 24)
  return response
}

// ── Feature 3: Natural Language Search ──────────────────────────────────────
export async function nlSearchToFilter(query: string): Promise<Record<string, unknown>> {
  const systemPrompt = `You are a filter extractor for a construction bid database. Given a natural language query, return ONLY a JSON object with these optional fields:
{
  "outcome":        "WON"|"LOST"|"PENDING"|"REJECTED",
  "decision":       "GO"|"REVIEW"|"NO_GO",
  "riskIndex":      "LOW"|"MEDIUM"|"HIGH",
  "type":           "BUILDING"|"INFRASTRUCTURE"|"INDUSTRIAL",
  "clientCategory": "GOV"|"PRIVATE"|"SEMI",
  "tenderType":     "OPEN"|"LIMITED"|"NEGOTIATED",
  "location":       string,
  "yearFrom":       number,
  "yearTo":         number,
  "minValue":       number,
  "maxValue":       number,
  "minScore":       number,
  "maxScore":       number,
  "text":           string
}
Return {} if no filters apply. Return ONLY valid JSON, no explanation.
Examples:
- "won bids in Riyadh"         → {"outcome":"WON","location":"Riyadh"}
- "Mecca Gov over 50M"         → {"location":"Mecca (Makkah)","clientCategory":"GOV","minValue":50000000}
- "high risk losses"           → {"riskIndex":"HIGH","outcome":"LOST"}
- "lost bids 2024"             → {"outcome":"LOST","yearFrom":2024,"yearTo":2024}`

  try {
    const text = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: query },
    ], 200, 0)
    const match = text.match(/\{[\s\S]*\}/)
    return JSON.parse(match?.[0] ?? '{}')
  } catch {
    return {}
  }
}

// ── Feature 4: Portfolio Chat (data-aware Q&A) ───────────────────────────────
// New feature: answers any question about the user's bid portfolio using live data.
export async function chatWithPortfolio(params: {
  orgId:    string
  lang:     string
  question: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<string> {
  const portfolioCtx = await buildPortfolioContext(params.orgId)

  const systemPrompt = params.lang === 'ar'
    ? `أنت مساعد ذكي متخصص في تحليل عطاءات شركة إنشاءات سعودية. لديك إمكانية الوصول الكامل إلى بيانات عطاءات الشركة الحقيقية. أجب على أسئلة المستخدم بناءً على هذه البيانات الفعلية.\n\n${portfolioCtx}`
    : `You are an intelligent assistant specialized in analyzing bid data for a Saudi construction company. You have full access to the company's real bid portfolio data. Answer questions based on this actual data — be specific, cite numbers, and give actionable recommendations.\n\n${portfolioCtx}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(params.history ?? []),
    { role: 'user',   content: params.question },
  ]

  return await callAI(messages, 400, 0.4) || 'Unable to answer at this time.'
}

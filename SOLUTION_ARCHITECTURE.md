# Solution Architecture
## Black Construction — Bid Intelligence Platform
**Version:** 3.0 (As-Built) | **Date:** 2026-05-21
**Product Owner:** Hosam | **QS Lead:** M Adeel QS (0550634001)

> **This document reflects the system as actually deployed, not the original spec.**
> Prototype source of truth: `Black-Construction-Bid-Intelligence.html`
> Live app: `http://localhost` (LAN: `http://192.168.100.88`)
> Default credentials: `admin@black.sa` / `changeme`

---

## 1. Product Overview

A structured bid decision engine and pipeline management platform for mid-tier Saudi construction contractors. Replaces ad-hoc Excel evaluation with a scored, role-aware, AI-augmented web product.

### Core value loop
1. Estimator rates a tender across 27 criteria (0–5 each, max 135) in 5 risk groups
2. System instantly outputs **GO / REVIEW / NO GO** + win probability via `computeDecision()`
3. Hard Stop fires if Commercial & Financial Risk CFR < 13 — forces NO GO regardless of total
4. Historical bids accumulate → Win Predictor benchmarks new bids against won/lost averages
5. Executive sees portfolio value, win rates, and score distribution in real time

### Business context
- Target: Saudi mid-tier contractors, Categories 2–4, SAR 1M–50M bids
- Market: SAR 232B KSA construction market; 101,317+ registered contractors
- The 5 scoring domains map to a 2024 peer-reviewed KSA study

---

## 2. Tech Stack (Actual)

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14.2.4 (App Router) | TypeScript throughout |
| Styling | Tailwind CSS + `styles/globals.css` | Custom design tokens, no component library |
| Database | PostgreSQL 16 (Docker) via Prisma ORM 5.22 | Self-hosted |
| Auth | **NextAuth.js v4.24.7** (credentials + JWT) | ⚠ v4, not v5 — API differs |
| AI | **OpenAI SDK 4.52.7** with custom baseURL | `baseURL: 'https://g4f.space/api/gemini'`, `apiKey: 'secret'`, model `gemini-2.0-flash` |
| i18n | **Inline** — `body.ar` CSS class + localStorage | No next-intl; all strings inline in components |
| Forms | **Plain React state** + native HTML validation | No React Hook Form; simpler for this use case |
| Markdown | Custom `lib/render-md.tsx` | Inline parser; no external dependency |
| Hosting | **Docker Compose** — port **80** | app container + postgres container |
| Testing | Playwright (headless Chromium) | `playwright-test/test-app.mjs` — 24/24 passing |

### Notable deviations from original spec
| Spec said | Actually built |
|---|---|
| NextAuth v5 | NextAuth v4 — `lib/auth-options.ts` pattern |
| Anthropic Claude Haiku | OpenAI-SDK-compatible g4f.space/Gemini endpoint |
| next-intl for i18n | Inline bilingual strings, `body.ar` class toggle |
| React Hook Form + Zod | Plain `useState` + native `required` validation |
| Port 3000 | Port 80 via Docker Compose port mapping |
| `auth.ts` NextAuth v5 export | `lib/auth-options.ts` v4 `authOptions` export |

---

## 3. System Architecture

```
Browser (Next.js 14 App Router)
│
├── (auth)/login          ← custom branded login, no redirect on session
├── (app)/layout.tsx      ← Sidebar + main-area shell, SessionProvider
│   ├── /dashboard        ← Server Component, Prisma direct
│   ├── /executive        ← Server Component, Prisma direct
│   ├── /bids             ← Server Component, URL filter params
│   ├── /bids/new         ← Client Component, live verdict panel
│   ├── /bids/[id]        ← Server Component, score breakdown
│   ├── /predictor        ← Client Component, interactive sliders
│   ├── /analytics        ← Server Component, SVG charts
│   ├── /ai               ← Client Component, Portfolio AI chat
│   └── /settings         ← Client Component, user management (ADMIN)
│
├── app/api/
│   ├── auth/[...nextauth] ← NextAuth v4 handler
│   ├── bids/              ← POST (create), GET (list with filters)
│   ├── bids/[id]/         ← GET, PATCH (outcome/remarks)
│   ├── users/             ← GET, POST (ADMIN)
│   ├── users/[id]/        ← PATCH (role/active), DELETE (ADMIN)
│   └── ai/chat/           ← POST → OpenAI-compat Gemini, streaming
│
├── lib/
│   ├── decision.ts        ← computeDecision() — shared client + server
│   ├── auth-options.ts    ← NextAuth v4 authOptions
│   ├── prisma.ts          ← singleton PrismaClient
│   └── render-md.tsx      ← lightweight markdown → React nodes
│
└── Docker Compose
    ├── blackbid_app  (Next.js, port 80)
    └── blackbid_db   (PostgreSQL 16, port 5432)
```

### Key architectural decisions

1. **Server Components for data pages** — Dashboard, Bid History, Analytics, Executive, and Bid Detail are all Next.js Server Components that query Prisma directly. No `useEffect` + fetch on these pages.

2. **Client Components only where needed** — New Bid (live verdict), Win Predictor (interactive sliders), AI Chat (streaming), Settings (modals). The rest is server-rendered.

3. **Decision logic on both sides** — `computeDecision()` runs client-side for the live verdict panel (< 100ms UX) and server-side in `/api/bids` POST for authoritative storage. Client result is display-only; server result is what's stored in the DB.

4. **AI via OpenAI-compatible endpoint** — `/api/ai/chat` uses the OpenAI SDK but points to `https://g4f.space/api/gemini` with model `gemini-2.0-flash`. The Portfolio AI chat at `/ai` supports full conversation history.

5. **Auth is NextAuth v4 credentials** — JWT sessions in httpOnly cookies. `orgId` and `role` are embedded in the JWT and typed via `next-auth.d.ts` module augmentation.

6. **Multi-tenancy via orgId** — every DB query is scoped `where: { orgId }`. `orgId` is always taken from the server-side session, never from the client request body.

7. **Docker on port 80** — Docker Compose maps `80:3000`. On Windows, `wslrelay.exe` proxies `127.0.0.1:80` to the container. After `docker compose up -d`, kill and restart wslrelay if the proxy shows stale content: `Stop-Process -Name "wslrelay" -Force`.

---

## 4. Database Schema (as migrated)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Org {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  users     User[]
  bids      Bid[]
}

model User {
  id           String   @id @default(uuid())
  orgId        String
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(ESTIMATOR)
  active       Boolean  @default(true)
  mustChange   Boolean  @default(true)
  org          Org      @relation(fields: [orgId], references: [id])
  bids         Bid[]    @relation("CreatedBids")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum Role { ESTIMATOR MANAGER EXECUTIVE ADMIN }

model Bid {
  id             String         @id @default(uuid())
  sr             Int
  orgId          String
  org            Org            @relation(fields: [orgId], references: [id])
  name           String
  location       String
  type           ProjectType
  size           ProjectSize
  duration       String
  tenderType     TenderType
  clientCategory ClientCategory
  consultant     String         @default("")
  pmc            String         @default("")
  estValue       Float
  contractValue  Float          @default(0)
  actualSpend    Float          @default(0)
  date           DateTime
  bidDate        DateTime       @default(now())
  outcome        Outcome        @default(PENDING)
  pipelineStatus PipelineStatus @default(ACTIVE)
  remarks        String         @default("")
  links          String         @default("")
  grossMarginPct Float?
  mainCompetitor String         @default("")

  // Competitive Position (10) — max 50
  relStrength Int @default(0); budgetKnown Int @default(0); competitors Int @default(0)
  limitedInv  Int @default(0); similarExp  Int @default(0); noPriceBreakers Int @default(0)
  techAdv     Int @default(0); withinExpertise Int @default(0)
  lowChanges  Int @default(0); goodLocation Int @default(0)

  // Company Load Factor (5) — max 25
  teamAvail Int @default(0); equipAvail Int @default(0); cashFlow Int @default(0)
  currWorkload Int @default(0); noImpactRunning Int @default(0)

  // Contractual Risk (4) — max 20
  ld Int @default(0); apg Int @default(0); perfBond Int @default(0); retention Int @default(0)

  // Technical Risk (3) — max 15
  newSystem Int @default(0); complexMEP Int @default(0); specialAuth Int @default(0)

  // Commercial & Financial Risk (5) — max 25 — HARD STOP domain
  clientRep Int @default(0); clearDwgs Int @default(0); advPayment Int @default(0)
  payments  Int @default(0); finDuration Int @default(0)

  // Derived — computed server-side in /api/bids POST
  totalScore Int       @default(0)
  riskIndex  RiskIndex @default(HIGH)
  decision   Decision  @default(NO_GO)
  expectWin  Float     @default(0.09)
  hardStop   Boolean   @default(false)

  createdBy String
  creator   User     @relation("CreatedBids", fields: [createdBy], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([orgId, sr])
  @@index([orgId, outcome])
  @@index([orgId, decision])
  @@index([orgId, date])
}

enum ProjectType     { BUILDING INFRASTRUCTURE INDUSTRIAL }
enum ProjectSize     { MEDIUM_SMALL LARGE MEGA }
enum TenderType      { OPEN LIMITED NEGOTIATED }
enum ClientCategory  { GOV PRIVATE SEMI }
enum Outcome         { WON LOST PENDING REJECTED }
enum Decision        { GO REVIEW NO_GO }
enum RiskIndex       { LOW MEDIUM HIGH }
enum PipelineStatus  { ACTIVE AWAITING }
```

---

## 5. Decision Logic (`lib/decision.ts`)

```typescript
const COMMERCIAL_IDS = ["clientRep","clearDwgs","advPayment","payments","finDuration"] as const

export function computeDecision(criteria: Record<string, number>) {
  const cfr   = COMMERCIAL_IDS.reduce((s, k) => s + (criteria[k] ?? 0), 0)
  const total = Object.values(criteria).reduce((a, b) => a + b, 0)

  const riskIndex = cfr >= 20 ? "LOW" : cfr >= 13 ? "MEDIUM" : "HIGH"
  const hardStop  = riskIndex === "HIGH"

  let decision: string, expectWin: number

  if (total >= 90) {
    decision  = hardStop ? "NO_GO" : "GO"
    expectWin = hardStop ? 0.18 : riskIndex === "LOW" ? 0.75 : 0.60
  } else if (total >= 75) {
    decision  = hardStop ? "NO_GO" : "GO"
    expectWin = hardStop ? 0.18 : riskIndex === "LOW" ? 0.60 : 0.51
  } else if (total >= 60) {
    decision  = hardStop ? "NO_GO" : "REVIEW"
    expectWin = 0.3825
  } else if (total >= 50) {
    decision = "NO_GO"; expectWin = 0.18
  } else {
    decision = "NO_GO"; expectWin = 0.09
  }

  return { totalScore: total, riskIndex, decision, expectWin, hardStop }
}
```

**Score bands:**

| Total | Decision (no hard stop) | Win % LOW risk | Win % MEDIUM |
|---|---|---|---|
| ≥ 90 | GO | 75% | 60% |
| 75–89 | GO | 60% | 51% |
| 60–74 | REVIEW | 38% | 38% |
| < 60 | NO GO | 18% | 9% |
| any + CFR < 13 | NO GO (hard stop) | 18% | 18% |

---

## 6. API Routes (Implemented)

```
# Auth (NextAuth v4)
GET/POST  /api/auth/[...nextauth]     Session, CSRF, signIn, signOut

# Bids
POST      /api/bids                   Create — runs computeDecision() server-side; orgId from session
GET       /api/bids                   List — query: decision, outcome, riskIndex (URL params)
GET       /api/bids/[id]              Single bid with all 27 criteria
PATCH     /api/bids/[id]              Update outcome, remarks, contractValue

# Users (ADMIN only)
GET       /api/users                  List users in org
POST      /api/users                  Create user (name, email, password, role); mustChange=true
PATCH     /api/users/[id]             Update role or active status
DELETE    /api/users/[id]             Deactivate (sets active=false)

# AI
POST      /api/ai/chat                Portfolio AI — accepts { question, lang, history[] }
                                      OpenAI-compat → g4f.space → gemini-2.0-flash
                                      Returns { answer: string }
```

**Response envelope:**
```typescript
type Ok<T>  = { data: T }
type Err    = { error: string }
```

**Auth pattern (NextAuth v4):**
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const { orgId, role } = session.user as any
```

---

## 7. Design System

### Color Tokens (`styles/globals.css` `:root`)

```css
--canvas:        #EEEBE2   /* warm off-white — sidebar + page bg */
--canvas-2:      #E6E2D6
--surface:       #F7F5EE   /* card bg (flat variant) */
--surface-2:     #FBFAF4
--surface-3:     #FFFFFF   /* white cards */
--hairline:      #D9D4C4   /* borders */
--hairline-soft: #E5E1D3   /* dashed dividers */
--ink:           #14141A   /* primary text + brand dark */
--ink-2:         #2A2A30
--ink-3:         #4A4A52
--mute:          #6E6A62
--mute-2:        #8D887D
--mute-3:        #B5B0A1
--go:            #1F6E45; --go-soft: #D3E4D9; --go-tint: rgba(31,110,69,0.08)
--review:        #B07A1B; --review-soft: #ECDDB7; --review-tint: rgba(176,122,27,0.10)
--nogo:          #A8362A; --nogo-soft: #ECCCC6; --nogo-tint: rgba(168,54,42,0.08)
--pending:       #4A6585; --pending-soft: #D2DBE6
--data-blue:     #3D5D85; --data-blue-2: #6B85A8; --data-blue-soft: #C9D4E2
--shadow-1: 0 1px 0 rgba(20,20,26,0.04), 0 0 0 1px var(--hairline-soft)
--shadow-2: 0 1px 2px rgba(20,20,26,0.04), 0 0 0 1px var(--hairline)
--sidebar-w: 240px
--radius: 6px; --radius-sm: 4px
--gap: 14px; --gap-sm: 10px; --gap-lg: 20px; --pad-card: 18px
```

Dark theme tokens defined under `body.dark`. Density variants: `body.density-compact`, `body.density-dense`.

### Typography

| Role | Font | Size / Weight |
|---|---|---|
| Display, KPI, verdict headline | Archivo Narrow | 700–800, uppercase, −0.015em tracking |
| Body | Inter Tight | 13.5px, −0.005em tracking |
| Labels, eyebrows, numbers, mono | JetBrains Mono | 9.5–11px, 0.12–0.2em tracking |
| Arabic body + display | IBM Plex Sans Arabic | replaces Inter Tight + Archivo Narrow on `body.ar` |

### Page Title System (`h-block`)

Every page has a title block below the sticky header:

```html
<div class="h-block">
  <div class="h-kicker"><span class="h-dash"/>01 · OPERATIONS</div>
  <h1 class="h-title">Pipeline <em>Command</em></h1>
  <p class="h-sub">Subtitle text here.</p>
</div>
```

`h-title` is 38px Archivo Narrow 700. The `<em>` inside renders in `var(--mute-2)` weight 500.
Kickers follow the pattern `NN · SECTION NAME` (mono 10.5px, 0.2em tracking).

| Page | Kicker | Title |
|---|---|---|
| /dashboard | 01 · Operations | Pipeline *Command* |
| /executive | 02 · Executive | Portfolio *at-a-glance* |
| /bids/new | 03 · Bid Entry | Score a *New Tender* |
| /bids | 04 · Audit Trail | Bid *History* |
| /predictor | 05 · Intelligence | Win *Predictor* |
| /analytics | 06 · Intelligence | Performance *Analytics* |
| /ai | — | Portfolio AI (custom header) |
| /settings | 07 · System | Settings |

### KPI Cards

```html
<div class="card kpi-card accent-go">   <!-- accent-go / accent-review / accent-nogo / accent-blue -->
  <span class="kpi-label">Win Rate</span>
  <span class="kpi-value text-go">75%</span>
</div>
```

Accent classes add a 2px colored top stripe via `::after`.

### Status Pills

```html
<span class="pill pill-go">GO</span>
<span class="pill pill-review">REVIEW</span>
<span class="pill pill-nogo">NO GO</span>
<span class="pill pill-low">LOW</span>
<span class="pill pill-medium">MEDIUM</span>
<span class="pill pill-high">HIGH</span>
```

### New Bid — Rating Control

Segmented 0–5 button group (NOT a slider):

```html
<div class="rating">
  <button class="rating-btn">0</button>
  <button class="rating-btn">1</button>
  <button class="rating-btn filled" style="background:var(--go)">3</button>
  <button class="rating-btn">4</button>
  <button class="rating-btn">5</button>
</div>
```

Selected button gets `filled` class and `background` set to the group's accent color.

### Criterion Group Colors

| Group | Color token | Max |
|---|---|---|
| Competitive Position (10) | `var(--ink)` | 50 |
| Company Load Factor (5) | `var(--data-blue)` | 25 |
| Contractual Risk (4) | `var(--review)` | 20 |
| Technical Risk (3) | `var(--go)` | 15 |
| Commercial & Financial Risk (5) | `var(--nogo)` | 25 |

### Verdict Panel (New Bid right rail)

```html
<div class="verdict-panel verdict-panel--go">
  <div class="verdict-headline verdict-headline--go">GO</div>
  <div class="verdict-bar-bg"><div class="verdict-bar-fill" style="width:60%"/></div>
  <!-- 2-col: CFR risk pill + win % -->
  <!-- verdict-alert (only if hardStop) -->
  <!-- minibar-row × 5 (group scores) -->
</div>
```

Verdict panel is `position: sticky; top: 72px` in the wizard's right column.

### Body Background Texture

```css
body::before {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    radial-gradient(circle at 12% 8%,  rgba(20,20,26,0.025) 0, transparent 35%),
    radial-gradient(circle at 88% 92%, rgba(20,20,26,0.02)  0, transparent 38%);
}
```

---

## 8. Branding & Logos

Two logo files in `public/`:

| File | Use |
|---|---|
| `/icononly_transparent.png` | Sidebar brand mark (22×22, `filter: invert(1) brightness(2)` inside dark square) |
| `/fulllogo_transparent_nobuffer.png` | Login page (180px wide, `opacity: 0.82`) |

**Sidebar brand mark implementation:**
```tsx
<div className="sidebar-brand-mark">  {/* bg: var(--ink), border-radius: 7px */}
  <img src="/icononly_transparent.png" width={22} height={22}
    style={{ filter: 'invert(1) brightness(2)', display: 'block' }} alt="Black" />
</div>
```

---

## 9. Auth Module (`lib/auth-options.ts`)

NextAuth **v4** pattern (not v5):

```typescript
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  pages:   { signIn: '/login' },
  providers: [
    CredentialsProvider({
      credentials: {
        email:    { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.active) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, name: user.name, email: user.email,
                 orgId: user.orgId, role: user.role, mustChange: user.mustChange } as any
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) Object.assign(token, { orgId: (user as any).orgId,
                                       role: (user as any).role,
                                       mustChange: (user as any).mustChange })
      return token
    },
    session({ session, token }) {
      Object.assign(session.user, { orgId: token.orgId, role: token.role,
                                    mustChange: token.mustChange })
      return session
    },
  },
}
```

**Accessing session in Server Components / API routes:**
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
const session = await getServerSession(authOptions)
```

**Middleware (`middleware.ts`)** — protects `(app)` routes, lets `(auth)` through:
```typescript
export { default } from 'next-auth/middleware'
export const config = { matcher: ['/dashboard/:path*', '/bids/:path*',
  '/executive/:path*', '/predictor/:path*', '/analytics/:path*',
  '/ai/:path*', '/settings/:path*'] }
```

---

## 10. AI Chat (`/api/ai/chat`)

Uses OpenAI SDK pointed at a Gemini-compatible endpoint:

```typescript
import OpenAI from 'openai'

const ai = new OpenAI({
  baseURL: 'https://g4f.space/api/gemini',
  apiKey:  'secret',
})

// POST /api/ai/chat
const { question, lang, history = [] } = await req.json()

const messages = [
  { role: 'system', content: systemPrompt },   // includes full org bid data
  ...history,
  { role: 'user', content: question },
]

const completion = await ai.chat.completions.create({
  model: 'gemini-2.0-flash',
  messages,
})

return NextResponse.json({ answer: completion.choices[0].message.content })
```

AI responses are rendered through `lib/render-md.tsx` — a custom inline markdown parser that produces React nodes (no external dependency). Supports: `**bold**`, `*italic*`, `` `code` ``, ` ```blocks``` `, `# headings`, `- lists`, `1. ordered`, `---`.

---

## 11. Pages (All Implemented)

### Layout shell (`app/(app)/layout.tsx`)
- `<Sidebar />` — fixed left, 240px, role-filtered nav groups
- `<main className="main-area">` — `margin-left: 240px`, `width: calc(100vw - 240px)`
- `<AiChatPanel />` — floating FAB + slide-up panel on all (app) pages

### `/dashboard` — Operations Dashboard
Server Component. Queries: total, GO/REVIEW/NO_GO counts, highRisk count, winRate (from WON/closed bids), last 10 bids table.

### `/executive` — Executive Dashboard
Server Component. SVG donut chart (decision split), horizontal bar chart (top locations by win rate), pipeline value KPIs.

### `/bids/new` — New Bid Assessment
Client Component. Two-column wizard (`1fr 360px`). Left: project profile card + 5 criteria group cards with segmented 0–5 ratings. Right: sticky verdict panel (live GO/REVIEW/NO GO, score bar, mini-bars per group, hard stop alert). Saves via `POST /api/bids`, redirects to `/bids/[id]`.

### `/bids` — Bid History
Server Component. URL-param filters (`?decision=GO&outcome=WON&riskIndex=HIGH`). Data table with decision/risk pills.

### `/bids/[id]` — Bid Detail
Server Component. Full criteria score breakdown by group, verdict summary, metadata.

### `/predictor` — Win Predictor
Client Component. Interactive score sliders, live verdict update, win probability display.

### `/analytics` — Performance Analytics
Server Component. SVG bar charts: win rate by location, score distribution histogram.

### `/ai` — Portfolio AI Chat
Client Component. Full-page chat layout. Suggestion chips on empty state. Message history passed to API. Responses rendered as markdown.

### `/settings` — User Management
Client Component (ADMIN only). Lists org users, create user modal, role/active toggle.

---

## 12. Bilingual (EN / AR)

Language is stored in `localStorage` key `blackbid_lang` and applied via:

```typescript
function applyLang(l: 'en' | 'ar') {
  document.documentElement.setAttribute('lang', l)
  document.body.classList.toggle('ar', l === 'ar')
  localStorage.setItem('blackbid_lang', l)
}
```

`body.ar` triggers:
- `font-family: 'IBM Plex Sans Arabic'`
- `direction: rtl`
- Sidebar flips: `left: auto; right: 0`
- All `margin-left` → `margin-right` via CSS selectors
- Nav label `letter-spacing: 0` (Arabic doesn't track)

Arabic strings are provided inline as `labelAr` properties in component data — no separate message files.

---

## 13. File Structure (Actual)

```
/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx            ← branded login, real company logos
│   ├── (app)/
│   │   ├── layout.tsx                ← Sidebar + main-area + AiChatPanel
│   │   ├── dashboard/page.tsx        ← Server Component
│   │   ├── executive/page.tsx        ← Server Component, SVG charts
│   │   ├── bids/
│   │   │   ├── page.tsx              ← Server Component, URL filters
│   │   │   ├── new/page.tsx          ← Client Component, wizard + verdict
│   │   │   └── [id]/page.tsx         ← Server Component, bid detail
│   │   ├── predictor/page.tsx        ← Client Component
│   │   ├── analytics/page.tsx        ← Server Component, SVG charts
│   │   ├── ai/page.tsx               ← Client Component, full-page chat
│   │   └── settings/page.tsx         ← Client Component, user management
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── bids/route.ts
│   │   ├── bids/[id]/route.ts
│   │   ├── users/route.ts
│   │   ├── users/[id]/route.ts
│   │   └── ai/chat/route.ts          ← OpenAI SDK → g4f.space/gemini
│   └── globals.css                   ← (import in layout)
├── components/
│   ├── auth/
│   │   └── BrandMark.tsx             ← SVG "B" mark (kept for fallback)
│   ├── layout/
│   │   ├── Sidebar.tsx               ← role-filtered nav, bilingual, logo PNG
│   │   └── Header.tsx                ← sticky bar, wordmark, breadcrumb, user meta
│   └── ai/
│       └── AiChatPanel.tsx           ← floating FAB + slide-up panel (all pages)
├── lib/
│   ├── decision.ts                   ← computeDecision() — used client + server
│   ├── auth-options.ts               ← NextAuth v4 authOptions
│   ├── prisma.ts                     ← singleton PrismaClient
│   └── render-md.tsx                 ← markdown → React nodes (no deps)
├── public/
│   ├── icononly_transparent.png      ← circular B logo (sidebar brand mark)
│   └── fulllogo_transparent_nobuffer.png  ← full "BLACK CONSTRUCTION" logo (login)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                       ← 22 bids, 1 org, 1 admin user
├── styles/
│   └── globals.css                   ← full design system: tokens, layout, components
├── middleware.ts                     ← NextAuth session guard on (app) routes
├── playwright-test/
│   └── test-app.mjs                  ← 24/24 E2E checks (headless Chromium)
├── next-auth.d.ts                    ← session type augmentation (orgId, role)
├── docker-compose.yml
├── Dockerfile                        ← multi-stage: deps → builder → runner
└── package.json
```

---

## 14. Docker Operations

### Build & run
```bash
# From WSL Ubuntu (use this — Windows Docker pipe can return 500 after restarts)
wsl -d Ubuntu bash -c "cd /mnt/d/Black_Go_NoGo_System && docker compose build --no-cache && docker compose up -d"
```

### Seed database
```bash
# Copy decision lib into container first (required for tsx seed)
docker cp lib/decision.ts blackbid_app:/app/lib/decision.ts

# Run seed
docker exec -u root blackbid_app tsx prisma/seed.ts

# If mustChange blocks login, reset it
docker exec blackbid_db psql -U blackbid -d blackbid \
  -c 'UPDATE "User" SET "mustChange" = false WHERE email = '"'"'admin@black.sa'"'"';'
```

### Stale proxy (wslrelay.exe)
After `docker compose up -d`, the Windows WSL relay may still serve the old container's CSS.
```powershell
Stop-Process -Name "wslrelay" -Force   # kills and auto-restarts, reconnects to new container
```

### Test
```bash
node playwright-test/test-app.mjs   # 24/24 checks pass
```

---

## 15. Role Permission Matrix

| Page / Action | ESTIMATOR | MANAGER | EXECUTIVE | ADMIN |
|---|---|---|---|---|
| /dashboard | ✓ | ✓ | ✓ | ✓ |
| /executive | — | — | ✓ | ✓ |
| /bids/new | ✓ | ✓ | — | ✓ |
| /bids | ✓ | ✓ | ✓ | ✓ |
| /predictor | ✓ | ✓ | ✓ | ✓ |
| /analytics | — | ✓ | ✓ | ✓ |
| /ai | ✓ | ✓ | ✓ | ✓ |
| /settings | — | — | — | ✓ |
| Update bid outcome | — | ✓ | — | ✓ |
| Delete bid | — | — | — | ✓ |
| Create/manage users | — | — | — | ✓ |

---

## 16. Implementation Status

All 6 original sprints are complete. App is deployed and tested.

| Sprint | Feature | Status |
|---|---|---|
| 1 | Scaffold, auth, schema, seed, Docker | ✅ Done |
| 2 | New Bid wizard, live verdict, criteria groups | ✅ Done — segmented 0–5 buttons, not sliders |
| 3 | Ops dashboard, Executive dashboard | ✅ Done |
| 4 | AI chat (Portfolio AI, floating panel) | ✅ Done — Gemini via g4f.space |
| 5 | Bid History, Win Predictor, Analytics | ✅ Done |
| 6 | Settings/Users, mobile, Arabic RTL, polish | ✅ Done |
| Post-sprint | Full UI redesign to match prototype exactly | ✅ Done — 2026-05-21 |
| Post-sprint | Markdown rendering in AI chat | ✅ Done — `lib/render-md.tsx` |
| Post-sprint | Real company logos (PNG) in sidebar + login | ✅ Done |

**Test coverage:** 24/24 Playwright E2E checks passing (login, dashboard, KPIs, bid history, new bid, settings).

---

*Solution Architecture v3.0 — Black Construction — Bid Intelligence*
*As-built state as of 2026-05-21*
*Prototype source of truth: `Black-Construction-Bid-Intelligence.html`*
*Deployment: Docker Compose (self-hosted, port 80) · Auth: NextAuth.js v4 credentials*

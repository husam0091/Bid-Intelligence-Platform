# Black Construction — Bid Intelligence
## Handoff Prompt for Engineering Agent

You are an engineering agent. Build a **production web application** that matches the attached HTML prototype (`Black-Construction-Bid-Intelligence.html`). Open it first and study every page, interaction, and visual detail — that file is the source of truth.

---

## Product Summary

**Black Construction — Bid Intelligence** is a bilingual (English / Arabic) bid decision engine for a Saudi Arabian construction company. It helps estimators score new tenders against 27 weighted criteria, surfaces a Go / Review / No-Go recommendation in real time, tracks the historical pipeline, and uses AI to summarize bids and surface comparable past projects.

The current artifact is a single-page front-end with localStorage persistence. Your job is to turn it into a real product with a backend, multi-user auth, and proper data persistence — while preserving the visual design, interactions, and bilingual behavior **exactly**.

---

## Tech Stack (recommended)

- **Frontend:** Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Charts:** Chart.js (already used) or Recharts
- **Backend:** Next.js API routes or a separate Node/Express service
- **Database:** PostgreSQL (Supabase or Neon) with Prisma
- **Auth:** Clerk or NextAuth with email + Google
- **AI:** Anthropic Claude API (Haiku 4.5) for the AI features — see `js/ai.js` for the exact prompts
- **Hosting:** Vercel
- **i18n:** next-intl

---

## Pages to Build (in priority order)

1. **Auth** — sign-in / sign-up. Roles: `estimator`, `manager`, `executive`, `admin`.
2. **Pipeline Command (Operations dashboard)** — filterable KPI strip + decision mix donut + monthly stacked outcomes + risk distribution + win-by-client + top-locations + recent-bids table.
3. **Executive (CEO) Dashboard** — KPIs with sparklines, value-tracking combo chart (estimated/contract/spend), portfolio health composite gauge, live-projects table with variance %.
4. **New Bid (7-step wizard)** — Profile step (project metadata + comparables panel), 5 criteria-group steps (Competitive, Load, Contractual, Technical, Commercial — each rates 3–10 items on a 0–5 segmented control), Review & Save step with AI summary. Right rail shows a sticky **Live Verdict** panel that updates as the user scores: huge GO/REVIEW/NO-GO headline, total score / 135 bar, win probability %, risk index pill, sub-score breakdown, and a HARD STOP banner when Commercial & Financial Risk is HIGH.
5. **Bid History** — every saved bid in a virtual-scroll table, with chip filters by outcome and an **AI natural-language search** ("won bids in Riyadh 2025", "Mecca Gov over 50M"). Inline outcome selector and delete.
6. **Win Predictor** — pick a project, see giant score gauge, prediction (Likely Win / Borderline / Likely Loss), AI summary, historical benchmarks (Won avg / Lost avg / This project), comparable past projects, and a score-distribution chart colored by outcome.
7. **Analytics** — win-rate cuts by project type, client sector, tender type, plus an outcome summary.
8. **Settings** — JSON export/import, decision-logic reference table, danger-zone reset.

---

## Decision Logic (port verbatim)

```
const COMMERCIAL_IDS = ["clientRep","clearDwgs","advPayment","payments","finDuration"];
commercialRiskSum = sum of the 5 commercial criteria (each 0..5)
totalScore        = sum of all 27 criteria (max 135)

riskIndex = cfr >= 20 ? LOW : cfr >= 13 ? MEDIUM : HIGH
hardStop  = riskIndex === HIGH

if total >= 90:  decision = hardStop ? NO GO : GO     ; winPct = LOW 75% / MED 60% / HARD 18%
if total >= 75:  decision = hardStop ? NO GO : GO     ; winPct = LOW 60% / MED 51% / HARD 18%
if total >= 60:  decision = hardStop ? NO GO : REVIEW ; winPct = 38.25%
if total >= 50:  decision = NO GO                     ; winPct = 18%
else:            decision = NO GO                     ; winPct = 9%
```

**Criteria groups** (full list in `js/core.js > CRITERIA_GROUPS`):
- **Competitive Position** (10 items, weight 50): relStrength, budgetKnown, competitors, limitedInv, similarExp, noPriceBreakers, techAdv, withinExpertise, lowChanges, goodLocation
- **Company Load Factor** (5 items): teamAvail, equipAvail, cashFlow, currWorkload, noImpactRunning
- **Contractual Risk** (4 items): ld, apg, perfBond, retention
- **Technical Risk** (3 items): newSystem, complexMEP, specialAuth
- **Commercial & Financial Risk** (5 items, HARD STOP if HIGH): clientRep, clearDwgs, advPayment, payments, finDuration

---

## AI Features

Wire these to the Anthropic API server-side. Cache responses per `{lang}_{bidId}_{score}_{risk}` to avoid re-hitting the API on every render.

1. **Bid insight** — single-sentence recommendation, plain language, cites the biggest risk or strength. Used on the New Bid review step and the Win Predictor.
2. **Portfolio callout** — single-sentence executive insight about the most actionable pattern in the portfolio. Shown at the top of Operations, CEO, and Analytics dashboards.
3. **Natural-language search** — translates a user query like "won Mecca Gov bids over 50M in 2025" into a structured filter (outcome, decision, riskIndex, type, clientCategory, tenderType, location, yearFrom/To, minValue/maxValue, minScore/maxScore, text) and applies it client-side. The exact prompt is in `js/ai.js > aiNlSearch`.
4. **Comparables** — purely client-side scoring (no AI call): rank past Won/Lost projects by type match (+3), client match (+2), size match (+2), tender match (+1), location match (+1), value ratio (+0..2). Return top 4.

All AI prompts must respect the current UI language (English or Arabic).

---

## Data Model

```ts
type Outcome = 'Won' | 'Lost' | 'Pending' | 'Rejected';
type Decision = 'GO' | 'REVIEW' | 'NO GO';
type RiskIndex = 'LOW' | 'MEDIUM' | 'HIGH';

interface Bid {
  id: string;                // uuid
  sr: number;                // sequential, per-org
  name: string;
  location: string;          // one of 22 KSA cities (see LOCATIONS)
  type: 'Building' | 'Infrastructure' | 'Industrial';
  size: 'Medium/Small' | 'Large' | 'Mega';
  duration: '6 Months' | '1 Year' | '2 Year' | '3 Year' | '4 Year' | '5 Year';
  tenderType: 'Open' | 'Limited' | 'Negotiated';
  clientCategory: 'Gov' | 'Private' | 'Semi';
  consultant: string;
  pmc: string;
  estValue: number;          // SAR
  contractValue: number;
  actualSpend: number;
  date: string;              // ISO date — submission date
  bidDate: string;
  outcome: Outcome;
  pipelineStatus: 'Active' | 'Awaiting';
  // 27 criteria, each 0..5:
  relStrength: number; budgetKnown: number; competitors: number; limitedInv: number;
  similarExp: number; noPriceBreakers: number; techAdv: number; withinExpertise: number;
  lowChanges: number; goodLocation: number;
  teamAvail: number; equipAvail: number; cashFlow: number; currWorkload: number; noImpactRunning: number;
  ld: number; apg: number; perfBond: number; retention: number;
  newSystem: number; complexMEP: number; specialAuth: number;
  clientRep: number; clearDwgs: number; advPayment: number; payments: number; finDuration: number;
  // Derived (computed server-side and cached):
  totalScore: number;
  riskIndex: RiskIndex;
  decision: Decision;
  expectWin: number;         // 0..1
  hardStop: boolean;
  // Audit:
  createdBy: string;         // user id
  createdAt: Date;
  updatedAt: Date;
}
```

Seed the DB with the 22 starter projects from `data/seed.js`.

---

## Design System (lift exactly from `styles.css`)

- **Canvas:** warm off-white `#EEEBE2`, surface `#F7F5EE`, ink `#14141A`
- **Hairlines:** `#D9D4C4` (soft `#E5E1D3`)
- **Status:** GO `#1F6E45`, REVIEW `#B07A1B`, NO-GO `#A8362A`, PENDING `#4A6585`
- **Data secondary:** steel blue `#3D5D85`
- **Type:**
  - Display: **Archivo Narrow** 600/700, uppercase, tight tracking. Used for page titles, KPI numbers, the giant verdict headline.
  - Body: **Inter Tight** 300–600. Default 13.5 px.
  - Mono: **JetBrains Mono** for every number, every eyebrow, every kicker.
  - Arabic: **IBM Plex Sans Arabic** swapped in body.ar / .display selectors. The visual rhythm must hold when flipped to RTL.
- **Spacing:** 14 px base gap, 18 px card padding. Three density modes (`comfortable`, `compact`, `dense`) controlled by `body.density-*` classes.
- **Theme:** light by default, optional `body.theme-graphite` dark variant.
- **Components:** sidebar with B logomark, sticky header with full Black wordmark + breadcrumb + live-sync timestamp, language toggle pill in the sidebar, AI insight band (graphite→steel gradient stripe on the left, AI chip, text), KPI card with optional sparkline strip, minibar list rows, segmented rating (0–5), wizard step indicator with bar progress, sticky verdict panel.

---

## Bilingual (i18n)

Every visible string lives in a translation table (`js/i18n.js` has the full English + Arabic dictionaries). When `lang === 'ar'`:
- `<html dir="rtl">`, `<body class="ar">`
- Sidebar moves to the right (CSS grid order flip)
- All nav-item accent strips, language-toggle slider, RTL-aware margins flip via `body.ar` selectors
- Font swap: display→IBM Plex Sans Arabic, body→IBM Plex Sans Arabic
- Currency prefix becomes `ر.س` instead of `SAR`
- Dates use `ar-SA` locale

---

## Acceptance Criteria

- [ ] Visual fidelity: side-by-side comparison with the prototype passes on Operations, CEO, New Bid (any step), Predictor, History, Analytics, Settings.
- [ ] Both languages fully polished — same density, no clipped text, RTL flips cleanly.
- [ ] Save a bid → it appears in History and influences the dashboards immediately.
- [ ] Verdict panel updates in <100 ms on every score change.
- [ ] HARD STOP banner appears the moment Commercial & Financial Risk drops to HIGH.
- [ ] AI features degrade gracefully when the API is unreachable (cached or sensible fallback text).
- [ ] Natural-language search returns correct results for: "won bids in Riyadh", "Mecca Gov over 50M", "high risk losses", "lost bids 2024".
- [ ] CSV / JSON export of all bids works for the admin.
- [ ] Mobile breakpoint (<820 px): sidebar collapses, grids stack to one column, no horizontal scroll.
- [ ] All 27 criteria match the labels and group assignments in the prototype.
- [ ] Decision logic produces the exact same recommendation as the prototype for any given input.

---

## Out of Scope (for v1)

- Real-time multi-user editing
- File attachments on bids (drawings, RFP PDFs)
- Email notifications
- Mobile native apps

---

**Open the prototype HTML first. Click through every page. Toggle the language. Open the Tweaks panel. The prototype is the spec — build to it.**

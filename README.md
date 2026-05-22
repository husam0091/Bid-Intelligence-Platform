<div align="center">

<br/>

```
  ██████╗
  ██╔══██╗
  ██████╔╝   BLACK — BID INTELLIGENCE
  ██╔══██╗
  ██████╔╝
  ╚═════╝
```

### Bilingual bid decision engine for Saudi construction contractors

[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Arabic](https://img.shields.io/badge/Arabic-RTL_ready-success)](docs/i18n.md)

</div>

---

## What is this?

**Black Bid Intelligence** is a structured bid decision platform for mid-tier Saudi construction contractors. It replaces ad-hoc Excel Go/No-Go scoring with a scored, role-aware, AI-augmented web application.

- Score any tender across **27 criteria** in **5 risk domains** (max 135 pts)
- Get an instant **GO / REVIEW / NO GO** recommendation + win probability
- **Hard Stop** fires if Commercial & Financial Risk is HIGH — blocks the bid regardless of total score
- Track your full bid pipeline, win/loss history, and executive KPIs
- AI-powered bid insights and natural-language search
- Fully bilingual: **English ⇄ Arabic (RTL)**

---

## Quick Start

> **Requires:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/black-bid-intelligence.git
cd black-bid-intelligence

# 2. Configure environment
cp .env.example .env
# Open .env and set: NEXTAUTH_SECRET, ANTHROPIC_API_KEY

# 3. Start everything (app + database)
docker compose up

# 4. Open the app
open http://localhost
```

**Default admin credentials (change on first login):**
```
Email:    admin@black.sa
Password: changeme
```

> The database is seeded automatically on first run with 22 historical bids from the Excel prototype.

---

## Features

| Feature | Description |
|---|---|
| **New Bid Wizard** | 7-step guided scoring across all 5 risk domains |
| **Live Verdict Panel** | Real-time GO/REVIEW/NO GO as you score, updates in <100ms |
| **Hard Stop** | Commercial & Financial Risk HIGH → bid blocked instantly |
| **Win Predictor** | Score gauge vs. Won/Lost averages + comparable past projects |
| **Operations Dashboard** | KPI strip, decision donut, monthly outcomes, win-by-client |
| **CEO Dashboard** | Sparkline KPIs, estimated vs. contract vs. actual spend, portfolio health |
| **Bid History** | Virtual-scroll table with chip filters + AI natural-language search |
| **Analytics** | Win-rate cuts by project type, client sector, tender type |
| **AI Insights** | Single-sentence bid recommendations + portfolio callouts (Claude Haiku) |
| **NL Search** | "Won bids in Riyadh 2025", "Mecca Gov over 50M" — converts to structured filters |
| **Bilingual** | Full EN/AR with RTL layout flip, IBM Plex Sans Arabic, ر.س currency |
| **User Management** | Admin-only: create users, assign roles, deactivate |
| **Export / Import** | JSON export all bids, JSON seed import |

---

## User Roles

| Role | Access |
|---|---|
| `ESTIMATOR` | New Bid Wizard, Bid History, Win Predictor |
| `MANAGER` | + Operations Dashboard, Analytics, inline outcome edits |
| `EXECUTIVE` | + CEO Dashboard |
| `ADMIN` | + Settings (Users, Export/Import, Reset) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + custom design tokens |
| Charts | Chart.js |
| Database | PostgreSQL 16 (Docker) via Prisma ORM |
| Auth | NextAuth.js v5 (credentials + JWT) — fully self-hosted |
| AI | Anthropic Claude Haiku 4.5 (server-side, cached) |
| i18n | next-intl (EN + AR) |
| Deployment | Docker Compose |

---

## Configuration

Copy `.env.example` to `.env` and fill in:

```env
# Required
NEXTAUTH_SECRET=your-random-secret-min-32-chars   # openssl rand -base64 32
ANTHROPIC_API_KEY=sk-ant-...

# Optional overrides
NEXTAUTH_URL=http://localhost
DB_PASSWORD=changeme
POSTGRES_PORT=5432
APP_PORT=3000
```

> `DATABASE_URL` is set automatically by docker-compose. Do not set it manually when using Docker.

---

## Development (without Docker)

```bash
# Prerequisites: Node 20+, PostgreSQL 16

npm install
cp .env.example .env.local
# Set DATABASE_URL to your local postgres

npx prisma migrate dev
npx prisma db seed

npm run dev
```

---

## Project Structure

```
├── app/                    Next.js App Router pages + API routes
│   ├── (auth)/             Login page
│   ├── (app)/              Protected app pages
│   └── api/                API routes (bids, dashboard, AI, users, auth)
├── components/             Shared React components
│   ├── auth/               Login form, logo
│   ├── bid/                Wizard, LiveVerdictPanel, CriteriaGroup
│   ├── dashboard/          KpiCard, RiskGauge, DecisionDonut, AiCalloutBand
│   └── ui/                 ScoreBadge, RiskPill, SegmentedControl
├── lib/                    Shared logic
│   ├── decision.ts         computeDecision() — shared client/server
│   ├── comparables.ts      Client-side comparable scoring
│   └── ai.ts               Anthropic SDK wrappers + cache
├── prisma/
│   ├── schema.prisma
│   └── seed.ts             22 starter bids from Excel prototype
├── messages/               i18n dictionaries
│   ├── en.json
│   └── ar.json
├── styles/
│   └── globals.css         Design tokens lifted from prototype
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Docker Reference

```bash
# Start (foreground)
docker compose up

# Start (background)
docker compose up -d

# Stop
docker compose down

# Stop + wipe database
docker compose down -v

# Rebuild app image after code changes
docker compose up --build

# View logs
docker compose logs -f app

# Open a database shell
docker compose exec db psql -U blackbid -d blackbid

# Run a one-off seed
docker compose exec app npx prisma db seed
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m "feat: your feature"`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

---

## Security

Found a security issue? See [SECURITY.md](.github/SECURITY.md) — please report responsibly, do not open a public issue.

---

## License

[MIT](LICENSE) © Black Construction

---

<div align="center">
  <sub>Built for the KSA construction market · SAR 232B opportunity · 101,317+ registered contractors</sub>
</div>

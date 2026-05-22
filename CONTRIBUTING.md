# Contributing to Black Bid Intelligence

## Before you start

- Check existing issues before opening a new one
- For large features, open an issue first to discuss the approach
- All PRs require passing CI (lint + type-check + Docker build)

## Development setup

```bash
git clone https://github.com/YOUR_USERNAME/black-bid-intelligence.git
cd black-bid-intelligence
npm install
cp .env.example .env.local
# Set DATABASE_URL to a local Postgres instance
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Coding conventions

- TypeScript strict mode — no `any`
- All visible strings go through `next-intl` — no hardcoded English text in JSX
- Decision logic (`lib/decision.ts`) is sacred — do not modify without a test proving identical output to the Excel prototype
- AI calls are server-side only — no `ANTHROPIC_API_KEY` in client code

## Commit style

```
feat: add something new
fix: correct a bug
refactor: restructure without behavior change
docs: documentation only
chore: tooling / CI
```

## Bilingual requirement

Every UI change must be tested in both English and Arabic. If you add a new visible string, add it to both `messages/en.json` and `messages/ar.json`.

## Pull Request checklist

See [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).

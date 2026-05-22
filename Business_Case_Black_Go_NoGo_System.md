# Business Case: Black Go/No-Go Decision Support System
**Version 2.0 | Prepared by: M Adeel QS | Date: May 2026**

---

## Executive Summary

The **Black Go/No-Go System** is a structured, data-driven bid decision framework designed to help construction and contracting companies in Saudi Arabia determine whether to pursue, review, or reject project tenders. By scoring each opportunity across six risk and competitiveness dimensions, the system eliminates guesswork from bid decisions, improves resource allocation, and increases the probability of winning profitable contracts.

With 22 projects evaluated to date, the system has achieved a **41% win rate** on a total pipeline of **SAR 75.2 million**, with active projects valued at **SAR 31.74 million**. The integrated Win Predictor engine benchmarks each new bid against historical performance to further refine decision quality over time.

---

## 1. Problem Statement

Construction and contracting companies in Saudi Arabia routinely face the challenge of deciding which tenders to pursue. The cost of preparing an unsuccessful bid — in time, manpower, and direct expenses — is significant. Without a structured framework, bid decisions are often made based on:

- Gut feeling or personal relationships
- Incomplete risk assessment
- No visibility into workload capacity or cash flow impact
- Inconsistent evaluation across different decision-makers
- No historical learning from past wins and losses

The result is wasted tender costs, strained project teams, poor win rates, and exposure to high-risk contracts that can damage the company's financial position.

---

## 2. Proposed Solution

The Black Go/No-Go System is an Excel-based decision engine that provides a **standardized, scored evaluation** of every bid opportunity. It covers all material risk and opportunity factors across six domains and produces a clear, defensible recommendation — **GO, REVIEW, or NO GO** — for each tender.

### 2.1 How It Works

Each project is scored on **27 weighted criteria**, rated 0–5, across six categories:

| Category | Key Factors Evaluated |
|---|---|
| **Competitive Position** | Relationship strength, budget known, competitors, limited invitation, technical advantage, similar experience, price-break risk |
| **Company Load Factor** | Team availability, equipment availability, cash flow capability, current workload, impact on running projects |
| **Contractual Risk** | Liquidated damages, advance payment guarantee, performance bond, retention terms |
| **Technical Risk** | New/untested systems, complex MEP, special authority approvals |
| **Commercial & Financial Risk** | Client reputation, drawing clarity, advance payment, payment terms, financial duration suitability |
| **Project Profile** | Location, type, size, duration, tender type |

### 2.2 Decision Logic

| Total Score | Risk Index | Recommendation | Expected Win % |
|---|---|---|---|
| ≥ 90 | LOW | **GO** | 60–75% |
| 75–89 | MEDIUM | **GO** | 51% |
| 60–74 | MEDIUM | **REVIEW** | 38% |
| 50–59 | HIGH | **NO GO** | 18% |
| < 50 | HIGH | **NO GO** | 9% |

A separate **Hard Stop** override flag is triggered when commercial/financial risk is independently assessed as HIGH, regardless of the total score. This prevents the company from being seduced by a high overall score on a project with fundamentally unacceptable payment or contractual terms.

### 2.3 System Architecture (8 Sheets)

| Sheet | Purpose |
|---|---|
| **Input** | Data entry for all project parameters and scoring |
| **Data Processor** | Pivot-table engine feeding all dashboards |
| **Dashboard Summary** | Operational dashboard for bid managers |
| **CEO Input** | Simplified executive summary with contract vs. estimated values |
| **CEO Dashboard** | Executive-level visual reporting |
| **History** | Permanent audit trail of all bids and outcomes |
| **Analytics** | Win/loss performance metrics |
| **Win Predictor** | Compares current project score to historical win/loss averages |

---

## 3. Current Performance (22 Projects, 2022–2026)

### 3.1 Pipeline Overview

| Metric | Value |
|---|---|
| Total projects evaluated | 22 |
| Total pipeline value (estimated) | SAR 75.2 million |
| Active projects pipeline | SAR 31.74 million |
| Total Go-recommended project value | SAR 29.5 million |
| Total Review-category project value | SAR 19.9 million |
| Average expected win probability | 41% |

### 3.2 Bid Outcome Results

| Outcome | Count | % of Total |
|---|---|---|
| Won | 9 | 41% |
| Lost | 3 | 14% |
| Pending | 4 | 18% |
| Rejected (NO GO) | 6 | 27% |

The system correctly identified 6 bids as NO GO — these were rejected before submission, avoiding bid preparation costs and preventing the company from entering unfavorable contracts.

### 3.3 Decision Breakdown

| Decision | % of Evaluated Bids |
|---|---|
| GO | 42% |
| NO GO | 33% |
| REVIEW | 25% |

### 3.4 Risk Index Distribution

| Risk Level | % of Portfolio |
|---|---|
| LOW (favorable) | 25% |
| MEDIUM (manageable) | 42% |
| HIGH (caution) | 33% |

### 3.5 Win Probability by Client Type

| Client Sector | Avg. Win Probability |
|---|---|
| Government | 45% |
| Private | 42% |
| Semi-government | 33% |

### 3.6 Project Type Distribution

| Type | Share of Portfolio |
|---|---|
| Building | 36% |
| Infrastructure | 36% |
| Industrial | 27% |

---

## 4. Business Benefits

### 4.1 Reduced Bid Cost Waste
By systematically rejecting high-risk, low-probability tenders before committing bid preparation resources, the system reduces wasted tendering expenditure. 6 of 22 evaluated projects (27%) were correctly identified as NO GO — each rejection avoids the full cost of bid preparation.

### 4.2 Improved Win Rate Focus
The system concentrates the company's bidding effort on opportunities where the expected win probability is ≥ 38%. All 9 project wins came from bids that scored in the GO or REVIEW bands. Zero wins came from projects that scored in the HIGH risk / NO GO category.

### 4.3 Cash Flow and Capacity Protection
The **Company Load Factor** category explicitly scores team availability, equipment availability, and current workload. This prevents the company from winning contracts it cannot staff or finance, which is a leading cause of project losses and reputational damage in the sector.

### 4.4 Contractual Risk Management
The dedicated **Contractual Risk** and **Commercial & Financial Risk** categories — with an independent Hard Stop override — ensure the company never bids on projects where LDs, retention, bond requirements, or payment terms represent unacceptable exposure, regardless of the project's attractiveness on other dimensions.

### 4.5 CEO-Level Visibility
The **CEO Input** and **CEO Dashboard** sheets provide executive leadership with a consolidated view of all bids, including contract vs. estimated value variances and actual spend tracking. This supports strategic portfolio decisions and investor/board reporting.

### 4.6 Institutional Learning via Win Predictor
The **Win Predictor engine** compares each new project's total score against the historical average score of won and lost projects. Over time, this creates a feedback loop that continuously refines the company's understanding of what score thresholds actually predict success in the Saudi market.

---

## 5. Financial Impact Illustration

Based on current data:

- **Won contract value**: SAR 57.4 million (sum of contract values for all won/pending projects)
- **Estimated value of pipeline**: SAR 75.2 million
- **Implied contract-to-estimate conversion**: ~76% — indicating that won projects are being awarded at rates close to their estimated values, a sign of healthy bid pricing

The 6 NO GO rejections avoided commitment to an estimated **SAR 19.9 million** in high-risk contract exposure — projects that, based on scoring, carried an ~18% expected win probability and high contractual/financial risk. The bid preparation savings alone on 6 rejected tenders is material.

---

## 6. Competitive Context

Saudi Arabia's construction sector is intensely competitive, with open tenders frequently attracting 10+ bidders. Companies that bid indiscriminately face:
- Hit rates below 10%
- High bid preparation costs per won SAR
- Overextended project teams
- Exposure to punitive contract terms

The Black Go/No-Go System directly addresses all four risks, positioning the company to bid fewer, better opportunities — the industry-standard approach used by top-tier regional contractors.

---

## 7. Recommendations

**1. Mandate system use for all bids above SAR 500,000.** Below this threshold, a simplified version of the scoring sheet is sufficient.

**2. Integrate actual gross margin outcomes into the History sheet.** The GM% column is currently unpopulated. Capturing this will allow the Win Predictor to evolve from predicting win probability to predicting *profitable* win probability.

**3. Set a formal NO GO threshold policy.** Based on current data, no project scoring below 60 (HIGH risk) should proceed to bid without written CEO approval. This should be formalized as company policy.

**4. Expand the Win Predictor's historical dataset.** The engine becomes significantly more accurate with 50+ historical data points. Consistent data entry across all bids should be enforced from this point forward.

**5. Automate reporting to reduce manual effort.** The current Excel architecture is robust, but as the project database grows, migration to a Power BI or database-backed front end will improve scalability and enable real-time dashboarding.

---

## 8. Conclusion

The Black Go/No-Go System is a proven, structured tool that brings discipline, consistency, and intelligence to one of the most consequential recurring decisions a contracting company makes. With 22 bids tracked, a 41% win rate, SAR 75M in pipeline visibility, and a functioning Win Predictor engine, the system has already demonstrated measurable value.

Its continued and mandatory use — combined with capturing gross margin outcomes — will compound this value over time, building a proprietary dataset that becomes an enduring competitive advantage.

---

*System developed by M Adeel QS | Contact: 0550634001*
*Document prepared: May 2026*

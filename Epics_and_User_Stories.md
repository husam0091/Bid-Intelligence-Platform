# Epics & User Stories
## Black Go/No-Go Decision Support System
**Version:** 2.0 | **Last Updated:** May 2026

---

## Epic Overview

| Epic ID | Epic Name | Description |
|---|---|---|
| EP-01 | Bid Scoring & Decision Engine | Core scoring model and GO/REVIEW/NO GO recommendation |
| EP-02 | Win Predictor | Historical comparison engine for win probability |
| EP-03 | Operational Dashboard | Bid manager and operations team reporting |
| EP-04 | CEO Dashboard & Executive View | Executive reporting and pipeline oversight |
| EP-05 | History & Audit Trail | Permanent logging of all bids and outcomes |
| EP-06 | Analytics & Performance Intelligence | Win/loss metrics and trend analysis |
| EP-07 | System Administration & Governance | Scoring configuration, data protection, access |

---

---

# EP-01 — Bid Scoring & Decision Engine

**Goal:** Enable bid managers to evaluate any tender in a structured, consistent way and receive a clear recommendation.

**Acceptance Criteria for Epic:**
- Any bid can be fully scored in under 15 minutes
- Decision output (GO/REVIEW/NO GO) is generated automatically
- Hard Stop override is applied independently of total score
- Expected win % is displayed alongside every decision

---

### Story EP-01-S01
**As a** bid manager,
**I want to** enter project profile information (name, location, type, estimated value, size, duration, tender type, submission date)
**so that** the project is fully identified and its context is captured before scoring begins.

**Acceptance Criteria:**
- [ ] All 9 profile fields are present and labeled clearly
- [ ] Submission date field auto-populates the Year, Month, and Running Month columns
- [ ] Estimated value field accepts SAR amounts and formats them consistently
- [ ] Project size is selectable: Medium/Small, Large, Mega
- [ ] Project type is selectable: Building, Infrastructure, Industrial
- [ ] Tender type is selectable: Open, Limited, Negotiated

---

### Story EP-01-S02
**As a** bid manager,
**I want to** score the Competitive Position of a bid across 10 criteria (0–5 each)
**so that** I can assess how favorable the market and client context is for this opportunity.

**Criteria scored:**
- Relationship Strength with client
- Budget is Known
- Competitor count/strength
- Limited Invitation (restricted tender)
- Similar Experience held
- No Price Breakers (Lump-Sum risk)
- Technical Advantage
- Within Company Expertise
- Low Changes Expected
- Good Location (logistical fit)

**Acceptance Criteria:**
- [ ] All 10 criteria are present with 0–5 input cells
- [ ] Each criterion has a tooltip or label explaining what each score level means
- [ ] Sub-total for this domain is automatically calculated
- [ ] Input validation rejects values outside 0–5

---

### Story EP-01-S03
**As a** bid manager,
**I want to** score the Company Load Factor across 5 criteria (0–5 each)
**so that** I can verify we have the internal capacity to deliver this project without harming existing commitments.

**Criteria scored:**
- Team Availability
- Equipment Availability
- Cash Flow Capability
- Current Workload (inverse — higher workload = lower score)
- No Impact on Running Projects

**Acceptance Criteria:**
- [ ] All 5 criteria are present with 0–5 input cells
- [ ] Sub-total for this domain is automatically calculated
- [ ] A score of 0 on Cash Flow Capability triggers a warning flag

---

### Story EP-01-S04
**As a** bid manager,
**I want to** score Contractual Risk across 4 criteria (0–5 each)
**so that** I can identify and quantify unfavorable contract terms before committing to bid.

**Criteria scored:**
- LD — Liquidated Damages level
- Advance Payment Guarantee requirement
- Performance Bond requirement
- Retention percentage

**Acceptance Criteria:**
- [ ] All 4 criteria are present with 0–5 input cells
- [ ] Sub-total for this domain is automatically calculated
- [ ] High LD + High Bond + High Retention combination raises a visual warning

---

### Story EP-01-S05
**As a** bid manager,
**I want to** score Technical Risk across 3 criteria (0–5 each)
**so that** I can flag technically challenging projects that require additional scrutiny.

**Criteria scored:**
- New System (Never Done Before)
- Complex MEP
- Special Authority Approvals required

**Acceptance Criteria:**
- [ ] All 3 criteria are present with 0–5 input cells
- [ ] A score of 0 on "New System" (untested) flags a technical Hard Stop note

---

### Story EP-01-S06
**As a** bid manager,
**I want to** score Commercial & Financial Risk across 5 criteria (0–5 each)
**so that** the system can independently assess payment and client financial health, separate from the overall score.

**Criteria scored:**
- Client Reputation (payment history)
- Clear Drawings (scope definition quality)
- Advance Payment offered
- Payment Terms (intervals and conditions)
- Financial Duration OK (project duration matches cash flow capacity)

**Acceptance Criteria:**
- [ ] All 5 criteria are present with 0–5 input cells
- [ ] This domain's sub-score feeds independently into the Risk Index calculation
- [ ] Risk Index is labeled: LOW / MEDIUM / HIGH based on this sub-score alone

---

### Story EP-01-S07
**As a** bid manager,
**I want to** see the Total Score, Risk Index, and Decision (GO/REVIEW/NO GO) automatically calculated the moment I finish scoring
**so that** I have an instant, consistent recommendation without any manual calculation.

**Acceptance Criteria:**
- [ ] Total Score = sum of all 27 criteria (max 135)
- [ ] Risk Index derived from Commercial & Financial Risk sub-score: LOW / MEDIUM / HIGH
- [ ] Decision Logic applied per threshold table (see PRD §6.2)
- [ ] Expected Win % displayed alongside Decision
- [ ] Hard Stop column populated independently: if Commercial & Financial Risk = HIGH, Hard Stop = NO GO regardless of Total Score
- [ ] Decision cell is color-coded: GO = green, REVIEW = amber, NO GO = red

---

### Story EP-01-S08
**As a** bid manager,
**I want to** record the final outcome of each bid (Won, Lost, Pending, Rejected) and add remarks
**so that** the history and analytics modules have accurate data to learn from.

**Acceptance Criteria:**
- [ ] "Won, Lost & Pending" column is a dropdown: Won / Lost / Pending / Rejected
- [ ] A remarks field is available for recording reason for win, loss, or rejection
- [ ] A links field is available for attaching external documents or references
- [ ] Updating the outcome immediately reflects in all dashboards and analytics

---

---

# EP-02 — Win Predictor

**Goal:** Leverage historical bid data to give each new bid a data-driven prediction, not just a rule-based recommendation.

**Acceptance Criteria for Epic:**
- Win Predictor updates automatically as new historical outcomes are added
- Displays current score benchmarked against historical averages
- Provides actionable guidance text, not just a number

---

### Story EP-02-S01
**As a** bid manager,
**I want to** see the current project's Total Score benchmarked against the historical average score of won projects
**so that** I can understand whether this bid is scoring above or below the typical winning threshold.

**Acceptance Criteria:**
- [ ] "Current Project Score" displays the score from the active Input row
- [ ] "Historical Avg Score (Wins)" calculates the average Total Score of all Won projects in History
- [ ] Values update dynamically as new outcomes are recorded

---

### Story EP-02-S02
**As a** bid manager,
**I want to** see the current project's score compared to the historical average score of lost projects
**so that** I can understand whether this bid resembles past losses more than past wins.

**Acceptance Criteria:**
- [ ] "Historical Avg Score (Losses)" calculates the average Total Score of all Lost projects in History
- [ ] If current score is closer to loss average than win average, Prediction = "High Loss Risk"
- [ ] If current score is closer to win average, Prediction = "Favorable"
- [ ] If current score falls between the two averages, Prediction = "Borderline — Senior Review Recommended"

---

### Story EP-02-S03
**As a** bid manager,
**I want to** receive plain-language Guidance text from the Win Predictor
**so that** I know what action to take, not just what the numbers mean.

**Acceptance Criteria:**
- [ ] Guidance text is contextual — different messages for GO, REVIEW, NO GO predictions
- [ ] Guidance references specific risk areas if score is low in a particular domain
- [ ] Guidance updates automatically as the score changes

---

---

# EP-03 — Operational Dashboard

**Goal:** Give bid managers and operations teams a single-screen view of the full bid pipeline, win performance, and risk profile.

**Acceptance Criteria for Epic:**
- Dashboard is view-only — no data entry
- All charts and KPIs update when Input sheet data changes
- All slicers work independently and in combination

---

### Story EP-03-S01
**As an** operations manager,
**I want to** see a KPI summary bar showing Total Projects, Average Win %, GO count, REVIEW count, and HIGH Risk count
**so that** I can assess the health of the pipeline at a glance.

**Acceptance Criteria:**
- [ ] KPIs displayed at top of dashboard
- [ ] All KPIs update when new bids are added or outcomes changed
- [ ] GO count = number of bids with Decision = GO
- [ ] HIGH Risk count = number of bids with Risk Index = HIGH

---

### Story EP-03-S02
**As an** operations manager,
**I want to** see a Decision Breakdown pie chart (GO / NO GO / REVIEW as % of all bids)
**so that** I can understand what proportion of evaluated opportunities are being pursued.

**Acceptance Criteria:**
- [ ] Pie chart shows GO, NO GO, REVIEW as percentage slices
- [ ] Responds to all active slicers
- [ ] Legend and percentages are clearly labeled

---

### Story EP-03-S03
**As an** operations manager,
**I want to** see Win Probability broken down by Client Type (Government, Private, Semi-government)
**so that** I can identify which client segments the company performs best with.

**Acceptance Criteria:**
- [ ] Bar or column chart showing average Win % per client category
- [ ] Responds to active slicers
- [ ] Data sourced from historical outcomes, not just decision logic

---

### Story EP-03-S04
**As an** operations manager,
**I want to** see a Risk Assessment distribution (HIGH / MEDIUM / LOW count or %)
**so that** I can monitor whether the overall portfolio risk is within acceptable levels.

**Acceptance Criteria:**
- [ ] Stacked or grouped chart showing HIGH / MEDIUM / LOW risk distribution
- [ ] A Risk Gauge Meter (semicircular with needle) shows the composite portfolio risk score
- [ ] Gauge needle position calculated from weighted average of all active bids' risk levels

---

### Story EP-03-S05
**As an** operations manager,
**I want to** see a monthly bar chart of Won, Lost, Pending, and Rejected bids
**so that** I can track bidding activity and outcomes over time.

**Acceptance Criteria:**
- [ ] X-axis = months; Y-axis = count of bids
- [ ] Four series: Won (green), Lost (red), Pending (blue), Rejected (grey)
- [ ] Responds to Month slicer

---

### Story EP-03-S06
**As an** operations manager,
**I want to** filter all dashboard charts by Month, Location, Project Type, Client Type, Tender Type, and Risk Index
**so that** I can investigate specific segments of the pipeline.

**Acceptance Criteria:**
- [ ] Six independent slicers are present on the dashboard
- [ ] All charts respond to slicer selections simultaneously
- [ ] "Clear all filters" option is available
- [ ] Slicers do not affect the underlying data, only the dashboard view

---

### Story EP-03-S07
**As an** operations manager,
**I want to** see Win Probability by Location (city-level)
**so that** I can understand where in Saudi Arabia the company wins most reliably.

**Acceptance Criteria:**
- [ ] Table or bar chart listing each city with its average Win %
- [ ] Cities sorted by Win % descending
- [ ] Responds to all active slicers

---

---

# EP-04 — CEO Dashboard & Executive View

**Goal:** Give the CEO a concise, financial-first view of pipeline health, bid performance, and project delivery vs. budget.

**Acceptance Criteria for Epic:**
- CEO view requires no scrolling or manual calculation
- Actual Spend vs. Contract Value is visible per project
- All monetary values clearly labeled in SAR

---

### Story EP-04-S01
**As a** CEO,
**I want to** see a summary of Total Bids, Won Bids, Win Rate, Total Pipeline Value, and Active Pipeline Value
**so that** I can assess business development performance in 30 seconds.

**Acceptance Criteria:**
- [ ] Summary displayed prominently at top of CEO Input sheet
- [ ] Total Pipeline Value = sum of all Estimated Values
- [ ] Active Pipeline Value = sum of Estimated Values for Won + Pending bids only
- [ ] Win Rate = Won / Total Bids as a percentage

---

### Story EP-04-S02
**As a** CEO,
**I want to** see a per-project table showing Score, Risk, Decision, Win %, Outcome, Month, Location, Contract Value, Estimated Value, and Actual Spend
**so that** I can monitor every active bid and live project in one place.

**Acceptance Criteria:**
- [ ] Table is sorted by Submission Date (most recent first by default)
- [ ] Actual Spend field is editable — updated by finance or PM team
- [ ] Color coding: Decision column green/amber/red per GO/REVIEW/NO GO
- [ ] Variance column auto-calculated: Contract Value minus Estimated Value

---

### Story EP-04-S03
**As a** CEO,
**I want to** see a column chart comparing Contract Value vs. Estimated Value by running month
**so that** I can identify months where the company is winning contracts above or below its estimates.

**Acceptance Criteria:**
- [ ] Dual-series column chart: Estimated Value (grey) and Contract Value (blue) per month
- [ ] SAR values on Y-axis, months on X-axis
- [ ] Tooltip shows exact values on hover
- [ ] Responds to Running Month slicer

---

### Story EP-04-S04
**As a** CEO,
**I want to** filter the CEO view by Running Month
**so that** I can drill into specific periods for board reporting or management reviews.

**Acceptance Criteria:**
- [ ] Running Month slicer filters the per-project table and column chart simultaneously
- [ ] Month slicer is based on the month the bid was submitted, not the award month

---

---

# EP-05 — History & Audit Trail

**Goal:** Maintain a permanent, tamper-evident log of every bid evaluation, outcome, and financial result.

**Acceptance Criteria for Epic:**
- Every submitted bid has a History record
- Completed (Won/Lost) records are locked from editing
- Gross Margin and Competitor data is captured for learning purposes

---

### Story EP-05-S01
**As a** bid manager,
**I want** every project entered in the Input sheet to automatically create a record in the History sheet
**so that** no bid evaluation is ever lost and the audit trail is always complete.

**Acceptance Criteria:**
- [ ] History record is created when a new row is added to Input
- [ ] History captures: Sr. No, Bid Date, Project Name, Client, Consultant, Sector, Estimated Value, Contract Value, Total Score, Result
- [ ] If a project is deleted from Input, its History record is preserved

---

### Story EP-05-S02
**As a** QS manager,
**I want to** record the Gross Margin % and Main Competitor for every completed (Won/Lost) project
**so that** the company builds a competitive intelligence base and profitability database.

**Acceptance Criteria:**
- [ ] Gross Margin % field is available in History and editable for Won projects
- [ ] Main Competitor field accepts free text
- [ ] Both fields are optional — system does not block record completion if left blank
- [ ] A completion % indicator shows how many Won records have GM% filled in

---

### Story EP-05-S03
**As a** system administrator,
**I want** History records for Won and Lost projects to be read-only after outcome is confirmed
**so that** past bid records cannot be retroactively altered to manipulate analytics.

**Acceptance Criteria:**
- [ ] Row is locked for editing once "Won" or "Lost" is selected in the Result column
- [ ] An authorized admin override is available via password protection
- [ ] Pending and Rejected records remain editable

---

---

# EP-06 — Analytics & Performance Intelligence

**Goal:** Provide an always-current summary of bid performance metrics to support continuous improvement.

**Acceptance Criteria for Epic:**
- All metrics update automatically as new data is entered
- Metrics feed the Win Predictor
- Outputs are suitable for inclusion in board reports

---

### Story EP-06-S01
**As an** operations manager,
**I want to** see at a glance: Total Bids, Total Wins, Win Rate, Average Score of Wins, and Average Score of Losses
**so that** I can track whether our bid quality and win rate are improving over time.

**Acceptance Criteria:**
- [ ] All 5 metrics displayed on the Analytics sheet
- [ ] Metrics auto-update when new bid outcomes are recorded
- [ ] "Average Score of Wins" and "Average Score of Losses" feed directly into the Win Predictor

---

### Story EP-06-S02
**As a** CEO,
**I want to** see Win Rate trending over time (by quarter or year)
**so that** I can present evidence of improvement to the board and investors.

**Acceptance Criteria:**
- [ ] Trend line or bar chart showing Win Rate by year (2022, 2023, 2024, 2025, 2026)
- [ ] Current year vs. prior year comparison highlighted
- [ ] Targets configurable (e.g., target 45%)

---

### Story EP-06-S03
**As an** operations manager,
**I want to** see project pipeline value broken down by GO vs. REVIEW vs. NO GO category
**so that** I understand the monetary scale of opportunities being pursued vs. filtered out.

**Acceptance Criteria:**
- [ ] Pipeline Value for GO projects (sum of Estimated Values where Decision = GO)
- [ ] Pipeline Value for REVIEW projects
- [ ] Pipeline Value for NO GO projects (represents avoided risk exposure)
- [ ] Values shown in both SAR and millions SAR for readability

---

---

# EP-07 — System Administration & Governance

**Goal:** Ensure the scoring model, decision thresholds, and data are protected from unintentional changes while remaining configurable by authorized users.

**Acceptance Criteria for Epic:**
- Scoring logic is protected but configurable by admin
- Data entry sheets are protected against structural changes
- A clear data entry guide is embedded in the tool

---

### Story EP-07-S01
**As a** system administrator,
**I want** the scoring thresholds and decision logic to be protected by a password
**so that** bid managers cannot intentionally or accidentally change the rules to game recommendations.

**Acceptance Criteria:**
- [ ] Decision Logic sheet (or cells) are password-protected
- [ ] Score threshold values (60, 75, 90) are stored in a configuration area accessible only to admins
- [ ] Attempting to edit protected cells shows a clear error message

---

### Story EP-07-S02
**As a** system administrator,
**I want to** update the scoring weights or threshold values for a new business period
**so that** the tool reflects updated risk appetite or market conditions without rebuilding from scratch.

**Acceptance Criteria:**
- [ ] A Configuration tab (admin-only, password protected) holds all threshold values
- [ ] Changes to threshold values automatically propagate to all decision logic and dashboards
- [ ] A change log records who changed what and when

---

### Story EP-07-S03
**As a** bid manager,
**I want** the Input sheet to validate my entries and warn me if I enter invalid data
**so that** I don't accidentally corrupt the scoring or dashboard outputs.

**Acceptance Criteria:**
- [ ] Score cells reject values outside 0–5 with a clear error message
- [ ] Date fields validate format (DD/MM/YYYY)
- [ ] Dropdown fields enforce selection from a predefined list (no free text for categorical fields)
- [ ] Required fields are highlighted if left blank

---

### Story EP-07-S04
**As a** new user,
**I want** an in-tool guide explaining each scoring criterion and what the scores mean
**so that** I can score accurately without needing external training material.

**Acceptance Criteria:**
- [ ] Each criterion has a hover tooltip or adjacent comment explaining the 0–5 scale
- [ ] A "How to Use" tab or header section provides a one-page summary of the system
- [ ] An example scored project (fully populated row) is included and locked as a reference

---

---

## Story Status Tracker

| Story ID | Epic | Title | Status | Priority |
|---|---|---|---|---|
| EP-01-S01 | Scoring Engine | Project profile data entry | Done | Must Have |
| EP-01-S02 | Scoring Engine | Competitive Position scoring | Done | Must Have |
| EP-01-S03 | Scoring Engine | Company Load Factor scoring | Done | Must Have |
| EP-01-S04 | Scoring Engine | Contractual Risk scoring | Done | Must Have |
| EP-01-S05 | Scoring Engine | Technical Risk scoring | Done | Must Have |
| EP-01-S06 | Scoring Engine | Commercial & Financial Risk scoring | Done | Must Have |
| EP-01-S07 | Scoring Engine | Auto-calculate Total Score, Risk, Decision | Done | Must Have |
| EP-01-S08 | Scoring Engine | Record bid outcome and remarks | Done | Must Have |
| EP-02-S01 | Win Predictor | Score vs. historical win average | Done | Must Have |
| EP-02-S02 | Win Predictor | Score vs. historical loss average | Done | Must Have |
| EP-02-S03 | Win Predictor | Plain-language guidance text | Done | Should Have |
| EP-03-S01 | Ops Dashboard | KPI summary bar | Done | Must Have |
| EP-03-S02 | Ops Dashboard | Decision breakdown pie chart | Done | Must Have |
| EP-03-S03 | Ops Dashboard | Win % by client type | Done | Should Have |
| EP-03-S04 | Ops Dashboard | Risk assessment distribution + gauge | Done | Must Have |
| EP-03-S05 | Ops Dashboard | Monthly Won/Lost/Pending chart | Done | Must Have |
| EP-03-S06 | Ops Dashboard | Six interactive slicers | Done | Must Have |
| EP-03-S07 | Ops Dashboard | Win % by location | Done | Should Have |
| EP-04-S01 | CEO Dashboard | Executive KPI summary | Done | Must Have |
| EP-04-S02 | CEO Dashboard | Per-project table with Actual Spend | Done | Must Have |
| EP-04-S03 | CEO Dashboard | Contract vs. Estimated value chart | Done | Must Have |
| EP-04-S04 | CEO Dashboard | Running Month slicer | Done | Should Have |
| EP-05-S01 | History | Auto-create History record | Done | Must Have |
| EP-05-S02 | History | Gross Margin % and Competitor fields | Partial | Should Have |
| EP-05-S03 | History | Lock completed records | Backlog | Should Have |
| EP-06-S01 | Analytics | Core performance metrics | Done | Must Have |
| EP-06-S02 | Analytics | Win rate trend over time | Backlog | Should Have |
| EP-06-S03 | Analytics | Pipeline value by decision category | Done | Must Have |
| EP-07-S01 | Admin | Threshold protection | Backlog | Should Have |
| EP-07-S02 | Admin | Configurable thresholds | Backlog | Nice to Have |
| EP-07-S03 | Admin | Input validation | Partial | Must Have |
| EP-07-S04 | Admin | In-tool scoring guide | Backlog | Should Have |

---

*Document Owner: M Adeel QS | 0550634001*
*Next Sprint Planning: Q3 2026*

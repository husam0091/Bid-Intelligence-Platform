# Product Requirements Document (PRD)
## Black Go/No-Go Decision Support System
**Version:** 2.0
**Author:** M Adeel QS
**Status:** Active
**Last Updated:** May 2026

---

## 1. Product Overview

### 1.1 Product Name
**Black Go/No-Go System with Win Predictor**

### 1.2 Product Description
The Black Go/No-Go System is a structured bid decision support platform for construction and contracting companies operating in Saudi Arabia. It enables bid managers, operations leaders, and executives to evaluate tender opportunities against a standardized 27-criterion scoring model, producing a defensible GO / REVIEW / NO GO recommendation with an associated win probability for every project.

The system consists of a data entry engine, an automated decision logic layer, predictive analytics, and role-specific dashboards for operational teams and the CEO.

### 1.3 Problem Statement
Construction companies routinely waste significant resources bidding on projects they are unlikely to win or that carry unacceptable risk. Without a structured framework:
- Bid decisions are inconsistent and personality-driven
- High-risk contractual terms go undetected until execution
- Company capacity (teams, equipment, cash) is over-committed
- There is no institutional learning from past wins and losses
- CEOs lack real-time visibility into bid pipeline health

### 1.4 Product Goals
1. Standardize bid evaluation across all project types and decision-makers
2. Reduce wasted bid preparation cost by filtering out NO GO opportunities early
3. Protect the company from high contractual and financial risk exposure
4. Increase the win rate by concentrating effort on high-probability bids
5. Give CEO-level leadership a live, consolidated view of pipeline health
6. Build a proprietary historical database that improves prediction accuracy over time

---

## 2. Target Users & Personas

### Persona 1 — Bid Manager / Quantity Surveyor
**Name:** Ahmed (QS / Estimator)
**Role:** Evaluates tenders, prepares bid scores, manages bid submissions
**Goals:**
- Quickly assess whether a new tender is worth pursuing
- Score all criteria consistently and transparently
- Get a defensible recommendation to present to management
- Track which bids are pending, won, or lost

**Pain Points:**
- Manual, intuition-based decisions challenged by senior management
- No standard way to say "no" to bad opportunities
- Wastes days on bids that were never winnable

---

### Persona 2 — Operations Manager
**Name:** Khalid (Operations / Commercial Director)
**Role:** Oversees the bid pipeline, allocates resources, reviews REVIEW-band decisions
**Goals:**
- See the full bid pipeline at a glance
- Understand risk exposure across all active bids
- Ensure team and equipment capacity is not over-committed
- Review borderline (REVIEW) decisions before CEO escalation

**Pain Points:**
- No single source of truth for pipeline status
- Discovers capacity conflicts late, after bid submission
- Cannot compare historical win patterns by location or client type

---

### Persona 3 — CEO / Executive
**Name:** Eng. Faisal (CEO)
**Role:** Final decision authority on strategic bids; monitors company performance
**Goals:**
- See total pipeline value, win rate, and active project count at a glance
- Understand the financial gap between estimated and contract values
- Track actual spend vs. contract value on live projects
- Make go/no-go overrides on strategic opportunities

**Pain Points:**
- Receives bid recommendations without context or data
- Cannot monitor actual project financial performance vs. bid assumptions
- No visibility into bid ROI (which opportunities generate the most value)

---

### Persona 4 — System Administrator
**Name:** Internal IT / QS Lead
**Role:** Maintains scoring criteria, thresholds, and user access
**Goals:**
- Update scoring weights as business conditions change
- Manage the historical dataset
- Ensure data integrity across entries

---

## 3. Scope

### 3.1 In Scope (Version 2.0)
- Project data entry and 27-criteria scoring across 6 risk domains
- Automated decision logic: GO / REVIEW / NO GO
- Hard Stop override based on independent Commercial & Financial Risk assessment
- Expected win probability calculation (9%, 18%, 38%, 51%, 60%, 75%)
- Win Predictor: comparison of current score vs. historical win/loss averages
- Operational Dashboard (bid manager / operations view)
- CEO Dashboard with contract vs. estimated value tracking
- CEO Input sheet with actual spend field
- History log with bid date, outcome, gross margin, and competitor fields
- Analytics sheet with key performance metrics
- Month, location, project type, client type, risk index, and tender type slicers

### 3.2 Out of Scope (Version 2.0 — Future Roadmap)
- Web or mobile application front end
- Integration with ERP or accounting systems
- Automated email notifications or approval workflows
- AI/ML model replacing the rule-based scoring engine
- Multi-company or multi-country configuration
- Document attachment (bid drawings, contracts)

---

## 4. Functional Requirements

### 4.1 Bid Scoring Engine

| ID | Requirement |
|---|---|
| FR-01 | System shall allow entry of project profile data: name, location, type, estimated value, size, duration, tender type, submission date |
| FR-02 | System shall provide a 0–5 score input for each of the 27 evaluation criteria |
| FR-03 | System shall group criteria into 6 categories: Competitive Position, Company Load Factor, Contractual Risk, Technical Risk, Commercial & Financial Risk, Project Profile |
| FR-04 | System shall calculate a Total Score as the sum of all 27 criteria scores (max 135) |
| FR-05 | System shall calculate a Risk Index (LOW / MEDIUM / HIGH) based on the Commercial & Financial Risk sub-score |
| FR-06 | System shall apply Decision Logic to output GO / REVIEW / NO GO based on Total Score and Risk Index |
| FR-07 | System shall apply a Hard Stop override: if Commercial & Financial Risk = HIGH, output NO GO regardless of Total Score |
| FR-08 | System shall calculate and display an Expected Win % based on the Decision Logic output |

### 4.2 Win Predictor

| ID | Requirement |
|---|---|
| FR-09 | System shall display the current project's Total Score |
| FR-10 | System shall calculate and display the historical average Total Score of Won projects |
| FR-11 | System shall calculate and display the historical average Total Score of Lost projects |
| FR-12 | System shall generate a Prediction statement (e.g., "Likely Win", "Likely Loss", "Borderline") based on comparison of current score to historical averages |
| FR-13 | System shall display Guidance text recommending action based on the prediction |

### 4.3 Dashboard — Operations

| ID | Requirement |
|---|---|
| FR-14 | Dashboard shall display: Total Projects, Average Win %, Go Projects count, Review Projects count, High Risk count |
| FR-15 | Dashboard shall display a Decision Breakdown chart (GO / NO GO / REVIEW %) |
| FR-16 | Dashboard shall display Win Probability by Client Type (Government, Private, Semi) |
| FR-17 | Dashboard shall display Risk Assessment distribution (HIGH / MEDIUM / LOW %) |
| FR-18 | Dashboard shall display Project Type distribution (Building / Infrastructure / Industrial) |
| FR-19 | Dashboard shall display Pipeline Status chart (Won / Lost / Pending / Rejected counts) |
| FR-20 | Dashboard shall display a monthly Won/Lost/Pending/Rejected bar chart |
| FR-21 | Dashboard shall display Win Probability by Location (city-level breakdown) |
| FR-22 | Dashboard shall include interactive slicers: Month, Location, Project Type, Client Category, Tender Type, Risk Index |
| FR-23 | Dashboard shall display a Risk Gauge Meter with a needle pointer indicating overall portfolio risk score |

### 4.4 Dashboard — CEO

| ID | Requirement |
|---|---|
| FR-24 | CEO Dashboard shall display: Total Bids, Won Bids, Win Rate, Total Pipeline Value, Active Projects Pipeline Value |
| FR-25 | CEO Input sheet shall show for each project: Score, Risk Index, Decision, Win %, Outcome, Running Month, Location, Contract Value, Estimated Value, Actual Spend |
| FR-26 | CEO view shall display a contract value vs. estimated value column chart by month |
| FR-27 | CEO view shall display a running month slicer for pipeline drill-down |

### 4.5 History & Audit Trail

| ID | Requirement |
|---|---|
| FR-28 | History sheet shall log: Sr. No, Bid Date, Project Name, Client, Consultant, Sector, Estimated Value, Contract Value, Total Score, Result (Won/Lost/Rejected/Pending), Gross Margin %, Main Competitor |
| FR-29 | Every project entered in the Input sheet shall have a corresponding record in History |
| FR-30 | History records shall be immutable once an outcome is recorded (read-only for past entries) |

### 4.6 Analytics

| ID | Requirement |
|---|---|
| FR-31 | Analytics sheet shall display: Total Bids, Total Wins, Win Rate, Average Score of Wins, Average Score of Losses |
| FR-32 | Analytics data shall update automatically as new bids are entered and outcomes recorded |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | **Performance:** All dashboard calculations shall refresh within 3 seconds of a data change on any modern PC |
| NFR-02 | **Usability:** A new user should be able to score and evaluate a project in under 15 minutes with no training beyond a single walkthrough |
| NFR-03 | **Data Integrity:** Input validation shall prevent scores outside the 0–5 range from being entered |
| NFR-04 | **Auditability:** All bid records shall include a timestamp of entry |
| NFR-05 | **Accessibility:** The system shall be fully operable in Microsoft Excel 2016 and above |
| NFR-06 | **Scalability:** The system shall support up to 500 project records without performance degradation |
| NFR-07 | **Security:** The scoring logic and decision thresholds shall be protected from unintentional modification via sheet protection |

---

## 6. Scoring Model Reference

### 6.1 Criteria Domains

| Domain | Criteria Count | Max Score |
|---|---|---|
| Competitive Position | 10 | 50 |
| Company Load Factor | 5 | 25 |
| Contractual Risk | 4 | 20 |
| Technical Risk | 3 | 15 |
| Commercial & Financial Risk | 5 | 25 |
| **Total** | **27** | **135** |

### 6.2 Decision Thresholds

| Total Score | Risk Index | Decision | Expected Win % |
|---|---|---|---|
| 90–135 | LOW | GO | 75% |
| 75–89 | LOW-MEDIUM | GO | 60–75% |
| 75–89 | MEDIUM | GO | 51% |
| 60–74 | MEDIUM | REVIEW | 38% |
| 50–59 | HIGH | NO GO | 18% |
| < 50 | HIGH | NO GO | 9% |
| Any | HIGH (Hard Stop) | NO GO | — |

---

## 7. Success Metrics (KPIs)

| KPI | Target |
|---|---|
| Bid win rate | ≥ 45% |
| NO GO rejection rate | 25–35% of evaluated bids |
| Average score of won projects | ≥ 85 |
| Bid preparation cost saved (rejected bids) | Tracked and reported quarterly |
| CEO dashboard adoption | Used for every board/management review |
| Historical dataset completeness | 100% of bids logged with outcomes |
| Gross margin capture | 100% of won projects GM% recorded within 30 days of award |

---

## 8. Assumptions & Constraints

**Assumptions:**
- Users have basic Excel proficiency
- Projects are primarily in Saudi Arabia (KSA-specific scoring weights)
- All bids are denominated in SAR
- The scoring model reflects the company's current risk appetite and market position

**Constraints:**
- Version 2.0 is an Excel-based tool; no backend database or web server is involved
- Scoring weights are fixed for V2.0; recalibration requires admin access
- The Win Predictor requires a minimum of 10 historical completed outcomes to produce reliable predictions

---

## 9. Future Roadmap (V3.0+)

| Feature | Priority | Notes |
|---|---|---|
| Web/mobile front end | High | Increase accessibility for field staff |
| ERP integration | High | Auto-populate contract values from accounting system |
| ML-based win prediction | Medium | Replace rule-based thresholds with trained model |
| Approval workflow | Medium | Email-based CEO approval for REVIEW-band bids |
| Gross margin analytics | Medium | Link bid assumptions to actual project financial close-out |
| Multi-company support | Low | For groups or JV scenarios |
| Competitor intelligence module | Low | Track competitor win rates by project type and location |

---

*PRD Owner: M Adeel QS | 0550634001*
*Next Review: Q3 2026*

# AIIMS — Scope Boundary and External Topics Isolation Register

**Document Version:** 1.0.0  
**Effective Date:** 18 October 2026  
**Status:** Active Architectural & Governance Policy  
**Scope:** AIIMS Core Edtech Product, Codebase, and Backlog  

---

## 1. Scope Isolation Mandate

This document establishes a formal boundary isolating the **AIIMS Core Product** (AI Intelligence & Mentoring System — diagnostic assessment, AI tool wallet, clarity prompt lab, radar intelligence, and mentoring) from external funding applications, expired program submissions, incubator evaluations, financial projections, patent drafts, and auxiliary spin-off products.

### Governing Rules:
1. **Zero Codebase Contamination:** None of the out-of-scope topics listed herein may be committed, integrated, imported, or tracked in the AIIMS software repository, Jira/task backlog, or client-facing releases.
2. **Dedicated Separate Documentation:** Each external topic, if pursued by the owner, must exist in its own dedicated, standalone document outside the AIIMS product repository.
3. **No Unsourced Claims in AIIMS Materials:** Unsourced success rates, unverified program terms, and theoretical financial projections must never be copied into AIIMS product copy, marketing pages, investor decks, or grant materials.
4. **Fact Verification Requirement:** If the product owner requests research on any grant, credit, or incubator program in the future, program eligibility, guidelines, and deadlines must be verified directly from official primary sources, with all assumptions explicitly documented.

---

## 2. Inventory of Out-of-Scope Topics & Isolation Rationale

```
+-----------------------------------------------------------------------------------+
|                           AIIMS CORE PRODUCT REPOSITORY                           |
|  - Baseline Assessment & Diagnostics     - AI Tool Wallet & Catalog Engine        |
|  - Clarity Prompt Lab & Rubric Scoring   - AI Radar Intelligence & Signals        |
|  - Student & Entrepreneur Role Views     - Mentor Guidance & Reflection Journal   |
+-----------------------------------------------------------------------------------+
                                         │
                   ⛔ HARD ISOLATION BOUNDARY (DO NOT CROSS) ⛔
                                         │
     ┌───────────────────────┬───────────┴───────────┬───────────────────────┐
     ▼                       ▼                       ▼                       ▼
[Expired Funding]     [Incubator Search]     [Patents & Theory]      [Separate Products]
- SISFS Application   - IIMV FIELD, ā-hub    - RDT Patent Drafts     - Medical ALBE
- UNICEF Venture Fund - AIC-SKU, T-Hub       - ALBE Cognitive Logic  - Climate Module
- Google Immersion    - Unsourced Win Rates  - ₹20L Grant Budget     - Cloud Credits
```

---

### Category A: Grant & Accelerator Programs (Expired Deadlines as of 18 October 2026)

| Topic / Program | Status as of 18 Oct 2026 | Verified Facts & Audit Findings | Isolation Action & Requirement |
| :--- | :--- | :--- | :--- |
| **SISFS Seed Fund (Startup India)** | **DEADLINE PASSED** | - Deadlines previously discussed have passed.<br>- Program terms, incubator tie-in criteria, and DPIIT startup eligibility were unverified.<br>- Seed fund application requires formal entity incorporation (Pvt Ltd) and specific incubator recommendation. | **STRICTLY EXCLUDED.** Must not appear in AIIMS sprint backlog. If reapplied in a future cycle, prepare a standalone application dossier outside this repo with verified DPIIT guidelines. |
| **UNICEF Venture Fund Call** | **DEADLINE PASSED** | - Call deadline has elapsed.<br>- Mandates open-source frontier technology (GPL/MIT/Apache) with measurable metrics on children/youth welfare under UNICEF country priorities.<br>- Conflict: AIIMS is currently exploring closed proprietary IP and enterprise training. | **STRICTLY EXCLUDED.** Any future UNICEF engagement requires a dedicated public-good open-source repository and separate legal evaluation. |
| **Google for Startups Immersion** | **DEADLINE PASSED** | - Cohort application deadline has passed.<br>- Program criteria (equity-free mentorship, AI studio access) require working traction metrics and regional cohort alignment. | **STRICTLY EXCLUDED.** Track via corporate relations, not product codebase. |

---

### Category B: Cloud Credits & Startup Perks

| Topic / Program | Audit Finding | Isolation Policy |
| :--- | :--- | :--- |
| **Microsoft Founders Hub** | Requires corporate entity, verified domain, and LinkedIn verification. Provides tiered Azure / OpenAI credits. | **Non-Engineering Topic.** Corporate administrative perk; must not be embedded in product code or roadmap. Applied through business console. |
| **AWS Activate** | Requires incubation/VC affiliation or self-funded tier. Provides AWS promotional credits. | **Non-Engineering Topic.** Managed at AWS Organization root billing level, not inside application logic. |
| **Google Cloud for Startups** | Tiered credits for Vertex AI and GCP infrastructure. | **Non-Engineering Topic.** Managed strictly via GCP Billing Console. |

---

### Category C: Incubator Selection & Unsourced Claims

| Topic / Item | Audit Finding | Isolation Policy |
| :--- | :--- | :--- |
| **Incubator Evaluations**<br>(IIMV FIELD, ā-hub, AIC-SKU, T-Hub, etc.) | - Incubator selection criteria, physical residency requirements, equity dilution terms, and application cycles were not verified.<br>- Incubator onboarding is an institutional corporate decision. | **STRICTLY ISOLATED.** Maintain incubator evaluation matrices and pitch decks in dedicated business administration repositories. Do not mix into AIIMS engineering tasks. |
| **Grant Success-Rate Claims** | - Prior discussions contained arbitrary percentage claims regarding grant win rates and selection probability.<br>- **Audit Finding:** These figures were completely unsourced and unverifiable. | **FORBIDDEN IN PRODUCT MATERIALS.** Zero tolerance for unsubstantiated claims. Do not state or imply grant win probabilities in investor pitches, marketing materials, or grant proposals without citing official government gazettes or audited incubator reports. |

---

### Category D: Financial Projections & Budget Models

| Topic / Item | Audit Finding | Isolation Policy |
| :--- | :--- | :--- |
| **₹20 Lakh Grant Budget Model** | Theoretical budget allocation (personnel, servers, marketing) for seed grant applications. | **STRICTLY ISOLATED.** Financial spreadsheets and budget allocations belong in executive/investor folders. No financial projection formulas may be embedded in AIIMS application services. |
| **Revenue Projections & CAC/LTV Models** | Speculative 3-year revenue forecasts. | **STRICTLY ISOLATED.** Not a product requirement. Codebase must contain only functional credit billing logic (e.g. `CREDIT_RULES`), not macroeconomic business forecasts. |

---

### Category E: Intellectual Property, Patents, and Cognitive Formulas

| Topic / Item | Audit Finding | Isolation Policy |
| :--- | :--- | :--- |
| **Patent Drafts (RDT, ALBE, Cognitive Formulas)** | - Conceptual patent claims relating to Representation Dynamic Theory (RDT), Adaptive Learning Behavioral Engine (ALBE), and mathematical cognitive formulas.<br>- **CRITICAL IP RISK:** Committing patent drafts or proprietary cognitive formulas into a shared git repository or frontend bundle creates **prior art public disclosure**, potentially invalidating international patentability (novelty requirement under Indian Patent Act 1970 and USPTO 35 U.S.C. § 102). | **ABSOLUTE BAN FROM REPOSITORY.** All patent drafting, claims construction, and mathematical proofs must reside exclusively in secure, confidential attorney-client workstreams. No provisional patent text may be stored in public or team-shared web code. |

---

### Category F: Separate Spin-off Products

| Product Concept | Target Domain & Divergence from AIIMS | Isolation Action |
| :--- | :--- | :--- |
| **Medical ALBE Product** | Healthcare / clinical decision support or medical training system.<br>- Involves patient health data, clinical diagnostics, and stringent regulatory oversight (CDSCO in India, HIPAA/FDA internationally).<br>- Totally divergent from AIIMS general higher-education engineering focus. | **SEPARATE REPOSITORY & ENTITY.** Must not share backend schemas, user databases, or API infrastructure with AIIMS. |
| **Climate Module** | Sustainability, carbon footprint calculation, and ESG monitoring system.<br>- Requires environmental data schemas, carbon accounting formulas, and enterprise compliance taxonomies. | **SEPARATE PRODUCT BACKLOG.** Keep as an independent concept document. Do not pollute AIIMS tool catalog or diagnostic radar with climate-specific models unless formally integrated. |

---

## 3. Codebase Verification & Purity Audit

A comprehensive search of the AIIMS repository was performed on 18 October 2026:
- **Files Searched:** All TypeScript (`.ts`, `.tsx`), JavaScript (`.js`), JSON (`.json`), and Markdown (`.md`) files across `Backend/` and `Frontend/`.
- **Search Patterns:** Checked for occurrences of `SISFS`, `UNICEF`, `Founders Hub`, `AWS Activate`, `IIMV`, `ā-hub`, `AIC-SKU`, `T-Hub`, `ALBE`, `RDT`, `climate module`, `20 lakh`, and `grant budget`.
- **Audit Result:** **100% CLEAN.**
  - No out-of-scope grant applications, unverified pitch statistics, or financial projection models are committed to active product services or client screens.
  - The AIIMS codebase remains strictly focused on core educational features: diagnostic assessment, credit-governed tool wallet, clarity prompt engineering lab, radar intelligence, and mentoring guidance.

---

## 4. Operational Protocol for Future Funding & Research Requests

If the product owner requests research or drafting assistance for future grant rounds, startup credits, or incubator applications:

1. **Protocol 1: Create a Standalone Document Outside Codebase**  
   Save all notes in a separate, isolated workspace directory or dedicated document (e.g., `funding/` or `incubators/`), completely decoupled from the production app.
2. **Protocol 2: Verify Every Detail Against Primary Sources**  
   Do not rely on memory or stale discussions. Verify:
   - Official portal URL and active notification number.
   - Current application window and confirmed deadline.
   - Exact eligibility criteria (entity type, incorporation date, DPIIT recognition, sector scope).
   - Funding instrument (grant-in-aid, convertible debt, equity, reimbursement).
3. **Protocol 3: Explicitly Label Assumptions & Projections**  
   Every financial figure, headcount estimate, or revenue projection must carry an explicit banner: `[ASSUMPTION / PROJECTION — SUBJECT TO OWNER & ACCOUNTANT REVIEW]`.
4. **Protocol 4: Never Commit Trade Secrets or Unfiled Patent Claims**  
   Ensure all algorithmic details and patent disclosures remain in confidential legal channels.

---
*Maintained under AIIMS Architecture & Product Governance Guidelines.*

# AIIMS — Market AI Tools Catalog Implementation Blueprint

**Document Version:** 1.0.0  
**Date:** November 16, 2026  
**Architect:** Senior Full-Stack Architect & Technical Lead  
**Scope:** Architectural Plan & Phased Roadmap for Market AI Tools Tiered Catalog  
**Target Environment:** Node.js + Express + TypeScript | React 18 + Vite | PostgreSQL + Prisma | Cloudflare R2  
**Related Audit:** [`AIIMS_MARKET_TOOLS_AUDIT.md`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/docs/market-tools/audits/AIIMS_MARKET_TOOLS_AUDIT.md)  

---

## 1. Executive Summary & Mandatory Invariants

This implementation blueprint establishes the engineering roadmap for expanding the AIIMS AI Wallet into a comprehensive, multi-tiered **Market AI Tools Catalog**. The platform will present verified AI tools across the 13 specified domains, grouped into 4 market tiers (**Starter**, **Growth**, **Leading**, and **Enterprise**), alongside explicit handling for **Unrated** tools.

### Mandatory Architectural Constraints
- **Backend Stack:** Node.js, Express, TypeScript (`Backend/`).
- **Frontend Stack:** React 18, Vite, TypeScript, Vanilla CSS design tokens (`Frontend/`).
- **Database:** PostgreSQL + Prisma ORM ONLY. Absolutely **no MongoDB or Mongoose**.
- **Storage:** Cloudflare R2 for any external media assets.
- **Credits System Integrity (Rule 5):** All credit changes must route through `creditsLedgerService` with transactional idempotency, audit logging, and dual-ledger synchronization. Zero balance overwrites via state updates.
- **Additive Database Migrations:** All schema updates must be purely additive (`ADD COLUMN ... NULL`, `CREATE TABLE IF NOT EXISTS`) to prevent data loss on existing production records.
- **Zero Disruptive Refactoring:** Existing AI Wallet matching algorithms, radar signals, clarity tasks, and focus sessions must remain fully operational and backwards-compatible.

---

## 2. Owner Decisions — Do Not Guess

The following 7 strategic decisions must be formally ratified by the project owner prior to finalizing Phase B content work and Phase C billing integrations. Each decision carries direct technical implications:

### Decision 1: Launch Coverage Volume (120+ Tools vs. Phased Slice)
- **Question:** Should AIIMS launch with the full 120+ verified tools (minimum 8 tools across at least 3 tiers per domain), or launch with a targeted first slice (e.g. 40–50 tools across core domains)?
- **Technical Impact:**
  - *Full Coverage (120+ tools):* Requires extensive research, double-verification of 120+ pricing pages, and larger seed payload in [`aiimsCatalog.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/data/aiimsCatalog.ts). Guarantees complete domain coverage on day one.
  - *Phased Slice (40–50 tools):* Enables immediate end-to-end verification of the new tier UI, actions, and comparison engine with minimal seed payload latency, followed by scheduled quarterly additions.

### Decision 2: Market Tier Criteria Ratification
- **Question:** Confirm the four market-size tiers and their qualifying signals:
  - **Tier 1 (Starter):** Small teams, indie/open-source tools, free/low-cost plans, early traction.
  - **Tier 2 (Growth):** Proven SaaS with published traction, dedicated team plans, multiple paid tiers.
  - **Tier 3 (Leading):** Category leaders, established brand, large user base, mainstream press coverage.
  - **Tier 4 (Enterprise):** Major tech vendors, enterprise compliance (SOC2/HIPAA), custom pricing/SLA.
- **Technical Impact:** Dictates the database schema column definition (`marketTier` `Int` 1–4 vs. `String` enum), Zod validation schemas in [`wallet.schema.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/schemas/wallet.schema.ts), and UI badge color mappings in [`Badge.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/components/common/Badge.tsx).

### Decision 3: Unrated Tool Handling
- **Question:** Should tools lacking verified tier evidence be shown to learners (sorted last with an "Unrated" badge) or suppressed from learner views until verified?
- **Technical Impact:**
  - *Show Unrated:* API returns tools with `marketTier: null`; UI sorts them after Tier 4 with a neutral gray badge.
  - *Hide Unrated:* API adds `WHERE marketTier IS NOT NULL` in [`domainTaxonomy.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts), ensuring learners only encounter fully tiered entries.

### Decision 4: Tool Comparison Pricing Policy
- **Question:** Should comparing 2–4 tools remain completely free, or should it consume AIIMS Credits (e.g. 10 AC per comparison)?
- **Technical Impact:**
  - *Free:* `POST /api/wallet/compare` remains an open, unmetered endpoint with standard rate limiting.
  - *Paid (e.g. 10 AC):* Requires adding `creditsLedgerService.chargeWalletOperation` to `compareTools` in [`aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts), returning `402 Payment Required` on low balances.

### Decision 5: Add-to-Wallet Fee Confirmation
- **Question:** Should adding a tool to "My Tools" charge 10 AC (with no refund on removal), or remain free (0 AC)?
- **Technical Impact:** Currently, `addToWallet` in [`aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts#L488) incurs 0 AC. Charging 10 AC requires wrapping the operation in a Prisma transaction with `creditsLedgerService`, handling idempotency keys, and adding client confirmation dialogs.

### Decision 6: Vendor Branding & Logo Assets
- **Question:** Should tool cards display third-party vendor logos, or strictly use category SVG icons and text typography at launch?
- **Technical Impact:**
  - *Logos Permitted:* Requires creating an asset storage pipeline (Cloudflare R2 bucket) for verified SVG/PNG logos, adding `logoUrl` to `AiTool`, and implementing image error fallbacks.
  - *Text-Only / Category Icons:* Uses existing Lucide icons (`lucide-react`) and high-contrast typography, eliminating trademark infringement risks and external image loading overhead.

### Decision 7: Catalog Refresh Cadence
- **Question:** Should the formal verification and price re-validation cycle run quarterly (every 90 days) or monthly (every 30 days)?
- **Technical Impact:** Configures the staleness threshold in the database query (`WHERE lastVerifiedAt < NOW() - INTERVAL '90 days'`) and determines the automated email/Slack alert schedule for admin reviewers.

---

## 3. Phased Implementation Roadmap

The implementation is partitioned into 6 distinct, sequential phases designed to maintain zero downtime and continuous type safety.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PHASED ROADMAP                                   │
├───────────────┬───────────────────────────────────────────────┬─────────────┤
│ Phase A       │ Schema & Taxonomy Alignment                   │ 1.5 Days    │
│ Phase B       │ Market Research & Catalog Data Curation       │ 5–8 Days    │
│ Phase C       │ Backend APIs & Business Logic                 │ 2.5 Days    │
│ Phase D       │ Frontend Catalog Experience & UI Actions      │ 3 Days      │
│ Phase E       │ Admin Verification & Outdated-Report Workflow │ 2 Days      │
│ Phase F       │ Automated Testing & Release Readiness         │ 2 Days      │
└───────────────┴───────────────────────────────────────────────┴─────────────┘
```

---

### Phase A: Schema & Taxonomy Alignment

#### Scope
1. Introduce `marketTier` column (`Int?`, values 1–4, null for Unrated) to `AiTool` in Prisma schema.
2. Add `pricingSourceUrl` (`String?`) and `pricingVerifiedAt` (`DateTime?`) to track explicit pricing page sources.
3. Create `ToolReport` model in Prisma to support learner outdated-information reporting.
4. Align the 13 canonical domain keys and display titles in [`domainTaxonomy.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts) and [`types/index.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/types/index.ts).

#### Files Likely to Change
- [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma)
- New Migration: `Backend/prisma/migrations/0003_market_tools_catalog/migration.sql`
- [`Backend/src/types/index.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/types/index.ts)
- [`Backend/src/services/wallet/domainTaxonomy.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts)

#### Database Impact
- **Table Alteration:** `ALTER TABLE "ai_tools" ADD COLUMN "market_tier" INTEGER, ADD COLUMN "pricing_source_url" TEXT;`
- **New Table:** `CREATE TABLE "tool_reports" ("id" TEXT PRIMARY KEY, "tool_id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "report_type" TEXT NOT NULL, "details" TEXT, "status" TEXT DEFAULT 'PENDING', "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`
- **Indexes:** `CREATE INDEX "ai_tools_market_tier_idx" ON "ai_tools"("market_tier");`

#### Acceptance Criteria
- [ ] `npx prisma migrate dev --name market_tools_catalog` executes cleanly.
- [ ] All existing 22 tables and existing seed records remain intact.
- [ ] TypeScript compilation (`npm run typecheck --prefix Backend`) passes with zero errors.

---

### Phase B: Market Research & Catalog Data Curation

#### Scope
1. Curate verified market AI tools across all 13 canonical domains.
2. Ensure each entry has:
   - Official vendor website domain.
   - Verified market tier (1–4 or Unrated) substantiated by public traction/pricing sources.
   - Explicit Free plan details (Free tier / Free trial / None).
   - Structured paid plan pricing, billing cadence (monthly/annual), and direct pricing source URL.
   - Skill level (`Beginner`, `Intermediate`, `Advanced`).
   - Relevant use cases and target personas.
3. Update [`Backend/src/data/aiimsCatalog.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/data/aiimsCatalog.ts) with curated entries.
4. Update [`Backend/src/scripts/seedToolCatalog.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/scripts/seedToolCatalog.ts) to idempotently upsert `marketTier`, `pricingSourceUrl`, and domain taxonomy.

#### Files Likely to Change
- [`Backend/src/data/aiimsCatalog.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/data/aiimsCatalog.ts)
- [`Backend/src/scripts/seedToolCatalog.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/scripts/seedToolCatalog.ts)

#### Dependencies
- **Owner Decision 1 (Volume)** and **Decision 2 (Tier Criteria)** must be approved.

#### Acceptance Criteria
- [ ] `npm run seed:tools` upserts all catalog tools into PostgreSQL with 0 duplicate errors.
- [ ] Every seeded tool has a reachable `officialWebsite` and valid `lastVerifiedAt` timestamp.
- [ ] Every domain contains tools distributed across multiple tiers.

---

### Phase C: Backend APIs & Business Logic

#### Scope
1. **Tier Sorting & Filtering:** Update `getCatalog` and `getDomainCards` in [`aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts) to return tools ordered by tier (Starter $\rightarrow$ Growth $\rightarrow$ Leading $\rightarrow$ Enterprise $\rightarrow$ Unrated) and allow filtering by `tier`.
2. **Dedicated Remove Endpoint:** Implement `POST /api/wallet/remove` (or `DELETE /api/wallet/tools/:toolId`) in [`aiWallet.routes.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/aiWallet.routes.ts) with server-side audit logging. Enforce "No refund on removal" rule.
3. **Outdated Reporting API:** Implement `POST /api/wallet/tools/:id/report` with rate limiting, validating report reason (`WRONG_PRICE`, `DEAD_LINK`, `WRONG_TIER`, `OTHER`).
4. **Credit Integration (Conditional on Decision 5):** If 10 AC is approved, integrate `creditsLedgerService.chargeWalletOperation` into `addToWallet`.

#### Files Likely to Change
- [`Backend/src/routes/aiWallet.routes.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/aiWallet.routes.ts)
- [`Backend/src/controllers/aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts)
- [`Backend/src/schemas/wallet.schema.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/schemas/wallet.schema.ts)
- [`Backend/src/services/wallet/domainTaxonomy.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts)

#### Acceptance Criteria
- [ ] `GET /api/wallet/domain-cards` returns sorted tools with tier badges and pricing source URLs.
- [ ] `POST /api/wallet/tools/:id/report` persists reports into `tool_reports` table.
- [ ] `POST /api/wallet/remove` removes the tool from `User.aiWalletData.userTools` and returns updated wallet state.
- [ ] Security test suite (`npm run test:security --prefix Backend`) passes with 0 failures.

---

### Phase D: Frontend Catalog Experience & UI Actions

#### Scope
1. **Tier Badges & Filters:**
   - Update [`DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx) to display tier badges:
     - Tier 1: `Starter` (Green/Emerald token)
     - Tier 2: `Growth` (Blue/Indigo token)
     - Tier 3: `Leading` (Purple/Violet token)
     - Tier 4: `Enterprise` (Gold/Amber token)
     - Unrated: `Unrated` (Subtle Slate token)
   - Add Tier Filter pills (`All`, `Starter`, `Growth`, `Leading`, `Enterprise`).
2. **Tool Detail Modal:**
   - Create [`ToolDetailModal.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/ToolDetailModal.tsx) displaying complete description, all paid plans, pricing source link, verified date, limitations, and use cases.
3. **Tool Actions Row:**
   - Add **"Website"** (external link with security rel).
   - Add **"Add to Toolkit"** / **"In Toolkit"** button.
   - Add **"Remove"** button for tools currently in wallet.
   - Add **"Compare"** checkbox or button (selecting 2–4 tools launches comparison view).
   - Add **"Report Outdated"** flag icon opening a lightweight reporting dialog.
4. **Mobile Responsiveness:** Ensure modal sheets, filter pills, and action rows scale gracefully on mobile viewports.

#### Files Likely to Change
- [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx)
- [`Frontend/src/screens/wallet/AIWalletScreen.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/AIWalletScreen.tsx)
- New Component: `Frontend/src/screens/wallet/ToolDetailModal.tsx`
- New Component: `Frontend/src/screens/wallet/ReportOutdatedModal.tsx`
- [`Frontend/src/api/client.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/api/client.ts)
- [`Frontend/src/types/index.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/types/index.ts)

#### Acceptance Criteria
- [ ] Domain cards sort tools by tier automatically.
- [ ] Clicking a tool card opens the comprehensive `ToolDetailModal`.
- [ ] Users can compare 2–4 tools from the domain card view.
- [ ] Learners can submit an outdated information report without page refresh.
- [ ] Frontend build (`npm run build --prefix Frontend`) succeeds with 0 errors.

---

### Phase E: Admin Verification & Outdated-Report Workflow

#### Scope
1. **Admin Review Queue:**
   - Add an "Outdated Tool Reports" queue in the Admin Dashboard ([`AdminDashboardScreen.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/staff/AdminDashboardScreen.tsx)).
   - Display learner reports with tool name, reported issue, source URL, and timestamp.
2. **Admin Actions:**
   - Resolve report / dismiss report.
   - Direct link to update tool pricing, verification date, or tier via `POST /api/admin/verify/:toolId`.
3. **Staleness Dashboard:**
   - Visual counter of tools not verified in >90 days to drive quarterly refreshes.

#### Files Likely to Change
- [`Frontend/src/screens/staff/AdminDashboardScreen.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/staff/AdminDashboardScreen.tsx)
- [`Backend/src/controllers/admin.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/admin.controller.ts)
- [`Backend/src/routes/admin.routes.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/admin.routes.ts)

#### Acceptance Criteria
- [ ] Admin can view pending outdated reports and mark them resolved.
- [ ] Admin can update a tool's tier and pricing verification status from the UI.
- [ ] Route security enforced via `requireAuth` + `requireRole('admin')`.

---

### Phase F: Automated Testing & Release Readiness

#### Scope
1. **Backend Integration Tests:**
   - Verify tier sorting order (Starter $\rightarrow$ Growth $\rightarrow$ Leading $\rightarrow$ Enterprise $\rightarrow$ Unrated).
   - Verify duplicate blocking on `addToWallet`.
   - Verify `removeToolFromWallet` deletes entry without refund.
   - Verify `compareTools` handles 2 to 4 tools and rejects invalid counts (<2 or >5).
   - Verify rate limiting on report submissions.
2. **Frontend Vitest Unit Tests:**
   - Test tier badge rendering and styling.
   - Test domain card accordion expand/collapse.
   - Test compare multi-selection state machine.
3. **Release Audit & Evidence Reconciliation:**
   - Run full verification pipeline (`typecheck`, `lint`, `build`, `test:security`).
   - Run Gitleaks secret scan.

#### Acceptance Criteria
- [ ] All backend test suites pass with 100% success rate.
- [ ] All frontend Vitest tests pass (`202+ tests passed`).
- [ ] Gitleaks confirms 0 leaks found.

---

## 4. Work Stream Independence & Approval Gates

| Work Stream | Dependencies | Can Proceed Independently? |
|---|---|---|
| **Phase A (Schema & Migration)** | None (Strictly additive) | **YES** — Can be executed immediately |
| **Phase B (Data Research & Seed)** | Owner Decisions 1 & 2 | **NO** — Requires approval on Volume & Tier Criteria |
| **Phase C (Backend APIs)** | Phase A | **YES** (Add-to-wallet charge waits on Decision 5) |
| **Phase D (Frontend Catalog UI)** | Phase A & Phase C | **YES** — Can proceed with mock/seed data |
| **Phase E (Admin Queue)** | Phase A & Phase C | **YES** — Can proceed independently |
| **Phase F (Testing & Audit)** | Phases A through E | **YES** — Continuous throughout phases |

---

## 5. Architectural Acceptance Checklist

Before declaring the Market AI Tools Catalog production-ready, the following gates must be satisfied:

- [ ] **Dual-Ledger Credits Compliance:** No direct manipulation of `User.aiimsCredits`; any wallet fee uses `creditsLedgerService`.
- [ ] **Pure PostgreSQL Persistence:** All tool records, evidence items, version histories, and reports reside in PostgreSQL via Prisma.
- [ ] **Idempotent Seeding:** `npm run seed:tools` can be executed repeatedly on existing databases without creating duplicate tools or overwriting custom learner notes.
- [ ] **Deterministic Sourcing:** Every displayed price has an associated verification date and source URL. Missing prices show "Check vendor site".
- [ ] **Zero Hardcoded Secrets:** No API keys, credentials, or `.env` files touched or committed.

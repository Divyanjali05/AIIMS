# AIIMS — Market AI Tools Catalog Audit Report

**Document Version:** 1.0.0  
**Date:** November 16, 2026  
**Auditor:** Senior Full-Stack Architect & Technical Lead  
**Scope:** Existing AI Wallet & Tools Catalog Audit vs. Market AI Tools Tiered Discovery Plan  
**Repository HEAD:** `9cc6886` (`fix: resolve clarity level task progression and focus gating`)  
**Target Environment:** Node.js + Express + TypeScript | React 18 + Vite | PostgreSQL + Prisma | Cloudflare R2  

---

## 1. Executive Summary

An exhaustive technical audit of the AIIMS AI Wallet and AI Tools Catalog was conducted against the reference specification (`AIIMS_Market_Tools_Tiered_Catalog_Plan.docx`). 

### Core Audit Findings
1. **Infrastructure & Plumbing are Sound:** The architectural foundation for an enterprise AI tool catalog already exists in AIIMS. The backend features robust routing, rate limiting, deterministic verification pipelines (`ToolVerificationService`), version histories (`ToolVersionHistory`), evidence tracking (`ToolEvidence`), and requirement-first multi-tool comparison (`ToolComparisonService`).
2. **Missing Market Tier System:** The database schema (`ai_tools` table) and frontend views currently have **no concept of market-size tiers** (Starter, Growth, Leading, Enterprise, Unrated). Tools are categorized only by technical category, skill level, and pricing type.
3. **Domain Taxonomy Discrepancy:** The codebase defines 13 canonical domain cards in [`Backend/src/services/wallet/domainTaxonomy.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts), but their identifiers and display names diverge from the canonical 13 domains outlined in the Product Specification V3 and the reference plan. Furthermore, `TaskCategory` in [`Backend/src/types/index.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/types/index.ts) is restricted to 10 legacy categories.
4. **Catalog Data Volume:** [`Backend/src/data/aiimsCatalog.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/data/aiimsCatalog.ts) contains only 20 seed tools in `SEED_TOOL_CATALOG`. To reach the target coverage of 120–180 verified tools (minimum 8 tools across at least 3 tiers per domain), a substantial content curation and verification effort is required.
5. **Missing User Actions:** While "Add to Toolkit", "View Official Website", and "Confirm Usage" are implemented, the actions "Remove from Wallet", "Compare 2–4 Tools", and "Report Outdated Information" are either only partially implemented on the client without dedicated API endpoints, or missing entirely from the catalog UI.
6. **Credits Invariant:** Adding a tool to the wallet currently incurs **0 AC** (free). The proposed charge of 10 AC per add-to-wallet requires an explicit owner decision and transactional ledger integration.

---

## 2. Requirement Matrix & Gap Analysis

The 19 core functional requirements from the reference document have been inspected directly in the codebase and evaluated:

| # | Requirement | Classification | Primary File Paths & Symbols | Technical Findings & Gap Description |
|---|---|---|---|---|
| **1** | **Thirteen Domain Taxonomy Alignment** | **PARTIALLY IMPLEMENTED** | • [`Backend/src/services/wallet/domainTaxonomy.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L1006-L1281)<br>• [`Backend/src/types/index.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/types/index.ts#L113-L123)<br>• [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx#L45-L71) | 13 domain cards are defined in `CANONICAL_DOMAINS` (`video-editing`, `data-analytics`, `graphic-design`, `reasoning-writing`, `agentic-coding`, `research-rag`, `presentation`, `automation`, `audio-voice`, `business-operations`, `marketing-growth`, `health-medical`, `legal-compliance`). However, `TaskCategory` in `Backend/src/types/index.ts` only has 10 categories, and domain names in `aiimsCatalog.ts` are unstructured strings that do not strictly match spec titles. |
| **2** | **Starter, Growth, Leading, Enterprise Tiers** | **NOT IMPLEMENTED** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L521-L578)<br>• [`Backend/src/types/index.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/types/index.ts#L175-L225)<br>• [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx) | The `AiTool` model has no `marketTier` column. No tier badges, tier sorting, or tier filtering exist in the backend or frontend. |
| **3** | **Unrated Tool Handling** | **NEEDS OWNER DECISION** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L551-L552)<br>• [`Backend/src/services/wallet/toolVerification.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolVerification.service.ts#L58-L80) | Tools without tier evidence currently have no explicit `UNRATED` state. Owner must decide whether to display them last with an "Unrated" badge or suppress them completely from the learner view. |
| **4** | **Official Vendor Website** | **IMPLEMENTED** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L527-L528)<br>• [`Backend/src/services/wallet/toolVerification.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolVerification.service.ts#L28-L31)<br>• [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx#L511-L526) | `officialWebsite` and `websiteUrl` are required fields in PostgreSQL `ai_tools` table. URL sanitization enforces valid HTTP/HTTPS vendor domains. Rendered cleanly with external link icon. |
| **5** | **Free-Plan Information** | **IMPLEMENTED** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L545)<br>• [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx#L458-L462) | `pricingDetails` JSON stores `freeTierAvailable`, `freeTrialAvailable`, and `freeTierLimitations`. Frontend displays "Free Tier" badge and supports filtering by Free vs. Paid. |
| **6** | **Paid-Plan Pricing & Billing Periods** | **PARTIALLY IMPLEMENTED** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L545-L546)<br>• [`Backend/src/types/index.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/types/index.ts#L130-L145) | `pricingDetails` JSON stores `startingPriceMonthlyUsd` and a string `summary`. However, multi-plan pricing structures (e.g. Pro, Team, Enterprise plans with monthly vs. annual billing) are stored as unstructured text rather than normalized, queryable schemas. |
| **7** | **Pricing Source URLs** | **PARTIALLY IMPLEMENTED** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L554)<br>• [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L586)<br>• [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx) | `sourceUrls` exists on `AiTool` and `sourceUrl` exists on `ToolEvidence`. However, `pricingDetails` does not carry an explicit `pricingSourceUrl`, nor is a pricing source link displayed to learners. |
| **8** | **Last Verification Date** | **IMPLEMENTED** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L549)<br>• [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx#L486-L496) | `lastVerifiedAt` timestamp is recorded in PostgreSQL and rendered on tool cards (`Verified: YYYY-MM-DD`). |
| **9** | **Skill Levels** | **IMPLEMENTED** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L560)<br>• [`Backend/src/services/wallet/domainTaxonomy.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L1338) | `skillLevel` (`Beginner`, `Intermediate`, `Advanced`) is stored on `AiTool` and mapped into domain card tool items. |
| **10** | **Use Cases** | **IMPLEMENTED** | • [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L534)<br>• [`Backend/src/services/wallet/toolComparison.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolComparison.service.ts#L36) | `useCases` string array is modeled on `AiTool` and populated in seed data. Utilized by comparison engine for suitability analysis. |
| **11** | **Verification Workflow** | **PARTIALLY IMPLEMENTED** | • [`Backend/src/services/wallet/toolVerification.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolVerification.service.ts)<br>• [`Backend/src/routes/aiWallet.routes.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/aiWallet.routes.ts#L116) | `ToolVerificationService` provides automated rule evaluation. `POST /api/admin/verify/:toolId` exists for administrators. However, a structured review interface for human reviewers to inspect source evidence, verify pricing, and assign market tiers is not exposed in the Admin dashboard. |
| **12** | **Tool Details** | **PARTIALLY IMPLEMENTED** | • [`Backend/src/controllers/aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts#L149-L158)<br>• [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx) | Backend endpoint `GET /api/wallet/tools/:id` returns full tool record. But in `DomainCardsSection.tsx`, tools are only shown in abbreviated card format without a dedicated modal or route to inspect complete plans, limitations, evidence, and version history. |
| **13** | **Add to Wallet** | **IMPLEMENTED (Action)**<br>**NEEDS OWNER DECISION (Fee)** | • [`Backend/src/controllers/aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts#L488-L561)<br>• [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx#L549-L570) | `POST /api/wallet/add` persists tools into `User.aiWalletData.userTools` and prevents duplicates. However, it is currently free (0 AC). If the owner confirms a 10 AC charge, it must be integrated with `creditsLedgerService`. |
| **14** | **Remove from Wallet** | **PARTIALLY IMPLEMENTED** | • [`Frontend/src/context/LearnerContext.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/context/LearnerContext.tsx#L2195-L2203)<br>• [`Backend/src/controllers/aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts) | Frontend supports local removal via `removeToolFromWallet` and syncs via general state PUT. There is no dedicated `POST /api/wallet/remove` or `DELETE /api/wallet/tools/:id` endpoint on the backend, and tool cards inside domain lists have no remove action. |
| **15** | **Compare 2–4 Tools** | **PARTIALLY IMPLEMENTED** | • [`Backend/src/controllers/aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts#L167-L185)<br>• [`Backend/src/services/wallet/toolComparison.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolComparison.service.ts#L10-L54)<br>• [`Backend/src/schemas/wallet.schema.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/schemas/wallet.schema.ts#L23-L28)<br>• [`Frontend/src/screens/wallet/AIWalletScreen.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/AIWalletScreen.tsx) | Backend comparison engine and validation schema strictly support 2 to 5 tools (`.min(2).max(5)`). A dedicated comparison tab exists in `AIWalletScreen.tsx`. However, `DomainCardsSection.tsx` does not have a direct "Select to Compare" action on tool cards. Owner decision needed on whether compare remains free. |
| **16** | **Open Official Website** | **IMPLEMENTED** | • [`Frontend/src/screens/wallet/DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx#L511-L526) | Verified URL opens in new tab with standard `noopener noreferrer` security attributes. |
| **17** | **Report Outdated Information** | **NOT IMPLEMENTED** | • N/A (Missing in Backend & Frontend) | No "Report Outdated" action button, no feedback submission endpoint (`POST /api/wallet/tools/:id/report`), and no database schema to capture community reports. |
| **18** | **Admin Review Workflow** | **PARTIALLY IMPLEMENTED** | • [`Backend/src/routes/aiWallet.routes.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/aiWallet.routes.ts#L102-L118)<br>• [`Backend/src/controllers/aiWallet.controller.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts#L746-L817) | Backend routes for candidate retrieval and verification exist (`/api/admin/candidates`, `/api/admin/verify/:toolId`). However, there is no UI component in the Admin Panel to review reported inaccuracies or approve candidate tools. |
| **19** | **Quarterly Refresh Support** | **PARTIALLY IMPLEMENTED** | • [`Backend/src/services/wallet/toolDiscovery.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolDiscovery.service.ts#L59-L68)<br>• [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L607-L630) | Periodic 24-hour discovery background worker exists. `ToolVersionHistory` logs changes. However, there is no automated staleness detection (>90 days without verification) or quarterly batch review scheduler. |

---

## 3. Database & Schema Inspection

### PostgreSQL `ai_tools` Table Structure
Inspected directly from [`Backend/prisma/schema.prisma`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L521-L578) and migration [`0001_init/migration.sql`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/migrations/0001_init/migration.sql#L386-L436):

```prisma
model AiTool {
  id                  String   @id // Stable slug ID, e.g. tool-chatgpt
  name                String
  provider            String
  description         String
  shortDescription    String?  @map("short_description")
  officialWebsite     String   @map("official_website")
  websiteUrl          String?  @map("website_url")
  category            String
  categories          String[] @default([])
  domains             String[] @default([])
  subdomains          String[] @default([])
  capabilities        String[] @default([])
  useCases            String[] @default([]) @map("use_cases")
  tasks               String[] @default([])
  targetUsers         String[] @default([]) @map("target_users")
  inputTypes          String[] @default([]) @map("input_types")
  outputTypes         String[] @default([]) @map("output_types")
  supportedPlatforms  String[] @default([]) @map("supported_platforms")
  supportedLanguages  String[] @default([]) @map("supported_languages")
  strengths           String[] @default([])
  limitations         String[] @default([])
  modelInformation    String?  @map("model_information")
  versionInformation  String?  @map("version_information")
  pricingDetails      Json     @map("pricing_details")
  pricing             String?
  learningTrack       Json     @default("[]") @map("learning_track")
  firstSeenAt         String   @map("first_seen_at")
  lastVerifiedAt      String   @map("last_verified_at")
  lastUpdatedAt       String   @map("last_updated_at")
  status              String   @default("ACTIVE")
  verificationStatus  String   @default("VERIFIED") @map("verification_status")
  evidenceCoverage    Float    @default(0) @map("evidence_coverage")
  sourceUrls          String[] @default([]) @map("source_urls")
  tags                String[] @default([])
  iconName            String?  @map("icon_name")
  activeStatus        Boolean  @default(true) @map("active_status")
  taskMappings        String[] @default([]) @map("task_mappings")
  relevantRoles       String[] @default([]) @map("relevant_roles")
  skillLevel          String?  @map("skill_level")
  relatedTools        String[] @default([]) @map("related_tools")
  alternatives        String[] @default([])
  radarTopics         String[] @default([]) @map("radar_topics")
  clarityTopics       String[] @default([]) @map("clarity_topics")
  focusTracks         String[] @default([]) @map("focus_tracks")
  familiarityGuidance Json?    @map("familiarity_guidance")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  evidences        ToolEvidence[]
  versionHistories ToolVersionHistory[]

  @@index([activeStatus, verificationStatus])
  @@index([category])
  @@index([provider])
  @@index([status])
  @@map("ai_tools")
}
```

### Schema Discrepancies vs. Plan
1. **Missing `marketTier` Column:** An integer (`1`..`4`) or nullable column `market_tier` is completely absent.
2. **Missing `pricingSourceUrl`:** `pricingDetails` JSON holds price data, but lacks an enforced top-level URL pointing to the vendor's official pricing page.
3. **No Outdated Reports Model:** There is no table to track learner reports (e.g. `ToolReport` or `ToolOutdatedFlag`).

---

## 4. Backend Service & Controller Architecture

### Existing Services in `Backend/src/services/wallet/`:
- [`domainTaxonomy.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts): Maps the 13 canonical domains (`CANONICAL_DOMAINS`) and provides `getThirteenDomainCards(allTools)`. Strict invariant: only active, verified tools are returned.
- [`toolCatalog.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolCatalog.service.ts): In-memory cache synced with PostgreSQL `ai_tools` table on startup.
- [`toolComparison.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolComparison.service.ts): Dynamic criteria generation for 2–4 tools across categories like Research & RAG, Agentic Coding, Video, etc.
- [`toolDiscovery.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolDiscovery.service.ts): Daily background scheduler (`setInterval` 24h) orchestrating discovery runs.
- [`toolVerification.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolVerification.service.ts): Strict evidence sufficiency checking and source priority evaluation.
- [`toolIntelligence.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolIntelligence.service.ts): Change detection and version history management.

### Controller Capabilities in `Backend/src/controllers/aiWallet.controller.ts`:
- **Search & Match:** Natural language matching via `POST /api/wallet/search` and `POST /api/wallet/match`.
- **Domain Cards:** `GET /api/wallet/domain-cards` returns all 13 domain cards populated with active, verified tools.
- **Comparison:** `POST /api/wallet/compare` validates 2–5 tool IDs and returns neutral synthesis and criteria breakdown.
- **Wallet Persistence:** `POST /api/wallet/add` updates `User.aiWalletData.userTools` via Prisma JSON update.

---

## 5. Frontend UI & Component Audit

### Components Inspected in `Frontend/src/screens/wallet/`:
1. [`AIWalletScreen.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/AIWalletScreen.tsx):
   - Multi-tab view: `credits`, `matching`, `wallet`, `discover`, `compare`, `gaps`, `admin`.
   - Admin tab correctly restricted to `role === 'admin'`.
   - Embeds `DomainCardsSection` under the discovery experience.
2. [`DomainCardsSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/DomainCardsSection.tsx):
   - Renders 13 domain cards with expand/collapse accordion.
   - Search bar across tools, capabilities, and domains.
   - Pricing filter (`All`, `Free / Freemium`, `Paid`).
   - Domain category dropdown filter.
   - Tool cards display Name, Provider, Pricing Badge, Description, Pricing Summary, Verified Date, Website link, "Confirm Usage" button, and "Add to Toolkit" button.
3. [`IntelligentToolMatchingSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/IntelligentToolMatchingSection.tsx):
   - Natural language search and requirement matching.
4. [`CreditsLedgerSection.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/wallet/CreditsLedgerSection.tsx):
   - Shows authoritative AC balance and transaction ledger.

---

## 6. Technical Risks & Constraints

1. **Rule 5 Invariant — Credits Ledger Atomicity:** Any change to add-to-wallet pricing (e.g. charging 10 AC) MUST use `creditsLedgerService.chargeWalletOperation` within a PostgreSQL transaction with idempotency keys. Direct balance mutation is forbidden.
2. **Rule 5 Invariant — PostgreSQL / Prisma Only:** No MongoDB or Mongoose imports are permitted. All new tables and columns must be created via standard Prisma migrations.
3. **Additive-Only Migrations:** The `ai_tools` table has active production seed records. Any migration adding `market_tier` or report models must be nullable or have safe defaults to prevent data corruption.
4. **Third-Party Logo Intellectual Property:** Scraping or displaying official vendor trademarks/logos without licensing presents legal liability. The plan must default to SVG icons (`lucide-react`) and text-based branding unless vendor usage is explicitly approved.
5. **Data Freshness / Scraping Blocks:** Web scraping vendor pricing pages directly from the backend server will trigger Cloudflare/anti-bot blocks. Catalog updates must rely on deterministic manual research, API sources, or admin-reviewed discovery runs.

---

## 7. Audit Conclusion

The AIIMS codebase is in prime condition to support the Market AI Tools Catalog. The existing architecture requires **zero destructive refactoring**. Implementing the plan consists of:
1. One additive Prisma migration for `marketTier` and tool reports.
2. Aligning taxonomy naming in `domainTaxonomy.service.ts`.
3. Enriching `SEED_TOOL_CATALOG` with verified market data.
4. Adding tier badges, sorting, and user actions (detail modal, compare, remove, report) to the frontend.

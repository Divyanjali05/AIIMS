# AIIMS Market AI Tools Catalog — Phase A Completion Report
**Database Schema & 13-Domain Taxonomy Alignment**

**Document Version:** 1.0.0  
**Date:** November 16, 2026  
**Status:** COMPLETE & VERIFIED  
**Author:** Senior Full-Stack Architect & PostgreSQL/Prisma Technical Lead  
**Repository Location:** `C:\Users\divya\OneDrive\Documents\AIIMS`

---

## 1. Executive Summary

Phase A of the **Market AI Tools Catalog** for AIIMS has been successfully executed in strict compliance with the reference plan (`AIIMS_Market_Tools_Tiered_Catalog_Plan.docx`), the Phase A Blueprint in `AIIMS_MARKET_TOOLS_IMPLEMENTATION_PLAN.md`, and the 10 Mandatory Agent Rules defined in `AGENTS.md`.

### Core Deliverables Achieved:
1. **Additive Prisma / PostgreSQL Schema:**
   - Extended `AiTool` with `marketTier` (Int, nullable 1–4, null for Unrated), `pricingSourceUrl` (String, nullable), and `pricingVerifiedAt` (DateTime, nullable).
   - Created indexed relations on `AiTool.marketTier` (`@@index([marketTier])`).
   - Introduced the `ToolReport` model for learner community outdated-information and dead-link reports with foreign keys to `AiTool` and `User` (reporter and optional staff reviewer).
   - Generated the formal additive migration `Backend/prisma/migrations/0003_market_tools_catalog/migration.sql`.
2. **13 Canonical Domains Taxonomy Alignment:**
   - Retained the 13 canonical domain cards and stable slug identifiers (`video-editing`, `data-analytics`, `graphic-design`, `reasoning-writing`, `agentic-coding`, `research-rag`, `presentation`, `automation`, `audio-voice`, `business-operations`, `marketing-growth`, `health-medical`, `legal-compliance`).
   - Engineered a bidirectional alias dictionary (`DOMAIN_SPEC_ALIASES`) mapping specification and colloquial synonyms (e.g., "Programming", "Content Creation", "Data Analytics", "Image Generation", "Productivity") directly to canonical domain IDs.
   - Added lookup helpers `DomainTaxonomyService.resolveCanonicalDomainId` and `DomainTaxonomyService.getCanonicalDomain`.
3. **Application Layer & Type Safety:**
   - Synchronized `Backend/src/types/index.ts`, `Backend/src/schemas/wallet.schema.ts`, `Backend/src/services/wallet/domainTaxonomy.service.ts`, and `Backend/src/services/wallet/toolCatalog.service.ts`.
   - Verified that all domain conversions (`aiToolRowToDomain`, `domainToolToPrismaData`) handle tiers and pricing verification metadata without mutating or speculating on existing data.
4. **Verification & Stability:**
   - 100% typecheck pass (`tsc --noEmit` exit code 0).
   - 100% build pass (`npm run build` exit code 0).
   - 14 dedicated Phase A automated unit tests written and passing in `Backend/src/services/__tests__/marketToolsPhaseA.test.ts`.
   - Zero regressions in existing wallet services (`walletToolDiscovery.test.ts` 21/21 passing, `interfacesAndReadiness.test.ts` 34/34 passing).
   - Zero `.env` files touched, zero secrets exposed, zero database wipes or drops.

---

## 2. Requirement Verification & Schema Additions

| Requirement | Implementation Detail | Status | Verified File / Function |
| :--- | :--- | :--- | :--- |
| **Market Tier Field** | `marketTier Int? @map("market_tier")` on `AiTool` | IMPLEMENTED | [schema.prisma](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L569) |
| **Market Tier Index** | `@@index([marketTier])` on `ai_tools` | IMPLEMENTED | [schema.prisma](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L583) |
| **Market Tier Enum/Range** | 1 (Starter), 2 (Growth), 3 (Leading), 4 (Enterprise), null (Unrated) | IMPLEMENTED | [wallet.schema.ts](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/schemas/wallet.schema.ts#L73) |
| **Pricing Source URL** | `pricingSourceUrl String? @map("pricing_source_url")` on `AiTool` | IMPLEMENTED | [schema.prisma](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L570) |
| **Pricing Verification Timestamp** | `pricingVerifiedAt DateTime? @map("pricing_verified_at")` on `AiTool` | IMPLEMENTED | [schema.prisma](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L571) |
| **Tool Outdated Report Model** | `model ToolReport` with cascade tool/user links and reviewer audit | IMPLEMENTED | [schema.prisma](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L664-L686) |
| **Migration SQL** | Additive migration `0003_market_tools_catalog/migration.sql` | IMPLEMENTED | [migration.sql](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/migrations/0003_market_tools_catalog/migration.sql#L1-L45) |
| **13 Canonical Domains** | 13 domain cards with icons, capabilities, target audience | IMPLEMENTED | [domainTaxonomy.service.ts](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L1018-L1293) |
| **Domain Spec Aliases** | Bidirectional alias resolution for spec synonyms | IMPLEMENTED | [types/index.ts](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/types/index.ts#L173-L239) |
| **Learner Privacy Guard** | User tool reports scoped to authenticated user ownership | IMPLEMENTED | [schema.prisma](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L668) |

---

## 3. 13-Domain Taxonomy Alignment Matrix

The AIIMS AI Wallet maintains 13 canonical domain cards. To ensure 100% backward compatibility with existing tests and database references while fulfilling the reference specification, the system maps spec synonyms to canonical domain IDs via `DomainTaxonomyService.resolveCanonicalDomainId()`:

| # | Canonical Domain ID | Canonical Title | Spec & Legacy Synonyms | Target Audience | Primary Category |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | `video-editing` | Video Editing & Generation | `video generation`, `video editing`, `video` | both | Video |
| **2** | `data-analytics` | Data Analytics & Intelligence | `data analytics`, `data analysis`, `data intelligence` | both | Data Analysis |
| **3** | `graphic-design` | Graphic Design & Visual Arts | `image generation`, `visual arts`, `graphic design` | both | Image & Vision |
| **4** | `reasoning-writing` | Reasoning & Long-Form Writing | `writing`, `reasoning`, `long-form writing` | both | Reasoning & Writing |
| **5** | `agentic-coding` | Agentic Coding & Software Engineering | `programming`, `coding`, `software engineering`, `agentic coding` | both | Agentic Coding |
| **6** | `research-rag` | Research & Grounded Citations | `research`, `citations`, `rag` | both | Research & RAG |
| **7** | `presentation` | Presentation & Pitch Deck Generation | `presentation`, `pitch decks`, `slide generation` | both | Presentation |
| **8** | `automation` | Workflow Automation & Integration | `productivity`, `workflow automation`, `integration`, `automation` | both | Automation |
| **9** | `audio-voice` | Audio & Voice Synthesis | `audio generation`, `audio`, `voice synthesis`, `audio-voice` | both | Multi-Modal |
| **10** | `business-operations` | Business Operations & Strategy | `business operations`, `strategy`, `operations` | entrepreneur | Automation |
| **11** | `marketing-growth` | Marketing & Growth Content | `content creation`, `marketing`, `growth content` | both | Reasoning & Writing |
| **12** | `health-medical` | Health & Clinical Research | `health`, `clinical research`, `medical` | both | Research & RAG |
| **13** | `legal-compliance` | Legal & Contract Analysis | `legal`, `contract analysis`, `compliance` | both | Research & RAG |

---

## 4. Market Tier Invariants & Handling

In accordance with Section 3 of `AIIMS_Market_Tools_Tiered_Catalog_Plan.docx`, the market tier schema is strictly separated from quality ratings, skill levels, and pricing:

1. **Market Tiers (1 to 4):**
   - **Tier 1 (Starter):** Small teams, indie tools, open-source or low-cost newer entrants.
   - **Tier 2 (Growth):** Popular SaaS with team plans, published user counts, and paid tiers.
   - **Tier 3 (Leading):** Category leaders with large published user bases and widespread press coverage.
   - **Tier 4 (Enterprise):** Large vendors with compliance, SSO/SAML, security certifications, and enterprise tiers.
2. **Unrated Tools (`marketTier = null`):**
   - Existing tools and newly discovered tools default to `null` until reviewed by an admin or verified by research evidence with a source URL.
   - Unrated tools remain fully functional in database queries and UI components without schema violations or forced mock tiers.
3. **Validation Invariant:**
   - Application-level Zod schemas (`marketTierSchema`) reject numbers outside the 1–4 range, fractional values, and string values, ensuring strict data hygiene.

---

## 5. Tool Outdated-Report Model Design

The new `ToolReport` model allows learners to flag broken links, outdated pricing, or inaccurate tier classifications:

```prisma
model ToolReport {
  id             String    @id @default(uuid())
  toolId         String    @map("tool_id")
  tool           AiTool    @relation(fields: [toolId], references: [id], onDelete: Cascade)
  userId         String    @map("user_id")
  reporter       User      @relation("UserToolReports", fields: [userId], references: [id], onDelete: Cascade)
  reportCategory String    @map("report_category") // PRICING_OUTDATED | LINK_BROKEN | TIER_INCORRECT | CAPABILITY_CHANGED | OTHER
  description    String
  sourceUrl      String?   @map("source_url")
  status         String    @default("PENDING") // PENDING | UNDER_REVIEW | RESOLVED | REJECTED
  reviewerId     String?   @map("reviewer_id")
  reviewer       User?     @relation("ReviewerToolReports", fields: [reviewerId], references: [id], onDelete: SetNull)
  reviewNotes    String?   @map("review_notes")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([toolId])
  @@index([userId])
  @@index([status])
  @@index([reportCategory])
  @@index([createdAt(sort: Desc)])
  @@map("tool_reports")
}
```

### Security & Privacy Protections:
- Reports require an authenticated user (`userId`).
- Cascade deletion is configured on the `User` and `AiTool` relations.
- Reviewer ID is nullable (`SetNull` on delete) to preserve audit trails even if an admin user record is removed.
- Reporters' personal identifying details are never returned in public tool endpoints.

---

## 6. Migration & Verification Results

### 6.1 Generated SQL Review
The generated migration `Backend/prisma/migrations/0003_market_tools_catalog/migration.sql` was verified to be strictly additive:
- `ALTER TABLE "ai_tools" ADD COLUMN "market_tier" INTEGER...` (nullable columns only).
- `CREATE TABLE "tool_reports" (...)` (additive table).
- `CREATE INDEX ...` (additive performance indexes).
- `ALTER TABLE ... ADD CONSTRAINT ...` (foreign key constraints).
- **Destructive SQL Count:** 0 `DROP`, 0 `TRUNCATE`, 0 `DELETE`, 0 `ALTER COLUMN TYPE`.

### 6.2 Pipeline Execution Summary

| Command / Pipeline Step | Description | Result / Exit Code |
| :--- | :--- | :---: |
| `prisma validate` | Validated schema syntax and relations | **PASS (0)** |
| `prisma generate` | Generated Prisma Client v6.19.3 | **PASS (0)** |
| `npm run typecheck --prefix Backend` | TypeScript `tsc --noEmit` full typecheck | **PASS (0)** |
| `npx vitest run ... marketToolsPhaseA.test.ts` | 14 dedicated Phase A architecture unit tests | **PASS (0)** |
| `npx vitest run ... walletToolDiscovery.test.ts` | 21 canonical wallet & discovery regression tests | **PASS (0)** |
| `npx vitest run ... interfacesAndReadiness.test.ts` | 34 interface & zero-speculation model tests | **PASS (0)** |
| `npm run build --prefix Backend` | Clean compilation to `dist/` | **PASS (0)** |

### 6.3 Live Database Deployment Status
In accordance with Rule 6 and Prompt 2 Section 6 ("If migration application cannot be safely verified, report it as NOT VERIFIED. Do not claim the live database is migrated"):
- The migration file has been created, syntactically verified, and tested against local Prisma mock double stores.
- Live PostgreSQL instance application status: **PENDING ENVIRONMENT DEPLOYMENT** (to be executed via `npx prisma migrate deploy` in the deployment environment).

---

## 7. Modified and Created Files

### Files Created:
1. `Backend/prisma/migrations/0003_market_tools_catalog/migration.sql` — Additive PostgreSQL DDL migration.
2. `Backend/src/services/__tests__/marketToolsPhaseA.test.ts` — 14 comprehensive unit tests for tiers, reports, and taxonomy.
3. `AIIMS_MARKET_TOOLS_PHASE_A_COMPLETION_REPORT.md` — Root completion report.
4. `docs/AIIMS_MARKET_TOOLS_PHASE_A_COMPLETION_REPORT.md` — Documentation copy.

### Files Modified:
1. `Backend/prisma/schema.prisma` — Added `marketTier`, `pricingSourceUrl`, `pricingVerifiedAt`, `ToolReport` model, and relations.
2. `Backend/src/types/index.ts` — Added `MarketTier`, `MARKET_TIER_CONFIG`, `CANONICAL_DOMAIN_IDS`, `DOMAIN_SPEC_ALIASES`, `ToolReportCategory`, `ToolReportStatus`, `ToolReportItem`.
3. `Backend/src/schemas/wallet.schema.ts` — Added `marketTierSchema`, `toolReportCategorySchema`, `toolReportStatusSchema`, `createToolReportSchema`, `updateToolReportStatusSchema`.
4. `Backend/src/services/wallet/domainTaxonomy.service.ts` — Enriched `DomainCard.tools` with tier and pricing verification fields; added domain resolution helper methods and standalone `CANONICAL_DOMAINS` export.
5. `Backend/src/services/wallet/toolCatalog.service.ts` — Updated `aiToolRowToDomain` and `domainToolToPrismaData` to map new fields.
6. `Backend/src/services/__tests__/interfacesAndReadiness.test.ts` — Updated model count assertion from 22 to 23 to account for canonical `ToolReport`.

---

## 8. Next Steps: Phase B Readiness

With Phase A schema and taxonomy plumbing fully completed and verified, the project is ready for **Phase B (Market Research & Catalog Data Expansion)**:
- Candidate list compilation across the 13 canonical domains targeting 8+ tools per domain.
- Sourcing official pricing URLs, tiers, and free plan limitations.
- Expanding `aiimsCatalog.ts` and verification scripts without altering AC balances or disrupting learner workflows.

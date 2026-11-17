# AIIMS Market AI Tools Catalog — Phase F.1.1: Import Pipeline Security & Data Integrity Audit Report

**Project:** AIIMS (AI Intelligence & Mentoring System)  
**Workspace:** `C:\Users\divya\OneDrive\Documents\AIIMS`  
**Phase:** Phase F.1.1 — Safe Prisma Candidate Import Pipeline Security, Data Integrity & Pre-Execution Audit  
**Auditor:** Senior TypeScript Backend Architect, PostgreSQL/Prisma Data Migration Specialist, Application Security Engineer & QA Auditor  
**Date of Audit:** November 16, 2026  
**Audit Mode:** Strictly Read-Only (Zero code modifications, zero database writes, zero migrations applied)

---

## 1. Executive Summary & Audit Verdict

This audit performs an independent, strict, read-only security and data integrity verification of the **Phase F.1 Market AI Tools Catalog Candidate Import Pipeline** (`Backend/src/scripts/importMarketCandidates.ts`), its automated test suite (`Backend/src/services/__tests__/importMarketCandidates.test.ts`), and the machine-readable pre-execution preview (`AIIMS_MARKET_TOOLS_IMPORT_PREVIEW.json`).

The claims of the Phase F.1 completion report were audited directly against the actual codebase, raw research datasets, Prisma schema, and test fixtures.

### Key Audit Findings Summary
1. **Dry-Run Safety Verified (PASS):** The CLI import pipeline defaults to `--dry-run` with 100% certainty when no arguments or arbitrary flags are supplied. Zero database writes, upserts, creates, or updates can execute in dry-run mode. Live writes are strictly gated behind `--execute-write-authorized-by-owner`.
2. **Dataset Eligibility Recomputed & Confirmed (PASS):** Independent programmatic recomputation of both `AIIMS_MARKET_TOOLS_CANDIDATES.json` and `AIIMS_MARKET_TOOLS_RESEARCH_REGISTER.csv` confirms exact counts:
   - Total Candidates: **66**
   - Strictly VERIFIED: **53** (Admitted into eligible pool)
   - Excluded: **13** (6 `NEEDS_REVIEW` quote-only, 4 `UNVERIFIED` closed beta, 3 `REJECTED` discontinued)
   - Zero non-verified tools bypass the exclusion filter.
3. **Data Quality & Invariants of the 53 Candidates (PASS):** All 53 verified tools pass all 7 validation invariant checks (0 duplicate IDs, 0 duplicate name/provider identities, 0 invalid domains, 0 invalid tiers, 0 invalid websites, 0 invalid pricing URLs, 0 invalid dates).
4. **Critical Finding F-1 (HIGH — Update Allowlist Not Enforced at Prisma Write Layer):** `planImport` defines an intended allowlist of `changedFields` (8 fields). However, in `executeImportPipeline()`, `tx.aiTool.update` receives `item.data as any`, which contains the *full normalized payload* from `candidateToAiToolPayload(c)`. If write mode were executed, it would overwrite `name`, `provider` (changing legal corporate suffixes), `category`, `description`, `shortDescription`, `capabilities`, `useCases`, and drop curated seed fields (e.g. `strengths`, `limitations`, `taskMappings`).
5. **Critical Finding F-2 (HIGH — Idempotency Failure on Re-execution):** `generateImportPreview` separates creates from updates by matching against static `SEED_TOOL_CATALOG` rather than querying existing records from the database. On a repeated run against a populated database, `tx.aiTool.create` will attempt to re-insert the 34 new tools and crash with a PostgreSQL primary key violation (`ai_tools_pkey`), aborting the transaction.
6. **Performance Finding F-3 (MEDIUM — Default Interactive Transaction Timeout):** `prisma.$transaction(async (tx) => { ... })` uses Prisma's default 5-second timeout, which risks aborting 53 sequential write queries under latency.
7. **Report Prose Finding F-4 (LOW — Prose vs Preview Discrepancy in Phase F.1 Report):** The Phase F.1 report prose mistakenly listed 4 tools (`tool-paperpal`, `tool-tome`, `tool-beautiful-ai`, `tool-zapier-ai`) under updates, whereas the actual generated preview JSON correctly categorized them as `proposedCreates`.
8. **Automated Test Coverage (PASS with minor gap):** 19 of 19 automated tests pass in 103ms. However, the tests validate `planImport` and dry-run logic; they do not test live transactional rollback or repeated execution.

---

### Overall Audit Verdict

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                 OVERALL AUDIT VERDICT:                                   ║
║                                 CONDITIONALLY ACCEPTED                                   ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

**Justification:**  
- The pipeline architecture, data validation, candidate filtering, and dry-run safety are **ACCEPTED**.
- The pipeline is **CONDITIONALLY ACCEPTED** for live execution: Live write execution (`--execute-write-authorized-by-owner`) **must remain blocked** until Findings F-1 and F-2 are corrected (enforcing the allowlist on `tx.aiTool.update` and querying live DB records for true idempotency).

---

## 2. Inventory of Actual Files Inspected

| File Path | Component / Role | Audit Status |
| :--- | :--- | :--- |
| `Backend/src/scripts/importMarketCandidates.ts` | Import pipeline script & CLI entry point | Inspected; 776 lines. Finding F-1 & F-2 identified. |
| `Backend/src/scripts/seedToolCatalog.ts` | Legacy seed script | Inspected; 106 lines. Used as baseline for catalog seeding. |
| `Backend/src/services/__tests__/importMarketCandidates.test.ts` | Automated test suite | Inspected; 362 lines. 19 tests verified passing. |
| `AIIMS_MARKET_TOOLS_IMPORT_PREVIEW.json` | Generated machine-readable preview | Inspected; 812 lines. Exact counts reconciled. |
| `AIIMS_MARKET_TOOLS_CANDIDATES.json` | Candidate dataset (JSON) | Inspected; 66 candidate objects verified. |
| `AIIMS_MARKET_TOOLS_RESEARCH_REGISTER.csv` | Research register (CSV) | Inspected; 67 lines (1 header + 66 data rows). |
| `Backend/prisma/schema.prisma` | PostgreSQL Prisma schema | Inspected; `AiTool`, `User`, `ToolReport`, `aiWalletData`. |
| `Backend/src/data/aiimsCatalog.ts` | Static catalog reference (`SEED_TOOL_CATALOG`) | Inspected; 20 baseline tools analyzed. |
| `AIIMS_MARKET_TOOLS_PHASE_F1_IMPORT_PIPELINE_REPORT.md` | Phase F.1 report | Inspected; Finding F-4 identified. |
| `AIIMS_MARKET_TOOLS_PHASE_F0_READINESS_AUDIT.md` | Phase F.0 readiness report | Inspected; verified consistency of math. |

---

## 3. Dry-Run Safety & CLI Execution Path Verification

The execution path of `executeImportPipeline()` (`Backend/src/scripts/importMarketCandidates.ts` lines 594-764) was analyzed line-by-line:

```typescript
const args = process.argv.slice(2);
const isExplicitWriteAuthorized = args.includes('--execute-write-authorized-by-owner');
const isDryRun = !isExplicitWriteAuthorized || args.includes('--dry-run');
```

### 3.1 Verification Checklist

| Safety Invariant | Code Verification | Audit Finding |
| :--- | :--- | :--- |
| **Default Mode** | When no CLI flags are supplied, `isExplicitWriteAuthorized` is `false`, so `isDryRun` is strictly `true`. | **PASS** |
| **Zero DB Writes in Dry-Run** | When `isDryRun` is `true`, lines 663-679 execute: prints summary, writes JSON preview, and returns immediately without invoking `prisma` or any DB client. | **PASS** |
| **No Indirect Writes** | No helper function or repository writes to disk or database during dry-run. Only `fs.writeFileSync` on the preview output file is called. | **PASS** |
| **Dataset Immutability** | Candidate datasets (`AIIMS_MARKET_TOOLS_CANDIDATES.json`, `AIIMS_MARKET_TOOLS_RESEARCH_REGISTER.csv`) are opened with `fs.readFileSync` only. Never written or modified. | **PASS** |
| **Arbitrary / Unknown Arguments** | Unknown flags (e.g. `--write`, `--force`, `--yes`, `--execute`) do NOT match `--execute-write-authorized-by-owner`. They evaluate to `isDryRun = true`. | **PASS** |
| **Precedence of `--dry-run`** | If `--execute-write-authorized-by-owner` and `--dry-run` are passed simultaneously, `|| args.includes('--dry-run')` forces `isDryRun = true`. Safe fail-closed behavior. | **PASS** |
| **No Environment Variable Bypass** | No environment variable (e.g., `FORCE_WRITE`, `ALLOW_MUTATION`) can activate write mode. Only `process.argv` is inspected. | **PASS** |
| **Prepared vs Executable Write Path** | The write path (lines 681-764) is **already implemented in code** with Prisma transaction calls. However, it cannot execute without PostgreSQL connectivity AND the explicit authorization flag. | **PASS** |

---

## 4. Audit of the 19 Proposed Legacy Updates

A critical component of this audit is analyzing the 19 tools that overlap between the 20 legacy seed tools in `SEED_TOOL_CATALOG` and the 53 verified research candidates.

### 4.1 Summary of Update Strategy & Finding F-1
In `planImport` (lines 435-444), the script records:
```typescript
const changedFields = [
  'marketTier', 'pricingDetails', 'pricingSourceUrl', 'pricingVerifiedAt',
  'officialWebsite', 'categories', 'domains', 'lastVerifiedAt'
];
```
**CRITICAL AUDIT FINDING F-1:**  
While `changedFields` lists 8 allowlisted fields, `item.data` holds the *entire normalized candidate payload* (`candidateToAiToolPayload(c)`). In `executeImportPipeline` (line 715):
```typescript
await tx.aiTool.update({
  where: { id: item.id },
  data: item.data as any,
});
```
This means Prisma will update *every field present in `item.data`*, including `name`, `provider`, `category`, `description`, `shortDescription`, `capabilities`, `useCases`, and `tasks`.

### 4.2 Candidate-by-Candidate Analysis for All 19 Updates

#### 1. `tool-runway` — Runway Gen-3 Alpha
- **Existing Legacy:** Name: `"Runway Gen-3 Alpha"`, Provider: `"Runway AI"`, Category: `"Video"`, Website: `"https://runwayml.com"`, Pricing: `FREEMIUM` (125 one-time credits, Standard at $15/mo).
- **Candidate:** Name: `"Runway Gen-3 Alpha"`, Provider: `"Runway AI, Inc."`, Domain: `"video-editing"`, Website: `"https://runwayml.com"`, Tier: 3, Pricing: `"Trial"` (source: `https://runwayml.com/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact product match. Category maps cleanly to canonical `video-editing`.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`** (Subject to allowlist enforcement). Provider string change (`"Runway AI"` $\rightarrow$ `"Runway AI, Inc."`) is cosmetic legal entity refinement.

#### 2. `tool-descript` — Descript
- **Existing Legacy:** Name: `"Descript"`, Provider: `"Descript Inc"`, Category: `"Video"`, Website: `"https://www.descript.com"`, Pricing: `FREEMIUM` (1 hr/mo, Creator at $12/mo).
- **Candidate:** Name: `"Descript"`, Provider: `"Descript Inc"`, Domain: `"video-editing"`, Website: `"https://www.descript.com"`, Tier: 2, Pricing: `"Yes"` (source: `https://www.descript.com/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact product, provider, and domain match.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 3. `tool-julius` — Julius AI
- **Existing Legacy:** Name: `"Julius AI"`, Provider: `"Julius AI"`, Category: `"Data Analysis"`, Website: `"https://julius.ai"`, Pricing: `FREEMIUM` (15 queries/mo, Pro at $20/mo).
- **Candidate:** Name: `"Julius AI"`, Provider: `"Julius Technologies Inc."`, Domain: `"data-analytics"`, Website: `"https://julius.ai"`, Tier: 2, Pricing: `"Yes"` (source: `https://julius.ai/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Provider adds corporate suffix. Canonical domain `data-analytics`.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 4. `tool-canva` — Canva Magic Studio
- **Existing Legacy:** Name: `"Canva Magic Studio"`, Provider: `"Canva"`, Category: `"Image & Vision"`, Website: `"https://www.canva.com"`, Pricing: `FREEMIUM` (Core AI free, Pro at $12.99/mo).
- **Candidate:** Name: `"Canva Magic Studio"`, Provider: `"Canva Pty Ltd"`, Domain: `"graphic-design"`, Website: `"https://www.canva.com"`, Tier: 3, Pricing: `"Yes"` (source: `https://www.canva.com/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Category mapped to canonical `graphic-design`. Tier 3 matches category leader scale.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 5. `tool-midjourney` — Midjourney v6
- **Existing Legacy:** Name: `"Midjourney v6"`, Provider: `"Midjourney Inc"`, Category: `"Image & Vision"`, Website: `"https://midjourney.com"`, Pricing: `PAID` (Starting $10/mo, zero free tier).
- **Candidate:** Name: `"Midjourney v6"`, Provider: `"Midjourney Inc"`, Domain: `"graphic-design"`, Website: `"https://www.midjourney.com"`, Tier: 3, Pricing: `"No"` (source: `https://docs.midjourney.com/docs/plans`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Pricing confirms paid-only model.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 6. `tool-chatgpt` — ChatGPT (GPT-4o)
- **Existing Legacy:** Name: `"ChatGPT (GPT-4o)"`, Provider: `"OpenAI"`, Category: `"Reasoning & Writing"`, Website: `"https://chatgpt.com"`, Pricing: `FREEMIUM` ($20/mo Plus).
- **Candidate:** Name: `"ChatGPT (GPT-4o)"`, Provider: `"OpenAI, LLC"`, Domain: `"reasoning-writing"`, Website: `"https://chatgpt.com"`, Tier: 3, Pricing: `"Yes"` (source: `https://openai.com/chatgpt/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 7. `tool-claude` — Claude 3.5 Sonnet
- **Existing Legacy:** Name: `"Claude 3.5 Sonnet"`, Provider: `"Anthropic"`, Category: `"Reasoning & Writing"`, Website: `"https://claude.ai"`, Pricing: `FREEMIUM` ($20/mo Pro).
- **Candidate:** Name: `"Claude 3.5 Sonnet"`, Provider: `"Anthropic PBC"`, Domain: `"reasoning-writing"`, Website: `"https://claude.ai"`, Tier: 3, Pricing: `"Yes"` (source: `https://www.anthropic.com/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 8. `tool-cursor` — Cursor IDE
- **Existing Legacy:** Name: `"Cursor IDE"`, Provider: `"Anysphere"`, Category: `"Agentic Coding"`, Website: `"https://cursor.com"`, Pricing: `FREEMIUM` ($20/mo Pro).
- **Candidate:** Name: `"Cursor IDE"`, Provider: `"Anysphere Inc"`, Domain: `"agentic-coding"`, Website: `"https://cursor.com"`, Tier: 2, Pricing: `"Yes"` (source: `https://cursor.com/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 9. `tool-copilot` — GitHub Copilot
- **Existing Legacy:** Name: `"GitHub Copilot"`, Provider: `"GitHub / Microsoft"`, Category: `"Agentic Coding"`, Website: `"https://github.com/features/copilot"`, Pricing: `PAID` ($10/mo individual).
- **Candidate:** Name: `"GitHub Copilot"`, Provider: `"GitHub, Inc. / Microsoft"`, Domain: `"agentic-coding"`, Website: `"https://github.com/features/copilot"`, Tier: 3, Pricing: `"Yes"` (source: `https://github.com/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Candidate freePlan `"Yes"` accurately reflects GitHub's newly released Copilot Free tier for VS Code.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 10. `tool-v0` — v0 by Vercel
- **Existing Legacy:** Name: `"v0 by Vercel"`, Provider: `"Vercel"`, Category: `"Agentic Coding"`, Website: `"https://v0.dev"`, Pricing: `FREEMIUM` ($20/mo Premium).
- **Candidate:** Name: `"v0 by Vercel"`, Provider: `"Vercel Inc."`, Domain: `"agentic-coding"`, Website: `"https://v0.dev"`, Tier: 2, Pricing: `"Yes"` (source: `https://v0.dev/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 11. `tool-perplexity` — Perplexity AI
- **Existing Legacy:** Name: `"Perplexity AI"`, Provider: `"Perplexity AI"`, Category: `"Research & RAG"`, Website: `"https://perplexity.ai"`, Pricing: `FREEMIUM` ($20/mo Pro).
- **Candidate:** Name: `"Perplexity AI"`, Provider: `"Perplexity AI, Inc."`, Domain: `"research-rag"`, Website: `"https://www.perplexity.ai"`, Tier: 3, Pricing: `"Yes"` (source: `https://www.perplexity.ai/pro`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Tier 3 reflects category leadership scale.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 12. `tool-notebooklm` — Google NotebookLM
- **Existing Legacy:** Name: `"Google NotebookLM"`, Provider: `"Google"`, Category: `"Research & RAG"`, Website: `"https://notebooklm.google.com"`, Pricing: `FREE` (100% free consumer product).
- **Candidate:** Name: `"Google NotebookLM"`, Provider: `"Google LLC"`, Domain: `"research-rag"`, Website: `"https://notebooklm.google.com"`, Tier: 3, Pricing: `"Yes"` (source: `https://notebooklm.google.com`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match.
- **Audit Flag:** Candidate assigns Market Tier 3 (Team / Small Business), despite NotebookLM having no published paid team tier (it is free for Google Workspace/consumer accounts).
- **Classification:** **`NEEDS_OWNER_APPROVAL`** (Owner must confirm if NotebookLM should be classified as Tier 1 Free Entry or Tier 3 Market Scale).

#### 13. `tool-gamma` — Gamma App
- **Existing Legacy:** Name: `"Gamma App"`, Provider: `"Gamma Tech"`, Category: `"Presentation"`, Website: `"https://gamma.app"`, Pricing: `FREEMIUM` ($10/mo Plus).
- **Candidate:** Name: `"Gamma App"`, Provider: `"Gamma Tech Inc."`, Domain: `"presentation"`, Website: `"https://gamma.app"`, Tier: 2, Pricing: `"Yes"` (source: `https://gamma.app/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 14. `tool-make` — Make.com AI
- **Existing Legacy:** Name: `"Make.com AI"`, Provider: `"Make.com"`, Category: `"Automation"`, Website: `"https://make.com"`, Pricing: `FREEMIUM` ($9/mo Core).
- **Candidate:** Name: `"Make.com AI"`, Provider: `"Make.com / Celonis SE"`, Domain: `"automation"`, Website: `"https://www.make.com"`, Tier: 2, Pricing: `"Yes"` (source: `https://www.make.com/en/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Provider adds parent company Celonis SE.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 15. `tool-notion-ai` — Notion AI
- **Existing Legacy:** Name: `"Notion AI"`, Provider: `"Notion Labs"`, Category: `"Automation"`, Website: `"https://www.notion.so/product/ai"`, Pricing: `PAID` ($10/member/mo).
- **Candidate:** Name: `"Notion AI"`, Provider: `"Notion Labs, Inc."`, Domain: `"automation"`, Website: `"https://www.notion.so/product/ai"`, Tier: 3, Pricing: `"Trial"` (source: `https://www.notion.so/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 16. `tool-elevenlabs` — ElevenLabs
- **Existing Legacy:** Name: `"ElevenLabs"`, Provider: `"ElevenLabs Inc"`, Category: `"Multi-Modal"`, Website: `"https://elevenlabs.io"`, Pricing: `FREEMIUM` ($5/mo Starter).
- **Candidate:** Name: `"ElevenLabs"`, Provider: `"ElevenLabs Inc"`, Domain: `"audio-voice"`, Website: `"https://elevenlabs.io"`, Tier: 3, Pricing: `"Yes"` (source: `https://elevenlabs.io/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Domain shifts from legacy `"Multi-Modal"` to canonical `"audio-voice"`.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 17. `tool-copyai` — Copy.ai
- **Existing Legacy:** Name: `"Copy.ai"`, Provider: `"Copy.ai Inc"`, Category: `"Reasoning & Writing"`, Website: `"https://www.copy.ai"`, Pricing: `FREEMIUM` ($36/mo Pro).
- **Candidate:** Name: `"Copy.ai"`, Provider: `"Copy.ai Inc"`, Domain: `"marketing-growth"`, Website: `"https://www.copy.ai"`, Tier: 2, Pricing: `"Yes"` (source: `https://www.copy.ai/prices`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Category shifts from `"Reasoning & Writing"` to specialized GTM `"marketing-growth"`.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 18. `tool-openevidence` — OpenEvidence
- **Existing Legacy:** Name: `"OpenEvidence"`, Provider: `"OpenEvidence Inc"`, Category: `"Research & RAG"`, Website: `"https://www.openevidence.com"`, Pricing: `FREEMIUM` (Free for healthcare pros).
- **Candidate:** Name: `"OpenEvidence"`, Provider: `"OpenEvidence Inc"`, Domain: `"health-medical"`, Website: `"https://www.openevidence.com"`, Tier: 2, Pricing: `"Yes"` (source: `https://www.openevidence.com`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Vertical domain shifts to `"health-medical"`.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

#### 19. `tool-robin-ai` — Robin AI
- **Existing Legacy:** Name: `"Robin AI"`, Provider: `"Robin AI Ltd"`, Category: `"Research & RAG"`, Website: `"https://www.robinai.com"`, Pricing: `FREEMIUM` (Free tier + custom enterprise).
- **Candidate:** Name: `"Robin AI"`, Provider: `"Robin AI Ltd"`, Domain: `"legal-compliance"`, Website: `"https://www.robinai.com"`, Tier: 2, Pricing: `"Yes"` (source: `https://www.robinai.com/pricing`, verified: 2026-11-15).
- **Identity & Provenance:** Exact match. Domain shifts to canonical `"legal-compliance"`.
- **Classification:** **`SAFE_METADATA_ENRICHMENT`**.

---

### 4.3 Update Classification Summary Table

| Classification | Count | Tool IDs | Audit Conclusion |
| :--- | :---: | :--- | :--- |
| **SAFE_METADATA_ENRICHMENT** | 18 | `tool-runway`, `tool-descript`, `tool-julius`, `tool-canva`, `tool-midjourney`, `tool-chatgpt`, `tool-claude`, `tool-cursor`, `tool-copilot`, `tool-v0`, `tool-perplexity`, `tool-gamma`, `tool-make`, `tool-notion-ai`, `tool-elevenlabs`, `tool-copyai`, `tool-openevidence`, `tool-robin-ai` | Verified real-world product identities. Enriching market tiers and verified pricing URLs is safe, **provided Finding F-1 is implemented** to restrict updates to the allowlist. |
| **NEEDS_OWNER_APPROVAL** | 1 | `tool-notebooklm` | Free consumer tool assigned Tier 3 (market prominence) rather than Tier 1. Owner policy decision required. |
| **IDENTITY_CONFLICT** | 0 | None | Zero mismatched products or false name collisions detected. |
| **UNSAFE_UPDATE** | 0 | None (conditional on allowlist) | No updates delete primary keys or break relations. |

---

## 5. Candidate Eligibility & Dataset Reconciliation

### 5.1 Reconciliation Counts Across Formats

The research dataset was recomputed from scratch from both `AIIMS_MARKET_TOOLS_CANDIDATES.json` and `AIIMS_MARKET_TOOLS_RESEARCH_REGISTER.csv`:

```
Candidate Dataset Recomputation Matrix:
─────────────────────────────────────────────────────────────────────────────
Status Category        JSON Count    CSV Count    Import Eligibility
─────────────────────────────────────────────────────────────────────────────
VERIFIED (Active)          53            53       ELIGIBLE (Admitted to Plan)
NEEDS_REVIEW (Quote)        6             6       EXCLUDED (Decision D-1)
UNVERIFIED (Beta/Open)      4             4       EXCLUDED (Decision D-2)
REJECTED (Discontinued)     3             3       EXCLUDED (Permanently Dead)
─────────────────────────────────────────────────────────────────────────────
TOTAL CANDIDATES           66            66       53 Eligible / 13 Excluded
```

### 5.2 Verification Invariant Audit (53 Verified Candidates)
All 53 candidates in the eligible set were tested programmatically:
- **Duplicate IDs:** `0` (All 53 match `^tool-[a-z0-9-]+$`).
- **Duplicate Normalized Identities (`name::provider`):** `0`.
- **Domain Taxonomy Validity:** `0` errors (All map to approved canonical IDs).
- **Market Tier Range:** `0` errors (All are integers 1, 2, 3, or 4).
- **Official Website Protocol:** `0` errors (All use `http:` or `https:`).
- **Pricing Source URL Protocol:** `0` errors (All use `http:` or `https:`).
- **Pricing Verification Timestamp:** `0` errors (All parse cleanly via `Date.parse()`).

---

## 6. Transaction & Idempotency Design Audit

### 6.1 Transaction Safety Analysis
In `Backend/src/scripts/importMarketCandidates.ts` lines 702-719:
```typescript
await prisma.$transaction(async (tx) => {
  for (const item of plan.proposedCreates) {
    await tx.aiTool.create({ data: item.data as any });
    createdCount++;
  }
  for (const item of plan.proposedUpdates) {
    await tx.aiTool.update({ where: { id: item.id }, data: item.data as any });
    updatedCount++;
  }
});
```

1. **Atomic Rollback Guarantee:** Wrapping all operations in a single interactive `$transaction` guarantees that if any query throws an exception, PostgreSQL executes an immediate, complete rollback. Partial imports are impossible.
2. **Finding F-3 (MEDIUM — Timeout Exposure):** Prisma interactive transactions default to a 5-second timeout. 53 sequential round-trips over network latency may exceed 5000ms. In Phase F.2, this should be explicitly set to `{ timeout: 30000, maxWait: 10000 }`.

### 6.2 Idempotency Analysis & Finding F-2
1. **Finding F-2 (HIGH — Repeated Run Failure):**  
   `generateImportPreview()` plans actions against static `SEED_TOOL_CATALOG`. If the import is executed once, 34 new tools are written to `ai_tools`. If executed a second time, the script still plans those same 34 tools as `proposedCreates`, triggering a PostgreSQL primary key collision on `tool-capcut` and aborting.
   - **Corrective Action for Phase F.2:** In live write mode, query existing tools directly:
     ```typescript
     const existingDbTools = await prisma.aiTool.findMany({ select: { id: true } });
     ```
     Or execute `tx.aiTool.upsert` with allowlisted update fields.

### 6.3 Relational & User Invariant Guarantees
- **User Wallets (`User.aiWalletData`):** Wallets store an array of user tools referencing `toolId`. Because tool IDs are stable slugs and tools are never deleted, all wallet links remain 100% valid.
- **User Credits & XP:** User credits (`aiimsCredits`) and experience points (`xpPoints`) are stored on `User` and `CreditLedger`. The import pipeline touches ONLY `tx.aiTool`. Balance mutation is mathematically impossible.
- **Tool Reports (`ToolReport`):** Tool reports reference `toolId` with `onDelete: Cascade`. Because tools are never deleted, all existing reports remain intact.

---

## 7. Automated Test Suite & Build Verification Evidence

### 7.1 Vitest Execution Evidence
- **Command:** `cd Backend; npx vitest run src/services/__tests__/importMarketCandidates.test.ts`
- **Output:**
  ```
  RUN  v1.6.1 C:/Users/divya/OneDrive/Documents/AIIMS/Backend

  ✓ src/services/__tests__/importMarketCandidates.test.ts  (19 tests) 103ms

  Test Files  1 passed (1)
  Tests       19 passed (19)
  Start at    19:54:50
  Duration    3.26s
  ```
- **Exit Code:** `0` (Success).
- **Test Metrics:** 19 passed, 0 failed, 0 skipped, 0 todo.

### 7.2 What the Test Suite Covers vs Does Not Cover
- **Covered:**
  - Status exclusion rules for `NEEDS_REVIEW`, `UNVERIFIED`, and `REJECTED` (Suites 1A–1D).
  - Field validations for URLs, dates, domains, and tiers (Suites 2A–2F).
  - Candidate deduplication by ID and normalized identity (Suites 3A–3B).
  - Legacy catalog matching against seed tools (Suites 4A–4C).
  - User balance and zero-write safety during dry-run planning (Suites 5A–5C).
  - Full 66-candidate repository JSON evaluation and preview generation (Suite 6A).
- **Gaps (To Address in Phase F.2):**
  - Only 1 of the 19 updates is individually asserted (`tool-chatgpt`). The other 18 are tested only in aggregate count.
  - Live transactional execution (`executeImportPipeline`) and rollback under failure are not tested with a mock Prisma transaction.

### 7.3 TypeScript & Build Evidence
- **Backend Typecheck:** `npm --prefix Backend run typecheck` (`tsc --noEmit`): **Exit Code 0** (0 errors).
- **Backend Build:** `npm --prefix Backend run build` (`npm run clean && tsc`): **Exit Code 0** (0 errors).

---

## 8. Audit Findings Classification & Remediation Matrix

| ID | Severity | Category | Description | Recommended Remediation |
| :---: | :---: | :--- | :--- | :--- |
| **F-1** | **HIGH** | Data Integrity | `tx.aiTool.update` passes full candidate payload (`item.data as any`), overwriting `name`, `provider`, `description`, `capabilities` rather than restricting to allowlisted metadata fields. | In Phase F.2, prune `item.data` during update to allowlisted fields only: `marketTier`, `pricingDetails`, `pricingSourceUrl`, `pricingVerifiedAt`, `lastVerifiedAt`, `domains`. |
| **F-2** | **HIGH** | Idempotency | `generateImportPreview` checks against static `SEED_TOOL_CATALOG` rather than live database. Re-running against an imported DB crashes on duplicate primary key creates. | In Phase F.2 live mode, query `prisma.aiTool.findMany({ select: { id: true } })` dynamically or use `tx.aiTool.upsert`. |
| **F-3** | **MEDIUM** | Performance | Interactive Prisma transaction defaults to 5s timeout, creating risk of abort under high query volume or latency. | Add explicit transaction options: `prisma.$transaction(async (tx) => { ... }, { timeout: 30000, maxWait: 10000 })`. |
| **F-4** | **LOW** | Documentation | Phase F.1 report prose mistakenly listed 4 tools (`paperpal`, `tome`, `beautiful-ai`, `zapier-ai`) under updates instead of creates. | Documented in this audit; resolved in preview JSON. |
| **F-5** | **LOW** | Test Coverage | Test suite does not test `executeImportPipeline` transaction rollback directly. | Add isolated unit test for `executeImportPipeline` in Phase F.2. |

---

## 9. Conclusion & Pre-Execution Recommendations

Phase F.1 has successfully created a safe, well-architected dry-run import pipeline that strictly excludes non-verified candidates and enforces catalog quality standards.

### Recommendations Before Authorizing Live Ingestion:
1. **Apply Phase F.2 Remediation:** Implement Finding F-1 (allowlist enforcement on updates) and Finding F-2 (dynamic existing record detection) before running live write mode.
2. **Apply Migration `0003_market_tools_catalog`:** Deploy the database migration to PostgreSQL to ensure `market_tier`, `pricing_source_url`, and `pricing_verified_at` exist before writing.
3. **Resolve Owner Decision D-3 (NotebookLM Tier):** Confirm whether Google NotebookLM should be classified as Tier 1 Free Entry or Tier 3 Market Scale.
4. **Maintain Write Guard:** Do not run `--execute-write-authorized-by-owner` until the remediation and migration are completed.

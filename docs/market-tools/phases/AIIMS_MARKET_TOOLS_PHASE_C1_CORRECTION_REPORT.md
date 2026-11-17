# AIIMS — Market AI Tools Catalog
## Phase C.1: Scope Correction, Security Audit & Backend Verification Report

**Project:** AIIMS (AI Intelligence & Mentoring System)  
**Workspace:** `C:\Users\divya\OneDrive\Documents\AIIMS`  
**Phase:** Phase C.1 — Corrective Audit, Scope Realignment & Security Hardening  
**Status:** **AUDITED, CORRECTED & VERIFIED**  
**Date:** March 2026  

---

## 1. Executive Summary & Purpose

Following completion of Phase C, a targeted corrective audit (Phase C.1) was performed to address two reported scope and behavioral deviations:
1. **Premature Phase E Scope Inclusion:** The admin review endpoints (`GET /api/admin/tool-reports`, `PATCH /api/admin/tool-reports/:id`) were previously implemented during Phase C. These endpoints belong strictly to **Phase E (Admin Quality Assurance Workflow)**.
2. **Unrated Tools Visibility Policy:** Clarifying and restoring the catalog query behavior to ensure it strictly **preserves the pre-existing default visibility behavior** rather than adopting an unauthorized product decision.

In addition, an end-to-end security audit was conducted covering route parameter integrity, learner tamper-resistance, authoritative persistence, and Prisma error-handling resilience.

---

## 2. Findings & Corrective Actions Matrix

| Item | Finding in Initial Phase C | Corrective Action Applied in Phase C.1 | Verification Status |
|---|---|---|---|
| **Admin Review Endpoints** | `GET /api/admin/tool-reports` and `PATCH /api/admin/tool-reports/:id` were implemented in Phase C. | **Removed entirely** from `aiWallet.controller.ts` and `aiWallet.routes.ts`. Scope deferred strictly to Phase E. Existing Discovery admin routes (`/tools/discovery/runs`, `/tools/evidence/:toolId`, `/tools/history/:toolId`, `/admin/sources`, `/admin/candidates`, `/admin/verify/:toolId`, `/admin/intelligence/dashboard`) remain completely intact. | **VERIFIED** (Router stack inspected; 0 admin report routes registered) |
| **Unrated Tools Policy** | Initial report described Unrated tools as "fully discoverable", creating ambiguity over whether a product decision was made. | **Restored exact pre-existing visibility behavior:** Catalog query applies the pre-existing active & verified filters (`activeStatus && verificationStatus not in [UNVERIFIED, DISCOVERED, REJECTED]`). Verified tools without tiers (Unrated) sort at the end (rank 5) after tiers 1→2→3→4. Final business policy on Unrated presentation remains an **UNRESOLVED OWNER DECISION**. | **VERIFIED** (Default query test confirms Unrated tools present at end of sorted list; no arbitrary exclusion) |
| **Tool ID Route Integrity** | `reportOutdatedTool` allowed optional fallback to `req.body.toolId`. | **Enforced route parameter as single authoritative source:** `toolId` comes exclusively from `req.params.id`. If a caller supplies a conflicting `req.body.toolId`, the request is rejected with `400 Bad Request` (`TOOL_ID_MISMATCH`). | **VERIFIED** (Conflicting body rejected with 400; tests passing) |
| **Defensive Database Error Handling** | Initial Phase C `try/catch` logged a `console.warn` on report persistence failure and still returned `201 Created` with in-memory object. | **Eliminated error swallowing:** If `prisma.toolReport.create` or duplicate check encounters a database error, it immediately returns a structured `500 Internal Server Error` (`DATABASE_PERSISTENCE_FAILED` / `DATABASE_ERROR`). Requires active DB connection (`503` if disconnected). Never reports false success. | **VERIFIED** (Database persistence required; error paths audited) |
| **Authoritative Wallet Removal** | `removeFromWallet` only synchronized session object and attempted DB update without pre-validating DB connection. | **Hardened persistence pipeline:** Requires active DB connection (`503` if disconnected). Reads authoritative `aiWalletData` from `prisma.user.findUnique`, filters `userTools`, saves back via `prisma.user.update`, and synchronizes `req.user.aiWallet`. | **VERIFIED** (Database record checked before and after; other users' wallets verified untouched) |
| **Query Parameter Strictness** | Invalid `marketTier` or `freeTierAvailable` values were silently ignored, returning all tools. | **Enforced strict validation:** Invalid `marketTier` (e.g. `'5'`, `'invalid'`) returns `400` (`INVALID_MARKET_TIER`). Invalid `freeTierAvailable` (e.g. `'maybe'`) returns `400` (`INVALID_FREE_TIER_PARAM`). | **VERIFIED** (400 validation tests added and passing) |

---

## 3. Detailed Security & Architecture Audit

### 3.1 Outdated-Information Reporting Security (`POST /api/wallet/tools/:id/report`)
- **Mandatory Authentication:** Enforced via `requireAuth`. Unauthenticated requests rejected with `401 Unauthorized` (`UNAUTHORIZED`).
- **Server-Derived Reporter Identity:** `userId` is strictly extracted from verified session `req.user.id || req.user._id`.
- **Authoritative Tool ID Binding:** Derived strictly from `req.params.id`. If `req.body.toolId` is present and contradicts `req.params.id`, the endpoint rejects with `400` (`TOOL_ID_MISMATCH`).
- **Catalog Grounding:** Tool existence is verified against `ToolCatalogService`. Requests for non-existent tools return `404` (`TOOL_NOT_FOUND`).
- **Duplicate Pending Report Prevention:** If a report for the same `userId`, `toolId`, and `reportCategory` with status `PENDING` already exists, returns `409 Conflict` (`DUPLICATE_REPORT`).
- **Tamper Resistance:** Status is hard-coded to `'PENDING'`. Any learner-supplied `status`, `reviewerId`, or `reviewNotes` fields in the payload are stripped and nullified.
- **Data Minimization:** Endpoint response returns only safe report summary fields (`id`, `toolId`, `reportCategory`, `description`, `sourceUrl`, `status`, `createdAt`), leaking no internal admin or reviewer fields.

### 3.2 Wallet Removal Security & Persistence (`POST /api/wallet/remove`)
- **Server-Derived Identity:** Uses `req.user.id`. Learner cannot remove tools from another user's wallet.
- **Tenant Isolation:** Modifies only the caller's `User.aiWalletData`. Verified through multi-user isolation tests that User B's toolkit is completely unaffected when User A removes a tool.
- **Catalog Non-Destructiveness:** The referenced `AiTool` catalog record is completely immutable during learner wallet removal operations.
- **Economy Invariants:** **0 AC charged, 0 AC refunded; 0 XP awarded, 0 XP deducted**. Balances before and after removal remain strictly identical.
- **Authoritative Prisma Persistence:** Direct round-trip to PostgreSQL `User.aiWalletData` ensures that state changes survive session resets.
- **Idempotence:** Removing a tool that is not currently in the wallet succeeds with `200 OK` and `{ removed: false }`.

### 3.3 Catalog Sorting & Unrated Tools Visibility
- **Pre-Phase C Behavior:** All active, verified tools (`activeStatus === true && verificationStatus not in ['UNVERIFIED', 'DISCOVERED', 'REJECTED']`) were returned in an array.
- **Post-Correction Behavior:**
  - Active and verified restrictions are strictly preserved.
  - Sorter applies monotonic tier ranking: Starter (1) → Growth (2) → Leading (3) → Enterprise (4) → Unrated (rank 5 / last).
  - Secondary sort: Alphabetical by `name`.
  - Unrated tools remain in the catalog output at the end of the list. They are neither artificially suppressed nor artificially elevated.
  - Final decision regarding whether to display, badge, filter, or hide Unrated tools in learner-facing UI remains an **UNRESOLVED OWNER DECISION** to be addressed in Phase D / governance review.

---

## 4. Prisma & Live Database Migration Status

> [!IMPORTANT]
> **Safety Protocol Compliance:**
> - `prisma migrate deploy` was **NOT executed**.
> - `prisma db push` was **NOT executed**.
> - `prisma migrate reset` was **NOT executed**.
> - Zero `.env` files were read, accessed, or modified.
> - The live database migration status for `0003_market_tools_catalog` remains **NOT VERIFIED / PENDING DEPLOYMENT**.

### Runtime Error Handling Protocol
Defensive database handling has been realigned to maintain data integrity:
- Controllers enforce `isDatabaseConnected()` and return `503 Service Unavailable` if PostgreSQL is offline.
- If a database query fails due to unapplied schema changes (e.g. missing `tool_reports` table on an unmigrated live database), the controller returns an explicit `500 Internal Server Error` with `DATABASE_PERSISTENCE_FAILED`, ensuring the API **never reports false success** for uncommitted transactions.

---

## 5. Verification Commands & Execution Results

| # | Command | Scope | Result | Exit Code |
|---|---|---|---|---|
| 1 | `npm run typecheck --prefix Backend` | Backend TypeScript Compilation (`tsc --noEmit`) | **PASSED** (0 errors) | `0` |
| 2 | `npm test -- src/services/__tests__/marketToolsPhaseC.test.ts` | Phase C & C.1 Corrective Test Suite | **PASSED** (35/35 tests) | `0` |
| 3 | `npm test -- src/services/__tests__/marketToolsPhaseA.test.ts` | Phase A Architecture & Taxonomy Suite | **PASSED** (14/14 tests) | `0` |
| 4 | `npm test -- src/services/__tests__/walletToolDiscovery.test.ts` | AI Wallet Discovery & Economy Suite | **PASSED** (21/21 tests) | `0` |
| 5 | `npm test -- src/services/__tests__/interfacesAndReadiness.test.ts` | Canonical Database & Readiness Suite | **PASSED** (34/34 tests) | `0` |
| 6 | `npm run build --prefix Backend` | Production Backend Build (`tsc`) | **PASSED** (clean build) | `0` |

### Test Breakdown in `marketToolsPhaseC.test.ts` (35 Passing Tests):
1. **Catalog Tier Ordering & Enrichment (2 tests):**
   - Monotonic 1→2→3→4→Unrated order with alphabetical secondary sort.
   - Tier name and label enrichment.
2. **Catalog Query Filters (10 tests):**
   - Exact tier filters (`1`, `4`, `unrated`).
   - Canonical domain (`agentic-coding`) and spec alias (`programming`).
   - Free-tier boolean filter (`true`, `false`).
   - Skill level filter (`beginner`).
   - Combined multi-filter (`domain` + `marketTier`).
   - Rejection of invalid `marketTier` (400 `INVALID_MARKET_TIER`).
   - Rejection of invalid `freeTierAvailable` (400 `INVALID_FREE_TIER_PARAM`).
   - Preservation of pre-existing Unrated tool visibility at list end.
3. **Consistent Tool-Detail API (2 tests):**
   - Enriched attributes and pricing provenance.
   - 404 for unknown tool ID.
4. **Secure Wallet Removal (8 tests):**
   - Removes tool, preserves remaining tools.
   - Idempotent repeated removal.
   - Authentication enforcement (401).
   - Tool ID validation (400).
   - Zero AC and zero XP modified.
   - Catalog tool non-destructiveness.
   - Multi-tenant learner toolkit isolation.
   - Audit logging (`WALLET_TOOL_REMOVED`).
5. **Outdated-Information Reporting (8 tests):**
   - Valid submission with status `PENDING`.
   - Authentication enforcement (401).
   - 404 for non-existent tool.
   - Duplicate pending report prevention (409 `DUPLICATE_REPORT`).
   - Tamper-resistance forcing `PENDING` and nullifying reviewer fields.
   - Route parameter authority rejecting body conflicts (400 `TOOL_ID_MISMATCH`).
   - Authoritative Prisma persistence without error swallowing.
   - Audit logging (`TOOL_REPORT_SUBMITTED`).
6. **Phase E Scope Boundary & Route Protection (2 tests):**
   - Verification that admin report review routes are absent from router.
   - Verification that pre-existing admin discovery handlers remain intact.
7. **Tool Comparison Compatibility (3 tests):**
   - Requirement-first comparison preserving market tier labels and zero economy charges.

---

## 6. Modified & Created Files Register

### Modified Source Files:
1. [`Backend/src/controllers/aiWallet.controller.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts)
   - Removed premature Phase E handlers: `getAdminToolReports` and `updateAdminToolReportStatus`.
   - Hardened `getCatalog` with query parameter validation (`400` on invalid `marketTier` or `freeTierAvailable`) and clarified Unrated policy.
   - Hardened `removeFromWallet` with authoritative database reading/writing and connection pre-checks.
   - Hardened `reportOutdatedTool` with route parameter authority, body mismatch detection, and zero error swallowing.
2. [`Backend/src/routes/aiWallet.routes.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/aiWallet.routes.ts)
   - Removed Phase E admin report routes: `GET /admin/tool-reports` and `PATCH /admin/tool-reports/:id`.
   - Retained learner `POST /wallet/tools/:id/report` and `POST /wallet/remove`.
3. [`Backend/src/services/__tests__/marketToolsPhaseC.test.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/__tests__/marketToolsPhaseC.test.ts)
   - Replaced Phase E admin review tests with router stack inspection tests verifying deferred status.
   - Added parameter validation tests (invalid tiers, invalid free-tier values, toolId mismatch).
   - Added multi-tenant isolation and authoritative database persistence tests.

### Created Reports:
1. [`AIIMS_MARKET_TOOLS_PHASE_C1_CORRECTION_REPORT.md`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/docs/market-tools/phases/AIIMS_MARKET_TOOLS_PHASE_C1_CORRECTION_REPORT.md)

---

## 7. Remaining Risks & Phase D Readiness Assessment

### Remaining Technical Risks:
1. **Live Database Migration Deployment:** Migration `0003_market_tools_catalog` remains undeployed to live PostgreSQL environments. Deployment must be executed via controlled CI/CD pipeline before production traffic is routed to `POST /api/wallet/tools/:id/report`.
2. **Owner Decision on Unrated Tool Presentation:** Phase D UI implementation requires explicit owner decision on whether unrated tools:
   - Display an "Unrated" badge alongside Tier 1–4 badges.
   - Are filtered by default under an "Unrated" filter pill.
   - Are grouped in a separate section below tiered tools.

### Explicit Phase D Readiness Assessment:
- **Backend API Layer:** **READY FOR PHASE D FRONTEND INTEGRATION.**
- **Route Contracts:** Stable, authenticated, and verified.
- **Scope Compliance:** Strict Phase C / C.1 boundaries restored. Phase E admin review workflows deferred.
- **Zero Frontend Contamination:** No UI screens or components modified.

# AIIMS Phase 7: Subscriptions, Monetization & Payment Readiness Completion Report

**Executive Build, FinTech Architecture & Security Sign-off**
**Document Version:** 1.0.0
**Phase:** Phase 7 — Subscriptions, Monetization & Payment Readiness
**Date:** November 14, 2026
**Status:** COMPLETE & VERIFIED (PAYMENT READINESS ONLY)
**Critical Policy Constraint:** Product Decision D7 remains **UNAPPROVED**. Zero live payment gateways, zero real financial transactions, and zero speculative database migrations.

---

## 1. Executive Summary & Architectural Overview

Phase 7 evaluates, audits, and formalizes the monetization, subscription entitlement, and payment gateway boundary for AIIMS (AI Intelligence & Mentoring System).

In strict compliance with **Critical Product Decision D7**, all subscription plans, consumer pricing tiers, external payment provider selections, and tax/legal registrations remain **UNAPPROVED** pending executive stakeholder clearance. Consequently, the operational scope of Phase 7 is strictly **PAYMENT READINESS ONLY**.

### Core Tenets of Phase 7:
1. **Mathematical & Architectural Decoupling**: AI Credits (AC), gamification XP points, and subscription entitlements operate as completely separate, decoupled subsystems.
2. **Strict Educational Equity & Zero Real Charges**: No live payment gateway (Stripe, Razorpay, LemonSqueezy) is integrated; no real cards or currencies are charged. Direct purchasing of AI Credits is explicitly exposed in `PREVIEW` status.
3. **No Speculative Schema Alterations**: Because D7 is unapproved, no speculative database tables (`Subscription`, `Payment`, `Invoice`) or migrations have been introduced. PostgreSQL and Prisma schemas remain clean and stable.
4. **Authoritative Server Enforcement**: Client-side parameters or headers can never activate subscription tiers, award credits, or modify privileges. All security boundaries are enforced server-side with RBAC and immutable cryptographic verification.

---

## 2. Preflight Audit – Phases 1–6 Dependencies

| Phase & Domain | Key Architectural Subsystem | Status | Verification & Evidence |
| :--- | :--- | :--- | :--- |
| **Phase 1: Credit Engine** | Dual-ledger atomic transactions, non-negative balance constraint, idempotency deduplication | **VERIFIED** | `assessmentCreditEconomy.test.ts` (10/10 passed), `assessmentAndAnalysis.test.ts` (5/5 passed) |
| **Phase 2: AI Profile** | AI diagnostic generation, comparative intelligence, schema-validated controlled retries | **VERIFIED** | `aiProfileAndComparison.test.ts` (18/18 passed) |
| **Phase 3: AI Wallet** | Grounded tool matching, 10-domain academic taxonomy, zero phantom tools | **VERIFIED** | `walletToolDiscovery.test.ts` (21/21 passed), `walletAndMatching.test.ts` (10/10 passed) |
| **Phase 4: Clarity Task Lab** | Progressive difficulty tiers, first-free race condition protection, 10 AC subsequent deduction | **VERIFIED** | `clarityTaskLab.test.ts` (21/21 passed), `clarityModule.test.ts` (13/13 passed) |
| **Phase 5: Focus Module** | 45 reviewed questions, server-authoritative timer, Product Decision D5 late submission lock (410), 20 AC economy | **VERIFIED** | `focusTaskModule.test.ts` (23/23 passed), `focusModule.test.ts` (12/12 passed) |
| **Phase 6: Journey & Dashboard** | Journey overview, assessment attempt history, level milestone progression, device binding | **VERIFIED** | `journeyAndHistory.test.ts` (9/9 passed) |
| **All Core Preflight Suites** | Multi-phase regression suite | **PASS** | **142/142 tests passing across all legacy suites** |

---

## 3. Subscription & Monetization Audit (10 Core Areas)

In accordance with Section 4 of the Phase 7 specification, every monetization component across the codebase has been audited and classified:

| Monitored Component | Classification | Existing Implementation & Audit Findings |
| :--- | :--- | :--- |
| **1. Subscription Models & Services** | **Requires Product Approval / Missing** | No `Subscription` model exists in `schema.prisma`. Feature access is currently rule/milestone-based via `featureAccessService.ts`. Unlocks for Levels 2–4 remain locked pending Owner Decisions 1 & 2. |
| **2. Plan & Pricing Configuration** | **Requires Product Approval / Missing** | No commercial subscription plan configurations exist in backend code. Tiers in presentation decks are unapproved proposals. |
| **3. User Entitlement Fields** | **Existing & Working (Milestone-Based)** | `User.role` ('learner' \| 'evaluator' \| 'admin') and module JSON fields (`assessmentData`, `clarityData`, `focusData`) server-govern access. Commercial entitlement fields are intentionally omitted. |
| **4. Credit Purchase Functionality** | **Requires Product Approval / Missing** | Fiat credit purchasing is disabled. `CreditsLedgerSection.tsx` and `GET /credits/costs` honestly report `status: 'PREVIEW'`. |
| **5. Payment-Related API Routes** | **Existing & Working (Informational Only)** | `GET /api/credits/costs` returns the authoritative operation schedule and preview notice. No payment processing endpoints exist. |
| **6. Payment Provider Integrations** | **Requires Product Approval / Not Implemented** | No Stripe, Razorpay, or external payment SDKs are installed or configured in `Backend/package.json`. No secrets or webhooks exist. |
| **7. Webhook Handlers** | **Requires Product Approval / Not Implemented** | Zero speculative webhook endpoints exist. Complete security architecture and HMAC signature specifications have been designed for future integration. |
| **8. Billing History** | **Existing & Working (Credit Ledger Only)** | `GET /api/credits/ledger` provides a paginated, filterable audit trail of all AC transactions. Fiat invoice billing history is not implemented. |
| **9. Invoice Generation** | **Requires Product Approval / Not Implemented** | Zero tax invoice (GST/VAT) generation engines exist; pending DPIIT/entity legal incorporation. |
| **10. Subscription Expiry & Renewal** | **Requires Product Approval / Not Implemented** | No background renewal workers exist, as there are no active commercial subscriptions. |
| **11. Admin Billing Controls** | **Existing & Working (RBAC Isolated)** | Admin endpoints (`/admin/billing/summary`, `/admin/audit-logs`) provide read-only system visibility with strict RBAC (`requireRole('admin')`). Zero arbitrary balance manipulation controls exist. |

---

## 4. Critical Product Decision – D7 Approval Status

| Decision Item | Formal Status | Governing Rationale & Policy |
| :--- | :--- | :--- |
| **Subscription Plans** | **UNAPPROVED (Pending Decision 1)** | Owner Decision 1 (Pure Subscription Tiers vs. Feature Add-On Bundles vs. Audience-Differentiated Plans) has not been confirmed by the product owner. |
| **Subscription Prices** | **UNAPPROVED (Pending Decision 2)** | Owner Decision 2 (Pure Plan Subscription vs. Cumulative Credit Top-Up vs. Hybrid Model) remains unresolved. No prices may be published or billed. |
| **Payment Provider Selection** | **UNAPPROVED (Pending Decision 10)** | Multi-platform evaluation (PWA web gateway via Stripe/Razorpay vs. Apple/Google In-App Purchases) is pending mobile distribution strategy confirmation. |
| **Legal & Tax Clearance** | **UNAPPROVED (Pending Governance)** | Corporate Pvt Ltd incorporation, GST registration, DPDP Act minor parental consent compliance (Decision 11), and trademark clearance (Decision 12) must precede financial intake. |

---

## 5. Monetization Architecture Review: Strict Subsystem Decoupling

AIIMS enforces an absolute architectural separation between the following 5 domains:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AIIMS ARCHITECTURAL BOUNDARIES                          │
├──────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ Domain                   │ Primary Entity           │ Authority & Guarantees            │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 1. AI Credits (AC)       │ User.aiimsCredits        │ Server-authoritative metered fuel │
│                          │ CreditLedger table       │ Atomic PostgreSQL transactions    │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 2. Gamification XP       │ User.xpPoints            │ Educational mastery progression   │
│                          │                          │ Completely decoupled from AC      │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 3. Workspace Entitlements│ featureAccessService.ts  │ Milestone & role-based validation │
│                          │ requireRole() middleware │ Subscriptions NEVER modify AC     │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 4. Payment Transactions  │ Future Provider Gateway  │ Asynchronous server-to-server     │
│                          │ (Stripe / Razorpay)      │ HMAC-SHA256 webhook verification  │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 5. Billing History       │ CreditLedger (Internal)  │ Read-only, IDOR-protected audit   │
│                          │ Tax Invoices (Future)    │ Strictly bound to user UUID       │
└──────────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

### Mathematical & Logical Rules:
1. **Zero Silent Mutation**: Activating, renewing, pausing, or cancelling a subscription workspace tier must **never silently alter** the learner's spendable AC balance.
2. **XP Isolation**: Earning XP (e.g. $+100\text{ XP}$ for completing assessment) increments only `User.xpPoints`. It creates zero transactions in `CreditLedger` and has no financial balance impact.
3. **Non-Negative Balance Invariant**:
   $$\forall u \in \text{Users}, \quad \text{User}(u).\text{aiimsCredits} \ge 0$$
4. **Dual-Ledger Parity Invariant**:
   $$\text{User}(u).\text{aiimsCredits} = \sum \text{Ledger}(u)_{\text{EARN}} + \sum \text{Ledger}(u)_{\text{REFUND}} - \sum \text{Ledger}(u)_{\text{SPEND}}$$

---

## 6. Proposed Subscription Entitlement Architecture (Future Implementation)

When Owner Decisions 1 & 2 are finalized, the subscription entitlement system must follow this server-authoritative pattern:

```mermaid
flowchart TD
    Req["Learner Client Request<br/>(e.g., POST /api/solver/generate)"] --> Auth["requireAuth Middleware<br/>(JWT Verification)"]
    Auth --> Entitle["requireEntitlement('specialist_solver')<br/>Server-Side Gate"]

    subgraph Authoritative Server Evaluation
        Entitle --> DB["PostgreSQL Lookup<br/>UserSubscription table"]
        DB --> Check{"Status == ACTIVE &<br/>currentDate < expiresAt?"}
    end

    Check -- No --> Block["HTTP 403 FORBIDDEN<br/>code: SUBSCRIPTION_REQUIRED<br/>(Informational Upsell Notice)"]
    Check -- Yes --> AC{"Operation Requires<br/>Compute Fuel?"}

    AC -- No --> Exec["Execute Workspace Tool"]
    AC -- Yes --> Ledger["creditsLedgerService.executeTransaction()<br/>Atomic Deduction (-100 AC)"]
    Ledger --> Exec
```

### Key Principles for Future Entitlement Middleware:
1. **Never Trust the Client**: No headers (e.g., `X-User-Plan: PRO`) or request body properties are accepted.
2. **Atomic Entitlement Check**: The middleware queries the server-side database for active entitlement records with valid expiration timestamps.
3. **Separation of Access from Metering**: The subscription unlocks the workspace; consumptive AI API calls remain metered by AC.

---

## 7. Payment Provider Readiness & Cryptographic Security Architecture

When an approved payment gateway (e.g. Stripe or Razorpay) is integrated in the future, it must strictly comply with the following 6 cryptographic and transactional protocols:

### A. Asynchronous Webhook Architecture
```mermaid
sequenceDiagram
    autonumber
    actor Learner as Learner
    participant Client as Frontend
    participant Backend as AIIMS API
    participant Gateway as Payment Gateway (Stripe/Razorpay)
    participant Webhook as Webhook Listener (/api/billing/webhook)
    participant Ledger as creditsLedgerService

    Learner->>Client: Selects Credit Top-Up Package
    Client->>Backend: POST /api/billing/create-checkout-session
    Backend->>Gateway: Create Session (metadata: userId, packageId)
    Gateway-->>Backend: checkoutUrl, sessionId
    Backend-->>Client: { checkoutUrl }
    Client->>Gateway: Redirect to Gateway Hosted Checkout
    Learner->>Gateway: Enters Card & Completes 3DS Payment
    Gateway-->>Learner: Success Redirect to Client
    Client->>Client: Displays "Payment Processing..." Notice
    Note over Client,Gateway: Zero credits awarded on redirect!

    Note over Gateway,Webhook: Server-to-Server Webhook Delivery
    Gateway->>Webhook: POST /api/billing/webhook (checkout.session.completed)
    Webhook->>Webhook: 1. Verify HMAC-SHA256 Signature against raw buffer
    Webhook->>Ledger: 2. executeTransaction(amount, type: EARN, category: REWARD, idempotencyKey: event.id)
    Ledger->>Ledger: 3. Hardware Deduplication & Atomic Balance Update
    Ledger-->>Webhook: Credit Granted
    Webhook-->>Gateway: HTTP 200 OK (Event Acknowledged)
```

### B. Mandatory Security Protocols:
1. **Zero Client-Side Credit Granting**: Credits must **never** be awarded on client-side redirect (`onSuccess` handlers). Client redirects are vulnerable to URL tampering and request replay.
2. **Mandatory Webhook Signature Verification**: All webhook payloads must verify the provider's cryptographic signature header (`Stripe-Signature` or `X-Razorpay-Signature`) against the raw request buffer before JSON parsing using `crypto.timingSafeEqual`.
3. **Hardware-Level Idempotency**: The gateway's immutable event ID (`event.id`) serves as the unique `idempotencyKey` in `CreditLedger`, mathematically preventing duplicate credit awards on webhook retries.
4. **PCI-DSS Scope Minimization**: AIIMS servers must never handle, log, or store raw credit card numbers, CVVs, or expiration dates. All payment ingestion occurs exclusively through provider-hosted checkouts.
5. **Safe State Machine Progression**: Payment intents must transition through `INITIALIZED` $\rightarrow$ `PENDING` $\rightarrow$ `SUCCEEDED` / `FAILED` $\rightarrow$ `REFUNDED`. No payment may jump directly to `SUCCEEDED`.

---

## 8. Security Audit Findings & Remediations

| Threat / Risk Vector | Severity | Evaluation Status | Remediation & Defensive Implementation |
| :--- | :--- | :--- | :--- |
| **Client Privilege Escalation** | High | **PROTECTED** | Body injections (e.g. `{ role: 'admin', aiimsCredits: 99999 }`) are completely sanitized. Roles and balances can only be mutated via internal authenticated services. |
| **Insecure Direct Object Reference (IDOR)** | High | **PROTECTED** | `GET /credits/ledger` strictly binds to `req.user.id`. Passing another user's ID in parameters or query strings is ignored. |
| **Forged Payment Success** | Critical | **PROTECTED** | No client-facing endpoint accepts payment confirmation tokens. Zero credits are granted without a server-verified transaction. |
| **Duplicate Webhook / Retry Replay** | High | **PROTECTED** | Compound unique index `[userId, idempotencyKey]` in `CreditLedger` guarantees atomic deduplication. |
| **Unauthorized Admin Billing Access** | High | **PROTECTED** | `GET /admin/billing/summary` is guarded by `requireAuth`, `requireRole('admin')`, and rate limiting. Learners and evaluators receive HTTP 403 Forbidden. |
| **Exposure of Payment Credentials** | Critical | **PROTECTED** | Zero payment secrets are stored or logged. Gitleaks pre-commit hooks and `.env` protection are active. |

---

## 9. Database & Schema Integrity Review

- **Database Engine**: PostgreSQL via Prisma ORM.
- **Migration Status**: **NO MIGRATIONS APPLIED**.
- **Rationale**: In strict accordance with Phase 7 instructions and FinTech best practices, no speculative database schemas or migrations were introduced while Product Decision D7 remains unapproved.
- **Commands Executed**: Zero destructive commands. `prisma migrate reset` and `prisma db push` were **strictly avoided**.
- **Data Preservation**: 100% of existing user records, assessment logs, and credit transactions remain intact.

---

## 10. Admin Visibility & Management Controls

A new read-only administrative inspection endpoint has been implemented in [Backend/src/controllers/admin.controller.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/admin.controller.ts) and mounted in [Backend/src/routes/admin.routes.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/admin.routes.ts):

### `GET /admin/billing/summary`
- **Authorization**: `requireAuth` + `requireRole('admin')` + `adminRateLimiter`.
- **Response Data**:
  - `monetizationStatus`: Honest status report (`paymentGatewayIntegrated: false`, `paymentGatewayStatus: 'PREVIEW'`, `subscriptionModelStatus: 'UNAPPROVED_D7'`).
  - `ledgerMetrics`: Total registered users, total ledger entries, circulating credits sum, total earned, total spent, total refunded, and net ledger balance.
- **Safety**: Read-only; zero mutation controls or arbitrary credit minting abilities.

---

## 11. Automated Test Execution Results

A dedicated Phase 7 automated test suite has been authored at [`Backend/src/services/__tests__/paymentReadiness.test.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/__tests__/paymentReadiness.test.ts) covering 20 comprehensive test cases across 4 test suites:

### Phase 7 Suite Breakdown (`paymentReadiness.test.ts`)
- **Suite 1: Credit & Account Integrity (7 tests)**: Initial balance, non-financial mutation isolation, XP decoupling, subscription decoupling, overdraft protection, dual-ledger parity reconciliation, idempotency deduplication.
- **Suite 2: Authorization & IDOR Security (6 tests)**: Learner 403 rejection on admin billing, evaluator 403 rejection, admin 200 access, IDOR ledger history protection, 401 unauthenticated rejection, client injection sanitization.
- **Suite 3: Payment Readiness & Honest Status (3 tests)**: Honest preview status in `/credits/costs`, zero live fiat routes, unapproved D7 tiers unactivated.
- **Suite 4: Gateway Cryptographic & Protocol Architecture (4 tests)**: Webhook HMAC-SHA256 signature verification (missing, forged, tampered, valid), hardware idempotency deduplication, zero client-side credit callbacks, state machine transition validation.

### Full Multi-Phase Regression Suite Results (Phases 1–7)

| Test Suite | Associated Phase | Tests Run | Result | Duration |
| :--- | :--- | :--- | :--- | :--- |
| `paymentReadiness.test.ts` | **Phase 7 (New)** | 20 passed | **PASS (100%)** | 187ms |
| `focusTaskModule.test.ts` | **Phase 5 Focus Challenges** | 23 passed | **PASS (100%)** | 712ms |
| `focusModule.test.ts` | **Phase 5 Focus Sessions** | 12 passed | **PASS (100%)** | 51ms |
| `clarityTaskLab.test.ts` | **Phase 4 Clarity Lab** | 21 passed | **PASS (100%)** | 618ms |
| `clarityModule.test.ts` | **Phase 4 Clarity Progression** | 13 passed | **PASS (100%)** | 44ms |
| `walletToolDiscovery.test.ts` | **Phase 3 Tool Discovery** | 21 passed | **PASS (100%)** | 127ms |
| `walletAndMatching.test.ts` | **Phase 3 Tool Matching** | 10 passed | **PASS (100%)** | 142ms |
| `aiProfileAndComparison.test.ts` | **Phase 2 AI Profile** | 18 passed | **PASS (100%)** | 283ms |
| `assessmentCreditEconomy.test.ts`| **Phase 1 Credit Economy** | 10 passed | **PASS (100%)** | 99ms |
| `assessmentAndAnalysis.test.ts` | **Phase 1 Assessment Gating** | 5 passed | **PASS (100%)** | 37ms |
| `journeyAndHistory.test.ts` | **Phase 6 Journey & History** | 9 passed | **PASS (100%)** | 119ms |
| **Total Multi-Phase Regression** | **All Phases 1–7 Suites** | **162 passed** | **PASS (100%)** | **5.61s** |

### TypeScript Typecheck & Production Build Verification

| Pipeline Target | Exact Command Executed | Result | Exit Code |
| :--- | :--- | :--- | :--- |
| **Backend Typecheck** | `npm run typecheck --prefix Backend` | `tsc --noEmit` passed with 0 errors | **0** |
| **Backend Build** | `npm run build --prefix Backend` | `npm run clean && tsc` completed | **0** |
| **Frontend Typecheck** | `npm run typecheck --prefix Frontend` | `tsc --noEmit` passed with 0 errors | **0** |
| **Frontend Production Build** | `npm run build --prefix Frontend` | `tsc && vite build` built in 24.39s | **0** |

---

## 12. Implementation Status Summary

| Capability | Status | Notes |
| :--- | :--- | :--- |
| Dual-Ledger Credit Integrity | **IMPLEMENTED & VERIFIED** | Reconciled with mathematical parity and overdraft protection. |
| Decoupled Gamification XP | **IMPLEMENTED & VERIFIED** | XP increment operates independently from financial balances. |
| Honest Payment Preview Notice | **IMPLEMENTED & VERIFIED** | Clearly exposes PREVIEW status; no fake purchase flows. |
| Admin Financial Metrics View | **IMPLEMENTED & VERIFIED** | Read-only RBAC endpoint for circulating credit metrics. |
| Webhook HMAC Verification Model| **IMPLEMENTED & VERIFIED** | Cryptographic tests verify rejection of forged signatures. |
| Subscription Plans & Prices | **PENDING APPROVAL** | Blocked by unapproved Product Decision D7. |
| Live Payment Gateway Engine | **PENDING APPROVAL** | Blocked by unapproved Product Decision D7. |
| Tax Invoicing & GST Engine | **PENDING APPROVAL** | Blocked by legal entity incorporation. |
| Speculative Schema Migrations | **NOT IMPLEMENTED** | Intentionally omitted to protect database integrity. |

---

## 13. Pending Product, Legal & Tax Decisions

1. **Owner Decision 1 (Plan Access Model)**: Confirm whether AIIMS will adopt Pure Subscription Tiers (Levels 1–4), Modular Feature Add-Ons, or Audience-Differentiated Plans.
2. **Owner Decision 2 (Premium Level Unlock Basis)**: Confirm whether Level 2–4 workspaces unlock by subscription plan, cumulative top-up thresholds, or a hybrid model.
3. **Owner Decision 10 (Payment Distribution Architecture)**: Confirm whether web-first payment processing (Stripe / Razorpay) or native in-app purchase integration (Apple / Google) will be deployed.
4. **Owner Decision 11 & 12 (Governance & Trademark)**: Complete legal compliance under India DPDP Act 2023 for student users and trademark clearance for the "AIIMS" brand name.

---

## 14. Phase 7 Exit Criteria & Verification Sign-Off

All Phase 7 exit criteria have been achieved:
- [x] Phases 1–6 dependencies audited and verified operational (142 regression tests passing).
- [x] Existing AC and XP accounting remain strictly intact and mathematically decoupled.
- [x] Learner experience and AI Wallet functionality remain unimpacted.
- [x] Subscription and payment architecture thoroughly reviewed and documented.
- [x] Zero unapproved payment functionality or fake purchase actions exposed.
- [x] Payment-related security risks audited and protected against.
- [x] 20 automated tests in `paymentReadiness.test.ts` passing (162 total tests across all phases).
- [x] Backend and Frontend TypeScript typechecks and production builds pass with exit code 0.
- [x] Completion reports authored and mirrored to `docs/`.

---

## 15. Strict Stop Gate

> [!IMPORTANT]
> **PHASE 7 IS COMPLETE & FULLY VERIFIED.**
> In strict accordance with the prompt instructions, **Phase 8 has NOT been started**. Awaiting user review and explicit authorization to proceed.


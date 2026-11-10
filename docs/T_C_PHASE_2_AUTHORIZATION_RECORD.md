# AIIMS — T-C Phase 2 Owner Authorization Record

**Document Status:** OFFICIAL PRODUCT OWNER AUTHORIZATION
**Task ID:** `T-C` — Live AI Scoring Verification (Phase 2)
**Date of Authorization:** 2026-11-08
**Repository Branch:** `main`
**Base Commit:** `43db7129773d52bddc8902a0d268e6fc2adbd846` (`43db712`)

---

## 1. Traceable Owner Authorization Record

| Record Field | Detail |
| :--- | :--- |
| **Approver Name** | **Divya** |
| **Approver Role** | **Product Owner** |
| **Authorization Date** | **2026-11-08** |
| **Scope of Approval** | **T-C Phase 2 Controlled Live Run under decisions A, B, C** |
| **Exact Authorization Statement** | *"I authorize T-C Phase 2 controlled live run under decisions A, B, C."* |
| **Evidence Source** | Product Owner's explicit written authorization granted in conversation on 2026-11-08. |
| **Provenance Note** | This authorization evidence was established directly by the Product Owner in the conversation on 2026-11-08. It did not exist in the repository prior to this execution. |

---

## 2. Approved Operational Parameters (Decisions A, B, C)

1. **Decision A — Provider Designation:**
   - **Primary Provider:** Google Gemini (`GEMINI_API_KEY`).
   - **Secondary Provider (Claude):** Strictly disabled for this run.

2. **Decision B — Model Selection:**
   - **Primary Model ID:** `gemini-3.1-flash-lite` (Confirmed active GA).
   - **Fallback Model (`gemini-3.8-flash`):** Strictly disabled for this controlled run. No automatic provider fallback.

3. **Decision C — Hard Request Limit & Isolation:**
   - **Maximum Outbound Provider Requests:** Exactly **two (2)** requests maximum:
     1. One (1) genuine Clarity evaluation.
     2. One (1) genuine Focus evaluation (`qb-check-easy-01`).
   - **Request Limiter:** A shared hard request counter must block any 3rd outbound attempt before network access.
   - **No Retries:** Application and SDK retries set to zero.
   - **Database Isolation:** Strictly isolated to `aiims_test` (MongoDB Atlas). Production databases and real learner credits are completely forbidden.

---

## 3. Preservation of Prior Decisions

- **Owner Decision 13:** Fully **APPROVED** and ratified on 2026-11-07 ([`docs/OWNER_DECISION_REGISTER.md`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/docs/OWNER_DECISION_REGISTER.md#L205) and [`docs/T3_OWNER_DECISION_RECORD.md`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/docs/T3_OWNER_DECISION_RECORD.md)). Focus challenge reward rules (Fast: 20 AC, Normal: 15 AC, Over-time: 0 AC) and server-side timing authority remain active and unchanged.


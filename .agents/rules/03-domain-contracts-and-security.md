# Rule 03: Domain Contracts, Security & Critical Subsystems

## 1. Authentication & Role-Based Access Control (RBAC)
- All protected endpoints must enforce `authMiddleware` extracting and verifying the JWT bearer token.
- Passwords must be hashed using `bcrypt` (or upgraded via `migratePasswords.ts`). Never store or log plaintext passwords.
- Respect persona and role boundaries: `Student`, `Entrepreneur`, `Evaluator`, and `Admin`.
- Under-18 age gating and safeguards must remain enforced on registration.

## 2. Credits System & Transaction Ledger Invariants
The AIIMS Credits System (`aiimsCredits`) governs platform usage, task rewards, and AI tool investments. The following rules are non-negotiable:
1. **Atomic Transactions:** Deductions and rewards must execute atomically to prevent race conditions.
2. **Sequential & Concurrent Idempotency:** Award actions (e.g., Clarity completion, Signal investigation, Quest level unlock, Assessment submission) must verify `claimedActions` to prevent duplicate claims.
3. **Overdraft Protection:** Ensure `balance >= spendAmount` before deducting credits. Return HTTP 400 with an explicit insufficient-funds error on overdraft attempts.
4. **Dual-Ledger Synchronization:** Every credit adjustment must synchronize `User.aiimsCredits` and record an immutable entry in `CreditLedger.model.ts` (or state transaction ledger).
5. **Tamper Prevention:** Protect against state overwrite attacks (e.g. `PUT /api/learner/state` must never allow arbitrary client-specified credit balance overrides).

## 3. Light & Dark Theme System
- All styling must integrate with the theme engine defined in `Frontend/src/theme/theme.ts` and `Frontend/src/context/ThemeContext.tsx`.
- Use semantic CSS variables (e.g., `var(--bg-primary)`, `var(--text-primary)`, `var(--card-bg)`, `var(--border-color)`) defined in `Frontend/src/index.css`.
- Never use hardcoded hex colors or inline styles that fail in either Light or Dark mode.

## 4. API Contracts & External Integrations
- Preserve HTTP status codes: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.
- External AI integrations (Astra TTS, OpenAI/Gemini endpoints) must feature graceful fallbacks when offline or unconfigured.

# AIIMS Project Instructions & Agent Guidelines

> This document inherits all guidelines and behavioral rules defined in [AGENTS.md](./AGENTS.md).

Please refer to [AGENTS.md](./AGENTS.md) and the modular rule specifications in [.agents/rules/](./.agents/rules/) (specifically `00-prompt-0-core-rules.md`) for all coding standards, security constraints, credits ledger requirements, and verification protocols.

## Prompt 0: Core Task Rules
- **Targeted Changes Only:** Make only the changes the task asks for. Do not refactor unrelated code, rename files, or change public API shapes unless the task says so.
- **Strict `.env` Protection:** NEVER open, print, copy, or modify any `.env` file. Only `.env.example` may be edited.
- **Zero Secrets Leakage:** Never hard-code secrets, API keys, or personal data.
- **Preserve Existing UI & Brand:** Keep existing features, labels, and screen content unchanged unless the task explicitly says to change them. The product name is "AIIMS" everywhere.
- **Type Safety & Style Consistency:** Keep the existing code style and type safety. No `any` unless the surrounding code already uses it. No new dependencies unless the task allows it; if one is needed, name it and explain why in the final summary.
- **Server-Side Enforcement:** Every server-side permission check must be enforced on the server. UI hiding is never security.
- **Credits System Integrity:** Money-like data (credits) changes only through the credits ledger service, inside a transaction, with an idempotency key.
- **Post-Task Verification:** After the work, run the checks in the task (typecheck, tests, build) and fix what you broke.
- **Structured Summary:** Finish with a short summary: files changed, what changed in each, commands run with results, and anything you could not verify.


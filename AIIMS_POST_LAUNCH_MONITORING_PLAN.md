# AIIMS — Post-Launch Monitoring & Reliability Plan

**Document Version:** 1.0.0
**Effective Date:** 12 November 2026
**Target Specification:** AIIMS Master Project Specification v2.0
**Application:** AIIMS (AI Intelligence & Mentoring System)
**Scope:** Observability, Alerting, Incident Response, and Maintenance Schedules

---

## 1. Observability Architecture & Strategy

The AIIMS platform implements a three-pillar observability architecture across the user journey:

```
┌─────────────────────────────────────────────────────────────┐
│                       OBSERVABILITY PILLARS                 │
├──────────────────────────┬──────────────────────────────────┤
│ 1. Health & Liveness     │  /health, /ready, Container probes│
│ 2. Telemetry & Metrics   │  CPU, Memory, DB Pool, Latency   │
│ 3. Structured Logging    │  Morgan JSON, Sentry, AuditLogs  │
└──────────────────────────┴──────────────────────────────────┘
```

### 1.1 Logging Standards
- **Structured JSON Logs:** All backend request logs include timestamp, method, path, response status, duration ms, IP (via proxy), and `requestId`.
- **Zero Sensitive Data Exposure:** Request and error logs strictly scrub passwords, tokens, API keys, database credentials, and raw credit card/PII data.
- **Audit Logs:** Security-critical operations (device resets, account deletions, role escalations) write to the immutable `audit_logs` table in PostgreSQL.

---

## 2. Health & Readiness Probes

### 2.1 Backend Health Endpoints

| Endpoint | HTTP Method | Expected Status | Semantic Purpose | Probe Type |
| :--- | :---: | :---: | :--- | :--- |
| `/health` | `GET` | `200 OK` | Process liveness. Reports service version and uptime. Fails if server process is frozen. | Container Liveness |
| `/ready` | `GET` | `200 OK` (Ready)<br>`503 Service Unavailable` | Evaluates live PostgreSQL connection pool and query execution. | Ingress / Traffic Router |
| `/api/health` | `GET` | `200 OK` | Alias for reverse proxy compatibility. | Public Health Check |
| `/api/ready` | `GET` | `200 OK` | Alias for reverse proxy compatibility. | Public Readiness Check |

### 2.2 Expected Responses
**Readiness Success (200 OK):**
```json
{
  "status": "ready",
  "database": "connected"
}
```

**Readiness Failure (503 Service Unavailable):**
```json
{
  "status": "not_ready",
  "database": "disconnected"
}
```

---

## 3. Incident Severity Levels & Alerting Matrix

| Severity | Definition & Trigger Conditions | Target Response Time | Notification Channels | Escalation Path |
| :--- | :--- | :---: | :--- | :--- |
| **P1 — Critical** | • `/ready` returns 503 for > 60 seconds<br>• PostgreSQL connection pool exhausted<br>• HTTP 5xx rate > 5% over 5 minutes<br>• Credit ledger atomic transaction failures<br>• Container restart loops (crashback) | **< 15 minutes** | PagerDuty / Opsgenie / Phone Call | On-Call SRE → Lead Backend Architect → VP Engineering |
| **P2 — High** | • p95 API response time > 2000ms for > 10m<br>• Anthropic/Gemini AI provider failure rate > 10%<br>• Host CPU > 85% or Memory > 90% for 15m<br>• Storage volume utilization > 80% | **< 1 hour** | Slack `#alerts-high` / SMS | On-Call SRE → Primary DevOps Engineer |
| **P3 — Medium** | • Elevated 401/403 auth rejections (rate-limiting)<br>• Single-device binding reset surge<br>• Sentry non-fatal exception warnings | **< 4 hours** | Slack `#alerts-general` / Email | Platform Team (Business Hours) |
| **P4 — Low** | • Deprecated endpoint usage notice<br>• Incomplete assessment drop-offs | **Next Business Day** | Weekly Digest Ticket | Product & Analytics |

---

## 4. Key Metrics & Monitoring Thresholds

### 4.1 System & Infrastructure Metrics
- **Host CPU Usage:** Warning at 70%, Alert at 85% sustained for 15 minutes.
- **Host RAM Utilization:** Warning at 80%, Alert at 90% (mitigates OOM kills on Node.js process).
- **Disk Storage (Database & Server):** Warning at 75%, Alert at 85%.

### 4.2 Application Performance Metrics
- **HTTP 5xx Error Rate:** Alert when > 1% over 5-minute window.
- **API Response Latency:**
  - Standard endpoints: p50 < 100ms, p95 < 500ms.
  - Complex AI assessment/matching endpoints: p50 < 800ms, p95 < 2500ms.
- **Container Restarts:** Alert if restart count > 1 in a 1-hour window.

### 4.3 Database Metrics (PostgreSQL 17)
- **Active Connections:** Alert when active connections reach 80% of `max_connections`.
- **Query Duration:** Alert when slow queries (> 1000ms) exceed 5 queries/minute.
- **Replication Lag:** If using read replicas, alert when lag > 10 seconds.
- **Deadlock Occurrences:** Alert on any detected PostgreSQL transaction deadlock.

### 4.4 Business & Security Metrics
- **Credit Ledger Discrepancies:** Immediate alert if `User.aiimsCredits` diverges from calculated ledger sum.
- **Overdraft Attempts:** Monitor rate of HTTP 402 `INSUFFICIENT_CREDITS` to identify potential brute-force exploits.
- **Authentication Velocity:** Alert if single IP triggers auth rate limit (> 15 requests in 15 minutes) more than 10 times in an hour.
- **AI Provider Failover:** Track fallback activation rate when Anthropic/Gemini APIs return 429 or 503.

---

## 5. Incident Response & Triage Protocol

### Step 1: Detection & Triage
1. Acknowledge alert via PagerDuty/Slack.
2. Verify service availability using direct curl commands against `/health` and `/ready`.
3. Check Sentry dashboard for recent error spikes and unhandled stack traces.

### Step 2: Containment & Mitigation
- **If Database Disconnected:**
  - Check PostgreSQL server status and resource utilization.
  - Inspect connection count (`SELECT count(*) FROM pg_stat_activity;`).
  - If pool is exhausted, gracefully restart backend instances or scale connection limits.
- **If Faulty Code Deployment:**
  - Execute Section 7 Rollback Procedure from `AIIMS_DEPLOYMENT_RUNBOOK.md`.
  - Re-deploy previous container image tag.
- **If Upstream AI Provider Failure (Anthropic/Gemini Outage):**
  - Verify that fallback logic is active (rubric evaluations fail closed returning 502 with zero credits deducted).
  - Post user-facing status announcement via support channel.

### Step 3: Resolution & Verification
1. Confirm `/ready` returns HTTP 200.
2. Execute automated post-launch smoke tests (Section 6).
3. Validate credit ledger integrity across recent transactions.

### Step 4: Post-Mortem & Blameless RCA
- Conduct Root Cause Analysis within 48 hours for any P1 or P2 incident.
- Document: Incident timeline, detection lag, time to mitigate, underlying cause, and preventive action items.

---

## 6. Post-Launch Smoke Test Protocol

Immediately after cutover to production, execute the following verification steps:

```bash
# 1. Verify Public Liveness Check
curl -s -o /dev/null -w "%{http_code}\n" https://app.aiims.education/health
# Expected: 200

# 2. Verify Database Readiness Check
curl -s -o /dev/null -w "%{http_code}\n" https://app.aiims.education/ready
# Expected: 200

# 3. Verify CSRF Token Issuance
curl -s -c cookies.txt https://app.aiims.education/api/csrf-token
# Expected: JSON containing { "csrfToken": "..." } and sets aiims_csrf cookie

# 4. Verify Diagnostic Assessment Question Delivery
curl -s https://app.aiims.education/api/assessments/questions?stations=true | grep -q "Workbench"
# Expected: Returns 0 (string found)

# 5. Verify 3D Mascot Static Asset
curl -s -o /dev/null -w "%{http_code}\n" https://app.aiims.education/api/mascot
# Expected: 200
```

---

## 7. Regular Maintenance & Hygiene Schedule

| Frequency | Task | Procedure | Impact |
| :--- | :--- | :--- | :--- |
| **Weekly** | **PostgreSQL Vacuum & Statistics** | Run `VACUUM ANALYZE;` during off-peak hours (e.g. Sunday 03:00 UTC). | Zero downtime; reclaims dead tuples and optimizes query planner. |
| **Weekly** | **Index Health Audit** | Run `npm run db:index` to verify compound index consistency. | Read-only check; zero impact. |
| **Monthly** | **Audit Log Archival** | Archive entries in `audit_logs` older than 90 days to cold storage. | Low impact; keeps table compact. |
| **Monthly** | **Dependency Security Scan** | Run `npm audit` and Gitleaks secret scans on main branch. | Zero production impact. |
| **Quarterly** | **Disaster Recovery Simulation** | Restore latest backup dump to an isolated secondary database and verify data integrity. | Zero impact on live cluster. |
| **Quarterly** | **Staff TOTP Key Rotation** | Rotate staff 2FA backup keys and re-verify encryption key entropy. | Administrative maintenance. |


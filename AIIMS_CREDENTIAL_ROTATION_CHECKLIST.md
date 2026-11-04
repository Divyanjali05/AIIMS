# AIIMS Production Credential Rotation Checklist

**Document Version:** 1.0.0
**Security Reference:** [AIIMS_SECURITY_AUDIT.md](file:///c:/Users/divya/OneDrive/Documents/AIIMS/AIIMS_SECURITY_AUDIT.md)
**Target Environment:** Production, Staging, and Local Development
**Mandatory Compliance Rule:** In accordance with Prompt 0 and AGENTS.md rules, `.env` files are never committed, printed, or inspected directly. This checklist provides human administrators and DevOps engineers with exact, safe procedures for rotating all core system credentials.

---

## Pre-Rotation Precautions & Backup Strategy

Before initiating rotation:
1. Schedule a brief maintenance window (if rotating `JWT_SECRET` in active production, as all existing user sessions will be invalidated).
2. Ensure you have administrative access to:
   - Hosting Provider / Cloud Dashboard (Vercel, Railway, Render, or AWS)
   - MongoDB Atlas Console
   - Anthropic Console (`console.anthropic.com`)
   - Google AI Studio / Google Cloud Console (`aistudio.google.com`)
3. Maintain an offline, secure password manager (e.g., 1Password, Bitwarden) for intermediate storage during configuration.

---

## 1. JWT Signing Secret (`JWT_SECRET`)

### Where Configured
- **Files / Locations:**
  - Production / Staging Environment Variables: `JWT_SECRET`
  - Reference Code: [Backend/src/config/env.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts)
  - Validation: `getValidatedJwtSecret()` enforces minimum 32 characters (256-bit entropy).

### Step 1: Generate a New Cryptographic Secret
Generate a cryptographically secure 64-character (256-bit) hexadecimal key:
```bash
# On Linux / macOS / PowerShell / Node:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
*Example generated output format:* `e7a1b92c48d6f03e...64chars`

### Step 2: Configure the New Secret
1. In the production hosting platform (e.g. Railway / Render / Docker):
   - Update `JWT_SECRET=<new_generated_key>`.
2. For local development:
   - Update the local `.env` file with the new key. Ensure `.env` remains in `.gitignore`.

### Step 3: Test the New Value
Run backend typecheck and security tests:
```bash
npm --prefix Backend run test:security:remediation
npm --prefix Backend run test:security
```
Verify that user login produces valid JWT tokens and that invalid or previous secrets return `HTTP 401 Unauthorized`.

### Step 4: Revoke / Invalidate the Old Value
Updating `JWT_SECRET` immediately invalidates all existing active tokens signed by the previous secret. Users will be asked to log in again upon their next request.

### Potential Blast Radius if Rotation Fails
- **Blast Radius:** All logged-in users receive `401 Unauthorized` and are redirected to `/login`.
- **Rollback:** Revert `JWT_SECRET` to the previous secret value in the hosting environment variables and redeploy.

---

## 2. Anthropic Claude API Key (`ANTHROPIC_API_KEY`)

### Where Configured
- **Files / Locations:**
  - Production Environment Variables: `ANTHROPIC_API_KEY`
  - Backend Service: [Backend/src/services/anthropic/claude.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/anthropic/claude.service.ts)
  - Assessment Evaluation: [Backend/src/controllers/assessment.controller.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/assessment.controller.ts)

### Step 1: Generate a New Key
1. Log into [Anthropic Console](https://console.anthropic.com/).
2. Navigate to **API Keys** under Settings.
3. Click **Create Key**.
4. Name the key descriptively (e.g. `aiims-prod-2026-v1`).
5. Copy the newly generated key (`sk-ant-api03-...`).

### Step 2: Configure the New Key
1. Update `ANTHROPIC_API_KEY` in the production environment settings.
2. In local environments, update `ANTHROPIC_API_KEY` in `.env`.

### Step 3: Test the New Value
Run the assessment scoring test suite to verify fallback and live evaluation pipelines:
```bash
npm --prefix Backend run test:scoring
```
Test an assessment submission via the diagnostic module to verify semantic evaluation responses.

### Step 4: Revoke the Old Key
1. In the Anthropic Console, find the previous key.
2. Click **Revoke / Delete**.
3. Verify that the old key immediately ceases to authenticate requests.

### Potential Blast Radius if Rotation Fails
- **Blast Radius:** Claude-evaluated open-ended assessment questions (Q11, Q12, Q25) and mentor relevance reports gracefully degrade to deterministic fallback heuristics without crashing the server.
- **Rollback:** Re-enter a valid API key in environment variables or regenerate a new active key in Anthropic Console.

---

## 3. Google Gemini API Key (`GEMINI_API_KEY`)

### Where Configured
- **Files / Locations:**
  - Production Environment Variables: `GEMINI_API_KEY`
  - Backend Service: [Backend/src/services/gemini/gemini.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/gemini/gemini.service.ts)
  - Tool Discovery & Analysis Modules

### Step 1: Generate a New Key
1. Log into [Google AI Studio](https://aistudio.google.com/).
2. Go to **Get API Key**.
3. Click **Create API Key** in a new or existing Google Cloud Project.
4. Restrict key access if necessary (HTTP referrers / IP restrictions).
5. Copy the generated API key.

### Step 2: Configure the New Key
1. Set `GEMINI_API_KEY` in cloud deployment environment settings.
2. Update local `.env` with the new key.

### Step 3: Test the New Value
1. Trigger a tool discovery or relevance check.
2. Verify that Gemini models (e.g., `gemini-1.5-flash` or `gemini-1.5-pro`) execute requests without `403 FORBIDDEN` or `400 INVALID_API_KEY`.

### Step 4: Revoke the Old Key
1. In Google AI Studio / Google Cloud Console Credentials page, select the old API key.
2. Click **Delete**.

### Potential Blast Radius if Rotation Fails
- **Blast Radius:** AI tool discovery runs and automated summaries fail gracefully, falling back to cached catalog data and seed tools. Core student diagnostic, Clarity, and Credits systems remain operational.
- **Rollback:** Restore key or generate a replacement in Google AI Studio.

---

## 4. MongoDB Atlas Connection String & Database User (`MONGODB_URI`)

### Where Configured
- **Files / Locations:**
  - Production Environment Variables: `MONGODB_URI`
  - Database Initialization: [Backend/src/server.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/server.ts)
  - Health Endpoint: `GET /api/health`

### Step 1: Create a New Database User in MongoDB Atlas
1. Log into [MongoDB Atlas](https://cloud.mongodb.com/).
2. Navigate to **Database Access** under Security.
3. Click **Add New Database User**.
4. Authentication Method: **Password**.
5. Set Username (e.g., `aiims_prod_app_v2`).
6. Click **Autogenerate Secure Password** and copy it safely.
7. Database User Privileges: Select **Read and write to any database** (or restrict to `aiims` database: `readWrite@aiims`).
8. Click **Add User**.

### Step 2: Assemble Connection String
Construct the connection string:
```text
mongodb+srv://aiims_prod_app_v2:<NEW_PASSWORD>@clusteraiims.obfnfic.mongodb.net/aiims?retryWrites=true&w=majority&appName=ClusterAIIMS
```

### Step 3: Verify Network Access (IP Whitelist)
1. In MongoDB Atlas, go to **Network Access**.
2. Verify that production IP addresses (or `0.0.0.0/0` with strong authentication) are active.

### Step 4: Configure the New Connection String
1. Update `MONGODB_URI` in the cloud hosting environment settings.
2. Trigger a rolling redeploy.

### Step 5: Test the New Value
1. Check the server health endpoint:
   ```bash
   curl -s http://localhost:5000/api/health
   # Expected: {"status":"healthy","database":"connected",...}
   ```
2. Verify student login and credit balance rehydration work correctly.

### Step 6: Delete the Old Database User
1. In MongoDB Atlas **Database Access**, locate the old database user.
2. Click **Delete** and confirm.
3. This revokes all access using previous credentials.

### Potential Blast Radius if Rotation Fails
- **Blast Radius:** The backend cannot connect to MongoDB Atlas. Because AIIMS provides a resilient in-memory development fallback, offline test suites continue passing, but production persistent state cannot be written.
- **Rollback:** Update `MONGODB_URI` with a verified working username/password in Atlas and trigger immediate redeployment.

---

## Credential Rotation Verification Checklist Summary

| Credential | Verification Command / URL | Responsible Role | Target SLA |
| :--- | :--- | :--- | :--- |
| **`JWT_SECRET`** | `npm --prefix Backend run test:security:remediation` | Security Lead | Immediate (<15 mins) |
| **`ANTHROPIC_API_KEY`** | `npm --prefix Backend run test:scoring` | AI / Backend Lead | Within 24 hours |
| **`GEMINI_API_KEY`** | Automated Tool Discovery test | AI / Backend Lead | Within 24 hours |
| **`MONGODB_URI`** | Health check `GET /api/health` | DevOps / DB Admin | Maintenance window |


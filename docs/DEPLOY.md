# AIIMS Backend Production Deployment Guide

A host-agnostic, container-ready deployment and operations runbook for the AIIMS backend service.

---

## 1. Environment Variables Reference

Configure the following environment variables in your production environment (e.g., container secrets, secret manager, or production `.env`).

> **Security Note:** Never commit secrets to version control. The list below contains variable names only.

| Variable Name | Required in Production | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | Yes | Must be set to `production` |
| `PORT` | Optional (default: `5001`) | Network port for HTTP listener |
| `JWT_SECRET` | Yes | 32+ character high-entropy cryptographic secret key |
| `MONGODB_URI` | Yes | MongoDB Atlas or cluster connection URI |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins (wildcard `*` rejected) |
| `TOTP_ENCRYPTION_KEY` | Yes | 64-hex-character (32-byte) AES-256 key for staff 2FA secrets at rest |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI features |
| `GEMINI_MODEL` | Optional | Gemini model name (default: `gemini-3.5-flash`) |
| `ANTHROPIC_API_KEY` | Optional | Anthropic Claude API key for model assessments |
| `AI_TOOL_ASSESSMENT_MODEL` | Optional | Claude model identifier (default: `claude-3-5-sonnet-20241022`) |
| `AI_PROVIDER` | Optional | Preferred AI provider (`gemini` or `anthropic`) |
| `AUTH_RATE_LIMIT_MAX` | Optional | Max authentication attempts per rate window (default: `15`) |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Optional | Authentication rate window in ms (default: `900000`) |
| `RUN_DISCOVERY_ON_START` | Optional | Flag to trigger initial AI discovery pass on startup (`true` or `false`) |
| `SENTRY_DSN` | Optional | Sentry DSN for backend error monitoring (leave unset to disable) |

---

## 2. Pre-Deployment: Database Index Creation

Before routing customer traffic to a newly deployed build, ensure all MongoDB indexes are created:

```bash
# Execute deploy-time index synchronization
npm --prefix Backend run db:index
```

This verifies and creates compound indexes for submission queues (`status + submittedAt`), learner histories (`learner + createdAt`), audit logs (`action + time`), and user roles.

---

## 3. Containerized Deployment (Docker)

### Step 1: Build the Production Container Image
```bash
docker build -t aiims-backend:latest -t aiims-backend:$(git rev-parse --short HEAD) -f Backend/Dockerfile Backend
```

### Step 2: Run Database Index Synchronization
```bash
docker run --rm --env-file /path/to/prod.env aiims-backend:latest npm run db:index
```

### Step 3: Start the Backend Container
```bash
docker run -d \
  --name aiims-backend \
  --restart unless-stopped \
  -p 5001:5001 \
  --env-file /path/to/prod.env \
  aiims-backend:latest
```

### Step 4: Verify Health and Readiness
```bash
# 1. Liveness check (200 OK)
curl -f http://localhost:5001/health

# 2. Readiness check (200 OK when database is active)
curl -f http://localhost:5001/ready
```

---

## 4. Non-Containerized Deployment (Node.js Process)

### Step 1: Install Production Dependencies
```bash
cd Backend
npm ci --omit=dev
```

### Step 2: Compile TypeScript to Distribution
```bash
npm run build
```

### Step 3: Run Database Index Creation
```bash
npm run db:index
```

### Step 4: Launch Production Server
```bash
# Direct startup
NODE_ENV=production npm start

# Or via process manager (e.g., PM2)
pm2 start dist/server.js --name aiims-backend
```

### Step 5: Verify Health and Readiness
```bash
curl -f http://localhost:5001/health
curl -f http://localhost:5001/ready
```

---

## 5. Rollback Procedure

If a deployed version experiences unexpected failures or regressions, execute the following rollback steps:

### Containerized Rollback (Docker)
1. **Stop and remove the faulty container:**
   ```bash
   docker stop aiims-backend && docker rm aiims-backend
   ```
2. **Relaunch the previous known-good image tag or SHA:**
   ```bash
   # Use the previous commit SHA or previous release tag
   docker run -d \
     --name aiims-backend \
     --restart unless-stopped \
     -p 5001:5001 \
     --env-file /path/to/prod.env \
     aiims-backend:<previous-commit-sha>
   ```
3. **Verify service recovery:**
   ```bash
   curl -f http://localhost:5001/health
   curl -f http://localhost:5001/ready
   ```

### Non-Containerized Rollback
1. **Stop the active process:**
   ```bash
   pm2 stop aiims-backend || kill <PID>
   ```
2. **Check out the previous release or git commit:**
   ```bash
   git checkout <previous-git-tag-or-sha>
   ```
3. **Rebuild and restart:**
   ```bash
   cd Backend
   npm ci --omit=dev
   npm run build
   pm2 restart aiims-backend || NODE_ENV=production npm start
   ```
4. **Confirm health:**
   ```bash
   curl -f http://localhost:5001/health
   curl -f http://localhost:5001/ready
   ```

### Database Compatibility Note During Rollback
- All database schema updates in AIIMS are strictly additive and backward-compatible.
- Existing indexes are non-destructive and will continue supporting prior revisions seamlessly without schema rollbacks.

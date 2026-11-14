# AIIMS — Production Deployment Runbook

**Document Version:** 1.0.0
**Effective Date:** 12 November 2026
**Target Specification:** AIIMS Master Project Specification v2.0
**Application:** AIIMS (AI Intelligence & Mentoring System)
**Database Runtime:** PostgreSQL 17 + Prisma ORM 6.19.3

---

## 1. Production Architecture Overview

AIIMS is architected as a decoupled, multi-tier, cloud-ready web and mobile platform:

```
[ Client / Web Browser / Android Mobile App ]
                      │
                      ▼ HTTPS (TLS 1.3 / Strict SNI)
        [ Ingress / CDN / Reverse Proxy ]
        (Cloudflare / Nginx / ALB / Caddy)
        ├── Static Assets (/assets/*) ────────► [ Frontend SPA Static Host ]
        │                                        (React 18 + Vite Production dist/)
        │
        └── API Traffic (/api/*, /health, /ready)
                      │
                      ▼ HTTP (Port 5001)
        [ Backend API Service Tier ]
        (Node.js 20+ Express, Containerized Docker / PM2)
        ├── Helmet Security Headers
        ├── Strict CORS Allowlist
        ├── Double-Submit CSRF Protection
        ├── Rate Limiters (Auth & API)
        └── Dual-Ledger Credit Engine
                      │
                      ▼ TLS Encrypted Database Connection (port 5432 / 5433)
        [ Primary Database Tier ]
        (PostgreSQL 17 managed cluster, Prisma Client 6.19.3)
        ├── 21 Relational Tables
        ├── Foreign Key Cascades
        ├── Compound Performance Indexes
        └── Anonymized Financial Credit Ledger
```

### 1.1 Architectural Invariants
- **Database Engine:** PostgreSQL 17 + Prisma ORM ONLY. Strictly zero MongoDB or Mongoose artifacts.
- **Stateless API:** Backend instances are stateless. Session tokens and device fingerprints are verified against PostgreSQL.
- **Single-Device Binding:** Learner accounts are locked to their bound device until an administrator executes a signed device reset.
- **Dual-Ledger Transactions:** All credit balance updates execute inside atomic `prisma.$transaction` blocks with compound idempotency keys (`[userId, idempotencyKey]`).

---

## 2. Production Secret Configuration Checklist

> [!CAUTION]
> **Zero Plaintext Secrets:** Never commit `.env` files or secret values to version control. All production values must be provisioned via secret managers (AWS Secrets Manager, GCP Secret Manager, Vault, or environment injection).

### Mandatory Variables (Production Fail-Closed)

| Variable Name | Required | Constraints & Validation |
| :--- | :---: | :--- |
| `NODE_ENV` | **YES** | Strictly `production`. Disables development fallbacks and enables production cookies. |
| `PORT` | **YES** | Network port for Express HTTP listener (default: `5001`). |
| `DATABASE_URL` | **YES** | Valid PostgreSQL connection URI (`postgresql://...`) with `sslmode=require` in production. |
| `JWT_SECRET` | **YES** | Cryptographically random string, **minimum 32 characters** (256-bit entropy). Server crashes on startup if absent or if using placeholder values. |
| `ALLOWED_ORIGINS` | **YES** | Comma-separated list of approved production domains (e.g. `https://app.aiims.education,https://aiims.education`). **Wildcard `*` is strictly rejected**. |
| `TOTP_ENCRYPTION_KEY` | **YES** | Exactly 64 hexadecimal characters (32-byte AES-256 key) for staff 2FA secrets at rest. |

### Optional Service Integrations

| Variable Name | Required | Constraints & Validation |
| :--- | :---: | :--- |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key for AI diagnostic assessment and rubric evaluations. |
| `AI_TOOL_ASSESSMENT_MODEL`| Optional | Claude model identifier (default: `claude-3-5-sonnet-20241022`). |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for tool discovery and chat assistants. |
| `GEMINI_MODEL` | Optional | Gemini model identifier (default: `gemini-3.5-flash`). |
| `AI_PROVIDER` | Optional | Preferred provider selector (`gemini` or `anthropic`, default: `gemini`). |
| `SENTRY_DSN` | Optional | Sentry monitoring DSN for backend error tracking. |
| `VITE_SENTRY_DSN` | Optional | Sentry DSN for frontend browser error tracking. |
| `VITE_API_BASE_URL` | Optional | Build-time frontend API base path (defaults to `/api`). |
| `AUTH_RATE_LIMIT_MAX` | Optional | Max authentication attempts per IP per window (default: `15`). |
| `AUTH_RATE_LIMIT_WINDOW_MS`| Optional | Rate window duration in milliseconds (default: `900000` = 15m). |
| `SUPPORT_EMAIL` | Optional | Public customer support contact email (default: `support@aiims.education`). |

---

## 3. Database Migration & Initialization Procedure

### 3.1 Non-Destructive Migration Protocol
All production schema updates are strictly additive and managed through Prisma.

```bash
# 1. Inspect existing migration status against production PostgreSQL
npx --prefix Backend prisma migrate status

# 2. Deploy pending migrations safely (non-interactive, non-destructive)
npx --prefix Backend prisma migrate deploy

# 3. Synchronize relational database indexes and verify constraints
npm --prefix Backend run db:index

# 4. (Optional) Seed verified AI tools catalog if initializing a fresh database
npm --prefix Backend run seed:tools
```

> [!WARNING]
> **Strictly Prohibited Commands:**
> - Never execute `prisma migrate reset` in production (erases all database tables).
> - Never execute `prisma db push --accept-data-loss`.
> - Never execute raw SQL `DROP TABLE`, `TRUNCATE`, or `DROP DATABASE`.

---

## 4. Backend Deployment Steps

### Option A: Containerized Deployment (Recommended)

1. **Build Multi-Stage Production Container:**
   ```bash
   docker build \
     --file Backend/Dockerfile \
     --tag aiims-backend:latest \
     --tag aiims-backend:$(git rev-parse --short HEAD) \
     Backend
   ```

2. **Execute Database Migration Task:**
   ```bash
   docker run --rm \
     --env-file /etc/aiims/production.env \
     aiims-backend:latest \
     npx prisma migrate deploy
   ```

3. **Launch Production Container:**
   ```bash
   docker run -d \
     --name aiims-backend \
     --restart unless-stopped \
     -p 5001:5001 \
     --env-file /etc/aiims/production.env \
     aiims-backend:latest
   ```

4. **Verify Container Health & Probes:**
   ```bash
   # Liveness check (HTTP 200)
   curl -f http://localhost:5001/health

   # Readiness check (HTTP 200 when PostgreSQL is connected)
   curl -f http://localhost:5001/ready
   ```

### Option B: Bare-Metal / Process Manager (PM2)

1. **Install Production Dependencies:**
   ```bash
   cd Backend
   npm ci --omit=dev
   ```

2. **Generate Prisma Client & Build Bundle:**
   ```bash
   npx prisma generate
   npm run build
   ```

3. **Deploy Schema & Start Process:**
   ```bash
   npx prisma migrate deploy
   npm run db:index
   pm2 start dist/server.js --name "aiims-backend" --time
   ```

4. **Verify Application Status:**
   ```bash
   pm2 status aiims-backend
   curl -f http://localhost:5001/ready
   ```

---

## 5. Frontend Deployment Steps

### 5.1 Build & Asset Generation
```bash
# 1. Install dependencies
cd Frontend
npm ci

# 2. Compile TypeScript and bundle production assets via Vite
npm run build
```
Build output directory: `Frontend/dist/`
- `dist/index.html` — Single Page Application entry point.
- `dist/assets/vendor-react-*.js` — Isolated React & React DOM chunk.
- `dist/assets/vendor-icons-*.js` — Lucide icon assets chunk.
- `dist/assets/vendor-three-*.js` — Three.js & Fiber 3D visual chunk.
- `dist/assets/index-*.js` & `index-*.css` — Application logic and design tokens.

### 5.2 Ingress / Web Server Configuration (Nginx Reference)
```nginx
server {
    listen 443 ssl http2;
    server_name app.aiims.education;

    ssl_certificate /etc/letsencrypt/live/app.aiims.education/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.aiims.education/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/aiims/Frontend/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Immutable hashed static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # SPA routing fallback (All HTML requests load index.html with no-cache)
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy API requests to backend service
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health & readiness proxy for external uptime monitors
    location /health {
        proxy_pass http://127.0.0.1:5001/health;
    }
    location /ready {
        proxy_pass http://127.0.0.1:5001/ready;
    }
}
```

---

## 6. Backup, Restoration & Disaster Recovery

### 6.1 Pre-Release Backup Procedure
Before initiating any production deployment or running Prisma migrations, take a full consistent backup of PostgreSQL:

```bash
# 1. Create timestamped dump directory
BACKUP_DIR="/var/backups/aiims"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

# 2. Execute consistent snapshot using pg_dump
pg_dump \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --blobs \
  --no-owner \
  --file="$BACKUP_DIR/aiims_db_predeploy_$TIMESTAMP.dump"

# 3. Verify dump integrity and size
ls -lh "$BACKUP_DIR/aiims_db_predeploy_$TIMESTAMP.dump"
```

### 6.2 Restoration Procedure (Secondary Target First)
> [!IMPORTANT]
> Never restore directly over a live production database without verifying the backup on an isolated staging instance.

1. **Restore to Verification Target:**
   ```bash
   createdb -h localhost -p 5432 -U postgres aiims_restore_verify
   pg_restore \
     --dbname="postgresql://postgres:pass@localhost:5432/aiims_restore_verify" \
     --clean \
     --if-exists \
     "$BACKUP_DIR/aiims_db_predeploy_$TIMESTAMP.dump"
   ```
2. **Execute Data Integrity Sanity Check:**
   - Verify user counts match pre-backup state.
   - Verify sum of `credit_ledger.amount` matches `users.aiims_credits`.
   - Verify foreign keys and relational integrity.
3. **Emergency Production Database Cutover:**
   Only if a catastrophic release failure corrupted the primary database and rollback is required, switch connection URI to the verified replica.

---

## 7. Rollback Procedures

### 7.1 Backend Rollback
1. **Identify the Last Known-Good Version:**
   Retrieve previous Git commit SHA or container tag (e.g. `aiims-backend:<previous-sha>`).
2. **Deploy Previous Container:**
   ```bash
   docker stop aiims-backend && docker rm aiims-backend
   docker run -d \
     --name aiims-backend \
     --restart unless-stopped \
     -p 5001:5001 \
     --env-file /etc/aiims/production.env \
     aiims-backend:<previous-sha>
   ```
3. **Verify Service Health:**
   ```bash
   curl -f http://localhost:5001/ready
   ```

### 7.2 Frontend Rollback
1. Re-point web server document root to the previous build directory:
   ```bash
   ln -sfn /var/www/aiims/releases/<previous-release>/Frontend/dist /var/www/aiims/current-frontend
   ```
2. Purge edge CDN cache for `index.html`.

### 7.3 Schema Backward Compatibility
All AIIMS Prisma migrations follow additive-only standards (new columns default to null or provide database defaults). As a result, older backend versions continue operating cleanly on migrated schemas without requiring destructive database schema rollbacks.

---

## 8. Pre-Flight Release Checklist

- [ ] Production secrets provisioned in secret manager (`JWT_SECRET` >= 32 chars, `ALLOWED_ORIGINS` exact, `DATABASE_URL` with SSL).
- [ ] Database backup executed and verified (`pg_dump`).
- [ ] Prisma schema validated (`npx prisma validate`).
- [ ] Frontend production build compiled cleanly (`npm run build`).
- [ ] Backend production build compiled cleanly (`npm run build`).
- [ ] Backend container image built and tagged with commit SHA.
- [ ] Ingress SSL certificates verified (TLS 1.3, valid expiration > 30 days).
- [ ] Liveness (`/health`) and Readiness (`/ready`) endpoints responding HTTP 200.
- [ ] Owner manual sign-off completed.


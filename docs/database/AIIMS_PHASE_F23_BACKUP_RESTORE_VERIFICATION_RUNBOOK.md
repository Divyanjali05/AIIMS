# AIIMS Market AI Tools Catalog — Phase F.2.3: PostgreSQL Backup & Restore Verification Runbook (Corrected)

**Project:** AIIMS (AI Intelligence & Mentoring System)  
**Workspace:** `C:\Users\divya\OneDrive\Documents\AIIMS`  
**Phase:** Phase F.2.3 — PostgreSQL Backup & Restore Verification  
**Role:** Senior PostgreSQL DBA, Windows PowerShell Engineer & Database Recovery Specialist  
**Date:** November 16, 2026  
**Confirmed Database Targets:**
- **PostgreSQL Version:** 17
- **Host:** `localhost`
- **Port:** `5433` (Port 5432 or other databases are strictly unauthorized)
- **Source Database:** `aiims_db`
- **Restore-Test Database:** `aiims_restore_test`

---

## 1. Executive Summary & Audit Context

Phase F.2.3 establishes the authoritative, production-grade backup and isolated restore verification procedure required to satisfy **Owner Gate BKP-1**.

All prior script draft issues have been corrected in `scripts/verify_backup_restore.ps1`:
1. **No Username Assumption:** PostgreSQL username is never hardcoded to `postgres`. The operator is prompted interactively (or passes `-PgUser`).
2. **Masked Authentication:** Password is entered interactively as a secure string (`Read-Host -AsSecureString`), never echoed, never printed, and cleared from memory in a `finally` block.
3. **Safe SQL Quoting:** Table queries avoid ambiguous nested PowerShell quotes (`SELECT COUNT(*) FROM $Table;`).
4. **Strict Error Reporting (`ON_ERROR_STOP=1`):** All `psql` queries enforce `-v ON_ERROR_STOP=1` so missing tables or query errors immediately trigger failures, never returning zero.
5. **Zero Automatic Drops:** All automatic test-database cleanup code (`dropdb`, `DROP DATABASE`) has been completely removed from the script.
6. **Strict 4-Table Parity:** Side-by-side verification table for `users`, `credit_ledger`, `student_profiles`, and `entrepreneur_profiles`.
7. **Comprehensive Dump Validation:** Checks backup existence, non-zero size, SHA-256 checksum, and validates Table of Contents via `pg_restore --list`.
8. **Explicit Owner Confirmation Gate:** Before running any database command, the owner must confirm that writes are paused and type:
   `RUN-BACKUP-RESTORE-5433`

---

## 2. Safety Invariants & Guardrails

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MANDATORY EXECUTION GUARDRAILS                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Port 5433 Only: Strictly targets PostgreSQL 17 on 5433; port 5432 is prohibited    │
│ 2. Isolated Target: Source is strictly 'aiims_db'; Restore is 'aiims_restore_test'    │
│ 3. External Backup Directory: Stored outside repository ($HOME\aiims_backups)          │
│ 4. Preflight Collision Check: Aborts if 'aiims_restore_test' already exists           │
│ 5. Banned --clean Flag: Drop-in-place (--clean) is strictly prohibited                 │
│ 6. Zero Automatic Drops: The script never drops or cleans up any database              │
│ 7. Gated Workflow: Migration M-1 remains blocked until BKP-1 is VERIFIED               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Audited Verification Script (`scripts/verify_backup_restore.ps1`)

The verification script is located at:
`scripts/verify_backup_restore.ps1`

### Syntax
```powershell
.\scripts\verify_backup_restore.ps1 `
    [-HostName <string>]       # Default: "localhost"
    [-Port <int>]               # Default: 5433 (Enforced)
    [-SourceDb <string>]        # Default: "aiims_db" (Enforced)
    [-TestDb <string>]          # Default: "aiims_restore_test" (Enforced)
    [-BackupDir <string>]       # Default: "$HOME\aiims_backups"
    [-PgUser <string>]          # Interactive prompt if not supplied
```

---

## 4. Manual Execution Procedures

The operator may execute the procedure using either **Option A (Automated Audited Script)** or **Option B (Manual PowerShell CLI)**.

### Pre-Execution Prerequisites (Owner Confirmation Gate)
Before initiating database commands:
1. Confirm that application writes are paused or that no writes will occur during the backup and comparison window.
2. Confirm the PostgreSQL 17 username.
3. Type the explicit confirmation phrase:
   `RUN-BACKUP-RESTORE-5433`

---

### Option A: Using the Audited PowerShell Script

Open a Windows PowerShell terminal and run:

```powershell
cd C:\Users\divya\OneDrive\Documents\AIIMS

# Execute the verification script (prompts interactively for username and masked password)
powershell -ExecutionPolicy Bypass -File .\scripts\verify_backup_restore.ps1 -Port 5433 -SourceDb "aiims_db" -TestDb "aiims_restore_test"
```

The script will:
1. Validate safety parameters (`Port=5433`, `SourceDb=aiims_db`, `TestDb=aiims_restore_test`, backup dir outside repo).
2. Interactively prompt for PostgreSQL username and masked password.
3. Step A: Create binary custom dump (`pg_dump -F c -b -v`), verify size > 0, compute SHA-256, verify `pg_restore --list`.
4. Step B: Collision check `aiims_restore_test` (aborts if exists), create `aiims_restore_test`, restore dump with `--exit-on-error` (WITHOUT `--clean`).
5. Step C: Query and display row counts side-by-side for `users`, `credit_ledger`, `student_profiles`, `entrepreneur_profiles`.
6. Step D: Print verification verdict (`BKP-1 VERIFIED` or `BKP-1 FAILED / INCONCLUSIVE`) and display manual teardown instructions (leaving the test DB untouched).

---

### Option B: Step-by-Step Manual CLI Execution

#### Step A — Fresh Custom-Format Backup
```powershell
$HostName  = "localhost"
$Port      = 5433
$SourceDb  = "aiims_db"
$BackupDir = "$HOME\aiims_backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\aiims_db_preflight_$Timestamp.dump"

# Prompt for username
$PgUser = (Read-Host "Enter PostgreSQL Username").Trim()

# Ensure backup directory exists outside repository
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

# 1. Execute dump
pg_dump -h $HostName -p $Port -U $PgUser -d $SourceDb -F c -b -v -f "$BackupFile" -W

# 2. Check file size
$fileItem = Get-Item "$BackupFile"
Write-Host "File Size: $($fileItem.Length) bytes ($([math]::Round($fileItem.Length / 1MB, 2)) MB)"

# 3. Calculate SHA-256
$hashObj = Get-FileHash -Path "$BackupFile" -Algorithm SHA256
Write-Host "SHA-256: $($hashObj.Hash)"

# 4. Verify Table of Contents via pg_restore --list
pg_restore --list "$BackupFile"
```

#### Step B — Separate Isolated Restore Test
```powershell
$TestDb = "aiims_restore_test"

# 1. Preflight Collision Check: Abort if aiims_restore_test already exists
$checkExists = psql -h $HostName -p $Port -U $PgUser -d postgres -v ON_ERROR_STOP=1 -t -A -c "SELECT 1 FROM pg_database WHERE datname = '$TestDb';" -W
if ($checkExists.Trim() -eq "1") {
    Write-Error "ABORT: Database '$TestDb' already exists. Never overwrite automatically. Please drop manually."
    return
}

# 2. Create isolated test database
createdb -h $HostName -p $Port -U $PgUser -W $TestDb

# 3. Restore snapshot into aiims_restore_test (NEVER into aiims_db, NEVER with --clean)
pg_restore -h $HostName -p $Port -U $PgUser -d $TestDb --exit-on-error -v -W "$BackupFile"
Write-Host "pg_restore Exit Code: $LASTEXITCODE"
```

#### Step C — Compare Table Counts Side-by-Side
```powershell
$tables = @("users", "credit_ledger", "student_profiles", "entrepreneur_profiles")
$results = @()

foreach ($tbl in $tables) {
    # Query source with ON_ERROR_STOP=1
    $srcCount = (psql -h $HostName -p $Port -U $PgUser -d $SourceDb -v ON_ERROR_STOP=1 -t -A -c "SELECT COUNT(*) FROM $tbl;" -W).Trim()
    
    # Query restored with ON_ERROR_STOP=1
    $testCount = (psql -h $HostName -p $Port -U $PgUser -d $TestDb -v ON_ERROR_STOP=1 -t -A -c "SELECT COUNT(*) FROM $tbl;" -W).Trim()
    
    $status = if ($srcCount -eq $testCount) { "MATCH" } else { "MISMATCH" }
    
    $results += [PSCustomObject]@{
        "Table"          = $tbl
        "Source count"   = $srcCount
        "Restored count" = $testCount
        "Result"         = $status
    }
}

$results | Format-Table -AutoSize
```

#### Step D — Manual Teardown & Cleanup
> [!CAUTION]
> **Automated drops are prohibited.** The operator must verify the exact test database name before teardown.
> **NEVER execute `dropdb` against `aiims_db`!**

```powershell
# Only execute after verification has completed:
dropdb -h $HostName -p $Port -U $PgUser -W aiims_restore_test
```

---

## 5. Verification Verdict Criteria

1. **`BKP-1 VERIFIED`:**
   - Backup exists and non-zero size.
   - SHA-256 recorded.
   - `pg_restore --list` valid.
   - `pg_restore` finished with exit code `0`.
   - All 4 table counts match 100% between `aiims_db` and `aiims_restore_test`.
2. **`BKP-1 FAILED`:**
   - Backup generation, TOC listing, or restore execution failed.
   - Table count queries failed with SQL error.
3. **`BKP-1 INCONCLUSIVE`:**
   - Application writes occurred during the verification window causing count differences.
   - Must be repeated under a stable, write-paused window.

<#
.SYNOPSIS
    AIIMS Phase F.2.3: PostgreSQL Backup & Restore Verification Script (Final Corrected).

.DESCRIPTION
    Automates preflight verification of PostgreSQL 17 backup and restore procedures:
    1. Prompts interactively for PostgreSQL username (no hardcoded 'postgres') and masked password.
    2. Creates a compressed custom-format binary backup of 'aiims_db' outside the Git repository.
    3. Validates backup file existence, non-zero size, SHA-256 checksum, and TOC validity via 'pg_restore --list'.
    4. Checks whether 'aiims_restore_test' exists (aborts if found to prevent accidental overwrite).
    5. Creates 'aiims_restore_test' and executes 'pg_restore --exit-on-error' (WITHOUT --clean).
    6. Compares row counts side-by-side for 'users', 'credit_ledger', 'student_profiles', and 'entrepreneur_profiles'
       using 'psql -v ON_ERROR_STOP=1' to guarantee query failures are reported as errors, never as zero.
    7. Displays formatted comparison table and provides separate manual cleanup command (never drops automatically).

.NOTES
    Author: Senior PostgreSQL DBA & Database Recovery Specialist
    Project: AIIMS (AI Intelligence & Mentoring System)
    Phase: F.2.3 — Backup & Restore Verification
    Target: PostgreSQL 17 on localhost:5433 (Source: aiims_db, Test: aiims_restore_test)
    Safety Invariants:
      - Strictly zero automatic drops.
      - Strictly zero --clean flags.
      - Strictly zero .env access or credential persistence.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$HostName = "localhost",

    [Parameter(Mandatory = $false)]
    [int]$Port = 5433,

    [Parameter(Mandatory = $false)]
    [string]$SourceDb = "aiims_db",

    [Parameter(Mandatory = $false)]
    [string]$TestDb = "aiims_restore_test",

    [Parameter(Mandatory = $false)]
    [string]$BackupDir = "$HOME\aiims_backups",

    [Parameter(Mandatory = $false)]
    [string]$PgUser = ""
)

$ErrorActionPreference = "Stop"

# ==============================================================================
# 0. Safety Sanity Checks & Target Validation
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  AIIMS Phase F.2.3: PostgreSQL Backup & Restore Verification    " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Version: 17" -ForegroundColor Gray
Write-Host "Host:               $HostName" -ForegroundColor Gray
Write-Host "Port:               $Port" -ForegroundColor Gray
Write-Host "Source Database:    $SourceDb" -ForegroundColor Gray
Write-Host "Test Database:      $TestDb" -ForegroundColor Gray
Write-Host "Backup Directory:   $BackupDir" -ForegroundColor Gray
Write-Host "==================================================================" -ForegroundColor Cyan

# CRITICAL TARGET VERIFICATION: Port must be 5433, Source must be aiims_db
if ($Port -ne 5433) {
    Write-Error "CRITICAL SAFETY VIOLATION: Port is configured to $Port. Only port 5433 (PostgreSQL 17) is authorized. Aborting."
    exit 1
}

if ($SourceDb.ToLower() -ne "aiims_db") {
    Write-Error "CRITICAL SAFETY VIOLATION: SourceDb is '$SourceDb'. Only 'aiims_db' is authorized. Aborting."
    exit 1
}

if ($SourceDb.ToLower() -eq $TestDb.ToLower()) {
    Write-Error "CRITICAL SAFETY VIOLATION: SourceDb and TestDb cannot be identical ('$SourceDb'). Aborting."
    exit 1
}

if ($TestDb.ToLower() -in @("aiims_db", "aiims", "postgres", "template0", "template1")) {
    Write-Error "CRITICAL SAFETY VIOLATION: TestDb cannot be a production or system database ('$TestDb'). Aborting."
    exit 1
}

# CRITICAL SAFETY INVARIANT 2: Backup directory must NOT reside inside Git repository
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$resolvedBackupDir = [System.IO.Path]::GetFullPath($BackupDir)
if ($resolvedBackupDir.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Error "CRITICAL SAFETY VIOLATION: Backup directory ($resolvedBackupDir) is located inside the Git repository ($repoRoot). Backups must reside outside the repository. Aborting."
    exit 1
}

# Locate PostgreSQL binaries if not currently on PATH
$pgBinaries = @("pg_dump", "createdb", "pg_restore", "psql")
$missingBinaries = @()
foreach ($bin in $pgBinaries) {
    if (-not (Get-Command $bin -ErrorAction SilentlyContinue)) {
        $missingBinaries += $bin
    }
}

if ($missingBinaries.Count -gt 0) {
    # Check default PostgreSQL 17 installation path on Windows
    $defaultPg17Path = "C:\Program Files\PostgreSQL\17\bin"
    if (Test-Path (Join-Path $defaultPg17Path "pg_dump.exe")) {
        Write-Host "[INFO] Appending PostgreSQL 17 to PATH: $defaultPg17Path" -ForegroundColor Yellow
        $env:PATH = "$defaultPg17Path;$env:PATH"
    } else {
        Write-Error "PostgreSQL client utilities ($($missingBinaries -join ', ')) not found on PATH or standard directory ($defaultPg17Path). Please add PostgreSQL 17 bin to PATH."
        exit 1
    }
}

# Interactive PostgreSQL Username (Do NOT assume or hardcode 'postgres')
if ([string]::IsNullOrWhiteSpace($PgUser)) {
    Write-Host ""
    Write-Host "PostgreSQL Authentication Required:" -ForegroundColor Yellow
    $PgUser = (Read-Host "Enter PostgreSQL Username").Trim()
    if ([string]::IsNullOrWhiteSpace($PgUser)) {
        Write-Error "PostgreSQL username cannot be empty. Aborting."
        exit 1
    }
}

# Masked Interactive Password Entry
Write-Host "Enter password for PostgreSQL user '$PgUser' (input is masked):" -ForegroundColor Gray
$securePass = Read-Host "Password" -AsSecureString

$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
$plainPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

# Transient process environment variable for client tools (cleared in finally block)
$env:PGPASSWORD = $plainPass

# Helper function to query table row count with ON_ERROR_STOP=1
function Get-DbRowCount {
    param(
        [string]$Database,
        [string]$Table
    )
    # Standard clean SQL query without ambiguous PowerShell nested quotes
    $query = "SELECT COUNT(*) FROM $Table;"
    $output = & psql -h $HostName -p $Port -U $PgUser -d $Database -v ON_ERROR_STOP=1 -t -A -c $query 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        return [PSCustomObject]@{
            Table   = $Table
            Count   = $null
            Success = $false
            Error   = ($output -join " ").Trim()
        }
    }

    $rawVal = ($output -join "").Trim()
    if ($rawVal -match '^\d+$') {
        return [PSCustomObject]@{
            Table   = $Table
            Count   = [int64]$rawVal
            Success = $true
            Error   = $null
        }
    } else {
        return [PSCustomObject]@{
            Table   = $Table
            Count   = $null
            Success = $false
            Error   = "Non-numeric response: $rawVal"
        }
    }
}

try {
    # ==========================================================================
    # STEP A: Fresh Custom-Format Backup & TOC Verification
    # ==========================================================================
    Write-Host ""
    Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "STEP A: Creating Fresh Custom-Format Backup of '$SourceDb'..." -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan

    if (-not (Test-Path $resolvedBackupDir)) {
        Write-Host "Creating backup directory: $resolvedBackupDir" -ForegroundColor Gray
        New-Item -ItemType Directory -Force -Path $resolvedBackupDir | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFileName = "aiims_db_preflight_$timestamp.dump"
    $backupFilePath = Join-Path $resolvedBackupDir $backupFileName

    Write-Host "Target Backup File: $backupFilePath" -ForegroundColor Gray
    Write-Host "Executing pg_dump (format=custom, blobs=included, verbose)..." -ForegroundColor Gray

    & pg_dump -h $HostName -p $Port -U $PgUser -d $SourceDb -F c -b -v -f "$backupFilePath"
    $dumpExitCode = $LASTEXITCODE

    if ($dumpExitCode -ne 0) {
        Write-Error "pg_dump failed with exit code $dumpExitCode. Aborting verification."
        exit $dumpExitCode
    }

    # 1. Existence check
    if (-not (Test-Path $backupFilePath)) {
        Write-Error "pg_dump completed but output file was not created: $backupFilePath"
        exit 1
    }

    # 2. Non-zero size check
    $fileItem = Get-Item $backupFilePath
    $fileSizeBytes = $fileItem.Length
    $fileSizeMB = [math]::Round($fileSizeBytes / 1MB, 2)

    if ($fileSizeBytes -le 0) {
        Write-Error "pg_dump produced a 0-byte file: $backupFilePath. Aborting."
        exit 1
    }

    # 3. SHA-256 calculation
    Write-Host "Calculating SHA-256 checksum..." -ForegroundColor Gray
    $hashObj = Get-FileHash -Path $backupFilePath -Algorithm SHA256
    $sha256 = $hashObj.Hash

    # 4. Table of contents verification via pg_restore --list
    Write-Host "Verifying backup table of contents via pg_restore --list..." -ForegroundColor Gray
    $toc = & pg_restore --list "$backupFilePath" 2>&1
    $listExitCode = $LASTEXITCODE
    if ($listExitCode -ne 0 -or [string]::IsNullOrWhiteSpace(($toc -join "").Trim())) {
        Write-Error "pg_restore --list failed (exit code $listExitCode) or TOC is empty. Dump is invalid. Aborting."
        exit 1
    }

    Write-Host "[STEP A SUCCESS] Backup created and verified successfully." -ForegroundColor Green
    Write-Host "  File Path: $backupFilePath" -ForegroundColor Green
    Write-Host "  File Size: $fileSizeBytes bytes ($fileSizeMB MB)" -ForegroundColor Green
    Write-Host "  SHA-256:   $sha256" -ForegroundColor Green
    Write-Host "  TOC List:  Valid ($($toc.Count) entries recorded)" -ForegroundColor Green

    # ==========================================================================
    # STEP B: Separate Isolated Restore Test
    # ==========================================================================
    Write-Host ""
    Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "STEP B: Restoring into Separate Test Database '$TestDb'..." -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan

    Write-Host "Checking whether '$TestDb' already exists..." -ForegroundColor Gray
    $checkExistsQuery = "SELECT 1 FROM pg_database WHERE datname = '$TestDb';"
    $checkExists = & psql -h $HostName -p $Port -U $PgUser -d postgres -v ON_ERROR_STOP=1 -t -A -c $checkExistsQuery 2>&1
    if (($checkExists -join "").Trim() -eq "1") {
        Write-Error "ABORT: Target test database '$TestDb' already exists! Automatic overwrite is prohibited. Please inspect and drop '$TestDb' manually before running verification."
        exit 1
    }

    Write-Host "Creating separate test database '$TestDb'..." -ForegroundColor Gray
    & createdb -h $HostName -p $Port -U $PgUser $TestDb
    $createDbExitCode = $LASTEXITCODE
    if ($createDbExitCode -ne 0) {
        Write-Error "createdb failed to create '$TestDb' with exit code $createDbExitCode. Aborting."
        exit $createDbExitCode
    }
    Write-Host "Test database '$TestDb' created successfully." -ForegroundColor Green

    Write-Host "Executing pg_restore into '$TestDb' (--exit-on-error, without --clean)..." -ForegroundColor Gray
    # STRICT SAFETY RULES:
    # 1. Never use --clean.
    # 2. Never restore into aiims_db.
    & pg_restore -h $HostName -p $Port -U $PgUser -d $TestDb --exit-on-error -v "$backupFilePath"
    $restoreExitCode = $LASTEXITCODE

    if ($restoreExitCode -ne 0) {
        Write-Error "pg_restore failed with exit code $restoreExitCode. Test database '$TestDb' preserved for inspection."
        exit $restoreExitCode
    }
    Write-Host "[STEP B SUCCESS] pg_restore completed successfully with exit code 0." -ForegroundColor Green

    # ==========================================================================
    # STEP C: Compare Table Counts
    # ==========================================================================
    Write-Host ""
    Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "STEP C: Comparing Table Counts Between '$SourceDb' & '$TestDb'..." -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan

    $tablesToCheck = @(
        "users",
        "credit_ledger",
        "student_profiles",
        "entrepreneur_profiles"
    )

    $comparisonResults = @()
    $allMatch = $true
    $hasErrors = $false

    foreach ($tbl in $tablesToCheck) {
        $srcRes = Get-DbRowCount -Database $SourceDb -Table $tbl
        $testRes = Get-DbRowCount -Database $TestDb -Table $tbl

        $status = "UNKNOWN"

        if (-not $srcRes.Success) {
            $hasErrors = $true
            $status = "FAILED"
            $srcDisplay = "ERROR: " + $srcRes.Error
        } else {
            $srcDisplay = $srcRes.Count
        }

        if (-not $testRes.Success) {
            $hasErrors = $true
            $status = "FAILED"
            $testDisplay = "ERROR: " + $testRes.Error
        } else {
            $testDisplay = $testRes.Count
        }

        if ($srcRes.Success -and $testRes.Success) {
            if ($srcRes.Count -eq $testRes.Count) {
                $status = "MATCH"
            } else {
                $status = "MISMATCH"
                $allMatch = $false
            }
        } else {
            $allMatch = $false
        }

        $comparisonResults += [PSCustomObject]@{
            "Table"          = $tbl
            "Source count"   = $srcDisplay
            "Restored count" = $testDisplay
            "Result"         = $status
        }
    }

    # Display side-by-side table
    $comparisonResults | Format-Table -AutoSize

    Write-Host "Verification Checklist:" -ForegroundColor Gray
    Write-Host "  1. Backup file exists and non-zero:     PASS ($fileSizeBytes bytes)" -ForegroundColor Green
    Write-Host "  2. SHA-256 checksum recorded:           PASS ($sha256)" -ForegroundColor Green
    Write-Host "  3. pg_restore --list TOC valid:         PASS" -ForegroundColor Green
    Write-Host "  4. pg_restore completed without error:   PASS (Exit code 0)" -ForegroundColor Green

    if ($allMatch -and (-not $hasErrors)) {
        Write-Host "  5. All four table counts match:         PASS" -ForegroundColor Green
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║              VERDICT: BKP-1 VERIFIED                             ║" -ForegroundColor Green
        Write-Host "║  Fresh backup, isolated restore & all 4 table counts match 100%. ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    } else {
        Write-Host "  5. All four table counts match:         FAILED" -ForegroundColor Red
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
        Write-Host "║              VERDICT: BKP-1 FAILED / INCONCLUSIVE                ║" -ForegroundColor Red
        Write-Host "║  Table count mismatch or query errors detected.                  ║" -ForegroundColor Red
        Write-Host "║  If writes occurred during verification window, comparison is   ║" -ForegroundColor Red
        Write-Host "║  inconclusive and must be repeated under stable data window.     ║" -ForegroundColor Red
        Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    }

    # ==========================================================================
    # STEP D: Teardown & Cleanup Instructions (Zero Automatic Drops)
    # ==========================================================================
    Write-Host ""
    Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "STEP D: Test Database Teardown & Cleanup Instructions            " -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "CRITICAL RULE: Automated drop is strictly prohibited." -ForegroundColor Yellow
    Write-Host "Test database '$TestDb' is preserved on PostgreSQL 17 for owner inspection." -ForegroundColor Gray
    Write-Host ""
    Write-Host "When you are ready to remove the test database, execute this command manually:" -ForegroundColor Gray
    Write-Host "  dropdb -h $HostName -p $Port -U $PgUser -W $TestDb" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "NEVER execute dropdb against 'aiims_db'." -ForegroundColor Red

} finally {
    # CRITICAL SECURITY SANITIZATION: Wipe password from process memory
    $env:PGPASSWORD = $null
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    $plainPass = $null
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Script execution completed.                                    " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

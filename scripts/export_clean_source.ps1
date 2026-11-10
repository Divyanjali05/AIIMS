<#
.SYNOPSIS
    Exports a clean, sanitized AIIMS source archive excluding secrets, build outputs, and version control files.
.DESCRIPTION
    Complies with AIIMS Task T-A specifications:
    - Excludes all .env files (except *.env.example)
    - Excludes .git, node_modules, dist, and build directories
    - Excludes temporary artifacts, logs, and report directories
    - Produces a timestamped zip archive
#>

[CmdletBinding()]
param (
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $exportDir = Join-Path $repoRoot "exports"
    if (-not (Test-Path $exportDir)) {
        New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
    }
    $OutputPath = Join-Path $exportDir "aiims_clean_export_$timestamp.zip"
} else {
    $OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
    $parentDir = [System.IO.Path]::GetDirectoryName($OutputPath)
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
}

Write-Host "============================================================"
Write-Host " AIIMS Safe Clean Source Export"
Write-Host " Repository Root: $repoRoot"
Write-Host " Destination:     $OutputPath"
Write-Host "============================================================"

# Forbidden path patterns (case-insensitive)
$excludedFolderPatterns = @(
    "[\\/]\.git([\\/]|$)",
    "[\\/]node_modules([\\/]|$)",
    "[\\/]dist([\\/]|$)",
    "[\\/]exports([\\/]|$)",
    "[\\/]\.husky[\\/]_([\\/]|$)",
    "[\\/]playwright-report([\\/]|$)",
    "[\\/]test-results([\\/]|$)",
    "[\\/]blob-report([\\/]|$)",
    "[\\/]\.gradle([\\/]|$)",
    "[\\/]android[\\/]app[\\/]build([\\/]|$)",
    "[\\/]android[\\/]capacitor-cordova-android-plugins([\\/]|$)"
)

# Forbidden file patterns (secrets, credentials, local overrides)
$excludedFilePatterns = @(
    "(^|[\\/])\.env$",
    "(^|[\\/])\.env\.(?!example$)[^\\/]+$",
    "(^|[\\/])\.env\.local$",
    "\.pem$",
    "\.key$",
    "\.pfx$",
    "\.p12$",
    "\.pkcs12$",
    "^id_rsa",
    "^id_ecdsa",
    "^id_ed25519",
    "(^|[\\/])\.credentials$",
    "(^|[\\/])gitleaks.*\.json$",
    "(^|[\\/])gitleaks.*\.sarif$",
    "\.log$",
    "\.DS_Store$",
    "Thumbs\.db$",
    "local\.properties$"
)

# Collect files
$allFiles = Get-ChildItem -Path $repoRoot -Recurse -File -Force

$filesToInclude = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
$excludedCount = 0

foreach ($file in $allFiles) {
    $relativePath = $file.FullName.Substring($repoRoot.Length)
    if ($relativePath.StartsWith("\") -or $relativePath.StartsWith("/")) {
        $relativePath = $relativePath.Substring(1)
    }

    # Check directory exclusions
    $exclude = $false
    foreach ($pattern in $excludedFolderPatterns) {
        if ($relativePath -match $pattern) {
            $exclude = $true
            break
        }
    }

    if ($exclude) {
        $excludedCount++
        continue
    }

    # Check file exclusions
    foreach ($fPattern in $excludedFilePatterns) {
        if ($file.Name -match $fPattern -or $relativePath -match $fPattern) {
            # Ensure .env.example is explicitly preserved
            if ($file.Name -like "*.env.example" -or $file.Name -eq ".env.example") {
                # Preserve example files
                continue
            }
            $exclude = $true
            break
        }
    }

    if ($exclude) {
        $excludedCount++
        continue
    }

    $filesToInclude.Add($file)
}

Write-Host "Collected $($filesToInclude.Count) clean source files (Filtered out $excludedCount excluded/ignored entries)."

# Create temporary staging directory for atomic zip creation
$stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) ("aiims_export_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

try {
    foreach ($file in $filesToInclude) {
        $rel = $file.FullName.Substring($repoRoot.Length)
        if ($rel.StartsWith("\") -or $rel.StartsWith("/")) {
            $rel = $rel.Substring(1)
        }
        $targetFile = Join-Path $stagingDir $rel
        $targetParent = [System.IO.Path]::GetDirectoryName($targetFile)
        if (-not (Test-Path $targetParent)) {
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
        }
        Copy-Item -Path $file.FullName -Destination $targetFile -Force
    }

    $destFolder = [System.IO.Path]::GetDirectoryName($OutputPath)
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }

    if (Test-Path $OutputPath) {
        Remove-Item -Path $OutputPath -Force
    }

    Write-Host "Compressing archive to: $OutputPath"
    [System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $OutputPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    Write-Host "Archive created successfully. File size: $((Get-Item $OutputPath).Length) bytes"
} finally {
    if (Test-Path $stagingDir) {
        Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

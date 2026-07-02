<#
.SYNOPSIS
    Raeumt generierte/temporaere Artefakte aus dem Projekt, damit ein frischer
    `npm install` + Rollout-Test wie bei einem sauberen Clone moeglich ist.

.DESCRIPTION
    Entfernt ausschliesslich regenerierbare Verzeichnisse/Dateien:
      - node_modules            (npm install)
      - .electron-cache         (Download-Cache von Fix-Electron.ps1)
      - out                     (electron-vite Build-Ausgabe)
      - release                 (electron-builder Paket-Ausgabe)
      - *.tsbuildinfo           (TypeScript-Inkrementalinfo)

    Quellcode, Konfigurationen, package.json/package-lock.json, scripts/, Build/,
    Fix-Electron.ps1, Doku und .git bleiben unangetastet.

.PARAMETER DryRun
    Zeigt nur an, was geloescht wuerde, ohne etwas zu entfernen.

.EXAMPLE
    .\Clean-Repo.ps1
    # Raeumt auf. Danach:  npm install  ->  npm run dev  /  npm run package:win

.EXAMPLE
    .\Clean-Repo.ps1 -DryRun
    # Nur Vorschau, loescht nichts.

.NOTES
    Bewusst reines PowerShell (keine node_modules-Abhaengigkeit wie rimraf),
    damit das Loeschen von node_modules sich nicht selbst blockiert.
#>
[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }
Set-Location $projectRoot

function Write-Info($msg) { Write-Host "[Clean-Repo] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[Clean-Repo] $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "[Clean-Repo] $msg" -ForegroundColor DarkGray }

# Zu entfernende Verzeichnisse (regenerierbar)
$dirs = @('node_modules', '.electron-cache', 'out', 'release')
# Zu entfernende Datei-Muster (regenerierbar)
$fileGlobs = @('*.tsbuildinfo')

$totalBytes = 0
$removed = @()

foreach ($d in $dirs) {
    $full = Join-Path $projectRoot $d
    if (Test-Path $full) {
        $size = (Get-ChildItem $full -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if (-not $size) { $size = 0 }
        $totalBytes += $size
        $mb = [math]::Round($size / 1MB, 1)
        if ($DryRun) {
            Write-Info "WUERDE loeschen: $d\  ($mb MB)"
        } else {
            Write-Info "Loesche $d\  ($mb MB) ..."
            Remove-Item $full -Recurse -Force -ErrorAction Stop
            $removed += $d
        }
    } else {
        Write-Skip "nicht vorhanden: $d\"
    }
}

foreach ($glob in $fileGlobs) {
    $matches = Get-ChildItem $projectRoot -Filter $glob -File -ErrorAction SilentlyContinue
    foreach ($f in $matches) {
        $totalBytes += $f.Length
        if ($DryRun) {
            Write-Info "WUERDE loeschen: $($f.Name)"
        } else {
            Write-Info "Loesche $($f.Name) ..."
            Remove-Item $f.FullName -Force -ErrorAction Stop
            $removed += $f.Name
        }
    }
}

$totalMb = [math]::Round($totalBytes / 1MB, 1)
Write-Host ""
if ($DryRun) {
    Write-Ok "Vorschau abgeschlossen. Freizugebender Platz: ~$totalMb MB. (Nichts geloescht - -DryRun)"
} else {
    Write-Ok "Aufraeumen abgeschlossen. Freigegeben: ~$totalMb MB."
    Write-Ok "Naechste Schritte:  npm install   ->   npm run dev   /   npm run package:win"
}

<#
.SYNOPSIS
    Raeumt generierte/temporaere Artefakte aus dem Projekt, damit ein frischer
    `npm install` + Rollout-Test wie bei einem sauberen Clone moeglich ist.

.DESCRIPTION
    Entfernt regenerierbare Verzeichnisse/Dateien im Projekt:
      - node_modules            (npm install)
      - .electron-cache         (Download-Cache von Fix-Electron.ps1)
      - out                     (electron-vite Build-Ausgabe)
      - release                 (electron-builder Paket-Ausgabe)
      - *.tsbuildinfo           (TypeScript-Inkrementalinfo)

    Entfernt zusaetzlich die ausserhalb des Projekts liegenden, lokal gecachten
    Electron-userData-Verzeichnisse dieser App (MSAL-Token-Cache, lokal gespeicherte
    Rollen-Presets/Templates, Standardrollen), damit vor jedem Deployment/Test kein
    Rechner-spezifischer Zustand mehr vorhanden ist:
      - %APPDATA%\GDAP-Manager  (Dev-Name aus package.json "name")
      - %APPDATA%\GDAP Manager  (Produktname aus electron-builder, falls die
                                 gepackte EXE auf diesem Rechner bereits lief)

    Mit -IncludeGlobalCaches werden zusaetzlich die MASCHINENWEITEN, von allen
    Electron/electron-builder-Projekten gemeinsam genutzten Download-Caches entfernt
    (erzwingt bei jedem Projekt einen erneuten Download beim naechsten Build):
      - %LOCALAPPDATA%\electron\Cache            (Electron-Binary-Downloads)
      - %LOCALAPPDATA%\electron-builder\Cache     (winCodeSign, NSIS, etc.)

    Quellcode, Konfigurationen, package.json/package-lock.json, scripts/, Build/,
    Fix-Electron.ps1, Doku und .git bleiben unangetastet.

.PARAMETER DryRun
    Zeigt nur an, was geloescht wuerde, ohne etwas zu entfernen.

.PARAMETER IncludeGlobalCaches
    Entfernt zusaetzlich die maschinenweiten Electron- und electron-builder-Caches
    (siehe .DESCRIPTION). Betrifft auch andere Projekte auf diesem Rechner.

.EXAMPLE
    .\Clean-Repo.ps1
    # Raeumt Projekt + App-eigene userData auf. Danach:  npm install  ->  npm run dev  /  npm run package:win

.EXAMPLE
    .\Clean-Repo.ps1 -DryRun
    # Nur Vorschau, loescht nichts.

.EXAMPLE
    .\Clean-Repo.ps1 -IncludeGlobalCaches
    # Raeumt zusaetzlich die maschinenweiten Electron/electron-builder-Caches auf.

.NOTES
    Bewusst reines PowerShell (keine node_modules-Abhaengigkeit wie rimraf),
    damit das Loeschen von node_modules sich nicht selbst blockiert.
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$IncludeGlobalCaches
)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }
Set-Location $projectRoot

function Write-Info($msg) { Write-Host "[Clean-Repo] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[Clean-Repo] $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "[Clean-Repo] $msg" -ForegroundColor DarkGray }

function Stop-ProjectNodeProcesses {
    $escapedRoot = [regex]::Escape($projectRoot)
    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessId -ne $PID -and
        $_.Name -match '^(node|electron|esbuild)\.exe$' -and
        (
            ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($projectRoot, [StringComparison]::OrdinalIgnoreCase)) -or
            ($_.CommandLine -and $_.CommandLine -match $escapedRoot)
        )
    }

    foreach ($p in $processes) {
        Write-Info "Stoppe blockierenden Prozess: $($p.Name) PID $($p.ProcessId)"
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Remove-PathWithRetry($Path, $DisplayName, [switch]$Recurse) {
    $maxAttempts = 3
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            if ($Recurse) {
                Remove-Item $Path -Recurse -Force -ErrorAction Stop
            } else {
                Remove-Item $Path -Force -ErrorAction Stop
            }
            return
        } catch {
            if ($attempt -eq 1) {
                Stop-ProjectNodeProcesses
            }

            if ($attempt -lt $maxAttempts) {
                Write-Info "Loeschen von $DisplayName war blockiert, versuche erneut ($($attempt + 1)/$maxAttempts) ..."
                Start-Sleep -Milliseconds 750
                continue
            }

            throw "Konnte $DisplayName nicht loeschen. Vermutlich haelt noch ein laufender Prozess eine Datei offen. Schliessen Sie GDAP Manager, Dev-Server und Terminals im Projektordner und starten Sie .\Clean-Repo.ps1 erneut. Details: $($_.Exception.Message)"
        }
    }
}

# Zu entfernende Verzeichnisse (regenerierbar, im Projekt)
$dirs = @('node_modules', '.electron-cache', 'out', 'release')
# Zu entfernende Datei-Muster (regenerierbar, im Projekt)
$fileGlobs = @('*.tsbuildinfo')

# App-eigene, ausserhalb des Projekts liegende userData-Verzeichnisse (MSAL-Cache,
# lokal gespeicherte Rollen-Presets/Templates, Standardrollen). Beide Namensvarianten
# pruefen, da Dev (package.json "name") und gepackte EXE (electron-builder productName)
# unterschiedliche Ordnernamen verwenden.
$externalDirs = @(
    @{ Path = (Join-Path $env:APPDATA 'GDAP-Manager'); Display = '%APPDATA%\GDAP-Manager\ (Dev userData)' }
    @{ Path = (Join-Path $env:APPDATA 'GDAP Manager'); Display = '%APPDATA%\GDAP Manager\ (gepackte App userData)' }
)

if ($IncludeGlobalCaches) {
    # Maschinenweite, von ALLEN Electron/electron-builder-Projekten gemeinsam genutzte Caches.
    $externalDirs += @(
        @{ Path = (Join-Path $env:LOCALAPPDATA 'electron\Cache'); Display = '%LOCALAPPDATA%\electron\Cache\ (globaler Electron-Binary-Cache)' }
        @{ Path = (Join-Path $env:LOCALAPPDATA 'electron-builder\Cache'); Display = '%LOCALAPPDATA%\electron-builder\Cache\ (globaler electron-builder-Cache)' }
    )
}

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
            Remove-PathWithRetry $full "$d\" -Recurse
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
            Remove-PathWithRetry $f.FullName $f.Name
            $removed += $f.Name
        }
    }
}

foreach ($ext in $externalDirs) {
    $full = $ext.Path
    $displayName = $ext.Display
    if (Test-Path $full) {
        $size = (Get-ChildItem $full -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if (-not $size) { $size = 0 }
        $totalBytes += $size
        $mb = [math]::Round($size / 1MB, 1)
        if ($DryRun) {
            Write-Info "WUERDE loeschen: $displayName  ($mb MB)"
        } else {
            Write-Info "Loesche $displayName  ($mb MB) ..."
            Remove-PathWithRetry $full $displayName -Recurse
            $removed += $displayName
        }
    } else {
        Write-Skip "nicht vorhanden: $displayName"
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

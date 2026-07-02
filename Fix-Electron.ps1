<#
.SYNOPSIS
    Repariert eine kaputte Electron-Installation ("Error: Electron uninstall" bei `npm run dev`).

.DESCRIPTION
    Dieses Skript behebt das Problem, dass beim Clonen/Installieren des Repos auf einem
    Netzlaufwerk (z. B. Z:\) die Electron-Binary nicht korrekt entpackt wird. Symptome:
      - node_modules\electron\path.txt ist leer
      - node_modules\electron\dist\electron.exe fehlt
      - der dist-Ordner enthaelt nur eine Teil-Datei

    Ablauf:
      1. Schnell-Check: Ist Electron bereits korrekt installiert? -> Ende ohne Aktion.
      2. Download anstossen (legt das ZIP im projektlokalen Cache .electron-cache ab).
      3. dist-Ordner neu, nativ mit Expand-Archive entpacken (netzlaufwerk-sicher).
      4. Von electron-vite benoetigte Metadateien (path.txt, dist\version) anlegen.
      5. Verifizieren.

.PARAMETER Force
    Fuehrt die Reparatur auch dann aus, wenn der Schnell-Check "ok" meldet.

.EXAMPLE
    .\Fix-Electron.ps1

.EXAMPLE
    .\Fix-Electron.ps1 -Force

.NOTES
    Fuehre das Skript im Projekt-Root aus (dort wo package.json liegt).
    Nach jedem `npm install` / Loeschen von node_modules kann das Problem wiederkehren.
#>
[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# In das Skript-Verzeichnis wechseln (Projekt-Root)
$projectRoot = $PSScriptRoot
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }
Set-Location $projectRoot

$electronDir = Join-Path $projectRoot 'node_modules\electron'
$distDir     = Join-Path $electronDir 'dist'
$pathTxt     = Join-Path $electronDir 'path.txt'
$exePath     = Join-Path $distDir 'electron.exe'

function Write-Step($msg) { Write-Host "[Fix-Electron] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[Fix-Electron] $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "[Fix-Electron] $msg" -ForegroundColor Yellow }

# --- Vorpruefung: Ist Electron ueberhaupt installiert? ---
if (-not (Test-Path $electronDir)) {
    throw "node_modules\electron wurde nicht gefunden. Bitte zuerst 'npm install' ausfuehren."
}

# --- Schritt 1: Schnell-Check ---
# Hinweis: Bei leerer path.txt liefert Get-Content -Raw $null. Daher explizit auf
# Wahrheitswert pruefen, bevor .Trim()/.Length aufgerufen wird.
$rawPath = if (Test-Path $pathTxt) { Get-Content $pathTxt -Raw -ErrorAction SilentlyContinue } else { $null }
$pathTxtContent = if ($rawPath) { $rawPath.Trim() } else { '' }
$exeExists      = Test-Path $exePath

if ($exeExists -and $pathTxtContent.Length -gt 0 -and -not $Force) {
    Write-Ok "Electron ist bereits korrekt installiert (path.txt='$pathTxtContent', electron.exe vorhanden)."
    Write-Ok "Keine Reparatur noetig. Mit -Force kann die Reparatur erzwungen werden."
    return
}

Write-Warn2 "Kaputte oder unvollstaendige Electron-Installation erkannt - starte Reparatur..."

# Installierte Electron-Version bestimmen (fuer versionsgenaue ZIP-Auswahl)
$version = (Get-Content (Join-Path $electronDir 'package.json') | ConvertFrom-Json).version
Write-Step "Installierte Electron-Version: $version"

# --- Schritt 2: Download ins projektlokale Cache-Verzeichnis anstossen ---
Write-Step "Stosse Electron-Download an (Cache: .electron-cache)..."
$env:electron_config_cache = Join-Path $projectRoot '.electron-cache'
$installJs = Join-Path $electronDir 'install.js'
if (Test-Path $installJs) {
    # Entpacken schlaegt auf Netzlaufwerken fehl - Fehler hier bewusst ignorieren.
    try { node $installJs } catch { Write-Warn2 "install.js meldete einen Fehler (erwartet beim Entpacken auf Netzlaufwerk) - fahre fort." }
}

# --- Schritt 3: gecachtes ZIP finden (versionsgenau!) ---
Write-Step "Suche gecachtes Electron-ZIP zur Version $version..."
$allZips = Get-ChildItem $env:electron_config_cache -Recurse -Filter *.zip -ErrorAction SilentlyContinue
# Bevorzugt das ZIP, dessen Name die installierte Version enthaelt (verhindert Versions-Mismatch,
# wenn im Cache noch ZIPs aelterer Versionen liegen).
$zip = ($allZips | Where-Object { $_.Name -like "*-v$version-*" } | Select-Object -First 1).FullName
if (-not $zip) {
    Write-Warn2 "Kein ZIP zur exakten Version $version gefunden - verwende neuestes verfuegbares ZIP im Cache."
    $zip = ($allZips | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}
if (-not $zip) {
    throw "Kein Electron-ZIP im Cache gefunden ('$($env:electron_config_cache)'). Download pruefen (Internet/Proxy)."
}
Write-Ok "ZIP gewaehlt: $zip"

# --- Schritt 4: dist-Ordner leeren und ZIP nativ entpacken (netzlaufwerk-sicher) ---
Write-Step "Entpacke ZIP nativ mit Expand-Archive..."
Remove-Item $distDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
Expand-Archive -Path $zip -DestinationPath $distDir -Force

if (-not (Test-Path $exePath)) {
    throw "Entpacken fehlgeschlagen: electron.exe wurde nicht gefunden."
}
$fileCount = (Get-ChildItem $distDir -Recurse -File | Measure-Object).Count
Write-Ok "Entpackt: electron.exe vorhanden, $fileCount Dateien im dist-Ordner."

# --- Schritt 5: Metadateien anlegen ---
Write-Step "Lege Metadateien an (path.txt, dist\version)..."
Set-Content -Path $pathTxt -Value "electron.exe" -NoNewline -Encoding ascii
Set-Content -Path (Join-Path $distDir 'version') -Value "v$version" -NoNewline -Encoding ascii

# --- Schritt 6: Verifizieren ---
$rawFinalPath    = Get-Content $pathTxt -Raw -ErrorAction SilentlyContinue
$rawFinalVersion = Get-Content (Join-Path $distDir 'version') -Raw -ErrorAction SilentlyContinue
$finalPath    = if ($rawFinalPath) { $rawFinalPath.Trim() } else { '' }
$finalVersion = if ($rawFinalVersion) { $rawFinalVersion.Trim() } else { '' }
Write-Ok "Fertig. path.txt='$finalPath', version='$finalVersion'."
Write-Ok "Electron ist repariert. Du kannst jetzt 'npm run dev' ausfuehren."

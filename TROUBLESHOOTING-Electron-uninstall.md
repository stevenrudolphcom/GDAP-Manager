# Fehlerbehebung: `Error: Electron uninstall` bei `npm run dev`

## Symptom

Beim Ausführen von `npm run dev` wird der Renderer- und Main-Prozess erfolgreich gebaut,
aber der Start der Electron-App bricht ab:

```text
dev server running for the electron renderer process at:
  ➜  Local:   http://localhost:5173/
error during start dev server and electron app:
Error: Electron uninstall
    at getElectronPath (.../electron-vite/dist/chunks/lib-...js)
    at startElectron (...)
    at createServer (...)
```

## Ursache

Der Fehlertext `Electron uninstall` ist **irreführend** – Electron ist nicht „deinstalliert".
electron-vite liest in `getElectronPath()` die Datei `node_modules/electron/path.txt`.
Fehlt oder ist diese leer, wird `Error: Electron uninstall` geworfen.

In diesem Projekt lagen **zwei zusammenwirkende Ursachen** vor:

1. **Blockierte Install-Skripte:** Beim `npm install` wurden die Post-Install-Skripte durch die
   npm-Konfiguration (`allow-scripts` / `approve-scripts`) blockiert. Dadurch lief Electrons
   `install.js` (postinstall) nie, das normalerweise die Binary herunterlädt und `path.txt` erzeugt.
   Erkennbar an der Warnung beim Install:
   ```text
   npm warn allow-scripts ... (install scripts not yet covered by allowScripts)
   npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review
   ```

2. **Netzlaufwerk `Z:\`:** Als `install.js` manuell gestartet wurde, funktionierte der **Download**
   des ZIP-Archivs korrekt (inkl. Checksummen-Prüfung), aber das **Entpacken** mit `extract-zip`
   brach direkt nach der **ersten Datei** ab. Das Entpacken tausender Dateien direkt auf ein
   gemapptes Netzlaufwerk ist unzuverlässig. Ergebnis:
   - `node_modules/electron/dist/electron.exe` fehlt
   - `node_modules/electron/path.txt` fehlt / ist leer
   - `node_modules/electron/dist/` enthält nur eine Teil-Datei

## Diagnose-Schritte (zur Bestätigung der Ursache)

```powershell
# 1. Prüfen, ob path.txt existiert und Inhalt hat
Get-Content node_modules\electron\path.txt

# 2. Prüfen, ob die Binary vorhanden ist
Test-Path node_modules\electron\dist\electron.exe

# 3. Anzahl der Dateien im dist-Ordner (sollte > 70 sein, nicht 1)
(Get-ChildItem node_modules\electron\dist\ -Recurse -File | Measure-Object).Count
```

Ist `path.txt` leer, `electron.exe` = `False` und die Dateizahl sehr niedrig → genau dieses Problem.

## Durchgeführte Lösung (Schritt für Schritt)

Das ZIP-Archiv war nach dem Download-Versuch bereits korrekt im Cache vorhanden. Statt es erneut
über das fehleranfällige `extract-zip` zu entpacken, wurde es mit dem nativen Windows-Cmdlet
`Expand-Archive` entpackt (zuverlässig auch auf Netzlaufwerken) und die von electron-vite
benötigten Metadateien wurden manuell angelegt.

```powershell
# --- Schritt 1: Download anstoßen (erzeugt das ZIP im Cache) ---
# Cache bewusst ins Projekt legen, damit das ZIP auffindbar ist
$env:electron_config_cache = "$PWD\.electron-cache"
node node_modules\electron\install.js
# Hinweis: Der Download + Checksum ist erfolgreich; das Entpacken schlägt auf Z:\ fehl.

# --- Schritt 2: Gecachtes ZIP finden ---
$zip = (Get-ChildItem .electron-cache -Recurse -Filter *.zip | Select-Object -First 1).FullName
Write-Host "ZIP: $zip"

# --- Schritt 3: dist-Ordner leeren und ZIP manuell entpacken ---
Remove-Item node_modules\electron\dist -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path node_modules\electron\dist -Force | Out-Null
Expand-Archive -Path $zip -DestinationPath node_modules\electron\dist -Force

# --- Schritt 4: Erfolg des Entpackens prüfen ---
Test-Path node_modules\electron\dist\electron.exe   # muss True sein
(Get-ChildItem node_modules\electron\dist -Recurse -File | Measure-Object).Count  # ~73

# --- Schritt 5: Von electron-vite benötigte Metadateien anlegen ---
# path.txt: zeigt auf die Executable
Set-Content -Path node_modules\electron\path.txt -Value "electron.exe" -NoNewline -Encoding ascii
# version-Datei: für den isInstalled()-Check von install.js
$v = (Get-Content node_modules\electron\package.json | ConvertFrom-Json).version
Set-Content -Path node_modules\electron\dist\version -Value "v$v" -NoNewline -Encoding ascii

# --- Schritt 6: Verifizieren ---
Get-Content node_modules\electron\path.txt          # -> electron.exe
Get-Content node_modules\electron\dist\version      # -> v30.0.0

# --- Schritt 7: App starten ---
npm run dev
```

Ergebnis: Electron startet, das Fenster öffnet sich, die MSAL-Authentifizierung läuft an.
Der Fehler `Error: Electron uninstall` tritt nicht mehr auf.

---

## Fahrplan / Anleitung, falls das Problem erneut auftritt

### Schnell-Check (30 Sekunden)

```powershell
Get-Content node_modules\electron\path.txt
Test-Path node_modules\electron\dist\electron.exe
```

- **`path.txt` hat Inhalt (`electron.exe`) und Binary = `True`** → anderes Problem, siehe unten „Weitere Fälle".
- **`path.txt` leer / Binary = `False`** → mit der folgenden Reparatur fortfahren.

### Reparatur-Skript (Copy & Paste)

Im Projektordner (`Z:\REPO\GDAP-Manager`) ausführen:

```powershell
# 1) Download ins projektlokale Cache-Verzeichnis anstoßen
$env:electron_config_cache = "$PWD\.electron-cache"
node node_modules\electron\install.js

# 2) ZIP im Cache lokalisieren
$zip = (Get-ChildItem .electron-cache -Recurse -Filter *.zip | Select-Object -First 1).FullName
if (-not $zip) { throw "Kein Electron-ZIP im Cache gefunden - Download pruefen (Internet/Proxy)." }

# 3) dist neu entpacken (nativ, netzlaufwerk-sicher)
Remove-Item node_modules\electron\dist -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $zip -DestinationPath node_modules\electron\dist -Force

# 4) Metadateien anlegen
Set-Content -Path node_modules\electron\path.txt -Value "electron.exe" -NoNewline -Encoding ascii
$v = (Get-Content node_modules\electron\package.json | ConvertFrom-Json).version
Set-Content -Path node_modules\electron\dist\version -Value "v$v" -NoNewline -Encoding ascii

# 5) Verifizieren & starten
Test-Path node_modules\electron\dist\electron.exe
npm run dev
```

> Hinweis: `path.txt` enthält unter **Windows** `electron.exe`, unter **macOS**
> `Electron.app/Contents/MacOS/Electron`, unter **Linux** `electron`.

### Nachhaltige Lösungen (Problem dauerhaft vermeiden)

1. **Empfohlen – Projekt auf ein lokales Laufwerk legen** (z. B. `C:\REPO\GDAP-Manager`).
   Netzlaufwerke (`Z:\`) verursachen das Entpack-Problem regelmäßig. Auf lokalem Laufwerk
   läuft `npm install` inkl. Electron-Entpacken normal durch.

2. **Install-Skripte nach jedem `npm install` freigeben**, falls das Projekt auf `Z:\` bleibt:
   ```powershell
   npm approve-scripts --allow-scripts-pending   # interaktiv freigeben
   # oder gezielt:
   npm approve-scripts electron
   ```
   Schlägt danach das Entpacken erneut fehl (Netzlaufwerk), das Reparatur-Skript oben ausführen.

3. **Achtung bei Neuinstallation:** Ein erneutes `npm install` oder Löschen von `node_modules`
   baut Electron neu auf – dann kann das Problem wiederkehren und das Reparatur-Skript ist
   erneut nötig.

### Weitere Fälle (falls Binary vorhanden, aber Fehler bleibt)

- **`ELECTRON_EXEC_PATH` gesetzt?** electron-vite bevorzugt diese Umgebungsvariable. Falls sie
  auf einen falschen Pfad zeigt, zurücksetzen: `Remove-Item Env:\ELECTRON_EXEC_PATH`.
- **Version stimmt nicht:** Inhalt von `node_modules\electron\dist\version` muss zur Version in
  `node_modules\electron\package.json` passen. Bei Abweichung Schritt 4 des Reparatur-Skripts erneut ausführen.
- **Virenscanner:** Manche Scanner blockieren/entfernen `electron.exe` beim Entpacken – ggf. den
  Projektordner in den Ausnahmen des Scanners eintragen.

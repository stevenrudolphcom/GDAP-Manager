#!/usr/bin/env node
// Plattformuebergreifender Guard, der vor `dev`/`package` sicherstellt, dass die
// Electron-Binary vollstaendig vorhanden ist.
//
// - Schnell-Check: ist node_modules/electron/path.txt gesetzt und die Binary vorhanden?
//   -> wenn ja, sofortiges Ende (vernachlaessigbarer Overhead vor jedem `npm run dev`).
// - Wenn kaputt/unvollstaendig:
//     * Windows: delegiert an Fix-Electron.ps1 (netzlaufwerk-sicheres Entpacken auf Z:\).
//     * macOS/Linux: das Z:\-Problem tritt dort nicht auf -> Standard-Installer electron/install.js.
//
// Optional: `--force` erzwingt die Reparatur (unter Windows an Fix-Electron.ps1 durchgereicht).

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = path.join(root, 'node_modules', 'electron');
const pathTxt = path.join(electronDir, 'path.txt');
const force = process.argv.includes('--force');

function isElectronOk() {
  if (!existsSync(pathTxt)) return false;
  const rel = readFileSync(pathTxt, 'utf8').trim();
  if (!rel) return false;
  return existsSync(path.join(electronDir, 'dist', rel));
}

if (!existsSync(electronDir)) {
  // Noch kein Install gelaufen - der Install-Schritt kuemmert sich darum.
  console.log('[ensure-electron] node_modules/electron fehlt - bitte zuerst "npm install" ausfuehren.');
  process.exit(0);
}

if (!force && isElectronOk()) {
  process.exit(0);
}

console.log('[ensure-electron] Electron-Binary unvollstaendig oder --force gesetzt - starte Reparatur...');

try {
  if (process.platform === 'win32') {
    const script = path.join(root, 'Fix-Electron.ps1');
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script];
    if (force) args.push('-Force');
    execFileSync('powershell', args, { stdio: 'inherit', cwd: root });
  } else {
    // Auf macOS/Linux genuegt der Standard-Installer von Electron.
    execFileSync(process.execPath, [path.join(electronDir, 'install.js')], { stdio: 'inherit', cwd: root });
  }
} catch (err) {
  console.error('[ensure-electron] Reparatur fehlgeschlagen:', err.message);
  process.exit(1);
}

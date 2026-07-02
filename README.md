# GDAP Manager (Electron-Vite Version)

https://github.com/kurkijar/GDAP-Manager
This is a desktop application built with Electron, React, and Vite to create Microsoft 365 Partner Center GDAP requests and to manage role assigments to the relationships.
This app runs with delegated user permissions and needs that the user has Admin Agent-role set in Partner portal. This is not Entra admin role, it can only be found in Partner portal roles.

PLEASE NOTE: This app is only tested on Windows, but should run and build package on Mac and Linux too, but Mac and Linux has not been tested!

## Changelog:
2.7.2026
- **Major dependency upgrade** (all tested: build, type-check, dev and packaged build): React 19, TypeScript 6, Tailwind CSS 4, electron-vite 5, @vitejs/plugin-react 5.2, @azure/msal-node 5 (+ msal-node-extensions 5) and Electron 43.
  - Note: Vite stays on 7 on purpose – electron-vite 5 does not yet support Vite 8, and @vitejs/plugin-react 6 requires Vite 8.
  - Tailwind 4: PostCSS now uses `@tailwindcss/postcss`; `src/renderer/src/styles.css` uses `@import "tailwindcss"` + `@source` directives instead of the old `@tailwind` directives.
- **Automatic Electron self-repair.** `npm install`, `npm run dev` and the `package:*` commands now run a guard (`scripts/ensure-electron.mjs`) that automatically fixes the `Error: Electron uninstall` problem (common on network drives such as `Z:\`). No manual steps required anymore.
- Added `npm run fix:electron` (and `fix:electron:force`) to repair the Electron binary manually if ever needed.
- Added `npm run typecheck` for real TypeScript type-checking (the normal build uses esbuild, which does not type-check).
- Added `npm run clean:full` / `npm run clean:preview` to remove all generated artifacts for a clean reinstall.

5.1.2026
- Updated so userdefined variables are easily changeable in one file /src/appConfig.ts and not in several different files.
- Relantionship enddate is visible and autorenew is now toggleable on/off.
- Other minor quality-of-life upgrades

9.12.2025
- When selecting roles for groups in a relationship, only eligible, available roles in the relationship are selectable.

## IMPORTANT: Azure App Registration Setup

Before you can run this application, you **MUST** configure your Azure AD App Registration correctly.

### 1. Configure Platform

1.  Navigate to the [Entra portal] (https://entra.microsoft.com/) and select App Registration under Entra ID.
2.  Click new registration.
3.  Give it a name and choose who can use the application, usually it's single tenant only.
4.  Select *Redirect URI* and choose **"Public client/native (mobile & desktop)"**, add http://localhost, click register.
5.  Take note of Application (client) ID and Directory (tenant) ID.
6.  Click Authentication and under Advanced Settings, *Allow public client flows* set *Enable the following mobile and desktop flows* to yes.

### 2. Configure API Permissions

This is a critical step. The application needs permission to read and create GDAP relationships and manage their assignments.

1.  In your App Registration, go to the **API permissions** blade.
2.  Click **"Add a permission"**.
3.  Select **"Microsoft Graph"**.
4.  Select **"Delegated permissions"**.
5.  In the search box, type `DelegatedAdminRelationship` and select **`DelegatedAdminRelationship.ReadWrite.All`**.
6.  Search for and select **`Group.Read.All`**. This is required for managing security group assignments to GDAP relationships.
7.  Click **"Add permissions"**.
8.  After adding the permissions, you must grant consent. Click the **"Grant admin consent for [Your Tenant Name]"** button and accept the prompt. The status for the permissions should change to "Granted".

### 3. Add App IDs to Code

1.  Open `src/appConfig.ts` in your code editor and add Application (client) ID into the `AAD_APP_CLIENT_ID` and Directory (tenant) ID `AAD_APP_TENANT_ID` constants (Rows 7 and 8).

### 4. Add group IDs to Code

1. Create three different security groups in entra or admin portal for templates, ie. basic, advanced, expert. You can name them in any way you like. Take note of their groupId.
2. Open `src/appConfig.ts`.
3. Change the name of the predefined group name on row 36 to correspond created security group: ie.    name: 'Production Basic',
4. Change the groupid to the one you created for basic roles: ie. groupId: 'f7c2d8a1-4b3e-4e9a-9d6f-2a8f4b7c1e35',
5. Repeat steps 3. and 4. to advanced and expert groups in rows 45-46 and 63-64.
6. The templates are called in the app with their tag, basic, advanced and expert that are in rows 35, 44 and 62. There is no need to change them, but if you do, also change them in src/renderer/src/components/AssignmentEditor.tsx.

## How to Run the Application

### Prerequisites

You need to have [Node.js](https://nodejs.org/) installed on your computer.

### Step 1: Install Dependencies

Open your terminal or command prompt, navigate to the project's root directory (where `package.json` is located), and run:

```bash
npm install
```

This will download Electron and all other necessary packages, that are listed below with their version number (same as in package.json)

**azure/msal-node": "5.0.0"** - Basic MSAL authentication library

**azure/msal-node-extensions": "5.0.0"** - Advanced MSAL authentication library, used for encrypting the token. DPAPI on Windows, Keychain on macOS, and libsecret on Linux.

**electron-toolkit/utils": "4.0.0"** - Electron-app packaging.

**types/react": "19.2.0"** - The main library for building user interface.

**types/react-dom": "19.2.0"** - The "renderer" for React. It's the bridge that connects React components to the actual browser environment.

**electron": "43.0.0"** - The desktop runtime. **electron-vite": "5.0.0"** and **vite": "7.x"** build the app. See `package.json` for the full, authoritative version list.

> Note: After `npm install`, a post-install step automatically ensures the Electron binary is complete (see "Maintenance & Troubleshooting" below). This prevents the `Error: Electron uninstall` problem on network drives.

### Step 2: Run in Development Mode

To start the application for development with hot-reloading, run:

```bash
npm run dev
```

This command will launch the Electron application window. The developer tools will open automatically.

### Step 3: Build the Executable

To package the application into a runnable `.exe` installer for Windows, run:

```bash
npm run package:win
```

This command will create an `release` folder in your project directory containing the installer (`GDAP Request Creator Setup X.X.X.exe`) and portable .exe to subfolder win-unpacked. You can distribute these files to other users.
Portable .exe needs the whole contents of win-unpacked to run.

For MacOS, the command is:
**npm run package:mac**
and for linux:
**npm run package:linux**

Please note, you need to run these on their corresponding OS. ie. only build Win version on Win computer, Linux on Linux and MacOS on MacOS.

## Maintenance & Troubleshooting

### `Error: Electron uninstall` (automatic repair)

On network drives (for example `Z:\`), the Electron binary sometimes does not unpack correctly during `npm install`, which makes `npm run dev` fail with `Error: Electron uninstall` (`node_modules/electron/path.txt` is empty and `electron.exe` is missing).

This is now handled **automatically**: a small cross-platform guard (`scripts/ensure-electron.mjs`) runs as part of `postinstall`, `predev` and the `package:*` commands. It quickly checks the Electron binary and, only if it is broken, repairs it (on Windows via `Fix-Electron.ps1`, which unpacks the cached ZIP natively with `Expand-Archive`; on macOS/Linux via Electron's standard installer). If everything is fine, it exits instantly.

If you ever need to trigger it manually:

```bash
npm run fix:electron        # repair only if broken
npm run fix:electron:force  # force a fresh unpack of the Electron binary
```

For background and a detailed manual procedure, see `TROUBLESHOOTING-Electron-uninstall.md`.

> The most reliable long-term fix is to keep the project on a **local drive** (e.g. `C:\`) instead of a mapped network drive.

### Type checking

The normal build uses esbuild, which transpiles without checking types. To run a real TypeScript type-check of both the renderer and the main process:

```bash
npm run typecheck
```

### Cleaning the project for a fresh install

To return the folder to a clean-clone state (so you can test the full rollout), use:

```bash
npm run clean:preview   # dry run: shows what would be deleted, deletes nothing
npm run clean:full      # deletes generated artifacts
```

This removes only regenerable items: `node_modules/`, `.electron-cache/`, `out/`, `release/` and `*.tsbuildinfo`. Source code, configuration, `package.json` / `package-lock.json` and the helper scripts are kept. Afterwards run `npm install` and then `npm run dev` or `npm run package:win`.

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { platform } from 'process';
import {
  PublicClientApplication,
  LogLevel,
  Configuration,
  AuthenticationResult,
  AccountInfo,
} from '@azure/msal-node';
import { is } from '@electron-toolkit/utils';
import {
  PersistenceCachePlugin,
  PersistenceCreator,
  DataProtectionScope,
} from '@azure/msal-node-extensions';

// Import centralized configuration
import { APP_CONFIG } from '../appConfig';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AAD_APP_CLIENT_ID = APP_CONFIG.AAD_APP_CLIENT_ID;
const AAD_APP_TENANT_ID = APP_CONFIG.AAD_APP_TENANT_ID;

let mainWindow: BrowserWindow | null = null;
let pca: PublicClientApplication | undefined;
let cachedAccessToken: { accessToken: string; expiresAt: number } | null = null;
let cachedTenantAccessTokens = new Map<string, { accessToken: string; expiresAt: number }>();
let cachedPartnerCenterAccessToken: { accessToken: string; expiresAt: number } | null = null;
let pendingAccessTokenRequest: Promise<{ accessToken: string } | null> | null = null;
let pendingTenantAccessTokenRequests = new Map<string, Promise<{ accessToken: string } | null>>();
let pendingPartnerCenterAccessTokenRequest: Promise<{ accessToken: string } | null> | null = null;

const scopes = [
  'openid',
  'profile',
  'offline_access',
  'User.Read',
  'DelegatedAdminRelationship.ReadWrite.All',
  'Domain.Read.All',
  'Group.Read.All',
];

const customerTenantScopes = [
  'openid',
  'profile',
  'offline_access',
  'User.Read',
  'Domain.Read.All',
];

const partnerCenterScopes = ['https://api.partnercenter.microsoft.com/user_impersonation'];

interface PartnerCenterCompanyProfile {
  tenantId?: string;
  domain?: string;
}

function isOnMicrosoftDomain(domainName: string | undefined): domainName is string {
  return !!domainName && domainName.toLowerCase().endsWith('.onmicrosoft.com');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 1400,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show();
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  if (is.dev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function validateConfig() {
  if (!AAD_APP_CLIENT_ID || AAD_APP_CLIENT_ID.includes('YOUR_CLIENT_ID_HERE')) {
    throw new Error('MSAL config error: Set AAD_APP_CLIENT_ID in src/appConfig.ts');
  }
  if (!AAD_APP_TENANT_ID || AAD_APP_TENANT_ID.includes('YOUR_TENANT_ID_HERE')) {
    throw new Error('MSAL config error: Set AAD_APP_TENANT_ID in src/appConfig.ts');
  }
}

function getMsal(): PublicClientApplication {
  if (!pca) {
    throw new Error('MSAL not initialized yet. Try again in a moment.');
  }
  return pca;
}

async function setupMsal() {
  validateConfig();

  const cachePath = path.join(app.getPath('userData'), 'msal.cache');

  const persistence = await PersistenceCreator.createPersistence({
    cachePath,
    dataProtectionScope: DataProtectionScope.CurrentUser,
    serviceName: 'com.gdap.requestcreator',
    accountName: 'msal-cache',
  });

  const cachePlugin = new PersistenceCachePlugin(persistence);

  const msalConfig: Configuration = {
    auth: {
      clientId: AAD_APP_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${AAD_APP_TENANT_ID}`,
    },
    cache: {
      cachePlugin,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
          if (!containsPii) console.log(`MSAL: ${message}`);
        },
        piiLoggingEnabled: false,
        logLevel: LogLevel.Info,
      },
    },
  };

  pca = new PublicClientApplication(msalConfig);
}

async function getFirstAccount(msal: PublicClientApplication): Promise<AccountInfo | null> {
  const accounts = await msal.getTokenCache().getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

async function getPartnerCenterAccessToken(): Promise<{ accessToken: string } | null> {
  if (cachedPartnerCenterAccessToken && Date.now() < cachedPartnerCenterAccessToken.expiresAt - 60_000) {
    return { accessToken: cachedPartnerCenterAccessToken.accessToken };
  }

  if (pendingPartnerCenterAccessTokenRequest) {
    return pendingPartnerCenterAccessTokenRequest;
  }

  pendingPartnerCenterAccessTokenRequest = (async () => {
    try {
      const msal = getMsal();
      let account = await getFirstAccount(msal);
      if (!account) {
        const interactive = await msal.acquireTokenInteractive({
          scopes: partnerCenterScopes,
          openBrowser: async (url: string) => {
            await shell.openExternal(url);
          },
        });
        account = interactive.account ?? null;
        if (!account) return null;
      }

      let authResult: AuthenticationResult | null = null;
      try {
        authResult = await msal.acquireTokenSilent({ account, scopes: partnerCenterScopes });
      } catch {
        authResult = await msal.acquireTokenInteractive({
          scopes: partnerCenterScopes,
          openBrowser: async (url: string) => {
            await shell.openExternal(url);
          },
        });
      }

      if (authResult?.accessToken) {
        cachedPartnerCenterAccessToken = {
          accessToken: authResult.accessToken,
          expiresAt: authResult.expiresOn?.getTime() ?? Date.now() + 45 * 60 * 1000,
        };
        return { accessToken: authResult.accessToken };
      }

      return null;
    } catch (error: any) {
      console.warn('Unable to acquire Partner Center token:', error?.message || error);
      return null;
    } finally {
      pendingPartnerCenterAccessTokenRequest = null;
    }
  })();

  return pendingPartnerCenterAccessTokenRequest;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await setupMsal();
      createWindow();
    } catch (error: any) {
      console.error('Application startup failed:', error.message);
      dialog.showErrorBox(
        'Configuration Error',
        `${error.message}\n\nPlease add your Azure App IDs to src/appConfig.ts and restart the application.`
      );
      app.quit();
    }
  });
}

app.on('window-all-closed', () => {
  if (platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('login', async () => {
  try {
    const msal = getMsal();
    const result = await msal.acquireTokenInteractive({
      scopes,
      openBrowser: async (url: string) => {
        await shell.openExternal(url);
      },
    });
    if (result?.accessToken) {
      cachedAccessToken = {
        accessToken: result.accessToken,
        expiresAt: result.expiresOn?.getTime() ?? Date.now() + 45 * 60 * 1000,
      };
    }
    return result;
  } catch (error: any) {
    if (error?.errorCode === 'authentication_canceled') {
      console.log('User canceled login.');
      return null;
    }
    console.error('Login failed:', error);
    dialog.showErrorBox('Login Error', error?.message || 'Login failed.');
    return null;
  }
});

ipcMain.handle('logout', async () => {
  try {
    const msal = getMsal();
    cachedAccessToken = null;
    cachedTenantAccessTokens = new Map<string, { accessToken: string; expiresAt: number }>();
    cachedPartnerCenterAccessToken = null;
    pendingAccessTokenRequest = null;
    pendingTenantAccessTokenRequests = new Map<string, Promise<{ accessToken: string } | null>>();
    pendingPartnerCenterAccessTokenRequest = null;
    const accounts = await msal.getTokenCache().getAllAccounts();
    for (const acc of accounts) {
      await msal.getTokenCache().removeAccount(acc);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error?.message };
  }
});

ipcMain.handle('get-token', async (): Promise<{ accessToken: string } | null> => {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return { accessToken: cachedAccessToken.accessToken };
  }

  if (pendingAccessTokenRequest) {
    return pendingAccessTokenRequest;
  }

  pendingAccessTokenRequest = (async () => {
    try {
      const msal = getMsal();
      let account = await getFirstAccount(msal);
      if (!account) {
        const interactive = await msal.acquireTokenInteractive({
          scopes,
          openBrowser: async (url: string) => {
            await shell.openExternal(url);
          },
        });
        account = interactive.account ?? null;
        if (!account) {
          dialog.showErrorBox('Token Error', 'No account returned from interactive login.');
          return null;
        }
      }

      let authResult: AuthenticationResult | null = null;
      try {
        authResult = await msal.acquireTokenSilent({ account, scopes });
      } catch {
        authResult = await msal.acquireTokenInteractive({
          scopes,
          openBrowser: async (url: string) => {
            await shell.openExternal(url);
          },
        });
      }

      if (authResult?.accessToken) {
        cachedAccessToken = {
          accessToken: authResult.accessToken,
          expiresAt: authResult.expiresOn?.getTime() ?? Date.now() + 45 * 60 * 1000,
        };
        return { accessToken: authResult.accessToken };
      }

      dialog.showErrorBox('Token Error', 'No access token was returned.');
      return null;
    } catch (err: any) {
      dialog.showErrorBox('Token Error', err?.message || 'Unable to acquire token.');
      return null;
    } finally {
      pendingAccessTokenRequest = null;
    }
  })();

  return pendingAccessTokenRequest;
});

ipcMain.handle('get-token-for-tenant', async (_event, tenantId: string): Promise<{ accessToken: string } | null> => {
  const normalizedTenantId = tenantId.trim().toLowerCase();
  if (!normalizedTenantId) return null;

  const cachedTenantToken = cachedTenantAccessTokens.get(normalizedTenantId);
  if (cachedTenantToken && Date.now() < cachedTenantToken.expiresAt - 60_000) {
    return { accessToken: cachedTenantToken.accessToken };
  }

  const pendingTenantToken = pendingTenantAccessTokenRequests.get(normalizedTenantId);
  if (pendingTenantToken) {
    return pendingTenantToken;
  }

  const request = (async () => {
    try {
      const msal = getMsal();
      const account = await getFirstAccount(msal);
      if (!account) return null;

      const authority = `https://login.microsoftonline.com/${normalizedTenantId}`;
      let authResult: AuthenticationResult | null = null;
      try {
        authResult = await msal.acquireTokenSilent({ account, scopes: customerTenantScopes, authority });
      } catch {
        authResult = await msal.acquireTokenInteractive({
          scopes: customerTenantScopes,
          authority,
          openBrowser: async (url: string) => {
            await shell.openExternal(url);
          },
        });
      }

      if (authResult?.accessToken && authResult.tenantId?.toLowerCase() === normalizedTenantId) {
        cachedTenantAccessTokens.set(normalizedTenantId, {
          accessToken: authResult.accessToken,
          expiresAt: authResult.expiresOn?.getTime() ?? Date.now() + 45 * 60 * 1000,
        });
        return { accessToken: authResult.accessToken };
      }

      if (authResult?.accessToken) {
        console.warn(`Token tenant mismatch. Requested ${normalizedTenantId}, received ${authResult.tenantId || 'unknown'}.`);
      }

      return null;
    } catch (error: any) {
      console.warn(`Unable to acquire token for customer tenant ${normalizedTenantId}:`, error?.message || error);
      return null;
    } finally {
      pendingTenantAccessTokenRequests.delete(normalizedTenantId);
    }
  })();

  pendingTenantAccessTokenRequests.set(normalizedTenantId, request);
  return request;
});

ipcMain.handle('get-customer-default-namespace', async (_event, tenantId: string): Promise<{ namespace: string | null; error?: string }> => {
  const normalizedTenantId = tenantId.trim().toLowerCase();
  if (!normalizedTenantId) return { namespace: null, error: 'Tenant ID is empty.' };

  const token = await getPartnerCenterAccessToken();
  if (!token?.accessToken) {
    return { namespace: null, error: 'Partner Center token could not be acquired.' };
  }

  try {
    const response = await fetch(`https://api.partnercenter.microsoft.com/v1/customers/${normalizedTenantId}/profiles/company`, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      let details = '';
      try {
        details = await response.text();
      } catch { }
      return { namespace: null, error: `Partner Center returned ${response.status}${details ? `: ${details}` : ''}` };
    }

    const companyProfile: PartnerCenterCompanyProfile = await response.json();
    if (companyProfile.tenantId?.toLowerCase() !== normalizedTenantId) {
      return { namespace: null, error: `Partner Center returned tenant ${companyProfile.tenantId || 'unknown'} instead of ${normalizedTenantId}.` };
    }

    if (!isOnMicrosoftDomain(companyProfile.domain)) {
      return { namespace: null, error: `Partner Center returned no *.onmicrosoft.com namespace.` };
    }

    return { namespace: companyProfile.domain };
  } catch (error: any) {
    return { namespace: null, error: error?.message || 'Partner Center namespace lookup failed.' };
  }
});

ipcMain.handle('get-account', async () => {
  try {
    const msal = getMsal();
    const acc = await getFirstAccount(msal);
    return acc
      ? {
          homeAccountId: acc.homeAccountId,
          username: acc.username,
          environment: acc.environment,
          tenantId: acc.tenantId,
          name: acc.name,
        }
      : null;
  } catch {
    return null;
  }
});

const defaultsFilePath = path.join(app.getPath('userData'), 'user-default-roles.json');
const presetsFilePath = path.join(app.getPath('userData'), 'user-role-presets.json');

// Templates are saved directly into src/appConfig.ts (APP_CONFIG.TEMPLATES) so they ship in
// every future build. Only writable while running unpackaged (npm run dev); packaged apps
// ship a read-only asar, so writes there only touch the per-user runtime files below.
const appConfigSourcePath = path.join(app.getAppPath(), 'src', 'appConfig.ts');

const findMatchingBraceIndex = (content: string, openBraceIndex: number): number => {
  let depth = 0;
  for (let i = openBraceIndex; i < content.length; i += 1) {
    if (content[i] === '{') depth += 1;
    else if (content[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
};

const findTemplatesBraceRange = (content: string): { open: number; close: number } | null => {
  const markerIdx = content.indexOf('TEMPLATES:');
  if (markerIdx === -1) return null;
  const openIdx = content.indexOf('{', markerIdx);
  if (openIdx === -1) return null;
  const closeIdx = findMatchingBraceIndex(content, openIdx);
  if (closeIdx === -1) return null;
  return { open: openIdx, close: closeIdx };
};

const escapeSingleQuotedKey = (name: string): string => name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Matches both hand-written bare-identifier keys and our own quoted-string keys.
const templateExistsInAppConfigSource = (templatesBody: string, name: string): boolean => {
  const lower = name.toLowerCase();
  const keyPattern = /(?:^|\n)\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = keyPattern.exec(templatesBody))) {
    const key = match[1] ?? match[2] ?? match[3];
    if (key && key.toLowerCase() === lower) return true;
  }
  return false;
};

const appendTemplateToAppConfigSource = (name: string, roleIds: string[]) => {
  const content = fs.readFileSync(appConfigSourcePath, 'utf-8');
  const range = findTemplatesBraceRange(content);
  if (!range) throw new Error('Could not locate TEMPLATES object in appConfig.ts');
  const idLines = roleIds.map((id) => `        '${id}',`).join('\n');
  const entryText = `    '${escapeSingleQuotedKey(name)}': {\n      roleIds: [\n${idLines}\n      ],\n    },`;
  const before = content.slice(0, range.close).replace(/\s+$/, '');
  const after = content.slice(range.close); // starts with the TEMPLATES closing '}'
  fs.writeFileSync(appConfigSourcePath, `${before}\n${entryText}\n  ${after}`, 'utf-8');
};

// Only removes entries added via appendTemplateToAppConfigSource (quoted-string keys). Hand-written
// built-in templates use bare identifier keys and are intentionally left untouched here; those are
// hidden instead via removedBuiltInTemplates.json to avoid risking their inline role-name comments.
const removeQuotedTemplateFromAppConfigSource = (name: string): boolean => {
  const content = fs.readFileSync(appConfigSourcePath, 'utf-8');
  const range = findTemplatesBraceRange(content);
  if (!range) return false;
  const body = content.slice(range.open + 1, range.close);
  const quotedKeyPattern = /(\n\s*)'([^']+)'\s*:\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = quotedKeyPattern.exec(body))) {
    if (match[2].toLowerCase() !== name.toLowerCase()) continue;
    const entryOpenBrace = range.open + 1 + match.index + match[0].length - 1;
    const entryCloseBrace = findMatchingBraceIndex(content, entryOpenBrace);
    if (entryCloseBrace === -1) return false;
    let removalEnd = entryCloseBrace + 1;
    if (content[removalEnd] === ',') removalEnd += 1;
    const removalStart = range.open + 1 + match.index;
    fs.writeFileSync(appConfigSourcePath, `${content.slice(0, removalStart)}${content.slice(removalEnd)}`, 'utf-8');
    return true;
  }
  return false;
};

// Names of built-in templates (src/appConfig.ts) the user permanently removed.
const removedTemplatesUserPath = path.join(app.getPath('userData'), 'user-removed-templates.json');
const removedTemplatesSourcePath = path.join(app.getAppPath(), 'src', 'removedBuiltInTemplates.json');

const readRemovedTemplatesUser = (): string[] => {
  try {
    if (fs.existsSync(removedTemplatesUserPath)) {
      return JSON.parse(fs.readFileSync(removedTemplatesUserPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading removed templates file:', error);
  }
  return [];
};

const readRemovedTemplatesSource = (): string[] => {
  try {
    if (fs.existsSync(removedTemplatesSourcePath)) {
      return JSON.parse(fs.readFileSync(removedTemplatesSourcePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading removed templates source file:', error);
  }
  return [];
};

ipcMain.handle('select-security-matrix-csv-export-path', async (_event, defaultFileName: string) => {
  if (!mainWindow) return { canceled: true };

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Security Matrix as CSV',
    defaultPath: path.join(app.getPath('downloads'), defaultFileName),
    filters: [{ name: 'CSV File', extensions: ['csv'] }],
  });

  return result.canceled || !result.filePath
    ? { canceled: true }
    : { canceled: false, filePath: result.filePath };
});

ipcMain.handle('save-security-matrix-csv', async (_event, filePath: string, csvContent: string) => {
  try {
    const targetPath = filePath.toLowerCase().endsWith('.csv') ? filePath : `${filePath}.csv`;
    fs.writeFileSync(targetPath, csvContent, 'utf-8');
    return { success: true, filePath: targetPath };
  } catch (error: any) {
    console.error('Error saving security matrix CSV:', error);
    return { success: false, error: error?.message || 'Failed to save CSV file.' };
  }
});

ipcMain.handle('load-default-roles', async () => {
  try {
    if (fs.existsSync(defaultsFilePath)) {
      const data = fs.readFileSync(defaultsFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading default roles:', error);
  }
  return null;
});

ipcMain.handle('save-default-roles', async (_event, roleIds: string[]) => {
  try {
    fs.writeFileSync(defaultsFilePath, JSON.stringify(roleIds, null, 2));
    return { success: true };
  } catch (error: any) {
    console.error('Error saving default roles:', error);
    return { success: false, error: error?.message };
  }
});

ipcMain.handle('reset-default-roles', async () => {
  try {
    if (fs.existsSync(defaultsFilePath)) {
      fs.unlinkSync(defaultsFilePath);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error resetting default roles:', error);
    return { success: false, error: error?.message };
  }
});

ipcMain.handle('load-role-presets', async () => {
  try {
    if (fs.existsSync(presetsFilePath)) {
      const data = fs.readFileSync(presetsFilePath, 'utf-8');
      return JSON.parse(data);
    } else if (fs.existsSync(defaultsFilePath)) {
      const data = fs.readFileSync(defaultsFilePath, 'utf-8');
      const defaultRoles = JSON.parse(data);
      if (Array.isArray(defaultRoles) && defaultRoles.length > 0) {
        return { 'Default': defaultRoles };
      }
    }
  } catch (error) {
    console.error('Error loading role presets:', error);
  }
  return {};
});

ipcMain.handle('save-role-preset', async (_event, name: string, roleIds: string[]) => {
  try {
    const trimmedName = name.trim();
    let persistedToSource = false;
    let alreadyExisted = false;

    // While running unpackaged, promote brand-new templates directly into appConfig.ts so they
    // ship in every future build (`npm run build` / `npm run package:*`).
    if (!app.isPackaged) {
      const content = fs.readFileSync(appConfigSourcePath, 'utf-8');
      const range = findTemplatesBraceRange(content);
      alreadyExisted = range ? templateExistsInAppConfigSource(content.slice(range.open + 1, range.close), trimmedName) : false;
      if (!alreadyExisted) {
        appendTemplateToAppConfigSource(trimmedName, roleIds);
        persistedToSource = true;
      }
    }

    // The per-user runtime file only needs to hold customizations of an existing template
    // (override roles) or, when packaged, a brand-new template that can't reach appConfig.ts.
    let presets: Record<string, string[]> = {};
    if (fs.existsSync(presetsFilePath)) {
      try {
        presets = JSON.parse(fs.readFileSync(presetsFilePath, 'utf-8'));
      } catch {}
    }
    if (alreadyExisted || app.isPackaged) {
      presets[trimmedName] = roleIds;
    } else {
      delete presets[trimmedName];
    }
    fs.writeFileSync(presetsFilePath, JSON.stringify(presets, null, 2));
    return { success: true, presets, persistedToSource };
  } catch (error: any) {
    console.error('Error saving role preset:', error);
    return { success: false, error: error?.message };
  }
});

ipcMain.handle('delete-role-preset', async (_event, name: string) => {
  try {
    let presets: Record<string, string[]> = {};
    if (fs.existsSync(presetsFilePath)) {
      try {
        presets = JSON.parse(fs.readFileSync(presetsFilePath, 'utf-8'));
      } catch {}
    }
    delete presets[name];
    fs.writeFileSync(presetsFilePath, JSON.stringify(presets, null, 2));
    return { success: true, presets };
  } catch (error: any) {
    console.error('Error deleting role preset:', error);
    return { success: false, error: error?.message };
  }
});

ipcMain.handle('load-removed-builtin-templates', async () => {
  // Source list is already baked into the renderer bundle (REMOVED_BUILT_IN_TEMPLATES);
  // this only returns the per-machine additions made while the app was packaged.
  return readRemovedTemplatesUser();
});

ipcMain.handle('delete-builtin-template', async (_event, name: string) => {
  try {
    const trimmedName = name.trim();
    let removedFromAppConfig = false;

    // Templates we ourselves added (quoted keys) can be fully deleted from appConfig.ts.
    if (!app.isPackaged) {
      removedFromAppConfig = removeQuotedTemplateFromAppConfigSource(trimmedName);
    }

    let userRemoved = readRemovedTemplatesUser();
    if (!removedFromAppConfig) {
      // Hand-written built-in template (or packaged build): hide it instead of editing appConfig.ts.
      if (!app.isPackaged) {
        const sourceRemoved = readRemovedTemplatesSource();
        if (!sourceRemoved.some((n) => n.toLowerCase() === trimmedName.toLowerCase())) {
          sourceRemoved.push(trimmedName);
          fs.writeFileSync(removedTemplatesSourcePath, `${JSON.stringify(sourceRemoved, null, 2)}\n`, 'utf-8');
        }
      }
      if (!userRemoved.some((n) => n.toLowerCase() === trimmedName.toLowerCase())) {
        userRemoved = [...userRemoved, trimmedName];
        fs.writeFileSync(removedTemplatesUserPath, JSON.stringify(userRemoved, null, 2));
      }
    }

    // Clean up any leftover customization override for this name either way.
    let presets: Record<string, string[]> = {};
    if (fs.existsSync(presetsFilePath)) {
      try {
        presets = JSON.parse(fs.readFileSync(presetsFilePath, 'utf-8'));
      } catch {}
    }
    if (trimmedName in presets) {
      delete presets[trimmedName];
      fs.writeFileSync(presetsFilePath, JSON.stringify(presets, null, 2));
    }

    return { success: true, removedTemplates: userRemoved, removedFromAppConfig };
  } catch (error: any) {
    console.error('Error removing built-in template:', error);
    return { success: false, error: error?.message };
  }
});


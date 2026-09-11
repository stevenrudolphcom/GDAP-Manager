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

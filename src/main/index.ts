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

const scopes = [
  'openid',
  'profile',
  'offline_access',
  'User.Read',
  'DelegatedAdminRelationship.ReadWrite.All',
  'Group.Read.All',
];

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
      return { accessToken: authResult.accessToken };
    }
    dialog.showErrorBox('Token Error', 'No access token was returned.');
    return null;
  } catch (err: any) {
    dialog.showErrorBox('Token Error', err?.message || 'Unable to acquire token.');
    return null;
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

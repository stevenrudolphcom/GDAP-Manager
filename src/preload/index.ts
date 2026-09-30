import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  login: () => ipcRenderer.invoke('login'),
  logout: () => ipcRenderer.invoke('logout'),
  getToken: () => ipcRenderer.invoke('get-token'),
  getTokenForTenant: (tenantId: string) => ipcRenderer.invoke('get-token-for-tenant', tenantId),
  getCustomerDefaultNamespace: (tenantId: string) => ipcRenderer.invoke('get-customer-default-namespace', tenantId),
  getAccount: () => ipcRenderer.invoke('get-account'),
  loadDefaultRoles: () => ipcRenderer.invoke('load-default-roles'),
  saveDefaultRoles: (roleIds: string[]) => ipcRenderer.invoke('save-default-roles', roleIds),
  resetDefaultRoles: () => ipcRenderer.invoke('reset-default-roles'),
  loadRolePresets: () => ipcRenderer.invoke('load-role-presets'),
  saveRolePreset: (name: string, roleIds: string[]) => ipcRenderer.invoke('save-role-preset', name, roleIds),
  deleteRolePreset: (name: string) => ipcRenderer.invoke('delete-role-preset', name),
  loadRemovedBuiltInTemplates: () => ipcRenderer.invoke('load-removed-builtin-templates'),
  deleteBuiltInTemplate: (name: string) => ipcRenderer.invoke('delete-builtin-template', name),
  selectSecurityMatrixCsvExportPath: (defaultFileName: string) => ipcRenderer.invoke('select-security-matrix-csv-export-path', defaultFileName),
  saveSecurityMatrixCsv: (filePath: string, csvContent: string) => ipcRenderer.invoke('save-security-matrix-csv', filePath, csvContent),
});

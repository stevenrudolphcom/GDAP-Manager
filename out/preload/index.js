"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  login: () => electron.ipcRenderer.invoke("login"),
  logout: () => electron.ipcRenderer.invoke("logout"),
  getToken: () => electron.ipcRenderer.invoke("get-token"),
  getAccount: () => electron.ipcRenderer.invoke("get-account"),
  loadDefaultRoles: () => electron.ipcRenderer.invoke("load-default-roles"),
  saveDefaultRoles: (roleIds) => electron.ipcRenderer.invoke("save-default-roles", roleIds),
  resetDefaultRoles: () => electron.ipcRenderer.invoke("reset-default-roles")
});

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kardsDesktop', {
  generateDeckImage: (code: string) => ipcRenderer.invoke('deck-image:generate', code),
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  getDeckImageConfig: () => ipcRenderer.invoke('app-config:get'),
  saveDeckImageConfig: (config: unknown) => ipcRenderer.invoke('app-config:set', config),
  saveBackup: (backup: unknown) => ipcRenderer.invoke('backup:save', backup),
  openBackup: () => ipcRenderer.invoke('backup:open'),
});

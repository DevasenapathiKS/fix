const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  
  // Notifications
  showNotification: (title, body) => {
    ipcRenderer.send('notification:show', { title, body });
  },
  
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  
  // Event listeners
  onNotificationClick: (callback) => {
    ipcRenderer.on('notification:clicked', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Notify the renderer that the preload script has loaded
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Preload] Electron preload script loaded');
});


export interface ElectronAPI {
  platform: string;
  isElectron: boolean;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  showNotification: (title: string, body: string) => void;
  getVersion: () => Promise<string>;
  onNotificationClick: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};


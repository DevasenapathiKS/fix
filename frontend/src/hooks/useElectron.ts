import { useCallback, useMemo } from 'react';

export const useElectron = () => {
  const isElectron = useMemo(() => {
    return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
  }, []);

  const platform = useMemo(() => {
    if (isElectron && window.electronAPI) {
      return window.electronAPI.platform;
    }
    return 'web';
  }, [isElectron]);

  const showNotification = useCallback((title: string, body: string) => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.showNotification(title, body);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  }, [isElectron]);

  const minimizeWindow = useCallback(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  }, [isElectron]);

  const maximizeWindow = useCallback(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  }, [isElectron]);

  const closeWindow = useCallback(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  }, [isElectron]);

  return {
    isElectron,
    platform,
    showNotification,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
  };
};


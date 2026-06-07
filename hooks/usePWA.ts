'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PWADeferredPrompt {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface UsePWAReturn {
  isOnline: boolean;
  isPWAInstalled: boolean;
  isUpdateAvailable: boolean;
  deferredPrompt: PWADeferredPrompt | null;
  updateServiceWorker: (() => void) | null;
  isLoading: boolean;
  installPWA: () => void;
  refreshForUpdate: () => void;
}

export function usePWA(): UsePWAReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<PWADeferredPrompt | null>(null);
  const [updateSW, setUpdateSW] = useState<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if running in PWA mode
  useEffect(() => {
    const checkPWAInstall = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullScreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;

      setIsPWAInstalled(isStandalone || isFullScreen || isMinimalUI);
    };

    checkPWAInstall();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkPWAInstall);

    return () => mediaQuery.removeEventListener('change', checkPWAInstall);
  }, []);

  // Online/Offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker registration
  useEffect(() => {
    const registerSW = async () => {
      if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service Worker not supported');
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service Worker registered:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          console.log('[PWA] Update found');

          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true);
                setUpdateSW(() => () => {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                });
              }
            });
          }
        });

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Handle controller change (after skipWaiting)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        setIsLoading(false);
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
        setIsLoading(false);
      }
    };

    registerSW();
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] Before Install Prompt fired');

      e.preventDefault();

      const deferredPromptData = e as CustomEvent<PWADeferredPrompt>;
      setDeferredPrompt({
        prompt: deferredPromptData.prompt,
        userChoice: deferredPromptData.userChoice,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      console.log('[PWA] User choice:', choice.outcome);

      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
    }
  }, [deferredPrompt]);

  const refreshForUpdate = useCallback(() => {
    if (updateSW) {
      updateSW();
    }
  }, [updateSW]);

  return {
    isOnline,
    isPWAInstalled,
    isUpdateAvailable,
    deferredPrompt,
    updateServiceWorker: updateSW,
    isLoading,
    installPWA,
    refreshForUpdate,
  };
}

// Hook for checking network status with retry
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    // Get connection info if available
    const connection = (navigator as any).connection;
    if (connection) {
      setEffectiveType(connection.effectiveType);

      const handleChange = () => {
        setEffectiveType(connection.effectiveType);
      };

      connection.addEventListener('change', handleChange);
      return () => connection.removeEventListener('change', handleChange);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, effectiveType };
}

// Hook for notifications permission
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);

      const handleChange = () => {
        setPermission(Notification.permission);
      };

      Notification.addEventListener('permissionchange', handleChange);
      return () => Notification.removeEventListener('permissionchange', handleChange);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('[PWA] Notification permission failed:', error);
      return 'denied';
    }
  }, []);

  return { permission, requestPermission };
}
